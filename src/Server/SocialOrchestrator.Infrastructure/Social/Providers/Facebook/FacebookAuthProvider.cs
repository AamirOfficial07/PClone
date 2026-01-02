using System.Net.Http;
using System.Text.Json;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Options;
using SocialOrchestrator.Application.Social.Providers;
using SocialOrchestrator.Domain.SocialAccounts;

namespace SocialOrchestrator.Infrastructure.Social.Providers.Facebook
{
    /// <summary>
    /// Facebook implementation of ISocialAuthProvider.
    /// </summary>
    public class FacebookAuthProvider : ISocialAuthProvider
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly FacebookOptions _options;
        private readonly JsonSerializerOptions _serializerOptions = new()
        {
            PropertyNameCaseInsensitive = true
        };

        public FacebookAuthProvider(
            IHttpClientFactory httpClientFactory,
            IOptions<FacebookOptions> options)
        {
            _httpClientFactory = httpClientFactory;
            _options = options.Value;
        }

        public SocialNetworkType NetworkType => SocialNetworkType.Facebook;

        public string GetAuthorizationUrl(Guid workspaceId, Guid userId, string state)
        {
            if (string.IsNullOrWhiteSpace(_options.ClientId) ||
                string.IsNullOrWhiteSpace(_options.RedirectUri) ||
                string.IsNullOrWhiteSpace(_options.AuthorizationEndpoint))
            {
                throw new InvalidOperationException("Facebook OAuth options are not fully configured on the server.");
            }

            var queryParams = new Dictionary<string, string?>
            {
                ["client_id"] = _options.ClientId,
                ["redirect_uri"] = _options.RedirectUri,
                ["state"] = state,
                ["response_type"] = "code",
                ["scope"] = string.Join(",", _options.DefaultScopes ?? Array.Empty<string>())
            };

            return QueryHelpers.AddQueryString(_options.AuthorizationEndpoint, queryParams);
        }

        public async Task<OAuthCallbackResult> HandleCallbackAsync(string code, string state)
        {
            if (string.IsNullOrWhiteSpace(code))
            {
                return OAuthCallbackResult.Failure(SocialNetworkType.Facebook, "Missing authorization code.");
            }

            if (string.IsNullOrWhiteSpace(_options.ClientId) ||
                string.IsNullOrWhiteSpace(_options.ClientSecret) ||
                string.IsNullOrWhiteSpace(_options.RedirectUri) ||
                string.IsNullOrWhiteSpace(_options.TokenEndpoint))
            {
                return OAuthCallbackResult.Failure(
                    SocialNetworkType.Facebook,
                    "Facebook OAuth is not configured correctly on the server.");
            }

            var client = _httpClientFactory.CreateClient();

            // Exchange authorization code for access token
            var tokenRequestParams = new Dictionary<string, string?>
            {
                ["client_id"] = _options.ClientId,
                ["client_secret"] = _options.ClientSecret,
                ["redirect_uri"] = _options.RedirectUri,
                ["code"] = code
            };

            var tokenRequestUri = QueryHelpers.AddQueryString(_options.TokenEndpoint, tokenRequestParams);

            HttpResponseMessage tokenResponse;
            try
            {
                tokenResponse = await client.GetAsync(tokenRequestUri);
            }
            catch (Exception ex)
            {
                return OAuthCallbackResult.Failure(
                    SocialNetworkType.Facebook,
                    $"Error contacting Facebook token endpoint: {ex.Message}");
            }

            if (!tokenResponse.IsSuccessStatusCode)
            {
                var statusCode = (int)tokenResponse.StatusCode;
                return OAuthCallbackResult.Failure(
                    SocialNetworkType.Facebook,
                    $"Failed to exchange authorization code for access token (HTTP {statusCode}).");
            }

            var tokenJson = await tokenResponse.Content.ReadAsStringAsync();

            FacebookTokenResponse? tokenData;
            try
            {
                tokenData = JsonSerializer.Deserialize<FacebookTokenResponse>(tokenJson, _serializerOptions);
            }
            catch
            {
                return OAuthCallbackResult.Failure(
                    SocialNetworkType.Facebook,
                    "Unable to parse token response from Facebook.");
            }

            if (tokenData?.AccessToken is not { Length: > 0 } accessToken)
            {
                return OAuthCallbackResult.Failure(
                    SocialNetworkType.Facebook,
                    "Token response did not contain an access token.");
            }

            // Fetch basic account information.
            // TODO: refine this to fetch pages when supporting multiple page selection.
            var meUri = QueryHelpers.AddQueryString(
                "https://graph.facebook.com/v19.0/me",
                new Dictionary<string, string?>
                {
                    ["access_token"] = accessToken,
                    ["fields"] = "id,name"
                });

            HttpResponseMessage meResponse;
            try
            {
                meResponse = await client.GetAsync(meUri);
            }
            catch (Exception ex)
            {
                return OAuthCallbackResult.Failure(
                    SocialNetworkType.Facebook,
                    $"Error fetching account information from Facebook: {ex.Message}");
            }

            if (!meResponse.IsSuccessStatusCode)
            {
                var statusCode = (int)meResponse.StatusCode;
                return OAuthCallbackResult.Failure(
                    SocialNetworkType.Facebook,
                    $"Failed to fetch account information from Facebook (HTTP {statusCode}).");
            }

            var meJson = await meResponse.Content.ReadAsStringAsync();

            FacebookAccountResponse? account;
            try
            {
                account = JsonSerializer.Deserialize<FacebookAccountResponse>(meJson, _serializerOptions);
            }
            catch
            {
                return OAuthCallbackResult.Failure(
                    SocialNetworkType.Facebook,
                    "Unable to parse account information from Facebook.");
            }

            if (string.IsNullOrWhiteSpace(account?.Id) || string.IsNullOrWhiteSpace(account.Name))
            {
                return OAuthCallbackResult.Failure(
                    SocialNetworkType.Facebook,
                    "Account information from Facebook is incomplete.");
            }

            var scopes = _options.DefaultScopes ?? Array.Empty<string>();

            return new OAuthCallbackResult
            {
                IsSuccess = true,
                ErrorMessage = null,
                NetworkType = SocialNetworkType.Facebook,
                ExternalAccountId = account.Id,
                AccountName = account.Name,
                AccountUsername = null,
                AccessToken = accessToken,
                RefreshToken = null,
                ExpiresAtUtc = tokenData.ExpiresIn.HasValue
                    ? DateTime.UtcNow.AddSeconds(tokenData.ExpiresIn.Value)
                    : null,
                Scopes = scopes
            };
        }

        public async Task RevokeAsync(string accessToken, string? refreshToken)
        {
            // Best-effort revocation using the Facebook Graph API.
            // This uses the user access token to delete all permissions for the app,
            // which invalidates existing user access tokens for this app-user pair.
            if (string.IsNullOrWhiteSpace(accessToken))
            {
                return;
            }

            var client = _httpClientFactory.CreateClient();

            var revokeUri = QueryHelpers.AddQueryString(
                "https://graph.facebook.com/v19.0/me/permissions",
                new Dictionary<string, string?>
                {
                    ["access_token"] = accessToken
                });

            try
            {
                using var response = await client.DeleteAsync(revokeUri);
                // Ignore non-success responses; revocation is best-effort.
            }
            catch
            {
                // Swallow exceptions; local token deletion still ensures credentials are removed from our system.
            }
        }

        private sealed class FacebookTokenResponse
        {
            public string? AccessToken { get; set; }

            public string? TokenType { get; set; }

            public int? ExpiresIn { get; set; }
        }

        private sealed class FacebookAccountResponse
        {
            public string? Id { get; set; }

            public string? Name { get; set; }
        }
    }
}