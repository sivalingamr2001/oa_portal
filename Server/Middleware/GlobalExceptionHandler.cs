using Backend.Exceptions;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Middleware;

/// <summary>
/// Central exception handler that maps domain and infrastructure errors to RFC 7807 ProblemDetails.
/// </summary>
public sealed class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        var (statusCode, title) = MapException(exception);

        if (statusCode >= StatusCodes.Status500InternalServerError)
            logger.LogError(exception, "Unhandled exception on {Method} {Path}",
                httpContext.Request.Method, httpContext.Request.Path);
        else
            logger.LogWarning(exception, "Handled exception on {Method} {Path}: {Message}",
                httpContext.Request.Method, httpContext.Request.Path, exception.Message);

        var problem = new ProblemDetails
        {
            Status = statusCode,
            Title = title,
            Detail = exception.Message,
            Instance = httpContext.Request.Path
        };

        httpContext.Response.StatusCode = statusCode;
        await httpContext.Response.WriteAsJsonAsync(problem, cancellationToken).ConfigureAwait(false);
        return true;
    }

    private static (int StatusCode, string Title) MapException(Exception exception) =>
        exception switch
        {
            ValidationException => (StatusCodes.Status400BadRequest, "Validation failed"),
            NotFoundException => (StatusCodes.Status404NotFound, "Resource not found"),
            BusinessException => (StatusCodes.Status409Conflict, "Business rule violation"),
            UnauthorizedAccessException => (StatusCodes.Status401Unauthorized, "Unauthorized"),
            OperationCanceledException => (StatusCodes.Status408RequestTimeout, "Request cancelled"),
            _ => (StatusCodes.Status500InternalServerError, "An unexpected error occurred")
        };
}
