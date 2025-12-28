using Microsoft.EntityFrameworkCore;
using SocialOrchestrator.Application.Social.Providers;
using SocialOrchestrator.Application.SocialAccounts.Dto;
using SocialOrchestrator.Application.SocialAccounts.Services;
using SocialOrchestrator.Domain.Common;
using SocialOrchestrator.Domain.SocialAccounts;
using SocialOrchestrator.Infrastructure.Persistence;

namespace SocialOrchestrator.Infrastructure.SocialAccounts
{
    /// <summary>
    /// Implementation of ISocialAccountService using EF Core.
    /// </summary>
    public class SocialAccountService : ISocialAccountService
    {
        private readonly AppDbContext _dbContext;

        public SocialAccountService(AppDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<Result<IReadOnlyList<SocialAccountSummaryDto>>> GetWorkspaceSocialAccountsAsync(Guid workspaceId)
        {
            var accounts = await _dbContext.SocialAccounts
                .Where(a => a.WorkspaceId == workspaceId)
                .OrderBy(a => a.Name)
                .Select(a => new SocialAccountSummaryDto
                {
                    Id = a.Id,
                    NetworkType = a.NetworkType,
                    Name = a.Name,
                    Username = a.Username,
                    IsActive = a.IsActive,
                    RequiresReauthorization = a.RequiresReauthorization
                })
                .ToListAsync();

            return Result<IReadOnlyList<SocialAccountSummaryDto>>.Success(accounts);
        }

        public async Task<Result<SocialAccountSummaryDto>> ConnectSocialAccountAsync(Guid workspaceId, OAuthCallbackResult oauthResult)
        {
            if (!oauthResult.IsSuccess)
            {
                return Result<SocialAccountSummaryDto>.Failure(
                    oauthResult.ErrorMessage ?? "OAuth authorization failed.");
            }

            if (string.IsNullOrWhiteSpace(oauthResult.ExternalAccountId))
            {
                return Result<SocialAccountSummaryDto>.Failure("External account id is missing from OAuth result.");
            }

            if (string.IsNullOrWhiteSpace(oauthResult.AccountName))
            {
                return Result<SocialAccountSummaryDto>.Failure("Account name is missing from OAuth result.");
            }

            // Find existing account for this workspace/network/external id
            var account = await _dbContext.SocialAccounts
                .FirstOrDefaultAsync(a =>
                    a.WorkspaceId == workspaceId &&
                    a.NetworkType == oauthResult.NetworkType &&
                    a.ExternalAccountId == oauthResult.ExternalAccountId);

            if (account == null)
            {
                account = new SocialAccount
                {
                    Id = Guid.NewGuid(),
                    WorkspaceId = workspaceId,
                    NetworkType = oauthResult.NetworkType,
                    ExternalAccountId = oauthResult.ExternalAccountId,
                    Name = oauthResult.AccountName,
                    Username = oauthResult.AccountUsername,
                    IsActive = true,
                    RequiresReauthorization = false,
                    CreatedAt = DateTime.UtcNow
                };

                _dbContext.SocialAccounts.Add(account);
            }
            else
            {
                account.Name = oauthResult.AccountName;
                account.Username = oauthResult.AccountUsername;
                account.IsActive = true;
                account.RequiresReauthorization = false;
                account.MarkUpdated();
            }

            // Handle token - only one active record per SocialAccountId
            var token = await _dbContext.SocialAuthTokens
                .FirstOrDefaultAsync(t => t.SocialAccountId == account.Id);

            var scopesString = oauthResult.Scopes is { Length: > 0 }
                ? string.Join(" ", oauthResult.Scopes)
                : string.Empty;

            if (token == null)
            {
                token = new SocialAuthToken
                {
                    Id = Guid.NewGuid(),
                    SocialAccountId = account.Id,
                    // TODO: encrypt tokens before persisting in production
                    AccessTokenEncrypted = oauthResult.AccessToken,
                    RefreshTokenEncrypted = oauthResult.RefreshToken,
                    ExpiresAtUtc = oauthResult.ExpiresAtUtc,
                    Scopes = scopesString,
                    CreatedAt = DateTime.UtcNow
                };

                _dbContext.SocialAuthTokens.Add(token);
            }
            else
            {
                // TODO: encrypt tokens before persisting in production
                token.AccessTokenEncrypted = oauthResult.AccessToken;
                token.RefreshTokenEncrypted = oauthResult.RefreshToken;
                token.ExpiresAtUtc = oauthResult.ExpiresAtUtc;
                token.Scopes = scopesString;
                token.UpdatedAt = DateTime.UtcNow;
            }

            await _dbContext.SaveChangesAsync();

            var dto = new SocialAccountSummaryDto
            {
                Id = account.Id,
                NetworkType = account.NetworkType,
                Name = account.Name,
                Username = account.Username,
                IsActive = account.IsActive,
                RequiresReauthorization = account.RequiresReauthorization
            };

            return Result<SocialAccountSummaryDto>.Success(dto);
        }

        public async Task<Result> DisconnectSocialAccountAsync(Guid workspaceId, Guid socialAccountId)
        {
            var account = await _dbContext.SocialAccounts
                .FirstOrDefaultAsync(a => a.Id == socialAccountId && a.WorkspaceId == workspaceId);

            if (account == null)
            {
                return Result.Failure("Social account not found for this workspace.");
            }

            account.IsActive = false;
            account.RequiresReauthorization = true;
            account.MarkUpdated();

            // Optionally clear tokens; for now we keep them but mark account as requiring reauthorization.
            await _dbContext.SaveChangesAsync();

            return Result.Success();
        }
    }
}