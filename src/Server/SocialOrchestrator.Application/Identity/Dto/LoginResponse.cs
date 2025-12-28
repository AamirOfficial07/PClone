namespace SocialOrchestrator.Application.Identity.Dto
{
    /// <summary>
    /// Response DTO for successful login.
    /// </summary>
    public class LoginResponse
    {
        /// <summary>
        /// The JWT access token.
        /// </summary>
        public string AccessToken { get; set; } = string.Empty;

        /// <summary>
        /// The expiration time of the token.
        /// </summary>
        public DateTime ExpiresAt { get; set; }

        /// <summary>
        /// The user's unique identifier.
        /// </summary>
        public Guid UserId { get; set; }

        /// <summary>
        /// The user's email address.
        /// </summary>
        public string Email { get; set; } = string.Empty;
    }
}
