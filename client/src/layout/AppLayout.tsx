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
          className="main-content"
          style={{
            margin: '24px',
            marginTop: '65px', // Lifted padding offset boundary slightly for clean alignment spacing
            padding: 0,
            background: 'var(--card)', // Maps inside card layer surface directly to OKLCH --card
            borderRadius: 'var(--radius)', // Applies synchronized system global curve radius
            flex: 1,              
            overflowY: 'auto',    
            boxShadow: 'var(--shadow-sm)', // Maps clean global depth rendering shadow tokens
            border: '1px solid var(--border)' // Wrap content card area within active system border profile
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};
