using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SocialOrchestrator.Infrastructure.Persistence;

namespace SocialOrchestrator.Infrastructure
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddInfrastructure(
            this IServiceCollection services,
            IConfiguration configuration)
        {
            // Phase 0: register AppDbContext with SQL Server provider.
            // Connection string name: "DefaultConnection".
            services.AddDbContext<AppDbContext>(options =>
                options.UseSqlServer(configuration.GetConnectionString("DefaultConnection")));

            // Additional infrastructure registrations will be added in later phases.

            return services;
        }
    }
}