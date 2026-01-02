using SocialOrchestrator.Domain.Posts;

namespace SocialOrchestrator.Application.Posts.Dto
{
    /// <summary>
    /// Request model for creating a post variant targeting a specific social account.
    /// </summary>
    public class CreatePostVariantRequest
    {
        public Guid SocialAccountId { get; set; }

        public PostType Type { get; set; }

        public string Text { get; set; } = string.Empty;

        public string? LinkUrl { get; set; }

        public Guid? MediaAssetId { get; set; }

        /// <summary>
        /// Scheduled time in the workspace's local time zone.
        /// The application service converts this to UTC using the workspace's configured time zone.
        /// </summary>
        public DateTime ScheduledAt { get; set; }
    }
}