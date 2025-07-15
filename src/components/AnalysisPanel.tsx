import React from 'react';
import { 
  Code, 
  Package, 
  Layers, 
  Database, 
  Cloud, 
  Wrench, 
  Lightbulb,
  TrendingUp,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { RepositoryAnalysis } from '../services/llmAnalysis';

interface AnalysisPanelProps {
  analysis: RepositoryAnalysis;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ analysis }) => {
  const { techStack, dependencies, summary, recommendations } = analysis;

  const TechStackSection = ({ title, items, icon: Icon, color }: { 
    title: string; 
    items: string[]; 
    icon: React.ComponentType<any>; 
    color: string;
  }) => (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center space-x-2 mb-3">
        <Icon className={`w-5 h-5 ${color}`} />
        <h4 className="font-semibold text-gray-900">{title}</h4>
        <span className="text-sm text-gray-500">({items.length})</span>
      </div>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium"
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-sm">None detected</p>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">Project Summary</h3>
            <p className="text-blue-800">{summary}</p>
          </div>
        </div>
      </div>

      {/* Tech Stack Analysis */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <Layers className="w-5 h-5" />
          <span>Technology Stack</span>
          {techStack.confidence > 0 && (
            <span className="text-sm text-gray-500">
              (Confidence: {Math.round(techStack.confidence * 100)}%)
            </span>
          )}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TechStackSection
            title="Languages"
            items={techStack.languages}
            icon={Code}
            color="text-green-600"
          />
          <TechStackSection
            title="Frameworks"
            items={techStack.frameworks}
            icon={Layers}
            color="text-blue-600"
          />
          <TechStackSection
            title="Libraries"
            items={techStack.libraries}
            icon={Package}
            color="text-purple-600"
          />
          <TechStackSection
            title="Tools"
            items={techStack.tools}
            icon={Wrench}
            color="text-orange-600"
          />
          <TechStackSection
            title="Databases"
            items={techStack.databases}
            icon={Database}
            color="text-red-600"
          />
          <TechStackSection
            title="Deployment"
            items={techStack.deployment}
            icon={Cloud}
            color="text-indigo-600"
          />
        </div>
      </div>

      {/* Dependencies */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <Package className="w-5 h-5" />
          <span>Dependencies</span>
        </h3>
        
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Package Manager:</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                  {dependencies.packageManager}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Total:</span>
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm font-medium">
                  {dependencies.totalDependencies}
                </span>
              </div>
            </div>
          </div>

          {dependencies.dependencies.length > 0 ? (
            <div className="space-y-2">
              {dependencies.dependencies.slice(0, 10).map((dep, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center space-x-3">
                    <span className="font-medium text-gray-900">{dep.name}</span>
                    {dep.version && (
                      <span className="text-sm text-gray-500">{dep.version}</span>
                    )}
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      dep.type === 'runtime' ? 'bg-green-100 text-green-800' :
                      dep.type === 'dev' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {dep.type}
                    </span>
                  </div>
                  {dep.description && (
                    <span className="text-sm text-gray-500 max-w-xs truncate">
                      {dep.description}
                    </span>
                  )}
                </div>
              ))}
              {dependencies.dependencies.length > 10 && (
                <p className="text-sm text-gray-500 text-center pt-2">
                  ... and {dependencies.dependencies.length - 10} more dependencies
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No dependencies found</p>
          )}
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <Lightbulb className="w-5 h-5" />
            <span>Recommendations</span>
          </h3>
          
          <div className="space-y-3">
            {recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <CheckCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <p className="text-yellow-800">{recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};