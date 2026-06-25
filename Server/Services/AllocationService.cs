using Backend.Interfaces;
using Backend.Models;
using Backend.Shared;
using System.Security.Cryptography;

namespace Backend.Services;

/// <summary>
/// Implements the allocation service layer using dynamic query execution with parameterised bindings.
/// </summary>
public sealed class AllocationService(IDynamicQueryExecutor dynamicQuery) : IAllocationService
{
    private readonly IDynamicQueryExecutor _queryExecutor = dynamicQuery;

    public Task<RegionDetailsDto?> GetRegionDetailsAfterLoginAsync(string username, string password, CancellationToken cancellationToken = default)
        => _queryExecutor.QuerySingleOrDefaultAsync<RegionDetailsDto>(
            Queries.GetRegionDetailsAfterLogin,
            new { Uname = username, Password = password },
            cancellationToken: cancellationToken);

    public Task<IEnumerable<RegionDetailsDto>> GetAllRegionDetailsAsync(CancellationToken cancellationToken = default)
        => _queryExecutor.QueryAsync<RegionDetailsDto>(
            Queries.GetAllRegionDetails,
            cancellationToken: cancellationToken);

    public Task<IEnumerable<CustomerDto>> GetBillToCustomersAsync(string region, string subRegion, CancellationToken cancellationToken = default)
        => _queryExecutor.QueryAsync<CustomerDto>(
            Queries.GetBillToCustomersByRegion,
            new { Region = region, SubRegion = subRegion },
            cancellationToken: cancellationToken);

    public Task<IEnumerable<CustomerDto>> GetShipToCustomersAsync(string region, string subRegion, CancellationToken cancellationToken = default)
        => _queryExecutor.QueryAsync<CustomerDto>(
            Queries.GetShipToCustomersByRegion,
            new { Region = region, SubRegion = subRegion },
            cancellationToken: cancellationToken);

    public Task<IEnumerable<EmployeeDto>> GetPreparedByEmployeesAsync(string region, CancellationToken cancellationToken = default)
        => _queryExecutor.QueryAsync<EmployeeDto>(
            Queries.GetPreparedByEmployees,
            new { Region = region },
            cancellationToken: cancellationToken);

    public Task<IEnumerable<AddressDto>> GetCustomerAddressesAsync(string siteUseCode, long orgId, long customerId, CancellationToken cancellationToken = default)
        => _queryExecutor.QueryAsync<AddressDto>(
            Queries.GetCustomerMultipleLocations,
            new { SiteUseCode = siteUseCode, OrgId = orgId, CustomerId = customerId },
            cancellationToken: cancellationToken);

    public Task<IEnumerable<string>> GetWeekDropdownListAsync(CancellationToken cancellationToken = default)
        => _queryExecutor.QueryAsync<string>(
            Queries.GetWeekDropdownList,
            cancellationToken: cancellationToken);

    public Task<IEnumerable<OperatingUnitDto>> GetOperatingUnitsAsync(CancellationToken cancellationToken = default)
        => _queryExecutor.QueryAsync<OperatingUnitDto>(
            Queries.GetOperatingUnitDetails,
            cancellationToken: cancellationToken);

    public Task<IEnumerable<OrganizationDto>> GetInventoryOrganizationsAsync(CancellationToken cancellationToken = default)
        => _queryExecutor.QueryAsync<OrganizationDto>(
            Queries.GetInventoryOrganizations,
            cancellationToken: cancellationToken);

    public async Task<PagedResult<InventoryItemDto>> GetInventoryItemDetailsAsync(
        int page, int pageSize, string? search, int? orgId, CancellationToken cancellationToken = default)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Max(pageSize, 1);

        var trimmedSearch = search?.Trim();

        var parameters = new
        {
            OrgId = orgId,
            Search = string.IsNullOrEmpty(trimmedSearch) ? null : $"%{trimmedSearch}%"
        };

        // Fetch all matching records from the database first
        var allData = await _queryExecutor.QueryAsync<InventoryItemDto>(
            Queries.GetInventoryItemDetails,
            parameters,
            cancellationToken: cancellationToken);

        // Reflection cache for performance
        var stringProperties = typeof(InventoryItemDto)
            .GetProperties()
            .Where(p => p.PropertyType == typeof(string) && p.CanWrite)
            .ToList();

        // Process, trim, and page the dataset in C# memory
        var processedList = allData
            .Select(item =>
            {
                foreach (var prop in stringProperties)
                {
                    if (prop.GetValue(item) is string value)
                    {
                        prop.SetValue(item, value.Trim());
                    }
                }
                return item;
            })
            .ToList();

        var totalCount = processedList.Count;

        var pagedItems = processedList
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        return new PagedResult<InventoryItemDto>(pagedItems, totalCount, page, pageSize);
    }

    public Task<string?> GetSalesRrsCategoryAsync(int organizationId, int inventoryItemId, CancellationToken cancellationToken = default)
        => _queryExecutor.QuerySingleOrDefaultAsync<string>(
            Queries.GetSalesRrsCategory,
            new { OrganizationId = organizationId, InventoryItemId = inventoryItemId },
            cancellationToken: cancellationToken);

    public Task<DemandMetricsDto?> GetDemandMetricsAsync(int customerId, int organizationId, int inventoryItemId, CancellationToken cancellationToken = default)
        => _queryExecutor.QuerySingleOrDefaultAsync<DemandMetricsDto>(
            Queries.GetDemandMetrics,
            new { CustomerId = customerId, OrganizationId = organizationId, InventoryItemId = inventoryItemId },
            cancellationToken: cancellationToken);

    public Task<OperatingUnitDto?> GetOperatingUnitByIdAsync(int organizationId, CancellationToken cancellationToken = default)
        => _queryExecutor.QuerySingleOrDefaultAsync<OperatingUnitDto>(
            Queries.GetOperatingUnitById,
            new { OrganizationId = organizationId },
            cancellationToken: cancellationToken);

    public Task<OrganizationDto?> GetInventoryOrganizationByIdAsync(int organizationId, CancellationToken cancellationToken = default)
        => _queryExecutor.QuerySingleOrDefaultAsync<OrganizationDto>(
            Queries.GetInventoryOrganizationById,
            new { OrganizationId = organizationId },
            cancellationToken: cancellationToken);

    public Task<InventoryItemDto?> GetInventoryItemByIdAsync(int inventoryItemId, CancellationToken cancellationToken = default)
        => _queryExecutor.QuerySingleOrDefaultAsync<InventoryItemDto>(
            Queries.GetInventoryItemById,
            new { InventoryItemId = inventoryItemId },
            cancellationToken: cancellationToken);

    public Task<CustomerDto?> GetCustomerNameByIdAsync(long customerId, CancellationToken cancellationToken = default)
        => _queryExecutor.QuerySingleOrDefaultAsync<CustomerDto>(
            Queries.GetCustomerNameById,
            new { CustomerId = customerId },
            cancellationToken: cancellationToken);

    public Task<IEnumerable<dynamic>> GetHeaderAsync(CancellationToken cancellationToken = default)
        => _queryExecutor.QueryAsync<dynamic>(
            Queries.GetHeaderDetails,
            cancellationToken: cancellationToken);

    public Task<IEnumerable<dynamic>> GetLinesByHeaderIdAsync(int headerId, CancellationToken cancellationToken = default)
        => _queryExecutor.QueryAsync<dynamic>(
            Queries.GetLinesByHeaderId,
            new { HeaderId = headerId },
            cancellationToken: cancellationToken);

    public Task<dynamic?> GetCurrentOrgAsync(CancellationToken cancellationToken = default)
        => _queryExecutor.QuerySingleOrDefaultAsync<dynamic>(
            Queries.GetCurrentOrgDetails,
            cancellationToken: cancellationToken);
}
