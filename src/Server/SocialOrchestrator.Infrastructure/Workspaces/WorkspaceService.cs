using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using SocialOrchestrator.Application.Workspaces.Dto;
using SocialOrchestrator.Application.Workspaces.Services;
using SocialOrchestrator.Domain.Common;
using SocialOrchestrator.Domain.Workspaces;
using SocialOrchestrator.Infrastructure.Persistence;

namespace SocialOrchestrator.Infrastructure.Workspaces
{
    /// <summary>
    /// Implementation of IWorkspaceService.
    /// </summary>
    public class WorkspaceService : IWorkspaceService
    {
        private readonly AppDbContext _dbContext;

        public WorkspaceService(AppDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        /// <inheritdoc />
        public async Task<Result<WorkspaceSummaryDto>> CreateWorkspaceAsync(Guid userId, CreateWorkspaceRequest request)
        {
            // Validate Name is not empty
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return Result<WorkspaceSummaryDto>.Failure("Workspace name is required.");
            }

            // Generate Slug from Name (lowercased, hyphen-separated)
            var baseSlug = GenerateSlug(request.Name);
            var slug = baseSlug;

            // Ensure Slug is unique - if collision, append suffix
            var existingCount = await _dbContext.Workspaces
                .CountAsync(w => w.Slug == slug || w.Slug.StartsWith(baseSlug + "-"));

            if (existingCount > 0)
            {
                slug = $"{baseSlug}-{existingCount + 1}";
            }

            // Create Workspace
            var workspace = new Workspace
            {
                Id = Guid.NewGuid(),
                Name = request.Name.Trim(),
                Slug = slug,
                OwnerUserId = userId,
                TimeZone = request.TimeZone ?? "UTC",
                CreatedAt = DateTime.UtcNow
            };

            // Create WorkspaceMember for the owner with Role = Owner
            var member = new WorkspaceMember
            {
                Id = Guid.NewGuid(),
                WorkspaceId = workspace.Id,
                UserId = userId,
                Role = WorkspaceRole.Owner,
                JoinedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            };

            _dbContext.Workspaces.Add(workspace);
            _dbContext.WorkspaceMembers.Add(member);
            await _dbContext.SaveChangesAsync();

            // Return WorkspaceSummaryDto
            var dto = new WorkspaceSummaryDto
            {
                Id = workspace.Id,
                Name = workspace.Name,
                Slug = workspace.Slug,
                TimeZone = workspace.TimeZone,
                Role = WorkspaceRole.Owner
            };

            return Result<WorkspaceSummaryDto>.Success(dto);
        }

        /// <inheritdoc />
        public async Task<Result<IReadOnlyList<WorkspaceSummaryDto>>> GetUserWorkspacesAsync(Guid userId)
        {
            // Query WorkspaceMembers where UserId = userId
            // Join with Workspaces to get details
            var workspaces = await _dbContext.WorkspaceMembers
                .Where(m => m.UserId == userId)
                .Include(m => m.Workspace)
                .Select(m => new WorkspaceSummaryDto
                {
                    Id = m.Workspace!.Id,
                    Name = m.Workspace.Name,
                    Slug = m.Workspace.Slug,
                    TimeZone = m.Workspace.TimeZone,
                    Role = m.Role
                })
                .ToListAsync();

            return Result<IReadOnlyList<WorkspaceSummaryDto>>.Success(workspaces);
        }

        /// <summary>
        /// Generates a URL-friendly slug from a name.
        /// </summary>
        private static string GenerateSlug(string name)
        {
            // Convert to lowercase
            var slug = name.ToLowerInvariant();

            // Replace spaces with hyphens
            slug = Regex.Replace(slug, @"\s+", "-");

            // Remove invalid characters
            slug = Regex.Replace(slug, @"[^a-z0-9\-]", "");

            // Remove consecutive hyphens
            slug = Regex.Replace(slug, @"-+", "-");

            // Trim hyphens from start and end
            slug = slug.Trim('-');

            return slug;
        }
    }
}
