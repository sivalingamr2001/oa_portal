import { ConfigProvider } from 'antd';
import React from 'react';
import './App.css';
import { NotificationProvider } from './context/NotificationContext';
import Router from './router';
import { ConfigureAntTheme } from './theme/antTheme';

const App: React.FC = () => {
  return (
    <ConfigProvider theme={ConfigureAntTheme}>
      <NotificationProvider>
        <Router />
      </NotificationProvider>
    </ConfigProvider>
  );
};

export default App;
