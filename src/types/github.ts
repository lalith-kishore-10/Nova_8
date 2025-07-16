export interface GitHubRepo {
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  default_branch: string;
  language: string;
  stargazers_count: number;
  forks_count: number;
}

export interface GitHubTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

export interface GitHubTree {
  sha: string;
  url: string;
  tree: GitHubTreeItem[];
  truncated: boolean;
}

export interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: 'file';
  content: string;
  encoding: 'base64';
}

export interface ParsedRepoUrl {
  owner: string;
  repo: string;
  isValid: boolean;
}

export interface GitHubAuth {
  token: string;
  user: GitHubUser;
}

export interface GitHubUser {
  login: string;
  id: number;
  name: string;
  email: string;
  avatar_url: string;
}

export interface CreateRepoOptions {
  name: string;
  description?: string;
  private?: boolean;
  auto_init?: boolean;
}

export interface PushResult {
  success: boolean;
  repoUrl?: string;
  error?: string;
}