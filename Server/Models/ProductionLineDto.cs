namespace Backend.Models;

public class ProductionLineDto
{
    // Header Information
    public int HeaderId { get; set; }
    public string? HeaderCode { get; set; }
    public string Region { get; set; }
    public string? CustomerName { get; set; }
    public string? Remarks { get; set; }
    public string? TransactionDate { get; set; }
    public string? CreatedBy { get; set; }

    // Line Information
    public int LineId { get; set; }
    public string? ApprovalFlag { get; set; }
    public int? B3ApprovedQuantity { get; set; }
    public int B3Quantity { get; set; }
    public int? OldRequestedQty { get; set; }
    public int InventoryItemId { get; set; }
    public int OrganizationId { get; set; }
    public string? OrganizationCode { get; set; }
    public string? ItemCode { get; set; }
    public string? ItemDescription { get; set; }
    public string? TargetDate { get; set; }
    public string? ClosureFlag { get; set; }
    public int? Revision { get; set; }
    public int? ParentLineId { get; set; }
    public int? AllocatedSoQuantity { get; set; }

    // This will be populated by the service layer
    public List<SalesOrderLineDto> SalesOrderLines { get; set; } = new List<SalesOrderLineDto>();
}

public class SalesOrderLineDto
{
    public int SoId { get; set; }
    public int B3LineId { get; set; }
    public int? SoLineId { get; set; }
    public int? SoLineNo { get; set; }
    public long? OrderNumber { get; set; }
    public int? Quantity { get; set; }
    public string? OrderEnteredDate { get; set; }
    public int? InventoryItemId { get; set; }
    public string? ItemNo { get; set; }
    public int? OrgId { get; set; }
    public int? CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public string? CreationDate { get; set; }
}
