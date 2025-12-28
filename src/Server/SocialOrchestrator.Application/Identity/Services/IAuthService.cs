using SocialOrchestrator.Application.Identity.Dto;
using SocialOrchestrator.Domain.Common;

namespace SocialOrchestrator.Application.Identity.Services
{
    /// <summary>
    /// Service interface for authentication operations.
    /// </summary>
    public interface IAuthService
    {
        /// <summary>
        /// Registers a new user.
        /// </summary>
        /// <param name="request">The registration request.</param>
        /// <returns>A result indicating success or failure.</returns>
        Task<Result> RegisterAsync(RegisterUserRequest request);

        /// <summary>
        /// Authenticates a user and returns a JWT token.
        /// </summary>
        /// <param name="request">The login request.</param>
        /// <returns>A result containing the login response or an error.</returns>
        Task<Result<LoginResponse>> LoginAsync(LoginRequest request);
    }
}
