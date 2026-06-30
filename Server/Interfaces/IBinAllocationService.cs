using Backend.Models;

namespace Backend.Interfaces;

public interface IBinAllocationService
{
    // ── CREATE ───────────────────────────────────────────────
    /// <summary>
    /// Creates one header + N line items in a single transaction.
    /// Returns the generated HEADER_ID.
    /// </summary>
    Task<decimal> CreateAllocationAsync(CreateAllocationRequestV2 request);

    // ── READ ─────────────────────────────────────────────────
    /// <summary>All allocations — header + lines joined.</summary>
    Task<IEnumerable<AllocationRow>> GetAllAllocationsAsync(string currentUser);

    /// <summary>Single allocation by header ID.</summary>
    Task<AllocationHeaderDetailsDto> GetAllocationByHeaderIdAsync(decimal headerId);

    /// <summary>All lines currently pending HOD approval.</summary>
    Task<IEnumerable<B3LineWithMetricsDto>> GetPendingApprovalLinesAsync(CancellationToken cancellationToken = default);

    /// <summary>All cancellation records with context.</summary>
    Task<IEnumerable<B3Cancellation>> GetAllCancellationsAsync();
    Task<IEnumerable<CancellationDto>> GetCancellationByLineIdAsync(int? lineId);


    /// <summary>Per-header summary (totals, approved, pending, cancelled).</summary>
    Task<IEnumerable<AllocationSummary>> GetAllocationSummaryAsync(string currentUser);

    // ── REVISE (User role — new row, not update) ─────────────
    /// <summary>
    /// Creates a new revision row for the given line.
    /// Does NOT modify the original row.
    /// </summary>
    Task<decimal> ReviseQuantityAsync(ReviseQuantityRequest request);

    /// <summary>Full revision history for a line (all revisions).</summary>
    Task<IEnumerable<B3Line>> GetLineRevisionHistoryAsync(decimal originalLineId);

    // ── APPROVE (HOD) ─────────────────────────────────────────
    /// <summary>HOD approves a pending line with approved quantity.</summary>
    Task<bool> ApproveLineAsync(ApproveLineRequest request);

    // ── AMEND (HOD post-approval) ─────────────────────────────
    /// <summary>HOD amends the approved quantity of an already-approved line.</summary>
    Task<bool> AmendApprovedQuantityAsync(AmendQuantityRequest request);

    // ── CANCEL ────────────────────────────────────────────────
    /// <summary>Cancels a single line — inserts cancellation + closes line.</summary>
    Task<bool> CancelLineAsync(CancelLineRequest request);

    /// <summary>Cancels all open lines under a header.</summary>
    Task<bool> CancelAllLinesAsync(CancelHeaderRequest request);
}
