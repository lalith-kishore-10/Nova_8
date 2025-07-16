import type { ParsedRepoUrl, GitHubRepo, GitHubTree, GitHubFile } from '../types/github';
import { logger } from './logger';

// GitHub API configuration
const GITHUB_API_BASE = 'https://api.github.com';
const DEFAULT_HEADERS = {
  'Accept': 'application/vnd.github.v3+json',
  'User-Agent': 'GitHub-Repository-Explorer/1.0',
  'X-GitHub-Api-Version': '2022-11-28'
};

// Rate limiting and retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const RATE_LIMIT_DELAY = 60000; // 1 minute

export function parseGitHubUrl(url: string): ParsedRepoUrl {
  const patterns = [
    /^https:\/\/github\.com\/([^\/]+)\/([^\/]+)(?:\.git)?(?:\/.*)?$/,
    /^git@github\.com:([^\/]+)\/([^\/]+)(?:\.git)?$/,
    /^([^\/]+)\/([^\/]+)$/
  ];

  for (const pattern of patterns) {
    const match = url.trim().match(pattern);
    if (match) {
      const [, owner, repo] = match;
      return {
        owner: owner.trim(),
        repo: repo.replace(/\.git$/, '').trim(),
        isValid: true
      };
    }
  }

  return { owner: '', repo: '', isValid: false };
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function makeGitHubRequest(url: string, options: RequestInit = {}): Promise<Response> {
  const fullUrl = url.startsWith('http') ? url : `${GITHUB_API_BASE}${url}`;
  
  logger.debug('api', `Making request to: ${fullUrl}`);
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(fullUrl, {
        ...options,
        headers: {
          ...DEFAULT_HEADERS,
          ...options.headers
        }
      });

      // Handle rate limiting
      if (response.status === 403) {
        const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
        const rateLimitReset = response.headers.get('X-RateLimit-Reset');
        
        if (rateLimitRemaining === '0' && rateLimitReset) {
          const resetTime = parseInt(rateLimitReset) * 1000;
          const waitTime = Math.max(resetTime - Date.now(), RATE_LIMIT_DELAY);
          
          logger.warning('api', `Rate limit exceeded. Waiting ${Math.round(waitTime / 1000)}s before retry`);
          
          if (attempt < MAX_RETRIES) {
            await sleep(waitTime);
            continue;
          }
        }
      }

      // Handle temporary server errors with retry
      if (response.status >= 500 && attempt < MAX_RETRIES) {
        logger.warning('api', `Server error (${response.status}). Retrying in ${RETRY_DELAY}ms...`);
        await sleep(RETRY_DELAY * attempt);
        continue;
      }

      // Handle network timeouts with retry
      if (!response.ok && response.status === 0 && attempt < MAX_RETRIES) {
        logger.warning('api', `Network error. Retrying in ${RETRY_DELAY}ms...`);
        await sleep(RETRY_DELAY * attempt);
        continue;
      }

      return response;
    } catch (error) {
      logger.warning('api', `Request attempt ${attempt} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      if (attempt === MAX_RETRIES) {
        throw error;
      }
      
      // Wait before retrying
      await sleep(RETRY_DELAY * attempt);
    }
  }

  throw new Error('Max retries exceeded');
}

export async function fetchRepository(owner: string, repo: string): Promise<GitHubRepo> {
  logger.info('api', `Fetching repository: ${owner}/${repo}`);
  
  try {
    const response = await makeGitHubRequest(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Repository "${owner}/${repo}" not found. Please check the repository name and ensure it's public.`);
      } else if (response.status === 403) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.message?.includes('rate limit')) {
          throw new Error('GitHub API rate limit exceeded. Please try again in a few minutes.');
        }
        throw new Error('Access denied. The repository might be private or you might need authentication.');
      } else if (response.status === 401) {
        throw new Error('Authentication required. Please check your GitHub token if using private repositories.');
      } else {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`GitHub API error (${response.status}): ${errorText}`);
      }
    }

    const data = await response.json();
    logger.success('api', `Repository fetched successfully: ${data.full_name}`);
    return data;
  } catch (error) {
    if (error instanceof Error) {
      logger.error('api', `Failed to fetch repository: ${owner}/${repo}`, error.message);
      throw error;
    }
    throw new Error(`Failed to fetch repository: ${owner}/${repo}`);
  }
}

export async function fetchRepositoryTree(owner: string, repo: string, branch: string = 'main'): Promise<GitHubTree> {
  logger.info('api', `Fetching repository tree: ${owner}/${repo}@${branch}`);
  
  try {
    const response = await makeGitHubRequest(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(branch)}?recursive=1`
    );
    
    if (!response.ok) {
      // Try 'master' branch if 'main' fails
      if (branch === 'main' && response.status === 404) {
        logger.info('api', 'Main branch not found, trying master branch');
        return fetchRepositoryTree(owner, repo, 'master');
      }
      
      // Try default branch from repository info
      if (response.status === 404) {
        try {
          const repoInfo = await fetchRepository(owner, repo);
          if (repoInfo.default_branch && repoInfo.default_branch !== branch) {
            logger.info('api', `Trying default branch: ${repoInfo.default_branch}`);
            return fetchRepositoryTree(owner, repo, repoInfo.default_branch);
          }
        } catch (repoError) {
          // Continue with original error
        }
      }
      
      if (response.status === 404) {
        throw new Error(`Branch "${branch}" not found in repository "${owner}/${repo}". The repository might be empty.`);
      } else if (response.status === 403) {
        throw new Error('Access denied to repository tree. The repository might be private.');
      } else {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Failed to fetch repository tree (${response.status}): ${errorText}`);
      }
    }

    const data = await response.json();
    logger.success('api', `Repository tree fetched: ${data.tree.length} items`);
    return data;
  } catch (error) {
    if (error instanceof Error) {
      logger.error('api', `Failed to fetch repository tree: ${owner}/${repo}@${branch}`, error.message);
      throw error;
    }
    throw new Error(`Failed to fetch repository tree: ${owner}/${repo}@${branch}`);
  }
}

export async function fetchFileContent(owner: string, repo: string, path: string): Promise<GitHubFile> {
  logger.debug('api', `Fetching file content: ${path}`);
  
  try {
    const response = await makeGitHubRequest(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeURIComponent(path)}`
    );
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`File not found: ${path}`);
      } else if (response.status === 403) {
        throw new Error(`Access denied to file: ${path}`);
      } else {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Failed to fetch file "${path}" (${response.status}): ${errorText}`);
      }
    }

    const data = await response.json();
    
    // Handle directory response
    if (Array.isArray(data)) {
      throw new Error(`"${path}" is a directory, not a file`);
    }
    
    // Validate file data
    if (data.type !== 'file') {
      throw new Error(`"${path}" is not a file (type: ${data.type})`);
    }
    
    logger.debug('api', `File content fetched: ${path} (${data.size} bytes)`);
    return data;
  } catch (error) {
    if (error instanceof Error) {
      logger.warning('api', `Failed to fetch file content: ${path}`, error.message);
      throw error;
    }
    throw new Error(`Failed to fetch file content: ${path}`);
  }
}

export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot > 0 ? filename.substring(lastDot + 1).toLowerCase() : '';
}

export function getLanguageFromExtension(extension: string): string {
  const languageMap: Record<string, string> = {
    js: 'javascript',
    ts: 'typescript',
    jsx: 'javascript',
    tsx: 'typescript',
    py: 'python',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    cs: 'csharp',
    php: 'php',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    kt: 'kotlin',
    swift: 'swift',
    html: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    json: 'json',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
    md: 'markdown',
    sql: 'sql',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    ps1: 'powershell',
    dockerfile: 'dockerfile',
    makefile: 'makefile',
    r: 'r',
    scala: 'scala',
    lua: 'lua',
    perl: 'perl',
    vim: 'vim'
  };

  return languageMap[extension] || 'text';
}

// Utility function to check GitHub API status
export async function checkGitHubApiStatus(): Promise<{ status: string; message: string }> {
  try {
    const response = await makeGitHubRequest('/rate_limit');
    
    if (response.ok) {
      const data = await response.json();
      return {
        status: 'ok',
        message: `API accessible. Rate limit: ${data.rate.remaining}/${data.rate.limit}`
      };
    } else {
      return {
        status: 'error',
        message: `GitHub API returned status ${response.status}`
      };
    }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}