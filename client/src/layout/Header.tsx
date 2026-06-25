import { Button, Flex, Layout } from 'antd';
import { LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import React, { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import Logo from '../lib/constants';
import '../styles/Header.css';

const { Header } = Layout;

interface TopHeaderProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ collapsed, onCollapse }) => {
  const { logout } = useAuth();

  const logoElement = useMemo(() => (
    <div className="logo-container">
      <img src={Logo} alt="JANATICS" className="logo-img" loading="eager" />
    </div>
  ), []);

  return (
    <Header
      className="app-header"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}
    >
      <Button
        type="text"
        icon={collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
        onClick={() => onCollapse(!collapsed)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      />


      <Flex className="header-actions" align="center" gap="middle">      {logoElement} <div style={{width:1, height:18, background: '#999'}}></div>
        <Button
          type="text"
          danger
          icon={<LogOut size={20} />}
          onClick={logout}
          aria-label="Logout"
          className="logout-btn"
        />
      </Flex>
    </Header>
  );
};
