namespace Backend.Shared;

/// <summary>
/// Provides centralized SQL query constants used throughout the application.
/// </summary>
public static class Queries
{
    /// <summary>
    /// Retrieves the assigned Region and SubRegion for a specific user after successful authentication.
    /// </summary>
    public const string GetRegionDetailsAfterLogin = @"
            SELECT 
                TER_NAME AS Region, 
                DR_REGION AS SubRegion 
            FROM jan_bms_login_v 
            WHERE UNAME = :Uname AND PWD = :Password";

    /// <summary>
    /// Retrieves a unique list of all available Regions and SubRegions within the system.
    /// </summary>
    public const string GetAllRegionDetails = @"
            SELECT DISTINCT
                TER_NAME AS Region, 
                DR_REGION AS SubRegion 
            FROM jan_bms_login_v";

    /// <summary>
    /// Fetches unique customer IDs, names, and regions configured with a 'BILL_TO' site use code filtered by UI parameters.
    /// </summary>
    public const string GetBillToCustomersByRegion = @"
            SELECT DISTINCT customer_id AS CustomerId, customer_name AS CustomerName, REGION AS Region 
            FROM (
                SELECT ra.customer_id, ra.customer_name,
                       (SELECT segment14 FROM ra_territories WHERE territory_id = ras.territory_id) AS REGION 
                FROM ra_customers ra
                JOIN ra_addresses_all ad ON ra.customer_id = ad.customer_id
                JOIN ra_site_uses_all ras ON ad.address_id = ras.address_id
                WHERE ras.site_use_code = 'BILL_TO'
            ) 
            WHERE REGION = :Region OR REGION = :SubRegion
            ORDER BY customer_name ASC";

    /// <summary>
    /// Fetches unique customer IDs, names, and regions configured with a 'SHIP_TO' site use code filtered by UI parameters.
    /// </summary>
    public const string GetShipToCustomersByRegion = @"
            SELECT DISTINCT customer_id AS CustomerId, customer_name AS CustomerName, REGION AS Region 
            FROM (
                SELECT ra.customer_id, ra.customer_name,
                       (SELECT segment14 FROM ra_territories WHERE territory_id = ras.territory_id) AS REGION 
                FROM ra_customers ra
                JOIN ra_addresses_all ad ON ra.customer_id = ad.customer_id
                JOIN ra_site_uses_all ras ON ad.address_id = ras.address_id
                WHERE ras.site_use_code = 'SHIP_TO'
            ) 
            WHERE REGION = :Region OR REGION = :SubRegion
            ORDER BY customer_name ASC";

    /// <summary>
    /// Retrieves a list of prepared employee names and numbers based on specific management levels within a dynamic region.
    /// </summary>
    public const string GetPreparedByEmployees = @"
            SELECT last_name AS LastName, employee_number AS EmployeeNumber 
            FROM jan_emp_mast_v 
            WHERE LOCATION = :Region 
              AND level1 IN ('AML1', 'OML1', 'OML2', 'OML3', 'AML3', 'AML2') 
            ORDER BY last_name ASC";

    /// <summary>
    /// Retrieves multi-location address details (Bill-To or Ship-To) for a specific customer ID and Organization ID.
    /// Expects parameters: :SiteUseCode, :OrgId, and :CustomerId.
    /// </summary>
    public const string GetCustomerMultipleLocations = @"
        SELECT ads.address1 AS ""Address1"", 
               ads.address2 AS ""Address2"", 
               ads.address3 AS ""Address3"", 
               ads.city AS ""City"", 
               ads.postal_code AS ""PostalCode"", 
               ads.org_id AS ""OrgId"",
               ras.location AS ""Location""
        FROM ra_customers ra
        JOIN ra_addresses_all ads ON ra.customer_id = ads.customer_id 
        JOIN ra_site_uses_all ras ON ads.address_id = ras.address_id
        WHERE ras.site_use_code = :SiteUseCode 
          AND ads.org_id = :OrgId 
          AND ra.customer_id = :CustomerId";

    /// <summary>
    /// Generates a dropdown list containing the next two chronological weeks formatted as 'YYYYIW', safely tracking Org and Customer contexts.
    /// </summary>
    public const string GetWeekDropdownList = @"
            SELECT TO_CHAR(SYSDATE + (LEVEL * 7), 'YYYYIW') AS future_weeks
            FROM DUAL
            CONNECT BY LEVEL <= 2";

    /// <summary>
    /// Retrieves targeted corporate operational unit profiles filtered by core organization identifiers.
    /// Maps to: /api/Allocation/operating-units
    /// </summary>
    public const string GetOperatingUnitDetails = @"
            SELECT ORGANIZATION_ID AS ""OrganizationId"", NAME AS ""Name"" 
            FROM hr_operating_units 
            WHERE ORGANIZATION_ID IN (103, 704, 844)
            ORDER BY ""Name"" ASC";

    /// <summary>
    /// Retrieves specific inventory organization definitions.
    /// </summary>
    public const string GetInventoryOrganizations = @"
            SELECT ORGANIZATION_ID AS ""OrganizationId"", ORGANIZATION_CODE AS ""OrganizationCode"" 
            FROM ORG_ORGANIZATION_DEFINITIONS 
            WHERE OPERATING_UNIT IN (103,704,844)
              AND ORGANIZATION_ID IN (904,924,110,111,304,384,524,464,444,504,484,505,644,804,1025,724)";

    /// <summary>
    /// Retrieves inventory item ID based on the Segment1 item code.
    /// </summary>
    public const string GetInventoryItemDetails = @"
        SELECT DISTINCT 
            INVENTORY_ITEM_ID AS ""InventoryItemId"", 
            SEGMENT1          AS ""ItemCode"", 
            DESCRIPTION       AS ""Description"" 
        FROM 
            MTL_SYSTEM_ITEMS 
        WHERE 
            UPPER(SEGMENT1) LIKE UPPER(:Search) 
            AND ORGANIZATION_ID = :OrgId";

    public const string GetDemandMetrics = @"
        SELECT 
            SUM(PEND_QTY) AS ""OaPendingQuantity"",   
            SUM(RSV_QTY) AS ""OaRsvQty"",
            SUM(PICKED_QTY) AS ""OaPickedQty"",
            nvl((SELECT ROQ FROM JAN_CUSTOMER_REPLENISHMENT_T WHERE END_DATE IS NULL AND CUSTOMER_ID = A.BILL_TO_CUST_ID AND ORGANIZATION_ID = A.SHIP_FROM_ORG_ID AND INVENTORY_ITEM_ID = A.INVENTORY_ITEM_ID), 0) AS ""BinQty"",
            nvl((SELECT SUM(RSV_QTY-ISSUED_QTY) FROM JAN_BRSV_TBR_V WHERE CUSTOMER_ID = A.BILL_TO_CUST_ID AND ORGANIZATION_ID = A.SHIP_FROM_ORG_ID AND INVENTORY_ITEM_ID = A.INVENTORY_ITEM_ID), 0) AS ""BinRsvQty""
        FROM JAN_OA_BIN_DEMAND_RSV_N A
        WHERE BILL_TO_CUST_ID = :CustomerId 
          AND SHIP_FROM_ORG_ID = :OrganizationId 
          AND ordered_date >= TO_DATE('01-apr-2021', 'dd-mon-yyyy') 
          AND INVENTORY_ITEM_ID = :InventoryItemId 
        GROUP BY BILL_TO_CUST_ID, INVENTORY_ITEM_ID, SHIP_FROM_ORG_ID";


    /// <summary>
    /// Retrieves the Sales RRS Category for a given Organization and Inventory Item.
    /// </summary>
    public const string GetSalesRrsCategory = @"
            SELECT JAN_SALES_RRS_CATEGORY(:OrganizationId, :InventoryItemId) AS ""RrsCategory"" 
            FROM DUAL";

    // --- BIN ALLOCATION DML QUERIES ---

    public const string InsertAllocationHeader = @"
        INSERT INTO JAN_B3_HEADER (
            HEADER_ID,
            TRANSACTION_DATE, 
            CUSTOMER_OR_ITEM_SPECIFIC, 
            CUSTOMER_ID, 
            TERRITORY_ID, 
            BILL_TO_CUSTOMER, 
            SHIP_TO_CUSTOMER, 
            REMARKS, 
            CREATED_BY, 
            CREATED_DATE
        )
        VALUES (
            JAN_B3_HEADERID_SEQ.NEXTVAL,
            SYSDATE, 
            :AllocationBasis, 
            :CustomerId, 
            :TerritoryId, 
            :BillToCustomerId, 
            :ShipToCustomerId, 
            :Remarks, 
            :CreatedBy, 
            SYSDATE
        )
        RETURNING HEADER_ID INTO :HeaderId";

    public const string InsertAllocationLine = @"
        INSERT INTO JAN_B3_LINES (
            HEADER_ID,
            LINE_ID,
            ORGANIZATION_ID,
            INVENTORY_ITEM_ID,
            B3_QUANTITY,
            TARGET_DATE,
            B3_APPROVED_QUANTITY,
            APPROVAL_FLAG
        )
        VALUES (
            :HeaderId,
            JAN_B3_LINESID_SEQ.NEXTVAL,
            :OrganizationId,
            :InventoryItemId,
            :RequestedQty,
            :TargetDate,
            0,
            'N'
        )";

    public const string UpdateAllocationLine = @"
        UPDATE JAN_B3_LINES 
        SET B3_QUANTITY = :RequestedQty, TARGET_DATE = :TargetDate, APPROVED_DATE = SYSDATE 
        WHERE LINE_ID = :LineId AND APPROVAL_FLAG = 'N'";

    public const string InsertApprovalRecord = @"
        INSERT INTO APPROVALS (ApprovalId, LineId, ApproverId, ApprovedQty, Decision, Remarks, ActionDate)
        VALUES (:APPROVAL_ID, :LINE_ID, :APPROVER_ID, :APPROVED_QTY, :DECISION, :REMARKS, SYSDATE)";

    public const string UpdateLineStatus = @"
        UPDATE JAN_B3_LINES 
        SET APPROVAL_FLAG = :STATUS, B3_APPROVED_QUANTITY = :APPROVED_QTY, APPROVED_DATE = SYSDATE 
        WHERE LINE_ID = :LINE_ID";

    public const string InsertCancellationRecord = @"
        INSERT INTO JAN_B3_CANCELLATION (
            CANCEL_ID,
            LINE_ID,
            CANCELLED_QTY,
            CANCEL_REASON,
            CREATED_BY,
            CANCELLED_DATE,
            CREATED_DATE
        )
        VALUES (
            JAN_B3_CANCELLATION_SEQ.NEXTVAL,
            :LineId,
            :CancelledQty,
            :Reason,
            :CancelledBy,
            SYSDATE,
            SYSDATE
        )";

    public const string RejectAllocationLine = @"
        UPDATE JAN_B3_LINES 
        SET APPROVAL_FLAG = 'R', APPROVED_DATE = SYSDATE 
        WHERE LINE_ID = :LINE_ID";

    public const string CountInventoryItems = @"
        SELECT COUNT(*) 
        FROM MTL_SYSTEM_ITEMS 
        WHERE (:SEARCH IS NULL OR UPPER(SEGMENT1) LIKE UPPER(:SEARCH))";

    public const string GetAllAllocationsGrouped = @"
        SELECT 
            h.BILL_TO_CUSTOMER AS BillToCustomerId,
            TRIM(cust_bill.customer_name) AS BillToCustomerName,
            h.SHIP_TO_CUSTOMER AS ShipToCustomerId,
            TRIM(cust_ship.customer_name) AS ShipToCustomerName,
            h.CUSTOMER_ID AS CustomerId,
            TRIM(cust_pri.customer_name) AS CustomerName,
            h.HEADER_ID AS HeaderId,
            TRIM(h.CUSTOMER_OR_ITEM_SPECIFIC) AS CustomerOrItemSpecific,
            h.TERRITORY_ID AS TerritoryId,
            TRIM(h.REMARKS) AS Remarks,
            TO_CHAR(h.TRANSACTION_DATE, 'YYYY-MM-DD') AS TransactionDate,
            TRIM(h.CREATED_BY) AS CreatedBy,
            TO_CHAR(h.CREATED_DATE, 'YYYY-MM-DD') AS CreatedDate,
            TRIM(h.UPDATED_BY) AS UpdatedBy,
            TO_CHAR(h.UPDATED_DATE, 'YYYY-MM-DD') AS UpdatedDate,
    
            l.LineId,
            l.ApprovalFlag,
            l.B3ApprovedQuantity,
            l.B3Quantity,
            l.OldRequestedQty, -- 💡 Newly added field: holds Line 1's quantity when viewing Line 2
            l.InventoryItemId,
            l.OrganizationId,
            l.OrganizationCode,
            l.ItemCode,
            l.ItemDescription,
            l.TargetDate,
            l.ClosureFlag,
            l.Revision,
            l.ParentLineId
        FROM JAN_B3_HEADER h
        LEFT JOIN (
            SELECT 
                LineId,
                HEADER_ID,
                ApprovalFlag,
                B3ApprovedQuantity,
                B3Quantity,
                OldRequestedQty,
                InventoryItemId,
                OrganizationId,
                OrganizationCode,
                ItemCode,
                ItemDescription,
                TargetDate,
                ClosureFlag,
                Revision,
                ParentLineId,
                ROW_NUMBER() OVER (
                    PARTITION BY HEADER_ID, RootLineId 
                    ORDER BY Revision DESC, LineId DESC
                ) AS rn
            FROM (
                SELECT 
                    lines.LINE_ID AS LineId,
                    lines.HEADER_ID,
                    TRIM(lines.APPROVAL_FLAG) AS ApprovalFlag,
                    lines.B3_APPROVED_QUANTITY AS B3ApprovedQuantity,
                    lines.B3_QUANTITY AS B3Quantity,
                    -- 💡 Looks back at the immediate parent revision record to fetch its quantity
                    LAG(lines.B3_QUANTITY, 1) OVER (
                        PARTITION BY lines.HEADER_ID, CONNECT_BY_ROOT lines.LINE_ID 
                        ORDER BY lines.REVISION ASC, lines.LINE_ID ASC
                    ) AS OldRequestedQty,
                    lines.INVENTORY_ITEM_ID AS InventoryItemId,
                    lines.ORGANIZATION_ID AS OrganizationId,
                    TRIM(org.ORGANIZATION_CODE) AS OrganizationCode,
                    TRIM(itm.SEGMENT1) AS ItemCode,
                    TRIM(itm.DESCRIPTION) AS ItemDescription,
                    TO_CHAR(lines.TARGET_DATE, 'YYYY-MM-DD') AS TargetDate,
                    TRIM(lines.CLOSURE_FLAG) AS ClosureFlag,
                    lines.REVISION AS Revision,
                    lines.PARENT_LINE_ID AS ParentLineId,
                    CONNECT_BY_ROOT lines.LINE_ID AS RootLineId
                FROM JAN_B3_LINES lines
                LEFT JOIN ORG_ORGANIZATION_DEFINITIONS org ON lines.ORGANIZATION_ID = org.ORGANIZATION_ID
                LEFT JOIN MTL_SYSTEM_ITEMS itm ON lines.INVENTORY_ITEM_ID = itm.INVENTORY_ITEM_ID 
                                              AND lines.ORGANIZATION_ID = itm.ORGANIZATION_ID
                START WITH lines.PARENT_LINE_ID IS NULL
                CONNECT BY PRIOR lines.LINE_ID = lines.PARENT_LINE_ID
            )
        ) l ON h.HEADER_ID = l.HEADER_ID AND l.rn = 1
        LEFT JOIN ra_customers cust_pri ON h.CUSTOMER_ID = cust_pri.customer_id
        LEFT JOIN ra_customers cust_bill ON h.BILL_TO_CUSTOMER = cust_bill.customer_id
        LEFT JOIN ra_customers cust_ship ON h.SHIP_TO_CUSTOMER = cust_ship.customer_id
        WHERE 
        -- 1. If the active user is an Admin, bypass restriction and show ALL records
        :currentUser IN ('JANHPL', 'HO')
    
        -- 2. If they are regular users, show only records where they match the creator
        OR h.CREATED_BY = :currentUser
        ";

    public const string GetAllAllocationsGroupedById = @"
        SELECT 
            h.BILL_TO_CUSTOMER AS BillToCustomerId,
            TRIM(cust_bill.customer_name) AS BillToCustomerName,
            h.SHIP_TO_CUSTOMER AS ShipToCustomerId,
            TRIM(cust_ship.customer_name) AS ShipToCustomerName,
            h.CUSTOMER_ID AS CustomerId,
            TRIM(cust_pri.customer_name) AS CustomerName,
            h.HEADER_ID AS HeaderId,
            TRIM(h.CUSTOMER_OR_ITEM_SPECIFIC) AS CustomerOrItemSpecific,
            h.TERRITORY_ID AS TerritoryId,
            TRIM(h.REMARKS) AS Remarks,
            TO_CHAR(h.TRANSACTION_DATE, 'YYYY-MM-DD') AS TransactionDate,
            TRIM(h.CREATED_BY) AS CreatedBy,
            TO_CHAR(h.CREATED_DATE, 'YYYY-MM-DD') AS CreatedDate,
            TRIM(h.UPDATED_BY) AS UpdatedBy,
            TO_CHAR(h.UPDATED_DATE, 'YYYY-MM-DD') AS UpdatedDate,
    
            l.LineId,
            l.ApprovalFlag,
            l.B3ApprovedQuantity,
            l.B3Quantity,
            l.OldRequestedQty, -- 💡 Newly added field: holds Line 1's quantity when viewing Line 2
            l.InventoryItemId,
            l.OrganizationId,
            l.OrganizationCode,
            l.ItemCode,
            l.ItemDescription,
            l.TargetDate,
            l.ClosureFlag,
            l.Revision,
            l.ParentLineId
        FROM JAN_B3_HEADER h
        LEFT JOIN (
            SELECT 
                LineId,
                HEADER_ID,
                ApprovalFlag,
                B3ApprovedQuantity,
                B3Quantity,
                OldRequestedQty,
                InventoryItemId,
                OrganizationId,
                OrganizationCode,
                ItemCode,
                ItemDescription,
                TargetDate,
                ClosureFlag,
                Revision,
                ParentLineId,
                ROW_NUMBER() OVER (
                    PARTITION BY HEADER_ID, RootLineId 
                    ORDER BY Revision DESC, LineId DESC
                ) AS rn
            FROM (
                SELECT 
                    lines.LINE_ID AS LineId,
                    lines.HEADER_ID,
                    TRIM(lines.APPROVAL_FLAG) AS ApprovalFlag,
                    lines.B3_APPROVED_QUANTITY AS B3ApprovedQuantity,
                    lines.B3_QUANTITY AS B3Quantity,
                    -- 💡 Looks back at the immediate parent revision record to fetch its quantity
                    LAG(lines.B3_QUANTITY, 1) OVER (
                        PARTITION BY lines.HEADER_ID, CONNECT_BY_ROOT lines.LINE_ID 
                        ORDER BY lines.REVISION ASC, lines.LINE_ID ASC
                    ) AS OldRequestedQty,
                    lines.INVENTORY_ITEM_ID AS InventoryItemId,
                    lines.ORGANIZATION_ID AS OrganizationId,
                    TRIM(org.ORGANIZATION_CODE) AS OrganizationCode,
                    TRIM(itm.SEGMENT1) AS ItemCode,
                    TRIM(itm.DESCRIPTION) AS ItemDescription,
                    TO_CHAR(lines.TARGET_DATE, 'YYYY-MM-DD') AS TargetDate,
                    TRIM(lines.CLOSURE_FLAG) AS ClosureFlag,
                    lines.REVISION AS Revision,
                    lines.PARENT_LINE_ID AS ParentLineId,
                    CONNECT_BY_ROOT lines.LINE_ID AS RootLineId
                FROM JAN_B3_LINES lines
                LEFT JOIN ORG_ORGANIZATION_DEFINITIONS org ON lines.ORGANIZATION_ID = org.ORGANIZATION_ID
                LEFT JOIN MTL_SYSTEM_ITEMS itm ON lines.INVENTORY_ITEM_ID = itm.INVENTORY_ITEM_ID 
                                              AND lines.ORGANIZATION_ID = itm.ORGANIZATION_ID
                START WITH lines.PARENT_LINE_ID IS NULL
                CONNECT BY PRIOR lines.LINE_ID = lines.PARENT_LINE_ID
            )
        ) l ON h.HEADER_ID = l.HEADER_ID AND l.rn = 1
        LEFT JOIN ra_customers cust_pri ON h.CUSTOMER_ID = cust_pri.customer_id
        LEFT JOIN ra_customers cust_bill ON h.BILL_TO_CUSTOMER = cust_bill.customer_id
        LEFT JOIN ra_customers cust_ship ON h.SHIP_TO_CUSTOMER = cust_ship.customer_id";

    public const string AmendAllocationLine = @"
            UPDATE JAN_B3_LINES 
            SET APPROVAL_FLAG = 'A', B3_QUANTITY = :NEW_QTY, APPROVED_DATE = SYSDATE 
            WHERE LINE_ID = :LINE_ID";

    /// <summary>
    /// Retrieves a specific operating unit profile by its Organization ID.
    /// </summary>
    public const string GetOperatingUnitById = @"
                SELECT ORGANIZATION_ID AS ""OrganizationId"", NAME AS ""Name"" 
                FROM hr_operating_units 
                WHERE ORGANIZATION_ID = :OrganizationId";

    /// <summary>
    /// Retrieves a specific inventory organization definition by its Organization ID.
    /// </summary>
    public const string GetInventoryOrganizationById = @"
                SELECT ORGANIZATION_ID AS ""OrganizationId"", ORGANIZATION_CODE AS ""OrganizationCode"" 
                FROM ORG_ORGANIZATION_DEFINITIONS 
                WHERE ORGANIZATION_ID = :OrganizationId";

    /// <summary>
    /// Retrieves full details for a specific inventory item using its unique Inventory Item ID.
    /// </summary>
    public const string GetInventoryItemById = @"
                SELECT DISTINCT INVENTORY_ITEM_ID AS ""InventoryItemId"", 
                       TRIM(REPLACE(SEGMENT1 AS ""ItemCode"")), 
                       TRIM(REPLACE(DESCRIPTION, '""', '')) AS ""Description""
                FROM MTL_SYSTEM_ITEMS
                WHERE INVENTORY_ITEM_ID = :InventoryItemId";

    /// <summary>
    /// Retrieves a customer's name and region details using their unique Customer ID.
    /// </summary>
    public const string GetCustomerNameById = @"
                SELECT DISTINCT customer_id AS CustomerId, customer_name AS CustomerName, REGION AS Region 
                FROM (
                    SELECT ra.customer_id, ra.customer_name,
                           (SELECT segment14 FROM ra_territories WHERE territory_id = ras.territory_id) AS REGION 
                    FROM ra_customers ra
                    JOIN ra_addresses_all ad ON ra.customer_id = ad.customer_id
                    JOIN ra_site_uses_all ras ON ad.address_id = ras.address_id
                    WHERE ras.site_use_code = 'BILL_TO'
                ) 
                WHERE customer_id = :CustomerId";

    public const string GetHeaderDetails =
    "SELECT * FROM jan_mrp_master_header";

    public const string GetLinesByHeaderId =
        "SELECT * FROM jan_mrp_master_lines WHERE MRP_HEADER_ID = :HeaderId";

    public const string GetCurrentOrgDetails = @"
        SELECT MRPL.CURRENT_ORG 
        FROM JAN_IT.jan_mrp_master_HEADER MRPH, JAN_IT.jan_mrp_master_lines MRPL  
        WHERE MRPH.MRP_HEADER_ID = MRPL.MRP_HEADER_ID 
          AND MRPH.MRP_RUN_STATUS = 1     
          AND MRPL.SEQUENCE_NO = (
              SELECT MIN(SEQUENCE_NO) 
              FROM JAN_IT.jan_mrp_master_LINES 
              WHERE COMPLETION_FLAG = 0   
                AND MRP_HEADER_ID = (
                    SELECT MRP_HEADER_ID 
                    FROM JAN_IT.jan_mrp_master_HEADER 
                    WHERE MRP_RUN_STATUS = 1
                )
          )";
}
