import React, { useState } from 'react';
import { 
  GitBranch, 
  Folder, 
  FolderOpen, 
  File, 
  Search, 
  Download, 
  Code, 
  Star, 
  GitFork, 
  Eye, 
  AlertCircle,
  Calendar,
  User,
  ExternalLink,
  Loader2,
  RefreshCw,
  Brain,
  BarChart3
} from 'lucide-react';
import { GitHubRepository, FileNode } from '../types/github';
import { githubApi } from '../services/githubApi';
import { getLanguageFromExtension, formatFileSize, formatDate } from '../utils/codeHighlighting';
import { llmAnalysisService, RepositoryAnalysis } from '../services/llmAnalysis';
import { AnalysisPanel } from './AnalysisPanel';

export const GitCloneSystem: React.FC = () => {
  const [repoUrl, setRepoUrl] = useState('');
  const [repository, setRepository] = useState<GitHubRepository | null>(null);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandingPaths, setExpandingPaths] = useState<Set<string>>(new Set());
  const [analysis, setAnalysis] = useState<RepositoryAnalysis | null>(null);
  const [analyzingRepo, setAnalyzingRepo] = useState(false);
  const [activeTab, setActiveTab] = useState<'files' | 'analysis'>('files');

  const handleCloneRepository = async () => {
    if (!repoUrl.trim()) {
      setError('Please enter a repository URL');
      return;
    }

    const parsed = githubApi.parseRepositoryUrl(repoUrl);
    if (!parsed) {
      setError('Invalid GitHub repository URL. Please use format: https://github.com/owner/repo');
      return;
    }

    setLoading(true);
    setError(null);
    setRepository(null);
    setFileTree([]);
    setSelectedFile(null);
    setFileContent('');
    setAnalysis(null);
    setActiveTab('files');

    try {
      // Fetch repository information
      const repo = await githubApi.getRepository(parsed.owner, parsed.repo);
      setRepository(repo);

      // Build initial file tree
      const tree = await githubApi.buildFileTree(parsed.owner, parsed.repo);
      setFileTree(tree);

      // Auto-select README if it exists
      const readmeFile = tree.find(file => 
        file.type === 'file' && 
        file.name.toLowerCase().startsWith('readme')
      );
      
      if (readmeFile) {
        await handleFileSelect(readmeFile, parsed.owner, parsed.repo);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch repository');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeRepository = async () => {
    if (!repository || !fileTree.length) return;

    setAnalyzingRepo(true);
    setError(null);

    try {
      // Collect file information for analysis
      const filesToAnalyze: { name: string; content?: string; path: string }[] = [];
      
      // Add important files from root level
      const importantFiles = fileTree.filter(file => 
        file.type === 'file' && (
          file.name.toLowerCase().includes('package.json') ||
          file.name.toLowerCase().includes('requirements.txt') ||
          file.name.toLowerCase().includes('gemfile') ||
          file.name.toLowerCase().includes('composer.json') ||
          file.name.toLowerCase().includes('pom.xml') ||
          file.name.toLowerCase().includes('build.gradle') ||
          file.name.toLowerCase().includes('cargo.toml') ||
          file.name.toLowerCase().includes('go.mod') ||
          file.name.toLowerCase().includes('readme') ||
          file.name.toLowerCase().includes('dockerfile') ||
          file.name.toLowerCase().includes('makefile')
        )
      );

      // Get content for important files
      for (const file of importantFiles.slice(0, 10)) {
        try {
          const content = await githubApi.getFileContent(
            repository.owner.login,
            repository.name,
            file.path
          );
          filesToAnalyze.push({
            name: file.name,
            content,
            path: file.path
          });
        } catch (err) {
          // Skip files that can't be loaded
          filesToAnalyze.push({
            name: file.name,
            path: file.path
          });
        }
      }

      // Add all files for structure analysis
      const allFiles = getAllFiles(fileTree);
      allFiles.forEach(file => {
        if (!filesToAnalyze.find(f => f.path === file.path)) {
          filesToAnalyze.push({
            name: file.name,
            path: file.path
          });
        }
      });

      const repositoryAnalysis = await llmAnalysisService.analyzeRepository(filesToAnalyze);
      setAnalysis(repositoryAnalysis);
      setActiveTab('analysis');
    } catch (err) {
      setError(`Analysis failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setAnalyzingRepo(false);
    }
  };

  const getAllFiles = (nodes: FileNode[]): FileNode[] => {
    const files: FileNode[] = [];
    
    const traverse = (nodeList: FileNode[]) => {
      nodeList.forEach(node => {
        files.push(node);
        if (node.children) {
          traverse(node.children);
        }
      });
    };
    
    traverse(nodes);
    return files;
  };

  const handleFileSelect = async (file: FileNode, owner?: string, repo?: string) => {
    if (file.type === 'directory') return;

    if (!repository) return;

    const repoOwner = owner || repository.owner.login;
    const repoName = repo || repository.name;

    setLoadingFile(true);
    setSelectedFile(file);

    try {
      const content = await githubApi.getFileContent(repoOwner, repoName, file.path);
      setFileContent(content);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch file content');
      setFileContent('Error loading file content');
    } finally {
      setLoadingFile(false);
    }
  };

  const toggleDirectory = async (node: FileNode) => {
    if (node.type !== 'directory' || !repository) return;

    const path = node.path;
    
    if (node.expanded) {
      // Collapse directory
      node.expanded = false;
      node.children = [];
    } else {
      // Expand directory
      if (expandingPaths.has(path)) return; // Already expanding
      
      setExpandingPaths(prev => new Set(prev).add(path));
      
      try {
        const children = await githubApi.buildFileTree(
          repository.owner.login, 
          repository.name, 
          path
        );
        node.children = children;
        node.expanded = true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load directory contents');
      } finally {
        setExpandingPaths(prev => {
          const newSet = new Set(prev);
          newSet.delete(path);
          return newSet;
        });
      }
    }

    setFileTree([...fileTree]);
  };

  const renderFileTree = (nodes: FileNode[], level = 0) => {
    const filteredNodes = searchTerm 
      ? nodes.filter(node => 
          node.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : nodes;

    return filteredNodes.map((node) => (
      <div key={node.path}>
        <div
          className={`flex items-center space-x-2 px-3 py-2 rounded cursor-pointer hover:bg-gray-100 transition-colors ${
            selectedFile?.path === node.path ? 'bg-blue-50 text-blue-600 border-l-2 border-blue-500' : 'text-gray-700'
          }`}
          style={{ paddingLeft: `${12 + level * 16}px` }}
          onClick={() => {
            if (node.type === 'directory') {
              toggleDirectory(node);
            } else {
              handleFileSelect(node);
            }
          }}
        >
          {node.type === 'directory' ? (
            <>
              {expandingPaths.has(node.path) ? (
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              ) : node.expanded ? (
                <FolderOpen className="w-4 h-4 text-blue-500" />
              ) : (
                <Folder className="w-4 h-4 text-blue-500" />
              )}
            </>
          ) : (
            <File className="w-4 h-4 text-gray-500" />
          )}
          <span className="text-sm font-medium flex-1">{node.name}</span>
          {node.type === 'file' && node.size !== undefined && (
            <span className="text-xs text-gray-500">
              {formatFileSize(node.size)}
            </span>
          )}
        </div>
        {node.type === 'directory' && node.expanded && node.children && (
          <div>
            {renderFileTree(node.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  const downloadFile = () => {
    if (!selectedFile || !fileContent) return;
    
    const blob = new Blob([fileContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center space-x-4 mb-6">
            <GitBranch className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">GitHub Repository Explorer</h1>
              <p className="text-gray-600 mt-1">Clone and explore any public GitHub repository</p>
            </div>
          </div>
          
          <div className="flex space-x-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Enter GitHub repository URL (e.g., https://github.com/facebook/react)"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                onKeyPress={(e) => e.key === 'Enter' && handleCloneRepository()}
              />
            </div>
            <button
              onClick={handleCloneRepository}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Explore Repository</span>
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <span className="text-red-700">{error}</span>
            </div>
          )}
        </div>
      </div>

      {repository && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="bg-white rounded-lg shadow-sm border mb-6">
            <div className="p-6 border-b">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <img 
                      src={repository.owner.avatar_url} 
                      alt={repository.owner.login}
                      className="w-8 h-8 rounded-full"
                    />
                    <h2 className="text-2xl font-bold text-gray-900">{repository.full_name}</h2>
                    <a 
                      href={repository.html_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                  {repository.description && (
                    <p className="text-gray-600 mb-3">{repository.description}</p>
                  )}
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>Updated {formatDate(repository.updated_at)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <User className="w-4 h-4" />
                      <span>{repository.owner.login}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-6 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="font-medium">{repository.stargazers_count.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <GitFork className="w-4 h-4" />
                    <span className="font-medium">{repository.forks_count.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Eye className="w-4 h-4" />
                    <span className="font-medium">{repository.watchers_count.toLocaleString()}</span>
                  </div>
                  {repository.language && (
                    <div className="flex items-center space-x-1">
                      <Code className="w-4 h-4" />
                      <span className="font-medium">{repository.language}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search files..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="flex items-center space-x-1 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span className="text-sm">Refresh</span>
                </button>
              </div>
              
              {/* Analysis Button */}
              <button
                onClick={handleAnalyzeRepository}
                disabled={analyzingRepo || !fileTree.length}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {analyzingRepo ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4" />
                    <span>Analyze Tech Stack</span>
                  </>
                )}
              </button>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <Folder className="w-5 h-5" />
                    <span>File Explorer</span>
                  </h3>
                  <div className="bg-gray-50 rounded-lg border max-h-96 overflow-y-auto">
                    {fileTree.length > 0 ? (
                      renderFileTree(fileTree)
                    ) : (
                      <div className="p-4 text-center text-gray-500">
                        <Folder className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p>No files found</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-2">
                  {selectedFile ? (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <File className="w-5 h-5 text-gray-500" />
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {selectedFile.name}
                            </h3>
                            <p className="text-sm text-gray-500">
            {/* Tab Content */}
            {activeTab === 'files' ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <Folder className="w-5 h-5" />
                    <span>File Explorer</span>
                  </h3>
                  <div className="bg-gray-50 rounded-lg border max-h-96 overflow-y-auto">
                    {fileTree.length > 0 ? (
                      renderFileTree(fileTree)
                    ) : (
                      <div className="p-4 text-center text-gray-500">
                        <Folder className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p>No files found</p>
                      </div>
                    )}
                  </div>
                        {loadingFile ? (
                            <Loader2 className="w-8 h-8 text-blue-400 mx-auto mb-4 animate-spin" />
                <div className="lg:col-span-2">
                  {selectedFile ? (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <File className="w-5 h-5 text-gray-500" />
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {selectedFile.name}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {selectedFile.path} • {getLanguageFromExtension(selectedFile.name)}
                              {selectedFile.size && ` • ${formatFileSize(selectedFile.size)}`}
                            </p>
                          </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Select a file to view</h3>
                        <button 
                          onClick={downloadFile}
                          className="flex items-center space-x-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm"
                        >
                          <Download className="w-4 h-4" />
                          <span>Download</span>
                        </button>
                      <p className="text-gray-600">Choose a file from the explorer to view its contents</p>
              <button
                      <div className="bg-gray-900 rounded-lg border overflow-hidden">
                        {loadingFile ? (
                          <div className="p-8 text-center">
                            <Loader2 className="w-8 h-8 text-blue-400 mx-auto mb-4 animate-spin" />
                            <p className="text-gray-400">Loading file content...</p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <pre className="p-4 text-sm text-gray-100 whitespace-pre-wrap">
                              <code>{fileContent}</code>
                            </pre>
                          </div>
                        )}
                      </div>
                className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-colors ${
                  ) : (
                    <div className="bg-gray-50 rounded-lg border p-8 text-center">
                      <File className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Select a file to view</h3>
                      <p className="text-gray-600">Choose a file from the explorer to view its contents</p>
                    </div>
                  )}
                </div>
              </button>
            ) : (
              <div>
                {analysis ? (
                  <AnalysisPanel analysis={analysis} />
                ) : (
                  <div className="bg-gray-50 rounded-lg border p-8 text-center">
                    <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Analysis Available</h3>
                    <p className="text-gray-600 mb-4">Click "Analyze Tech Stack" to get AI-powered insights about this repository</p>
                    <button
                      onClick={handleAnalyzeRepository}
                      disabled={analyzingRepo || !fileTree.length}
                      className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium mx-auto"
                    >
                      {analyzingRepo ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Analyzing...</span>
                        </>
                      ) : (
                        <>
                          <Brain className="w-4 h-4" />
                          <span>Analyze Tech Stack</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

        </div>
      )}
    </div>
  );
};