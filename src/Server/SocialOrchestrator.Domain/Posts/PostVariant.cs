using SocialOrchestrator.Domain.Common;
using SocialOrchestrator.Domain.SocialAccounts;

namespace SocialOrchestrator.Domain.Posts
{
    /// <summary>
    /// Represents a concrete, schedulable variant of a post targeting a specific social account.
    /// </summary>
    public class PostVariant : EntityBase
    {
        /// <summary>
        /// The parent post identifier.
        /// </summary>
        public Guid PostId { get; set; }

        /// <summary>
        /// The social account this variant will publish to.
        /// </summary>
        public Guid SocialAccountId { get; set; }

        /// <summary>
        /// The type of this post variant.
        /// </summary>
        public PostType Type { get; set; }

        /// <summary>
        /// The caption or message text.
        /// </summary>
        public string Text { get; set; } = string.Empty;

        /// <summary>
        /// Optional URL for link posts.
        /// </summary>
        public string? LinkUrl { get; set; }

        /// <summary>
        /// Optional media asset identifier for single-media posts.
        /// Multi-media support is added in later phases.
        /// </summary>
        public Guid? MediaAssetId { get; set; }

        /// <summary>
        /// Current state of this post variant.
        /// </summary>
        public PostState State { get; set; }

        /// <summary>
        /// Scheduled time in UTC for publishing this variant.
        /// </summary>
        public DateTime? ScheduledAtUtc { get; set; }

        /// <summary>
        /// Time in UTC when this variant was successfully published, if any.
        /// </summary>
        public DateTime? PublishedAtUtc { get; set; }

        /// <summary>
        /// Provider-specific identifier of the created post after publishing.
        /// </summary>
        public string? ProviderPostId { get; set; }

        /// <summary>
        /// Last error message, if publishing failed.
        /// </summary>
        public string? LastErrorMessage { get; set; }

        /// <summary>
        /// Navigation to the parent post.
        /// </summary>
        public virtual Post? Post { get; set; }

        /// <summary>
        /// Navigation to the target social account.
        /// </summary>
        public virtual SocialAccount? SocialAccount { get; set; }
    }
}