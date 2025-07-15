import React, { useState, useEffect } from 'react';
import { 
  Bug, 
  Shield, 
  Zap, 
  AlertTriangle, 
  CheckCircle, 
  Download, 
  Play, 
  Loader, 
  FileText,
  Code,
  RefreshCw,
  ExternalLink,
  Settings
} from 'lucide-react';
import type { GitHubTreeItem } from '../types/github';

interface BugIssue {
  type: 'SYNTAX_ERROR' | 'RUNTIME_ERROR' | 'SECURITY_VULNERABILITY' | 'PERFORMANCE_ISSUE' | 'CODE_QUALITY';
  severity: 'high' | 'medium' | 'low';
  line?: number;
  message: string;
  suggestion: string;
}

interface AnalysisResult {
  issues: BugIssue[];
  summary: string;
  rawResponse?: string;
}

interface FixResult {
  fixedCode: string;
  changes: Array<{
    line: number;
    original: string;
    fixed: string;
    explanation: string;
  }>;
  summary: string;
  rawResponse?: string;
}

interface FileAnalysis {
  filename: string;
  analysis: AnalysisResult;
  fix?: FixResult;
  isAnalyzing: boolean;
  isFixing: boolean;
}

interface BugDetectionProps {
  files: GitHubTreeItem[];
  repoName: string;
  onFileContentFetch: (path: string) => Promise<string>;
}

export function BugDetection({ files, repoName, onFileContentFetch }: BugDetectionProps) {
  const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [fileAnalyses, setFileAnalyses] = useState<Map<string, FileAnalysis>>(new Map());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'overview' | 'issues' | 'fixes'>('overview');

  useEffect(() => {
    checkOllamaStatus();
  }, []);

  const checkOllamaStatus = async () => {
    try {
      const response = await fetch('http://localhost:5001/ollama-status');
      const data = await response.json();
      setOllamaStatus(data.status === 'connected' ? 'connected' : 'disconnected');
    } catch (error) {
      setOllamaStatus('disconnected');
    }
  };

  const getLanguageFromExtension = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      'js': 'javascript', 'jsx': 'javascript', 'ts': 'typescript', 'tsx': 'typescript',
      'py': 'python', 'java': 'java', 'cpp': 'cpp', 'c': 'c', 'cs': 'csharp',
      'php': 'php', 'rb': 'ruby', 'go': 'go', 'rs': 'rust', 'kt': 'kotlin'
    };
    return langMap[ext || ''] || 'text';
  };

  const analyzeFile = async (file: GitHubTreeItem) => {
    const filename = file.path;
    
    // Update state to show analyzing
    setFileAnalyses(prev => new Map(prev.set(filename, {
      filename,
      analysis: { issues: [], summary: '' },
      isAnalyzing: true,
      isFixing: false
    })));

    try {
      const content = await onFileContentFetch(file.path);
      const language = getLanguageFromExtension(filename);

      const response = await fetch('http://localhost:5001/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: content, filename, language })
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      setFileAnalyses(prev => new Map(prev.set(filename, {
        filename,
        analysis: data.analysis,
        isAnalyzing: false,
        isFixing: false
      })));
    } catch (error) {
      console.error('Analysis error:', error);
      setFileAnalyses(prev => new Map(prev.set(filename, {
        filename,
        analysis: { 
          issues: [], 
          summary: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
        },
        isAnalyzing: false,
        isFixing: false
      })));
    }
  };

  const fixFile = async (filename: string) => {
    const fileAnalysis = fileAnalyses.get(filename);
    if (!fileAnalysis) return;

    // Update state to show fixing
    setFileAnalyses(prev => new Map(prev.set(filename, {
      ...fileAnalysis,
      isFixing: true
    })));

    try {
      const file = files.find(f => f.path === filename);
      if (!file) throw new Error('File not found');

      const content = await onFileContentFetch(file.path);
      const language = getLanguageFromExtension(filename);

      const response = await fetch('http://localhost:5001/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code: content, 
          issues: fileAnalysis.analysis.issues,
          filename, 
          language 
        })
      });

      if (!response.ok) {
        throw new Error(`Fix generation failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      setFileAnalyses(prev => new Map(prev.set(filename, {
        ...fileAnalysis,
        fix: data.fix,
        isFixing: false
      })));
    } catch (error) {
      console.error('Fix error:', error);
      setFileAnalyses(prev => new Map(prev.set(filename, {
        ...fileAnalysis,
        isFixing: false
      })));
    }
  };

  const analyzeSelectedFiles = async () => {
    if (selectedFiles.size === 0) return;
    
    setIsAnalyzing(true);
    
    const filesToAnalyze = files.filter(f => selectedFiles.has(f.path));
    
    for (const file of filesToAnalyze) {
      await analyzeFile(file);
    }
    
    setIsAnalyzing(false);
  };

  const downloadFixedFile = (filename: string, fixedCode: string) => {
    const blob = new Blob([fixedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fixed_${filename.split('/').pop()}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAllFixedFiles = () => {
    Array.from(fileAnalyses.values()).forEach(analysis => {
      if (analysis.fix?.fixedCode) {
        downloadFixedFile(analysis.filename, analysis.fix.fixedCode);
      }
    });
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'SECURITY_VULNERABILITY':
        return <Shield className="h-4 w-4 text-red-600" />;
      case 'PERFORMANCE_ISSUE':
        return <Zap className="h-4 w-4 text-yellow-600" />;
      case 'SYNTAX_ERROR':
      case 'RUNTIME_ERROR':
        return <Bug className="h-4 w-4 text-red-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-blue-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const codeFiles = files.filter(f => {
    const ext = f.path.split('.').pop()?.toLowerCase();
    return ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs'].includes(ext || '');
  });

  const totalIssues = Array.from(fileAnalyses.values()).reduce((sum, analysis) => 
    sum + analysis.analysis.issues.length, 0
  );

  const fixedFiles = Array.from(fileAnalyses.values()).filter(analysis => analysis.fix).length;

  if (ollamaStatus === 'checking') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Checking Ollama connection...</p>
        </div>
      </div>
    );
  }

  if (ollamaStatus === 'disconnected') {
    return (
      <div className="text-center py-12">
        <Settings className="h-16 w-16 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Ollama Not Connected</h3>
        <p className="text-gray-600 mb-4">
          To use AI-powered bug detection and fixes, you need to have Ollama running.
        </p>
        <div className="bg-gray-50 rounded-lg p-4 text-left max-w-md mx-auto">
          <h4 className="font-semibold mb-2">Setup Instructions:</h4>
          <ol className="text-sm space-y-1 list-decimal list-inside">
            <li>Install Ollama from <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">ollama.ai</a></li>
            <li>Run: <code className="bg-gray-200 px-1 rounded">ollama pull codellama</code></li>
            <li>Start: <code className="bg-gray-200 px-1 rounded">ollama serve</code></li>
            <li>Start backend: <code className="bg-gray-200 px-1 rounded">node backend/ollama-api.js</code></li>
          </ol>
        </div>
        <button
          onClick={checkOllamaStatus}
          className="mt-4 flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Check Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center mb-2">
              <Bug className="h-6 w-6 text-purple-600 mr-2" />
              <h2 className="text-xl font-bold text-gray-900">AI Bug Detection & Fixes</h2>
            </div>
            <p className="text-gray-600">
              Analyze code for bugs, security issues, and generate AI-powered fixes
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-purple-600">{totalIssues}</div>
            <div className="text-sm text-gray-600">Issues Found</div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4 text-center">
          <FileText className="h-6 w-6 text-blue-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{codeFiles.length}</div>
          <div className="text-sm text-gray-600">Code Files</div>
        </div>
        <div className="bg-white rounded-lg border p-4 text-center">
          <Bug className="h-6 w-6 text-red-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{totalIssues}</div>
          <div className="text-sm text-gray-600">Issues</div>
        </div>
        <div className="bg-white rounded-lg border p-4 text-center">
          <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{fixedFiles}</div>
          <div className="text-sm text-gray-600">Fixed Files</div>
        </div>
        <div className="bg-white rounded-lg border p-4 text-center">
          <Shield className="h-6 w-6 text-purple-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">
            {Array.from(fileAnalyses.values()).reduce((sum, analysis) => 
              sum + analysis.analysis.issues.filter(i => i.type === 'SECURITY_VULNERABILITY').length, 0
            )}
          </div>
          <div className="text-sm text-gray-600">Security Issues</div>
        </div>
      </div>

      {/* File Selection */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Select Files to Analyze</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSelectedFiles(new Set(codeFiles.map(f => f.path)))}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Select All
            </button>
            <button
              onClick={() => setSelectedFiles(new Set())}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Clear
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
          {codeFiles.map(file => (
            <label key={file.path} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
              <input
                type="checkbox"
                checked={selectedFiles.has(file.path)}
                onChange={(e) => {
                  const newSelected = new Set(selectedFiles);
                  if (e.target.checked) {
                    newSelected.add(file.path);
                  } else {
                    newSelected.delete(file.path);
                  }
                  setSelectedFiles(newSelected);
                }}
                className="rounded"
              />
              <Code className="h-4 w-4 text-gray-400" />
              <span className="text-sm truncate">{file.path}</span>
            </label>
          ))}
        </div>

        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-gray-600">
            {selectedFiles.size} files selected
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={analyzeSelectedFiles}
              disabled={selectedFiles.size === 0 || isAnalyzing}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isAnalyzing ? (
                <Loader className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {isAnalyzing ? 'Analyzing...' : 'Analyze Selected Files'}
            </button>
            {fixedFiles > 0 && (
              <button
                onClick={downloadAllFixedFiles}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                Download All Fixes
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      {fileAnalyses.size > 0 && (
        <div className="space-y-4">
          {Array.from(fileAnalyses.values()).map(analysis => (
            <div key={analysis.filename} className="bg-white rounded-lg border">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-gray-600" />
                    <h3 className="font-semibold text-gray-900">{analysis.filename}</h3>
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                      {analysis.analysis.issues.length} issues
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {analysis.isAnalyzing && (
                      <Loader className="h-4 w-4 animate-spin text-blue-600" />
                    )}
                    {analysis.isFixing && (
                      <Loader className="h-4 w-4 animate-spin text-green-600" />
                    )}
                    {!analysis.isAnalyzing && !analysis.isFixing && analysis.analysis.issues.length > 0 && (
                      <button
                        onClick={() => fixFile(analysis.filename)}
                        className="flex items-center px-3 py-1 text-sm bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors"
                      >
                        <Zap className="h-4 w-4 mr-1" />
                        AI Fix
                      </button>
                    )}
                    {analysis.fix && (
                      <button
                        onClick={() => downloadFixedFile(analysis.filename, analysis.fix!.fixedCode)}
                        className="flex items-center px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download Fixed
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4">
                {analysis.analysis.issues.length > 0 ? (
                  <div className="space-y-3">
                    {analysis.analysis.issues.map((issue, index) => (
                      <div key={index} className={`border rounded-lg p-3 ${getSeverityColor(issue.severity)}`}>
                        <div className="flex items-start space-x-3">
                          {getIssueIcon(issue.type)}
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-medium">{issue.type.replace(/_/g, ' ')}</span>
                              <span className="text-xs px-2 py-1 bg-white rounded uppercase">
                                {issue.severity}
                              </span>
                              {issue.line && (
                                <span className="text-xs text-gray-600">Line {issue.line}</span>
                              )}
                            </div>
                            <p className="text-sm mb-2">{issue.message}</p>
                            <p className="text-xs text-gray-600">{issue.suggestion}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    {analysis.isAnalyzing ? (
                      <div className="flex items-center justify-center">
                        <Loader className="h-4 w-4 animate-spin mr-2" />
                        Analyzing code...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                        No issues found
                      </div>
                    )}
                  </div>
                )}

                {analysis.fix && (
                  <div className="mt-4 border-t pt-4">
                    <h4 className="font-semibold text-green-700 mb-2">AI-Generated Fix</h4>
                    <p className="text-sm text-gray-600 mb-3">{analysis.fix.summary}</p>
                    {analysis.fix.changes.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium text-gray-700">Changes Made:</h5>
                        {analysis.fix.changes.map((change, index) => (
                          <div key={index} className="text-xs bg-gray-50 p-2 rounded">
                            <div className="font-medium">Line {change.line}:</div>
                            <div className="text-gray-600">{change.explanation}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}