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
      const { data: repo } = await this.octokit.rest.repos.createForAuthenticatedUser({
        name: options.name,
        description: options.description,
        private: options.private || false,
        auto_init: options.auto_init || true
      });

      logger.success('github', `Repository created: ${repo.full_name}`);
      return repo.clone_url;
    } catch (error) {
      logger.error('github', 'Failed to create repository', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  async pushFiles(repoName: string, files: Map<string, string>, commitMessage: string = 'Initial commit'): Promise<PushResult> {
    if (!this.octokit || !this.auth) {
      throw new Error('Not authenticated with GitHub');
    }

    try {
      const owner = this.auth.user.login;
      
      // Get the repository
      const { data: repo } = await this.octokit.rest.repos.get({
        owner,
        repo: repoName
      });

      // Get the default branch
      const { data: branch } = await this.octokit.rest.repos.getBranch({
        owner,
        repo: repoName,
        branch: repo.default_branch
      });

      // Create blobs for all files
      const blobs = new Map<string, string>();
      for (const [path, content] of files) {
        const { data: blob } = await this.octokit.rest.git.createBlob({
          owner,
          repo: repoName,
          content: Buffer.from(content).toString('base64'),
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

      const { data: newTree } = await this.octokit.rest.git.createTree({
        owner,
        repo: repoName,
        tree,
        base_tree: branch.commit.commit.tree.sha
      });

      // Create commit
      const { data: commit } = await this.octokit.rest.git.createCommit({
        owner,
        repo: repoName,
        message: commitMessage,
        tree: newTree.sha,
        parents: [branch.commit.sha]
      });

      // Update branch reference
      await this.octokit.rest.git.updateRef({
        owner,
        repo: repoName,
        ref: `heads/${repo.default_branch}`,
        sha: commit.sha
      });

      logger.success('github', `Files pushed to ${repo.full_name}`);
      
      return {
        success: true,
        repoUrl: repo.html_url
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('github', 'Failed to push files', errorMessage);
      
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