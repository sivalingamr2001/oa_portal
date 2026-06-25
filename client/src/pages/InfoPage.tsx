import {
    Alert,
    Badge,
    Button,
    Input,
    InputNumber,
    message,
    Popover,
    Progress,
    Select,
    Space,
    Spin,
    Table,
    Tag,
    Tooltip,
    Typography
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
    ArrowLeft,
    ArrowRight,
    Building2,
    CalendarDays,
    Check,
    FileText,
    Hash,
    History,
    TrendingUp,
    User,
    X
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    approveLine,
    cancelAllLines,
    cancelLine,
    getAllocationByHeaderId,
    getDemandMetrics
} from '../api/allocationApi';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import type { AlertSeverity } from '../types';

const { Text } = Typography;
const { Option } = Select;

// ─── Types ───
interface AllocationItem {
    lineId: number;
    organizationId: number;
    organizationCode: string;
    inventoryItemId: number;
    itemCode: string;
    itemDescription: string;
    b3Quantity: number;
    b3ApprovedQuantity: number | null;
    oldRequestedQty: number | null;
    targetDate: string;
    approvalFlag: string;
    closureFlag: string;
    revision: number;
}

interface AllocationHeaderResponse {
    headerId: number;
    headerCode?: string;
    customerId: number;
    customerName: string;
    transactionDate: string;
    createdBy: string;
    status: string;
    totalRequested: number;
    totalApproved: number;
    remarks: string | null;
    items: AllocationItem[];
}

export interface DemandMetrics {
    oaPendingQuantity: number;
    oaRsvQty: number;
    oaPickedQty: number;
    binQty: number;
    binRsvQty: number;
}

type ItemWithMetricsRow = AllocationItem & {
    metrics?: DemandMetrics;
    metricsLoading?: boolean;
};

const CANCEL_REASONS = [
    'Production schedule revised',
    'Customer request reduction',
    'Forecast correction',
    'Raw material constraint',
    'Order cancellation by customer',
    'Quality hold',
    'Other'
];

// ─── Status Helpers ───
const getItemStatus = (record: AllocationItem) => {
    if (record.closureFlag === 'Y') return { label: 'CANCELED', color: '#ff4d4f', bg: '#fff1f0', dot: '#ff4d4f' };
    if (record.approvalFlag === 'Y') return { label: 'APPROVED', color: '#52c41a', bg: '#f6ffed', dot: '#52c41a' };
    return { label: 'PENDING', color: '#faad14', bg: '#fffbe6', dot: '#faad14' };
};

const getHeaderStatus = (status: string) => {
    const map: Record<string, { color: string; bg: string; text: string }> = {
        'Fulfilled': { color: '#52c41a', bg: '#f6ffed', text: 'FULFILLED' },
        'Approved': { color: '#52c41a', bg: '#f6ffed', text: 'APPROVED' },
        'Partial': { color: '#faad14', bg: '#fffbe6', text: 'PARTIAL' },
        'Pending': { color: '#1890ff', bg: '#e6f7ff', text: 'PENDING' },
        'Closed': { color: '#ff4d4f', bg: '#fff1f0', text: 'CLOSED' },
        'Canceled': { color: '#ff4d4f', bg: '#fff1f0', text: 'CANCELED' },
        'Rejected': { color: '#ff4d4f', bg: '#fff1f0', text: 'REJECTED' }
    };
    return map[status] || { color: '#8c8c8c', bg: '#f5f5f5', text: status.toUpperCase() };
};

export const InfoPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { currentUser } = useAuth();
    const { addNotification } = useNotification();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [allocation, setAllocation] = useState<AllocationHeaderResponse | null>(null);
    const [tableData, setTableData] = useState<ItemWithMetricsRow[]>([]);
    const [approvedQuantities, setApprovedQuantities] = useState<Record<number, number>>({});
    const [approvingLines, setApprovingLines] = useState<Set<number>>(new Set());
    const [isApprovingAll, setIsApprovingAll] = useState(false);

    // Cancel state
    const [activeCancelLineId, setActiveCancelLineId] = useState<number | null>(null);
    const [cancelReason, setCancelReason] = useState('');
    const [customCancelReason, setCustomCancelReason] = useState('');
    const [isCanceling, setIsCanceling] = useState(false);
    const [isCancelingAll, setIsCancelingAll] = useState(false);

    const fetchData = useCallback(async () => {
        if (!id) return;
        try {
            setLoading(true);
            setError(null);
            const headerIdNum = parseInt(id, 10);
            const res = await getAllocationByHeaderId(headerIdNum) as unknown as AllocationHeaderResponse;
            setAllocation(res);

            const initialRows: ItemWithMetricsRow[] = res.items.map(item => ({
                ...item,
                metricsLoading: true
            }));
            setTableData(initialRows);

            const initialQuantities: Record<number, number> = {};
            res.items.forEach((item: AllocationItem) => {
                if (item.approvalFlag === 'N' && item.closureFlag === 'N') {
                    initialQuantities[item.lineId] = item.b3Quantity;
                }
            });
            setApprovedQuantities(initialQuantities);

            const metricsPromises = res.items.map(async (item, index) => {
                try {
                    const metricsData = await getDemandMetrics(
                        res.customerId,
                        item.organizationId,
                        item.inventoryItemId
                    );
                    return { index, metrics: metricsData, success: true };
                } catch {
                    return { index, metrics: undefined, success: false };
                }
            });

            const results = await Promise.all(metricsPromises);
            setTableData(prev => {
                const updated = [...prev];
                results.forEach(({ index, metrics }) => {
                    if (updated[index]) {
                        updated[index] = { ...updated[index], metrics, metricsLoading: false };
                    }
                });
                return updated;
            });
        } catch (err: any) {
            setError(err.message || 'Failed to fetch allocation details.');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleApproveLine = async (lineId: number, requestedQty: number) => {
        const qty = approvedQuantities[lineId] ?? requestedQty;
        if (qty <= 0 || qty > requestedQty) {
            message.error('Quantity must be between 1 and requested.');
            return;
        }
        setApprovingLines(prev => new Set(prev).add(lineId));
        try {
            await approveLine({ lineId, approvedQuantity: qty, approvedBy: currentUser?.username || null });
            addNotification(`Line #${lineId} approved: ${qty}`, 'success' as AlertSeverity);
            await fetchData();
        } catch (err: any) {
            message.error(err.message || 'Approval failed.');
        } finally {
            setApprovingLines(prev => { const n = new Set(prev); n.delete(lineId); return n; });
        }
    };

    const handleApproveAll = async () => {
        const pending = allocation?.items.filter(i => i.approvalFlag === 'N' && i.closureFlag === 'N') || [];
        if (!pending.length) { message.warning('No pending lines.'); return; }
        setIsApprovingAll(true);
        try {
            await Promise.all(pending.map(line => approveLine({
                lineId: line.lineId,
                approvedQuantity: approvedQuantities[line.lineId] ?? line.b3Quantity,
                approvedBy: currentUser?.username || null
            })));
            addNotification(`Approved ${pending.length} lines`, 'success' as AlertSeverity);
            await fetchData();
        } catch (err: any) {
            message.error('Bulk approval failed.');
        } finally {
            setIsApprovingAll(false);
        }
    };

    const handleCancelLine = async (lineId: number, qty: number) => {
        const finalReason = cancelReason === 'Other' ? customCancelReason : cancelReason;
        if (!finalReason?.trim()) { message.warning('Select a cancel reason.'); return; }
        setIsCanceling(true);
        try {
            await cancelLine({ lineId, cancelledQty: qty, cancelReason: finalReason.trim(), createdBy: currentUser?.username || null });
            addNotification(`Line cancelled: ${finalReason}`, 'warning');
            setActiveCancelLineId(null);
            setCancelReason(''); setCustomCancelReason('');
            await fetchData();
        } catch (err: any) {
            message.error(err.message || 'Cancellation failed.');
        } finally {
            setIsCanceling(false);
        }
    };

    const handleCancelAll = async () => {
        const finalReason = cancelReason === 'Other' ? customCancelReason : cancelReason;
        if (!finalReason?.trim()) { message.warning('Select a cancel reason.'); return; }
        setIsCancelingAll(true);
        try {
            await cancelAllLines({ headerId: allocation!.headerId, cancelReason: finalReason.trim(), createdBy: currentUser?.username || null });
            addNotification(`All lines cancelled: ${finalReason}`, 'critical');
            setActiveCancelLineId(null);
            setCancelReason(''); setCustomCancelReason('');
            await fetchData();
        } catch (err: any) {
            message.error('Bulk cancellation failed.');
        } finally {
            setIsCancelingAll(false);
        }
    };

    const cancelPopoverContent = (lineId: number, qty: number, isBulk: boolean) => (
        <Space direction="vertical" size={8} style={{ width: 260 }}>
            {!isBulk && (
                <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Cancel Qty</div>
                    <InputNumber size="small" min={1} max={qty} value={qty} disabled style={{ width: '100%', fontSize: '13px', background: '#f5f5f5' }} />
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: 2 }}>Full cancel: {qty}</div>
                </div>
            )}
            <div>
                <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: 4 }}>Reason <span style={{ color: '#ff4d4f' }}>*</span></div>
                <Select size="small" placeholder="Select..." value={cancelReason || undefined} onChange={setCancelReason} style={{ width: '100%', fontSize: '13px' }}>
                    {CANCEL_REASONS.map(r => <Option key={r} value={r}>{r}</Option>)}
                </Select>
            </div>
            {cancelReason === 'Other' && (
                <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: 4 }}>Specify</div>
                    <Input.TextArea size="small" rows={2} placeholder="Custom reason..." value={customCancelReason} onChange={e => setCustomCancelReason(e.target.value)} style={{ fontSize: '13px' }} />
                </div>
            )}
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <Button size="small" style={{ flex: 1, fontSize: '13px' }} onClick={() => { setActiveCancelLineId(null); setCancelReason(''); setCustomCancelReason(''); }}>Close</Button>
                <Button danger type="primary" size="small" style={{ flex: 2, fontSize: '13px' }} loading={isCanceling || isCancelingAll} disabled={!cancelReason || (cancelReason === 'Other' && !customCancelReason.trim())} onClick={() => isBulk ? handleCancelAll() : handleCancelLine(lineId, qty)}>Confirm</Button>
            </div>
        </Space>
    );

    if (loading) return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)' }}>
            <Spin size="large" />
        </div>
    );

    if (error) return (
        <div style={{ padding: '24px', background: 'var(--bg-secondary)' }}>
            <Alert message="Error" description={error} type="error" showIcon style={{ borderRadius: 'var(--radius)' }} />
        </div>
    );

    if (!allocation) return (
        <div style={{ padding: '24px', background: 'var(--bg-secondary)' }}>
            <Alert message="Not Found" description="No data available." type="warning" showIcon style={{ borderRadius: 'var(--radius)' }} />
        </div>
    );

    const pendingCount = allocation.items.filter(i => i.approvalFlag === 'N' && i.closureFlag === 'N').length;
    const approvedCount = allocation.items.filter(i => i.approvalFlag === 'Y' && i.closureFlag === 'N').length;
    const canceledCount = allocation.items.filter(i => i.closureFlag === 'Y').length;
    const progress = allocation.items.length ? Math.round((approvedCount / allocation.items.length) * 100) : 0;

    const headerStatus = getHeaderStatus(allocation.status);

    const itemColumns: ColumnsType<ItemWithMetricsRow> = [
        {
            title: <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Item Details</span>,
            key: 'item',
            width: 280,
            fixed: 'left',
            render: (_, r) => {
                const status = getItemStatus(r);
                const hasHistory = r.revision > 0 && r.oldRequestedQty !== null && r.oldRequestedQty !== undefined;
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: status.dot, flexShrink: 0 }} />
                            <Text strong style={{ fontSize: '15px', color: 'var(--text-primary)' }}>{r.itemCode}</Text>
                        </div>
                        <Text style={{ fontSize: '13px', color: 'var(--text-secondary)', paddingLeft: '18px', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {r.itemDescription}
                        </Text>
                        {hasHistory && (
                            <div style={{ paddingLeft: '18px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                                <History size={12} style={{ color: 'var(--text-secondary)' }} />
                                <span style={{ color: '#ff4d4f', textDecoration: 'line-through', fontWeight: 500 }}>{r.oldRequestedQty}</span>
                                <ArrowRight size={12} style={{ color: 'var(--text-secondary)' }} />
                                <span style={{ color: '#52c41a', fontWeight: 600 }}>{r.b3Quantity}</span>
                                <Tag color="blue" style={{ fontSize: '11px', margin: 0, marginLeft: '4px' }}>Rev {r.revision}</Tag>
                            </div>
                        )}
                        <div style={{ paddingLeft: '18px', marginTop: '2px' }}>
                            <Tag color="blue" style={{ fontSize: '12px', padding: '0 6px', lineHeight: '22px', margin: 0 }}>
                                <Building2 size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                                {r.organizationCode}
                            </Tag>
                        </div>
                    </div>
                );
            }
        },
        {
            title: <span style={{ fontSize: '14px', fontWeight: 700 }}>Quantity</span>,
            key: 'qty',
            width: 140,
            align: 'center',
            render: (_, r) => {
                const pct = r.b3ApprovedQuantity ? Math.round((r.b3ApprovedQuantity / r.b3Quantity) * 100) : 0;
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Req: <strong style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{r.b3Quantity}</strong></span>
                            <span style={{ color: 'var(--success-color)' }}>Appr: <strong style={{ fontSize: '14px' }}>{r.b3ApprovedQuantity ?? 0}</strong></span>
                        </div>
                        <Progress percent={pct} size="small" style={{ width: '100px', margin: 0 }} strokeColor={pct === 100 ? '#52c41a' : 'var(--primary-color)'} trailColor="#f0f0f0" />
                    </div>
                );
            }
        },
        {
            title: <span style={{ fontSize: '14px', fontWeight: 700 }}>Demand Metrics</span>,
            key: 'metrics',
            width: 400,
            render: (_, r) => {
                if (r.metricsLoading) return <Spin size="small" />;
                const m = r.metrics;
                if (!m) return <Text type="secondary" style={{ fontSize: '13px' }}>—</Text>;
                return (
                    <div style={{ display: 'flex', gap: '2px' }}>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <Tooltip title="OA Pending Qty"><Tag color="warning" style={{ fontSize: '12px', margin: 0, padding: '2px 8px', lineHeight: '22px', fontWeight: 500 }}>OA Pen: {m.oaPendingQuantity}</Tag></Tooltip>
                            <Tooltip title="OA Reserved"><Tag color="processing" style={{ fontSize: '12px', margin: 0, padding: '2px 8px', lineHeight: '22px', fontWeight: 500 }}>OA Rsv: {m.oaRsvQty}</Tag></Tooltip>
                            <Tooltip title="OA Picked"><Tag color="success" style={{ fontSize: '12px', margin: 0, padding: '2px 8px', lineHeight: '22px', fontWeight: 500 }}>OA Pick: {m.oaPickedQty}</Tag></Tooltip>

                            <Tooltip title="Bin Quantity"><Tag color="purple" style={{ fontSize: '12px', margin: 0, padding: '2px 8px', lineHeight: '22px', fontWeight: 500 }}>Bin: {m.binQty}</Tag></Tooltip>
                            <Tooltip title="Bin Reserved"><Tag color="cyan" style={{ fontSize: '12px', margin: 0, padding: '2px 8px', lineHeight: '22px', fontWeight: 500 }}>Bin Rsv: {m.binRsvQty}</Tag></Tooltip>
                        </div>
                    </div>
                );
            }
        },
        {
            title: <span style={{ fontSize: '14px', fontWeight: 700 }}>Target Date</span>,
            dataIndex: 'targetDate',
            key: 'date',
            width: 120,
            align: 'center',
            render: (date: string | null) => date ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <CalendarDays size={14} style={{ color: 'var(--primary-color)' }} />
                    <Text style={{ fontSize: '13px', fontWeight: 600 }}>{new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
                </div>
            ) : <Text type="secondary" style={{ fontSize: '13px' }}>—</Text>
        },
        {
            title: <span style={{ fontSize: '14px', fontWeight: 700 }}>Status</span>,
            key: 'status',
            width: 110,
            align: 'center',
            render: (_, r) => {
                const status = getItemStatus(r);
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                        <Tag color={status.label === 'APPROVED' ? 'success' : status.label === 'CANCELED' ? 'error' : 'warning'} style={{ fontSize: '12px', margin: 0, padding: '2px 10px', lineHeight: '24px', fontWeight: 700 }}>
                            {status.label}
                        </Tag>
                    </div>
                );
            }
        },
        {
            title: <span style={{ fontSize: '14px', fontWeight: 700 }}>Approve Qty</span>,
            key: 'apprQty',
            width: 100,
            align: 'center',
            render: (_, r) => {
                if (r.approvalFlag === 'Y' || r.closureFlag === 'Y') {
                    return <Text style={{ fontSize: '14px', color: r.approvalFlag === 'Y' ? '#52c41a' : '#ff4d4f', fontWeight: 600 }}>{r.approvalFlag === 'Y' ? <Check size={16} /> : '—'}</Text>;
                }
                return (
                    <InputNumber
                        size="small"
                        min={1}
                        max={r.b3Quantity}
                        value={approvedQuantities[r.lineId] ?? r.b3Quantity}
                        onChange={(val) => setApprovedQuantities(prev => ({ ...prev, [r.lineId]: val || 0 }))}
                        style={{ width: '80px' }}
                    />
                );
            }
        },
        {
            title: <span style={{ fontSize: '14px', fontWeight: 700 }}>Actions</span>,
            key: 'actions',
            width: 120,
            align: 'center',
            fixed: 'right',
            render: (_, r) => {
                if (r.approvalFlag === 'Y') return <Tag color="success" style={{ fontSize: '12px', margin: 0, padding: '2px 10px', fontWeight: 600 }}>Done</Tag>;
                if (r.closureFlag === 'Y') return <Tag color="error" style={{ fontSize: '12px', margin: 0, padding: '2px 10px', fontWeight: 600 }}>Canceled</Tag>;

                const isApproving = approvingLines.has(r.lineId);

                return (
                    <Space size={6}>
                        <Tooltip title="Approve Line">
                            <Button
                                size="small"
                                type="primary"
                                icon={isApproving ? <Spin size="small" /> : <Check size={14} />}
                                loading={isApproving}
                                onClick={() => handleApproveLine(r.lineId, r.b3Quantity)}
                                style={{ fontSize: '13px', padding: '0 8px', height: '30px', background: 'var(--success-color)', borderColor: 'var(--success-color)' }}
                            >
                            </Button>
                        </Tooltip>

                        <Popover
                            title="Cancel Line"
                            trigger="click"
                            open={activeCancelLineId === r.lineId}
                            onOpenChange={(visible) => {
                                if (visible) { setActiveCancelLineId(r.lineId); setCancelReason(''); setCustomCancelReason(''); }
                                else { setActiveCancelLineId(null); }
                            }}
                            content={cancelPopoverContent(r.lineId, r.b3Quantity, false)}
                            placement="leftTop"
                        >
                            <Tooltip title="Cancel Line">
                                <Button
                                    size="small"
                                    danger
                                    icon={<X size={14} />}
                                    style={{ fontSize: '13px', padding: '0 8px', height: '30px' }}
                                >
                                </Button>
                            </Tooltip>
                        </Popover>
                    </Space>
                );
            }
        }
    ];

    return (
        <div style={{
            height: "89vh",
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--bg-secondary)',
            padding: '20px 24px',
            boxSizing: 'border-box'
        }}>
            {/* ─── Header ─── */}
            <div style={{
                flexShrink: 0,
                background: 'var(--card)',
                borderRadius: '12px',
                padding: '20px 24px',
                marginBottom: '16px',
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--shadow-sm)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <Button
                            type="text"
                            size="small"
                            icon={<ArrowLeft size={20} style={{ color: 'var(--primary-color)' }} />}
                            onClick={() => navigate(-1)}
                            style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        />
                        <div>
                            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Hash size={20} style={{ color: 'var(--primary-color)' }} />
                                B3 Allocation #{allocation.headerId}
                                {allocation.headerCode && <span style={{ color: 'var(--text-secondary)', fontWeight: 400, fontSize: '16px' }}>· {allocation.headerCode}</span>}
                            </div>
                            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><User size={14} />{allocation.customerName || 'Item Specific'}</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CalendarDays size={14} />{new Date(allocation.transactionDate).toLocaleDateString()}</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FileText size={14} />{allocation.createdBy}</span>
                            </div>
                        </div>
                    </div>

                    <Space size="middle">
                        {pendingCount > 0 && (
                            <>
                                <Button
                                    size="middle"
                                    type="primary"
                                    icon={isApprovingAll ? <Spin size="small" /> : <Check size={16} />}
                                    loading={isApprovingAll}
                                    onClick={handleApproveAll}
                                    style={{ fontSize: '14px', fontWeight: 600, borderRadius: '8px', height: '36px' }}
                                >
                                    Approve All ({pendingCount})
                                </Button>

                                <Popover
                                    title="Cancel Entire B3"
                                    trigger="click"
                                    open={activeCancelLineId === -1}
                                    onOpenChange={(visible) => {
                                        if (visible) { setActiveCancelLineId(-1); setCancelReason(''); setCustomCancelReason(''); }
                                        else { setActiveCancelLineId(null); }
                                    }}
                                    content={cancelPopoverContent(0, 0, true)}
                                    placement="bottomRight"
                                >
                                    <Button
                                        size="middle"
                                        danger
                                        icon={isCancelingAll ? <Spin size="small" /> : <X size={16} />}
                                        loading={isCancelingAll}
                                        style={{ fontSize: '14px', fontWeight: 600, borderRadius: '8px', height: '36px' }}
                                    >
                                        Cancel All
                                    </Button>
                                </Popover>
                            </>
                        )}
                        <div style={{
                            background: headerStatus.bg,
                            padding: '6px 18px',
                            borderRadius: '8px',
                            border: `2px solid ${headerStatus.color}`,
                            fontSize: '14px',
                            fontWeight: 700,
                            color: headerStatus.color
                        }}>
                            {headerStatus.text}
                        </div>
                    </Space>
                </div>

                {/* Progress Bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                        <Progress percent={progress} size="small" strokeColor={{ from: '#108ee9', to: '#87d068' }} trailColor="#f0f0f0" />
                    </div>
                    <div style={{ display: 'flex', gap: '20px', fontSize: '13px', flexShrink: 0 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Badge color="#faad14" /> <span style={{ color: 'var(--text-secondary)' }}>Pending:</span> <strong style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{pendingCount}</strong>
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Badge color="#52c41a" /> <span style={{ color: 'var(--text-secondary)' }}>Approved:</span> <strong style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{approvedCount}</strong>
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Badge color="#ff4d4f" /> <span style={{ color: 'var(--text-secondary)' }}>Canceled:</span> <strong style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{canceledCount}</strong>
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <TrendingUp size={14} /> <span style={{ color: 'var(--text-secondary)' }}>Total:</span> <strong style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{allocation.items.length}</strong>
                        </span>
                    </div>
                </div>
                {allocation.remarks && (
                    <div style={{ marginTop: '12px', padding: '10px 16px', background: '#fafafa', borderRadius: '8px', fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={14} style={{ color: 'var(--primary-color)', flexShrink: 0 }} />
                        {allocation.remarks}
                    </div>
                )}
            </div>

            {/* ─── Table ─── */}
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                <Table
                    size="small"
                    dataSource={tableData}
                    columns={itemColumns}
                    rowKey="lineId"
                    pagination={false}
                    bordered={false}
                    scroll={{ x: 1300, y: 800 }}
                    tableLayout="fixed"
                    style={{ height: '100%' }}
                    rowClassName={(r) => r.approvalFlag === 'Y' ? 'row-approved' : r.closureFlag === 'Y' ? 'row-canceled' : 'row-pending'}
                />
            </div>

            <style>{`
                .row-approved { background-color: #f6ffed !important; }
                .row-pending { background-color: #fffbe6 !important; }
                .row-canceled { background-color: #fff1f0 !important; }
                .ant-table-small .ant-table-cell { padding: 14px 16px !important; }
                .ant-table-small .ant-table-thead > tr > th { padding: 12px 16px !important; background: #fafafa !important; font-weight: 700; font-size: 13px; color: var(--text-secondary); border-bottom: 2px solid var(--border-color) !important; }
                .ant-table-small .ant-table-tbody > tr > td { border-bottom: 1px solid #f0f0f0 !important; }
                .ant-table-small .ant-table-tbody > tr:last-child > td { border-bottom: none !important; }
                .ant-input-number-sm input { font-size: 13px !important; height: 28px !important; }
                .ant-btn-sm { font-size: 13px !important; }
                .ant-tag { line-height: 22px !important; }
                .ant-popover-inner { border-radius: 10px !important; }
                .ant-popover-title { font-size: 14px !important; padding: 12px 16px !important; font-weight: 600; }
                .ant-popover-inner-content { padding: 14px 16px !important; }
            `}</style>
        </div>
    );
};