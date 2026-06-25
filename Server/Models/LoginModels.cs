namespace Backend.Models;

public sealed class LoginCredentials
{
    public string Uname { get; init; } = string.Empty;
    public string Password { get; init; } = string.Empty;
}

public sealed class RegionResult
{
    public string? Region { get; init; }
    public string? SubRegion { get; init; }
}
