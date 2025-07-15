import React, { useState } from 'react';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Info, 
  Shield, 
  Zap, 
  Settings, 
  Package,
  FileText,
  Play,
  Clock,
  Target
} from 'lucide-react';
import type { ValidationResult, ValidationCheck, TestResult } from '../types/validation';

interface ValidationReportProps {
  validation: ValidationResult;
  testResults?: TestResult[];
}

export function ValidationReport({ validation, testResults }: ValidationReportProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'checks' | 'docker' | 'tests'>('overview');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'fail':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-600" />;
      default:
        return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'security':
        return <Shield className="h-4 w-4" />;
      case 'performance':
        return <Zap className="h-4 w-4" />;
      case 'configuration':
        return <Settings className="h-4 w-4" />;
      case 'dependencies':
        return <Package className="h-4 w-4" />;
      case 'structure':
        return <FileText className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const groupChecksByCategory = (checks: ValidationCheck[]) => {
    return checks.reduce((acc, check) => {
      if (!acc[check.category]) {
        acc[check.category] = [];
      }
      acc[check.category].push(check);
      return acc;
    }, {} as Record<string, ValidationCheck[]>);
  };

  const CheckCard = ({ check }: { check: ValidationCheck }) => (
    <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          {getStatusIcon(check.status)}
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">{check.name}</h4>
            <p className="text-sm text-gray-600 mt-1">{check.message}</p>
            {check.details && (
              <p className="text-xs text-gray-500 mt-2">{check.details}</p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {getCategoryIcon(check.category)}
          <span className={`px-2 py-1 text-xs rounded-full ${
            check.severity === 'critical' ? 'bg-red-100 text-red-800' :
            check.severity === 'high' ? 'bg-orange-100 text-orange-800' :
            check.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {check.severity}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`rounded-lg p-6 ${getScoreBgColor(validation.score)}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center mb-2">
              <Target className="h-6 w-6 text-gray-700 mr-2" />
              <h2 className="text-xl font-bold text-gray-900">Validation Report</h2>
            </div>
            <p className="text-gray-600">
              Repository health score: <span className={`font-bold ${getScoreColor(validation.score)}`}>
                {validation.score}/100
              </span>
            </p>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold ${getScoreColor(validation.score)}`}>
              {validation.score}
            </div>
            <div className="text-sm text-gray-600">
              {validation.isValid ? 'Healthy' : 'Needs Attention'}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: Target },
            { id: 'checks', label: 'Detailed Checks', icon: CheckCircle },
            { id: 'docker', label: 'Docker Validation', icon: Package },
            { id: 'tests', label: 'Test Results', icon: Play }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="h-4 w-4 mr-2" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(
              validation.checks.reduce((acc, check) => {
                acc[check.status] = (acc[check.status] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            ).map(([status, count]) => (
              <div key={status} className="bg-white rounded-lg border p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  {getStatusIcon(status)}
                </div>
                <div className="text-2xl font-bold text-gray-900">{count}</div>
                <div className="text-sm text-gray-600 capitalize">{status}</div>
              </div>
            ))}
          </div>

          {/* Recommendations */}
          {validation.recommendations.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-3">Recommendations</h3>
              <ul className="space-y-2">
                {validation.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start">
                    <Info className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-blue-800 text-sm">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {activeTab === 'checks' && (
        <div className="space-y-6">
          {Object.entries(groupChecksByCategory(validation.checks)).map(([category, checks]) => (
            <div key={category} className="space-y-4">
              <div className="flex items-center">
                {getCategoryIcon(category)}
                <h3 className="ml-2 text-lg font-semibold text-gray-900 capitalize">
                  {category} ({checks.length})
                </h3>
              </div>
              <div className="space-y-3">
                {checks.map((check, index) => (
                  <CheckCard key={index} check={check} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'docker' && validation.dockerValidation && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Build Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Dockerfile Valid:</span>
                  <span className={validation.dockerValidation.dockerfileValid ? 'text-green-600' : 'text-red-600'}>
                    {validation.dockerValidation.dockerfileValid ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Buildable:</span>
                  <span className={validation.dockerValidation.buildable ? 'text-green-600' : 'text-red-600'}>
                    {validation.dockerValidation.buildable ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Estimated Size:</span>
                  <span className="text-gray-900">{validation.dockerValidation.estimatedSize}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Build Time:</span>
                  <span className="text-gray-900">{validation.dockerValidation.buildTime}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Security Issues</h3>
              {validation.dockerValidation.securityIssues.length > 0 ? (
                <div className="space-y-2">
                  {validation.dockerValidation.securityIssues.map((issue, index) => (
                    <div key={index} className="border-l-4 border-yellow-400 pl-3">
                      <p className="text-sm font-medium text-gray-900">{issue.description}</p>
                      <p className="text-xs text-gray-600 mt-1">{issue.fix}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600">No security issues detected</p>
              )}
            </div>
          </div>

          {validation.dockerValidation.optimizations.length > 0 && (
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-3">Optimization Suggestions</h3>
              <ul className="space-y-1">
                {validation.dockerValidation.optimizations.map((opt, index) => (
                  <li key={index} className="flex items-start">
                    <Zap className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-green-800 text-sm">{opt}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {activeTab === 'tests' && (
        <div className="space-y-6">
          {testResults && testResults.length > 0 ? (
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <div key={index} className="bg-white rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      {getStatusIcon(result.status)}
                      <h3 className="ml-2 font-semibold text-gray-900 capitalize">
                        {result.testType} Tests
                      </h3>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-1" />
                      {result.duration}ms
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{result.output}</p>
                  {result.coverage && (
                    <div className="flex items-center text-sm">
                      <span className="text-gray-600 mr-2">Coverage:</span>
                      <span className="font-medium text-gray-900">{result.coverage}%</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Play className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No test results available</p>
              <p className="text-sm mt-2">Run validation to see test results</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}