import React, { useState, useEffect } from 'react';
import { Download, Copy, Check, FileText, Package, Play, Shield, Zap, TestTube } from 'lucide-react';
import type { GeneratedFiles, DockerTestResult } from '../types/analysis';

interface DockerFilesProps {
  files: GeneratedFiles;
  repoName: string;
}

export function DockerFiles({ files, repoName }: DockerFilesProps) {
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<DockerTestResult | null>(null);
  const [isTestingDocker, setIsTestingDocker] = useState(false);
  const [activeTab, setActiveTab] = useState<'files' | 'test' | 'health'>('files');

  const copyToClipboard = async (content: string, fileName: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedFile(fileName);
      setTimeout(() => setCopiedFile(null), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const downloadFile = (content: string, fileName: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAll = () => {
    Object.entries(files).forEach(([key, content]) => {
      if (content && typeof content === 'string') {
        const fileName = key === 'dockerCompose' ? 'docker-compose.yml' : 
                        key === 'dockerignore' ? '.dockerignore' :
                        key === 'readme' ? 'DOCKER_README.md' : 
                        key === 'buildScript' ? 'build.sh' :
                        'Dockerfile';
        downloadFile(content, fileName);
      }
    });
  };

  const testDockerConfiguration = async () => {
    setIsTestingDocker(true);
    try {
      // First check if backend is available
      const statusResponse = await fetch('http://localhost:5001/ollama-status', {
        signal: AbortSignal.timeout(5000)
      });
      
      if (!statusResponse.ok) {
        throw new Error('Backend server not running. Please start with: npm run backend');
      }
      
      const statusData = await statusResponse.json();
      if (statusData.status !== 'connected') {
        throw new Error('Ollama not connected. Please start Ollama with: ollama serve');
      }
      
      const response = await fetch('http://localhost:5001/test-docker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(30000),
        body: JSON.stringify({
          dockerfile: files.dockerfile,
          dockerCompose: files.dockerCompose,
          projectName: repoName
        })
      });

      if (response.ok) {
        const data = await response.json();
        setTestResults(data.testResults);
        setActiveTab('test');
      } else {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || 'Docker test failed');
      }
    } catch (error) {
      console.error('Docker test error:', error);
      alert(`Docker test failed: ${error.message}`);
    } finally {
      setIsTestingDocker(false);
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

  const FileCard = ({ 
    title, 
    fileName, 
    content, 
    icon: Icon 
  }: { 
    title: string; 
    fileName: string; 
    content: string; 
    icon: any;
  }) => (
    <div className="bg-white rounded-lg border">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center">
          <Icon className="h-5 w-5 text-blue-600 mr-2" />
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <span className="ml-2 text-sm text-gray-500">({fileName})</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => copyToClipboard(content, fileName)}
            className="flex items-center px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            {copiedFile === fileName ? (
              <>
                <Check className="h-4 w-4 mr-1 text-green-600" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </>
            )}
          </button>
          <button
            onClick={() => downloadFile(content, fileName)}
            className="flex items-center px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
          >
            <Download className="h-4 w-4 mr-1" />
            Download
          </button>
        </div>
      </div>
      <div className="p-4">
        <pre className="bg-gray-50 p-4 rounded-lg overflow-auto text-sm font-mono whitespace-pre-wrap max-h-96">
          <code>{content}</code>
        </pre>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center mb-2">
              <Package className="h-6 w-6 text-green-600 mr-2" />
              <h2 className="text-xl font-bold text-gray-900">Docker Configuration Generated</h2>
            </div>
            <p className="text-gray-600">
              Ready-to-use Docker files for <span className="font-semibold">{repoName}</span>
            </p>
            {files.estimatedSize && (
              <p className="text-sm text-gray-500 mt-1">
                Estimated size: {files.estimatedSize} • Build time: {files.buildTime || '~60s'}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={testDockerConfiguration}
              disabled={isTestingDocker}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isTestingDocker ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Testing...
                </>
              ) : (
                <>
                  <TestTube className="h-4 w-4 mr-2" />
                  Test Config
                </>
              )}
            </button>
            <button
              onClick={downloadAll}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              Download All
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b">
        <nav className="flex space-x-8">
          {[
            { id: 'files', label: 'Docker Files', icon: FileText },
            { id: 'test', label: 'Test Results', icon: TestTube, disabled: !testResults },
            { id: 'health', label: 'Health Check', icon: Shield, disabled: !files.healthCheck }
          ].map(({ id, label, icon: Icon, disabled }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              disabled={disabled}
              className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : disabled
                  ? 'border-transparent text-gray-400 cursor-not-allowed'
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
      {activeTab === 'files' && (
        <div className="space-y-6">
          <FileCard
            title="Dockerfile"
            fileName="Dockerfile"
            content={files.dockerfile}
            icon={FileText}
          />

          {files.dockerCompose && (
            <FileCard
              title="Docker Compose"
              fileName="docker-compose.yml"
              content={files.dockerCompose}
              icon={Package}
            />
          )}

          <FileCard
            title="Docker Ignore"
            fileName=".dockerignore"
            content={files.dockerignore}
            icon={FileText}
          />

          {files.buildScript && (
            <FileCard
              title="Build Script"
              fileName="build.sh"
              content={files.buildScript}
              icon={Play}
            />
          )}

          <FileCard
            title="Docker README"
            fileName="DOCKER_README.md"
            content={files.readme}
            icon={FileText}
          />

          {/* Recommendations */}
          {(files.securityRecommendations || files.optimizations) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {files.securityRecommendations && (
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <Shield className="h-5 w-5 text-red-600 mr-2" />
                    <h3 className="font-semibold text-red-900">Security Recommendations</h3>
                  </div>
                  <ul className="space-y-1">
                    {files.securityRecommendations.map((rec, index) => (
                      <li key={index} className="text-sm text-red-800">• {rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              {files.optimizations && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <Zap className="h-5 w-5 text-blue-600 mr-2" />
                    <h3 className="font-semibold text-blue-900">Optimizations Applied</h3>
                  </div>
                  <ul className="space-y-1">
                    {files.optimizations.map((opt, index) => (
                      <li key={index} className="text-sm text-blue-800">• {opt}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'test' && testResults && (
        <div className="space-y-6">
          {/* Test Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`rounded-lg border p-4 ${getScoreBgColor(testResults.validation.isValid ? 100 : 0)}`}>
              <div className="text-center">
                <div className={`text-2xl font-bold ${getScoreColor(testResults.validation.isValid ? 100 : 0)}`}>
                  {testResults.validation.isValid ? '✓' : '✗'}
                </div>
                <div className="text-sm text-gray-600">Validation</div>
              </div>
            </div>
            <div className={`rounded-lg border p-4 ${getScoreBgColor(testResults.security.score)}`}>
              <div className="text-center">
                <div className={`text-2xl font-bold ${getScoreColor(testResults.security.score)}`}>
                  {testResults.security.score}
                </div>
                <div className="text-sm text-gray-600">Security</div>
              </div>
            </div>
            <div className={`rounded-lg border p-4 ${getScoreBgColor(testResults.performance.score)}`}>
              <div className="text-center">
                <div className={`text-2xl font-bold ${getScoreColor(testResults.performance.score)}`}>
                  {testResults.performance.score}
                </div>
                <div className="text-sm text-gray-600">Performance</div>
              </div>
            </div>
            <div className={`rounded-lg border p-4 ${getScoreBgColor(testResults.bestPractices.score)}`}>
              <div className="text-center">
                <div className={`text-2xl font-bold ${getScoreColor(testResults.bestPractices.score)}`}>
                  {testResults.bestPractices.score}
                </div>
                <div className="text-sm text-gray-600">Best Practices</div>
              </div>
            </div>
          </div>

          {/* Detailed Results */}
          <div className="space-y-4">
            {testResults.security.vulnerabilities.length > 0 && (
              <div className="bg-red-50 rounded-lg p-4">
                <h3 className="font-semibold text-red-900 mb-3">Security Vulnerabilities</h3>
                <div className="space-y-2">
                  {testResults.security.vulnerabilities.map((vuln, index) => (
                    <div key={index} className="border-l-4 border-red-400 pl-3">
                      <p className="text-sm font-medium text-red-800">{vuln.description}</p>
                      <p className="text-xs text-red-600 mt-1">{vuln.fix}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {testResults.performance.issues.length > 0 && (
              <div className="bg-yellow-50 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-900 mb-3">Performance Issues</h3>
                <ul className="space-y-1">
                  {testResults.performance.issues.map((issue, index) => (
                    <li key={index} className="text-sm text-yellow-800">• {issue}</li>
                  ))}
                </ul>
              </div>
            )}

            {testResults.testCommands.length > 0 && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-3">Test Commands</h3>
                <div className="space-y-2">
                  {testResults.testCommands.map((cmd, index) => (
                    <div key={index} className="bg-white rounded p-3">
                      <code className="text-sm font-mono text-blue-800">{cmd.command}</code>
                      <p className="text-xs text-gray-600 mt-1">{cmd.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'health' && files.healthCheck && (
        <div className="space-y-6">
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <Shield className="h-5 w-5 text-green-600 mr-2" />
              <h3 className="font-semibold text-green-900">Health Check Configuration</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-green-800 mb-2">Docker Health Check</h4>
                <div className="bg-white rounded p-3 text-sm">
                  <p><strong>Command:</strong> {files.healthCheck.dockerHealthCheck.command}</p>
                  <p><strong>Interval:</strong> {files.healthCheck.dockerHealthCheck.interval}</p>
                  <p><strong>Timeout:</strong> {files.healthCheck.dockerHealthCheck.timeout}</p>
                  <p><strong>Retries:</strong> {files.healthCheck.dockerHealthCheck.retries}</p>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-green-800 mb-2">Endpoint</h4>
                <div className="bg-white rounded p-3 text-sm">
                  <p><strong>Health Endpoint:</strong> {files.healthCheck.endpoint}</p>
                  <p className="text-gray-600 mt-2">
                    Access health status at this endpoint to monitor application health
                  </p>
                </div>
              </div>
            </div>
          </div>

          {files.healthCheck.applicationHealthCheck && (
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Application Health Checks</h3>
              <div className="space-y-2">
                {files.healthCheck.applicationHealthCheck.checks.map((check, index) => (
                  <div key={index} className="border rounded p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{check.name}</span>
                      <span className="text-sm text-gray-500">{check.type}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{check.command}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-blue-50 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Quick Start Instructions</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <p>1. Download all files to your project root directory</p>
          <p>2. Build the Docker image: <code className="bg-blue-100 px-1 rounded">docker build -t {repoName.toLowerCase()} .</code></p>
          <p>3. Run the container: <code className="bg-blue-100 px-1 rounded">docker run -p 3000:3000 {repoName.toLowerCase()}</code></p>
          <p>4. Or use Docker Compose: <code className="bg-blue-100 px-1 rounded">docker-compose up</code></p>
          <p>5. Check health: <code className="bg-blue-100 px-1 rounded">curl http://localhost:3000/health</code></p>
        </div>
      </div>
    </div>
  );
}