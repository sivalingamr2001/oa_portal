import { Button, Pagination, Progress, Select, Space, Table, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import Title from 'antd/es/typography/Title';
import { BoxesIcon, CheckCircle2, ChevronDown, ChevronRight, X } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { AllocationFulfillment, SalesOrderLine } from '../api/allocationApi';
import { getAllocationFulfillments } from '../api/allocationApi';
import '../styles/TrackerPage.css';

interface FulfillmentDateGroup {
    groupKey: string;
    transactionDate: string;
    displayDate: string;
    lines: AllocationFulfillment[];
}

const formatDisplayDate = (date: string | null | undefined) => {
    if (!date) return 'Unknown date';
    try {
        const parsedDate = new Date(date);
        if (Number.isNaN(parsedDate.getTime())) throw new Error();
        return new Intl.DateTimeFormat('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).format(parsedDate);
    } catch {
        return 'Unknown date';
    }
};

const formatDateShort = (date: string | null | undefined) => {
    if (!date) return '-';
    try {
        const parsedDate = new Date(date);
        if (Number.isNaN(parsedDate.getTime())) throw new Error();
        return new Intl.DateTimeFormat('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }).format(parsedDate).replace(/\//g, '-');
    } catch {
        return '-';
    }
};

// --- Status helpers ---
const getStatusInfo = (record: AllocationFulfillment) => {
    const approved = record.b3ApprovedQuantity || 0;
    const soAllocated = record.allocatedSoQuantity || 0;
    if (approved === 0 && soAllocated === 0) return { status: 'none', pct: 0 };
    if (soAllocated >= approved && approved > 0) return { status: 'fulfilled', pct: 100 };
    if (soAllocated > 0) return { status: 'partial', pct: Math.round((soAllocated / approved) * 100) };
    return { status: 'open', pct: 0 };
};

// --- Sub-table columns (Sales Order Lines) ---
const soLineColumns: ColumnsType<SalesOrderLine> = [
    {
        title: 'OA NUMBER',
        dataIndex: 'orderNumber',
        key: 'orderNumber',
        width: 140,
        render: (num: number) => (
            num !== null && num !== undefined ? (
                <span style={{ color: '#7c3aed', fontWeight: 600, fontSize: '12px' }}>
                    OA-{num}
                </span>
            ) : '-'
        ),
    },
    {
        title: 'CUSTOMER',
        dataIndex: 'customerName',
        key: 'customerName',
        width: 220,
        render: (name: string) => <span style={{ color: '#475569', fontWeight: 500, fontSize: '12px' }}>{name || '-'}</span>,
    },
    {
        title: 'OA DATE',
        dataIndex: 'orderEnteredDate',
        key: 'orderEnteredDate',
        width: 120,
        render: (date: string) => (
            <span style={{ color: '#475569', fontSize: '12px' }}>{formatDateShort(date)}</span>
        ),
    },
    {
        title: 'OA QTY',
        dataIndex: 'quantity',
        key: 'quantity',
        align: 'right',
        width: 100,
        render: (val: number) => (
            val !== null && val !== undefined ? (
                <span style={{ color: '#1d4ed8', fontWeight: 600, fontSize: '12px' }}>
                    {val.toLocaleString()}
                </span>
            ) : '-'
        ),
    },
    {
        title: 'ALLOCATED',
        dataIndex: 'quantity',
        key: 'allocated',
        align: 'right',
        width: 100,
        render: (val: number) => (
            val !== null && val !== undefined ? (
                <span style={{ color: '#15803d', fontWeight: 600, fontSize: '12px' }}>
                    {val.toLocaleString()}
                </span>
            ) : '-'
        ),
    },
    {
        title: 'STATUS',
        key: 'status',
        align: 'center',
        width: 120,
        render: () => (
            <Tag color="success" style={{ borderRadius: '12px', fontSize: '11px', fontWeight: 600, margin: 0 }}>
                <CheckCircle2 size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                Fulfilled
            </Tag>
        ),
    },
];


const expandedRowRender = (record: AllocationFulfillment) => {
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
                <span style={{ fontSize: '13px' }}>No sales order allocations found</span>
            </div>
        );
    }

    const totalQty = record.salesOrderLines.reduce((sum, line) => sum + (line.quantity || 0), 0);
    const totalAllocated = record.salesOrderLines.reduce((sum, line) => sum + (line.quantity || 0), 0);
    const approvedQty = record.b3ApprovedQuantity || 0;

    return (
        <div style={{ padding: '12px 16px 12px 48px', backgroundColor: '#f0f9ff', borderLeft: '4px solid #0ea5e9' }}>
            <Table<SalesOrderLine>
                columns={soLineColumns}
                dataSource={record.salesOrderLines}
                pagination={false}
                size="small"
                bordered={false}
                rowKey="soId"
                showHeader={true}
                style={{ backgroundColor: 'transparent' }}
                rowClassName={() => 'sub-table-row'}
            />
            {/* Totals row */}
            <div style={{
                display: 'flex',
                padding: '8px 16px',
                marginTop: '8px',
                borderTop: '1px solid #e2e8f0',
                fontSize: '12px',
                fontWeight: 600,
                color: '#475569',
                alignItems: 'center'
            }}>
                <span style={{ width: 140, textAlign: 'left', color: '#0f172a' }}>Total</span>
                <span style={{ width: 100 }}></span>
                <span style={{ width: 120 }}></span>
                <span style={{ width: 120 }}></span>
                <span style={{ width: 144 }}></span>
                <span style={{ width: 120 }}></span>
                <span style={{ width: 100, textAlign: 'right', color: '#1d4ed8' }}>{totalQty.toLocaleString()}</span>
                <span style={{ width: 150, textAlign: 'right', color: '#15803d' }}>{totalAllocated.toLocaleString()}</span>
                <span style={{ width: 165, textAlign: 'center', marginLeft: '10px' }}>
                    <span style={{ color: approvedQty === totalQty ? '#15803d' : '#b45309', fontWeight: 600 }}>
                        {approvedQty === totalQty ? 'Fully Filled' : 'Partially Filled'}
                    </span>
                </span>
            </div>
        </div>
    );
};

// --- Date Group Header Component ---
function DateGroupHeader({
    record,
    isExpanded,
    onToggle
}: {
    record: FulfillmentDateGroup;
    isExpanded: boolean;
    onToggle: () => void;
}) {
    const totalQty = record.lines.reduce((sum, line) => sum + (line.b3ApprovedQuantity || 0), 0);
    const totalAllocated = record.lines.reduce((sum, line) => sum + (line.allocatedSoQuantity || 0), 0);
    const fulfilledCount = record.lines.filter(line => {
        const approved = line.b3ApprovedQuantity || 0;
        const allocated = line.allocatedSoQuantity || 0;
        return allocated >= approved && approved > 0;
    }).length;
    const fillPct = totalQty > 0 ? Math.round((totalAllocated / totalQty) * 100) : 0;
    const allFulfilled = fulfilledCount === record.lines.length && record.lines.length > 0;

    // Calculate overdue
    const overDue = record.transactionDate && record.transactionDate !== 'unknown-date'
        ? Math.ceil((new Date().getTime() - new Date(record.transactionDate).getTime()) / (1000 * 60 * 60 * 24))
        : 0;
    const isOverdue = overDue > 0;

    const headerBackground = allFulfilled
        ? '#ecfdf5'
        : isOverdue
            ? '#fef2f2'
            : '#f0f9ff';
    const headerBorder = allFulfilled
        ? '#34d399'
        : isOverdue
            ? '#fecaca'
            : '#bae6fd';
    const badgeColor = allFulfilled ? '#16a34a' : isOverdue ? '#ef4444' : '#0ea5e9';

    return (
        <div
            onClick={onToggle}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 16px',
                backgroundColor: headerBackground,
                borderRadius: '8px',
                cursor: 'pointer',
                border: `1px solid ${headerBorder}`,
                marginBottom: '4px'
            }}
        >
            {/* Expand icon */}
            <span style={{ color: '#64748b', fontSize: '14px', transition: 'transform 0.2s' }}>
                {isExpanded ? <ChevronDown className="text-gray-500" size={14} /> : <ChevronRight className="text-gray-500" size={14} />}
            </span>

            {/* Date badge */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: badgeColor,
                color: 'white',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700
            }}>
                <span>{record.displayDate}</span>
                {isOverdue && (
                    <span style={{ fontSize: '11px', opacity: 0.9 }}>{overDue}d overdue</span>
                )}
            </div>

            {/* Summary info */}
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                {record.lines.length} item{record.lines.length === 1 ? '' : 's'}
            </span>

            <span style={{ fontSize: '12px', color: '#475569' }}>
                Qty: <strong style={{ color: '#1d4ed8' }}>{totalQty.toLocaleString()}</strong>
            </span>

            <span style={{ fontSize: '12px', color: '#475569' }}>
                Allocated: <strong style={{ color: '#15803d' }}>{totalAllocated.toLocaleString()}</strong>
            </span>

            <span style={{ fontSize: '12px', color: '#475569' }}>
                Fill: <strong>{fillPct}%</strong>
            </span>

            {fulfilledCount > 0 && (
                <Tag color="success" style={{ borderRadius: '12px', fontSize: '11px', fontWeight: 600, margin: 0 }}>
                    <CheckCircle2 size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                    {fulfilledCount} fulfilled
                </Tag>
            )}

            {/* Progress bar */}
            <div style={{ flex: 1, maxWidth: '200px', marginLeft: 'auto' }}>
                <Progress
                    percent={fillPct}
                    showInfo={false}
                    strokeColor={fillPct === 100 ? '#10b981' : '#0ea5e9'}
                    trailColor="#e2e8f0"
                    size="small"
                    style={{ margin: 0 }}
                />
            </div>
        </div>
    );
}

// --- Main Component ---
export default function FulfillmentTracker({ currentUser }: { currentUser: string }) {
    const [data, setData] = useState<AllocationFulfillment[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedGroupKeys, setExpandedGroupKeys] = useState<React.Key[]>([]);
    const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);
    const [groupPage, setGroupPage] = useState(1);
    const groupPageSize = 10;

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

    const handleGroupExpand = (groupKey: string) => {
        setExpandedGroupKeys(prev =>
            prev.includes(groupKey)
                ? prev.filter(key => key !== groupKey)
                : [...prev, groupKey]
        );
    };

    const handleRowExpand = useCallback((expanded: boolean, record: AllocationFulfillment) => {
        setExpandedRowKeys(prev =>
            expanded
                ? [...prev, record.lineId]
                : prev.filter(key => key !== record.lineId)
        );
    }, []);

    const mainColumns = useMemo<ColumnsType<AllocationFulfillment>>(() => [
        {
            title: '',
            key: 'expand',
            width: 40,
            render: (_: unknown, record: AllocationFulfillment) => {
                const isRowExpanded = expandedRowKeys.includes(record.lineId);
                return (
                    <span
                        onClick={(event) => {
                            event.stopPropagation();
                            handleRowExpand(!isRowExpanded, record);
                        }}
                        style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', color: '#94a3b8' }}
                    >
                        <ChevronDown size={16} style={{ transform: isRowExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                    </span>
                );
            },
        },
        {
            title: 'B3 NUMBER',
            dataIndex: 'headerCode',
            key: 'headerCode',
            width: 120,
            render: (code: string) => (
                <span style={{ color: '#2563eb', fontWeight: 600, fontSize: '12px' }}>{code || '-'}</span>
            ),
        },
        {
            title: 'ITEM INFO',
            key: 'itemInfo',
            width: 280,
            render: (_, record: AllocationFulfillment) => {
                const code = record?.itemCode || 'N/A';
                const description = record?.itemDescription || '';
                const customerName = record?.customerName || 'N/A';

                if (!record?.itemCode && !description) return '-';

                const rawSeparator = ' - ';
                const combinedText = description ? `${code}${rawSeparator}${description}` : code;
                const needsTruncation = combinedText.length > 45;

                let displayedDescription = description;
                if (needsTruncation && description) {
                    const availableSpace = 25 - code.length - rawSeparator.length;
                    displayedDescription = availableSpace > 0
                        ? `${description.slice(0, availableSpace)}...`
                        : '...';
                }

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
                        overlayStyle={{ maxWidth: 'max-content' }}
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
                <span style={{ color: '#475569', fontWeight: 500, fontSize: '12px' }}>{name || '-'}</span>
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
                    <span style={{ color: '#1d4ed8', fontWeight: 700, fontSize: '12px' }}>
                        {val.toLocaleString()}
                    </span>
                ) : '-'
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
                    <span style={{ color: '#15803d', fontWeight: 700, fontSize: '12px' }}>
                        {val.toLocaleString()}
                    </span>
                ) : '-'
            ),
        },
        {
            title: 'PROGRESS',
            key: 'progress',
            align: 'center',
            width: 160,
            render: (_: unknown, record: AllocationFulfillment) => {
                if (!record) return '-';
                const { status, pct } = getStatusInfo(record);
                if (status === 'none') return '-';

                const overDue = record.transactionDate
                    ? Math.ceil((new Date().getTime() - new Date(record.transactionDate).getTime()) / (1000 * 60 * 60 * 24))
                    : 0;
                const showOverdueTag = overDue > 0 && (status === 'partial' || status === 'open');

                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', padding: '0 4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>
                                {pct}%
                            </span>
                            {showOverdueTag && (
                                <Tag color="error" style={{ borderRadius: '12px', fontWeight: 600, fontSize: '10px', margin: 0, padding: '0 6px' }}>
                                    {overDue}d overdue
                                </Tag>
                            )}
                        </div>
                        <Progress
                            percent={pct}
                            showInfo={false}
                            strokeColor={status === 'fulfilled' ? '#10b981' : '#f59e0b'}
                            trailColor="#e2e8f0"
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
                if (!record) return '-';
                const { status } = getStatusInfo(record);
                if (status === 'none') return '-';

                if (status === 'fulfilled') {
                    return (
                        <Tag color="success" style={{ borderRadius: '12px', fontWeight: 600, fontSize: '11px', margin: 0 }}>
                            <CheckCircle2 size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                            Fulfilled
                        </Tag>
                    );
                }
                if (status === 'partial') {
                    return <Tag color="warning" style={{ borderRadius: '12px', fontWeight: 600, fontSize: '11px', margin: 0 }}>Partial</Tag>;
                }
                return <Tag color="default" style={{ borderRadius: '12px', fontWeight: 600, fontSize: '11px', margin: 0 }}>Open</Tag>;
            },
        },
    ], [expandedRowKeys, handleRowExpand]);

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
                const { status } = getStatusInfo(record);
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

    const groupedData = useMemo<FulfillmentDateGroup[]>(() => {
        const groups = new Map<string, AllocationFulfillment[]>();

        filteredData.forEach(record => {
            const key = record.transactionDate || 'unknown-date';
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)?.push(record);
        });

        return Array.from(groups.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([transactionDate, lines]) => ({
                groupKey: transactionDate,
                transactionDate,
                displayDate: formatDisplayDate(transactionDate),
                lines,
            }));
    }, [filteredData]);

    const pagedGroups = useMemo(() => {
        const startIndex = (groupPage - 1) * groupPageSize;
        return groupedData.slice(startIndex, startIndex + groupPageSize);
    }, [groupedData, groupPage]);

    useEffect(() => {
        setGroupPage(1);
    }, [groupedData]);

    if (error) {
        return (
            <div style={{ padding: '24px', textAlign: 'center', color: '#ef4444' }}>
                <p>Failed to load fulfillment data.</p>
                <p style={{ fontSize: '12px', color: '#94a3b8' }}>{error}</p>
            </div>
        );
    }

    return (
        <div style={{ padding: '16px', backgroundColor: '#f8fafc' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Space orientation="vertical" size={2}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <BoxesIcon size={24} style={{ color: '#0ea5e9' }} />
                        <Title level={4} style={{ margin: 0, color: '#1e293b' }}>Fulfillment Tracker</Title>
                    </div>
                </Space>

                {/* Filters */}
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
            </div>

            {/* Date Groups */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pagedGroups.map(group => {
                    const isExpanded = expandedGroupKeys.includes(group.groupKey);
                    return (
                        <div key={group.groupKey}>
                            <DateGroupHeader
                                record={group}
                                isExpanded={isExpanded}
                                onToggle={() => handleGroupExpand(group.groupKey)}
                            />

                            {isExpanded && (
                                <div style={{ marginTop: '4px', marginLeft: '24px' }}>
                                    <Table<AllocationFulfillment>
                                        columns={mainColumns}
                                        dataSource={group.lines}
                                        pagination={false}
                                        size="small"
                                        bordered={false}
                                        rowKey="lineId"
                                        showHeader={true}
                                        loading={loading}

                                        
                                        scroll={{ y: 400, x: 'max-content' }}
                                        sticky={true}

                                        expandable={{
                                            expandedRowKeys,
                                            onExpand: handleRowExpand,
                                            rowExpandable: () => true,
                                            expandedRowRender,
                                            expandIcon: () => null,
                                            expandRowByClick: true,
                                        }}
                                        style={{
                                            backgroundColor: 'white',
                                            borderRadius: '8px',
                                            overflow: 'hidden',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                                        }}
                                        rowClassName={() => 'main-table-row'}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}

                {groupedData.length === 0 && !loading && (
                    <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
                        No data found matching your filters.
                    </div>
                )}

                {groupedData.length > groupPageSize && (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
                        <Pagination
                            current={groupPage}
                            pageSize={groupPageSize}
                            total={groupedData.length}
                            onChange={(page) => setGroupPage(page)}
                            size="small"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
