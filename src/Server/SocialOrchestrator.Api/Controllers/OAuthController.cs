using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SocialOrchestrator.Application.Social.Providers;
using SocialOrchestrator.Application.SocialAccounts.Services;
using SocialOrchestrator.Application.Workspaces.Services;
using SocialOrchestrator.Domain.SocialAccounts;

namespace SocialOrchestrator.Api.Controllers
{
    /// <summary>
    /// Handles OAuth authorization and callback flows for social providers.
    /// Currently implements Facebook as the first provider.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class OAuthController : ControllerBase
    {
        private readonly IEnumerable<ISocialAuthProvider> _authProviders;
        private readonly ISocialAccountService _socialAccountService;
        private readonly IWorkspaceService _workspaceService;

        public OAuthController(
            IEnumerable<ISocialAuthProvider> authProviders,
            ISocialAccountService socialAccountService,
            IWorkspaceService workspaceService)
        {
            _authProviders = authProviders;
            _socialAccountService = socialAccountService;
            _workspaceService = workspaceService;
        }

        /// <summary>
        /// Initiates the Facebook OAuth flow for a given workspace.
        /// </summary>
        [HttpGet("facebook/authorize")]
        [Authorize]
        public async Task<IActionResult> GetFacebookAuthorizationUrl([FromQuery] Guid workspaceId)
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(new { error = "Unable to identify user." });
            }

            // Ensure the user is a member of the workspace before initiating OAuth
            var workspacesResult = await _workspaceService.GetUserWorkspacesAsync(userId.Value);
            if (!workspacesResult.IsSuccess ||
                workspacesResult.Value == null ||
                !workspacesResult.Value.Any(w => w.Id == workspaceId))
            {
                return Forbid();
            }

            var provider = GetProvider(SocialNetworkType.Facebook);
            if (provider == null)
            {
                return StatusCode(500, new { error = "Facebook provider is not configured." });
            }

            // Encode workspace and user into state for later validation
            var nonce = Guid.NewGuid();
            var state = $"{workspaceId}:{userId}:{nonce}";

            var authorizationUrl = provider.GetAuthorizationUrl(workspaceId, userId.Value, state);

            return Ok(new { authorizationUrl });
        }

        /// <summary>
        /// OAuth callback endpoint for Facebook.
        /// This is called by Facebook after the user authorizes or denies access.
        /// </summary>
        [HttpGet("facebook/callback")]
        [AllowAnonymous]
        public async Task<IActionResult> FacebookCallback([FromQuery] string code, [FromQuery] string state)
        {
            if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(state))
            {
                return Content("Invalid OAuth callback parameters.", "text/html");
            }

            if (!TryParseState(state, out var workspaceId, out var userId))
            {
                return Content("Invalid or malformed OAuth state. Please retry connecting your account.", "text/html");
            }

            var provider = GetProvider(SocialNetworkType.Facebook);
            if (provider == null)
            {
                return Content("Facebook provider is not configured on the server.", "text/html");
            }

            // Validate that the user still belongs to the workspace
            var workspacesResult = await _workspaceService.GetUserWorkspacesAsync(userId);
            if (!workspacesResult.IsSuccess ||
                workspacesResult.Value == null ||
                !workspacesResult.Value.Any(w => w.Id == workspaceId))
            {
                return Content("You no longer have access to this workspace.", "text/html");
            }

            var oauthResult = await provider.HandleCallbackAsync(code, state);
            if (!oauthResult.IsSuccess)
            {
                var error = oauthResult.ErrorMessage ?? "OAuth authorization failed.";
                return Content($"Failed to connect Facebook account: {error}", "text/html");
            }

            var connectResult = await _socialAccountService.ConnectSocialAccountAsync(workspaceId, oauthResult);
            if (!connectResult.IsSuccess)
            {
                var error = connectResult.Error ?? "Unable to persist social account connection.";
                return Content($"Failed to save connected account: {error}", "text/html");
            }

            // Simple HTML response - the SPA can open this in a popup and let the user close it.
            const string successHtml = @"
<!DOCTYPE html>
<html lang=""en"">
<head>
    <meta charset=""utf-8"" />
    <title>Social account connected</title>
    <style>
        body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 2rem; text-align: center; }
        h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
        p { color: #555; margin-bottom: 1.5rem; }
        button { padding: 0.5rem 1rem; border-radius: 4px; border: none; background: #2563eb; color: #fff; cursor: pointer; }
        button:hover { background: #1d4ed8; }
    </style>
</head>
<body>
    <h1>Connection successful</h1>
    <p>Your Facebook account has been connected. You can close this window and return to SocialOrchestrator.</p>
    <button type=""button"" onclick=""window.close();"">Close window</button>
</body>
</html>";

            return Content(successHtml, "text/html");
        }

        private ISocialAuthProvider? GetProvider(SocialNetworkType networkType)
        {
            return _authProviders.FirstOrDefault(p => p.NetworkType == networkType);
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

        private static bool TryParseState(string state, out Guid workspaceId, out Guid userId)
        {
            workspaceId = Guid.Empty;
            userId = Guid.Empty;

            var parts = state.Split(':', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length < 2)
            {
                return false;
            }

            if (!Guid.TryParse(parts[0], out workspaceId))
            {
                return false;
            }

            if (!Guid.TryParse(parts[1], out userId))
            {
                return false;
            }

            return true;
        }
    }
}