using SocialOrchestrator.Domain.SocialAccounts;

namespace SocialOrchestrator.Application.SocialAccounts.Dto
{
    /// <summary>
    /// Summary DTO for a social account connected to a workspace.
    /// </summary>
    public class SocialAccountSummaryDto
    {
        public Guid Id { get; set; }

        public SocialNetworkType NetworkType { get; set; }

        public string Name { get; set; } = string.Empty;

        public string? Username { get; set; }

        public bool IsActive { get; set; }

        public bool RequiresReauthorization { get; set; }
    }
}