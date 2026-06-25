export type AlertSeverity = 'critical' | 'warning' | 'info';
export type MachineStatus = 'healthy' | 'warning' | 'critical';
export type RiskLevel = 'low' | 'medium' | 'high';

export interface NotificationState {
  id: string;
  message: string;
  type: AlertSeverity;
}

export interface GlobalFilters {
  plant: string;
  dateRange: string;
  shift: string;
}