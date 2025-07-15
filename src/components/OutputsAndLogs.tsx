import React, { useState, useEffect } from 'react';
import { Terminal, Activity, BarChart3 } from 'lucide-react';
import { LogsPanel } from './LogsPanel';
import { ProcessOutput } from './ProcessOutput';
import { SystemMetrics } from './SystemMetrics';
import { logger } from '../utils/logger';
import type { ProcessOutput as ProcessOutputType } from '../types/logs';

export function OutputsAndLogs() {
  const [activeTab, setActiveTab] = useState<'outputs' | 'metrics'>('outputs');
  const [outputs, setOutputs] = useState<ProcessOutputType[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    const unsubscribe = logger.onOutputsChange(setOutputs);
    return unsubscribe;
  }, []);

  return (
    <div className="flex-1 bg-white overflow-auto">
      <div className="border-b">
        <div className="flex space-x-8 px-6">
          <button
            onClick={() => setActiveTab('outputs')}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'outputs'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Terminal className="h-4 w-4 mr-2" />
            Process Outputs ({outputs.length})
          </button>
          <button
            onClick={() => setActiveTab('metrics')}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'metrics'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            System Metrics
          </button>
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'outputs' && <ProcessOutput outputs={outputs} />}
        {activeTab === 'metrics' && <SystemMetrics />}
      </div>

      <LogsPanel isOpen={showLogs} onToggle={() => setShowLogs(!showLogs)} />
    </div>
  );
}