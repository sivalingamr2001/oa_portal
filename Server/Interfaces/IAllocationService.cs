using Backend.Models;

namespace Backend.Interfaces;

/// <summary>
/// Service contract handling geographic allocations, customer site uses, operational address data, and scheduling.
/// </summary>
public interface IAllocationService
{
    /// <summary>
    /// Retrieves the assigned Region and SubRegion for a specific user after successful authentication.
    /// </summary>
    Task<RegionDetailsDto?> GetRegionDetailsAfterLoginAsync(string username, string password, CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves a unique list of all available Regions and SubRegions within the system.
    /// </summary>
    Task<IEnumerable<RegionDetailsDto>> GetAllRegionDetailsAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets unique customer billing assignments filtering by user-specified region and sub-region.
    /// </summary>
    Task<IEnumerable<CustomerDto>> GetBillToCustomersAsync(string region, string subRegion, int orgId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets unique shipping configurations filtering by user-specified region and sub-region.
    /// </summary>
    Task<IEnumerable<ShipToCustomerDto>> GetShipToCustomersAsync(int orgId, int customerId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Pulls qualified executive employee profiles working out of a dynamic region.
    /// </summary>
    Task<IEnumerable<EmployeeDto>> GetPreparedByEmployeesAsync(string region, CancellationToken cancellationToken = default);

    /// <summary>
    /// Queries multi-location structures matching a specific client context, organization, and site use role.
    /// </summary>
    Task<IEnumerable<AddressDto>> GetCustomerAddressesAsync(string siteUseCode, long orgId, long customerId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Generates system standard upcoming sequence loops bound by operational organization and customer context.
    /// </summary>
    Task<IEnumerable<string>> GetWeekDropdownListAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves targeted corporate operational unit profiles filtered by core organization identifiers.
    /// </summary>
    Task<IEnumerable<OperatingUnitDto>> GetOperatingUnitsAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves a collection of all valid active inventory organizations configured in the system.
    /// </summary>
    /// <param name="cancellationToken">A token to monitor for cancellation requests during the asynchronous data fetch operation.</param>
    /// <returns>A task representing the asynchronous operation, containing an enumerable list of <see cref="OrganizationDto"/> records.</returns>
    Task<IEnumerable<OrganizationDto>> GetInventoryOrganizationsAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves a collection of all valid active inventory organizations configured in the system.
    /// </summary>
    /// <param name="ouId">An structural boundary filter reference targeting rows bound exclusively inside an operational organization index pointer.</param>
    /// <param name="cancellationToken">A token to monitor for cancellation requests during the asynchronous data fetch operation.</param>
    /// <returns>A task representing the asynchronous operation, containing an enumerable list of <see cref="OrganizationDto"/> records.</returns>
    Task<IEnumerable<OrganizationDto>> GetInventoryOrganizationsByOuIdAsync(int ouId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves a paginated, searchable list of stock warehouse components filtered optionally by structural inventory organizational unit context.
    /// </summary>
    /// <param name="page">The zero-based or one-based index number indicating the specific data subset grid index segment layout view target.</param>
    /// <param name="pageSize">The total row threshold calculation maximum volume allocation limits expected back inside a unique framework dataset page wrapper context.</param>
    /// <param name="search">An optional alphanumeric tracking filter segment used to match specific product descriptions or code identities.</param>
    /// <param name="orgId">An optional structural boundary filter reference targeting rows bound exclusively inside an operational organization index pointer.</param>
    /// <param name="cancellationToken">A token to monitor for cancellation requests during the asynchronous data fetch operation.</param>
    /// <returns>A task representing the asynchronous operation, containing a <see cref="PagedResult{T}"/> containing <see cref="InventoryItemDto"/> items.</returns>
    Task<PagedResult<InventoryItemDto>> GetInventoryItemDetailsAsync(int page, int pageSize, string? search, int? orgId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Resolves the specific regulatory Sales RRS operational target classification category string assignment for a unique item variant.
    /// </summary>
    /// <param name="organizationId">The parent operational facility tracking number reference context key where the item matrix lookup applies.</param>
    /// <param name="inventoryItemId">The core material master row key tracking number identification code of the target inventory asset.</param>
    /// <param name="cancellationToken">A token to monitor for cancellation requests during the asynchronous data fetch operation.</param>
    /// <returns>A task representing the asynchronous operation, containing the verified category evaluation label string, or null if unassigned.</returns>
    Task<string?> GetSalesRrsCategoryAsync(int organizationId, int inventoryItemId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Pulls historical demand calculation volumes, forecast projections, and processing allocation rate metrics for an analytical pipeline structure.
    /// </summary>
    /// <param name="customerId">The unique customer structural tracking query parameter data key assignment representing the client entity.</param>
    /// <param name="organizationId">The structural logistics inventory warehouse management node key code context parameter execution path.</param>
    /// <param name="inventoryItemId">The unique product catalog item serial stock tracking number reference parameter constraint point.</param>
    /// <param name="cancellationToken">A token to monitor for cancellation requests during the asynchronous data fetch operation.</param>
    /// <returns>A task representing the asynchronous operation, containing a structured <see cref="DemandMetricsDto"/> reference, or null if no transactional metrics are available.</returns>
    Task<DemandMetricsDto?> GetDemandMetricsAsync(int customerId, int organizationId, int inventoryItemId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves a specific operating unit profile by its Organization ID.
    /// </summary>
    Task<OperatingUnitDto?> GetOperatingUnitByIdAsync(int organizationId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves a specific inventory organization definition by its Organization ID.
    /// </summary>
    Task<OrganizationDto?> GetInventoryOrganizationByIdAsync(int organizationId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves full details for a specific inventory item using its unique Inventory Item ID.
    /// </summary>
    Task<InventoryItemDto?> GetInventoryItemByIdAsync(int inventoryItemId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves a customer's name and Region details using their unique Customer ID.
    /// </summary>
    Task<CustomerDto?> GetCustomerNameByIdAsync(long customerId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves a collection of master transaction headers using dynamic projection objects to support flexible layout adjustments in the portal view.
    /// </summary>
    /// <param name="cancellationToken">A token to monitor for cancellation requests during the asynchronous data fetch operation.</param>
    /// <returns>A task representing the asynchronous operation, containing an enumerable list of dynamic header records.</returns>
    Task<IEnumerable<dynamic>> GetHeaderAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves all child transactional detail rows mapped to a specific parent document header using dynamic projection objects.
    /// </summary>
    /// <param name="headerId">The root master transaction identification record code used to filter the line dataset.</param>
    /// <param name="cancellationToken">A token to monitor for cancellation requests during the asynchronous data fetch operation.</param>
    /// <returns>A task representing the asynchronous operation, containing an enumerable list of dynamic child line items.</returns>
    Task<IEnumerable<dynamic>> GetLinesByHeaderIdAsync(int headerId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves structural corporate information for the active operating unit context currently tied to the running user session lifecycle.
    /// </summary>
    /// <param name="cancellationToken">A token to monitor for cancellation requests during the asynchronous data fetch operation.</param>
    /// <returns>A task representing the asynchronous operation, containing the dynamic context data of the active organization, or null if unassigned.</returns>
    Task<dynamic?> GetCurrentOrgAsync(CancellationToken cancellationToken = default);

}
