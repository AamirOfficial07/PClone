using SocialOrchestrator.Domain.Posts;

namespace SocialOrchestrator.Application.Posts.Dto
{
    /// <summary>
    /// Request for listing posts within a workspace with optional filters.
    /// </summary>
    public class ListPostsRequest
    {
        public Guid WorkspaceId { get; set; }

        public int PageNumber { get; set; }

        public int PageSize { get; set; }

        public PostState? State { get; set; }

        public Guid? SocialAccountId { get; set; }

        public DateTime? FromUtc { get; set; }

        public DateTime? ToUtc { get; set; }
    }
}