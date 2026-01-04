using Microsoft.EntityFrameworkCore;
using SocialOrchestrator.Application.Posts.Services;
using SocialOrchestrator.Application.Social.Providers;
using SocialOrchestrator.Domain.Posts;
using SocialOrchestrator.Infrastructure.Persistence;

namespace SocialOrchestrator.Infrastructure.Posts
{
    /// <summary>
    /// Publishes scheduled post variants via provider-specific publishers.
    /// Intended to be invoked from background jobs.
    /// </summary>
    public class PostPublishingService : IPostPublishingService
    {
        private readonly AppDbContext _dbContext;
        private readonly IEnumerable<ISocialPublisher> _publishers;

        public PostPublishingService(AppDbContext dbContext, IEnumerable<ISocialPublisher> publishers)
        {
            _dbContext = dbContext;
            _publishers = publishers;
        }

        public async Task PublishPostVariantAsync(Guid postVariantId)
        {
            var variant = await _dbContext.PostVariants
                .FirstOrDefaultAsync(v => v.Id == postVariantId);

            if (variant == null)
            {
                return;
            }

            if (variant.State != PostState.Scheduled)
            {
                // Already processed or not in a schedulable state.
                return;
            }

            var socialAccount = await _dbContext.SocialAccounts
                .FirstOrDefaultAsync(a => a.Id == variant.SocialAccountId);

            if (socialAccount == null)
            {
                variant.State = PostState.Failed;
                variant.LastErrorMessage = "Social account not found for post variant.";
                variant.MarkUpdated();
                await _dbContext.SaveChangesAsync();
                return;
            }

            var token = await _dbContext.SocialAuthTokens
                .FirstOrDefaultAsync(t => t.SocialAccountId == socialAccount.Id);

            if (token == null)
            {
                variant.State = PostState.Failed;
                variant.LastErrorMessage = "No auth token available for social account.";
                variant.MarkUpdated();
                await _dbContext.SaveChangesAsync();
                return;
            }

            var publisher = _publishers.FirstOrDefault(p => p.NetworkType == socialAccount.NetworkType);
            if (publisher == null)
            {
                variant.State = PostState.Failed;
                variant.LastErrorMessage = "No publisher is configured for this social network.";
                variant.MarkUpdated();
                await _dbContext.SaveChangesAsync();
                return;
            }

            SocialPublishResult publishResult;
            try
            {
                publishResult = await publisher.PublishAsync(
                    variant,
                    socialAccount,
                    token,
                    CancellationToken.None);
            }
            catch (Exception ex)
            {
                variant.State = PostState.Failed;
                variant.LastErrorMessage = ex.Message;
                variant.MarkUpdated();
                await _dbContext.SaveChangesAsync();
                throw;
            }

            if (publishResult.IsSuccess)
            {
                variant.State = PostState.Published;
                variant.PublishedAtUtc = DateTime.UtcNow;
                variant.ProviderPostId = publishResult.ProviderPostId;
                variant.LastErrorMessage = null;
            }
            else
            {
                variant.State = PostState.Failed;
                variant.LastErrorMessage = publishResult.ErrorMessage;
            }

            variant.MarkUpdated();
            await _dbContext.SaveChangesAsync();
        }
    }
}