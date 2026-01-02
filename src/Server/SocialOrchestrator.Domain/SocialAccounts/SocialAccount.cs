using SocialOrchestrator.Domain.Common;
using SocialOrchestrator.Domain.Workspaces;

namespace SocialOrchestrator.Domain.SocialAccounts
{
    /// <summary>
    /// Represents a social account (e.g. Facebook page) connected to a workspace.
    /// </summary>
    public class SocialAccount : EntityBase
    {
        /// <summary>
        /// The workspace this social account belongs to.
        /// </summary>
        public Guid WorkspaceId { get; set; }

        /// <summary>
        /// The social network type (Facebook, Instagram, etc.).
        /// </summary>
        public SocialNetworkType NetworkType { get; set; }

        /// <summary>
        /// Provider-specific external account identifier (e.g. page ID).
        /// </summary>
        public string ExternalAccountId { get; set; } = string.Empty;

        /// <summary>
        /// Display name of the account (e.g. page name).
        /// </summary>
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// Optional username/handle for the account.
        /// </summary>
        public string? Username { get; set; }

        /// <summary>
        /// Indicates whether this account is currently active for the workspace.
        /// </summary>
        public bool IsActive { get; set; } = true;

        /// <summary>
        /// Indicates whether the account requires reauthorization (tokens expired/invalid).
        /// </summary>
        public bool RequiresReauthorization { get; set; }

        /// <summary>
        /// Navigation to the owning workspace.
        /// </summary>
        public virtual Workspace? Workspace { get; set; }
    }
}