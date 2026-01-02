namespace SocialOrchestrator.Application.Posts.Dto
{
    /// <summary>
    /// Detailed view of a post with its variants.
    /// </summary>
    public class PostDetailDto
    {
        public Guid Id { get; set; }

        public Guid WorkspaceId { get; set; }

        public string? Title { get; set; }

        public string? Notes { get; set; }

        public Guid CreatedByUserId { get; set; }

        public DateTime CreatedAt { get; set; }

        public IReadOnlyList<PostVariantSummaryDto> Variants { get; set; } = Array.Empty<PostVariantSummaryDto>();
    }
}