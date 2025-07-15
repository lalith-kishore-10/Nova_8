import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Square, 
  Download, 
  Trash2, 
  Terminal,
  Clock,
  CheckCircle,
  XCircle,
  Loader,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { logger } from '../utils/logger';
import type { ProcessOutput as ProcessOutputType } from '../types/logs';

interface ProcessOutputProps {
  outputs: ProcessOutputType[];
}

export function ProcessOutput({ outputs }: ProcessOutputProps) {
  const [expandedOutputs, setExpandedOutputs] = useState<Set<string>>(new Set());
  const [autoScroll, setAutoScroll] = useState(true);
  const outputEndRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    if (autoScroll) {
      Object.values(outputEndRefs.current).forEach(ref => {
        if (ref) {
          ref.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }
  }, [outputs, autoScroll]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Loader className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'cancelled':
        return <Square className="h-4 w-4 text-gray-600" />;
      default:
        return <Terminal className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'text-blue-600 bg-blue-50';
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
      case 'cancelled':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const toggleOutputExpansion = (outputId: string) => {
    const newExpanded = new Set(expandedOutputs);
    if (newExpanded.has(outputId)) {
      newExpanded.delete(outputId);
    } else {
      newExpanded.add(outputId);
    }
    setExpandedOutputs(newExpanded);
  };

  const exportOutput = (output: ProcessOutputType) => {
    const content = [
      `Command: ${output.command}`,
      `Status: ${output.status}`,
      `Start Time: ${output.startTime.toISOString()}`,
      output.endTime ? `End Time: ${output.endTime.toISOString()}` : '',
      output.exitCode !== undefined ? `Exit Code: ${output.exitCode}` : '',
      '',
      'STDOUT:',
      ...output.stdout,
      '',
      'STDERR:',
      ...output.stderr
    ].filter(Boolean).join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `output-${output.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearOutputs = () => {
    logger.clearOutputs();
    setExpandedOutputs(new Set());
  };

  const formatDuration = (start: Date, end?: Date) => {
    const endTime = end || new Date();
    const duration = endTime.getTime() - start.getTime();
    return `${(duration / 1000).toFixed(1)}s`;
  };

  if (outputs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <Terminal className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">No process outputs</p>
          <p className="text-sm mt-2">Process outputs will appear here when operations run</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Process Outputs</h3>
        <div className="flex items-center space-x-2">
          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="mr-1"
            />
            Auto-scroll
          </label>
          <button
            onClick={clearOutputs}
            className="flex items-center px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Clear All
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {outputs.map((output) => {
          const isExpanded = expandedOutputs.has(output.id);
          const hasOutput = output.stdout.length > 0 || output.stderr.length > 0;
          
          return (
            <div key={output.id} className="border rounded-lg overflow-hidden">
              <div 
                className={`p-4 cursor-pointer hover:bg-gray-50 ${getStatusColor(output.status)}`}
                onClick={() => toggleOutputExpansion(output.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1">
                      {hasOutput && (
                        isExpanded ? 
                          <ChevronDown className="h-4 w-4" /> : 
                          <ChevronRight className="h-4 w-4" />
                      )}
                      {getStatusIcon(output.status)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{output.command}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDuration(output.startTime, output.endTime)}
                        </div>
                        <span>Started: {output.startTime.toLocaleTimeString()}</span>
                        {output.endTime && (
                          <span>Ended: {output.endTime.toLocaleTimeString()}</span>
                        )}
                        {output.exitCode !== undefined && (
                          <span>Exit: {output.exitCode}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {output.progress !== undefined && output.status === 'running' && (
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${output.progress}%` }}
                        />
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        exportOutput(output);
                      }}
                      className="p-1 text-gray-600 hover:text-gray-800"
                      title="Export output"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
              
              {isExpanded && hasOutput && (
                <div className="border-t bg-gray-900 text-green-400 font-mono text-sm">
                  <div className="max-h-96 overflow-auto p-4">
                    {output.stdout.length > 0 && (
                      <div className="mb-4">
                        <div className="text-green-300 mb-2">STDOUT:</div>
                        {output.stdout.map((line, index) => (
                          <div key={index} className="whitespace-pre-wrap">
                            {line}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {output.stderr.length > 0 && (
                      <div>
                        <div className="text-red-400 mb-2">STDERR:</div>
                        {output.stderr.map((line, index) => (
                          <div key={index} className="text-red-400 whitespace-pre-wrap">
                            {line}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div 
                      ref={(el) => outputEndRefs.current[output.id] = el}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}