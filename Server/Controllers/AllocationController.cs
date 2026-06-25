using Backend.Interfaces;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;

namespace Backend.Controllers;

/// <summary>
/// Handles geographic allocations, customer site roles, address locations, and scheduling parameters.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public sealed class AllocationController(IAllocationService allocationService) : ControllerBase
{
    private readonly IAllocationService _allocationService = allocationService;

    [HttpGet("regions")]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(IEnumerable<RegionDetailsDto>))]
    public async Task<ActionResult<IEnumerable<RegionDetailsDto>>> GetAllRegions(
        CancellationToken cancellationToken)
    {
        var regions = await _allocationService.GetAllRegionDetailsAsync(cancellationToken);
        return Ok(regions);
    }

    [HttpGet("customers/bill-to")]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(IEnumerable<CustomerDto>))]
    public async Task<ActionResult<IEnumerable<CustomerDto>>> GetBillToCustomers(
        [FromQuery] string region,
        [FromQuery] string subRegion,
        CancellationToken cancellationToken = default)
    {
        var customers = await _allocationService.GetBillToCustomersAsync(region, subRegion, cancellationToken);
        return Ok(customers);
    }

    [HttpGet("customers/ship-to")]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(IEnumerable<CustomerDto>))]
    public async Task<ActionResult<IEnumerable<CustomerDto>>> GetShipToCustomers(
        [FromQuery] string region,
        [FromQuery] string subRegion,
        CancellationToken cancellationToken = default)
    {
        var customers = await _allocationService.GetShipToCustomersAsync(region, subRegion, cancellationToken);
        return Ok(customers);
    }

    [HttpGet("employees/prepared-by")]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(IEnumerable<EmployeeDto>))]
    public async Task<ActionResult<IEnumerable<EmployeeDto>>> GetPreparedByEmployees(
        [FromQuery] string region,
        CancellationToken cancellationToken = default)
    {
        var employees = await _allocationService.GetPreparedByEmployeesAsync(region, cancellationToken);
        return Ok(employees);
    }

    [HttpGet("customers/{customerId:long}/addresses")]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(IEnumerable<AddressDto>))]
    public async Task<ActionResult<IEnumerable<AddressDto>>> GetCustomerAddresses(
        long customerId,
        [FromQuery] string siteUseCode,
        [FromQuery] long orgId,
        CancellationToken cancellationToken = default)
    {
        var addresses = await _allocationService.GetCustomerAddressesAsync(
            siteUseCode, orgId, customerId, cancellationToken);
        return Ok(addresses);
    }

    [HttpGet("weeks/dropdown")]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(IEnumerable<string>))]
    public async Task<ActionResult<IEnumerable<string>>> GetWeeksDropdown(
        CancellationToken cancellationToken = default)
    {
        var weeks = await _allocationService.GetWeekDropdownListAsync(cancellationToken);
        return Ok(weeks);
    }

    [HttpGet("operating-units")]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(IEnumerable<OperatingUnitDto>))]
    public async Task<ActionResult<IEnumerable<OperatingUnitDto>>> GetOperatingUnits(
        CancellationToken cancellationToken = default)
    {
        var units = await _allocationService.GetOperatingUnitsAsync(cancellationToken);
        return Ok(units);
    }

    [HttpGet("demand-metrics")]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(DemandMetricsDto))]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<DemandMetricsDto>> GetDemandMetrics(
    [FromQuery] int customerId,
    [FromQuery] int organizationId,
    [FromQuery] int inventoryItemId,
    CancellationToken cancellationToken)
    {
        if (customerId <= 0 || organizationId <= 0 || inventoryItemId <= 0)
            throw new ValidationException("Invalid lookup query parameters supplied.");

        var metrics = await _allocationService.GetDemandMetricsAsync(
            customerId, organizationId, inventoryItemId, cancellationToken);

        return Ok(metrics ?? new DemandMetricsDto());
    }

    [HttpGet("organizations")]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(IEnumerable<OrganizationDto>))]
    public async Task<ActionResult<IEnumerable<OrganizationDto>>> GetOrganizations(
        CancellationToken cancellationToken)
    {
        var result = await _allocationService.GetInventoryOrganizationsAsync(cancellationToken);
        return Ok(result);
    }

    [HttpGet("items")]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(PagedResult<InventoryItemDto>))]
    public async Task<ActionResult<PagedResult<InventoryItemDto>>> GetItemDetails(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? search = null,
        [FromQuery] int? orgId = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _allocationService.GetInventoryItemDetailsAsync(page, pageSize, search, orgId, cancellationToken);
        return Ok(result);
    }

    [HttpGet("rrs-category")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRrsCategory(
        [FromQuery] int organizationId,
        [FromQuery] int inventoryItemId,
        CancellationToken cancellationToken)
    {
        var result = await _allocationService.GetSalesRrsCategoryAsync(organizationId, inventoryItemId, cancellationToken);
        return Ok(new { rrsCategory = result });
    }

    [HttpGet("operating-units/{id:int}")]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(OperatingUnitDto))]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OperatingUnitDto>> GetOperatingUnitById(
        int id, CancellationToken cancellationToken)
    {
        var unit = await _allocationService.GetOperatingUnitByIdAsync(id, cancellationToken);
        return unit is not null ? Ok(unit) : NotFound();
    }

    [HttpGet("organizations/{id:int}")]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(OrganizationDto))]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OrganizationDto>> GetInventoryOrganizationById(
        int id, CancellationToken cancellationToken)
    {
        var organization = await _allocationService.GetInventoryOrganizationByIdAsync(id, cancellationToken);
        return organization is not null ? Ok(organization) : NotFound();
    }

    [HttpGet("items/{id:int}")]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(InventoryItemDto))]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<InventoryItemDto>> GetInventoryItemById(
        int id, CancellationToken cancellationToken)
    {
        var item = await _allocationService.GetInventoryItemByIdAsync(id, cancellationToken);
        return item is not null ? Ok(item) : NotFound();
    }

    [HttpGet("customers/{id:long}/name")]
    [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(CustomerDto))]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CustomerDto>> GetCustomerNameById(
        long id, CancellationToken cancellationToken)
    {
        var customer = await _allocationService.GetCustomerNameByIdAsync(id, cancellationToken);
        return customer is not null ? Ok(customer) : NotFound();
    }

        [HttpGet("headers")]
    public async Task<IActionResult> GetHeaders(CancellationToken cancellationToken)
    {
        var result = await _allocationService.GetHeaderAsync(cancellationToken);
        return Ok(result);
    }

    [HttpGet("headers/{headerId}/lines")]
    public async Task<IActionResult> GetLines(int headerId, CancellationToken cancellationToken)
    {
        var result = await _allocationService.GetLinesByHeaderIdAsync(headerId, cancellationToken);
        return Ok(result);
    }

    [HttpGet("current-org")]
    public async Task<IActionResult> GetCurrentOrg(CancellationToken cancellationToken)
    {
        var result = await _allocationService.GetCurrentOrgAsync(cancellationToken);
        if (result == null) return NotFound("Organization details not found.");
        return Ok(result);
    }
}
