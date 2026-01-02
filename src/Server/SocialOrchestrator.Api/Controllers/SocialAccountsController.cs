using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SocialOrchestrator.Application.SocialAccounts.Services;
using SocialOrchestrator.Application.Workspaces.Services;

namespace SocialOrchestrator.Api.Controllers
{
    /// <summary>
    /// API for listing and disconnecting social accounts per workspace.
    /// </summary>
    [ApiController]
    [Route("api/workspaces/{workspaceId:guid}/social-accounts")]
    [Authorize]
    public class SocialAccountsController : ControllerBase
    {
        private readonly ISocialAccountService _socialAccountService;
        private readonly IWorkspaceService _workspaceService;

        public SocialAccountsController(
            ISocialAccountService socialAccountService,
            IWorkspaceService workspaceService)
        {
            _socialAccountService = socialAccountService;
            _workspaceService = workspaceService;
        }

        /// <summary>
        /// Returns social accounts for the given workspace, if the current user is a member.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> Get(Guid workspaceId)
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(new { error = "Unable to identify user." });
            }

            if (!await UserIsInWorkspaceAsync(userId.Value, workspaceId))
            {
                return Forbid();
            }

            var result = await _socialAccountService.GetWorkspaceSocialAccountsAsync(workspaceId);
            if (!result.IsSuccess)
            {
                return BadRequest(new { error = result.Error });
            }

            return Ok(result.Value);
        }

        /// <summary>
        /// Marks a social account as disconnected for the given workspace.
        /// </summary>
        [HttpDelete("{socialAccountId:guid}")]
        public async Task<IActionResult> Disconnect(Guid workspaceId, Guid socialAccountId)
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(new { error = "Unable to identify user." });
            }

            if (!await UserIsInWorkspaceAsync(userId.Value, workspaceId))
            {
                return Forbid();
            }

            var result = await _socialAccountService.DisconnectSocialAccountAsync(workspaceId, socialAccountId);
            if (!result.IsSuccess)
            {
                return BadRequest(new { error = result.Error });
            }

            return NoContent();
        }

        private Guid? GetCurrentUserId()
        {
            var subClaim = User.FindFirst(ClaimTypes.NameIdentifier)
                ?? User.FindFirst("sub");

            if (subClaim != null && Guid.TryParse(subClaim.Value, out var userId))
            {
                return userId;
            }

            return null;
        }

        private async Task<bool> UserIsInWorkspaceAsync(Guid userId, Guid workspaceId)
        {
            var workspacesResult = await _workspaceService.GetUserWorkspacesAsync(userId);
            if (!workspacesResult.IsSuccess || workspacesResult.Value == null)
            {
                return false;
            }

            return workspacesResult.Value.Any(w => w.Id == workspaceId);
        }
    }
}