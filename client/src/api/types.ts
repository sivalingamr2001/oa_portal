export interface DemandMetricsDto {
  oaPendingQuantity: number;
  oaRsvQty: number;
  oaPickedQty: number;
  binQty: number;
  binRsvQty: number;
}

export interface AllocationRow {
  lineId: number;
  headerId: number;
  organizationId: number | null;
  inventoryItemId: number;
  b3Quantity: number;
  targetDate: string | null;
  b3ApprovedQuantity: number | null;
  approvalFlag: string;
  approvedDate: string | null;
  approvedBy: string | null;
  closureFlag: string;
  revision: number;
  parentLineId: number | null;
  amendmentReason: string | null;
  organizationCode: string | null;
  itemCode: string | null;
  itemDescription: string | null;
  oldRequestedQty: number | null;
  transactionDate: string;
  customerOrItemSpecific: number | null;
  customerId: number | null;
  territoryId: number | null;
  billToCustomer: number | null;
  shipToCustomer: number | null;
  createdBy: string;
  createdDate: string;
  updatedBy: string;
  updatedDate: string | null;
  remarks: string | null;
  customerName: string | null;
  customerRegion: string | null;
}

export interface B3LineWithMetricsDto {
  allocation: AllocationRow;
  metrics: DemandMetricsDto;
}
