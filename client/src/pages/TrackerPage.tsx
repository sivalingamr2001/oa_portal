import type { TableColumnsType } from 'antd';
import { Button, Progress, Table, Tag } from 'antd';
import { Edit3 } from 'lucide-react';
import React, { useMemo, useState } from 'react';

// --- TYPES ---
export interface SalesOrderLine {
    SO_ID: number;
    B3_LINE_ID: number | null;
    SO_LINE_ID: number | null;
    SO_LINE_NO: number | null;
    ORDER_NUMBER: number | null;
    QUANTITY: number | null;
    ORDER_ENTERED_DATE: string | null;
    INVENTORY_ITEM_ID: number | null;
    ITEM_NO: string | null;
    ORG_ID: number | null;
    CUSTOMER_ID: number | null;
    CUSTOMER_NAME: string | null;
    CREATION_DATE: string;
}

export interface ProductionLine {
    LINE_ID: number;
    HEADER_ID: number;
    ORGANIZATION_ID: number | null;
    INVENTORY_ITEM_ID: number;
    B3_QUANTITY: number;
    TARGET_DATE: string | null;
    B3_APPROVED_QUANTITY: number | null;
    APPROVAL_FLAG: 'Y' | 'N';
    APPROVED_DATE: string | null;
    APPROVED_BY: string | null;
    CLOSURE_FLAG: 'Y' | 'N';
    REVISION: number | null;
    PARENT_LINE_ID: number | null;
    AMENDMENT_REASON: string | null;
    ITEM_NAME_DISPLAY?: string;
    REGION_DISPLAY?: string;
    ITEM_CODE?: string;
    allocatedSoQuantity?: number;
    salesOrderLines?: SalesOrderLine[];
}

// --- MOCK DATA ---
const mockProductionData: ProductionLine[] = [
    {
        LINE_ID: 501, HEADER_ID: 3001, ORGANIZATION_ID: 11, INVENTORY_ITEM_ID: 9001, B3_QUANTITY: 480,
        TARGET_DATE: '2026-12-01', B3_APPROVED_QUANTITY: 400, APPROVAL_FLAG: 'Y', APPROVED_DATE: '2026-11-01',
        APPROVED_BY: 'M_SMITH', CLOSURE_FLAG: 'N', REVISION: 1, PARENT_LINE_ID: null, AMENDMENT_REASON: 'Initial',
        ITEM_NAME_DISPLAY: 'PCB Assembly Rev3', REGION_DISPLAY: 'Maharashtra', ITEM_CODE: 'PCB-001',
        allocatedSoQuantity: 0, salesOrderLines: []
    },
    {
        LINE_ID: 502, HEADER_ID: 3001, ORGANIZATION_ID: 11, INVENTORY_ITEM_ID: 9001, B3_QUANTITY: 480,
        TARGET_DATE: '2026-12-01', B3_APPROVED_QUANTITY: 420, APPROVAL_FLAG: 'Y', APPROVED_DATE: '2026-11-10',
        APPROVED_BY: 'M_SMITH', CLOSURE_FLAG: 'N', REVISION: 2, PARENT_LINE_ID: 501, AMENDMENT_REASON: 'Update',
        ITEM_NAME_DISPLAY: 'PCB Assembly Rev3', REGION_DISPLAY: 'Maharashtra', ITEM_CODE: 'PCB-001',
        allocatedSoQuantity: 0, salesOrderLines: []
    },
    {
        LINE_ID: 503, HEADER_ID: 3001, ORGANIZATION_ID: 11, INVENTORY_ITEM_ID: 9001, B3_QUANTITY: 480,
        TARGET_DATE: '2026-12-01', B3_APPROVED_QUANTITY: 450, APPROVAL_FLAG: 'Y', APPROVED_DATE: '2026-11-20',
        APPROVED_BY: 'M_SMITH', CLOSURE_FLAG: 'N', REVISION: 3, PARENT_LINE_ID: 501, AMENDMENT_REASON: 'Final',
        ITEM_NAME_DISPLAY: 'PCB Assembly Rev3', REGION_DISPLAY: 'Maharashtra', ITEM_CODE: 'PCB-001',
        allocatedSoQuantity: 450,
        salesOrderLines: [
            { SO_ID: 1, B3_LINE_ID: 503, SO_LINE_ID: 201, SO_LINE_NO: 1, ORDER_NUMBER: 20260421, QUANTITY: 200, ORDER_ENTERED_DATE: '2026-11-10', INVENTORY_ITEM_ID: 9001, ITEM_NO: 'PCB-001', ORG_ID: 11, CUSTOMER_ID: 88, CUSTOMER_NAME: 'ABC Electronics Ltd', CREATION_DATE: '2026-11-10' },
            { SO_ID: 2, B3_LINE_ID: 503, SO_LINE_ID: 202, SO_LINE_NO: 2, ORDER_NUMBER: 20260438, QUANTITY: 150, ORDER_ENTERED_DATE: '2026-11-15', INVENTORY_ITEM_ID: 9001, ITEM_NO: 'PCB-001', ORG_ID: 11, CUSTOMER_ID: 88, CUSTOMER_NAME: 'ABC Electronics Ltd', CREATION_DATE: '2026-11-15' },
            { SO_ID: 3, B3_LINE_ID: 503, SO_LINE_ID: 203, SO_LINE_NO: 3, ORDER_NUMBER: 20260445, QUANTITY: 100, ORDER_ENTERED_DATE: '2026-11-18', INVENTORY_ITEM_ID: 9001, ITEM_NO: 'PCB-001', ORG_ID: 11, CUSTOMER_ID: 88, CUSTOMER_NAME: 'ABC Electronics Ltd', CREATION_DATE: '2026-11-18' }
        ]
    },
    {
        LINE_ID: 601, HEADER_ID: 3002, ORGANIZATION_ID: 11, INVENTORY_ITEM_ID: 9002, B3_QUANTITY: 10000,
        TARGET_DATE: '2026-12-05', B3_APPROVED_QUANTITY: 10000, APPROVAL_FLAG: 'Y', APPROVED_DATE: '2026-11-21',
        APPROVED_BY: 'J_DOE', CLOSURE_FLAG: 'Y', REVISION: 1, PARENT_LINE_ID: null, AMENDMENT_REASON: null,
        ITEM_NAME_DISPLAY: 'Resistor 10K Ω 1%', REGION_DISPLAY: 'Maharashtra', ITEM_CODE: 'RES-010K',
        allocatedSoQuantity: 0, salesOrderLines: []
    }
];

export default function FulfillmentTracker() {
    const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);

    // Process latest revision per group
    const latestProductionLines = useMemo(() => {
        const groups = new Map<number, ProductionLine[]>();
        mockProductionData.forEach(line => {
            const groupKey = line.PARENT_LINE_ID || line.LINE_ID;
            if (!groups.has(groupKey)) {
                groups.set(groupKey, []);
            }
            groups.get(groupKey)!.push(line);
        });

        return Array.from(groups.values()).map(group =>
            group.reduce((latest, current) => (current.REVISION || 0) > (latest.REVISION || 0) ? current : latest)
        );
    }, []);

    // Controlled expand/collapse
    const handleExpand = (expanded: boolean, record: ProductionLine) => {
        setExpandedRowKeys(prev =>
            expanded ? [...prev, record.LINE_ID] : prev.filter(key => key !== record.LINE_ID)
        );
    };

    // Main columns — properly typed
    const mainColumns: TableColumnsType<ProductionLine> = [
        {
            title: 'ITEM CODE',
            dataIndex: 'ITEM_CODE',
            key: 'itemCode',
            render: (code: string) => (
                <span style={{ color: '#2563eb', fontWeight: 500, cursor: 'pointer', fontSize: '12px' }}>
                    {code || 'N/A'}
                </span>
            ),
        },
        {
            title: 'ITEM NAME',
            dataIndex: 'ITEM_NAME_DISPLAY',
            key: 'itemName',
            render: (text: string) => <span style={{ fontWeight: 500, color: '#475569' }}>{text}</span>,
        },
        {
            title: 'CUSTOMER / CONTEXT',
            key: 'context',
            render: (_: unknown, record: ProductionLine) => (
                <span style={{ color: '#64748b' }}>
                    <strong style={{ color: '#334155' }}>ABC Electronics</strong> &bull; {record.REGION_DISPLAY || 'Global'}
                </span>
            ),
        },
        {
            title: 'QTY REQ',
            dataIndex: 'B3_QUANTITY',
            key: 'qtyReq',
            align: 'right',
            render: (val: number) => <strong style={{ color: '#334155' }}>{val?.toLocaleString()}</strong>,
        },
        {
            title: 'ALLOCATED',
            dataIndex: 'B3_APPROVED_QUANTITY',
            key: 'allocated',
            align: 'right',
            render: (val: number | null) => <strong style={{ color: '#334155' }}>{(val || 0).toLocaleString()}</strong>,
        },
        {
            title: 'FILL PROGRESS',
            key: 'progress',
            align: 'center',
            width: 150,
            render: (_: unknown, record: ProductionLine) => {
                const approvedQty = record.B3_APPROVED_QUANTITY || 0;
                const soAllocated = record.allocatedSoQuantity || 0;
                const pct = approvedQty > 0 ? Math.min(100, Math.round((soAllocated / approvedQty) * 100)) : 0;
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '8px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', width: '28px', textAlign: 'right' }}>{pct}%</span>
                        <Progress percent={pct} showInfo={false} strokeColor={pct === 100 ? '#10b981' : '#f59e0b'} size="small" style={{ margin: 0 }} />
                    </div>
                );
            },
        },
        {
            title: 'STATUS',
            key: 'status',
            align: 'center',
            render: (_: unknown, record: ProductionLine) => {
                const approved = record.B3_APPROVED_QUANTITY || 0;
                const soAllocated = record.allocatedSoQuantity || 0;
                if (soAllocated >= approved && approved > 0) return <Tag color="success" style={{ borderRadius: '12px' }}>Fulfilled</Tag>;
                if (soAllocated > 0) return <Tag color="warning" style={{ borderRadius: '12px' }}>Partial</Tag>;
                return <Tag color="default" style={{ borderRadius: '12px' }}>Open</Tag>;
            },
        },
        {
            title: 'ACTIONS',
            key: 'actions',
            align: 'center',
            render: () => (
                <Button size="small" icon={<Edit3 size={12} />} style={{ fontSize: '11px', color: '#475569' }}>
                    Edit
                </Button>
            ),
        },
    ];

    // Nested columns — properly typed
    const nestedColumns: TableColumnsType<SalesOrderLine> = [
        {
            title: 'DA NUMBER',
            dataIndex: 'ORDER_NUMBER',
            key: 'daNum',
            render: (num: number | null) => <span style={{ color: '#7c3aed', fontWeight: 500 }}>DA-2026-0{num}</span>,
        },
        { title: 'CUSTOMER ENTITY', dataIndex: 'CUSTOMER_NAME', key: 'custName' },
        {
            title: 'DA DATE',
            dataIndex: 'ORDER_ENTERED_DATE',
            key: 'daDate',
            render: (text: string | null) => <span style={{ color: '#94a3b8' }}>{text}</span>,
        },
        { title: 'DA QTY', dataIndex: 'QUANTITY', key: 'daQty', align: 'right' },
        {
            title: 'ALLOCATED',
            dataIndex: 'QUANTITY',
            key: 'childAlloc',
            align: 'right',
            render: (val: number | null) => <span style={{ color: '#10b981', fontWeight: 500 }}>{val}</span>,
        },
        {
            title: 'STATUS',
            key: 'childStatus',
            align: 'center',
            render: () => <Tag color="success" style={{ fontSize: '10px' }}>Fulfilled</Tag>,
        },
    ];

    return (
        <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif' }}>
            {/* Header */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                backgroundColor: '#ffffff', padding: '16px', border: '1px solid #e2e8f0',
                borderBottom: 'none', borderTopLeftRadius: '8px', borderTopRightRadius: '8px',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <h1 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#334155' }}>Fulfillment Tracker</h1>
                    <Tag color="default" style={{ margin: 0, borderRadius: '4px', color: '#64748b' }}>
                        {latestProductionLines.length} line(s)
                    </Tag>
                </div>
                <Button type="primary" size="small" style={{ backgroundColor: '#2563eb', fontSize: '12px', height: '30px' }}>
                    All Items
                </Button>
            </div>

            {/* Master Table */}
            <Table<ProductionLine>
                dataSource={latestProductionLines}
                rowKey="LINE_ID"
                pagination={false}
                bordered
                style={{ boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}
                rowClassName={(record) => expandedRowKeys.includes(record.LINE_ID) ? 'bg-blue-50/20' : ''}
                columns={mainColumns}
                expandable={{
                    expandedRowKeys,
                    onExpand: handleExpand,
                    rowExpandable: (record) => (record.salesOrderLines?.length ?? 0) > 0,
                    expandedRowRender: (record) => {
                        return (
                            <div style={{ padding: '16px 16px 16px 48px', backgroundColor: '#f8fafc', borderLeft: '4px solid #2563eb' }}>
                                <Table<SalesOrderLine>
                                    dataSource={record.salesOrderLines}
                                    rowKey="SO_ID"
                                    pagination={false}
                                    size="small"
                                    bordered
                                    columns={nestedColumns}
                                />
                            </div>
                        );
                    },
                }}
            />
        </div>
    );
}
