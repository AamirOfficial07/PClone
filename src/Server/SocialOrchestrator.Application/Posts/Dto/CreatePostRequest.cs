namespace SocialOrchestrator.Application.Posts.Dto
{
    /// <summary>
    /// Request model for creating a new post.
    /// </summary>
    public class CreatePostRequest
    {
        public Guid WorkspaceId { get; set; }

        public string? Title { get; set; }

        public string? Notes { get; set; }
    }
}