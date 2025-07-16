import React, { useState } from 'react';
import { 
  Github, 
  Key, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  User,
  LogOut,
  GitBranch,
  Lock,
  Unlock
} from 'lucide-react';
import { githubAuth } from '../utils/githubAuth';
import { logger } from '../utils/logger';
import type { GitHubAuth, CreateRepoOptions } from '../types/github';
import type { GeneratedFiles } from '../types/analysis';

interface GitHubIntegrationProps {
  dockerFiles: GeneratedFiles;
  projectFiles: Map<string, string>;
  repoName: string;
}

export function GitHubIntegration({ dockerFiles, projectFiles, repoName }: GitHubIntegrationProps) {
  const [auth, setAuth] = useState<GitHubAuth | null>(null);
  const [token, setToken] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [pushResult, setPushResult] = useState<{ success: boolean; repoUrl?: string; error?: string } | null>(null);
  const [repoOptions, setRepoOptions] = useState<CreateRepoOptions>({
    name: repoName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
    description: `Generated project with Docker configuration`,
    private: false,
    auto_init: false
  });

  const handleAuthenticate = async () => {
    if (!token.trim()) {
      logger.error('github', 'GitHub token is required');
      return;
    }

    setIsAuthenticating(true);
    try {
      const authResult = await githubAuth.authenticate(token);
      setAuth(authResult);
      logger.success('github', `Successfully authenticated as ${authResult.user.login}`);
    } catch (error) {
      logger.error('github', 'Authentication failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = () => {
    githubAuth.logout();
    setAuth(null);
    setToken('');
    setPushResult(null);
    logger.info('github', 'Logged out from GitHub');
  };

  const handlePushToGitHub = async () => {
    if (!auth) {
      logger.error('github', 'Not authenticated with GitHub');
      return;
    }

    if (!repoOptions.name.trim()) {
      logger.error('github', 'Repository name is required');
      return;
    }
    
    // Validate that we have files to push
    const totalFiles = dockerFiles ? 4 : 0; // dockerfile, dockerignore, readme, compose
    const projectFileCount = projectFiles.size;
    
    if (totalFiles === 0 && projectFileCount === 0) {
      logger.error('github', 'No files available to push');
      setPushResult({
        success: false,
        error: 'No files available to push. Please ensure Docker files are generated and project files are loaded.'
      });
      return;
    }
    
    setIsPushing(true);
    setPushResult(null);

    try {
      // Create repository
      logger.info('github', `Creating repository: ${repoOptions.name}`);
      const repoUrl = await githubAuth.createRepository(repoOptions);
      logger.success('github', `Repository created successfully: ${repoUrl}`);

      // Prepare files for push
      const filesToPush = new Map<string, string>();
      
      // Add Docker files
      if (dockerFiles.dockerfile) {
        filesToPush.set('Dockerfile', dockerFiles.dockerfile);
        logger.debug('github', 'Added Dockerfile to push');
      }
      
      if (dockerFiles.dockerignore) {
        filesToPush.set('.dockerignore', dockerFiles.dockerignore);
        logger.debug('github', 'Added .dockerignore to push');
      }
      
      if (dockerFiles.readme) {
        filesToPush.set('DOCKER_README.md', dockerFiles.readme);
        logger.debug('github', 'Added DOCKER_README.md to push');
      }
      
      if (dockerFiles.dockerCompose) {
        filesToPush.set('docker-compose.yml', dockerFiles.dockerCompose);
        logger.debug('github', 'Added docker-compose.yml to push');
      }

      // Add project files
      for (const [path, content] of projectFiles) {
        // Skip binary files, very large files, and git files
        if (content && 
            content.length > 0 && 
            content.length < 1000000 && 
            !path.includes('.git/') && 
            !path.includes('node_modules/') &&
            !path.includes('.DS_Store') &&
            !path.includes('Thumbs.db')) {
          filesToPush.set(path, content);
          logger.debug('github', `Added project file: ${path} (${content.length} chars)`);
        }
      }

      // Add a main README if not exists
      if (!filesToPush.has('README.md')) {
        const mainReadme = generateMainReadme();
        filesToPush.set('README.md', mainReadme);
        logger.debug('github', 'Added generated README.md');
      }

      // Add .gitignore if not exists
      if (!filesToPush.has('.gitignore')) {
        const gitignore = generateGitignore();
        filesToPush.set('.gitignore', gitignore);
        logger.debug('github', 'Added generated .gitignore');
      }
      
      // Final validation
      if (filesToPush.size === 0) {
        throw new Error('No valid files to push after filtering');
      }
      
      // Push files
      logger.info('github', `Pushing ${filesToPush.size} files to repository`);
      logger.debug('github', `Files to push: ${Array.from(filesToPush.keys()).join(', ')}`);
      
      const result = await githubAuth.pushFiles(
        repoOptions.name,
        filesToPush,
        '🚀 Initial commit with Docker configuration and project files'
      );

      setPushResult(result);
      
      if (result.success) {
        logger.success('github', `Successfully pushed to ${result.repoUrl}`);
      } else {
        logger.error('github', 'Failed to push files', result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('github', 'Push operation failed', errorMessage);
      setPushResult({ success: false, error: errorMessage });
    } finally {
      setIsPushing(false);
    }
  };

  const generateGitignore = () => {
    return `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Build outputs
dist/
build/
.next/
.nuxt/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# Docker
.dockerignore

# Python
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
env/
venv/
.venv/

# Java
target/
*.class
*.jar
*.war
*.ear

# Temporary files
*.tmp
*.temp
`;
  };

  const generateMainReadme = () => {
    return `# ${repoOptions.name}

${repoOptions.description}

## Project Overview

This project was analyzed and configured with the following stack:
- **Primary Language**: ${analysis?.primaryLanguage || 'Not detected'}
- **Framework**: ${analysis?.framework || 'None detected'}
- **Runtime**: ${analysis?.runtime || 'Not specified'}
- **Package Manager**: ${analysis?.packageManager || 'Not detected'}

## Dependencies

- **Runtime Dependencies**: ${analysis?.dependencies?.length || 0}
- **Development Dependencies**: ${analysis?.devDependencies?.length || 0}

## Quick Start

### Using Docker

\`\`\`bash
# Build and run with Docker
docker build -t ${repoOptions.name} .
docker run -p 3000:3000 ${repoOptions.name}
\`\`\`

### Using Docker Compose

\`\`\`bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
\`\`\`

## Development

See [DOCKER_README.md](./DOCKER_README.md) for detailed Docker configuration information.

## Generated Files

This project was generated with:
- ✅ Dockerfile for containerization
- ✅ docker-compose.yml for multi-service setup  
- ✅ .dockerignore for optimized builds
- ✅ Complete documentation
- ✅ Project files and configuration

---

*Generated by GitHub Repository Explorer System*
`;
  };

  if (!auth) {
    return (
      <div className="space-y-6">
        <div className="bg-blue-50 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Github className="h-6 w-6 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-blue-900">Connect to GitHub</h3>
          </div>
          <p className="text-blue-800 mb-4">
            Authenticate with GitHub to push your generated project and Docker configuration to a new repository.
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-blue-900 mb-2">
                GitHub Personal Access Token *
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  autoComplete="off"
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-xs text-blue-700 mt-1">
                Create a token at{' '}
                <a 
                  href="https://github.com/settings/tokens" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline hover:text-blue-800"
                >
                  GitHub Settings → Developer settings → Personal access tokens
                </a>
              </p>
            </div>
            
            <button
              onClick={handleAuthenticate}
              disabled={isAuthenticating || !token.trim()}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isAuthenticating ? 'Authenticating...' : 'Connect to GitHub'}
            </button>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Required Permissions</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• <strong>repo</strong> - Create and manage repositories (full control)</li>
            <li>• <strong>user</strong> - Read user profile information</li>
            <li>• <strong>delete_repo</strong> - Delete repositories (optional)</li>
          </ul>
          <p className="text-xs text-gray-500 mt-2">
            Make sure to select "repo" scope when creating your token for full repository access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* User Info */}
      <div className="bg-green-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <img 
              src={auth.user.avatar_url} 
              alt={auth.user.name}
              className="w-10 h-10 rounded-full mr-3"
            />
            <div>
              <p className="font-medium text-green-900">{auth.user.name}</p>
              <p className="text-sm text-green-700">@{auth.user.login}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center px-3 py-1 text-sm text-green-700 hover:text-green-800 transition-colors"
          >
            <LogOut className="h-4 w-4 mr-1" />
            Logout
          </button>
        </div>
      </div>

      {/* Repository Configuration */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Repository Configuration</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Repository Name
            </label>
            <input
              type="text"
              value={repoOptions.name}
              onChange={(e) => setRepoOptions(prev => ({ ...prev, name: e.target.value }))}
              pattern="[a-zA-Z0-9._-]+"
              title="Repository name can only contain letters, numbers, dots, hyphens, and underscores"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="my-awesome-project"
            />
            <p className="text-xs text-gray-500 mt-1">
              Only letters, numbers, dots, hyphens, and underscores are allowed
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <input
              type="text"
              value={repoOptions.description}
              onChange={(e) => setRepoOptions(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="A brief description of your project"
            />
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="private-repo"
              checked={repoOptions.private}
              onChange={(e) => setRepoOptions(prev => ({ ...prev, private: e.target.checked }))}
              className="mr-2"
            />
            <label htmlFor="private-repo" className="flex items-center text-sm text-gray-700">
              {repoOptions.private ? <Lock className="h-4 w-4 mr-1" /> : <Unlock className="h-4 w-4 mr-1" />}
              Private repository
            </label>
          </div>
        </div>
      </div>

      {/* Files to Push */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Files to Push</h3>
        
        <div className="space-y-2">
          <div className="flex items-center text-sm">
            <GitBranch className="h-4 w-4 text-green-600 mr-2" />
            <span className="font-medium">Docker Configuration:</span>
          </div>
          <ul className="ml-6 text-sm text-gray-600 space-y-1">
            <li>• Dockerfile</li>
            {dockerFiles.dockerCompose && <li>• docker-compose.yml</li>}
            <li>• .dockerignore</li>
            <li>• DOCKER_README.md</li>
          </ul>
          
          <div className="flex items-center text-sm mt-4">
            <GitBranch className="h-4 w-4 text-blue-600 mr-2" />
            <span className="font-medium">Project Files: {projectFiles.size} files</span>
          </div>
          
          <div className="flex items-center text-sm mt-2">
            <GitBranch className="h-4 w-4 text-purple-600 mr-2" />
            <span className="font-medium">Additional Files:</span>
          </div>
          <ul className="ml-6 text-sm text-gray-600 space-y-1">
            <li>• README.md (main project documentation)</li>
            <li>• .gitignore (ignore unnecessary files)</li>
          </ul>
        </div>
      </div>

      {/* Push Button */}
      <button
        onClick={handlePushToGitHub}
        disabled={isPushing || !repoOptions.name.trim() || !/^[a-zA-Z0-9._-]+$/.test(repoOptions.name)}
        className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
      >
        {isPushing ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Pushing to GitHub...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            Push to GitHub
          </>
        )}
      </button>

      {/* Push Result */}
      {pushResult && (
        <div className={`rounded-lg p-4 ${
          pushResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center">
            {pushResult.success ? (
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            )}
            <div className="flex-1">
              {pushResult.success ? (
                <div>
                  <p className="font-medium text-green-900">Successfully pushed to GitHub!</p>
                  <a 
                    href={pushResult.repoUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-green-700 hover:text-green-800 underline"
                  >
                    🔗 View repository on GitHub →
                  </a>
                </div>
              ) : (
                <div>
                  <p className="font-medium text-red-900">Push failed</p>
                  <p className="text-sm text-red-700">{pushResult.error}</p>
                  <p className="text-xs text-red-600 mt-1">
                    Please check your token permissions and try again.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}