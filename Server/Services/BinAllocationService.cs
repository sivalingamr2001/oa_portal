using Backend.DB;
using Backend.Interfaces;
using Backend.Models;
using Backend.Shared;
using Dapper;
using Oracle.ManagedDataAccess.Client;
using System.Data;

namespace Backend.Services
{
    public class BinAllocationService(OracleService oracleService) : IBinAllocationService
    {
        private readonly string _connectionString = oracleService.GetConnectionString()
                ?? throw new InvalidOperationException("OracleDb connection string missing.");

        private IDbConnection CreateConnection()
        {
            return new OracleConnection(_connectionString);
        }

        // ── CREATE ───────────────────────────────────────────────────────────
        public async Task<decimal> CreateAllocationAsync(CreateAllocationRequestV2 req)
        {
            using var conn = CreateConnection();

            // 💡 CRITICAL FIX: Cast to OracleConnection and enforce 'BindByName' 
            // This natively resolves ORA-00932 by ignoring the property insertion order.
            if (conn is OracleConnection oracleConn)
            {
                oracleConn.BindByName = true;
            }

            conn.Open();
            using var tx = conn.BeginTransaction();

            try
            {
                var now = DateTime.Now;
                string currentYearShort = now.ToString("yy");
                string nextYearShort = now.AddYears(1).ToString("yy");

                // Get next sequence value for the unique header generation
                long sequenceVal = await conn.QueryFirstOrDefaultAsync<long>(
                    "SELECT JAN_B3_HEADER_SEQ.NEXTVAL FROM DUAL", transaction: tx);

                string uniqueSuffix = sequenceVal.ToString("D4");
                string generatedHeaderCode = $"{currentYearShort}{nextYearShort}-{uniqueSuffix}";

                // 1. Prepare and Execute Header Insert
                var headerParams = new DynamicParameters();
                headerParams.Add("p_transaction_date", req.TransactionDate);
                headerParams.Add("p_customer_or_item_specific", req.CustomerOrItemSpecific);
                headerParams.Add("p_customer_id", req.CustomerId);
                headerParams.Add("p_territory_id", req.TerritoryId);
                headerParams.Add("p_region", req.Region);
                headerParams.Add("p_bill_to_customer", req.BillToCustomer);
                headerParams.Add("p_ship_to_customer", req.ShipToCustomer);
                headerParams.Add("p_created_by", req.CreatedBy);
                headerParams.Add("p_remarks", req.Remarks);
                headerParams.Add("p_header_code", generatedHeaderCode);
                headerParams.Add("p_header_id", dbType: DbType.Decimal, direction: ParameterDirection.Output);

                await conn.ExecuteAsync(QueriesV2.CreateBinAllocationHeader, headerParams, transaction: tx);

                // Fetch the OUT parameter populated by the RETURNING INTO clause
                decimal headerId = headerParams.Get<decimal>("p_header_id");

                // 2. Prepare and Execute Line Iteration Loop
                foreach (var line in req.Lines)
                {
                    var lineParams = new DynamicParameters();
                    lineParams.Add("p_header_id", headerId);
                    lineParams.Add("p_organization_id", line.OrganizationId);
                    lineParams.Add("p_inventory_item_id", line.InventoryItemId);
                    lineParams.Add("p_b3_quantity", line.B3Quantity);
                    lineParams.Add("p_target_date", line.TargetDate);
                    lineParams.Add("p_line_id", dbType: DbType.Decimal, direction: ParameterDirection.Output);

                    await conn.ExecuteAsync(QueriesV2.CreateBinAllocationLine, lineParams, transaction: tx);
                }

                tx.Commit();
                return headerId;
            }
            catch
            {
                tx.Rollback();
                throw;
            }
        }

        /// <summary>All allocations — header + lines joined with complete lookups.</summary>
        public async Task<IEnumerable<AllocationRow>> GetAllAllocationsAsync(string currentUser)
        {
            using var conn = CreateConnection();

            // 1. Fetch all raw rows containing headers and lines mapped to AllocationRow
            var commandGrouped = new CommandDefinition(Queries.GetAllAllocationsGrouped, new { currentUser });
            var rawRows = (await conn.QueryAsync<AllocationRow>(commandGrouped)).ToList();

            if (!rawRows.Any())
                return rawRows;

            // 2. Extract distinct IDs for batch lookup processing
            var distinctOrgIds = rawRows.Where(r => r.OrganizationId.HasValue).Select(r => r.OrganizationId.Value).Distinct();
            var distinctItemIds = rawRows.Select(r => r.InventoryItemId).Distinct();
            var distinctCustomerIds = rawRows.Where(r => r.CustomerId.HasValue).Select(r => r.CustomerId.Value).Distinct();

            // 3. Fetch Lookup Labels (reusing the same database connection)

            // Inventory Organizations Lookup
            var orgDictionary = new Dictionary<decimal, string>();
            foreach (var orgId in distinctOrgIds)
            {
                var code = await GetInventoryOrganizationCodeByIdInternalAsync(conn, (int)orgId, CancellationToken.None);
                if (code != null) orgDictionary[orgId] = code;
            }

            // Inventory Items Lookup (With defensive .Trim() application safely applied)
            var itemDictionary = new Dictionary<decimal, (string Code, string Description)>();
            foreach (var itemId in distinctItemIds)
            {
                var itemDetails = await GetInventoryItemDetailsByIdInternalAsync(conn, (int)itemId, CancellationToken.None);
                if (itemDetails != null) itemDictionary[itemId] = itemDetails.Value;
            }

            // Customer Name & Region Lookup
            var customerDictionary = new Dictionary<decimal, (string Name, string Region)>();
            foreach (var custId in distinctCustomerIds)
            {
                var customerDetails = await GetCustomerDetailsByIdInternalAsync(conn, (long)custId, CancellationToken.None);
                if (customerDetails != null) customerDictionary[custId] = customerDetails.Value;
            }

            // 4. Map the labels back into your AllocationRow dataset
            foreach (var row in rawRows)
            {
                // Map Organization Code
                if (row.OrganizationId.HasValue && orgDictionary.TryGetValue(row.OrganizationId.Value, out var orgCode))
                    row.OrganizationCode = orgCode?.Trim();

                // Map Item Code & Description (Applying required clean string trims)
                if (itemDictionary.TryGetValue(row.InventoryItemId, out var item))
                {
                    row.ItemCode = item.Code?.Trim();
                    row.ItemDescription = item.Description?.Trim() ?? "N/A";
                }

                // Map Customer Name & Region
                if (row.CustomerId.HasValue && customerDictionary.TryGetValue(row.CustomerId.Value, out var customer))
                {
                    row.CustomerName = customer.Name?.Trim();
                    row.CustomerRegion = customer.Region?.Trim();
                }
            }

            return rawRows;
        }

        // ── PRIVATE HELPERS (Multi-Column Extraction) ─────────────────────────────

        private async Task<string> GetOperatingUnitNameByIdInternalAsync(IDbConnection conn, int organizationId, CancellationToken cancellationToken)
        {
            var command = new CommandDefinition(QueriesV2.GetOperatingUnitById, new { OrganizationId = organizationId }, cancellationToken: cancellationToken);
            var result = await conn.QueryFirstOrDefaultAsync<dynamic>(command);
            return result?.Name;
        }

        private async Task<string> GetInventoryOrganizationCodeByIdInternalAsync(IDbConnection conn, int organizationId, CancellationToken cancellationToken)
        {
            var command = new CommandDefinition(QueriesV2.GetInventoryOrganizationById, new { OrganizationId = organizationId }, cancellationToken: cancellationToken);
            var result = await conn.QueryFirstOrDefaultAsync<dynamic>(command);
            return result?.OrganizationCode;
        }

        private async Task<(string Code, string Description)?> GetInventoryItemDetailsByIdInternalAsync(IDbConnection conn, int inventoryItemId, CancellationToken cancellationToken)
        {
            var command = new CommandDefinition(QueriesV2.GetInventoryItemById, new { InventoryItemId = inventoryItemId }, cancellationToken: cancellationToken);
            var result = await conn.QueryFirstOrDefaultAsync<dynamic>(command);

            if (result == null) return null;
            return (result.ItemCode, result.Description);
        }

        private async Task<(string Name, string Region)?> GetCustomerDetailsByIdInternalAsync(IDbConnection conn, long customerId, CancellationToken cancellationToken)
        {
            var command = new CommandDefinition(QueriesV2.GetCustomerNameById, new { CustomerId = customerId }, cancellationToken: cancellationToken);
            var result = await conn.QueryFirstOrDefaultAsync<dynamic>(command);

            if (result == null) return null;

            // Cast to dictionary to read the exact uppercase keys returned by Oracle
            var dict = (IDictionary<string, object>)result;

            string name = dict.TryGetValue("CUSTOMERNAME", out var n) ? n?.ToString() : null;
            string region = dict.TryGetValue("REGION", out var r) ? r?.ToString() : null;

            return (name, region);
        }

        public async Task<AllocationHeaderDetailsDto> GetAllocationByHeaderIdAsync(decimal headerId)
        {
            using var conn = CreateConnection();

            // Use your verified query parameter pattern
            var flatRows = await conn.QueryAsync<dynamic>(
                Queries.GetAllAllocationsGroupedById + " WHERE h.HEADER_ID = :p_header_id",
                new { p_header_id = headerId }
            );

            if (flatRows == null || !flatRows.Any())
            {
                return null;
            }

            var firstRow = flatRows.First();
            var firstRowDict = (IDictionary<string, object>)firstRow;

            // Construct the Parent Header data profile with safe type casting
            var headerDto = new AllocationHeaderDetailsDto
            {
                CustomerId = firstRowDict.TryGetValue("CUSTOMERID", out var cid) && cid != null ? Convert.ToDecimal(cid) : 0,
                CustomerName = firstRowDict.TryGetValue("CUSTOMERNAME", out var cname) ? cname?.ToString()?.Trim() : null,
                BillToCustomerId = firstRowDict.TryGetValue("BILLTOCUSTOMERID", out var bcid) && bcid != null ? Convert.ToDecimal(bcid) : 0,
                BillToCustomerName = firstRowDict.TryGetValue("BILLTOCUSTOMERNAME", out var bcname) ? bcname?.ToString()?.Trim() : null,
                ShipToCustomerId = firstRowDict.TryGetValue("SHIPTOCUSTOMERID", out var scid) && scid != null ? Convert.ToDecimal(scid) : 0,
                ShipToCustomerName = firstRowDict.TryGetValue("SHIPTOCUSTOMERNAME", out var scname) ? scname?.ToString()?.Trim() : null,
                HeaderId = firstRowDict.TryGetValue("HEADERID", out var hid) && hid != null ? Convert.ToInt32(hid) : 0,
                CustomerOrItemSpecific = firstRowDict.TryGetValue("CUSTOMERORITEMSPECIFIC", out var cois) && cois != null ? Convert.ToInt32(cois) : 0,
                TerritoryId = firstRowDict.TryGetValue("TERRITORYID", out var tid) && tid != null ? Convert.ToDecimal(tid) : (decimal?)null,
                Remarks = firstRowDict.TryGetValue("REMARKS", out var rem) ? rem?.ToString()?.Trim() : null,
                TransactionDate = firstRowDict.TryGetValue("TRANSACTIONDATE", out var tdate) ? tdate?.ToString() : null,
                CreatedBy = firstRowDict.TryGetValue("CREATEDBY", out var cby) ? cby?.ToString()?.Trim() : null,
                CreatedDate = firstRowDict.TryGetValue("CREATEDDATE", out var cdate) ? cdate?.ToString() : null,
                UpdatedBy = firstRowDict.TryGetValue("UPDATEDBY", out var uby) ? uby?.ToString()?.Trim() : null,
                UpdatedDate = firstRowDict.TryGetValue("UPDATEDDATE", out var udate) ? udate?.ToString() : null
            };

            // Populate the child items list loop
            foreach (var row in flatRows)
            {
                var rowDict = (IDictionary<string, object>)row;
                if (!rowDict.TryGetValue("LINEID", out var lineIdVal) || lineIdVal == null) continue;

                // 1. Convert Inventory Item Id safely to match lookup parameters
                int inventoryItemId = rowDict.TryGetValue("INVENTORYITEMID", out var itmId) && itmId != null ? Convert.ToInt32(itmId) : 0;

                // 2. Fetch missing item master details cleanly
                var itemData = await GetInventoryItemDetailsByIdInternalAsync(conn, inventoryItemId, CancellationToken.None);

                // 3. Gather quantities safely
                int b3Qty = rowDict.TryGetValue("B3QUANTITY", out var b3q) && b3q != null ? Convert.ToInt32(b3q) : 0;
                int? b3ApprovedQty = rowDict.TryGetValue("B3APPROVEDQUANTITY", out var b3aq) && b3aq != null ? Convert.ToInt32(b3aq) : (int?)null;
                int? oldRequestedQty = rowDict.TryGetValue("OLDREQUESTEDQTY", out var oldQ) && oldQ != null ? Convert.ToInt32(oldQ) : (int?)null;

                headerDto.Items.Add(new AllocationLineItemDto
                {
                    LineId = Convert.ToDecimal(lineIdVal),
                    OrganizationId = rowDict.TryGetValue("ORGANIZATIONID", out var orgId) && orgId != null ? Convert.ToDecimal(orgId) : 0,
                    OrganizationCode = rowDict.TryGetValue("ORGANIZATIONCODE", out var orgCode) ? orgCode?.ToString()?.Trim() : null,
                    InventoryItemId = Convert.ToDecimal(inventoryItemId),
                    ItemCode = itemData?.Code?.Trim() ?? "N/A",
                    ItemDescription = itemData?.Description?.Trim() ?? "N/A",
                    B3Quantity = b3Qty,
                    B3ApprovedQuantity = b3ApprovedQty,
                    OldRequestedQty = oldRequestedQty, // 💡 Mapped old request amount from your history chain
                    TargetDate = rowDict.TryGetValue("TARGETDATE", out var tgd) ? tgd?.ToString() : null,
                    ApprovalFlag = rowDict.TryGetValue("APPROVALFLAG", out var appf) ? appf?.ToString()?.Trim() : null,
                    ClosureFlag = rowDict.TryGetValue("CLOSUREFLAG", out var clof) ? clof?.ToString()?.Trim() : null,
                    Revision = rowDict.TryGetValue("REVISION", out var rev) && rev != null ? Convert.ToInt32(rev) : 0,
                    ParentLineId = rowDict.TryGetValue("PARENTLINEID", out var plid) && plid != null ? Convert.ToDecimal(plid) : (decimal?)null
                });

                headerDto.TotalRequested += b3Qty;
                headerDto.TotalApproved += (b3ApprovedQty ?? 0);
            }

            // Determine status metadata summary
            if (headerDto.TotalApproved == 0) headerDto.Status = "Pending";
            else if (headerDto.TotalApproved >= headerDto.TotalRequested) headerDto.Status = "Fulfilled";
            else headerDto.Status = "Partial";

            return headerDto;
        }

        public async Task<IEnumerable<B3Line>> GetPendingApprovalLinesAsync()
        {
            using var conn = CreateConnection();
            return await conn.QueryAsync<B3Line>(QueriesV2.GetPendingApprovalLines);
        }

        public async Task<IEnumerable<B3Cancellation>> GetAllCancellationsAsync()
        {
            using var conn = CreateConnection();
            return await conn.QueryAsync<B3Cancellation>(QueriesV2.GetAllCancellations);
        }

        public async Task<IEnumerable<CancellationDto>> GetCancellationByLineIdAsync(int? lineId)
        {
            using var conn = CreateConnection();
            return await conn.QueryAsync<CancellationDto>(QueriesV2.GetCancellationByLineId, new { LineId = lineId });
        }

        public async Task<IEnumerable<AllocationSummary>> GetAllocationSummaryAsync(string currentUser)
        {
            using var conn = CreateConnection();
            return await conn.QueryAsync<AllocationSummary>(QueriesV2.GetAllocationSummary, new { currentUser });
        }

        // ── REVISE ───────────────────────────────────────────────────────────

        public async Task<decimal> ReviseQuantityAsync(ReviseQuantityRequest req)
        {
            using var conn = CreateConnection();
            conn.Open();

            var p = new DynamicParameters();
            p.Add("p_new_b3_quantity", req.NewB3Quantity);
            p.Add("p_original_line_id", req.OriginalLineId);
            p.Add("p_amendment_reason", req.Reason); // Maps the string text from the UI dropdown

            // Out parameter to capture the generated sequence value
            p.Add("p_line_id", dbType: DbType.Decimal, direction: ParameterDirection.Output);

            // Execute the PL/SQL Block engine
            await conn.ExecuteAsync(QueriesV2.CreateQuantityRevision, p);

            // Safe extraction fallback mechanism to eliminate DBNull parsing exceptions
            var outputValue = p.Get<decimal?>("p_line_id");

            if (!outputValue.HasValue || outputValue.Value == 0)
            {
                throw new ApplicationException("Database transaction failed to yield a valid sequence Line ID back to context.");
            }

            return outputValue.Value;
        }

        public async Task<IEnumerable<B3Line>> GetLineRevisionHistoryAsync(decimal originalLineId)
        {
            using var conn = CreateConnection();
            return await conn.QueryAsync<B3Line>(
                QueriesV2.GetLineRevisionHistory,
                new { p_original_line_id = originalLineId });
        }

        // ── APPROVE ──────────────────────────────────────────────────────────

        public async Task<bool> ApproveLineAsync(ApproveLineRequest req)
        {
            using var conn = CreateConnection();
            var rows = await conn.ExecuteAsync(
                QueriesV2.HodApproveAllocationLine,
                new
                {
                    p_approved_quantity = req.ApprovedQuantity,
                    p_approved_by = req.ApprovedBy,
                    p_line_id = req.LineId
                });
            return rows > 0;
        }

        // ── AMEND ────────────────────────────────────────────────────────────

        public async Task<bool> AmendApprovedQuantityAsync(AmendQuantityRequest req)
        {
            using var conn = CreateConnection();

            // Inserts the new line branching from the parent architecture records
            var rows = await conn.ExecuteAsync(
                QueriesV2.InsertAmendedLineItem,
                new
                {
                    p_b3_quantity = req.AmendedQuantity,          // New quantity goal
                    p_b3_approved_quantity = req.AmendedQuantity, // Assuming automated immediate sign-off
                    p_revision = req.Revision + 1,                    // Current track version index
                    p_parent_line_id = req.LineId,                 // Connects trace logic,
                    p_reason = req.Reason?.Trim()
                });

            return rows > 0;
        }

        // ── CANCEL ───────────────────────────────────────────────────────────

        public async Task<bool> CancelLineAsync(CancelLineRequest req)
        {
            using var conn = CreateConnection();
            conn.Open();
            using var tx = conn.BeginTransaction();

            try
            {
                // 1. Insert cancellation record
                await conn.ExecuteAsync(
                    QueriesV2.InsertCancellationRecord,
                    new
                    {
                        p_line_id = req.LineId,
                        p_cancelled_qty = req.CancelledQty,
                        p_cancel_reason = req.CancelReason,
                        p_created_by = req.CreatedBy
                    },
                    transaction: tx);

                // 2. Close the line
                await conn.ExecuteAsync(
                    QueriesV2.CloseCancelledLine,
                    new { p_line_id = req.LineId },
                    transaction: tx);

                tx.Commit();
                return true;
            }
            catch
            {
                tx.Rollback();
                throw;
            }
        }

        public async Task<bool> CancelAllLinesAsync(CancelHeaderRequest req)
        {
            using var conn = CreateConnection();
            conn.Open();
            using var tx = conn.BeginTransaction();

            try
            {
                var p = new
                {
                    p_header_id = req.HeaderId,
                    p_cancel_reason = req.CancelReason,
                    p_created_by = req.CreatedBy
                };

                // 1. Insert cancellation rows for all open lines
                await conn.ExecuteAsync(
                    QueriesV2.InsertCancellationForAllLines, p, transaction: tx);

                // 2. Close all open lines
                await conn.ExecuteAsync(
                    QueriesV2.CloseAllLinesForHeader, p, transaction: tx);

                tx.Commit();
                return true;
            }
            catch
            {
                tx.Rollback();
                throw;
            }
        }

    }
}