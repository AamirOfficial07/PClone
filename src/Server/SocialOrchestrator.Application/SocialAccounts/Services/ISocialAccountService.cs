using SocialOrchestrator.Application.Social.Providers;
using SocialOrchestrator.Application.SocialAccounts.Dto;
using SocialOrchestrator.Domain.Common;

namespace SocialOrchestrator.Application.SocialAccounts.Services
{
    /// <summary>
    /// Service interface for managing social accounts per workspace.
    /// </summary>
    public interface ISocialAccountService
    {
        /// <summary>
        /// Gets all social accounts attached to a workspace.
        /// </summary>
        Task<Result<IReadOnlyList<SocialAccountSummaryDto>>> GetWorkspaceSocialAccountsAsync(Guid workspaceId);

        /// <summary>
        /// Connects or updates a social account for a workspace based on OAuth callback data.
        /// </summary>
        Task<Result<SocialAccountSummaryDto>> ConnectSocialAccountAsync(Guid workspaceId, OAuthCallbackResult oauthResult);

        /// <summary>
        /// Marks a social account as disconnected for a workspace.
        /// </summary>
        Task<Result> DisconnectSocialAccountAsync(Guid workspaceId, Guid socialAccountId);
    }
}