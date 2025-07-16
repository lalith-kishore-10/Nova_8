import React, { useState } from 'react';
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info,
  Wrench,
  RefreshCw,
  FileText,
  Bug,
  Shield,
  Zap
} from 'lucide-react';
import { CodeTestRunner } from '../utils/testRunner';
import { logger } from '../utils/logger';
import type { TestSuite, TestError, CodeFix } from '../types/testing';
import type { StackAnalysis, GeneratedFiles } from '../types/analysis';

interface TestRunnerProps {
  analysis: StackAnalysis;
  dockerFiles: GeneratedFiles;
  projectFiles: Map<string, string>;
  onFilesUpdated: (updatedFiles: Map<string, string>) => void;
}

export function TestRunner({ analysis, dockerFiles, projectFiles, onFilesUpdated }: TestRunnerProps) {
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [selectedSuite, setSelectedSuite] = useState<string | null>(null);
  const [fixes, setFixes] = useState<CodeFix[]>([]);

  const runTests = async () => {
    setIsRunning(true);
    setTestSuites([]);
    setFixes([]);
    
    logger.info('testing', 'Starting comprehensive test suite');

    try {
      const testRunner = new CodeTestRunner(analysis, dockerFiles, projectFiles);
      const results = await testRunner.runTests();
      setTestSuites(results);
      
      const totalErrors = results.reduce((sum, suite) => sum + suite.errors.length, 0);
      const totalWarnings = results.reduce((sum, suite) => sum + suite.warnings.length, 0);
      
      if (totalErrors === 0) {
        logger.success('testing', `All tests passed! ${totalWarnings} warnings found.`);
      } else {
        logger.warning('testing', `Tests completed with ${totalErrors} errors and ${totalWarnings} warnings`);
      }
    } catch (error) {
      logger.error('testing', 'Test execution failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsRunning(false);
    }
  };

  const fixErrors = async () => {
    setIsFixing(true);
    
    try {
      const testRunner = new CodeTestRunner(analysis, dockerFiles, projectFiles);
      const allErrors = testSuites.flatMap(suite => suite.errors.filter(error => error.fixable));
      
      if (allErrors.length === 0) {
        logger.info('testing', 'No fixable errors found');
        return;
      }

      logger.info('testing', `Attempting to fix ${allErrors.length} errors`);
      const generatedFixes = await testRunner.fixErrors(allErrors);
      setFixes(generatedFixes);
      
      // Apply fixes to project files
      const updatedFiles = new Map(projectFiles);
      generatedFixes.forEach(fix => {
        updatedFiles.set(fix.file, fix.fixed);
      });
      
      onFilesUpdated(updatedFiles);
      
      logger.success('testing', `Applied ${generatedFixes.length} fixes`);
      
      // Re-run tests to verify fixes
      setTimeout(() => {
        runTests();
      }, 1000);
      
    } catch (error) {
      logger.error('testing', 'Error fixing failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsFixing(false);
    }
  };

  const getStatusIcon = (status: TestSuite['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'running':
        return <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />;
      case 'skipped':
        return <Info className="h-5 w-5 text-gray-600" />;
      default:
        return <Info className="h-5 w-5 text-gray-600" />;
    }
  };

  const getTypeIcon = (type: TestSuite['type']) => {
    switch (type) {
      case 'syntax':
        return <FileText className="h-4 w-4" />;
      case 'lint':
        return <Bug className="h-4 w-4" />;
      case 'build':
        return <Zap className="h-4 w-4" />;
      case 'unit':
        return <CheckCircle className="h-4 w-4" />;
      case 'integration':
        return <Shield className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'text-red-600 bg-red-50';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50';
      case 'info':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const totalErrors = testSuites.reduce((sum, suite) => sum + suite.errors.length, 0);
  const totalWarnings = testSuites.reduce((sum, suite) => sum + suite.warnings.length, 0);
  const fixableErrors = testSuites.flatMap(suite => suite.errors.filter(error => error.fixable)).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center mb-2">
              <Play className="h-6 w-6 text-purple-600 mr-2" />
              <h2 className="text-xl font-bold text-gray-900">Code Testing & Validation</h2>
            </div>
            <p className="text-gray-600">
              Run comprehensive tests and automatically fix common issues
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {fixableErrors > 0 && (
              <button
                onClick={fixErrors}
                disabled={isFixing || isRunning}
                className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
              >
                {isFixing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Fixing...
                  </>
                ) : (
                  <>
                    <Wrench className="h-4 w-4 mr-2" />
                    Fix {fixableErrors} Errors
                  </>
                )}
              </button>
            )}
            <button
              onClick={runTests}
              disabled={isRunning}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Running Tests...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Tests
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Test Results Summary */}
      {testSuites.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{testSuites.length}</div>
            <div className="text-sm text-gray-600">Test Suites</div>
          </div>
          <div className="bg-white rounded-lg border p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{totalErrors}</div>
            <div className="text-sm text-gray-600">Errors</div>
          </div>
          <div className="bg-white rounded-lg border p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{totalWarnings}</div>
            <div className="text-sm text-gray-600">Warnings</div>
          </div>
          <div className="bg-white rounded-lg border p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{fixableErrors}</div>
            <div className="text-sm text-gray-600">Auto-fixable</div>
          </div>
        </div>
      )}

      {/* Applied Fixes */}
      {fixes.length > 0 && (
        <div className="bg-green-50 rounded-lg p-4">
          <h3 className="font-semibold text-green-900 mb-3">Applied Fixes ({fixes.length})</h3>
          <div className="space-y-2">
            {fixes.map((fix, index) => (
              <div key={index} className="flex items-center text-sm">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2 flex-shrink-0" />
                <span className="font-medium text-green-800">{fix.file}:</span>
                <span className="text-green-700 ml-1">{fix.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test Suites */}
      {testSuites.length > 0 && (
        <div className="space-y-4">
          {testSuites.map((suite) => (
            <div key={suite.id} className="bg-white rounded-lg border overflow-hidden">
              <div 
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setSelectedSuite(selectedSuite === suite.id ? null : suite.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(suite.status)}
                    <div className="flex items-center">
                      {getTypeIcon(suite.type)}
                      <h3 className="ml-2 font-semibold text-gray-900">{suite.name}</h3>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 text-sm">
                    {suite.errors.length > 0 && (
                      <span className="text-red-600">{suite.errors.length} errors</span>
                    )}
                    {suite.warnings.length > 0 && (
                      <span className="text-yellow-600">{suite.warnings.length} warnings</span>
                    )}
                    {suite.duration && (
                      <span className="text-gray-500">{suite.duration}ms</span>
                    )}
                  </div>
                </div>
              </div>

              {selectedSuite === suite.id && (
                <div className="border-t bg-gray-50">
                  {/* Errors */}
                  {suite.errors.length > 0 && (
                    <div className="p-4">
                      <h4 className="font-medium text-red-900 mb-3">Errors ({suite.errors.length})</h4>
                      <div className="space-y-2">
                        {suite.errors.map((error) => (
                          <div key={error.id} className="bg-white rounded border-l-4 border-red-400 p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="font-medium text-gray-900">{error.file}</span>
                                  {error.line && (
                                    <span className="text-sm text-gray-500">Line {error.line}</span>
                                  )}
                                  <span className={`px-2 py-1 text-xs rounded ${getSeverityColor(error.severity)}`}>
                                    {error.severity}
                                  </span>
                                  {error.fixable && (
                                    <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                                      Auto-fixable
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-700">{error.message}</p>
                                {error.suggestedFix && (
                                  <p className="text-xs text-blue-600 mt-1">💡 {error.suggestedFix}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Warnings */}
                  {suite.warnings.length > 0 && (
                    <div className="p-4 border-t">
                      <h4 className="font-medium text-yellow-900 mb-3">Warnings ({suite.warnings.length})</h4>
                      <div className="space-y-2">
                        {suite.warnings.map((warning) => (
                          <div key={warning.id} className="bg-white rounded border-l-4 border-yellow-400 p-3">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-medium text-gray-900">{warning.file}</span>
                              {warning.line && (
                                <span className="text-sm text-gray-500">Line {warning.line}</span>
                              )}
                              {warning.rule && (
                                <span className="text-xs text-gray-500">({warning.rule})</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-700">{warning.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggestions */}
                  {suite.suggestions.length > 0 && (
                    <div className="p-4 border-t">
                      <h4 className="font-medium text-blue-900 mb-3">Suggestions</h4>
                      <ul className="space-y-1">
                        {suite.suggestions.map((suggestion, index) => (
                          <li key={index} className="flex items-start text-sm text-blue-800">
                            <Info className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {testSuites.length === 0 && !isRunning && (
        <div className="text-center py-12 text-gray-500">
          <Play className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Ready to run tests</p>
          <p className="text-sm mt-2">Click "Run Tests" to validate your code and Docker configuration</p>
        </div>
      )}
    </div>
  );
}