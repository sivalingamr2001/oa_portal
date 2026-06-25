namespace Backend.Models;

public class RegionDetailsDto
{
    public string Region { get; set; }
    public string SubRegion { get; set; }
}

public class CustomerDto
{
    public long CustomerId { get; set; }
    public string CustomerName { get; set; }
    public string Region { get; set; }
}

public class EmployeeDto
{
    public string LastName { get; set; }
    public string EmployeeNumber { get; set; }
}

public class AddressDto
{
    public string Address1 { get; set; }
    public string Address2 { get; set; }
    public string Address3 { get; set; }
    public string City { get; set; }
    public string PostalCode { get; set; }
    public long OrgId { get; set; }
    public string Location { get; set; }
}

/// <summary>
/// Data contract for post body login requests.
/// </summary>
public class LoginRequest
{
    public string Username { get; set; }
    public string Password { get; set; }
}

public class OperatingUnitDto
{
    public long OrganizationId { get; set; }
    public string Name { get; set; }
}

public class OrganizationDto
{
    public int OrganizationId { get; set; }
    public string OrganizationCode { get; set; }
}

public class InventoryItemDto
{
    public int InventoryItemId { get; set; }
    public string ItemCode { get; set; }
    public string Description { get; set; }
    public int OrgId { get; set; }
}

public class AllocationHeaderDto
{
    public DateTime RequestDate { get; set; }
    public int AllocationBasis { get; set; }
    public int? CustomerId { get; set; }
    public int TerritoryId { get; set; }
    public int? BillToCustomerId { get; set; }
    public int? ShipToCustomerId { get; set; }
    public string Remarks { get; set; }
    public string CreatedBy { get; set; }
}

public class AllocationLineDto
{
    public int LineId { get; set; }
    public int OrganizationId { get; set; }
    public int InventoryItemId { get; set; }
    public int RequestedQty { get; set; }
    public DateTime TargetDate { get; set; }
}

public class CreateAllocationRequest
{
    public AllocationHeaderDto Header { get; set; }
    public List<AllocationLineDto> Lines { get; set; } = new();
}

public class ApprovalRequest
{
    public int LineId { get; set; }
    public string ApproverBy { get; set; }
    public int ApprovedQty { get; set; }
    public string Decision { get; set; }
    public string Remarks { get; set; }
}

public class RejectRequest
{
    public int LineId { get; set; }
    public string Reason { get; set; }
}

public class CancellationRequest
{
    public int LineId { get; set; }
    public int CancelledQty { get; set; }
    public string Reason { get; set; }
    public int CancelledBy { get; set; }
}

public class DemandMetricsRequest
{
    public int CustomerId { get; set; }
    public int OrganizationId { get; set; }
    public int InventoryItemId { get; set; }
}

public class DemandMetricsDto
{
    public decimal OaPendingQuantity { get; set; } = 0;
    public decimal OaRsvQty { get; set; } = 0;
    public decimal OaPickedQty { get; set; } = 0;
    public decimal BinQty { get; set; } = 0;
    public decimal BinRsvQty { get; set; } = 0;
}

public class AllocationDetailsDto
{
    public int Id { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public string Customer { get; set; } = string.Empty;
    public string Region { get; set; } = string.Empty;
    public int BinQty { get; set; }
    public int ApprovedQty { get; set; }
    public string TargetDate { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
}

public class AmendRequest
{
    public int LineId { get; set; }
    public int NewQty { get; set; }
    public string Reason { get; set; } = string.Empty;
}

