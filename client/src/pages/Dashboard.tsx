import {
  Card,
  Col,
  message,
  Row,
  Space,
  Statistic,
  Typography
} from 'antd';
import {
  AlertTriangle,
  Clock,
  FileSpreadsheet,
  TrendingUp
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { getAllocationSummary, type AllocationSummary } from '../api/allocationApi';
import { useAuth } from '../context/AuthContext';
import '../styles/Dashboard.css';
import FulfillmentTracker from './TrackerPage';

const { Title, Text } = Typography;

export const Dashboard = () => {
  const [summaries, setSummaries] = useState<AllocationSummary[]>([]);
  const { currentUser } = useAuth();

  const loadData = async () => {
    try {
      const [sumData] = await Promise.all([
        getAllocationSummary(currentUser?.username || "")
      ]);
      setSummaries(sumData);
    } catch (err) {
      message.error('Failed to load dashboard summaries.');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const stats = React.useMemo(() => {
    let pending = 0;
    let approved = 0;
    let cancelled = 0;
    summaries.forEach(s => {
      pending += s.pendingLines;
      approved += s.totalApprovedQty;
      cancelled += s.cancelledLines;
    });
    return {
      total: summaries.length,
      pending,
      approved,
      cancelled
    };
  }, [summaries]);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <Space direction="vertical" size={2}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={24} style={{ color: 'var(--primary-color)' }} />
            <Title level={2} style={{ margin: 0, color: 'var(--text-primary)' }}>B3 Dashboard</Title>
          </div>
          {/* <Text type="secondary">Monitor B3 transaction status, request quantity revisions, and review approvals</Text> */}
        </Space>
      </div>

      <div className="stats-inline-banner">
        {/* KPI 1 */}
        <div className="stat-inline-item">
          <FileSpreadsheet size={16} className="stat-icon icon-primary" />
          <span className="stat-title">Total B3 Input</span>
          <span className="stat-dot-separator">·</span>
          <span className="stat-count-value value-primary">{stats.total}</span>
        </div>

        {/* Vertical Line Divider */}
        <div className="stat-vertical-divider" />

        {/* KPI 2 */}
        <div className="stat-inline-item">
          <Clock size={16} className="stat-icon icon-warning" />
          <span className="stat-title">Approval Pending</span>
          <span className="stat-dot-separator">·</span>
          <span className="stat-count-value value-warning">{stats.pending}</span>
        </div>

        {/* Vertical Line Divider */}
        <div className="stat-vertical-divider" />

        {/* KPI 3 */}
        <div className="stat-inline-item">
          <AlertTriangle size={16} className="stat-icon icon-error" />
          <span className="stat-title">Cancelled / Rejected Lines</span>
          <span className="stat-dot-separator">·</span>
          <span className="stat-count-value value-error">{stats.cancelled}</span>
        </div>
      </div>

      {/* Fulfillment Tracker Table */}
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <FulfillmentTracker currentUser={currentUser?.username || ''} />
        </Col>
      </Row>
    </div>
  );
};