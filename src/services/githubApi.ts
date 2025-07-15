import { GitHubRepository, GitHubContent, FileNode } from '../types/github';

const GITHUB_API_BASE = 'https://api.github.com';

class GitHubApiService {
  private async fetchWithErrorHandling(url: string): Promise<any> {
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Repository not found. Please check the URL and ensure the repository is public.');
      } else if (response.status === 403) {
        throw new Error('API rate limit exceeded. Please try again later.');
      } else {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }
    }
    
    return response.json();
  }

  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}`;
    return this.fetchWithErrorHandling(url);
  }

  async getRepositoryContents(owner: string, repo: string, path: string = ''): Promise<GitHubContent[]> {
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`;
    const data = await this.fetchWithErrorHandling(url);
    return Array.isArray(data) ? data : [data];
  }

  async getFileContent(owner: string, repo: string, path: string): Promise<string> {
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`;
    const data = await this.fetchWithErrorHandling(url);
    
    if (data.type !== 'file' || !data.content) {
      throw new Error('Unable to fetch file content');
    }
    
    // Decode base64 content
    return atob(data.content.replace(/\n/g, ''));
  }

  parseRepositoryUrl(url: string): { owner: string; repo: string } | null {
    // Support various GitHub URL formats
    const patterns = [
      /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/.*)?$/,
      /^git@github\.com:([^\/]+)\/([^\/]+?)(?:\.git)?$/,
      /^([^\/]+)\/([^\/]+)$/ // Simple owner/repo format
    ];

    for (const pattern of patterns) {
      const match = url.trim().match(pattern);
      if (match) {
        return {
          owner: match[1],
          repo: match[2]
        };
      }
    }

    return null;
  }

  async buildFileTree(owner: string, repo: string, path: string = ''): Promise<FileNode[]> {
    try {
      const contents = await this.getRepositoryContents(owner, repo, path);
      const nodes: FileNode[] = [];

      for (const item of contents) {
        const node: FileNode = {
          name: item.name,
          type: item.type === 'dir' ? 'directory' : 'file',
          path: item.path,
          size: item.size,
          sha: item.sha,
          download_url: item.download_url || undefined,
          expanded: false
        };

        if (item.type === 'dir') {
          // Don't load children initially for performance
          node.children = [];
        }

        nodes.push(node);
      }

      // Sort: directories first, then files, both alphabetically
      return nodes.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      console.error('Error building file tree:', error);
      throw error;
    }
  }
}

export const githubApi = new GitHubApiService();