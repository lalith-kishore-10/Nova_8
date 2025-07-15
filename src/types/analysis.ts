export interface StackAnalysis {
  primaryLanguage: string;
  framework?: string;
  packageManager?: string;
  runtime?: string;
  database?: string[];
  dependencies: Dependency[];
  devDependencies: Dependency[];
  scripts: Record<string, string>;
  buildTool?: string;
  testFramework?: string;
  linting?: string[];
  styling?: string[];
  architecture?: string;
  deployment?: string;
  recommendations?: string[];
  dockerStrategy?: DockerStrategy;
}

export interface Dependency {
  name: string;
  version?: string;
  type: 'runtime' | 'dev' | 'peer';
  category: string;
  security?: string;
  recommendation?: string;
}

export interface DockerStrategy {
  baseImage: string;
  buildStage: string;
  optimizations: string[];
  securityConsiderations: string[];
}

export interface DockerConfig {
  baseImage: string;
  workdir: string;
  copyInstructions: string[];
  runInstructions: string[];
  exposePort: number;
  startCommand: string;
  buildStage?: string;
  environmentVars?: Record<string, string>;
}

export interface GeneratedFiles {
  dockerfile: string;
  dockerCompose?: string;
  dockerignore: string;
  readme: string;
  healthCheck?: HealthCheckConfig;
  buildScript?: string;
  securityRecommendations?: string[];
  optimizations?: string[];
  estimatedSize?: string;
  buildTime?: string;
}

export interface HealthCheckConfig {
  endpoint: string;
  dockerHealthCheck: {
    command: string;
    interval: string;
    timeout: string;
    retries: number;
    startPeriod: string;
  };
  applicationHealthCheck?: {
    route: string;
    checks: HealthCheck[];
  };
  monitoring?: {
    metrics: string[];
    alerts: string[];
    logging: string;
  };
  kubernetesProbes?: {
    livenessProbe: string;
    readinessProbe: string;
    startupProbe: string;
  };
}

export interface HealthCheck {
  name: string;
  type: 'database' | 'service' | 'file' | 'memory';
  command: string;
  timeout: string;
}

export interface DockerTestResult {
  validation: {
    isValid: boolean;
    syntaxErrors: string[];
    warnings: string[];
    suggestions: string[];
  };
  security: {
    score: number;
    vulnerabilities: SecurityVulnerability[];
    recommendations: string[];
  };
  performance: {
    score: number;
    issues: string[];
    optimizations: string[];
    estimatedBuildTime: string;
    estimatedImageSize: string;
  };
  bestPractices: {
    score: number;
    violations: string[];
    improvements: string[];
  };
  testCommands: TestCommand[];
  healthCheck: {
    isConfigured: boolean;
    endpoint: string;
    recommendations: string[];
  };
}

export interface SecurityVulnerability {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  fix: string;
}

export interface TestCommand {
  command: string;
  description: string;
  expectedResult: string;
}