import { Octokit } from '@octokit/rest';
import type { GitHubAuth, GitHubUser, CreateRepoOptions, PushResult } from '../types/github';
import { logger } from './logger';

export class GitHubAuthManager {
  private octokit: Octokit | null = null;
  private auth: GitHubAuth | null = null;

  async authenticate(token: string): Promise<GitHubAuth> {
    try {
      this.octokit = new Octokit({
        auth: token,
      });

      const { data: user } = await this.octokit.rest.users.getAuthenticated();
      
      this.auth = {
        token,
        user: {
          login: user.login,
          id: user.id,
          name: user.name || user.login,
          email: user.email || '',
          avatar_url: user.avatar_url
        }
      };

      logger.success('github', `Authenticated as ${user.login}`);
      return this.auth;
    } catch (error) {
      logger.error('github', 'Authentication failed', error instanceof Error ? error.message : 'Unknown error');
      throw new Error('GitHub authentication failed. Please check your token.');
    }
  }

  async createRepository(options: CreateRepoOptions): Promise<string> {
    if (!this.octokit || !this.auth) {
      throw new Error('Not authenticated with GitHub');
    }

    try {
      logger.info('github', `Creating repository: ${options.name}`);
      
      const { data: repo } = await this.octokit.rest.repos.createForAuthenticatedUser({
        name: options.name,
        description: options.description,
        private: options.private || false,
        auto_init: false // Don't auto-init to avoid conflicts
      });

      logger.success('github', `Repository created: ${repo.full_name}`);
      return repo.html_url;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('github', 'Failed to create repository', errorMessage);
      
      // Handle specific GitHub API errors
      if (errorMessage.includes('name already exists')) {
        throw new Error(`Repository "${options.name}" already exists. Please choose a different name.`);
      } else if (errorMessage.includes('Bad credentials')) {
        throw new Error('Invalid GitHub token. Please check your token and try again.');
      } else if (errorMessage.includes('rate limit')) {
        throw new Error('GitHub API rate limit exceeded. Please try again later.');
      }
      
      throw new Error(`Failed to create repository: ${errorMessage}`);
    }
  }

  async pushFiles(repoName: string, files: Map<string, string>, commitMessage: string = 'Initial commit'): Promise<PushResult> {
    if (!this.octokit || !this.auth) {
      throw new Error('Not authenticated with GitHub');
    }

    try {
      const owner = this.auth.user.login;
      logger.info('github', `Pushing ${files.size} files to ${owner}/${repoName}`);
      

      // Check if repository exists and get its info
      let repo;
      try {
        const { data } = await this.octokit.rest.repos.get({
          owner,
          repo: repoName
        });
        repo = data;
      } catch (error: any) {
        if (error.status === 404) {
          throw new Error(`Repository "${repoName}" not found. Please create it first.`);
        }
        throw error;
      }

      // Check if repository is empty (no commits)
      let parentSha: string | undefined;
      let treeSha: string | undefined;
      
      try {
        const { data: branch } = await this.octokit.rest.repos.getBranch({
          owner,
          repo: repoName,
          branch: repo.default_branch
        });
        parentSha = branch.commit.sha;
        treeSha = branch.commit.commit.tree.sha;
      } catch (error: any) {
        // Repository is empty, no default branch exists yet
        logger.info('github', 'Repository is empty, creating initial commit');
      }

      // Create blobs for all files
      const blobs = new Map<string, string>();
      for (const [path, content] of files) {
        logger.debug('github', `Creating blob for ${path}`);
        const { data: blob } = await this.octokit.rest.git.createBlob({
          owner,
          repo: repoName,
          content: btoa(unescape(encodeURIComponent(content))),
          encoding: 'base64'
        });
        blobs.set(path, blob.sha);
      }

      // Create tree
      const tree = Array.from(blobs.entries()).map(([path, sha]) => ({
        path,
        mode: '100644' as const,
        type: 'blob' as const,
        sha
      }));

      logger.info('github', `Creating tree with ${tree.length} files`);
      const { data: newTree } = await this.octokit.rest.git.createTree({
        owner,
        repo: repoName,
        tree,
        base_tree: treeSha // undefined for empty repos
      });

      // Create commit
      logger.info('github', 'Creating commit');
      const { data: commit } = await this.octokit.rest.git.createCommit({
        owner,
        repo: repoName,
        message: commitMessage,
        tree: newTree.sha,
        parents: parentSha ? [parentSha] : [] // empty array for initial commit
      });

      // Create or update branch reference
      if (parentSha) {
        // Update existing branch
        logger.info('github', `Updating ${repo.default_branch} branch`);
        await this.octokit.rest.git.updateRef({
          owner,
          repo: repoName,
          ref: `heads/${repo.default_branch}`,
          sha: commit.sha
        });
      } else {
        // Create initial branch (usually main or master)
        const defaultBranch = repo.default_branch || 'main';
        logger.info('github', `Creating ${defaultBranch} branch`);
        await this.octokit.rest.git.createRef({
          owner,
          repo: repoName,
          ref: `refs/heads/${defaultBranch}`,
          sha: commit.sha
        });
      }

      logger.success('github', `Files pushed to ${repo.full_name}`);
      
      return {
        success: true,
        repoUrl: repo.html_url
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('github', 'Failed to push files', errorMessage);
      
      // Handle specific errors
      if (errorMessage.includes('Bad credentials')) {
        return {
          success: false,
          error: 'Invalid GitHub token. Please check your token and try again.'
        };
      } else if (errorMessage.includes('rate limit')) {
        return {
          success: false,
          error: 'GitHub API rate limit exceeded. Please try again later.'
        };
      } else if (errorMessage.includes('not found')) {
        return {
          success: false,
          error: 'Repository not found. Please make sure the repository exists and you have access to it.'
        };
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  getAuth(): GitHubAuth | null {
    return this.auth;
  }

  isAuthenticated(): boolean {
    return this.auth !== null;
  }

  logout() {
    this.octokit = null;
    this.auth = null;
    logger.info('github', 'Logged out from GitHub');
  }
}

export const githubAuth = new GitHubAuthManager();