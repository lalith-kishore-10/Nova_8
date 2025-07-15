import React from 'react';
import { 
  Brain, 
  Package, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  Code, 
  Database, 
  Cloud, 
  Tool,
  Shield,
  Clock,
  BarChart3
} from 'lucide-react';
import { RepositoryAnalysis } from '../types/analysis';

interface AnalysisPanelProps {
  analysis: RepositoryAnalysis | null;
  loading: boolean;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ analysis, loading }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Brain className="w-6 h-6 text-purple-600 animate-pulse" />
          <h3 className="text-lg font-semibold text-gray-900">AI Analysis</h3>
        </div>
        <div className="space-y-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Brain className="w-6 h-6 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">AI Analysis</h3>
        </div>
        <div className="text-center py-8">
          <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Select a repository to start AI analysis</p>
        </div>
      </div>
    );
  }

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'Low': return 'text-green-600 bg-green-50';
      case 'Medium': return 'text-yellow-600 bg-yellow-50';
      case 'High': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getMaintainabilityColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center space-x-3">
            <Code className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Project Type</p>
              <p className="font-semibold text-gray-900">{analysis.projectType}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center space-x-3">
            <BarChart3 className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-sm text-gray-600">Complexity</p>
              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getComplexityColor(analysis.complexity)}`}>
                {analysis.complexity}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Maintainability</p>
              <p className={`font-semibold ${getMaintainabilityColor(analysis.maintainability)}`}>
                {analysis.maintainability}/100
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tech Stack Analysis */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Brain className="w-6 h-6 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">Tech Stack Analysis</h3>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {Math.round(analysis.techStack.confidence * 100)}% confidence
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2 flex items-center space-x-2">
              <Code className="w-4 h-4" />
              <span>Languages</span>
            </h4>
            <div className="space-y-1">
              {analysis.techStack.primaryLanguages.map((lang, index) => (
                <span key={index} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-1 mb-1">
                  {lang}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2 flex items-center space-x-2">
              <Package className="w-4 h-4" />
              <span>Frameworks</span>
            </h4>
            <div className="space-y-1">
              {analysis.techStack.frameworks.map((framework, index) => (
                <span key={index} className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded mr-1 mb-1">
                  {framework}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2 flex items-center space-x-2">
              <Tool className="w-4 h-4" />
              <span>Build Tools</span>
            </h4>
            <div className="space-y-1">
              {analysis.techStack.buildTools.map((tool, index) => (
                <span key={index} className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded mr-1 mb-1">
                  {tool}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2 flex items-center space-x-2">
              <Database className="w-4 h-4" />
              <span>Databases</span>
            </h4>
            <div className="space-y-1">
              {analysis.techStack.databases.length > 0 ? (
                analysis.techStack.databases.map((db, index) => (
                  <span key={index} className="inline-block bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded mr-1 mb-1">
                    {db}
                  </span>
                ))
              ) : (
                <span className="text-gray-500 text-sm">None detected</span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">AI Summary</h4>
          <p className="text-gray-700 text-sm leading-relaxed">{analysis.techStack.summary}</p>
        </div>
      </div>

      {/* Dependencies Analysis */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Package className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Dependencies Analysis</h3>
          </div>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-gray-600">Production: {analysis.dependencies.production.length}</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
              <span className="text-gray-600">Development: {analysis.dependencies.development.length}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <Package className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-600">{analysis.dependencies.totalCount}</p>
                <p className="text-sm text-blue-700">Total Dependencies</p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <Clock className="w-8 h-8 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold text-yellow-600">{analysis.dependencies.outdatedCount}</p>
                <p className="text-sm text-yellow-700">Outdated Packages</p>
              </div>
            </div>
          </div>

          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <Shield className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-red-600">{analysis.dependencies.securityIssues}</p>
                <p className="text-sm text-red-700">Security Issues</p>
              </div>
            </div>
          </div>
        </div>

        {/* Top Dependencies */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Key Production Dependencies</h4>
          <div className="space-y-2">
            {analysis.dependencies.production.slice(0, 8).map((dep, index) => (
              <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                <div className="flex items-center space-x-3">
                  <Package className="w-4 h-4 text-gray-500" />
                  <span className="font-medium text-gray-900">{dep.name}</span>
                  <span className="text-sm text-gray-500">{dep.version}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {dep.isOutdated && (
                    <span className="flex items-center space-x-1 text-yellow-600">
                      <Clock className="w-3 h-3" />
                      <span className="text-xs">Outdated</span>
                    </span>
                  )}
                  {dep.hasSecurityIssue && (
                    <span className="flex items-center space-x-1 text-red-600">
                      <AlertTriangle className="w-3 h-3" />
                      <span className="text-xs">Security</span>
                    </span>
                  )}
                  {!dep.isOutdated && !dep.hasSecurityIssue && (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mt-6">
          <h4 className="font-medium text-gray-900 mb-2">Dependency Insights</h4>
          <p className="text-gray-700 text-sm leading-relaxed">{analysis.dependencies.summary}</p>
        </div>
      </div>

      {/* Analysis Timestamp */}
      <div className="text-center text-xs text-gray-500">
        Analysis completed at {new Date(analysis.analyzedAt).toLocaleString()}
      </div>
    </div>
  );
};
</parameter>