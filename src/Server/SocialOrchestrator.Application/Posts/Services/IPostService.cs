using SocialOrchestrator.Application.Common;
using SocialOrchestrator.Application.Posts.Dto;
using SocialOrchestrator.Domain.Common;

namespace SocialOrchestrator.Application.Posts.Services
{
    /// <summary>
    /// Application service interface for working with posts and their variants.
    /// </summary>
    public interface IPostService
    {
        /// <summary>
        /// Creates a post and associated variants for a workspace.
        /// </summary>
        /// <param name="userId">The user creating the post.</param>
        /// <param name="postRequest">The post creation request.</param>
        /// <param name="variantRequests">The variants to create under this post.</param>
        /// <returns>A result containing the created post detail or an error.</returns>
        Task<Result<PostDetailDto>> CreatePostWithVariantsAsync(
            Guid userId,
            CreatePostRequest postRequest,
            IReadOnlyList<CreatePostVariantRequest> variantRequests);

        /// <summary>
        /// Gets a post and its variants for a given workspace and user.
        /// </summary>
        Task<Result<PostDetailDto>> GetPostAsync(Guid workspaceId, Guid postId, Guid userId);

        /// <summary>
        /// Lists posts for a workspace with optional filters and pagination.
        /// </summary>
        Task<Result<PagedResult<PostListItemDto>>> ListPostsAsync(ListPostsRequest request, Guid userId);
    }
}