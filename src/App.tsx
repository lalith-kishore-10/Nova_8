import React, { useState } from 'react';
import { RepoInput } from './components/RepoInput';
import { RepoHeader } from './components/RepoHeader';
import { FileTree } from './components/FileTree';
import { FileViewer } from './components/FileViewer';
import { StackAnalysisComponent } from './components/StackAnalysis';
import { DockerFiles } from './components/DockerFiles';
import { ValidationReport } from './components/ValidationReport';
import { OutputsAndLogs } from './components/OutputsAndLogs';
import { TestRunner } from './components/TestRunner';
import { GitHubIntegration } from './components/GitHubIntegration';
import { NotificationCenter } from './components/NotificationCenter';
import { LoadingSpinner } from './components/LoadingSpinner';
import { fetchRepository, fetchRepositoryTree, fetchFileContent } from './utils/github';
import { StackAnalyzer } from './utils/stackAnalyzer';
import { RepositoryValidator } from './utils/validator';
import { DockerGenerator } from './utils/dockerGenerator';
import { logger } from './utils/logger';
import type { GitHubRepo, GitHubTreeItem } from './types/github';
import type { StackAnalysis, GeneratedFiles } from './types/analysis';
import type { ValidationResult, TestResult } from './types/validation';

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
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [activeTab, setActiveTab] = useState<'files' | 'analysis' | 'docker' | 'validation' | 'testing' | 'github' | 'logs'>('files');
  const [projectFiles, setProjectFiles] = useState<Map<string, string>>(new Map());

  const handleRepoSubmit = async (owner: string, repoName: string) => {
    setState('loading');
    setError(null);
    
    logger.info('api', `Loading repository: ${owner}/${repoName}`);

    try {
      const [repoData, treeData] = await Promise.all([
        fetchRepository(owner, repoName),
        fetchRepositoryTree(owner, repoName)
      ]);

      setRepo(repoData);
      setFiles(treeData.tree.filter(item => item.type === 'blob'));
      logger.success('api', `Repository loaded successfully: ${repoData.full_name}`, 
        `Found ${treeData.tree.length} files`);
      
      // Load key project files for testing and GitHub integration
      await loadProjectFiles(owner, repoName, treeData.tree);
      
      setState('repository');
    } catch (err) {
      logger.error('api', 'Failed to load repository', err instanceof Error ? err.message : 'Unknown error');
      setError(err instanceof Error ? err.message : 'An error occurred');
      setState('input');
    }
  };

  const loadProjectFiles = async (owner: string, repoName: string, files: GitHubTreeItem[]) => {
    const filesToLoad = files.filter(file => 
      file.type === 'blob' && 
      (file.path.endsWith('.js') || 
       file.path.endsWith('.ts') || 
       file.path.endsWith('.jsx') || 
       file.path.endsWith('.tsx') ||
       file.path.endsWith('.py') ||
       file.path.endsWith('.json') ||
       file.path.endsWith('.java') ||
       file.path.endsWith('.go') ||
       file.path.endsWith('.rs') ||
       file.path.endsWith('.php') ||
       file.path.endsWith('.rb') ||
        file.path.endsWith('.md') ||
        file.path.endsWith('.txt') ||
        file.path.endsWith('.yml') ||
        file.path.endsWith('.yaml') ||
        file.path.endsWith('.toml') ||
        file.path.endsWith('.ini') ||
        file.path.endsWith('.conf') ||
        file.path.endsWith('.config') ||
       file.path === 'package.json' ||
       file.path === 'requirements.txt' ||
       file.path === 'pom.xml' ||
       file.path === 'Cargo.toml' ||
       file.path === 'go.mod' ||
       file.path === 'composer.json' ||
       file.path === 'Gemfile' ||
       file.path === 'README.md' ||
       file.path === '.gitignore' ||
        file.path === 'LICENSE' ||
        file.path === 'CHANGELOG.md' ||
        file.path.startsWith('.env') ||
       file.path.includes('config') ||
       file.size && file.size < 100000) // Include small files under 100KB
    ).slice(0, 100); // Increased limit for better file coverage

    const loadedFiles = new Map<string, string>();
    
    for (const file of filesToLoad) {
      try {
        const fileData = await fetchFileContent(owner, repoName, file.path);
        let content = '';
        if (fileData.content) {
          try {
            // Handle base64 decoding more robustly
            content = decodeURIComponent(escape(atob(fileData.content)));
          } catch (decodeError) {
            try {
              // Fallback to simple atob
              content = atob(fileData.content);
            } catch (fallbackError) {
              logger.warning('system', `Failed to decode ${file.path}`, fallbackError instanceof Error ? fallbackError.message : 'Unknown error');
              content = fileData.content; // Use raw content as last resort
            }
          }
        }
        
        if (content && content.trim().length > 0) {
          loadedFiles.set(file.path, content);
          logger.debug('system', `Loaded file: ${file.path} (${content.length} chars)`);
        } else {
          logger.warning('system', `Skipped empty file: ${file.path}`);
        }
      } catch (error) {
        logger.warning('system', `Failed to load ${file.path}`, error instanceof Error ? error.message : 'Unknown error');
      }
    }
    
    setProjectFiles(loadedFiles);
    logger.info('system', `Loaded ${loadedFiles.size} project files for analysis and GitHub integration`);
  };

  const handleFileSelect = async (file: GitHubTreeItem) => {
    if (!repo) return;

    setState('file-loading');
    setSelectedFile(file);
    setError(null);
    
    logger.info('api', `Loading file: ${file.path}`);

    try {
      const fileData = await fetchFileContent(
        repo.full_name.split('/')[0],
        repo.full_name.split('/')[1],
        file.path
      );

      const content = fileData.content ? atob(fileData.content) : '';
      setFileContent(content);
      logger.success('api', `File loaded: ${file.path}`, `Size: ${content.length} characters`);
      setState('repository');
    } catch (err) {
      logger.error('api', `Failed to load file: ${file.path}`, err instanceof Error ? err.message : 'Unknown error');
      setError(err instanceof Error ? err.message : 'Failed to load file');
      setState('repository');
    }
  };

  const handleAnalyzeStack = async () => {
    if (!repo || !files.length) return;

    setState('analyzing');
    setError(null);
    
    const processId = logger.startProcess('Stack Analysis & Docker Generation');
    logger.info('analysis', 'Starting comprehensive repository analysis');

    try {
      const analyzer = new StackAnalyzer(files);
      
      // Fetch key configuration files
      const keyFiles = [
        'package.json', 'requirements.txt', 'pom.xml', 'Cargo.toml', 'go.mod',
        'composer.json', 'Gemfile', 'setup.py', 'pyproject.toml', 'yarn.lock',
        'package-lock.json', 'pnpm-lock.yaml', 'Pipfile', 'poetry.lock',
        'next.config.js', 'next.config.ts', 'vue.config.js', 'angular.json',
        'webpack.config.js', 'vite.config.js', 'vite.config.ts', 'rollup.config.js',
        'tailwind.config.js', 'tailwind.config.ts', '.eslintrc.js', '.eslintrc.json',
        'tsconfig.json', 'jsconfig.json', 'babel.config.js', '.babelrc'
      ];

      const owner = repo.full_name.split('/')[0];
      const repoName = repo.full_name.split('/')[1];
      
      logger.info('analysis', `Fetching configuration files for analysis`);
      logger.addProcessOutput(processId, 'stdout', `Analyzing ${files.length} files in repository...`);

      for (const fileName of keyFiles) {
        const file = files.find(f => f.path === fileName);
        if (file) {
          try {
            const fileData = await fetchFileContent(owner, repoName, file.path);
            let content = '';
            if (fileData.content) {
              try {
                content = atob(fileData.content);
              } catch (decodeError) {
                logger.warning('analysis', `Failed to decode ${fileName}`, decodeError instanceof Error ? decodeError.message : 'Unknown error');
                content = fileData.content;
              }
            }
            analyzer.addFileContent(file.path, content);
            logger.debug('analysis', `Loaded configuration file: ${fileName}`);
            logger.addProcessOutput(processId, 'stdout', `✓ Loaded ${fileName}`);
          } catch (err) {
            // Continue if file fetch fails
            logger.warning('analysis', `Could not fetch ${fileName}`, err instanceof Error ? err.message : 'Unknown error');
            logger.addProcessOutput(processId, 'stderr', `✗ Failed to load ${fileName}: ${err instanceof Error ? err.message : 'Unknown error'}`);
          }
        }
      }
      
      logger.addProcessOutput(processId, 'stdout', 'Analyzing technology stack...');

      const analysis = await analyzer.analyzeStack();
      
      // Log analysis results for debugging
      logger.debug('analysis', 'Analysis results', JSON.stringify(analysis, null, 2));
      logger.addProcessOutput(processId, 'stdout', `Primary language: ${analysis.primaryLanguage}`);
      logger.addProcessOutput(processId, 'stdout', `Framework: ${analysis.framework || 'None detected'}`);
      logger.addProcessOutput(processId, 'stdout', `Dependencies: ${analysis.dependencies.length} runtime, ${analysis.devDependencies.length} dev`);
      
      // Ensure we have valid analysis data
      if (!analysis.primaryLanguage || analysis.primaryLanguage === 'unknown') {
        logger.addProcessOutput(processId, 'stdout', 'Primary language not detected from config files, analyzing file extensions...');
        
        // Try to detect from file extensions if no package files found
        const jsFiles = files.filter(f => f.path.endsWith('.js') || f.path.endsWith('.jsx')).length;
        const tsFiles = files.filter(f => f.path.endsWith('.ts') || f.path.endsWith('.tsx')).length;
        const pyFiles = files.filter(f => f.path.endsWith('.py')).length;
        const javaFiles = files.filter(f => f.path.endsWith('.java')).length;
        const goFiles = files.filter(f => f.path.endsWith('.go')).length;
        const rustFiles = files.filter(f => f.path.endsWith('.rs')).length;
        const phpFiles = files.filter(f => f.path.endsWith('.php')).length;
        const rubyFiles = files.filter(f => f.path.endsWith('.rb')).length;
        
        if (tsFiles > 0) {
          analysis.primaryLanguage = 'typescript';
          analysis.runtime = 'Node.js';
        } else if (jsFiles > 0) {
          analysis.primaryLanguage = 'javascript';
          analysis.runtime = 'Node.js';
        } else if (pyFiles > 0) {
          analysis.primaryLanguage = 'python';
          analysis.runtime = 'Python';
        } else if (javaFiles > 0) {
          analysis.primaryLanguage = 'java';
          analysis.runtime = 'JVM';
        } else if (goFiles > 0) {
          analysis.primaryLanguage = 'go';
          analysis.runtime = 'Go';
        } else if (rustFiles > 0) {
          analysis.primaryLanguage = 'rust';
          analysis.runtime = 'Rust';
        } else if (phpFiles > 0) {
          analysis.primaryLanguage = 'php';
          analysis.runtime = 'PHP';
        } else if (rubyFiles > 0) {
          analysis.primaryLanguage = 'ruby';
          analysis.runtime = 'Ruby';
        }
        
        logger.info('analysis', `Detected primary language from file extensions: ${analysis.primaryLanguage}`);
        logger.addProcessOutput(processId, 'stdout', `✓ Detected from file extensions: ${analysis.primaryLanguage}`);
      }
      
      // Ensure we have some basic data even if detection fails
      if (!analysis.primaryLanguage || analysis.primaryLanguage === 'unknown') {
        analysis.primaryLanguage = 'unknown';
        logger.warning('analysis', 'Could not detect primary language');
        logger.addProcessOutput(processId, 'stderr', '⚠ Could not detect primary language');
      }
      
      setStackAnalysis(analysis);
      logger.success('analysis', `Stack analysis complete`, 
        `Detected: ${analysis.primaryLanguage}${analysis.framework ? ` with ${analysis.framework}` : ''}`);
      logger.addProcessOutput(processId, 'stdout', `✓ Stack analysis complete: ${analysis.primaryLanguage}${analysis.framework ? ` with ${analysis.framework}` : ''}`);

      // Generate Docker files
      logger.addProcessOutput(processId, 'stdout', 'Generating Docker configuration...');
      const dockerGenerator = new DockerGenerator(analysis);
      const generatedFiles = dockerGenerator.generateFiles();
      setDockerFiles(generatedFiles);
      logger.success('docker', 'Docker configuration generated successfully');
      logger.addProcessOutput(processId, 'stdout', '✓ Docker configuration generated');

      // Run validation
      logger.addProcessOutput(processId, 'stdout', 'Running repository validation...');
      const validator = new RepositoryValidator(files, analysis);
      
      // Fetch additional files for validation
      for (const fileName of ['package.json', 'requirements.txt', '.gitignore']) {
        const file = files.find(f => f.path === fileName);
        if (file) {
          try {
            const fileData = await fetchFileContent(owner, repoName, file.path);
            let content = '';
            if (fileData.content) {
              try {
                content = atob(fileData.content);
              } catch (decodeError) {
                logger.warning('validation', `Failed to decode ${fileName}`, decodeError instanceof Error ? decodeError.message : 'Unknown error');
                content = fileData.content;
              }
            }
            validator.addFileContent(file.path, content);
            logger.debug('validation', `Loaded file for validation: ${fileName}`);
          } catch (err) {
            logger.warning('validation', `Could not fetch ${fileName} for validation`, err instanceof Error ? err.message : 'Unknown error');
          }
        }
      }

      const validation = await validator.validateRepository();
      setValidationResult(validation);
      logger.success('validation', `Validation complete - Score: ${validation.score}/100`);
      logger.addProcessOutput(processId, 'stdout', `✓ Validation complete - Score: ${validation.score}/100`);

      const tests = await validator.runTests();
      setTestResults(tests);
      logger.info('validation', `Test results: ${tests.length} test suites executed`);
      logger.addProcessOutput(processId, 'stdout', `✓ Test results: ${tests.length} test suites executed`);
      
      logger.completeProcess(processId, 0);
      logger.addProcessOutput(processId, 'stdout', 'Analysis complete! Check the tabs for results.');

      setState('analysis-complete');
      setActiveTab('analysis');
    } catch (err) {
      logger.completeProcess(processId, 1);
      logger.error('analysis', 'Analysis failed', err instanceof Error ? err.message : 'Unknown error');
      logger.addProcessOutput(processId, 'stderr', `✗ Analysis failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setError(err instanceof Error ? err.message : 'Failed to analyze stack');
      setState('repository');
    }
  };

  const handleBack = () => {
    logger.info('system', 'Returning to repository input');
    setState('input');
    setRepo(null);
    setFiles([]);
    setSelectedFile(null);
    setFileContent('');
    setStackAnalysis(null);
    setDockerFiles(null);
    setValidationResult(null);
    setTestResults([]);
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
      <NotificationCenter />
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
          <button
            onClick={() => setActiveTab('validation')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'validation'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            disabled={!validationResult}
          >
            Validation Report
          </button>
          <button
            onClick={() => setActiveTab('testing')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'testing'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            disabled={!stackAnalysis}
          >
            Testing & Fixes
          </button>
          <button
            onClick={() => setActiveTab('github')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'github'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            disabled={!dockerFiles}
          >
            Push to GitHub
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'logs'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Outputs & Logs
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

        {activeTab === 'validation' && validationResult && (
          <div className="flex-1 bg-white overflow-auto p-6">
            <ValidationReport validation={validationResult} testResults={testResults} />
          </div>
        )}

        {activeTab === 'logs' && (
          <OutputsAndLogs />
        )}

        {activeTab === 'testing' && stackAnalysis && dockerFiles && (
          <div className="flex-1 bg-white overflow-auto p-6">
            <TestRunner 
              analysis={stackAnalysis}
              dockerFiles={dockerFiles}
              projectFiles={projectFiles}
              onFilesUpdated={setProjectFiles}
            />
          </div>
        )}

        {activeTab === 'github' && dockerFiles && (
          <div className="flex-1 bg-white overflow-auto p-6">
            <GitHubIntegration 
              dockerFiles={dockerFiles}
              projectFiles={projectFiles}
              repoName={repo.name}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;