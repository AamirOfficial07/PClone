namespace SocialOrchestrator.Application.Posts.Dto
{
    /// <summary>
    /// Summary information about a post for list views.
    /// </summary>
    public class PostListItemDto
    {
        public Guid Id { get; set; }

        public string? Title { get; set; }

        public DateTime CreatedAt { get; set; }

        public int VariantCount { get; set; }

        public int PublishedCount { get; set; }

        public int FailedCount { get; set; }

        public int ScheduledCount { get; set; }
    }
}