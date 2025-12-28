using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SocialOrchestrator.Application.Workspaces.Dto;
using SocialOrchestrator.Application.Workspaces.Services;

namespace SocialOrchestrator.Api.Controllers
{
    /// <summary>
    /// Controller for workspace operations.
    /// Requires authentication for all endpoints.
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class WorkspacesController : ControllerBase
    {
        private readonly IWorkspaceService _workspaceService;

        public WorkspacesController(IWorkspaceService workspaceService)
        {
            _workspaceService = workspaceService;
        }

        /// <summary>
        /// Creates a new workspace for the current user.
        /// </summary>
        /// <param name="request">The workspace creation request.</param>
        /// <returns>200 OK with WorkspaceSummaryDto on success, 400 Bad Request on failure.</returns>
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateWorkspaceRequest request)
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(new { error = "Unable to identify user." });
            }

            var result = await _workspaceService.CreateWorkspaceAsync(userId.Value, request);

            if (!result.IsSuccess)
            {
                return BadRequest(new { error = result.Error });
            }

            return Ok(result.Value);
        }

        /// <summary>
        /// Gets all workspaces the current user is a member of.
        /// </summary>
        /// <returns>List of WorkspaceSummaryDto.</returns>
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(new { error = "Unable to identify user." });
            }

            var result = await _workspaceService.GetUserWorkspacesAsync(userId.Value);

            if (!result.IsSuccess)
            {
                return BadRequest(new { error = result.Error });
            }

            return Ok(result.Value);
        }

        /// <summary>
        /// Gets the current user's ID from the JWT token's sub claim.
        /// </summary>
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
    }
}
