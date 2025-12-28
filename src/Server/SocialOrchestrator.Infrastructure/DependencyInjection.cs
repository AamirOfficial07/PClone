using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SocialOrchestrator.Application.Identity.Services;
using SocialOrchestrator.Application.Workspaces.Services;
using SocialOrchestrator.Infrastructure.Identity;
using SocialOrchestrator.Infrastructure.Persistence;
using SocialOrchestrator.Infrastructure.Workspaces;

namespace SocialOrchestrator.Infrastructure
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddInfrastructure(
            this IServiceCollection services,
            IConfiguration configuration)
        {
            // Phase 1: register AppDbContext with SQL Server provider.
            // Connection string name: "DefaultConnection".
            services.AddDbContext<AppDbContext>(options =>
                options.UseSqlServer(configuration.GetConnectionString("DefaultConnection")));

            // Phase 1: register ASP.NET Identity
            services
                .AddIdentity<IdentityUser<Guid>, IdentityRole<Guid>>()
                .AddEntityFrameworkStores<AppDbContext>()
                .AddDefaultTokenProviders();

            // Phase 1: register application services
            services.AddScoped<IAuthService, AuthService>();
            services.AddScoped<IWorkspaceService, WorkspaceService>();

            return services;
        }
    }
}