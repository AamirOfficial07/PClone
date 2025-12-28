using System;

namespace SocialOrchestrator.Domain.Common
{
    public abstract class EntityBase
    {
        public Guid Id { get; init; } = Guid.NewGuid();

        public DateTime CreatedAt { get; init; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; protected set; }

        public void MarkUpdated()
        {
            UpdatedAt = DateTime.UtcNow;
        }
    }
}