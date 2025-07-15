import type { ParsedRepoUrl, GitHubRepo, GitHubTree, GitHubFile } from '../types/github';

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

export async function fetchRepository(owner: string, repo: string): Promise<GitHubRepo> {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Repository not found. Please check the URL and try again.');
    }
    throw new Error(`Failed to fetch repository: ${response.statusText}`);
  }

  return response.json();
}

export async function fetchRepositoryTree(owner: string, repo: string, branch: string = 'main'): Promise<GitHubTree> {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`);
  
  if (!response.ok) {
    // Try 'master' branch if 'main' fails
    if (branch === 'main') {
      return fetchRepositoryTree(owner, repo, 'master');
    }
    throw new Error(`Failed to fetch repository tree: ${response.statusText}`);
  }

  return response.json();
}

export async function fetchFileContent(owner: string, repo: string, path: string): Promise<GitHubFile> {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch file content: ${response.statusText}`);
  }

  return response.json();
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