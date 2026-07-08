import { Layout } from 'antd';
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import '../styles/AppLayout.css';
import { TopHeader } from './Header';
import { Sidebar } from './Sidebar';

const { Content } = Layout;

export const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const sidebarWidth = collapsed ? '80px' : '240px';

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden', backgroundColor: 'var(--background)' }}>
      <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />

      <Layout
        className={`main-layout ${collapsed ? 'collapsed' : ''}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.2s ease',
          backgroundColor: 'var(--background)' // Applies core OKLCH outer page backdrop tint
        }}
      >
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          left: sidebarWidth,
          zIndex: 1000,
          transition: 'all 0.2s ease',
          backgroundColor: 'var(--bg-primary)', // Uses pure layout card surface base
          opacity: 0.85,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border)' // Links boundary lines directly to theme token
        }}>
          <TopHeader collapsed={collapsed} onCollapse={setCollapsed} />
        </div>

        <Content
          style={{
            marginTop: '30px',
            padding: 0,
            flex: 1,
            overflowY: 'auto',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};
