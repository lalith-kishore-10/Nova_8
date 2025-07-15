import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  Filter, 
  Download, 
  Trash2, 
  Search, 
  X, 
  ChevronDown,
  ChevronRight,
  Clock,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle
} from 'lucide-react';
import { logger } from '../utils/logger';
import type { LogEntry } from '../types/logs';

interface LogsPanelProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function LogsPanel({ isOpen, onToggle }: LogsPanelProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevels, setSelectedLevels] = useState<Set<string>>(new Set(['info', 'warning', 'error', 'success']));
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = logger.onLogsChange(setLogs);
    return unsubscribe;
  }, []);

  useEffect(() => {
    let filtered = logs;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by levels
    if (selectedLevels.size > 0) {
      filtered = filtered.filter(log => selectedLevels.has(log.level));
    }

    // Filter by categories
    if (selectedCategories.size > 0) {
      filtered = filtered.filter(log => selectedCategories.has(log.category));
    }

    setFilteredLogs(filtered);
  }, [logs, searchTerm, selectedLevels, selectedCategories]);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLogs, autoScroll]);

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-600" />;
      case 'debug':
        return <Terminal className="h-4 w-4 text-gray-600" />;
      default:
        return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'success':
        return 'text-green-600 bg-green-50';
      case 'error':
        return 'text-red-600 bg-red-50';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50';
      case 'info':
        return 'text-blue-600 bg-blue-50';
      case 'debug':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const toggleLevel = (level: string) => {
    const newLevels = new Set(selectedLevels);
    if (newLevels.has(level)) {
      newLevels.delete(level);
    } else {
      newLevels.add(level);
    }
    setSelectedLevels(newLevels);
  };

  const toggleCategory = (category: string) => {
    const newCategories = new Set(selectedCategories);
    if (newCategories.has(category)) {
      newCategories.delete(category);
    } else {
      newCategories.add(category);
    }
    setSelectedCategories(newCategories);
  };

  const toggleLogExpansion = (logId: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  const exportLogs = () => {
    const logText = filteredLogs.map(log => 
      `[${log.timestamp.toISOString()}] [${log.level.toUpperCase()}] [${log.category}] ${log.message}${log.details ? '\n  ' + log.details : ''}`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearLogs = () => {
    logger.clearLogs();
    setExpandedLogs(new Set());
  };

  const categories = Array.from(new Set(logs.map(log => log.category)));
  const levels = ['info', 'success', 'warning', 'error', 'debug'];

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-4 right-4 bg-gray-900 text-white p-3 rounded-full shadow-lg hover:bg-gray-800 transition-colors z-50"
      >
        <Terminal className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 right-0 left-0 bg-white border-t shadow-lg z-40" style={{ height: '40vh' }}>
      <div className="flex items-center justify-between p-3 border-b bg-gray-50">
        <div className="flex items-center space-x-3">
          <Terminal className="h-5 w-5 text-gray-700" />
          <h3 className="font-semibold text-gray-900">System Logs</h3>
          <span className="text-sm text-gray-500">({filteredLogs.length} entries)</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search logs..."
              className="text-sm border rounded px-2 py-1 w-32"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          <div className="flex items-center space-x-1">
            {levels.map(level => (
              <button
                key={level}
                onClick={() => toggleLevel(level)}
                className={`px-2 py-1 text-xs rounded ${
                  selectedLevels.has(level) 
                    ? getLevelColor(level)
                    : 'text-gray-400 bg-gray-100'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
          
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
            onClick={exportLogs}
            className="p-1 text-gray-600 hover:text-gray-800"
            title="Export logs"
          >
            <Download className="h-4 w-4" />
          </button>
          
          <button
            onClick={clearLogs}
            className="p-1 text-gray-600 hover:text-gray-800"
            title="Clear logs"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          
          <button
            onClick={onToggle}
            className="p-1 text-gray-600 hover:text-gray-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="h-full overflow-auto p-2 font-mono text-sm">
        {filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No logs to display</p>
              {searchTerm && <p className="text-xs mt-1">Try adjusting your search or filters</p>}
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredLogs.map((log) => {
              const isExpanded = expandedLogs.has(log.id);
              const hasDetails = log.details || log.metadata;
              
              return (
                <div key={log.id} className="group">
                  <div 
                    className={`flex items-start space-x-2 p-2 rounded hover:bg-gray-50 ${getLevelColor(log.level)} cursor-pointer`}
                    onClick={() => hasDetails && toggleLogExpansion(log.id)}
                  >
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      {hasDetails && (
                        isExpanded ? 
                          <ChevronDown className="h-3 w-3" /> : 
                          <ChevronRight className="h-3 w-3" />
                      )}
                      {getLevelIcon(log.level)}
                    </div>
                    
                    <div className="flex items-center space-x-2 text-xs text-gray-500 flex-shrink-0">
                      <Clock className="h-3 w-3" />
                      <span>{log.timestamp.toLocaleTimeString()}</span>
                      <span className="px-1 bg-gray-200 rounded">{log.category}</span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <span className="text-gray-900">{log.message}</span>
                    </div>
                  </div>
                  
                  {isExpanded && hasDetails && (
                    <div className="ml-8 mt-1 p-2 bg-gray-100 rounded text-xs">
                      {log.details && (
                        <div className="mb-2">
                          <span className="font-medium text-gray-700">Details:</span>
                          <pre className="mt-1 whitespace-pre-wrap text-gray-600">{log.details}</pre>
                        </div>
                      )}
                      {log.metadata && (
                        <div>
                          <span className="font-medium text-gray-700">Metadata:</span>
                          <pre className="mt-1 whitespace-pre-wrap text-gray-600">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}