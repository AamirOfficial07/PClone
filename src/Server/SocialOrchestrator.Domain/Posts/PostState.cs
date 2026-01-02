using System;

namespace SocialOrchestrator.Domain.Posts
{
    /// <summary>
    /// Represents the lifecycle state of a post variant.
    /// </summary>
    public enum PostState
    {
        Draft = 0,
        Scheduled = 1,
        Published = 2,
        Failed = 3,
        Cancelled = 4
    }
}