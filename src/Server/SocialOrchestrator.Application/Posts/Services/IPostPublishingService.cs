namespace SocialOrchestrator.Application.Posts.Services
{
    /// <summary>
    /// Service responsible for publishing scheduled post variants to social providers.
    /// Intended to be invoked by background jobs.
    /// </summary>
    public interface IPostPublishingService
    {
        /// <summary>
        /// Publishes a single post variant, if it is still in the Scheduled state.
        /// </summary>
        /// <param name="postVariantId">The identifier of the post variant to publish.</param>
        Task PublishPostVariantAsync(Guid postVariantId);
    }
}