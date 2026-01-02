using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using SocialOrchestrator.Infrastructure.Social.Providers.Facebook;
using Xunit;

namespace SocialOrchestrator.UnitTests.Social.Providers
{
    public class FacebookAuthProviderTests
    {
        [Fact]
        public async Task RevokeAsync_UsesDeleteOnMePermissionsWithAccessTokenQuery()
        {
            // Arrange
            var handler = new RecordingHandler();
            var httpClient = new HttpClient(handler);
            var httpClientFactory = new FakeHttpClientFactory(httpClient);

            var options = Options.Create(new FacebookOptions
            {
                ClientId = "client-id",
                ClientSecret = "client-secret",
                AuthorizationEndpoint = "https://www.facebook.com/v19.0/dialog/oauth",
                TokenEndpoint = "https://graph.facebook.com/v19.0/oauth/access_token",
                RedirectUri = "https://example.com/callback",
                DefaultScopes = new[] { "public_profile" }
            });

            var provider = new FacebookAuthProvider(httpClientFactory, options);

            // Act
            await provider.RevokeAsync("ACCESS_TOKEN", null);

            // Assert
            Assert.NotNull(handler.LastRequest);
            var request = handler.LastRequest!;
            Assert.Equal(HttpMethod.Delete, request.Method);

            var uri = request.RequestUri!.ToString();

            Assert.StartsWith("https://graph.facebook.com/v19.0/me/permissions", uri);
            Assert.Contains("access_token=ACCESS_TOKEN", uri);
        }

        private sealed class RecordingHandler : HttpMessageHandler
        {
            public HttpRequestMessage? LastRequest { get; private set; }

            protected override Task<HttpResponseMessage> SendAsync(
                HttpRequestMessage request,
                CancellationToken cancellationToken)
            {
                LastRequest = request;

                var response = new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(string.Empty)
                };

                return Task.FromResult(response);
            }
        }

        private sealed class FakeHttpClientFactory : IHttpClientFactory
        {
            private readonly HttpClient _client;

            public FakeHttpClientFactory(HttpClient client)
            {
                _client = client;
            }

            public HttpClient CreateClient(string name)
            {
                return _client;
            }
        }
    }
}