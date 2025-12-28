using Microsoft.AspNetCore.Mvc;
using SocialOrchestrator.Application.Identity.Dto;
using SocialOrchestrator.Application.Identity.Services;

namespace SocialOrchestrator.Api.Controllers
{
    /// <summary>
    /// Controller for authentication operations.
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        /// <summary>
        /// Registers a new user.
        /// </summary>
        /// <param name="request">The registration request.</param>
        /// <returns>200 OK on success, 400 Bad Request on failure.</returns>
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterUserRequest request)
        {
            var result = await _authService.RegisterAsync(request);

            if (!result.IsSuccess)
            {
                return BadRequest(new { error = result.Error });
            }

            return Ok(new { message = "User registered successfully." });
        }

        /// <summary>
        /// Authenticates a user and returns a JWT token.
        /// </summary>
        /// <param name="request">The login request.</param>
        /// <returns>200 OK with LoginResponse on success, 400 Bad Request on failure.</returns>
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var result = await _authService.LoginAsync(request);

            if (!result.IsSuccess)
            {
                return BadRequest(new { error = result.Error });
            }

            return Ok(result.Value);
        }
    }
}
