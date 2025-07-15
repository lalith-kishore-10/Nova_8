export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  language: string | null;
  default_branch: string;
  size: number;
  created_at: string;
  updated_at: string;
  owner: {
    login: string;
    avatar_url: string;
  };
}

export interface GitHubContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string | null;
  type: 'file' | 'dir';
  content?: string;
  encoding?: string;
}

export interface FileNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  size?: number;
  content?: string;
  children?: FileNode[];
  expanded?: boolean;
  sha?: string;
  download_url?: string;
}