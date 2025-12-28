using SocialOrchestrator.Application.Workspaces.Dto;
using SocialOrchestrator.Domain.Common;

namespace SocialOrchestrator.Application.Workspaces.Services
{
    /// <summary>
    /// Service interface for workspace operations.
    /// </summary>
    public interface IWorkspaceService
    {
        /// <summary>
        /// Creates a new workspace for the given user.
        /// </summary>
        /// <param name="userId">The ID of the user creating the workspace.</param>
        /// <param name="request">The workspace creation request.</param>
        /// <returns>A result containing the created workspace summary or an error.</returns>
        Task<Result<WorkspaceSummaryDto>> CreateWorkspaceAsync(Guid userId, CreateWorkspaceRequest request);

        /// <summary>
        /// Gets all workspaces the user is a member of.
        /// </summary>
        /// <param name="userId">The ID of the user.</param>
        /// <returns>A result containing the list of workspace summaries or an error.</returns>
        Task<Result<IReadOnlyList<WorkspaceSummaryDto>>> GetUserWorkspacesAsync(Guid userId);
    }
}
