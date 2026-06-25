using Backend.Interfaces;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public sealed class AuthController(IAllocationService allocationService) : ControllerBase
{
    private readonly IAllocationService _allocationService = allocationService;

    [HttpPost("login")]
    [HttpPost("login-details")]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(RegionDetailsDto))]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<RegionDetailsDto>> GetRegionDetailsAfterLogin(
        [FromBody] LoginRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _allocationService.GetRegionDetailsAfterLoginAsync(
            request.Username, request.Password, cancellationToken);

        if (result is null)
            return Unauthorized(new { message = "Invalid credentials or region assignment not found." });

        return Ok(result);
    }
}
