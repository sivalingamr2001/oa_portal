import React, { createContext, useContext, useState, useCallback } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import type { AlertSeverity } from '../types';

interface Notification {
  id: string;
  message: string;
  severity: AlertSeverity;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (message: string, severity: AlertSeverity) => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((message: string, severity: AlertSeverity) => {
    const id = Date.now().toString();
    setNotifications((prev) => [...prev, { id, message, severity }]);

    // Also show toast
    const toastType = severity === 'critical' ? 'error' : severity === 'warning' ? 'warning' : 'info';
    toast[toastType](message);

    // Auto-remove after 6 seconds
    setTimeout(() => {
      removeNotification(id);
    }, 6000);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification }}>
      {children}
      <ToastContainer
        position="top-right"
        autoClose={6000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};
