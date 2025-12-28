using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using SocialOrchestrator.Application.Identity.Dto;
using SocialOrchestrator.Application.Identity.Services;
using SocialOrchestrator.Domain.Common;

namespace SocialOrchestrator.Infrastructure.Identity
{
    /// <summary>
    /// Implementation of IAuthService using ASP.NET Identity and JWT.
    /// </summary>
    public class AuthService : IAuthService
    {
        private readonly UserManager<IdentityUser<Guid>> _userManager;
        private readonly IConfiguration _configuration;

        public AuthService(
            UserManager<IdentityUser<Guid>> userManager,
            IConfiguration configuration)
        {
            _userManager = userManager;
            _configuration = configuration;
        }

        /// <inheritdoc />
        public async Task<Result> RegisterAsync(RegisterUserRequest request)
        {
            // Check if user with given email exists
            var existingUser = await _userManager.FindByEmailAsync(request.Email);
            if (existingUser != null)
            {
                return Result.Failure("A user with this email already exists.");
            }

            // Create IdentityUser with Email and UserName = Email
            var user = new IdentityUser<Guid>
            {
                Id = Guid.NewGuid(),
                Email = request.Email,
                UserName = request.Email,
                EmailConfirmed = true // Set to true as per Phase 1 docs
            };

            // Create user with password
            var result = await _userManager.CreateAsync(user, request.Password);

            if (!result.Succeeded)
            {
                var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                return Result.Failure(errors);
            }

            return Result.Success();
        }

        /// <inheritdoc />
        public async Task<Result<LoginResponse>> LoginAsync(LoginRequest request)
        {
            // Find user by email
            var user = await _userManager.FindByEmailAsync(request.Email);
            if (user == null)
            {
                return Result<LoginResponse>.Failure("Invalid email or password.");
            }

            // Check password
            var isValidPassword = await _userManager.CheckPasswordAsync(user, request.Password);
            if (!isValidPassword)
            {
                return Result<LoginResponse>.Failure("Invalid email or password.");
            }

            // Generate JWT token
            var token = GenerateJwtToken(user);
            var expiresAt = DateTime.UtcNow.AddHours(24); // Token valid for 24 hours

            var response = new LoginResponse
            {
                AccessToken = token,
                ExpiresAt = expiresAt,
                UserId = user.Id,
                Email = user.Email ?? string.Empty
            };

            return Result<LoginResponse>.Success(response);
        }

        /// <summary>
        /// Generates a JWT token for the given user.
        /// </summary>
        private string GenerateJwtToken(IdentityUser<Guid> user)
        {
            var jwtSettings = _configuration.GetSection("Jwt");
            var key = Encoding.UTF8.GetBytes(jwtSettings["Key"] ?? throw new InvalidOperationException("JWT Key not configured"));
            var issuer = jwtSettings["Issuer"];
            var audience = jwtSettings["Audience"];

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            var credentials = new SigningCredentials(
                new SymmetricSecurityKey(key),
                SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                expires: DateTime.UtcNow.AddHours(24),
                signingCredentials: credentials);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
