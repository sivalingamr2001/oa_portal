namespace Backend.Models;

public class AllocationGroupResponse
{
    public AllocationHeaderGroupDto Header { get; set; } = new();
    public List<AllocationLineGroupDto> Items { get; set; } = new();
}

public class AllocationHeaderGroupDto
{
    public int HeaderId { get; set; }
    public string TransactionDate { get; set; }
    public int AllocationBasis { get; set; }
    public int CustomerId { get; set; }
    public int? TerritoryId { get; set; }
    public int? BillToCustomer { get; set; }
    public int? ShipToCustomer { get; set; }
    public string Remarks { get; set; }
    public string CreatedBy { get; set; }
    public string CreatedDate { get; set; }
}

public class AllocationLineGroupDto
{
    public int Id { get; set; }
    public string IsApproved { get; set; }
    public int? ApprovedQty { get; set; }
    public int BinQty { get; set; }
    public int ParentHeaderId { get; set; }
    public int ItemCode { get; set; }
    public int OrganizationId { get; set; }
    public string TargetDate { get; set; }
}

public class FlatAllocationRowDto
{
    // Header Columns
    public int HeaderId { get; set; }
    public string TransactionDate { get; set; } = string.Empty;
    public int AllocationBasis { get; set; }
    public int CustomerId { get; set; }
    public int? TerritoryId { get; set; }
    public int? BillToCustomer { get; set; }
    public int? ShipToCustomer { get; set; }
    public string Remarks { get; set; } = string.Empty;
    public string CreatedBy { get; set; } = string.Empty;
    public string CreatedDate { get; set; } = string.Empty;

    // Line Columns
    public int? Id { get; set; } // Nullable because of LEFT JOIN
    public string IsApproved { get; set; } = "N";
    public int? ApprovedQty { get; set; }
    public int? BinQty { get; set; }
    public int? ItemCode { get; set; }
    public int? OrganizationId { get; set; }
    public string TargetDate { get; set; } = string.Empty;
}
