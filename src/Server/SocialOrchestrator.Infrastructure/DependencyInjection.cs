using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SocialOrchestrator.Application.Identity.Services;
using SocialOrchestrator.Application.Posts.Services;
using SocialOrchestrator.Application.Social.Providers;
using SocialOrchestrator.Application.SocialAccounts.Services;
using SocialOrchestrator.Application.Workspaces.Services;
using SocialOrchestrator.Infrastructure.Identity;
using SocialOrchestrator.Infrastructure.Persistence;
using SocialOrchestrator.Infrastructure.Posts;
using SocialOrchestrator.Infrastructure.Social.Providers.Facebook;
using SocialOrchestrator.Infrastructure.SocialAccounts;
using SocialOrchestrator.Infrastructure.Workspaces;

namespace SocialOrchestrator.Infrastructure
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddInfrastructure(
            this IServiceCollection services,
            IConfiguration configuration)
        {
            // Database
            services.AddDbContext<AppDbContext>(options =>
                options.UseSqlServer(configuration.GetConnectionString("DefaultConnection")));

            // ASP.NET Identity
            services
                .AddIdentity<IdentityUser<Guid>, IdentityRole<Guid>>(options =>
                {
                    // Relaxed password requirements for development
                    options.Password.RequireDigit = false;
                    options.Password.RequireLowercase = false;
                    options.Password.RequireUppercase = false;
                    options.Password.RequireNonAlphanumeric = false;
                    options.Password.RequiredLength = 6;
                    options.Password.RequiredUniqueChars = 1;
                })
                .AddEntityFrameworkStores<AppDbContext>()
                .AddDefaultTokenProviders();

            // HttpClient for external providers
            services.AddHttpClient();

            // Options for Facebook OAuth
            services.Configure<FacebookOptions>(configuration.GetSection("Facebook"));

            // Application services
            services.AddScoped<IAuthService, AuthService>();
            services.AddScoped<IWorkspaceService, WorkspaceService>();
            services.AddScoped<ISocialAccountService, SocialAccountService>();
            services.AddScoped<IPostService, PostService>();
            services.AddScoped<IPostPublishingService, PostPublishingService>();

            // Social providers
            services.AddScoped<ISocialAuthProvider, FacebookAuthProvider>();
            services.AddScoped<ISocialPublisher, FacebookPublisher>();

            return services;
        }
    }
}