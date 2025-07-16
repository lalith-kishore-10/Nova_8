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
      
      // Validate files before pushing
      if (files.size === 0) {
        throw new Error('No files to push');
      }
      
      // Filter out invalid files more thoroughly
      const validFiles = new Map<string, string>();
      for (const [path, content] of files) {
        if (content && 
            typeof content === 'string' && 
            content.trim().length > 0 && 
            content.length < 10000000 && // 10MB limit
            !path.includes('..') && // Security check
            !path.startsWith('/') && // Security check
            path.length > 0) {
          validFiles.set(path, content);
        } else {
          logger.warning('github', `Skipping invalid file: ${path}`);
        }
      }
      
      if (validFiles.size === 0) {
        throw new Error('No valid files to push after filtering');
      }
      
      // Log files being pushed for debugging
      logger.debug('github', 'Valid files to push:', Array.from(validFiles.keys()).join(', '));

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
      for (const [path, content] of validFiles) {
        logger.debug('github', `Creating blob for ${path}`);
        
        try {
          // Ensure content is properly encoded
          let encodedContent: string;
          try {
            // Try to encode as UTF-8 first
            encodedContent = btoa(unescape(encodeURIComponent(content)));
          } catch (encodeError) {
            // Fallback to simple base64 encoding
            encodedContent = btoa(content);
          }
          
          const { data: blob } = await this.octokit.rest.git.createBlob({
            owner,
            repo: repoName,
            content: encodedContent,
            encoding: 'base64'
          });
          
          blobs.set(path, blob.sha);
          logger.debug('github', `Created blob for ${path}: ${blob.sha}`);
        } catch (blobError) {
          logger.error('github', `Failed to create blob for ${path}`, blobError instanceof Error ? blobError.message : 'Unknown error');
          throw new Error(`Failed to create blob for ${path}: ${blobError instanceof Error ? blobError.message : 'Unknown error'}`);
        }
      }
      
      if (blobs.size === 0) {
        throw new Error('No valid files to push (all files were empty or invalid)');
      }
      
      logger.info('github', `Created ${blobs.size} blobs successfully`);

      // Create tree with proper file modes
      const tree = Array.from(blobs.entries()).map(([path, sha]) => {
        // Determine file mode based on file type
        let mode: '100644' | '100755' | '040000' | '160000' | '120000' = '100644';
        
        // Make shell scripts executable
        if (path.endsWith('.sh') || path.endsWith('.bash') || path.startsWith('bin/')) {
          mode = '100755';
        }
        
        return {
          path,
          mode,
          type: 'blob' as const,
          sha
        };
      });

      logger.info('github', `Creating tree with ${tree.length} files`);
      
      let newTree;
      try {
        const createTreeParams: any = {
          owner,
          repo: repoName,
          tree
        };
        
        // Only add base_tree if we have an existing tree
        if (treeSha) {
          createTreeParams.base_tree = treeSha;
        }
        
        const { data } = await this.octokit.rest.git.createTree(createTreeParams);
        newTree = data;
        logger.info('github', `Created tree: ${newTree.sha}`);
      } catch (treeError) {
        logger.error('github', 'Failed to create tree', treeError instanceof Error ? treeError.message : 'Unknown error');
        throw new Error(`Failed to create tree: ${treeError instanceof Error ? treeError.message : 'Unknown error'}`);
      }

      // Create commit
      logger.info('github', 'Creating commit');
      
      let commit;
      try {
        const createCommitParams: any = {
          owner,
          repo: repoName,
          message: commitMessage,
          tree: newTree.sha
        };
        
        // Add parents if we have a parent commit
        if (parentSha) {
          createCommitParams.parents = [parentSha];
        }
        
        const { data } = await this.octokit.rest.git.createCommit(createCommitParams);
        commit = data;
        logger.info('github', `Created commit: ${commit.sha}`);
      } catch (commitError) {
        logger.error('github', 'Failed to create commit', commitError instanceof Error ? commitError.message : 'Unknown error');
        throw new Error(`Failed to create commit: ${commitError instanceof Error ? commitError.message : 'Unknown error'}`);
      }

      // Create or update branch reference
      try {
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
      } catch (refError) {
        logger.error('github', 'Failed to update/create branch reference', refError instanceof Error ? refError.message : 'Unknown error');
        throw new Error(`Failed to update branch: ${refError instanceof Error ? refError.message : 'Unknown error'}`);
      }

      logger.success('github', `Successfully pushed ${files.size} files to ${repo.full_name}`);
      
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
          error: 'Repository not found or access denied. Please check the repository name and your permissions.'
        };
      } else if (errorMessage.includes('empty')) {
        return {
          success: false,
          error: 'No files to push. Please ensure you have selected files to upload.'
        };
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        return {
          success: false,
          error: 'Network error occurred. Please check your internet connection and try again.'
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