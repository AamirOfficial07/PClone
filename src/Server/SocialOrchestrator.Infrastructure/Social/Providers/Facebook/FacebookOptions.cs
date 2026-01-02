namespace SocialOrchestrator.Infrastructure.Social.Providers.Facebook
{
    /// <summary>
    /// Configuration options for Facebook OAuth integration.
    /// </summary>
    public class FacebookOptions
    {
        public string ClientId { get; set; } = string.Empty;

        public string ClientSecret { get; set; } = string.Empty;

        public string AuthorizationEndpoint { get; set; } = "https://www.facebook.com/v19.0/dialog/oauth";

        public string TokenEndpoint { get; set; } = "https://graph.facebook.com/v19.0/oauth/access_token";

        /// <summary>
        /// Redirect URI that Facebook will call after authorization.
        /// Must match the value configured in the Facebook app.
        /// </summary>
        public string RedirectUri { get; set; } = string.Empty;

        /// <summary>
        /// Default scopes requested during authorization.
        /// </summary>
        public string[] DefaultScopes { get; set; } = Array.Empty<string>();
    }
}