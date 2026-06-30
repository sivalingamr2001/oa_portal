// ---------------------------------------------------------------
// File: Models/BinAllocationModels.cs
// ---------------------------------------------------------------
namespace Backend.Models;

// ── Header ──────────────────────────────────────────────────
public class B3Header
{
    public decimal HeaderId { get; set; }
    public DateTime TransactionDate { get; set; }
    public decimal? CustomerOrItemSpecific { get; set; }
    public decimal? CustomerId { get; set; }
    public decimal? TerritoryId { get; set; }
    public decimal? BillToCustomer { get; set; }
    public decimal? ShipToCustomer { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
    public DateTime CreatedDate { get; set; }
    public string? UpdatedBy { get; set; }
    public DateTime? UpdatedDate { get; set; }
    public string? Remarks { get; set; }

    // Lookups
    public string? CustomerName { get; set; }
    public string? CustomerRegion { get; set; }
    public string? HeaderCode { get; set; }
}

public class AllocationRow : B3Header
{
    public decimal LineId { get; set; }
    public decimal HeaderId { get; set; }
    public decimal? OrganizationId { get; set; }
    public decimal InventoryItemId { get; set; }
    public decimal B3Quantity { get; set; }
    public DateTime? TargetDate { get; set; }
    public decimal? B3ApprovedQuantity { get; set; }
    public string ApprovalFlag { get; set; } = "N";
    public DateTime? ApprovedDate { get; set; }
    public string? ApprovedBy { get; set; }
    public string ClosureFlag { get; set; } = "N";
    public decimal Revision { get; set; } = 0;
    public decimal? ParentLineId { get; set; }
    public string? AmendmentReason { get; set; }

    // Lookups
    public string? OrganizationCode { get; set; }
    public string? ItemCode { get; set; }
    public string? ItemDescription { get; set; }
    public decimal? OldRequestedQty { get; set; }
}

// ── Line ────────────────────────────────────────────────────
public class B3Line
{
    public decimal LineId { get; set; }
    public decimal HeaderId { get; set; }
    public decimal? OrganizationId { get; set; }
    public decimal InventoryItemId { get; set; }
    public decimal B3Quantity { get; set; }
    public DateTime? TargetDate { get; set; }
    public decimal? B3ApprovedQuantity { get; set; }
    public string ApprovalFlag { get; set; }   // 'Y' | 'N'
    public DateTime? ApprovedDate { get; set; }
    public string ApprovedBy { get; set; }
    public string ClosureFlag { get; set; }   // 'Y' | 'N'
    public decimal Revision { get; set; }
    public decimal? ParentLineId { get; set; }
}

// ── Cancellation ────────────────────────────────────────────
public class B3Cancellation
{
    public decimal CancelId { get; set; }
    public decimal LineId { get; set; }
    public decimal CancelledQty { get; set; }
    public DateTime CancelledDate { get; set; }
    public string CancelReason { get; set; }
    public string CreatedBy { get; set; }
    public DateTime CreatedDate { get; set; }
}

// ── Summary row ─────────────────────────────────────────────
public class AllocationSummary
{
    public int HeaderId { get; set; }
    public DateTime TransactionDate { get; set; }
    public decimal? CustomerId { get; set; }
    public int TotalLines { get; set; }
    public decimal TotalRequestedQty { get; set; }
    public decimal TotalApprovedQty { get; set; }
    public int ApprovedLines { get; set; }
    public int PendingLines { get; set; }
    public int CancelledLines { get; set; }
}

// ── Request DTOs ─────────────────────────────────────────────
public class CreateAllocationRequestV2
{
    public DateTime TransactionDate { get; set; }
    public decimal? CustomerOrItemSpecific { get; set; }
    public decimal? CustomerId { get; set; }
    public decimal? TerritoryId { get; set; }
    public string Region { get; set; }
    public decimal? BillToCustomer { get; set; }
    public decimal? ShipToCustomer { get; set; }
    public string CreatedBy { get; set; }
    public string Remarks { get; set; }
    public List<CreateLineRequest> Lines { get; set; }
}

public class CreateLineRequest
{
    public decimal? OrganizationId { get; set; }
    public decimal InventoryItemId { get; set; }
    public decimal B3Quantity { get; set; }
    public DateTime? TargetDate { get; set; }
}

public class ReviseQuantityRequest
{
    public decimal OriginalLineId { get; set; }
    public decimal NewB3Quantity { get; set; }
    public string Reason { get; set; } = string.Empty;
}

public class ApproveLineRequest
{
    public decimal LineId { get; set; }
    public decimal ApprovedQuantity { get; set; }
    public string ApprovedBy { get; set; }
}

public class AmendQuantityRequest
{
    public decimal LineId { get; set; }
    public decimal AmendedQuantity { get; set; }
    public string AmendedBy { get; set; }
    public decimal Revision { get; set; }
    public string Reason { get; set; }
}

public class CancelLineRequest
{
    public decimal LineId { get; set; }
    public decimal CancelledQty { get; set; }
    public string CancelReason { get; set; }
    public string CreatedBy { get; set; }
}

public class CancelHeaderRequest
{
    public decimal HeaderId { get; set; }
    public string CancelReason { get; set; }
    public string CreatedBy { get; set; }
}

public class AllocationHeaderDetailsDto
{
    // ID and Name Pairs
    public decimal CustomerId { get; set; }
    public string CustomerName { get; set; }
    public decimal BillToCustomerId { get; set; }
    public string BillToCustomerName { get; set; }
    public decimal ShipToCustomerId { get; set; }
    public string ShipToCustomerName { get; set; }

    // Header Metadata
    // 💡 Updated to decimal to maintain uniform data type standards with B3Header
    public decimal HeaderId { get; set; }
    public int CustomerOrItemSpecific { get; set; }
    public decimal? TerritoryId { get; set; }
    public string Remarks { get; set; }
    public string TransactionDate { get; set; }
    public string CreatedBy { get; set; }
    public string CreatedDate { get; set; }
    public string UpdatedBy { get; set; }
    public string UpdatedDate { get; set; }

    // Rollup Metrics
    public int TotalRequested { get; set; }
    public int TotalApproved { get; set; }
    public string Status { get; set; }

    // Child Loop Items
    public List<AllocationLineItemDto> Items { get; set; } = new();
}

public class AllocationLineItemDto
{
    public decimal LineId { get; set; }
    public decimal OrganizationId { get; set; }
    public string OrganizationCode { get; set; }
    public decimal InventoryItemId { get; set; }
    public string ItemCode { get; set; }
    public string ItemDescription { get; set; }
    public int B3Quantity { get; set; }
    public int? B3ApprovedQuantity { get; set; }
    // 💡 Holds the old quantity from the parent revision (Line 1) when viewing the current row (Line 2)
    public int? OldRequestedQty { get; set; }
    public string TargetDate { get; set; }
    public string ApprovalFlag { get; set; }
    public string ClosureFlag { get; set; }
    public int Revision { get; set; }
    public decimal? ParentLineId { get; set; }
}

public class CancellationDto
{
    public int CancelId { get; set; }
    public int LineId { get; set; }
    public decimal CancelledQty { get; set; }
    public DateTime CancelledDate { get; set; }
    public string CancelReason { get; set; } = string.Empty;
    public string CreatedBy { get; set; } = string.Empty;
    public DateTime CreatedDate { get; set; }
    public int HeaderId { get; set; }
    public int InventoryItemId { get; set; }
    public int OrganizationId { get; set; }
    public decimal OriginalQuantity { get; set; }
    public decimal? ApprovedQuantity { get; set; } // Nullable because matching item might not be approved yet
    public int CustomerId { get; set; }
    public DateTime TransactionDate { get; set; }
}

public class B3LineWithMetricsDto
{
    public AllocationRow Allocation { get; set; } = null!;
    public DemandMetricsDto? Metrics { get; set; }
}