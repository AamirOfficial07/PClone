using System;

namespace SocialOrchestrator.Domain.Posts
{
    /// <summary>
    /// Represents the type of a post variant for a social network.
    /// </summary>
    public enum PostType
    {
        /// <summary>
        /// Text-only status update.
        /// </summary>
        Status = 0,

        /// <summary>
        /// Link post that primarily points to a URL.
        /// </summary>
        Link = 1,

        /// <summary>
        /// Single photo post.
        /// </summary>
        Photo = 2,

        /// <summary>
        /// Single video post.
        /// </summary>
        Video = 3
    }
}