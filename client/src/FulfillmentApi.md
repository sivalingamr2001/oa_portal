# Fulfillment Tracker API Documentation

This document outlines the backend implementation for fetching data required by the `FulfillmentTracker` page. It details the C# models, the service layer that queries the database, and the API controller that exposes the data to the frontend.

## 1. C# Data Models (DTOs)

These C# classes mirror the TypeScript interfaces in `TrackerPage.tsx`. They are used by Dapper to map the results from the SQL query.

### `ProductionLineDto.cs`

This class represents a single B3 line item, including its associated sales order lines.

```csharp
// From JAN_B3_HEADER and JAN_B3_LINES
public class ProductionLineDto
{
    // Header Information
    public int HeaderId { get; set; }
    public string? CustomerName { get; set; }
    public string? Remarks { get; set; }
    public string? TransactionDate { get; set; }
    public string? CreatedBy { get; set; }

    // Line Information
    public int LineId { get; set; }
    public string? ApprovalFlag { get; set; }
    public int? B3ApprovedQuantity { get; set; }
    public int B3Quantity { get; set; }
    public int? OldRequestedQty { get; set; }
    public int InventoryItemId { get; set; }
    public int OrganizationId { get; set; }
    public string? OrganizationCode { get; set; }
    public string? ItemCode { get; set; }
    public string? ItemDescription { get; set; }
    public string? TargetDate { get; set; }
    public string? ClosureFlag { get; set; }
    public int? Revision { get; set; }
    public int? ParentLineId { get; set; }
    public int? AllocatedSoQuantity { get; set; }

    // This will be populated by the service layer
    public List<SalesOrderLineDto> SalesOrderLines { get; set; } = new List<SalesOrderLineDto>();
}
```

### `SalesOrderLineDto.cs`

This class represents a single sales order line linked to a B3 line.

```csharp
// From JAN_BE_VS_SO_TAB
public class SalesOrderLineDto
{
    public int SoId { get; set; }
    public int B3LineId { get; set; }
    public int? SoLineId { get; set; }
    public int? SoLineNo { get; set; }
    public long? OrderNumber { get; set; }
    public int? Quantity { get; set; }
    public string? OrderEnteredDate { get; set; }
    public int? InventoryItemId { get; set; }
    public string? ItemNo { get; set; }
    public int? OrgId { get; set; }
    public int? CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public string? CreationDate { get; set; }
}
```

## 2. Service Layer

The service layer contains the business logic to fetch and structure the data.

### `IFulfillmentService.cs` (Interface)

This defines the contract for our fulfillment service.

```csharp
using System.Collections.Generic;
using System.Threading.Tasks;

public interface IFulfillmentService
{
    /// <summary>
    /// Fetches the latest revision of each B3 production line, aggregates
    /// the allocated sales order quantities, and nests the detailed
    /// sales order lines for the fulfillment tracker.
    /// </summary>
    /// <returns>A list of ProductionLineDto objects.</returns>
    Task<IEnumerable<ProductionLineDto>> GetFulfillmentDataAsync();
}
```

### `FulfillmentService.cs` (Implementation)

This class implements the interface. It runs two queries: one to get the main B3 lines and another to get all related sales order lines. It then efficiently maps the sales orders to their parent B3 lines in memory.

```csharp
using Dapper;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

public class FulfillmentService : IFulfillmentService
{
    private readonly IDynamicQueryExecutor _db;

    public FulfillmentService(IDynamicQueryExecutor db)
    {
        _db = db;
    }

    public async Task<IEnumerable<ProductionLineDto>> GetFulfillmentDataAsync()
    {
        // --- Step 1: Fetch all latest B3 production lines ---
        // This query is from your FullfilmentTracker.txt file.
        // It gets the latest revision of each line and the total allocated SO quantity.
        var productionLines = (await _db.QueryAsync<ProductionLineDto>(GetB3LinesQuery())).ToList();

        if (!productionLines.Any())
        {
            return new List<ProductionLineDto>();
        }

        // --- Step 2: Get all relevant Sales Order lines in a single query ---
        var b3LineIds = productionLines.Select(p => p.LineId).Distinct().ToArray();
        
        var salesOrderLines = await _db.QueryAsync<SalesOrderLineDto>(
            GetSalesOrderLinesQuery(), 
            new { B3LineIds = b3LineIds }
        );

        // --- Step 3: Group Sales Order lines by B3_LINE_ID for efficient mapping ---
        var soLinesByB3LineId = salesOrderLines.GroupBy(so => so.B3LineId)
                                               .ToDictionary(g => g.Key, g => g.ToList());

        // --- Step 4: Map the nested sales orders to their parent production lines ---
        foreach (var line in productionLines)
        {
            if (soLinesByB3LineId.TryGetValue(line.LineId, out var nestedLines))
            {
                line.SalesOrderLines = nestedLines;
            }
        }

        return productionLines;
    }

    private string GetB3LinesQuery()
    {
        // The full SQL query from FullfilmentTracker.txt goes here.
        // This query should return all columns needed for ProductionLineDto.
        return @"
            SELECT 
                h.HEADER_ID AS HeaderId,
                TRIM(cust_pri.customer_name) AS CustomerName,
                TRIM(h.REMARKS) AS Remarks,
                TO_CHAR(h.TRANSACTION_DATE, 'YYYY-MM-DD') AS TransactionDate,
                TRIM(h.CREATED_BY) AS CreatedBy,
                l.LineId,
                l.ApprovalFlag,
                l.B3ApprovedQuantity,
                l.B3Quantity,
                l.OldRequestedQty, 
                l.InventoryItemId,
                l.OrganizationId,
                l.OrganizationCode,
                l.ItemCode,
                l.ItemDescription,
                l.TargetDate,
                l.ClosureFlag,
                l.Revision,
                l.ParentLineId,
                l.AllocatedSoQuantity
            FROM JAN_B3_HEADER h
            LEFT JOIN (
                SELECT 
                    d.LineId, d.HEADER_ID, d.ApprovalFlag, d.B3ApprovedQuantity, d.B3Quantity,
                    d.OldRequestedQty, d.InventoryItemId, d.OrganizationId, d.OrganizationCode,
                    d.ItemCode, d.ItemDescription, d.TargetDate, d.ClosureFlag, d.Revision,
                    d.ParentLineId, so_agg.AllocatedSoQuantity,
                    ROW_NUMBER() OVER (
                        PARTITION BY d.HEADER_ID, d.RootLineId 
                        ORDER BY d.Revision DESC, d.LineId DESC
                    ) AS rn
                FROM (
                    SELECT 
                        lines.LINE_ID AS LineId, lines.HEADER_ID, TRIM(lines.APPROVAL_FLAG) AS ApprovalFlag,
                        lines.B3_APPROVED_QUANTITY AS B3ApprovedQuantity, lines.B3_QUANTITY AS B3Quantity,
                        LAG(lines.B3_QUANTITY, 1) OVER (
                            PARTITION BY lines.HEADER_ID, CONNECT_BY_ROOT lines.LINE_ID 
                            ORDER BY lines.REVISION ASC, lines.LINE_ID ASC
                        ) AS OldRequestedQty,
                        lines.INVENTORY_ITEM_ID AS InventoryItemId, lines.ORGANIZATION_ID AS OrganizationId,
                        TRIM(org.ORGANIZATION_CODE) AS OrganizationCode, TRIM(itm.SEGMENT1) AS ItemCode, 
                        TRIM(itm.DESCRIPTION) AS ItemDescription, TO_CHAR(lines.TARGET_DATE, 'YYYY-MM-DD') AS TargetDate,
                        TRIM(lines.CLOSURE_FLAG) AS ClosureFlag, lines.REVISION AS Revision,
                        lines.PARENT_LINE_ID AS ParentLineId, CONNECT_BY_ROOT lines.LINE_ID AS RootLineId
                    FROM JAN_B3_LINES lines
                    LEFT JOIN ORG_ORGANIZATION_DEFINITIONS org ON lines.ORGANIZATION_ID = org.ORGANIZATION_ID
                    LEFT JOIN MTL_SYSTEM_ITEMS itm ON lines.INVENTORY_ITEM_ID = itm.INVENTORY_ITEM_ID 
                                                  AND lines.ORGANIZATION_ID = itm.ORGANIZATION_ID
                    START WITH lines.PARENT_LINE_ID IS NULL
                    CONNECT BY PRIOR lines.LINE_ID = lines.PARENT_LINE_ID
                ) d
                LEFT JOIN (
                    SELECT B3_LINE_ID, SUM(QUANTITY) AS AllocatedSoQuantity
                    FROM JAN_BE_VS_SO_TAB
                    GROUP BY B3_LINE_ID
                ) so_agg ON so_agg.B3_LINE_ID = d.LineId
            ) l ON h.HEADER_ID = l.HEADER_ID AND l.rn = 1
            LEFT JOIN ra_customers cust_pri ON h.CUSTOMER_ID = cust_pri.customer_id
            WHERE l.LineId IS NOT NULL
        ";
    }

    private string GetSalesOrderLinesQuery()
    {
        // This query fetches all sales order lines for the given B3 Line IDs.
        // Dapper will handle mapping the :B3LineIds parameter.
        return @"
            SELECT
                SO_ID AS SoId,
                B3_LINE_ID AS B3LineId,
                SO_LINE_ID AS SoLineId,
                SO_LINE_NO AS SoLineNo,
                ORDER_NUMBER AS OrderNumber,
                QUANTITY AS Quantity,
                TO_CHAR(ORDER_ENTERED_DATE, 'YYYY-MM-DD') AS OrderEnteredDate,
                INVENTORY_ITEM_ID AS InventoryItemId,
                ITEM_NO AS ItemNo,
                ORG_ID AS OrgId,
                CUSTOMER_ID AS CustomerId,
                TRIM(CUSTOMER_NAME) AS CustomerName,
                TO_CHAR(CREATION_DATE, 'YYYY-MM-DD') AS CreationDate
            FROM JAN_BE_VS_SO_TAB
            WHERE B3_LINE_ID IN :B3LineIds
        ";
    }
}
```

## 3. API Controller

This ASP.NET Core controller exposes the service logic via a GET endpoint.

### `FulfillmentController.cs`

```csharp
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;

[ApiController]
[Route("api/[controller]")]
public class FulfillmentController : ControllerBase
{
    private readonly IFulfillmentService _fulfillmentService;

    public FulfillmentController(IFulfillmentService fulfillmentService)
    {
        _fulfillmentService = fulfillmentService;
    }

    /// <summary>
    /// Gets all data required for the fulfillment tracker page.
    /// </summary>
    [HttpGet("tracker")]
    [ProducesResponseType(typeof(IEnumerable<ProductionLineDto>), 200)]
    public async Task<IActionResult> GetFulfillmentData()
    {
        var data = await _fulfillmentService.GetFulfillmentDataAsync();
        return Ok(data);
    }
}
```

This structure provides a clean, efficient, and maintainable way to deliver the required data from your Oracle database to the React frontend.