using SocialOrchestrator.Domain.SocialAccounts;

namespace SocialOrchestrator.Application.Social.Providers
{
    /// <summary>
    /// Result of handling an OAuth callback from a social provider.
    /// </summary>
    public class OAuthCallbackResult
    {
        public bool IsSuccess { get; set; }

        public string? ErrorMessage { get; set; }

        public SocialNetworkType NetworkType { get; set; }

        public string ExternalAccountId { get; set; } = string.Empty;

        public string AccountName { get; set; } = string.Empty;

        public string? AccountUsername { get; set; }

        public string AccessToken { get; set; } = string.Empty;

        public string? RefreshToken { get; set; }

        public DateTime? ExpiresAtUtc { get; set; }

        public string[] Scopes { get; set; } = Array.Empty<string>();

        public static OAuthCallbackResult Failure(SocialNetworkType networkType, string error)
        {
            return new OAuthCallbackResult
            {
                IsSuccess = false,
                ErrorMessage = error,
                NetworkType = networkType
            };
        }
    }
}