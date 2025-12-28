using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using SocialOrchestrator.Domain.SocialAccounts;
using SocialOrchestrator.Domain.Workspaces;

namespace SocialOrchestrator.Infrastructure.Persistence
{
    /// <summary>
    /// The application database context, extending IdentityDbContext for ASP.NET Identity support.
    /// </summary>
    public class AppDbContext : IdentityDbContext<IdentityUser<Guid>, IdentityRole<Guid>, Guid>
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }

        /// <summary>
        /// Workspaces in the system.
        /// </summary>
        public DbSet<Workspace> Workspaces { get; set; }

        /// <summary>
        /// Workspace members (user-workspace relationships).
        /// </summary>
        public DbSet<WorkspaceMember> WorkspaceMembers { get; set; }

        /// <summary>
        /// Social accounts connected to workspaces.
        /// </summary>
        public DbSet<SocialAccount> SocialAccounts { get; set; }

        /// <summary>
        /// OAuth tokens associated with social accounts.
        /// </summary>
        public DbSet<SocialAuthToken> SocialAuthTokens { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Workspace configuration
            modelBuilder.Entity<Workspace>(entity =>
            {
                entity.ToTable("Workspaces");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Slug).IsRequired().HasMaxLength(250);
                entity.HasIndex(e => e.Slug).IsUnique();
                entity.Property(e => e.OwnerUserId).IsRequired();
                entity.Property(e => e.TimeZone).IsRequired().HasMaxLength(100);
                entity.Property(e => e.CreatedAt).IsRequired();
            });

            // WorkspaceMember configuration
            modelBuilder.Entity<WorkspaceMember>(entity =>
            {
                entity.ToTable("WorkspaceMembers");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.WorkspaceId).IsRequired();
                entity.Property(e => e.UserId).IsRequired();
                entity.Property(e => e.Role).IsRequired();
                entity.Property(e => e.JoinedAt).IsRequired();

                // Composite unique index on (WorkspaceId, UserId)
                entity.HasIndex(e => new { e.WorkspaceId, e.UserId }).IsUnique();

                // Foreign key to Workspace
                entity.HasOne(e => e.Workspace)
                    .WithMany(w => w.Members)
                    .HasForeignKey(e => e.WorkspaceId)
                    .OnDelete(DeleteBehavior.Cascade);

                // Foreign key to AspNetUsers (IdentityUser)
                entity.HasOne<IdentityUser<Guid>>()
                    .WithMany()
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // SocialAccount configuration
            modelBuilder.Entity<SocialAccount>(entity =>
            {
                entity.ToTable("SocialAccounts");
                entity.HasKey(e => e.Id);

                entity.Property(e => e.WorkspaceId).IsRequired();
                entity.Property(e => e.NetworkType).IsRequired();
                entity.Property(e => e.ExternalAccountId).IsRequired();
                entity.Property(e => e.Name).IsRequired();
                entity.Property(e => e.IsActive).IsRequired();
                entity.Property(e => e.RequiresReauthorization).IsRequired();
                entity.Property(e => e.CreatedAt).IsRequired();

                entity.HasIndex(e => new { e.WorkspaceId, e.NetworkType });

                entity.HasOne<Workspace>()
                    .WithMany()
                    .HasForeignKey(e => e.WorkspaceId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // SocialAuthToken configuration
            modelBuilder.Entity<SocialAuthToken>(entity =>
            {
                entity.ToTable("SocialAuthTokens");
                entity.HasKey(e => e.Id);

                entity.Property(e => e.SocialAccountId).IsRequired();
                entity.Property(e => e.AccessTokenEncrypted).IsRequired();
                entity.Property(e => e.CreatedAt).IsRequired();

                // One token record per social account
                entity.HasIndex(e => e.SocialAccountId).IsUnique();

                entity.HasOne(e => e.SocialAccount)
                    .WithMany()
                    .HasForeignKey(e => e.SocialAccountId)
                    .OnDelete(DeleteBehavior.Cascade);
            });
        }
    }
}