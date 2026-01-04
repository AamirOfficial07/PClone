using SocialOrchestrator.Domain.SocialAccounts;

namespace SocialOrchestrator.Application.Social.Providers
{
    /// <summary>
    /// Abstraction for OAuth providers (Facebook, Instagram, etc.).
    /// </summary>
    public interface ISocialAuthProvider
    {
        /// <summary>
        /// The social network this provider supports.
        /// </summary>
        SocialNetworkType NetworkType { get; }

        /// <summary>
        /// Builds the authorization URL for initiating an OAuth flow.
        /// The <paramref name="state"/> parameter should be a pre-generated value
        /// that includes CSRF protection and any encoded context (workspace/user).
        /// </summary>
        string GetAuthorizationUrl(Guid workspaceId, Guid userId, string state);

        /// <summary>
        /// Handles the OAuth callback by exchanging the authorization code for tokens
        /// and fetching account details from the provider.
        /// </summary>
        Task<OAuthCallbackResult> HandleCallbackAsync(string code, string state);

        /// <summary>
        /// Optionally revokes tokens with the upstream provider, when supported.
        /// Implementations should best-effort call the provider's revocation endpoint
        /// but may return without error if revocation is not available.
        /// </summary>
        Task RevokeAsync(string accessToken, string? refreshToken);
    }
}