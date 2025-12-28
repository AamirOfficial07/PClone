namespace SocialOrchestrator.Application.Workspaces.Dto
{
    /// <summary>
    /// Request DTO for creating a workspace.
    /// </summary>
    public class CreateWorkspaceRequest
    {
        /// <summary>
        /// The name of the workspace.
        /// </summary>
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// Optional timezone for the workspace (IANA or Windows ID).
        /// Defaults to UTC if not specified.
        /// </summary>
        public string? TimeZone { get; set; }
    }
}
