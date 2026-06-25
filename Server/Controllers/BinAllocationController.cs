using Backend.Interfaces;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BinAllocationController : ControllerBase
{
    private readonly IBinAllocationService _service;
    private readonly ILogger<BinAllocationController> _logger;

    public BinAllocationController(IBinAllocationService service,
                                   ILogger<BinAllocationController> logger)
    {
        _service = service;
        _logger = logger;
    }

    // ── POST /api/binallocation ───────────────────────────────
    /// <summary>
    /// Create a bin allocation — one header with multiple line items.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateAllocation(
        [FromBody] CreateAllocationRequestV2 request)
    {
        if (request?.Lines == null || !request.Lines.Any())
            return BadRequest("At least one line item is required.");

        var headerId = await _service.CreateAllocationAsync(request);
        return CreatedAtAction(nameof(GetAllocationByHeaderId),
                               new { headerId }, new { HeaderId = headerId });
    }

    // ── GET /api/binallocation ────────────────────────────────
    /// <summary>Get all bin allocations (header + lines).</summary>
    [HttpGet]
    public async Task<IActionResult> GetAllAllocations(string currentUser)
    {
        var data = await _service.GetAllAllocationsAsync(currentUser);
        return Ok(data);
    }
    // ── GET /api/binallocation/{headerId} ─────────────────────
    /// <summary>Get a single allocation by header ID.</summary>
    [HttpGet("{headerId:decimal}")]
    public async Task<IActionResult> GetAllocationByHeaderId(decimal headerId)
    {
        var data = await _service.GetAllocationByHeaderIdAsync(headerId);

        if (data == null)
        {
            return NotFound(new { message = $"Allocation Header #{headerId} not found." });
        }

        return Ok(data);
    }


    // ── GET /api/binallocation/summary ────────────────────────
    /// <summary>Dashboard summary per header.</summary>
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary(string currentUser)
    {
        var data = await _service.GetAllocationSummaryAsync(currentUser);
        return Ok(data);
    }

    // ── GET /api/binallocation/pending-approval ───────────────
    /// <summary>All lines pending HOD approval.</summary>
    [HttpGet("pending-approval")]
    public async Task<IActionResult> GetPendingApproval()
    {
        var data = await _service.GetPendingApprovalLinesAsync();
        return Ok(data);
    }

    // ── POST /api/binallocation/revise ────────────────────────
    /// <summary>
    /// User role: update requested quantity.
    /// Creates a NEW revision row — does NOT modify the original.
    /// </summary>
    [HttpPost("revise")]
    public async Task<IActionResult> ReviseQuantity(
        [FromBody] ReviseQuantityRequest request)
    {
        var newLineId = await _service.ReviseQuantityAsync(request);
        return Ok(new
        {
            NewLineId = newLineId,
            Message = "Revision created successfully."
        });
    }

    // ── GET /api/binallocation/revisions/{lineId} ─────────────
    /// <summary>Get full revision history for a line.</summary>
    [HttpGet("revisions/{lineId:decimal}")]
    public async Task<IActionResult> GetRevisionHistory(decimal lineId)
    {
        var data = await _service.GetLineRevisionHistoryAsync(lineId);
        return Ok(data);
    }

    // ── PUT /api/binallocation/approve ────────────────────────
    /// <summary>HOD approves a pending line with approved quantity.</summary>
    [HttpPut("approve")]
    public async Task<IActionResult> ApproveLine(
        [FromBody] ApproveLineRequest request)
    {
        var success = await _service.ApproveLineAsync(request);
        if (!success)
            return BadRequest("Line not found, already approved, or closed.");
        return Ok(new { Message = "Line approved successfully." });
    }

    // ── PUT /api/binallocation/amend ──────────────────────────
    /// <summary>HOD amends approved quantity of an approved line.</summary>
    [HttpPut("amend")]
    public async Task<IActionResult> AmendQuantity(
        [FromBody] AmendQuantityRequest request)
    {
        var success = await _service.AmendApprovedQuantityAsync(request);
        if (!success)
            return BadRequest("Line not found, not yet approved, or already closed.");
        return Ok(new { Message = "Approved quantity amended successfully." });
    }

    // ── POST /api/binallocation/cancel/line ───────────────────
    /// <summary>Cancel a single allocation line.</summary>
    [HttpPost("cancel/line")]
    public async Task<IActionResult> CancelLine(
        [FromBody] CancelLineRequest request)
    {
        await _service.CancelLineAsync(request);
        return Ok(new { Message = "Line cancelled successfully." });
    }

    // ── POST /api/binallocation/cancel/header ─────────────────
    /// <summary>Cancel all open lines under a header.</summary>
    [HttpPost("cancel/header")]
    public async Task<IActionResult> CancelAllLines(
        [FromBody] CancelHeaderRequest request)
    {
        await _service.CancelAllLinesAsync(request);
        return Ok(new { Message = "All lines for header cancelled successfully." });
    }

    // ── GET /api/binallocation/cancellations ──────────────────
    /// <summary>Fetch all cancellation records with context.</summary>
    [HttpGet("cancellations")]
    public async Task<IActionResult> GetCancellations()
    {
        var data = await _service.GetAllCancellationsAsync();
        return Ok(data);
    }

    [HttpGet("cancellations-by-id/{lineId}")]
    public async Task<IActionResult> GetCancellationsById(int lineId)
    {
        // Call the specific single-record service method rather than GetAllCancellationsAsync
        var data = await _service.GetCancellationByLineIdAsync(lineId);

        if (data == null)
        {
            return NotFound(new { message = $"Cancellation records for Line ID {lineId} were not found." });
        }

        return Ok(data);
    }

}