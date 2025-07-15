export interface TechStackAnalysis {
  primaryLanguages: string[];
  frameworks: string[];
  libraries: string[];
  buildTools: string[];
  databases: string[];
  cloudServices: string[];
  devTools: string[];
  packageManagers: string[];
  confidence: number;
  summary: string;
}

export interface DependencyAnalysis {
  production: Dependency[];
  development: Dependency[];
  totalCount: number;
  outdatedCount: number;
  securityIssues: number;
  summary: string;
}

export interface Dependency {
  name: string;
  version: string;
  type: 'production' | 'development';
  description?: string;
  isOutdated?: boolean;
  hasSecurityIssue?: boolean;
  latestVersion?: string;
}

export interface RepositoryAnalysis {
  techStack: TechStackAnalysis;
  dependencies: DependencyAnalysis;
  projectType: string;
  complexity: 'Low' | 'Medium' | 'High';
  maintainability: number;
  analyzedAt: string;
}
</parameter>