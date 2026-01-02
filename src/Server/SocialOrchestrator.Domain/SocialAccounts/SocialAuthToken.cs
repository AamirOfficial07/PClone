using SocialOrchestrator.Domain.Common;

namespace SocialOrchestrator.Domain.SocialAccounts
{
    /// <summary>
    /// Represents OAuth tokens associated with a social account.
    /// </summary>
    public class SocialAuthToken : EntityBase
    {
        /// <summary>
        /// The social account this token belongs to.
        /// </summary>
        public Guid SocialAccountId { get; set; }

        /// <summary>
        /// Encrypted access token value.
        /// In Phase 2 this may be stored as plain text with a TODO to encrypt.
        /// </summary>
        public string AccessTokenEncrypted { get; set; } = string.Empty;

        /// <summary>
        /// Optional encrypted refresh token.
        /// </summary>
        public string? RefreshTokenEncrypted { get; set; }

        /// <summary>
        /// Optional UTC expiry for the access token.
        /// </summary>
        public DateTime? ExpiresAtUtc { get; set; }

        /// <summary>
        /// Scopes associated with the token, stored as a simple string representation.
        /// </summary>
        public string? Scopes { get; set; }

        /// <summary>
        /// Navigation to the owning social account.
        /// </summary>
        public virtual SocialAccount? SocialAccount { get; set; }
    }
}