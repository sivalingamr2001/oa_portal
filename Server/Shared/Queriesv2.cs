namespace Backend.Shared
{
    /// <summary>
    /// Oracle SQL Queries for B3 Bin Allocation End-to-End Operations
    /// Tables: JAN_B3_HEADER, JAN_B3_LINES, JAN_B3_CANCELLATION, JAN_BE_VS_SO_TAB
    /// </summary>
    public static class QueriesV2
    {
        // ============================================================
        // 1. CREATE BIN ALLOCATION — Header + Multiple Line Items
        // ============================================================

        /// <summary>
        /// Step 1: Insert the Bin Allocation Header (one per allocation) with Custom Identifier Code
        /// </summary>
        public const string CreateBinAllocationHeader = @"
        INSERT INTO JAN_B3_HEADER (
            HEADER_ID,
            HEADER_CODE,
            TRANSACTION_DATE,
            CUSTOMER_OR_ITEM_SPECIFIC,
            CUSTOMER_ID,
            TERRITORY_ID,
            REGION,                       -- 💡 Column target exists
            BILL_TO_CUSTOMER,
            SHIP_TO_CUSTOMER,
            CREATED_BY,
            CREATED_DATE,
            UPDATED_BY,
            UPDATED_DATE,
            REMARKS
        ) VALUES (
            JAN_B3_HEADER_SEQ.NEXTVAL,
            :p_header_code,
            :p_transaction_date,
            :p_customer_or_item_specific,
            :p_customer_id,
            :p_territory_id,
            :p_region,                    -- 💡 FIX: Replaced stray ':' with the missing column parameter
            :p_bill_to_customer,
            :p_ship_to_customer,
            :p_created_by,
            SYSDATE,
            :p_created_by,
            SYSDATE,
            :p_remarks
        )
        RETURNING HEADER_ID INTO :p_header_id";

        public const string CreateBinAllocationLine = @"
        INSERT INTO JAN_B3_LINES (
            LINE_ID,
            HEADER_ID,
            ORGANIZATION_ID,
            INVENTORY_ITEM_ID,
            B3_QUANTITY,
            TARGET_DATE
        ) VALUES (
            JAN_B3_LINES_SEQ.NEXTVAL,
            :p_header_id,
            :p_organization_id,
            :p_inventory_item_id,
            :p_b3_quantity,
            :p_target_date
        )
        RETURNING LINE_ID INTO :p_line_id";

        // ============================================================
        // 2. GET ALL ALLOCATIONS (Header + Lines joined)
        // ============================================================

        /// <summary>
        /// Fetch all bin allocations with header and line details.
        /// </summary>
        public const string GetAllAllocations = @"
             SELECT
                h.*,
                l.*,
                c.*
                FROM
                JAN_B3_HEADER h
                JOIN JAN_B3_LINES l ON l.HEADER_ID = h.HEADER_ID
                LEFT JOIN JAN_B3_CANCELLATION c ON c.LINE_ID = l.LINE_ID
                WHERE 
                -- 1. If the active user is an Admin, bypass restriction and show ALL records
                :currentUser IN ('JANHPL', 'HO')
    
                -- 2. If they are regular users, show only records where they match the creator
                OR h.CREATED_BY = :currentUser
                ORDER BY
                h.HEADER_ID, 
                l.LINE_ID";

        /// <summary>
        /// Retrieves a specific operating unit profile by its Organization ID.
        /// </summary>
        public const string GetOperatingUnitById = @"
            SELECT NAME AS ""Name"" 
            FROM hr_operating_units 
            WHERE ORGANIZATION_ID = :OrganizationId";

        /// <summary>
        /// Retrieves a specific inventory organization definition by its Organization ID.
        /// </summary>
        public const string GetInventoryOrganizationById = @"
            SELECT ORGANIZATION_CODE AS ""OrganizationCode"" 
            FROM ORG_ORGANIZATION_DEFINITIONS 
            WHERE ORGANIZATION_ID = :OrganizationId";

        /// <summary>
        /// Retrieves full details for a specific inventory item using its unique Inventory Item ID.
        /// </summary>
        public const string GetInventoryItemById = @"
            SELECT DISTINCT
                   TRIM(REPLACE(SEGMENT1, '""', ''))  AS ""ItemCode"", 
                   TRIM(REPLACE(DESCRIPTION, '""', '')) AS ""Description""
            FROM MTL_SYSTEM_ITEMS
            WHERE INVENTORY_ITEM_ID = :InventoryItemId";

        /// <summary>
        /// Retrieves a customer's name and region details using their unique Customer ID.
        /// </summary>
        public const string GetCustomerNameById = @"
            SELECT DISTINCT customer_name AS CustomerName, REGION AS Region 
            FROM (
                SELECT ra.customer_id, ra.customer_name,
                       (SELECT segment14 FROM ra_territories WHERE territory_id = ras.territory_id) AS REGION 
                FROM ra_customers ra
                JOIN ra_addresses_all ad ON ra.customer_id = ad.customer_id
                JOIN ra_site_uses_all ras ON ad.address_id = ras.address_id
                WHERE ras.site_use_code = 'BILL_TO'
            ) 
            WHERE customer_id = :CustomerId";

        /// <summary>
        /// Fetch a single allocation by Header ID.
        /// </summary>
        public const string GetAllocationByHeaderId = @"
            SELECT
                h.HEADER_ID,
                h.TRANSACTION_DATE,
                h.CUSTOMER_OR_ITEM_SPECIFIC,
                h.CUSTOMER_ID,
                h.TERRITORY_ID,
                h.BILL_TO_CUSTOMER,
                h.SHIP_TO_CUSTOMER,
                h.REMARKS,
                h.CREATED_BY,
                h.CREATED_DATE,
                h.UPDATED_BY,
                h.UPDATED_DATE,
                l.LINE_ID,
                l.ORGANIZATION_ID,
                l.INVENTORY_ITEM_ID,
                l.B3_QUANTITY,
                l.TARGET_DATE,
                l.B3_APPROVED_QUANTITY,
                l.APPROVAL_FLAG,
                l.APPROVED_DATE,
                l.APPROVED_BY,
                l.CLOSURE_FLAG
            FROM
                JAN_B3_HEADER  h
                JOIN JAN_B3_LINES l ON l.HEADER_ID = h.HEADER_ID
            WHERE
                h.HEADER_ID = :p_header_id
            ORDER BY
                l.LINE_ID";


        // ============================================================
        // 3. USER ROLE — UPDATE REQUESTED QUANTITY (New Revision Row)
        //    Business Rule: DO NOT update existing row.
        //    Insert a NEW line with incremented REVISION column.
        // ============================================================

        /// <summary>
        /// Insert a new revision row for a line item when the user
        /// updates their requested quantity. The original LINE_ID is
        /// kept as PARENT_LINE_ID for traceability.
        ///
        /// NOTE: Add REVISION NUMBER and PARENT_LINE_ID NUMBER columns
        /// to JAN_B3_LINES to support this pattern.
        /// </summary>
        public const string CreateQuantityRevision = @"
            DECLARE
                v_new_line_id NUMBER;
            BEGIN
                -- 1. Fetch sequence allocation value beforehand
                SELECT JAN_B3_LINES_SEQ.NEXTVAL INTO v_new_line_id FROM DUAL;

                -- 2. Execute target transaction block matching your exact column specifications
                INSERT INTO JAN_B3_LINES (
                    LINE_ID,
                    HEADER_ID,
                    ORGANIZATION_ID,
                    INVENTORY_ITEM_ID,
                    B3_QUANTITY,
                    TARGET_DATE,
                    B3_APPROVED_QUANTITY,
                    APPROVAL_FLAG,
                    APPROVED_DATE,
                    APPROVED_BY,
                    CLOSURE_FLAG,
                    REVISION,
                    PARENT_LINE_ID,
                    AMENDMENT_REASON
                )
                SELECT
                    v_new_line_id,             -- Generated ID
                    HEADER_ID,
                    ORGANIZATION_ID,
                    INVENTORY_ITEM_ID,
                    :p_new_b3_quantity,        -- User's new quantity request
                    TARGET_DATE,
                    NULL,                      -- Reset approval quantities
                    'N',                       -- Re-pending status
                    NULL,
                    NULL,
                    'N',
                    NVL(REVISION, 0) + 1,      -- Track version revisions
                    LINE_ID,                   -- Self-referencing link trace
                    :p_amendment_reason        -- Target dropdown selection text
                FROM
                    JAN_B3_LINES
                WHERE
                    LINE_ID = :p_original_line_id;

                -- 3. Return the runtime structural context out to Dapper safely
                :p_line_id := v_new_line_id;
            END;";

        /// <summary>
        /// Get the full revision history for a given original line.
        /// </summary>
        public const string GetLineRevisionHistory = @"
            SELECT
                LINE_ID,
                HEADER_ID,
                INVENTORY_ITEM_ID,
                B3_QUANTITY,
                B3_APPROVED_QUANTITY,
                APPROVAL_FLAG,
                APPROVED_DATE,
                APPROVED_BY,
                REVISION,
                PARENT_LINE_ID
            FROM
                JAN_B3_LINES
            WHERE
                LINE_ID            = :p_original_line_id
                OR PARENT_LINE_ID  = :p_original_line_id
            ORDER BY
                NVL(REVISION, 0) ASC";


        // ============================================================
        // 4. HOD APPROVED — Approve a Line Item (set quantity & flag)
        // ============================================================

        /// <summary>
        /// HOD approves a bin allocation line, setting approved
        /// quantity, approval flag, date, and approver name.
        /// </summary>
        public const string HodApproveAllocationLine = @"
            UPDATE JAN_B3_LINES
            SET
                B3_APPROVED_QUANTITY = :p_approved_quantity,
                APPROVAL_FLAG        = 'Y',
                APPROVED_DATE        = SYSDATE,
                APPROVED_BY          = :p_approved_by
            WHERE
                LINE_ID = :p_line_id
                AND APPROVAL_FLAG = 'N'   -- Only pending lines can be approved
                AND CLOSURE_FLAG  = 'N'   -- Only open lines";

        /// <summary>
        /// Fetch all lines pending HOD approval.
        /// </summary>
        public const string GetPendingApprovalLines = @"
            SELECT
                l.LINE_ID,
                l.HEADER_ID,
                h.TRANSACTION_DATE,
                h.CUSTOMER_ID,
                h.TERRITORY_ID,
                l.ORGANIZATION_ID,
                l.INVENTORY_ITEM_ID,
                l.B3_QUANTITY,
                l.TARGET_DATE,
                l.REVISION
            FROM
                JAN_B3_LINES   l
                JOIN JAN_B3_HEADER h ON h.HEADER_ID = l.HEADER_ID
            WHERE
                l.APPROVAL_FLAG = 'N'
                AND l.CLOSURE_FLAG = 'N'
            ORDER BY
                h.TRANSACTION_DATE, l.LINE_ID";


        // ============================================================
        // 5. AMEND APPROVED QUANTITY (HOD amendments post-approval)
        // ============================================================

        /// <summary>
        /// HOD or authorized user amends (changes) the approved
        /// quantity of an already-approved line.
        /// </summary>
        public const string AmendApprovedQuantity = @"
            UPDATE JAN_B3_LINES
            SET
                B3_APPROVED_QUANTITY = :p_amended_quantity,
                APPROVED_DATE        = SYSDATE,
                APPROVED_BY          = :p_amended_by
            WHERE
                LINE_ID       = :p_line_id
                AND APPROVAL_FLAG = 'Y'   -- Only approved lines can be amended
                AND CLOSURE_FLAG  = 'N'   -- Only open lines";

        public const string InsertAmendedLineItem = @"
            INSERT INTO JAN_B3_LINES (
                LINE_ID,
                ORGANIZATION_ID,
                INVENTORY_ITEM_ID,
                B3_QUANTITY,
                TARGET_DATE,
                B3_APPROVED_QUANTITY,
                APPROVAL_FLAG,
                CLOSURE_FLAG,
                REVISION,
                PARENT_LINE_ID,
                HEADER_ID,
                AMENDMENT_REASON
            )
            SELECT 
                JAN_B3_LINES_SEQ.NEXTVAL, -- Assumes a standard database sequence exists
                ORGANIZATION_ID,
                INVENTORY_ITEM_ID,
                :p_b3_quantity,           -- Passed from request payload
                TARGET_DATE,
                :p_b3_approved_quantity,  -- Passed from request payload
                'A',                      -- Auto-approved flag state
                'N',                      -- Default open closure state
                :p_revision,              -- Passed from request payload
                :p_parent_line_id,        -- The original line ID becomes parent
                HEADER_ID,
                :p_reason
            FROM JAN_B3_LINES
            WHERE LINE_ID = :p_parent_line_id";

        // ============================================================
        // 6. CANCEL ALLOCATION LINE
        // ============================================================

        /// <summary>
        /// Cancel a specific line item.
        /// Inserts a cancellation record and marks the line as closed.
        /// Run both in a single transaction.
        /// </summary>
        public const string InsertCancellationRecord = @"
            INSERT INTO JAN_B3_CANCELLATION (
                CANCEL_ID,
                LINE_ID,
                CANCELLED_QTY,
                CANCELLED_DATE,
                CANCEL_REASON,
                CREATED_BY,
                CREATED_DATE
            ) VALUES (
                JAN_B3_CANCELLATION_SEQ.NEXTVAL,
                :p_line_id,
                :p_cancelled_qty,
                SYSDATE,
                :p_cancel_reason,
                :p_created_by,
                SYSDATE
            )";

        /// <summary>
        /// Mark the bin allocation line as closed after cancellation.
        /// </summary>
        public const string CloseCancelledLine = @"
            UPDATE JAN_B3_LINES
            SET
                CLOSURE_FLAG = 'Y'
            WHERE
                LINE_ID = :p_line_id
                AND CLOSURE_FLAG = 'N'";

        /// <summary>
        /// Cancel ALL lines under a header (full allocation cancel).
        /// Then close the header via a separate update if needed.
        /// </summary>
        public const string InsertCancellationForAllLines = @"
            INSERT INTO JAN_B3_CANCELLATION (
                CANCEL_ID,
                LINE_ID,
                CANCELLED_QTY,
                CANCELLED_DATE,
                CANCEL_REASON,
                CREATED_BY,
                CREATED_DATE
            )
            SELECT
                JAN_B3_CANCELLATION_SEQ.NEXTVAL,
                l.LINE_ID,
                l.B3_QUANTITY,
                SYSDATE,
                :p_cancel_reason,
                :p_created_by,
                SYSDATE
            FROM
                JAN_B3_LINES l
            WHERE
                l.HEADER_ID    = :p_header_id
                AND l.CLOSURE_FLAG = 'N'";

        public const string CloseAllLinesForHeader = @"
            UPDATE JAN_B3_LINES
            SET
                CLOSURE_FLAG = 'Y'
            WHERE
                HEADER_ID    = :p_header_id
                AND CLOSURE_FLAG = 'N'";


        // ============================================================
        // 7. GET CANCELLATION RECORDS
        // ============================================================

        /// <summary>
        /// Fetch all cancellation records with line and header context.
        /// </summary>
        public const string GetAllCancellations = @"
            SELECT
                c.CANCEL_ID,
                c.LINE_ID,
                c.CANCELLED_QTY,
                c.CANCELLED_DATE,
                c.CANCEL_REASON,
                c.CREATED_BY,
                c.CREATED_DATE,
                l.HEADER_ID,
                l.INVENTORY_ITEM_ID,
                l.ORGANIZATION_ID,
                l.B3_QUANTITY          AS ORIGINAL_QUANTITY,
                l.B3_APPROVED_QUANTITY AS APPROVED_QUANTITY,
                h.CUSTOMER_ID,
                h.TRANSACTION_DATE
            FROM
                JAN_B3_CANCELLATION c
                JOIN JAN_B3_LINES   l ON l.LINE_ID    = c.LINE_ID
                JOIN JAN_B3_HEADER  h ON h.HEADER_ID  = l.HEADER_ID
            ORDER BY
                c.CANCELLED_DATE DESC";

        public const string GetCancellationByLineId = @"
            SELECT
                c.CANCEL_ID            AS ""CancelId"",
                c.LINE_ID              AS ""LineId"",
                c.CANCELLED_QTY        AS ""CancelledQty"",
                c.CANCELLED_DATE       AS ""CancelledDate"",
                c.CANCEL_REASON        AS ""CancelReason"",
                c.CREATED_BY           AS ""CreatedBy"",
                c.CREATED_DATE         AS ""CreatedDate"",
                l.HEADER_ID            AS ""HeaderId"",
                l.INVENTORY_ITEM_ID    AS ""InventoryItemId"",
                l.ORGANIZATION_ID      AS ""OrganizationId"",
                l.B3_QUANTITY          AS ""OriginalQuantity"",
                l.B3_APPROVED_QUANTITY AS ""ApprovedQuantity"",
                h.CUSTOMER_ID          AS ""CustomerId"",
                h.TRANSACTION_DATE     AS ""TransactionDate""
            FROM
                JAN_B3_CANCELLATION c
                JOIN JAN_B3_LINES   l ON l.LINE_ID   = c.LINE_ID
                JOIN JAN_B3_HEADER  h ON h.HEADER_ID = l.HEADER_ID
            WHERE 
                c.LINE_ID = :LineId";


        // ============================================================
        // 8. BE vs SO RECONCILIATION — JAN_BE_VS_SO_TAB
        // ============================================================

        /// <summary>
        /// Fetch BE vs SO reconciliation data joined with line details.
        /// </summary>
        public const string GetBeVsSoReconciliation = @"
            SELECT
                s.LINE_ID,
                s.SO_LINE_ID,
                s.SO_LINE_NO,
                s.QUANTITY          AS SO_QUANTITY,
                s.ORDER_ENTERED_DATE,
                l.B3_QUANTITY       AS BE_QUANTITY,
                l.B3_APPROVED_QUANTITY,
                l.APPROVAL_FLAG,
                l.CLOSURE_FLAG,
                h.CUSTOMER_ID,
                h.TERRITORY_ID,
                h.TRANSACTION_DATE
            FROM
                JAN_BE_VS_SO_TAB s
                JOIN JAN_B3_LINES   l ON l.LINE_ID    = s.LINE_ID
                JOIN JAN_B3_HEADER  h ON h.HEADER_ID  = l.HEADER_ID
            ORDER BY
                s.SO_LINE_ID";


        // ============================================================
        // 9. DASHBOARD / SUMMARY QUERIES
        // ============================================================

        /// <summary>
        /// Summary of all allocations: total, approved, pending, cancelled.
        /// </summary>
        public const string GetAllocationSummary = @"
            SELECT
                h.HEADER_ID,
                h.TRANSACTION_DATE,
                h.CUSTOMER_ID,
                COUNT(l.LINE_ID)                                    AS TOTAL_LINES,
                SUM(l.B3_QUANTITY)                                  AS TOTAL_REQUESTED_QTY,
                SUM(l.B3_APPROVED_QUANTITY)                         AS TOTAL_APPROVED_QTY,
                SUM(CASE WHEN l.APPROVAL_FLAG = 'Y' THEN 1 ELSE 0 END) AS APPROVED_LINES,
                SUM(CASE WHEN l.APPROVAL_FLAG = 'N' THEN 1 ELSE 0 END) AS PENDING_LINES,
                SUM(CASE WHEN l.CLOSURE_FLAG  = 'Y' THEN 1 ELSE 0 END) AS CANCELLED_LINES
            FROM
                JAN_B3_HEADER h
                JOIN JAN_B3_LINES l ON l.HEADER_ID = h.HEADER_ID
            WHERE 
            :currentUser IN ('JANHPL', 'HO')

            OR h.CREATED_BY = :currentUser
            GROUP BY
                h.HEADER_ID, h.TRANSACTION_DATE, h.CUSTOMER_ID
            ORDER BY
                h.TRANSACTION_DATE DESC";
    }
}
