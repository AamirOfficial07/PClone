namespace SocialOrchestrator.Domain.Common
{
    public class Result
    {
        public bool IsSuccess { get; }

        public string? Error { get; }

        protected Result(bool isSuccess, string? error)
        {
            IsSuccess = isSuccess;
            Error = error;
        }

        public static Result Success()
        {
            return new Result(true, null);
        }

        public static Result Failure(string error)
        {
            return new Result(false, error);
        }
    }

    public class Result<T> : Result
    {
        public T? Value { get; }

        private Result(bool isSuccess, string? error, T? value)
            : base(isSuccess, error)
        {
            Value = value;
        }

        public static Result<T> Success(T value)
        {
            return new Result<T>(true, null, value);
        }

        public new static Result<T> Failure(string error)
        {
            return new Result<T>(false, error, default);
        }
    }
}