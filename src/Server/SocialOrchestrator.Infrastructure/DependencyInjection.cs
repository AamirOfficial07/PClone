using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SocialOrchestrator.Application.Identity.Services;
using SocialOrchestrator.Application.Social.Providers;
using SocialOrchestrator.Application.SocialAccounts.Services;
using SocialOrchestrator.Application.Workspaces.Services;
using SocialOrchestrator.Infrastructure.Identity;
using SocialOrchestrator.Infrastructure.Persistence;
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
                .AddIdentity<IdentityUser<Guid>, IdentityRole<Guid>>()
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

            // Social auth providers (Facebook as first implementation)
            services.AddScoped<ISocialAuthProvider, FacebookAuthProvider>();

            return services;
        }
    }
}