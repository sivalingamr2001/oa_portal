import { Layout, Menu } from 'antd';
import { Building2, ClipboardList, Users, Zap } from 'lucide-react';
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Sidebar.css';

const { Sider } = Layout;

const navigationItems = [
  {
    section: '',
    icon: Zap,
    items: [{ path: '/dashboard', label: 'Dashboard' }],
  },
  {
    section: '',
    icon: Users,
    items: [{ path: '/fulfillment', label: 'Create B3 Input' }],
  },
  {
    section: '',
    icon: ClipboardList,
    items: [{ path: '/approvals', label: 'Approvals' }],
  }
];

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onCollapse }) => {
  const { currentUserRole } = useAuth();
  
  const filteredNavigationItems = navigationItems.filter(group => {
    const isApprovals = group.items.some(item => item.path === '/approvals');
    if (isApprovals) {
      return currentUserRole === 'hod';
    }
    return true;
  });

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      width={240}
      collapsedWidth={80}
      className="app-sider"
      trigger={null}
    >
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <Building2 size={24} color="var(--primary-color)" />
          {!collapsed && <span className="logo-text">B3 Portal</span>}
        </div>
      </div>

      <Menu theme="light" className="sidebar-menu">
        {filteredNavigationItems.map((group, idx) => {
          const IconComponent = group.icon;
          return (
            <div key={idx} className="menu-section">
              <div className="menu-section-title">{!collapsed && <span>{group.section}</span>}</div>
              {group.items.map((item, itemIdx) => (
                <NavLink
                  key={itemIdx}
                  to={item.path}
                  className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}
                >
                  <IconComponent size={18} />
                  {!collapsed && <span style={{color: "white"}}>{item.label}</span>}
                </NavLink>
              ))}
            </div>
          );
        })}
      </Menu>
    </Sider>
  );
};
