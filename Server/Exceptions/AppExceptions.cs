namespace Backend.Exceptions;

/// <summary>
/// Thrown when a requested resource cannot be found.
/// </summary>
public sealed class NotFoundException : Exception
{
    public NotFoundException(string message) : base(message) { }
}

/// <summary>
/// Thrown when input fails business-rule validation.
/// </summary>
public sealed class ValidationException : Exception
{
    public ValidationException(string message) : base(message) { }
}

/// <summary>
/// Thrown when an operation cannot complete due to a business constraint.
/// </summary>
public sealed class BusinessException : Exception
{
    public BusinessException(string message) : base(message) { }
}
