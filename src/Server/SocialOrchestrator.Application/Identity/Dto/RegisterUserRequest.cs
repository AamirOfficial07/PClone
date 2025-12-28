namespace SocialOrchestrator.Application.Identity.Dto
{
    /// <summary>
    /// Request DTO for user registration.
    /// </summary>
    public class RegisterUserRequest
    {
        /// <summary>
        /// The user's email address.
        /// </summary>
        public string Email { get; set; } = string.Empty;

        /// <summary>
        /// The user's password.
        /// </summary>
        public string Password { get; set; } = string.Empty;

        /// <summary>
        /// Optional display name for the user.
        /// </summary>
        public string? DisplayName { get; set; }
    }
}
