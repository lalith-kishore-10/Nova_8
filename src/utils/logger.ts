import type { LogEntry, ProcessOutput, SystemMetrics, Notification } from '../types/logs';

export class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private outputs: ProcessOutput[] = [];
  private metrics: SystemMetrics = {
    memoryUsage: 0,
    cpuUsage: 0,
    networkRequests: 0,
    cacheHits: 0,
    processingTime: 0
  };
  private notifications: Notification[] = [];
  private listeners: ((logs: LogEntry[]) => void)[] = [];
  private outputListeners: ((outputs: ProcessOutput[]) => void)[] = [];
  private metricsListeners: ((metrics: SystemMetrics) => void)[] = [];
  private notificationListeners: ((notifications: Notification[]) => void)[] = [];

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  log(level: LogEntry['level'], category: LogEntry['category'], message: string, details?: string, metadata?: Record<string, any>) {
    const entry: LogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      level,
      category,
      message,
      details,
      metadata
    };

    this.logs.unshift(entry);
    
    // Keep only last 1000 logs
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(0, 1000);
    }

    this.notifyLogListeners();

    // Auto-create notifications for errors and important events
    if (level === 'error') {
      this.addNotification('error', 'Error Occurred', message, true, 5000);
    } else if (level === 'success' && category !== 'system') {
      this.addNotification('success', 'Operation Completed', message, true, 3000);
    }
  }

  info(category: LogEntry['category'], message: string, details?: string, metadata?: Record<string, any>) {
    this.log('info', category, message, details, metadata);
  }

  success(category: LogEntry['category'], message: string, details?: string, metadata?: Record<string, any>) {
    this.log('success', category, message, details, metadata);
  }

  warning(category: LogEntry['category'], message: string, details?: string, metadata?: Record<string, any>) {
    this.log('warning', category, message, details, metadata);
  }

  error(category: LogEntry['category'], message: string, details?: string, metadata?: Record<string, any>) {
    this.log('error', category, message, details, metadata);
  }

  debug(category: LogEntry['category'], message: string, details?: string, metadata?: Record<string, any>) {
    this.log('debug', category, message, details, metadata);
  }

  startProcess(command: string): string {
    const output: ProcessOutput = {
      id: this.generateId(),
      command,
      status: 'running',
      startTime: new Date(),
      stdout: [],
      stderr: [],
      progress: 0
    };

    this.outputs.unshift(output);
    this.notifyOutputListeners();
    
    this.info('system', `Started process: ${command}`);
    return output.id;
  }

  updateProcess(id: string, updates: Partial<ProcessOutput>) {
    const output = this.outputs.find(o => o.id === id);
    if (output) {
      Object.assign(output, updates);
      this.notifyOutputListeners();
    }
  }

  addProcessOutput(id: string, type: 'stdout' | 'stderr', line: string) {
    const output = this.outputs.find(o => o.id === id);
    if (output) {
      output[type].push(line);
      this.notifyOutputListeners();
    }
  }

  completeProcess(id: string, exitCode: number = 0) {
    const output = this.outputs.find(o => o.id === id);
    if (output) {
      output.status = exitCode === 0 ? 'completed' : 'failed';
      output.endTime = new Date();
      output.exitCode = exitCode;
      output.progress = 100;
      this.notifyOutputListeners();
      
      const duration = output.endTime.getTime() - output.startTime.getTime();
      this.info('system', `Process ${output.status}: ${output.command} (${duration}ms)`);
    }
  }

  updateMetrics(updates: Partial<SystemMetrics>) {
    Object.assign(this.metrics, updates);
    this.notifyMetricsListeners();
  }

  addNotification(type: Notification['type'], title: string, message: string, autoClose: boolean = true, duration: number = 3000) {
    const notification: Notification = {
      id: this.generateId(),
      type,
      title,
      message,
      timestamp: new Date(),
      autoClose,
      duration
    };

    this.notifications.unshift(notification);
    this.notifyNotificationListeners();

    if (autoClose) {
      setTimeout(() => {
        this.removeNotification(notification.id);
      }, duration);
    }
  }

  removeNotification(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notifyNotificationListeners();
  }

  clearLogs() {
    this.logs = [];
    this.notifyLogListeners();
  }

  clearOutputs() {
    this.outputs = [];
    this.notifyOutputListeners();
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  getOutputs(): ProcessOutput[] {
    return [...this.outputs];
  }

  getMetrics(): SystemMetrics {
    return { ...this.metrics };
  }

  getNotifications(): Notification[] {
    return [...this.notifications];
  }

  onLogsChange(callback: (logs: LogEntry[]) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  onOutputsChange(callback: (outputs: ProcessOutput[]) => void) {
    this.outputListeners.push(callback);
    return () => {
      this.outputListeners = this.outputListeners.filter(l => l !== callback);
    };
  }

  onMetricsChange(callback: (metrics: SystemMetrics) => void) {
    this.metricsListeners.push(callback);
    return () => {
      this.metricsListeners = this.metricsListeners.filter(l => l !== callback);
    };
  }

  onNotificationsChange(callback: (notifications: Notification[]) => void) {
    this.notificationListeners.push(callback);
    return () => {
      this.notificationListeners = this.notificationListeners.filter(l => l !== callback);
    };
  }

  private notifyLogListeners() {
    this.listeners.forEach(callback => callback([...this.logs]));
  }

  private notifyOutputListeners() {
    this.outputListeners.forEach(callback => callback([...this.outputs]));
  }

  private notifyMetricsListeners() {
    this.metricsListeners.forEach(callback => callback({ ...this.metrics }));
  }

  private notifyNotificationListeners() {
    this.notificationListeners.forEach(callback => callback([...this.notifications]));
  }
}

export const logger = Logger.getInstance();