import { Button, Flex, Layout } from 'antd';
import { LogOut, PanelLeftClose, PanelLeftOpen, User2 } from 'lucide-react';
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
  const { currentUser, logout } = useAuth();

  const logoElement = useMemo(() => (
    <div className="logo-container">
      <img src={Logo} alt="JANATICS" className="logo-img" loading="eager" />
    </div>
  ), []);

  return (
    <Header className="app-header">
      {/* Far Left: Toggle Button */}
      <Button
        type="text"
        icon={collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        onClick={() => onCollapse(!collapsed)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      />

      {/* Far Right: Logo + Sliding Profile Combo */}
      <div className="header-right-group">
        {logoElement}

        <div style={{ width: 1, height: 18, background: '#999' }}></div>

        <div className="profile-sliding-container" onClick={logout}>
          {/* Default state view: Username */}
          <Flex align="center" gap="small" className="profile-info-slide">
            <User2 size={16} />
            <span className="username-text">{currentUser?.username}</span>
          </Flex>

          {/* Hover state view: Logout */}
          <Flex align="center" gap="small" className="logout-info-slide">
            <LogOut size={16} />
            <span>Log Out</span>
          </Flex>
        </div>
      </div>
    </Header>
  );
};
