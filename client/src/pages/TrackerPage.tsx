import { Badge, Progress, Tag, Select, Space, Button, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useEffect, useMemo, useState } from 'react';
import type { AllocationFulfillment, SalesOrderLine } from '../api/allocationApi';
import { getAllocationFulfillments } from '../api/allocationApi';
import { DynamicGrid } from '../components/DynamicGrid';
import { BoxesIcon, X } from 'lucide-react';
import Title from 'antd/es/typography/Title';

// --- COMPONENT ---
export default function FulfillmentTracker({ currentUser }: { currentUser: string }) {
    const [data, setData] = useState<AllocationFulfillment[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);

    // Filter state
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [orgFilter, setOrgFilter] = useState<string | null>(null);
    const [approvalFilter, setApprovalFilter] = useState<string | null>(null);

    useEffect(() => {
        if (!currentUser) return;
        let cancelled = false;

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const result = await getAllocationFulfillments(currentUser);
                console.log('Fetched fulfillment data:', result);
                if (!cancelled) setData(result);
            } catch (err) {
                console.error('Error fetching data:', err);
                if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load data');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchData();
        return () => { cancelled = true; };
    }, [currentUser]);

    const handleExpand = (expanded: boolean, record: AllocationFulfillment) => {
        console.log(`Expand clicked for lineId ${record.lineId}:`, expanded, record.salesOrderLines);
        setExpandedRowKeys(prev =>
            expanded
                ? [...prev, record.lineId]
                : prev.filter(key => key !== record.lineId)
        );
    };

    // Get unique organizations for filter
    const orgOptions = useMemo(() => {
        const orgs = new Set(data.map(d => d.organizationCode).filter(Boolean));
        return Array.from(orgs).map(org => ({ label: org, value: org }));
    }, [data]);

    // Filter data based on selected filters
    const filteredData = useMemo(() => {
        return data.filter(record => {
            // Status filter
            if (statusFilter) {
                const approved = record.b3ApprovedQuantity || 0;
                const soAllocated = record.allocatedSoQuantity || 0;
                const status =
                    soAllocated >= approved && approved > 0 ? 'fulfilled' :
                        soAllocated > 0 ? 'partial' : 'open';
                if (status !== statusFilter) return false;
            }

            // Organization filter
            if (orgFilter && record.organizationCode !== orgFilter) return false;

            // Approval flag filter
            if (approvalFilter && record.approvalFlag !== approvalFilter) return false;

            return true;
        });
    }, [data, statusFilter, orgFilter, approvalFilter]);

    // Clear all filters
    const handleClearFilters = () => {
        setStatusFilter(null);
        setOrgFilter(null);
        setApprovalFilter(null);
    };

    // Main columns — header level
    const mainColumns: ColumnsType<AllocationFulfillment> = [
        {
            title: 'B3 NUMBER',
            dataIndex: 'headerCode',
            key: 'headerCode',
            width: 100,
            render: (code: string) => (
                <span style={{ color: '#475569', fontWeight: 500 }}>{code || "-"}</span>
            ),
        },
        {
            title: 'ITEM INFO',
            key: 'itemInfo',
            width: 240,
            render: (_, record: { itemCode: string; itemDescription: string, customerName: string }) => {
                const code = record?.itemCode || 'N/A';
                const description = record?.itemDescription || '';
                const customerName = record?.customerName || 'N/A';

                if (!record?.itemCode && !description) return "-";

                // Calculate lengths for truncation boundaries
                const rawSeparator = " - ";
                const combinedText = description ? `${code}${rawSeparator}${description}` : code;
                const needsTruncation = combinedText.length > 45;

                // Truncate description dynamically if total length breaks the 25-char limit
                let displayedDescription = description;
                if (needsTruncation && description) {
                    const availableSpace = 25 - code.length - rawSeparator.length;
                    displayedDescription = availableSpace > 0
                        ? `${description.slice(0, availableSpace)}...`
                        : '...';
                }

                // Custom multi-line content for the Tooltip popup
                const tooltipContent = (
                    <div style={{ width: 'max-content', maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: '4px', padding: '4px' }}>
                        {[
                            { label: 'CODE', val: code, bold: true, color: '#ffffff' },
                            { label: 'NAME', val: description || 'N/A', bold: false, color: '#f1f5f9' },
                            { label: 'CUSTOMER', val: customerName || '-', bold: false, color: '#f1f5f9' }
                        ].map(({ label, val, bold, color }) => (
                            <div key={label} style={{ display: 'flex', gap: '6px', fontSize: '12px', alignItems: 'baseline' }}>
                                <span style={{ fontWeight: 700, color: '#93c5fd', fontSize: '11px', width: '75px', flexShrink: 0 }}>
                                    {label}:
                                </span>
                                <span style={{ fontWeight: bold ? 600 : 400, color, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                    {val}
                                </span>
                            </div>
                        ))}
                    </div>
                );

                return (
                    <Tooltip
                        title={tooltipContent}
                        mouseEnterDelay={0.2}
                        placement="top"
                        autoAdjustOverflow={true}
                        overlayStyle={{ maxWidth: 'max-content' }} // Forces AntD container to scale out
                    >
                        <span style={{ cursor: needsTruncation ? 'pointer' : 'default', fontSize: '12px' }}>
                            <span style={{ color: '#2563eb', fontWeight: 600 }}>{code}</span>
                            {description && (
                                <span style={{ color: '#475569', fontWeight: 500 }}>
                                    {rawSeparator}{displayedDescription}
                                </span>
                            )}
                        </span>
                    </Tooltip>
                );
            },
        },
        {
            title: 'CUSTOMER',
            dataIndex: 'customerName',
            key: 'customerName',
            width: 220,
            render: (name: string) => (
                <span style={{ color: '#475569', fontWeight: 500 }}>{name || "-"}</span>
            ),
        },
        {
            title: 'B3 QTY',
            dataIndex: 'b3ApprovedQuantity',
            key: 'b3ApprovedQuantity',
            align: 'right',
            width: 100,
            render: (val: number) => (
                val !== null && val !== undefined ? (
                    <Badge
                        count={val.toLocaleString()}
                        overflowCount={Number.MAX_SAFE_INTEGER}
                        style={{ backgroundColor: '#dbeafe', color: '#1d4ed8', fontWeight: 700, fontSize: '12px' }}
                    />
                ) : "-"
            ),
        },
        {
            title: 'ALLOCATED',
            dataIndex: 'allocatedSoQuantity',
            key: 'allocatedSoQuantity',
            align: 'right',
            width: 100,
            render: (val: number) => (
                val !== null && val !== undefined ? (
                    <Badge
                        count={val.toLocaleString()}
                        overflowCount={Number.MAX_SAFE_INTEGER}
                        style={{ backgroundColor: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: '12px' }}
                    />
                ) : "-"
            ),
        },
        {
            title: 'PROGRESS',
            key: 'progress',
            align: 'center',
            width: 150,
            render: (_: unknown, record: AllocationFulfillment) => {
                if (!record) return "-";

                const approvedQty = record.b3ApprovedQuantity || 0;
                const soAllocated = record.allocatedSoQuantity || 0;
                if (approvedQty === 0 && soAllocated === 0) return "-";

                // Determine operational fulfillment statuses
                const isFulfilled = soAllocated >= approvedQty && approvedQty > 0;
                const isPartial = soAllocated > 0 && soAllocated < approvedQty;
                const isOpen = soAllocated === 0 && approvedQty > 0;

                // Calculate overdue days relative to transaction baseline
                const overDue = record.transactionDate
                    ? Math.ceil((new Date().getTime() - new Date(record.transactionDate).getTime()) / (1000 * 60 * 60 * 24))
                    : 0;

                // Calculate explicit fulfillment percentage matching metrics
                const pct = approvedQty > 0 ? Math.min(100, Math.round((soAllocated / approvedQty) * 100)) : 0;

                // Display overdue tag strictly on non-fulfilled lines with valid delays
                const showOverdueTag = overDue > 0 && (isPartial || isOpen);

                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', padding: '0 4px' }}>
                        {/* TOP ROW: Text Elements distributed Left and Right */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>
                                {pct}%
                            </span>
                            {showOverdueTag && (
                                <Tag color="error" style={{ borderRadius: '12px', fontWeight: 600, fontSize: '11px', margin: 0 }}>
                                    {overDue} days
                                </Tag>
                            )}
                        </div>

                        {/* BOTTOM ROW: Full width Progress Bar line indicator */}
                        <Progress
                            percent={pct}
                            showInfo={false}
                            strokeColor={isFulfilled ? '#10b981' : '#f59e0b'}
                            railColor="#e2e8f0"
                            size="small"
                            style={{ margin: 0, width: '100%' }}
                        />
                    </div>
                );
            },
        },
        {
            title: 'STATUS',
            key: 'status',
            align: 'center',
            width: 130,
            render: (_: unknown, record: AllocationFulfillment) => {
                if (!record) return "-";

                const approved = record.b3ApprovedQuantity || 0;
                const soAllocated = record.allocatedSoQuantity || 0;
                if (approved === 0 && soAllocated === 0) return "-";

                if (soAllocated >= approved && approved > 0) {
                    return <Tag color="success" style={{ borderRadius: '12px', fontWeight: 600 }}>Fulfilled</Tag>;
                }
                if (soAllocated > 0) {
                    return <Tag color="warning" style={{ borderRadius: '12px', fontWeight: 600 }}>Partial</Tag>;
                }
                return <Tag color="default" style={{ borderRadius: '12px', fontWeight: 600 }}>Open</Tag>;
            },
        },
    ];

    const soLineColumns: ColumnsType<SalesOrderLine> = [
        {
            title: 'Order Number',
            dataIndex: 'orderNumber',
            key: 'orderNumber',
            width: 140,
            render: (num: number) => (
                num !== null && num !== undefined ? (
                    <Badge
                        count={`${num}`}
                        overflowCount={Number.MAX_SAFE_INTEGER}
                        style={{ backgroundColor: '#ede9fe', color: '#6d28d9', fontWeight: 600, fontSize: '11px' }}
                    />
                ) : "-"
            ),
        },
        {
            title: 'CUSTOMER',
            dataIndex: 'customerName',
            key: 'customerName',
            width: 220,
            render: (name: string) => <span style={{ color: '#475569', fontWeight: 500 }}>{name || "-"}</span>,
        },
        {
            title: 'ALLOCATED QTY',
            dataIndex: 'quantity',
            key: 'quantity',
            align: 'right',
            width: 80,
            render: (val: number) => (
                val !== null && val !== undefined ? (
                    <Badge
                        count={val.toLocaleString()}
                        overflowCount={Number.MAX_SAFE_INTEGER}
                        style={{ backgroundColor: '#dbeafe', color: '#1d4ed8', fontWeight: 700, fontSize: '12px' }}
                    />
                ) : "-"
            ),
        },
        {
            title: 'ORDER DATE',
            dataIndex: 'orderEnteredDate',
            key: 'orderEnteredDate',
            width: 120,
            // Enable sorting based on the string date values
            sorter: (a, b) => {
                const dateA = a.orderEnteredDate || '';
                const dateB = b.orderEnteredDate || '';
                return dateA.localeCompare(dateB);
            },
            defaultSortOrder: 'ascend', // Optional: forces ASC order by default on load
            render: (date: string) => {
                if (!date) return <span style={{ color: '#94a3b8', fontSize: '12px' }}>-</span>;

                try {
                    const parsedDate = new Date(date);

                    if (isNaN(parsedDate.getTime())) throw new Error();

                    const formattedDate = new Intl.DateTimeFormat('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric' // Displays full 4-digit year or use '2-digit' for YY
                    }).format(parsedDate).replace(/\//g, '-');

                    return <span style={{ color: '#475569', fontSize: '12px', fontWeight: 500 }}>{formattedDate}</span>;
                } catch {
                    return <span style={{ color: '#94a3b8', fontSize: '12px' }}>-</span>;
                }
            }
        },
        {
            title: 'STATUS',
            key: 'status',
            align: 'center',
            width: 100,
            render: (_: unknown, record: SalesOrderLine) => (
                record ? (
                    <Tag color="success" style={{ borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                        Allocated
                    </Tag>
                ) : "-"
            ),
        },
    ];

    if (error) {
        return (
            <div style={{ padding: '24px', textAlign: 'center', color: '#ef4444' }}>
                <p>Failed to load fulfillment data.</p>
                <p style={{ fontSize: '12px', color: '#94a3b8' }}>{error}</p>
            </div>
        );
    }

    // Show "Not yet" message when no SO data
    const expandedRowRender = (record: AllocationFulfillment) => {
        console.log(`Rendering expanded row for lineId ${record.lineId}:`, record.salesOrderLines);

        if (!record.salesOrderLines || record.salesOrderLines.length === 0) {
            return (
                <div style={{
                    padding: '24px 48px',
                    backgroundColor: '#f8fafc',
                    borderLeft: '4px solid #94a3b8',
                    textAlign: 'center',
                    color: '#94a3b8',
                    fontStyle: 'italic'
                }}>
                    <span style={{ fontSize: '13px' }}>No sales order allocations yet</span>
                </div>
            );
        }

        return (
            <div style={{ padding: '16px 16px 16px 48px', backgroundColor: '#f8fafc', borderLeft: '4px solid #2563eb' }}>
                <DynamicGrid<SalesOrderLine>
                    columns={soLineColumns}
                    dataSource={record.salesOrderLines}
                    enableSearch={false}
                    pagination={false}
                    size="small"
                    bordered
                    rowKey="soId"
                />
            </div>
        );
    };

    return (
        <>
            <DynamicGrid<AllocationFulfillment>
                title="Fulfillment Tracker"
                enableSearch={true}
                columns={mainColumns}
                dataSource={filteredData}
                loading={loading}
                searchPlaceholder="Search by item, customer, org code..."
                showSerialNumber={false}
                extraHeaderActions={
                    <Space style={{ gap: '12px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>
                            Total ({filteredData.length})
                        </span>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', paddingLeft: '12px', borderLeft: '1px solid #e2e8f0' }}>
                            <Select
                                placeholder="Status"
                                value={statusFilter}
                                onChange={setStatusFilter}
                                allowClear
                                style={{ width: 120 }}
                                options={[
                                    { label: 'Open', value: 'open' },
                                    { label: 'Partial', value: 'partial' },
                                    { label: 'Fulfilled', value: 'fulfilled' },
                                ]}
                            />

                            <Select
                                placeholder="Organization"
                                value={orgFilter}
                                onChange={setOrgFilter}
                                allowClear
                                style={{ width: 120 }}
                                options={orgOptions}
                            />

                            <Select
                                placeholder="Approval"
                                value={approvalFilter}
                                onChange={setApprovalFilter}
                                allowClear
                                style={{ width: 120 }}
                                options={[
                                    { label: 'Approved', value: 'Y' },
                                    { label: 'Pending', value: 'N' }
                                ]}
                            />

                            {(statusFilter || orgFilter || approvalFilter) && (
                                <Button
                                    type="text"
                                    size="small"
                                    onClick={handleClearFilters}
                                    style={{ color: '#ef4444', padding: '4px' }}
                                    icon={<X size={16} />}
                                />
                            )}
                        </div>
                    </Space>
                }
                rowKey="lineId"
                expandable={{
                    expandedRowKeys,
                    onExpand: handleExpand,
                    rowExpandable: () => true,
                    expandedRowRender,
                }}
            />
        </>
    );
}