import React from 'react';
import { Package, Code, Database, Wrench, TestTube, Palette, CheckCircle } from 'lucide-react';
import type { StackAnalysis } from '../types/analysis';

interface StackAnalysisProps {
  analysis: StackAnalysis;
}

export function StackAnalysisComponent({ analysis }: StackAnalysisProps) {
  const {
    primaryLanguage,
    framework,
    packageManager,
    buildTool,
    testFramework,
    database,
    dependencies,
    devDependencies,
    linting,
    styling
  } = analysis;

  const InfoCard = ({ icon: Icon, title, children }: { icon: any, title: string, children: React.ReactNode }) => (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center mb-3">
        <Icon className="h-5 w-5 text-blue-600 mr-2" />
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>
      {children}
    </div>
  );

  const Badge = ({ children, color = 'blue' }: { children: React.ReactNode, color?: string }) => (
    <span className={`inline-block px-2 py-1 text-xs rounded-full mr-1 mb-1 ${
      color === 'blue' ? 'bg-blue-100 text-blue-800' :
      color === 'green' ? 'bg-green-100 text-green-800' :
      color === 'purple' ? 'bg-purple-100 text-purple-800' :
      color === 'orange' ? 'bg-orange-100 text-orange-800' :
      color === 'pink' ? 'bg-pink-100 text-pink-800' :
      color === 'indigo' ? 'bg-indigo-100 text-indigo-800' :
      'bg-gray-100 text-gray-800'
    }`}>
      {children}
    </span>
  );

  // Debug log to check analysis data
  console.log('StackAnalysis component received:', analysis);
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <CheckCircle className="h-6 w-6 text-green-600 mr-2" />
          <h2 className="text-xl font-bold text-gray-900">Stack Analysis Complete</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Language:</span>
            <p className="font-semibold text-gray-900 capitalize">{primaryLanguage || 'Unknown'}</p>
          </div>
          {framework && (
            <div>
              <span className="text-gray-600">Framework:</span>
              <p className="font-semibold text-gray-900">{framework}</p>
            </div>
          )}
          {packageManager && (
            <div>
              <span className="text-gray-600">Package Manager:</span>
              <p className="font-semibold text-gray-900">{packageManager}</p>
            </div>
          )}
          {runtime && (
            <div>
              <span className="text-gray-600">Runtime:</span>
              <p className="font-semibold text-gray-900">{runtime}</p>
            </div>
          )}
          <div>
            <span className="text-gray-600">Dependencies:</span>
            <p className="font-semibold text-gray-900">{dependencies.length + devDependencies.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InfoCard icon={Package} title="Runtime Dependencies">
          <div className="max-h-48 overflow-y-auto">
            {dependencies.length > 0 ? (
              <div className="space-y-2">
                {dependencies.slice(0, 10).map((dep, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span className="font-medium">{dep.name}</span>
                    <div className="flex items-center space-x-2">
                      <Badge color="green">{dep.category}</Badge>
                      {dep.version && <span className="text-gray-500">{dep.version}</span>}
                    </div>
                  </div>
                ))}
                {dependencies.length > 10 && (
                  <p className="text-sm text-gray-500 text-center">
                    ... and {dependencies.length - 10} more
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No runtime dependencies detected</p>
            )}
          </div>
        </InfoCard>

        <InfoCard icon={Code} title="Development Dependencies">
          <div className="max-h-48 overflow-y-auto">
            {devDependencies.length > 0 ? (
              <div className="space-y-2">
                {devDependencies.slice(0, 10).map((dep, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span className="font-medium">{dep.name}</span>
                    <div className="flex items-center space-x-2">
                      <Badge color="purple">{dep.category}</Badge>
                      {dep.version && <span className="text-gray-500">{dep.version}</span>}
                    </div>
                  </div>
                ))}
                {devDependencies.length > 10 && (
                  <p className="text-sm text-gray-500 text-center">
                    ... and {devDependencies.length - 10} more
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No dev dependencies detected</p>
            )}
          </div>
        </InfoCard>

        <InfoCard icon={Wrench} title="Build Tools & Testing">
          <div className="space-y-3">
            {buildTool && (
              <div>
                <span className="text-sm text-gray-600">Build Tool:</span>
                <div className="mt-1">
                  <Badge color="orange">{buildTool}</Badge>
                </div>
              </div>
            )}
            {testFramework && (
              <div>
                <span className="text-sm text-gray-600">Testing:</span>
                <div className="mt-1">
                  <Badge color="green">{testFramework}</Badge>
                </div>
              </div>
            )}
            {linting && linting.length > 0 && (
              <div>
                <span className="text-sm text-gray-600">Linting:</span>
                <div className="mt-1">
                  {linting.map((tool, index) => (
                    <Badge key={index} color="blue">{tool}</Badge>
                  ))}
                </div>
              </div>
            )}
            {styling && styling.length > 0 && (
              <div>
                <span className="text-sm text-gray-600">Styling:</span>
                <div className="mt-1">
                  {styling.map((tool, index) => (
                    <Badge key={index} color="pink">{tool}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </InfoCard>

        <InfoCard icon={Database} title="Database & Services">
          {database && database.length > 0 ? (
            <div className="space-y-2">
              <span className="text-sm text-gray-600">Detected Databases:</span>
              <div>
              {database.map((db, index) => (
                <Badge key={index} color="indigo">{db}</Badge>
              ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No database services detected</p>
          )}
        </InfoCard>
      </div>

      {/* Additional Information */}
      {(analysis.scripts && Object.keys(analysis.scripts).length > 0) && (
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center mb-3">
            <Code className="h-5 w-5 text-green-600 mr-2" />
            <h3 className="font-semibold text-gray-900">Available Scripts</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {Object.entries(analysis.scripts).map(([name, command]) => (
              <div key={name} className="bg-gray-50 rounded p-2">
                <div className="font-medium text-sm text-gray-900">{name}</div>
                <div className="text-xs text-gray-600 font-mono">{command}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}