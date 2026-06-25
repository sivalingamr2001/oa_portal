using Backend.Exceptions;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public sealed class LogsController(IWebHostEnvironment env, ILogger<LogsController> logger) : ControllerBase
{
    private readonly IWebHostEnvironment _env = env;
    private readonly ILogger<LogsController> _logger = logger;

    private string LogsDirectory =>
        Path.Combine(_env.ContentRootPath, "bin", "logs", "MigrationLogs");

    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<IEnumerable<string>> GetLogs()
    {
        if (!Directory.Exists(LogsDirectory))
            throw new NotFoundException("Logs directory not found.");

        var files = Directory.EnumerateFiles(LogsDirectory, "*.log", SearchOption.TopDirectoryOnly)
            .Select(Path.GetFileName)
            .Where(name => name is not null)
            .Cast<string>()
            .OrderByDescending(n => n);

        return Ok(files);
    }

    [HttpGet("{fileName}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public IActionResult GetLogFile(string fileName)
    {
        if (string.IsNullOrWhiteSpace(fileName))
            throw new ValidationException("File name is required.");

        if (fileName.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0 || fileName.Contains(".."))
            throw new ValidationException("Invalid file name supplied.");

        var filePath = Path.Combine(LogsDirectory, fileName);

        if (!System.IO.File.Exists(filePath))
            throw new NotFoundException($"Log file '{fileName}' was not found.");

        _logger.LogDebug("Serving log file {FileName}", fileName);
        var stream = System.IO.File.OpenRead(filePath);
        return File(stream, "text/plain", fileName);
    }
}
