using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SocialOrchestrator.Application.Posts.Dto;
using SocialOrchestrator.Application.Posts.Services;
using SocialOrchestrator.Application.Workspaces.Services;

namespace SocialOrchestrator.Api.Controllers
{
    /// <summary>
    /// API for creating and listing posts within a workspace.
    /// </summary>
    [ApiController]
    [Route("api/workspaces/{workspaceId:guid}/posts")]
    [Authorize]
    public class PostsController : ControllerBase
    {
        private readonly IPostService _postService;
        private readonly IWorkspaceService _workspaceService;

        public PostsController(IPostService postService, IWorkspaceService workspaceService)
        {
            _postService = postService;
            _workspaceService = workspaceService;
        }

        /// <summary>
        /// Wrapper model for creating a post with variants.
        /// </summary>
        public class CreatePostWithVariantsRequest
        {
            public CreatePostRequest Post { get; set; } = new CreatePostRequest();

            public List<CreatePostVariantRequest> Variants { get; set; } = new();
        }

        [HttpPost]
        public async Task<IActionResult> Create(Guid workspaceId, [FromBody] CreatePostWithVariantsRequest request)
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

            if (request.Post == null)
            {
                return BadRequest(new { error = "Post payload is required." });
            }

            request.Post.WorkspaceId = workspaceId;

            var result = await _postService.CreatePostWithVariantsAsync(
                userId.Value,
                request.Post,
                request.Variants);

            if (!result.IsSuccess || result.Value == null)
            {
                return BadRequest(new { error = result.Error });
            }

            return Ok(result.Value);
        }

        [HttpGet("{postId:guid}")]
        public async Task<IActionResult> Get(Guid workspaceId, Guid postId)
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

            var result = await _postService.GetPostAsync(workspaceId, postId, userId.Value);
            if (!result.IsSuccess || result.Value == null)
            {
                return NotFound(new { error = result.Error ?? "Post not found." });
            }

            return Ok(result.Value);
        }

        [HttpGet]
        public async Task<IActionResult> List(
            Guid workspaceId,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? state = null,
            [FromQuery] Guid? socialAccountId = null,
            [FromQuery] DateTime? fromUtc = null,
            [FromQuery] DateTime? toUtc = null)
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

            var request = new ListPostsRequest
            {
                WorkspaceId = workspaceId,
                PageNumber = pageNumber,
                PageSize = pageSize,
                SocialAccountId = socialAccountId,
                FromUtc = fromUtc,
                ToUtc = toUtc
            };

            if (!string.IsNullOrWhiteSpace(state) &&
                Enum.TryParse<Domain.Posts.PostState>(state, true, out var parsedState))
            {
                request.State = parsedState;
            }

            var result = await _postService.ListPostsAsync(request, userId.Value);
            if (!result.IsSuccess || result.Value == null)
            {
                return BadRequest(new { error = result.Error });
            }

            return Ok(result.Value);
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