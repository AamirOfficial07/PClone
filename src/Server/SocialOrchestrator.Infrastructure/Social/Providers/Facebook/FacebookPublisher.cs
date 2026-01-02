using SocialOrchestrator.Application.Social.Providers;
using SocialOrchestrator.Domain.Posts;
using SocialOrchestrator.Domain.SocialAccounts;

namespace SocialOrchestrator.Infrastructure.Social.Providers.Facebook
{
    /// <summary>
    /// Stub implementation of ISocialPublisher for Facebook.
    /// In Phase 3 this does not perform real HTTP calls; it simply simulates success.
    /// </summary>
    public class FacebookPublisher : ISocialPublisher
    {
        public SocialNetworkType NetworkType => SocialNetworkType.Facebook;

        public Task<SocialPublishResult> PublishAsync(
            PostVariant variant,
            SocialAccount account,
            SocialAuthToken token,
            CancellationToken cancellationToken)
        {
            // TODO: Integrate with Facebook Graph API to publish posts in a later phase.
            // For Phase 3 we simulate a successful publish and return a fake provider post id.
            var fakeProviderPostId = Guid.NewGuid().ToString("N");
            var result = SocialPublishResult.Success(fakeProviderPostId);
            return Task.FromResult(result);
        }
    }
}