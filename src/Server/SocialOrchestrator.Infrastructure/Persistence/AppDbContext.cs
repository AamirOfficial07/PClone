using Microsoft.EntityFrameworkCore;

namespace SocialOrchestrator.Infrastructure.Persistence
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Phase 0: no entities yet. Entity configurations will be added in later phases.
        }
    }
}