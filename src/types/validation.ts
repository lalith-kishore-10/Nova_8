export interface ValidationResult {
  isValid: boolean;
  score: number; // 0-100
  checks: ValidationCheck[];
  recommendations: string[];
  dockerValidation?: DockerValidation;
}

export interface ValidationCheck {
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'info';
  message: string;
  category: 'structure' | 'dependencies' | 'configuration' | 'security' | 'performance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details?: string;
}

export interface DockerValidation {
  dockerfileValid: boolean;
  buildable: boolean;
  securityIssues: SecurityIssue[];
  optimizations: string[];
  estimatedSize: string;
  buildTime: string;
}

export interface SecurityIssue {
  type: 'vulnerability' | 'misconfiguration' | 'best-practice';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  fix: string;
}

export interface HealthCheckConfig {
  endpoint?: string;
  command?: string;
  interval: string;
  timeout: string;
  retries: number;
  startPeriod?: string;
}

export interface TestResult {
  testType: 'unit' | 'integration' | 'e2e' | 'docker';
  status: 'pass' | 'fail' | 'skip';
  duration: number;
  output: string;
  coverage?: number;
}