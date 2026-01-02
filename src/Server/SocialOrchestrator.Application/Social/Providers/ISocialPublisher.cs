using SocialOrchestrator.Domain.Posts;
using SocialOrchestrator.Domain.SocialAccounts;

namespace SocialOrchestrator.Application.Social.Providers
{
    /// <summary>
    /// Abstraction for publishing post variants to social networks.
    /// </summary>
    public interface ISocialPublisher
    {
        /// <summary>
        /// The social network this publisher targets.
        /// </summary>
        SocialNetworkType NetworkType { get; }

        /// <summary>
        /// Publishes the specified post variant to the associated social account.
        /// </summary>
        /// <param name="variant">The post variant to publish.</param>
        /// <param name="account">The target social account.</param>
        /// <param name="token">The OAuth token to use for publishing.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>A result indicating success or failure, including provider post id when available.</returns>
        Task<SocialPublishResult> PublishAsync(
            PostVariant variant,
            SocialAccount account,
            SocialAuthToken token,
            CancellationToken cancellationToken);
    }

    /// <summary>
    /// Result of a publish operation against a social provider.
    /// </summary>
    public class SocialPublishResult
    {
        public bool IsSuccess { get; init; }

        public string? ProviderPostId { get; init; }

        public string? ErrorMessage { get; init; }

        public static SocialPublishResult Success(string providerPostId)
        {
            return new SocialPublishResult
            {
                IsSuccess = true,
                ProviderPostId = providerPostId,
                ErrorMessage = null
            };
        }

        public static SocialPublishResult Failure(string errorMessage)
        {
            return new SocialPublishResult
            {
                IsSuccess = false,
                ProviderPostId = null,
                ErrorMessage = errorMessage
            };
        }
    }
}