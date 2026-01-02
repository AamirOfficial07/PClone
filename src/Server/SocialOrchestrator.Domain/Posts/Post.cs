using SocialOrchestrator.Domain.Common;

namespace SocialOrchestrator.Domain.Posts
{
    /// <summary>
    /// Represents a conceptual post under a workspace.
    /// Individual variants are represented by <see cref="PostVariant"/>.
    /// </summary>
    public class Post : EntityBase
    {
        /// <summary>
        /// The workspace this post belongs to.
        /// </summary>
        public Guid WorkspaceId { get; set; }

        /// <summary>
        /// Optional user-friendly title for the post.
        /// </summary>
        public string? Title { get; set; }

        /// <summary>
        /// Optional internal notes for the team.
        /// </summary>
        public string? Notes { get; set; }

        /// <summary>
        /// The user who created the post.
        /// </summary>
        public Guid CreatedByUserId { get; set; }

        /// <summary>
        /// The user who approved the post, if any.
        /// Approval workflows are introduced in later phases.
        /// </summary>
        public Guid? ApprovedByUserId { get; set; }

        /// <summary>
        /// Navigation property to post variants.
        /// </summary>
        public virtual ICollection<PostVariant> Variants { get; set; } = new List<PostVariant>();
    }
}