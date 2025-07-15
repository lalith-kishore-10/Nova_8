import React, { useState } from 'react';
import { RepoInput } from './components/RepoInput';
import { RepoHeader } from './components/RepoHeader';
import { FileTree } from './components/FileTree';
import { FileViewer } from './components/FileViewer';
import { StackAnalysisComponent } from './components/StackAnalysis';
import { DockerFiles } from './components/DockerFiles';
import { LoadingSpinner } from './components/LoadingSpinner';
import { fetchRepository, fetchRepositoryTree, fetchFileContent } from './utils/github';
import { StackAnalyzer } from './utils/stackAnalyzer';
import { DockerGenerator } from './utils/dockerGenerator';
import type { GitHubRepo, GitHubTreeItem } from './types/github';
import type { StackAnalysis, GeneratedFiles } from './types/analysis';

type AppState = 'input' | 'loading' | 'repository' | 'file-loading' | 'analyzing' | 'analysis-complete';

function App() {
  const [state, setState] = useState<AppState>('input');
  const [error, setError] = useState<string | null>(null);
  const [repo, setRepo] = useState<GitHubRepo | null>(null);
  const [files, setFiles] = useState<GitHubTreeItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<GitHubTreeItem | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [stackAnalysis, setStackAnalysis] = useState<StackAnalysis | null>(null);
  const [dockerFiles, setDockerFiles] = useState<GeneratedFiles | null>(null);
  const [activeTab, setActiveTab] = useState<'files' | 'analysis' | 'docker'>('files');

  const handleRepoSubmit = async (owner: string, repoName: string) => {
    setState('loading');
    setError(null);

    try {
      const [repoData, treeData] = await Promise.all([
        fetchRepository(owner, repoName),
        fetchRepositoryTree(owner, repoName)
      ]);

      setRepo(repoData);
      setFiles(treeData.tree.filter(item => item.type === 'blob'));
      setState('repository');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setState('input');
    }
  };

  const handleFileSelect = async (file: GitHubTreeItem) => {
    if (!repo) return;

    setState('file-loading');
    setSelectedFile(file);
    setError(null);

    try {
      const fileData = await fetchFileContent(
        repo.full_name.split('/')[0],
        repo.full_name.split('/')[1],
        file.path
      );

      const content = fileData.content ? atob(fileData.content) : '';
      setFileContent(content);
      setState('repository');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file');
      setState('repository');
    }
  };

  const handleAnalyzeStack = async () => {
    if (!repo || !files.length) return;

    setState('analyzing');
    setError(null);

    try {
      const analyzer = new StackAnalyzer(files);
      
      // Fetch key configuration files
      const keyFiles = [
        'package.json', 'requirements.txt', 'pom.xml', 'Cargo.toml', 'go.mod',
        'composer.json', 'Gemfile', 'setup.py', 'pyproject.toml'
      ];

      const owner = repo.full_name.split('/')[0];
      const repoName = repo.full_name.split('/')[1];

      for (const fileName of keyFiles) {
        const file = files.find(f => f.path === fileName);
        if (file) {
          try {
            const fileData = await fetchFileContent(owner, repoName, file.path);
            const content = fileData.content ? atob(fileData.content) : '';
            analyzer.addFileContent(file.path, content);
          } catch (err) {
            // Continue if file fetch fails
            console.warn(`Failed to fetch ${fileName}:`, err);
          }
        }
      }

      const analysis = await analyzer.analyzeStack();
      setStackAnalysis(analysis);

      // Generate Docker files
      const dockerGenerator = new DockerGenerator(analysis);
      const generatedFiles = dockerGenerator.generateFiles();
      setDockerFiles(generatedFiles);

      setState('analysis-complete');
      setActiveTab('analysis');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze stack');
      setState('repository');
    }
  };

  const handleBack = () => {
    setState('input');
    setRepo(null);
    setFiles([]);
    setSelectedFile(null);
    setFileContent('');
    setStackAnalysis(null);
    setDockerFiles(null);
    setActiveTab('files');
    setError(null);
  };

  if (state === 'input') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <RepoInput
          onSubmit={handleRepoSubmit}
          loading={state === 'loading'}
          error={error}
        />
      </div>
    );
  }

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600">Loading repository...</p>
        </div>
      </div>
    );
  }

  if (state === 'analyzing') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600">Analyzing stack and generating Docker configuration...</p>
        </div>
      </div>
    );
  }

  if (!repo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p>Something went wrong. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <RepoHeader repo={repo} onBack={handleBack} />
      
      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="flex space-x-8 px-4">
          <button
            onClick={() => setActiveTab('files')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'files'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Files ({files.length})
          </button>
          <button
            onClick={() => setActiveTab('analysis')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'analysis'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            disabled={!stackAnalysis}
          >
            Stack Analysis
          </button>
          <button
            onClick={() => setActiveTab('docker')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'docker'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            disabled={!dockerFiles}
          >
            Docker Config
          </button>
          {!stackAnalysis && (
            <button
              onClick={handleAnalyzeStack}
              className="ml-auto py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              disabled={state === 'analyzing'}
            >
              {state === 'analyzing' ? 'Analyzing...' : 'Analyze Stack & Generate Docker'}
            </button>
          )}
        </div>
      </div>

      <div className="flex h-[calc(100vh-180px)]">
        {activeTab === 'files' && (
          <>
        <div className="w-80 bg-white border-r">
          <FileTree
            files={files}
            onFileSelect={handleFileSelect}
            selectedFile={selectedFile}
          />
        </div>
        
        <div className="flex-1 bg-white">
          {state === 'file-loading' ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <LoadingSpinner />
                <p className="mt-4 text-gray-600">Loading file...</p>
              </div>
            </div>
          ) : selectedFile ? (
            <FileViewer
              content={fileContent}
              fileName={selectedFile.path.split('/').pop() || ''}
              filePath={selectedFile.path}
              fileUrl={`https://github.com/${repo.full_name}/blob/${repo.default_branch}/${selectedFile.path}`}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <p className="text-lg">Select a file to view its contents</p>
                <p className="text-sm mt-2">
                  Found {files.length} files in this repository
                </p>
              </div>
            </div>
          )}
        </div>
          </>
        )}

        {activeTab === 'analysis' && stackAnalysis && (
          <div className="flex-1 bg-white overflow-auto p-6">
            <StackAnalysisComponent analysis={stackAnalysis} />
          </div>
        )}

        {activeTab === 'docker' && dockerFiles && (
          <div className="flex-1 bg-white overflow-auto p-6">
            <DockerFiles files={dockerFiles} repoName={repo.name} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;