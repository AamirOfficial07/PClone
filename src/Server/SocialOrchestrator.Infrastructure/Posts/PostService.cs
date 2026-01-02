using Hangfire;
using Microsoft.EntityFrameworkCore;
using SocialOrchestrator.Application.Common;
using SocialOrchestrator.Application.Posts.Dto;
using SocialOrchestrator.Application.Posts.Services;
using SocialOrchestrator.Domain.Common;
using SocialOrchestrator.Domain.Posts;
using SocialOrchestrator.Infrastructure.Persistence;

namespace SocialOrchestrator.Infrastructure.Posts
{
    /// <summary>
    /// Implementation of IPostService using EF Core and Hangfire for scheduling.
    /// </summary>
    public class PostService : IPostService
    {
        private readonly AppDbContext _dbContext;
        private readonly IBackgroundJobClient _backgroundJobClient;

        public PostService(AppDbContext dbContext, IBackgroundJobClient backgroundJobClient)
        {
            _dbContext = dbContext;
            _backgroundJobClient = backgroundJobClient;
        }

        public async Task<Result<PostDetailDto>> CreatePostWithVariantsAsync(
            Guid userId,
            CreatePostRequest postRequest,
            IReadOnlyList<CreatePostVariantRequest> variantRequests)
        {
            if (postRequest == null)
            {
                return Result<PostDetailDto>.Failure("Post request is required.");
            }

            if (variantRequests == null || variantRequests.Count == 0)
            {
                return Result<PostDetailDto>.Failure("At least one post variant is required.");
            }

            // Ensure workspace exists and user is a member.
            var workspace = await _dbContext.Workspaces
                .Include(w => w.Members)
                .FirstOrDefaultAsync(w => w.Id == postRequest.WorkspaceId);

            if (workspace == null)
            {
                return Result<PostDetailDto>.Failure("Workspace not found.");
            }

            var isMember = workspace.OwnerUserId == userId ||
                           workspace.Members.Any(m => m.UserId == userId);

            if (!isMember)
            {
                return Result<PostDetailDto>.Failure("User does not belong to the workspace.");
            }

            // Resolve workspace time zone for scheduled times.
            TimeZoneInfo workspaceTimeZone;
            try
            {
                workspaceTimeZone = TimeZoneInfo.FindSystemTimeZoneById(workspace.TimeZone);
            }
            catch
            {
                // Fallback to UTC if the configured time zone is not recognized on this system.
                workspaceTimeZone = TimeZoneInfo.Utc;
                // TODO: consider logging invalid workspace time zone identifier.
            }

            var utcNow = DateTime.UtcNow;

            var post = new Post
            {
                Id = Guid.NewGuid(),
                WorkspaceId = postRequest.WorkspaceId,
                Title = postRequest.Title,
                Notes = postRequest.Notes,
                CreatedByUserId = userId,
                ApprovedByUserId = null,
                // Align with existing domain pattern of explicitly setting timestamps.
                CreatedAt = utcNow
            };

            _dbContext.Posts.Add(post);

            var variants = new List<PostVariant>();

            foreach (var variantRequest in variantRequests)
            {
                // Ensure social account belongs to workspace.
                var socialAccount = await _dbContext.SocialAccounts
                    .FirstOrDefaultAsync(a =>
                        a.Id == variantRequest.SocialAccountId &&
                        a.WorkspaceId == postRequest.WorkspaceId);

                if (socialAccount == null)
                {
                    return Result<PostDetailDto>.Failure(
                        "One or more social accounts do not belong to the workspace.");
                }

                var scheduledLocal = DateTime.SpecifyKind(
                    variantRequest.ScheduledAt,
                    DateTimeKind.Unspecified);

                var scheduledUtc = TimeZoneInfo.ConvertTimeToUtc(scheduledLocal, workspaceTimeZone);

                var variant = new PostVariant
                {
                    Id = Guid.NewGuid(),
                    PostId = post.Id,
                    SocialAccountId = variantRequest.SocialAccountId,
                    Type = variantRequest.Type,
                    Text = variantRequest.Text,
                    LinkUrl = variantRequest.LinkUrl,
                    MediaAssetId = variantRequest.MediaAssetId,
                    State = PostState.Scheduled,
                    ScheduledAtUtc = scheduledUtc,
                    CreatedAt = utcNow
                };

                variants.Add(variant);
                _dbContext.PostVariants.Add(variant);
            }

            await _dbContext.SaveChangesAsync();

            // Schedule background publishing jobs for each variant.
            foreach (var variant in variants)
            {
                if (variant.ScheduledAtUtc.HasValue && variant.ScheduledAtUtc.Value > utcNow)
                {
                    _backgroundJobClient.Schedule<IPostPublishingService>(
                        service => service.PublishPostVariantAsync(variant.Id),
                        variant.ScheduledAtUtc.Value);
                }
                else
                {
                    // If scheduled time is in the past or null, enqueue immediately.
                    _backgroundJobClient.Enqueue<IPostPublishingService>(
                        service => service.PublishPostVariantAsync(variant.Id));
                }
            }

            var dto = new PostDetailDto
            {
                Id = post.Id,
                WorkspaceId = post.WorkspaceId,
                Title = post.Title,
                Notes = post.Notes,
                CreatedByUserId = post.CreatedByUserId,
                CreatedAt = post.CreatedAt,
                Variants = variants
                    .Select(v => new PostVariantSummaryDto
                    {
                        Id = v.Id,
                        SocialAccountId = v.SocialAccountId,
                        Type = v.Type,
                        Text = v.Text,
                        State = v.State,
                        ScheduledAtUtc = v.ScheduledAtUtc,
                        PublishedAtUtc = v.PublishedAtUtc,
                        LastErrorMessage = v.LastErrorMessage
                    })
                    .ToList()
            };

            return Result<PostDetailDto>.Success(dto);
        }

        public async Task<Result<PostDetailDto>> GetPostAsync(Guid workspaceId, Guid postId, Guid userId)
        {
            // Ensure user is a member of the workspace.
            var isMember = await _dbContext.WorkspaceMembers
                .AnyAsync(m => m.WorkspaceId == workspaceId && m.UserId == userId);

            if (!isMember)
            {
                // Additionally allow workspace owner if not explicitly in members.
                var isOwner = await _dbContext.Workspaces
                    .AnyAsync(w => w.Id == workspaceId && w.OwnerUserId == userId);

                if (!isOwner)
                {
                    return Result<PostDetailDto>.Failure("User does not belong to the workspace.");
                }
            }

            var post = await _dbContext.Posts
                .Include(p => p.Variants)
                .FirstOrDefaultAsync(p => p.Id == postId && p.WorkspaceId == workspaceId);

            if (post == null)
            {
                return Result<PostDetailDto>.Failure("Post not found.");
            }

            var variants = post.Variants
                .OrderBy(v => v.ScheduledAtUtc ?? v.CreatedAt)
                .Select(v => new PostVariantSummaryDto
                {
                    Id = v.Id,
                    SocialAccountId = v.SocialAccountId,
                    Type = v.Type,
                    Text = v.Text,
                    State = v.State,
                    ScheduledAtUtc = v.ScheduledAtUtc,
                    PublishedAtUtc = v.PublishedAtUtc,
                    LastErrorMessage = v.LastErrorMessage
                })
                .ToList();

            var dto = new PostDetailDto
            {
                Id = post.Id,
                WorkspaceId = post.WorkspaceId,
                Title = post.Title,
                Notes = post.Notes,
                CreatedByUserId = post.CreatedByUserId,
                CreatedAt = post.CreatedAt,
                Variants = variants
            };

            return Result<PostDetailDto>.Success(dto);
        }

        public async Task<Result<PagedResult<PostListItemDto>>> ListPostsAsync(ListPostsRequest request, Guid userId)
        {
            if (request.PageNumber <= 0 || request.PageSize <= 0)
            {
                return Result<PagedResult<PostListItemDto>>.Failure("PageNumber and PageSize must be positive.");
            }

            // Ensure user is member/owner of workspace.
            var isMember = await _dbContext.WorkspaceMembers
                .AnyAsync(m => m.WorkspaceId == request.WorkspaceId && m.UserId == userId);

            if (!isMember)
            {
                var isOwner = await _dbContext.Workspaces
                    .AnyAsync(w => w.Id == request.WorkspaceId && w.OwnerUserId == userId);

                if (!isOwner)
                {
                    return Result<PagedResult<PostListItemDto>>.Failure("User does not belong to the workspace.");
                }
            }

            var query = _dbContext.Posts
                .Where(p => p.WorkspaceId == request.WorkspaceId);

            if (request.FromUtc.HasValue)
            {
                query = query.Where(p => p.CreatedAt >= request.FromUtc.Value);
            }

            if (request.ToUtc.HasValue)
            {
                query = query.Where(p => p.CreatedAt <= request.ToUtc.Value);
            }

            // Filter by variant state or social account if requested.
            if (request.State.HasValue)
            {
                var state = request.State.Value;
                query = query.Where(p =>
                    _dbContext.PostVariants.Any(v => v.PostId == p.Id && v.State == state));
            }

            if (request.SocialAccountId.HasValue)
            {
                var socialAccountId = request.SocialAccountId.Value;
                query = query.Where(p =>
                    _dbContext.PostVariants.Any(v => v.PostId == p.Id && v.SocialAccountId == socialAccountId));
            }

            var totalCount = await query.CountAsync();

            var posts = await query
                .OrderByDescending(p => p.CreatedAt)
                .Skip((request.PageNumber - 1) * request.PageSize)
                .Take(request.PageSize)
                .ToListAsync();

            var postIds = posts.Select(p => p.Id).ToList();

            var variants = await _dbContext.PostVariants
                .Where(v => postIds.Contains(v.PostId))
                .ToListAsync();

            var items = posts.Select(post =>
            {
                var postVariants = variants.Where(v => v.PostId == post.Id).ToList();

                var dto = new PostListItemDto
                {
                    Id = post.Id,
                    Title = post.Title,
                    CreatedAt = post.CreatedAt,
                    VariantCount = postVariants.Count,
                    PublishedCount = postVariants.Count(v => v.State == PostState.Published),
                    FailedCount = postVariants.Count(v => v.State == PostState.Failed),
                    ScheduledCount = postVariants.Count(v => v.State == PostState.Scheduled)
                };

                return dto;
            }).ToList();

            var paged = new PagedResult<PostListItemDto>(
                items,
                request.PageNumber,
                request.PageSize,
                totalCount);

            return Result<PagedResult<PostListItemDto>>.Success(paged);
        }
    }
}