using Microsoft.EntityFrameworkCore;
using SocialOrchestrator.Application.Social.Providers;
using SocialOrchestrator.Application.SocialAccounts.Services;
using SocialOrchestrator.Domain.SocialAccounts;
using SocialOrchestrator.Infrastructure.Persistence;
using SocialOrchestrator.Infrastructure.SocialAccounts;
using Xunit;

namespace SocialOrchestrator.UnitTests.SocialAccounts
{
    public class SocialAccountServiceTests
    {
        private static AppDbContext CreateDbContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            return new AppDbContext(options);
        }

        [Fact]
        public async Task DisconnectSocialAccount_RemovesTokensAndMarksAccountInactive()
        {
            // Arrange
            using var dbContext = CreateDbContext();

            var workspaceId = Guid.NewGuid();
            var accountId = Guid.NewGuid();

            var account = new SocialAccount
            {
                Id = accountId,
                WorkspaceId = workspaceId,
                NetworkType = SocialNetworkType.Facebook,
                ExternalAccountId = "ext-1",
                Name = "Test Page",
                Username = "test-page",
                IsActive = true,
                RequiresReauthorization = false,
                CreatedAt = DateTime.UtcNow
            };

            var token = new SocialAuthToken
            {
                Id = Guid.NewGuid(),
                SocialAccountId = accountId,
                AccessTokenEncrypted = "access-token",
                RefreshTokenEncrypted = "refresh-token",
                CreatedAt = DateTime.UtcNow
            };

            dbContext.SocialAccounts.Add(account);
            dbContext.SocialAuthTokens.Add(token);
            await dbContext.SaveChangesAsync();

            var fakeProvider = new FakeSocialAuthProvider
            {
                NetworkType = SocialNetworkType.Facebook
            };

            var service = new SocialAccountService(dbContext, new[] { fakeProvider });

            // Act
            var result = await service.DisconnectSocialAccountAsync(workspaceId, accountId);

            // Assert
            Assert.True(result.IsSuccess);
            Assert.Null(result.Error);

            var updatedAccount = await dbContext.SocialAccounts.FindAsync(accountId);
            Assert.NotNull(updatedAccount);
            Assert.False(updatedAccount!.IsActive);
            Assert.True(updatedAccount.RequiresReauthorization);

            var remainingTokens = await dbContext.SocialAuthTokens
                .Where(t => t.SocialAccountId == accountId)
                .ToListAsync();
            Assert.Empty(remainingTokens);

            Assert.Single(fakeProvider.Revocations);
            var revoked = fakeProvider.Revocations[0];
            Assert.Equal("access-token", revoked.AccessToken);
            Assert.Equal("refresh-token", revoked.RefreshToken);
        }

        [Fact]
        public async Task DisconnectSocialAccount_AccountNotFound_ReturnsFailure()
        {
            using var dbContext = CreateDbContext();

            var fakeProvider = new FakeSocialAuthProvider
            {
                NetworkType = SocialNetworkType.Facebook
            };

            var service = new SocialAccountService(dbContext, new[] { fakeProvider });

            var workspaceId = Guid.NewGuid();
            var socialAccountId = Guid.NewGuid();

            var result = await service.DisconnectSocialAccountAsync(workspaceId, socialAccountId);

            Assert.False(result.IsSuccess);
            Assert.NotNull(result.Error);
            Assert.Empty(fakeProvider.Revocations);
        }

        private sealed class FakeSocialAuthProvider : ISocialAuthProvider
        {
            public SocialNetworkType NetworkType { get; set; }

            public List<(string AccessToken, string? RefreshToken)> Revocations { get; } = new();

            public string GetAuthorizationUrl(Guid workspaceId, Guid userId, string state)
            {
                throw new NotImplementedException();
            }

            public Task<OAuthCallbackResult> HandleCallbackAsync(string code, string state)
            {
                throw new NotImplementedException();
            }

            public Task RevokeAsync(string accessToken, string? refreshToken)
            {
                Revocations.Add((accessToken, refreshToken));
                return Task.CompletedTask;
            }
        }
    }
}