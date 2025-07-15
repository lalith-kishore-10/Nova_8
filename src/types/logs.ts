export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'success' | 'debug';
  category: 'analysis' | 'docker' | 'validation' | 'system' | 'api';
  message: string;
  details?: string;
  metadata?: Record<string, any>;
}

export interface ProcessOutput {
  id: string;
  command: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  exitCode?: number;
  stdout: string[];
  stderr: string[];
  progress?: number;
}

export interface SystemMetrics {
  memoryUsage: number;
  cpuUsage: number;
  networkRequests: number;
  cacheHits: number;
  processingTime: number;
}

export interface UIState {
  isLoading: boolean;
  currentOperation: string;
  progress: number;
  logs: LogEntry[];
  outputs: ProcessOutput[];
  metrics: SystemMetrics;
  notifications: Notification[];
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  autoClose?: boolean;
  duration?: number;
}