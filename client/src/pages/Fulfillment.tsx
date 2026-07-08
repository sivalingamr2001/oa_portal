import { Button, Card, Input, InputNumber, message, Popover, Select, Space, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ArrowRight, Edit, History, Plus } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AllocationRow } from '../api/allocationApi';
import { getAllAllocations, reviseQuantity } from '../api/allocationApi';
import { DynamicGrid } from '../components/DynamicGrid';
import { FilterHeader } from '../components/FilterHeader';
import { Loader } from '../components/Loader';
import { useAuth } from '../context/AuthContext';
import { useLoader } from '../hooks/useLoader';
import { formatDateForUI } from '../lib/constants';

const { Option } = Select;

const { Text } = Typography;

interface HeaderRecord {
  headerId: number;
  transactionDate: string;
  customerId: number | null;
  customerName: string | null;
  customerRegion: string | null;
  createdBy: string;
  totalLines: number;
  totalRequestedQty: number;
  totalApprovedQty: number;
  approvedLines: number;
  pendingLines: number;
  cancelledLines: number;
  lines: AllocationRow[];
}


export const Fulfillment: React.FC = () => {
  const navigate = useNavigate();

  const [rawData, setRawData] = useState<AllocationRow[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [activeReviseLineId, setActiveReviseLineId] = useState<number | null>(null);
  const [revisionQty, setRevisionQty] = useState<number>(0);
  const [reviseReason, setReviseReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const { loading, withLoader } = useLoader();
  const { currentUser } = useAuth()

  const loadData = async () => {
    try {
      const lines = await withLoader(() => getAllAllocations(currentUser?.username || ""))
      setRawData(lines);
    } catch (err) {
      message.error('Failed to load allocation data.');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const headerData = useMemo(() => {
    const map = new Map<number, HeaderRecord>();

    rawData.forEach((item) => {
      if (!map.has(item.headerId)) {
        map.set(item.headerId, {
          headerId: item.headerId,
          transactionDate: item.transactionDate,
          customerName: item.customerName ?? null,
          customerId: item.customerId,
          customerRegion: item.customerRegion ?? null,
          createdBy: item.createdBy,
          totalLines: 0,
          totalRequestedQty: 0,
          totalApprovedQty: 0,
          approvedLines: 0,
          pendingLines: 0,
          cancelledLines: 0,
          lines: []
        });
      }

      const header = map.get(item.headerId)!;
      header.lines.push(item);
      header.totalLines += 1;
      header.totalRequestedQty += item.b3Quantity;
      header.totalApprovedQty += item.b3ApprovedQuantity ?? 0;

      if (item.approvalFlag === 'Y') {
        header.approvedLines += 1;
      } else if (item.closureFlag === 'Y') {
        header.cancelledLines += 1;
      } else {
        header.pendingLines += 1;
      }
    });

    return Array.from(map.values());
  }, [rawData]);

  const filteredHeaders = useMemo(() => {
    switch (activeFilter) {
      case 'PENDING':
        return headerData.filter((header) => header.pendingLines > 0);
      case 'APPROVED':
        return headerData.filter((header) => header.approvedLines > 0 && header.pendingLines === 0 && header.cancelledLines === 0);
      case 'CANCELLED':
        return headerData.filter((header) => header.cancelledLines > 0);
      case 'OPEN_POOL':
        return headerData.filter((header) => header.customerId === 0);
      case 'CUSTOMER':
        return headerData.filter((header) => header.customerName !== null);
      default:
        return headerData;
    }
  }, [activeFilter, headerData]);

  const handleReviseQuantity = async (lineId: number, qty: number, finalReason: string) => {
    if (qty < 1) {
      message.warning('Enter a valid revision quantity.');
      return;
    }

    if (!finalReason || !finalReason.trim()) {
      message.warning('Please select or specify a reason for this amendment.');
      return;
    }

    try {
      await reviseQuantity({
        originalLineId: lineId,
        newB3Quantity: qty,
        reason: finalReason.trim()
      });

      message.success('Revision submitted successfully.');
      setActiveReviseLineId(null);
      loadData();
    } catch (err) {
      console.error("Revision Error:", err);
      message.error('Failed to submit revision.');
    }
  };

  // ─── HEADER COLUMNS (labels only, no IDs except Header ID) ───
  const headerColumns: ColumnsType<HeaderRecord> = [
    // {
    //   title: 'ID',
    //   dataIndex: 'headerId',
    //   key: 'headerId',
    //   render: (id: number) => (
    //     <Button type="link" style={{ padding: 0, fontWeight: 600 }} onClick={() => message.info(`Allocation Header #${id}`)}>
    //       {id}
    //     </Button>
    //   ),
    //   sorter: (a, b) => a.headerId - b.headerId
    // },
    {
      title: 'Customer',
      dataIndex: 'customerName',
      key: 'customerName',
      render: (name: string | null, record: HeaderRecord) => (
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
          <Typography.Text strong style={{ color: 'var(--text-primary)' }}>
            {name || 'Open Pool'}
          </Typography.Text>
          {record.customerRegion && (
            <>
              <Typography.Text style={{ color: '#bfbfbf', fontSize: '12px' }}>•</Typography.Text>
              <Typography.Text style={{ fontSize: '12px', color: '#8c8c8c', fontWeight: 400 }}>
                {record.customerRegion}
              </Typography.Text>
            </>
          )}
        </div>
      )
    },
    {
      title: 'Lines',
      dataIndex: 'lines',
      key: 'lines',
      render: (lines: AllocationRow[]) => lines.length
    },
    {
      title: 'Qty',
      dataIndex: 'totalRequestedQty',
      key: 'totalRequestedQty',
      render: (value: number) => <strong>{value}</strong>
    },
    // {
    //   title: 'Remarks',
    //   dataIndex: 'lines',
    //   key: 'headerRemarks',
    //   render: (lines: AllocationRow[]) => {
    //     const remarks = lines.map(l => l.remarks).filter(Boolean);
    //     if (remarks.length === 0) return <Text type="secondary" style={{ fontSize: '12px' }}>-</Text>;
    //     return (
    //       <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
    //         {remarks.slice(0, 2).map((r, i) => (
    //           <Typography.Text key={i} style={{ fontSize: '12px' }}>
    //             {r}
    //           </Typography.Text>
    //         ))}
    //         {remarks.length > 2 && (
    //           <Typography.Text type="secondary" style={{ fontSize: '11px' }}>
    //             +{remarks.length - 2} more
    //           </Typography.Text>
    //         )}
    //       </div>
    //     );
    //   }
    // },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, record: HeaderRecord) => {
        if (record.pendingLines > 0) {
          return <Tag color="warning">Pending</Tag>;
        }
        if (record.cancelledLines === record.totalLines) {
          return <Tag color="error">Cancelled</Tag>;
        }
        return <Tag color="success">Approved</Tag>;
      }
    },
    {
      title: 'Created By',
      dataIndex: 'createdBy',
      key: 'createdBy'
    },
    {
      title: 'Created On',
      dataIndex: 'transactionDate',
      key: 'transactionDate',
      render: (date: string) => formatDateForUI(date),
    },
    // {
    //   title: 'Action',
    //   key: 'action',
    //   render: (_: any, record: HeaderRecord) => (
    //     <Button
    //     type="link"
    //     onClick={() => navigate(`/info-page/${record.headerId}`)}
    //     style={{ padding: 0 }}
    //     >
    //       View
    //     </Button>
    //   )
    // }
  ];

  // ─── LINE COLUMNS (labels only, no IDs) ───
  const lineColumns: ColumnsType<AllocationRow> = [
    {
      title: 'Organization',
      dataIndex: 'organizationCode',
      key: 'organizationCode',
      render: (value: string | undefined) => value || '-'
    },
    {
      title: 'Item',
      key: 'itemDetails',
      width: 300, // 1. Define explicit column width so text knows where to wrap
      render: (_, line: AllocationRow) => (
        // 2. Remove maxWidth from here so the div fills the column naturally
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography.Text strong style={{ color: 'var(--text-primary)' }}>
            {line.itemCode || 'N/A'}
          </Typography.Text>
          <Typography.Text
            type="secondary"
            ellipsis={false}
            style={{
              fontSize: '12px',
              display: 'block',
              wordBreak: 'break-word',
              whiteSpace: 'normal'
            }}
          >
            {line.itemDescription || 'No description'}
          </Typography.Text>
        </div>
      )
    },
    {
      title: 'Target Date',
      dataIndex: 'targetDate',
      key: 'targetDate',
      width: 120,
      render: (date: string) => formatDateForUI(date),
    },
    {
      title: 'Requested Qty',
      key: 'quantityTracking',
      align: 'center',
      render: (_, line: AllocationRow) => {
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
      title: 'Approved Qty',
      dataIndex: 'b3ApprovedQuantity',
      key: 'b3ApprovedQuantity',
      // record represents the entire row object (AllocationRow)
      render: (value: number | null, record: AllocationRow) => value !== null ? (
        <Tag color="success" style={{ fontWeight: 600 }}>{value}</Tag>
      ) : (record.closureFlag === 'Y' ? (
        <Tag color="default">Cancel</Tag>
      ) : (
        <Tag color="default">Pending</Tag>
      ))
    },
    {
      title: 'Action',
      key: 'actions',
      render: (_: any, line: AllocationRow) => {
        // 1. Block 'JANHPL' from viewing or interacting with the revision tools
        if (currentUser?.username === 'JANHPL') {
          return <Text type="secondary" style={{ fontSize: '12px' }}>-</Text>;
        }

        // 2. Original layout checks for tracking record execution states
        const isPending = line.approvalFlag === 'N' && line.closureFlag === 'N';
        if (!isPending) {
          return <Text type="secondary" style={{ fontSize: '12px' }}>Locked</Text>;
        }

        const isCurrentActive = activeReviseLineId === line.lineId;

        return (
          <Popover
            title="Revise Quantity"
            trigger="click"
            open={isCurrentActive}
            onOpenChange={(visible) => {
              if (visible) {
                setActiveReviseLineId(line.lineId);
                setRevisionQty(line.b3Quantity);
                setReviseReason('');
                setCustomReason('');
              } else {
                setActiveReviseLineId(null);
              }
            }}
            content={
              <Space direction="vertical" size={12} style={{ width: 260, padding: '4px 0' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: 4 }}>New Quantity</div>
                  <InputNumber
                    min={1}
                    value={revisionQty}
                    onChange={(val) => setRevisionQty(val || 0)}
                    style={{ width: '100%', borderRadius: 4 }}
                  />
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary, #8c8c8c)', marginTop: 2 }}>
                    Current approved: {line.b3ApprovedQuantity || line.b3Quantity}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: 4 }}>
                    Reason <span style={{ color: '#ff4d4f' }}>*</span>
                  </div>
                  <Select
                    placeholder="Select reason..."
                    value={reviseReason || undefined}
                    onChange={(val) => setReviseReason(val)}
                    style={{ width: '100%' }}
                    dropdownStyle={{ minWidth: 240 }}
                  >
                    <Option value="Forecast correction">Forecast correction</Option>
                    <Option value="Quality hold">Incorrect Entries</Option>
                    <Option value="Other">Other</Option>
                  </Select>
                </div>

                {reviseReason === 'Other' && (
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: 4 }}>Specify Reason</div>
                    <Input.TextArea
                      rows={2}
                      placeholder="Type your custom reason here..."
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      style={{ borderRadius: 4 }}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <Button
                    size="small"
                    style={{ flex: 1, borderRadius: 4 }}
                    onClick={() => setActiveReviseLineId(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="primary"
                    size="small"
                    style={{ flex: 2, borderRadius: 4 }}
                    disabled={!reviseReason || (reviseReason === 'Other' && !customReason.trim())}
                    onClick={() => {
                      const finalReason = reviseReason === 'Other' ? customReason : reviseReason;
                      handleReviseQuantity(line.lineId, revisionQty, finalReason);
                    }}
                  >
                    Amend Qty
                  </Button>
                </div>
              </Space>
            }
          >
            <Button
              type="dashed"
              size="small"
              icon={<Edit size={12} />}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 4 }}
            >
              Revise Qty
            </Button>
          </Popover>
        );
      }
    }
  ];

  const renderExpandedRow = (record: HeaderRecord) => (
    <Card
      size="small"
      style={{ margin: '8px 16px', backgroundColor: 'var(--bg-secondary)', border: '1px dashed blue', borderRadius: 8 }}
    >
      <DynamicGrid<AllocationRow>
        columns={lineColumns}
        dataSource={record.lines}
        enableSearch={false}
        pagination={false}
        size="small"
        sticky={true}
      />
    </Card>
  );

  const extraActions = currentUser?.username !== '' ? (
    <Button
      type="primary"
      onClick={() => navigate('/allocations')}
      icon={<Plus size={16} />}
      size="small"
      style={{ borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 4 }}
    >
      Create B3
    </Button>
  ) : undefined;

  const customHeader = (
    <FilterHeader
      activeFilter={activeFilter}
      setActiveFilter={setActiveFilter}
      filteredCount={filteredHeaders.length}
    />)

  return (
    <div style={{ padding: 24 }}>
      {loading ? <div style={{ display: 'flex', justifyContent: "center", alignItems: "center", height: "80vh" }}><Loader isText={false} /></div> :
        <DynamicGrid<HeaderRecord>
          title={`B3 Inputs`}
          customHeader={customHeader}
          columns={headerColumns}
          dataSource={filteredHeaders}
          searchPlaceholder="Search"
          extraHeaderActions={extraActions}
          expandable={{
            expandedRowRender: renderExpandedRow,
            rowExpandable: (record) => record.lines.length > 0,
          }}
        />
      }
    </div>
  );
};
