using SocialOrchestrator.Domain.Common;

namespace SocialOrchestrator.Domain.Workspaces
{
    /// <summary>
    /// Represents a workspace entity in the system.
    /// A workspace is a container for organizing social accounts, posts, and team members.
    /// </summary>
    public class Workspace : EntityBase
    {
        /// <summary>
        /// The display name of the workspace.
        /// Required, max length 200 characters.
        /// </summary>
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// URL-friendly name for the workspace (unique per system).
        /// </summary>
        public string Slug { get; set; } = string.Empty;

        /// <summary>
        /// The user ID of the workspace owner.
        /// </summary>
        public Guid OwnerUserId { get; set; }

        /// <summary>
        /// The timezone for the workspace (IANA or Windows ID).
        /// </summary>
        public string TimeZone { get; set; } = "UTC";

        /// <summary>
        /// Navigation property to workspace members.
        /// </summary>
        public virtual ICollection<WorkspaceMember> Members { get; set; } = new List<WorkspaceMember>();
    }
}
