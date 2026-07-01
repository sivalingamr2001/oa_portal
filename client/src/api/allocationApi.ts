import { axiosClient } from "../lib/axiosClient";
import type { B3LineWithMetricsDto } from "./types";

const BASE = "/Allocation";
const BIN_BASE = "/BinAllocation";

// ==================== TYPES ====================

export interface Region {
  region: string;
  subRegion: string;
}

export interface Customer {
  customerId: number;
  customerName: string;
  region: string;
}

export interface Employee {
  lastName: string;
  employeeNumber: string;
}

export interface CustomerAddress {
  address1: string;
  address2: string;
  address3: string;
  city: string;
  postalCode: string;
  orgId: number;
  location: string;
}

export interface OperatingUnit {
  organizationId: number;
  name: string;
}

export interface DemandMetrics {
  oaPendingQuantity: number;
  oaRsvQty: number;
  oaPickedQty: number;
  binQty: number;
  binRsvQty: number;
}

export interface Organization {
  organizationId: number;
  organizationCode: string;
}

export interface InventoryItem {
  inventoryItemId: number;
  itemCode: string;
  description: string;
}

export interface PaginatedItems {
  data: InventoryItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface RrsCategory {
  rrsCategory: string;
}

export interface ErrorResponse {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  additionalProp1?: string;
  additionalProp2?: string;
  additionalProp3?: string;
}

export interface B3Header {
  headerId: number;
  transactionDate: string;
  customerOrItemSpecific: number | null;
  customerId: number | null;
  territoryId: number | null;
  billToCustomer: number | null;
  shipToCustomer: number | null;
  createdBy: string;
  createdDate: string;
  updatedBy: string | null;
  updatedDate: string | null;
  remarks: string | null;
}

export interface B3Line {
  lineId: number;
  headerId: number;
  organizationId: number | null;
  inventoryItemId: number;
  b3Quantity: number;
  targetDate: string | null;
  b3ApprovedQuantity: number | null;
  approvalFlag: "Y" | "N" | "A";
  approvedDate: string | null;
  approvedBy: string | null;
  closureFlag: "Y" | "N" | "C";
  revision: number;
  parentLineId: number | null;
}

export interface B3Cancellation {
  cancelId: number;
  lineId: number;
  cancelledQty: number;
  cancelledDate: string;
  cancelReason: string | null;
  createdBy: string | null;
  createdDate: string;
}

export interface AllocationRow extends B3Header {
  lineId: number;
  organizationId: number | null;
  inventoryItemId: number;
  organizationCode?: string;
  itemCode?: string;
  itemDescription?: string;
  customerName?: string;
  customerRegion?: string;
  b3Quantity: number;
  targetDate: string | null;
  b3ApprovedQuantity: number | null;
  approvalFlag: "Y" | "N" | "A";
  approvedDate: string | null;
  approvedBy: string | null;
  closureFlag: "Y" | "N" | "C";
  revision: number;
  oldRequestedQty?: number;
  headerCode?: string | null;
}

export interface AllocationSummary {
  headerId: number;
  transactionDate: string;
  customerId: number | null;
  totalLines: number;
  totalRequestedQty: number;
  totalApprovedQty: number;
  approvedLines: number;
  pendingLines: number;
  cancelledLines: number;
}

export interface CreateLineRequest {
  organizationId?: number | null;
  inventoryItemId: number;
  b3Quantity: number;
  targetDate?: string | null; // ISO date string
}

export interface CreateAllocationRequest {
  transactionDate: string; // ISO date string
  customerOrItemSpecific?: number | null;
  customerId?: number | null;
  territoryId?: number | null;
  region: string | null;
  billToCustomer?: number | null;
  shipToCustomer?: number | null;
  createdBy: string;
  remarks?: string | null;
  lines: CreateLineRequest[];
}

export interface ReviseQuantityRequest {
  originalLineId: number;
  newB3Quantity: number;
  reason: string;
}

export interface ApproveLineRequest {
  lineId: number;
  approvedQuantity: number;
  approvedBy: string | null;
}

export interface AmendQuantityRequest {
  lineId: number;
  amendedQuantity: number;
  amendedBy: string;
}

export interface CancelLineRequest {
  lineId: number;
  cancelledQty: number;
  cancelReason: string;
  createdBy: string | null;
}

export interface CancelHeaderRequest {
  headerId: number;
  cancelReason: string;
  createdBy: string | null;
}

// ─────────────────────────────────────────────────────────────
// TYPES — Generic API Responses
// ─────────────────────────────────────────────────────────────

export interface CreateAllocationResponse {
  headerId: number;
}

export interface ReviseQuantityResponse {
  newLineId: number;
  message: string;
}

export interface ActionResponse {
  message: string;
}

export interface RegionDetailsDto {
  region: string;
  subRegion: string;
}

export interface PagedResult<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// ==================== API FUNCTIONS ====================

interface CacheStore {
  data: any;
  timestamp: number;
}

// ============================================
// Types for /api/Allocation/fulfillments
// ============================================

export interface SalesOrderLine {
  soId: number;
  b3LineId: number;
  soLineId: number;
  soLineNo: number;
  orderNumber: number;
  quantity: number;
  orderEnteredDate: string;
  inventoryItemId: number;
  itemNo: string;
  orgId: number;
  customerId: number;
  customerName: string;
  creationDate: string;
}

export interface AllocationFulfillment {
  headerId: number;
  headerCode: string;
  customerName: string;
  remarks: string;
  transactionDate: string;
  createdBy: string;
  lineId: number;
  approvalFlag: string;
  b3ApprovedQuantity: number;
  b3Quantity: number;
  oldRequestedQty: number;
  inventoryItemId: number;
  organizationId: number;
  organizationCode: string;
  itemCode: string;
  itemDescription: string;
  targetDate: string;
  closureFlag: string;
  revision: number;
  parentLineId: number;
  allocatedSoQuantity: number;
  salesOrderLines: SalesOrderLine[];
}

// Stores cached responses by their URL endpoint key
const apiCache: Record<string, CacheStore> = {};
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds

/**
 * Utility to clear the cache whenever a state mutation occurs (Create/Update/Delete)
 */
export const clearAllocationCache = (): void => {
  Object.keys(apiCache).forEach((key) => {
    if (key.startsWith(BIN_BASE)) {
      delete apiCache[key];
    }
  });
};

export const loginApi = async (
  username: string,
  password?: string,
): Promise<RegionDetailsDto> => {
  const response = await axiosClient.post<RegionDetailsDto>("/Auth/login", {
    username,
    password,
  });
  return response.data;
};

/**
 * GET /api/Allocation/regions
 * Get all regions and sub-regions
 */
export const getRegions = async (): Promise<Region[]> => {
  const { data } = await axiosClient.get<Region[]>(`${BASE}/regions`);
  return data;
};

/**
 * GET /api/Allocation/customers/bill-to
 * Get bill-to customers by region and sub-region
 */
export const getBillToCustomers = async (
  region: string,
  subRegion: string,
  orgId: number | null,
): Promise<Customer[]> => {
  const { data } = await axiosClient.get<Customer[]>(
    `${BASE}/customers/bill-to`,
    { params: { region, subRegion, orgId } },
  );
  return data;
};

/**
 * GET /api/Allocation/customers/ship-to
 * Get ship-to customers by region and sub-region
 */
export const getShipToCustomers = async (
  orgId: number | null,
  customerId: number | null,
): Promise<Customer[]> => {
  const { data } = await axiosClient.get<Customer[]>(
    `${BASE}/customers/ship-to`,
    { params: { orgId, customerId } },
  );
  return data;
};

/**
 * GET /api/Allocation/employees/prepared-by
 * Get employees prepared by region
 */
export const getPreparedByEmployees = async (
  region: string,
): Promise<Employee[]> => {
  const { data } = await axiosClient.get<Employee[]>(
    `${BASE}/employees/prepared-by`,
    { params: { region } },
  );
  return data;
};

/**
 * GET /api/Allocation/customers/{customerId}/addresses
 * Get customer addresses
 */
export const getCustomerAddresses = async (
  customerId: number,
  siteUseCode?: string,
  orgId?: number,
): Promise<CustomerAddress[]> => {
  const { data } = await axiosClient.get<CustomerAddress[]>(
    `${BASE}/customers/${customerId}/addresses`,
    { params: { siteUseCode, orgId } },
  );
  return data;
};

/**
 * GET /api/Allocation/weeks/dropdown
 * Get available weeks dropdown
 */
export const getWeeksDropdown = async (): Promise<string[]> => {
  const { data } = await axiosClient.get<string[]>(`${BASE}/weeks/dropdown`);
  return data;
};

/**
 * GET /api/Allocation/operating-units
 * Get all operating units
 */
export const getOperatingUnits = async (): Promise<OperatingUnit[]> => {
  const { data } = await axiosClient.get<OperatingUnit[]>(
    `${BASE}/operating-units`,
  );
  return data;
};

/**
 * GET /api/Allocation/demand-metrics
 * Get demand metrics for a customer, organization, and item
 */
export const getDemandMetrics = async (
  customerId: number,
  organizationId: number,
  inventoryItemId: number,
): Promise<DemandMetrics> => {
  const { data } = await axiosClient.get<DemandMetrics>(
    `${BASE}/demand-metrics`,
    { params: { customerId, organizationId, inventoryItemId } },
  );
  return data;
};

/**
 * GET /api/Allocation/organizations
 * Get all organizations
 */
export const getOrganizations = async (): Promise<Organization[]> => {
  const { data } = await axiosClient.get<Organization[]>(
    `${BASE}/organizations`,
  );
  return data;
};

/**
 * GET /api/Allocation/organizations-by/{OuId}
 * Get organizations by OU ID
 */
export const getOrganizationsByOuId = async (
  OuId: number,
): Promise<Organization[]> => {
  const { data } = await axiosClient.get<Organization[]>(
    `${BASE}/organizations-by/${OuId}`,
  );
  return data;
};

/**
 * GET /api/Allocation/items
 * Get paginated inventory items with optional search
 */
export const getItems = async (
  page: number = 1,
  pageSize: number = 10,
  search?: string,
  orgId?: number,
): Promise<PaginatedItems> => {
  const { data } = await axiosClient.get<PaginatedItems>(`${BASE}/items`, {
    params: { page, pageSize, search, orgId },
  });
  return data;
};

/**
 * Look up a single inventory item by item code.
 */
export const getItemByCode = async (
  itemCode: string,
  organizationId?: number,
): Promise<InventoryItem> => {
  const result = await getItems(1, 10, itemCode.trim(), organizationId);
  const normalized = itemCode.trim().toUpperCase();
  const item = result.data.find((i) => i.itemCode.toUpperCase() === normalized);
  if (!item) {
    throw new Error(`Item "${itemCode}" not found`);
  }
  return item;
};

/**
 * GET /api/Allocation/rrs-category
 * Get RRS category for an organization and item
 */
export const getRrsCategory = async (
  organizationId: number,
  inventoryItemId: number,
): Promise<RrsCategory> => {
  const { data } = await axiosClient.get<RrsCategory>(`${BASE}/rrs-category`, {
    params: { organizationId, inventoryItemId },
  });
  return data;
};

/**
 * Create a bin allocation — one header with multiple line items.
 * POST /api/binallocation
 */
export const createAllocation = async (
  payload: CreateAllocationRequest,
): Promise<CreateAllocationResponse> => {
  clearAllocationCache();
  const { data } = await axiosClient.post<CreateAllocationResponse>(
    BIN_BASE,
    payload,
  );
  return data;
};

/**
 * Get all bin allocations (header + lines joined).
 * GET /api/binallocation
 */
export const getAllAllocations = async (
  currentUser: string,
): Promise<AllocationRow[]> => {
  const cacheKey = `${BIN_BASE}?user=${currentUser}`;
  const cached = apiCache[cacheKey];
  const now = Date.now();

  // Return data if cache exists and is fresh
  if (cached && now - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  // Pass the user string safely as a URL query string parameter string to your C# Controller backend
  const { data } = await axiosClient.get<AllocationRow[]>(BIN_BASE, {
    params: { currentUser },
  });

  // Save to user-isolated cache space
  apiCache[cacheKey] = { data, timestamp: now };
  return data;
};

/**
 * Get a single allocation by header ID.
 * GET /api/binallocation/{headerId}
 */
export const getAllocationByHeaderId = async (
  headerId: number,
): Promise<AllocationRow[]> => {
  const cacheKey = `${BIN_BASE}/${headerId}`;
  const cached = apiCache[cacheKey];
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  const { data } = await axiosClient.get<AllocationRow[]>(cacheKey);

  apiCache[cacheKey] = { data, timestamp: now };
  return data;
};

/**
 * Get dashboard summary per header (totals, approved, pending, cancelled).
 * GET /api/binallocation/summary
 */
export const getAllocationSummary = async (
  currentUser: string,
): Promise<AllocationSummary[]> => {
  const { data } = await axiosClient.get<AllocationSummary[]>(
    `${BIN_BASE}/summary`,
    { params: { currentUser } },
  );
  return data;
};

/**
 * Get all allocation fulfillments (header + lines joined).
 * GET /api/Allocation/fulfillments
 */
export const getAllocationFulfillments = async (
  currentUser: string,
): Promise<AllocationFulfillment[]> => {
  const cacheKey = `${BASE}/fulfillments?user=${currentUser}`;
  const cached = apiCache[cacheKey];
  const now = Date.now();

  // Return data if cache exists and is fresh
  if (cached && now - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  // Pass the user string safely as a URL query string parameter to your C# Controller backend
  const { data } = await axiosClient.get<AllocationFulfillment[]>(BASE + '/fulfillments', {
    params: { currentUser },
  });

  // Save to user-isolated cache space
  apiCache[cacheKey] = { data, timestamp: now };
  return data;
};

/**
 * Get all lines currently pending approval along with their demand metrics.
 * GET /api/binallocation/pending-approval
 */
export const getPendingApprovalLines = async (): Promise<
  B3LineWithMetricsDto[]
> => {
  const { data } = await axiosClient.get<B3LineWithMetricsDto[]>(
    `${BIN_BASE}/pending-approval`,
  );
  return data;
};

/**
 * User role: revise requested quantity.
 * Creates a NEW revision row — does NOT modify the original line.
 * POST /api/binallocation/revise
 */
export const reviseQuantity = async (
  payload: ReviseQuantityRequest,
): Promise<ReviseQuantityResponse> => {
  clearAllocationCache();
  const { data } = await axiosClient.post<ReviseQuantityResponse>(
    `${BIN_BASE}/revise`,
    payload,
  );
  return data;
};

/**
 * Get full revision history for a line (all revisions by original line ID).
 * GET /api/binallocation/revisions/{lineId}
 */
export const getLineRevisionHistory = async (
  lineId: number,
): Promise<B3Line[]> => {
  const { data } = await axiosClient.get<B3Line[]>(
    `${BIN_BASE}/revisions/${lineId}`,
  );
  return data;
};

/**
 * HOD approves a pending line with approved quantity.
 * PUT /api/binallocation/approve
 */
export const approveLine = async (
  payload: ApproveLineRequest,
): Promise<ActionResponse> => {
  clearAllocationCache();
  const { data } = await axiosClient.put<ActionResponse>(
    `${BIN_BASE}/approve`,
    payload,
  );
  return data;
};

/**
 * HOD amends the approved quantity of an already-approved line.
 * PUT /api/binallocation/amend
 */
export const amendApprovedQuantity = async (
  payload: AmendQuantityRequest,
): Promise<ActionResponse> => {
  clearAllocationCache();
  const { data } = await axiosClient.put<ActionResponse>(
    `${BIN_BASE}/amend`,
    payload,
  );
  return data;
};

/**
 * Cancel a single allocation line.
 * Inserts cancellation record + closes line in one transaction.
 * POST /api/binallocation/cancel/line
 */
export const cancelLine = async (
  payload: CancelLineRequest,
): Promise<ActionResponse> => {
  clearAllocationCache();
  const { data } = await axiosClient.post<ActionResponse>(
    `${BIN_BASE}/cancel/line`,
    payload,
  );
  return data;
};

/**
 * Cancel all open lines under a header.
 * POST /api/binallocation/cancel/header
 */
export const cancelAllLines = async (
  payload: CancelHeaderRequest,
): Promise<ActionResponse> => {
  clearAllocationCache();
  const { data } = await axiosClient.post<ActionResponse>(
    `${BIN_BASE}/cancel/header`,
    payload,
  );
  return data;
};

/**
 * Fetch all cancellation records with header and line context.
 * GET /api/binallocation/cancellations
 */
export const getAllCancellations = async (): Promise<B3Cancellation[]> => {
  const { data } = await axiosClient.get<B3Cancellation[]>(
    `${BIN_BASE}/cancellations`,
  );
  return data;
};
