import {
  Badge,
  Button,
  Card,
  Input,
  InputNumber,
  message,
  Popover,
  Select,
  Space,
  Tooltip,
  Typography
} from 'antd';
import { ArrowRight, Check, History, UserCheck, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import type { AllocationRow } from '../api/allocationApi';
import {
  approveLine,
  cancelAllLines,
  cancelLine,
  getPendingApprovalLines
} from '../api/allocationApi';
import { DynamicGrid } from '../components/DynamicGrid';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useLoader } from '../hooks/useLoader';
import '../styles/Approvals.css';

const { Title, Text } = Typography;
const { Option } = Select;

// API response wrapper type
interface ApiAllocationRow {
  allocation: AllocationRow;
  metrics: {
    oaPendingQuantity: number;
    oaRsvQty: number;
    oaPickedQty: number;
    binQty: number;
    binRsvQty: number;
  };
}

export const Approvals = () => {
  const { addNotification } = useNotification();
  const [allocations, setAllocations] = useState<ApiAllocationRow[]>([]);
  const { withLoader } = useLoader();

  const [approvedQuantities, setApprovedQuantities] = useState<{ [key: number]: number }>({});

  // Cancel popover state per line
  const [activeCancelLineId, setActiveCancelLineId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [customCancelReason, setCustomCancelReason] = useState<string>('');

  // Cancel all popover state per header
  const [activeCancelHeaderId, setActiveCancelHeaderId] = useState<number | null>(null);
  const [cancelAllReason, setCancelAllReason] = useState<string>('');
  const [customCancelAllReason, setCustomCancelAllReason] = useState<string>('');
  const { currentUser } = useAuth();

  const loadData = async () => {
    try {
      const pendingData: any[] = await withLoader(() => getPendingApprovalLines());
      setAllocations(pendingData);

      const pendingQuantities: { [key: number]: number } = {};
      pendingData.forEach((row) => {
        if (row.allocation.closureFlag === 'N') {
          pendingQuantities[row.allocation.lineId] = row.allocation.b3Quantity;
        }
      });

      setApprovedQuantities(prev => ({ ...prev, ...pendingQuantities }));
    } catch (err) {
      message.error('Failed to retrieve pending allocations.');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApproveLine = async (lineId: number, requestedQty: number) => {
    const qty = approvedQuantities[lineId] ?? requestedQty;
    if (qty <= 0) {
      message.error('Approved quantity must be greater than zero.');
      return;
    }

    try {
      await approveLine({
        lineId,
        approvedQuantity: qty,
        approvedBy: currentUser?.username || null
      });
      addNotification(`Line approved successfully with qty: ${qty}`, 'info');
      loadData();
    } catch (err: any) {
      message.error(err.message || 'Approval failed.');
    }
  };

  const handleCancelLine = async (lineId: number, qty: number) => {
    const finalReason = cancelReason === 'Other' ? customCancelReason : cancelReason;
    if (!finalReason || !finalReason.trim()) {
      message.warning('Please select or specify a cancel reason.');
      return;
    }

    try {
      await cancelLine({
        lineId,
        cancelledQty: qty,
        cancelReason: finalReason.trim(),
        createdBy: currentUser?.username || null
      });
      addNotification(`Line cancelled. Reason: ${finalReason}`, 'warning');
      setActiveCancelLineId(null);
      setCancelReason('');
      setCustomCancelReason('');
      loadData();
    } catch (err: any) {
      message.error(err.message || 'Cancellation failed.');
    }
  };

  const handleApproveAll = async (headerId: number) => {
    const linesToApprove = allocations.filter(
      r => r.allocation.headerId === headerId && r.allocation.approvalFlag === 'N' && r.allocation.closureFlag === 'N'
    );

    if (linesToApprove.length === 0) {
      message.warning('No pending lines to approve under this header.');
      return;
    }

    try {
      await Promise.all(
        linesToApprove.map(row =>
          approveLine({
            lineId: row.allocation.lineId,
            approvedQuantity: approvedQuantities[row.allocation.lineId] ?? row.allocation.b3Quantity,
            approvedBy: currentUser?.username || null
          })
        )
      );
      addNotification(`Approved all pending lines under Header #${headerId}`, 'info');
      loadData();
    } catch (err: any) {
      message.error('Bulk approval failed.');
    }
  };

  const handleCancelAll = async (headerId: number) => {
    const finalReason = cancelAllReason === 'Other' ? customCancelAllReason : cancelAllReason;
    if (!finalReason || !finalReason.trim()) {
      message.warning('Please select or specify a cancel reason.');
      return;
    }

    try {
      await cancelAllLines({
        headerId,
        cancelReason: finalReason.trim(),
        createdBy: currentUser?.username || null
      });
      addNotification(`Cancelled all lines under Header #${headerId}`, 'critical');
      setActiveCancelHeaderId(null);
      setCancelAllReason('');
      setCustomCancelAllReason('');
      loadData();
    } catch (err: any) {
      message.error('Bulk cancellation failed.');
    }
  };

  // ─── Group pending lines by header ───
  const parentHeaders = React.useMemo(() => {
    const headerGroups: { [key: number]: any } = {};

    allocations.forEach(row => {
      if (!headerGroups[row.allocation.headerId]) {
        headerGroups[row.allocation.headerId] = {
          headerId: row.allocation.headerId,
          headerCode: row.allocation.headerCode,
          transactionDate: row.allocation.transactionDate,
          customerName: row.allocation.customerName || 'Open Pool',
          customerRegion: row.allocation.customerRegion,
          createdBy: row.allocation.createdBy,
          pendingLinesCount: 0
        };
      }
      headerGroups[row.allocation.headerId].pendingLinesCount += 1;
    });

    return Object.values(headerGroups).sort((a, b) => b.headerId - a.headerId);
  }, [allocations]);

  const parentColumns = [
    {
      title: 'Header code',
      // 1. Tell Ant Design to look inside the nested allocation object
      dataIndex: 'headerCode',
      key: 'headerCode',
      // 2. Add the dynamic fallback check inside the rendering layer
      render: (headerCode: string) => (
        <strong style={{ color: 'var(--primary-color)' }}>
          {headerCode ? headerCode : 'N/A'}
        </strong>
      )
    },
    {
      title: 'Transaction Date',
      dataIndex: 'transactionDate',
      key: 'transactionDate',
      render: (date: string) => new Date(date).toLocaleDateString(),
      sorter: (a: any, b: any) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime()
    },
    {
      title: 'Customer',
      dataIndex: 'customerName',
      key: 'customerName',
      render: (name: string, record: any) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography.Text strong>{name}</Typography.Text>
          {record.customerRegion && (
            <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
              {record.customerRegion}
            </Typography.Text>
          )}
        </div>
      )
    },
    {
      title: 'Created By',
      dataIndex: 'createdBy',
      key: 'createdBy'
    },
    {
      title: 'Pending Lines',
      dataIndex: 'pendingLinesCount',
      key: 'pendingLinesCount',
      render: (count: number) => <Badge count={count} style={{ backgroundColor: 'var(--warning-color)' }} />
    },
    {
      title: 'Actions',
      key: 'bulkActions',
      render: (_: any, record: any) => (
        <Space size="middle">
          {/* <Tooltip title="View Details" placement="top">
            <Button
              type="primary"
              size="small"
              onClick={() => navigate(`/info-page/${record.headerId}`)}
              icon={<Eye size={14} />}
              style={{ borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            />
          </Tooltip> */}

          <Tooltip title="Approve All Lines" placement="top">
            <Button
              type="primary"
              size="small"
              onClick={() => handleApproveAll(record.headerId)}
              icon={<Check size={14} />}
              style={{ borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            />
          </Tooltip>

          <Popover
            title="Cancel Entire B3"
            trigger="click"
            open={activeCancelHeaderId === record.headerId}
            onOpenChange={(visible) => {
              if (visible) {
                setActiveCancelHeaderId(record.headerId);
                setCancelAllReason('');
                setCustomCancelAllReason('');
              } else {
                setActiveCancelHeaderId(null);
              }
            }}
            content={
              <Space direction="vertical" size={12} style={{ width: 260, padding: '4px 0' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: 4 }}>
                    Reason <span style={{ color: '#ff4d4f' }}>*</span>
                  </div>
                  <Select
                    placeholder="Select reason..."
                    value={cancelAllReason || undefined}
                    onChange={(val) => setCancelAllReason(val)}
                    style={{ width: '100%' }}
                  >
                    <Option value="Production schedule revised">Production schedule revised</Option>
                    <Option value="Customer request reduction">Customer request reduction</Option>
                    <Option value="Forecast correction">Forecast correction</Option>
                    <Option value="Raw material constraint">Raw material constraint</Option>
                    <Option value="Order cancellation by customer">Order cancellation by customer</Option>
                    <Option value="Quality hold">Quality hold</Option>
                    <Option value="Other">Other</Option>
                  </Select>
                </div>

                {cancelAllReason === 'Other' && (
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: 4 }}>Specify Reason</div>
                    <Input.TextArea
                      rows={2}
                      placeholder="Type your custom reason here..."
                      value={customCancelAllReason}
                      onChange={(e) => setCustomCancelAllReason(e.target.value)}
                      style={{ borderRadius: 4 }}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <Button
                    size="small"
                    style={{ flex: 1, borderRadius: 4 }}
                    onClick={() => setActiveCancelHeaderId(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    danger
                    type="primary"
                    size="small"
                    style={{ flex: 2, borderRadius: 4 }}
                    disabled={!cancelAllReason || (cancelAllReason === 'Other' && !customCancelAllReason.trim())}
                    onClick={() => handleCancelAll(record.headerId)}
                  >
                    Confirm Cancel All
                  </Button>
                </div>
              </Space>
            }
          >
            <Tooltip title="Cancel All Lines" placement="top" mouseLeaveDelay={0}>
              <Button
                danger
                size="small"
                icon={<X size={14} />}
                style={{ borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              />
            </Tooltip>
          </Popover>
        </Space>
      )
    }
  ];

  // ─── Metrics row component ───
  const MetricsRow = ({ metrics }: { metrics: ApiAllocationRow['metrics'] }) => (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        padding: '8px 16px',
        marginTop: 8,
        backgroundColor: '#f8fafc',
        borderRadius: 6,
        border: '1px dashed #e2e8f0'
      }}
    >
      <span style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 500 }}>
        OA Pending Qty: <strong>{metrics.oaPendingQuantity}</strong>
      </span>
      <span style={{ fontSize: '12px', color: '#eab308', fontWeight: 500 }}>
        OA Reserved Qty: <strong>{metrics.oaRsvQty}</strong>
      </span>
      <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 500 }}>
        OA Picked Qty: <strong>{metrics.oaPickedQty}</strong>
      </span>
      <span style={{ fontSize: '12px', color: '#a855f7', fontWeight: 500 }}>
        Bin Qty: <strong>{metrics.binQty}</strong>
      </span>
      <span style={{ fontSize: '12px', color: '#14b8a6', fontWeight: 500 }}>
        Bin Reserved Qty: <strong>{metrics.binRsvQty}</strong>
      </span>
    </div>
  );

  const renderExpandedRow = (record: any) => {
    const pendingLines = allocations.filter(
      r => r.allocation.headerId === record.headerId && r.allocation.approvalFlag === 'N' && r.allocation.closureFlag === 'N'
    );

    const childColumns = [
      {
        title: 'Organization',
        dataIndex: 'organizationCode',
        key: 'organizationCode',
        render: (code: string | undefined, row: ApiAllocationRow) => row.allocation.organizationCode || code || ""
      },
      {
        title: 'Item',
        key: 'itemDetails',
        render: (_: any, row: ApiAllocationRow) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography.Text strong style={{ color: 'var(--text-primary)' }}>
              {row.allocation.itemCode || 'N/A'}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
              {row.allocation.itemDescription || 'No description'}
            </Typography.Text>
          </div>
        )
      },
      {
        title: 'Target Date',
        key: 'targetDate',
        width: 120,
        render: (_: any, row: ApiAllocationRow) => row.allocation.targetDate ? new Date(row.allocation.targetDate).toLocaleDateString() : '—'
      },
      {
        title: 'Requested Qty',
        key: 'quantityTracking',
        align: 'center',
        render: (_: any, row: ApiAllocationRow) => {
          const line = row.allocation;
          const hasHistory = line.revision > 0 && line.oldRequestedQty !== null && line.oldRequestedQty !== undefined;
          return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {hasHistory ? (
                  <>
                    <span style={{ color: '#ff4d4f', textDecoration: 'line-through', fontWeight: 500 }}>
                      {line.oldRequestedQty}
                    </span>
                    <ArrowRight size={14} style={{ color: 'var(--text-secondary, #bfbfbf)' }} />
                    <strong style={{ color: '#52c41a' }}>
                      {line.b3Quantity}
                    </strong>
                  </>
                ) : (
                  <strong>{line.b3Quantity}</strong>
                )}
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '11px', color: 'var(--text-secondary, #8c8c8c)' }}>
                <History size={11} />
                <span>Rev {line.revision}</span>
              </div>
            </div>
          );
        }
      },
      {
        title: 'Approved Qty Input',
        key: 'approvedQtyInput',
        render: (_: any, row: ApiAllocationRow) => (
          <InputNumber
            min={1}
            value={approvedQuantities[row.allocation.lineId] ?? row.allocation.b3Quantity}
            onChange={(val) => setApprovedQuantities({ ...approvedQuantities, [row.allocation.lineId]: val || 0 })}
            style={{ width: 100, borderRadius: 6 }}
          />
        )
      },
      {
        title: 'Remarks',
        key: 'remarks',
        render: (_: any, row: ApiAllocationRow) => row.allocation.remarks || <Text type="secondary" style={{ fontSize: '12px' }}>-</Text>
      },
      {
        title: 'Actions',
        key: 'actions',
        render: (_: any, row: ApiAllocationRow) => {
          const line = row.allocation;
          return (
            <Space>
              <Tooltip title="Approve Line">
                <Button
                  type="text"
                  className="action-btn-approve"
                  icon={<Check size={18} color="var(--success-color)" />}
                  onClick={() => handleApproveLine(line.lineId, line.b3Quantity)}
                />
              </Tooltip>

              <Popover
                title="Cancel Line"
                trigger="click"
                open={activeCancelLineId === line.lineId}
                onOpenChange={(visible) => {
                  if (visible) {
                    setActiveCancelLineId(line.lineId);
                    setCancelReason('');
                    setCustomCancelReason('');
                  } else {
                    setActiveCancelLineId(null);
                  }
                }}
                content={
                  <Space direction="vertical" size={12} style={{ width: 260, padding: '4px 0' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: 4 }}>
                        Cancel Qty
                      </div>
                      <InputNumber
                        min={1}
                        max={line.b3Quantity}
                        value={line.b3Quantity}
                        disabled
                        style={{ width: '100%', borderRadius: 4, backgroundColor: '#f5f5f5' }}
                      />
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary, #8c8c8c)', marginTop: 2 }}>
                        Will cancel full quantity: {line.b3Quantity}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: 4 }}>
                        Reason <span style={{ color: '#ff4d4f' }}>*</span>
                      </div>
                      <Select
                        placeholder="Select reason..."
                        value={cancelReason || undefined}
                        onChange={(val) => setCancelReason(val)}
                        style={{ width: '100%' }}
                      >
                        <Option value="Forecast correction">Forecast correction</Option>
                        <Option value="Quality hold">Incorrect Entries</Option>
                        <Option value="Other">Other</Option>
                      </Select>
                    </div>

                    {cancelReason === 'Other' && (
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: 4 }}>Specify Reason</div>
                        <Input.TextArea
                          rows={2}
                          placeholder="Type your custom reason here..."
                          value={customCancelReason}
                          onChange={(e) => setCustomCancelReason(e.target.value)}
                          style={{ borderRadius: 4 }}
                        />
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <Button
                        size="small"
                        style={{ flex: 1, borderRadius: 4 }}
                        onClick={() => setActiveCancelLineId(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        danger
                        type="primary"
                        size="small"
                        style={{ flex: 2, borderRadius: 4 }}
                        disabled={!cancelReason || (cancelReason === 'Other' && !customCancelReason.trim())}
                        onClick={() => handleCancelLine(line.lineId, line.b3Quantity)}
                      >
                        Confirm Cancel
                      </Button>
                    </div>
                  </Space>
                }
              >
                <Tooltip title="Cancel Line">
                  <Button
                    type="text"
                    danger
                    icon={<X size={18} />}
                  />
                </Tooltip>
              </Popover>
            </Space>
          );
        }
      }
    ];

    return (
      <Card
        size="small"
        style={{ margin: '8px 16px', backgroundColor: 'var(--bg-secondary)', border: '1px dashed var(--border-color)', borderRadius: 8 }}
      >
        <div style={{ padding: '4px 0 12px 0' }}>
          <Text type="secondary" strong>Line Items Pending HOD Verification</Text>
        </div>
        <DynamicGrid
          columns={childColumns as any}
          dataSource={pendingLines}
          enableSearch={false}
          pagination={false}
          size="small"
          rowKey={(row: ApiAllocationRow) => row.allocation.lineId}
          expandable={{
            expandedRowRender: (row: ApiAllocationRow) => (
              <div style={{ padding: '4px 0 8px 48px' }}>
                <MetricsRow metrics={row.metrics} />
              </div>
            ),
            rowExpandable: () => true,     // Forces all items to render metrics under them
          }}
        />
      </Card>
    );
  };

  return (
    <div className="approvals-container">
      <div className="approvals-header">
        <Space direction="vertical" size={2}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserCheck size={24} style={{ color: 'var(--primary-color)' }} />
            <Title level={2} style={{ margin: 0, color: 'var(--text-primary)' }}>Approvals</Title>
          </div>
          <Text type="secondary">Review requested quantities, adjust allocations, and authorize transactions</Text>
        </Space>
      </div>

      {parentHeaders.length === 0 ? (
        /* Polished Minimal Empty State Box Layout */
        <div className="empty-approvals-box">
          <Space direction="vertical" align="center" size="middle">
            <UserCheck size={40} style={{ color: 'var(--text-quaternary)', opacity: 0.4 }} />
            <Text type="secondary" strong style={{ fontSize: 15, letterSpacing: '0.02em' }}>
              No Approval Pending
            </Text>
          </Space>
        </div>
      ) : (
        <DynamicGrid
          columns={parentColumns}
          dataSource={parentHeaders}
          searchPlaceholder="Search pending headers..."
          expandable={{
            expandedRowRender: renderExpandedRow,
            rowExpandable: () => true
          }}
        />
      )}
    </div>
  );
};