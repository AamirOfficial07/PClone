using SocialOrchestrator.Domain.Common;

namespace SocialOrchestrator.Domain.Workspaces
{
    /// <summary>
    /// Represents the membership of a user within a workspace.
    /// </summary>
    public class WorkspaceMember : EntityBase
    {
        /// <summary>
        /// The ID of the workspace this membership belongs to.
        /// </summary>
        public Guid WorkspaceId { get; set; }

        /// <summary>
        /// The ID of the user who is a member of the workspace.
        /// </summary>
        public Guid UserId { get; set; }

        /// <summary>
        /// The role of the user within the workspace.
        /// </summary>
        public WorkspaceRole Role { get; set; }

        /// <summary>
        /// The date and time when the user joined the workspace.
        /// </summary>
        public DateTime JoinedAt { get; set; }

        /// <summary>
        /// Navigation property to the workspace.
        /// </summary>
        public virtual Workspace? Workspace { get; set; }
    }
}
