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
          <Text type="secondary">Monitor B3 transaction status, request quantity revisions, and review approvals</Text>
        </Space>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={12} md={6}>
          <Card className="kpi-card" bordered={false}>
            <Statistic
              title="Total B3 Input"
              value={stats.total}
              prefix={<FileSpreadsheet size={20} color="var(--primary-color)" style={{ marginRight: 8 }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card className="kpi-card" bordered={false}>
            <Statistic
              title="Approval Pending"
              value={stats.pending}
              valueStyle={{ color: 'var(--warning-color)' }}
              prefix={<Clock size={20} color="var(--warning-color)" style={{ marginRight: 8 }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card className="kpi-card" bordered={false}>
            <Statistic
              title="Cancelled / Rejected Lines"
              value={stats.cancelled}
              valueStyle={{ color: 'var(--error-color)' }}
              prefix={<AlertTriangle size={20} color="var(--error-color)" style={{ marginRight: 8 }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* Fulfillment Tracker Table */}
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <FulfillmentTracker currentUser={currentUser?.username || ''} />
        </Col>
      </Row>
    </div>
  );
};