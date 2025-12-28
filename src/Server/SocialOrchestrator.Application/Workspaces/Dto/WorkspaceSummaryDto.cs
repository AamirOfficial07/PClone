using SocialOrchestrator.Domain.Workspaces;

namespace SocialOrchestrator.Application.Workspaces.Dto
{
    /// <summary>
    /// Summary DTO for a workspace, including the current user's role.
    /// </summary>
    public class WorkspaceSummaryDto
    {
        /// <summary>
        /// The unique identifier of the workspace.
        /// </summary>
        public Guid Id { get; set; }

        /// <summary>
        /// The display name of the workspace.
        /// </summary>
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// URL-friendly name for the workspace.
        /// </summary>
        public string Slug { get; set; } = string.Empty;

        /// <summary>
        /// The timezone for the workspace.
        /// </summary>
        public string TimeZone { get; set; } = string.Empty;

        /// <summary>
        /// The role of the current user in this workspace.
        /// </summary>
        public WorkspaceRole Role { get; set; }
    }
}
