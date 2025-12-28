using System;
using System.Collections.Generic;

namespace SocialOrchestrator.Domain.Common
{
    /// <summary>
    /// Base class for value objects (equality by components).
    /// </summary>
    public abstract class ValueObject : IEquatable<ValueObject>
    {
        protected abstract IEnumerable<object?> GetEqualityComponents();

        public override bool Equals(object? obj)
        {
            if (obj is null || obj.GetType() != GetType())
                return false;

            return Equals((ValueObject)obj);
        }

        public bool Equals(ValueObject? other)
        {
            if (other is null || other.GetType() != GetType())
                return false;

            using var thisComponents = GetEqualityComponents().GetEnumerator();
            using var otherComponents = other.GetEqualityComponents().GetEnumerator();

            while (thisComponents.MoveNext() && otherComponents.MoveNext())
            {
                if (thisComponents.Current is null ^ otherComponents.Current is null)
                    return false;

                if (thisComponents.Current is not null &&
                    !thisComponents.Current.Equals(otherComponents.Current))
                    return false;
            }

            return !thisComponents.MoveNext() && !otherComponents.MoveNext();
        }

        public override int GetHashCode()
        {
            unchecked
            {
                int hash = 17;

                foreach (var component in GetEqualityComponents())
                {
                    hash = hash * 23 + (component?.GetHashCode() ?? 0);
                }

                return hash;
            }
        }

        public static bool operator ==(ValueObject? left, ValueObject? right)
        {
            if (left is null && right is null)
                return true;

            if (left is null || right is null)
                return false;

            return left.Equals(right);
        }

        public static bool operator !=(ValueObject? left, ValueObject? right)
        {
            return !(left == right);
        }
    }
}