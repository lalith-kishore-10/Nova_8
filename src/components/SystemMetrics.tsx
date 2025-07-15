import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Cpu, 
  HardDrive, 
  Network, 
  Clock, 
  Database,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { logger } from '../utils/logger';
import type { SystemMetrics as SystemMetricsType } from '../types/logs';

export function SystemMetrics() {
  const [metrics, setMetrics] = useState<SystemMetricsType>({
    memoryUsage: 0,
    cpuUsage: 0,
    networkRequests: 0,
    cacheHits: 0,
    processingTime: 0
  });
  const [history, setHistory] = useState<SystemMetricsType[]>([]);

  useEffect(() => {
    const unsubscribe = logger.onMetricsChange((newMetrics) => {
      setMetrics(newMetrics);
      setHistory(prev => [...prev.slice(-19), newMetrics]); // Keep last 20 entries
    });

    // Simulate metrics updates
    const interval = setInterval(() => {
      logger.updateMetrics({
        memoryUsage: Math.random() * 100,
        cpuUsage: Math.random() * 100,
        networkRequests: metrics.networkRequests + Math.floor(Math.random() * 3),
        cacheHits: metrics.cacheHits + Math.floor(Math.random() * 2),
        processingTime: Math.random() * 1000
      });
    }, 2000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [metrics.networkRequests, metrics.cacheHits]);

  const getTrend = (current: number, previous: number) => {
    if (current > previous) return 'up';
    if (current < previous) return 'down';
    return 'stable';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-red-500" />;
      case 'down':
        return <TrendingDown className="h-3 w-3 text-green-500" />;
      default:
        return <Minus className="h-3 w-3 text-gray-500" />;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getUsageColor = (usage: number) => {
    if (usage > 80) return 'text-red-600 bg-red-100';
    if (usage > 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const previousMetrics = history[history.length - 2] || metrics;

  const MetricCard = ({ 
    icon: Icon, 
    title, 
    value, 
    unit, 
    trend, 
    color = 'text-blue-600' 
  }: { 
    icon: any, 
    title: string, 
    value: string | number, 
    unit?: string, 
    trend?: string,
    color?: string 
  }) => (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <Icon className={`h-5 w-5 ${color} mr-2`} />
          <span className="text-sm font-medium text-gray-700">{title}</span>
        </div>
        {trend && getTrendIcon(trend)}
      </div>
      <div className="text-2xl font-bold text-gray-900">
        {value}
        {unit && <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">System Metrics</h3>
        <div className="text-sm text-gray-500">
          Updated every 2 seconds
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <MetricCard
          icon={Cpu}
          title="CPU Usage"
          value={metrics.cpuUsage.toFixed(1)}
          unit="%"
          trend={getTrend(metrics.cpuUsage, previousMetrics.cpuUsage)}
          color={getUsageColor(metrics.cpuUsage).split(' ')[0]}
        />
        
        <MetricCard
          icon={HardDrive}
          title="Memory"
          value={formatBytes(metrics.memoryUsage * 1024 * 1024)}
          trend={getTrend(metrics.memoryUsage, previousMetrics.memoryUsage)}
          color={getUsageColor(metrics.memoryUsage).split(' ')[0]}
        />
        
        <MetricCard
          icon={Network}
          title="Network Requests"
          value={metrics.networkRequests}
          trend={getTrend(metrics.networkRequests, previousMetrics.networkRequests)}
          color="text-purple-600"
        />
        
        <MetricCard
          icon={Database}
          title="Cache Hits"
          value={metrics.cacheHits}
          trend={getTrend(metrics.cacheHits, previousMetrics.cacheHits)}
          color="text-indigo-600"
        />
        
        <MetricCard
          icon={Clock}
          title="Processing Time"
          value={formatTime(metrics.processingTime)}
          trend={getTrend(metrics.processingTime, previousMetrics.processingTime)}
          color="text-orange-600"
        />
      </div>

      {/* Usage Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">CPU Usage</span>
            <span className="text-sm text-gray-500">{metrics.cpuUsage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                metrics.cpuUsage > 80 ? 'bg-red-500' :
                metrics.cpuUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(metrics.cpuUsage, 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">Memory Usage</span>
            <span className="text-sm text-gray-500">{metrics.memoryUsage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                metrics.memoryUsage > 80 ? 'bg-red-500' :
                metrics.memoryUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(metrics.memoryUsage, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Mini Chart */}
      {history.length > 1 && (
        <div className="bg-white rounded-lg border p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">CPU & Memory Trend</h4>
          <div className="h-24 flex items-end space-x-1">
            {history.map((point, index) => (
              <div key={index} className="flex-1 flex flex-col justify-end space-y-1">
                <div 
                  className="bg-blue-500 rounded-t"
                  style={{ height: `${(point.cpuUsage / 100) * 100}%`, minHeight: '2px' }}
                  title={`CPU: ${point.cpuUsage.toFixed(1)}%`}
                />
                <div 
                  className="bg-green-500 rounded-t"
                  style={{ height: `${(point.memoryUsage / 100) * 100}%`, minHeight: '2px' }}
                  title={`Memory: ${point.memoryUsage.toFixed(1)}%`}
                />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center space-x-4 mt-2 text-xs text-gray-500">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded mr-1" />
              CPU
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded mr-1" />
              Memory
            </div>
          </div>
        </div>
      )}
    </div>
  );
}