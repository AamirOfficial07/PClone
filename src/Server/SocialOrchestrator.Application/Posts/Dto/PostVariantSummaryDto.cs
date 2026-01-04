using SocialOrchestrator.Domain.Posts;

namespace SocialOrchestrator.Application.Posts.Dto
{
    /// <summary>
    /// Summary information about a post variant.
    /// </summary>
    public class PostVariantSummaryDto
    {
        public Guid Id { get; set; }

        public Guid SocialAccountId { get; set; }

        public PostType Type { get; set; }

        public string Text { get; set; } = string.Empty;

        public PostState State { get; set; }

        public DateTime? ScheduledAtUtc { get; set; }

        public DateTime? PublishedAtUtc { get; set; }

        public string? LastErrorMessage { get; set; }
    }
}