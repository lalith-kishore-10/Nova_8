export interface TestSuite {
  id: string;
  name: string;
  type: 'syntax' | 'lint' | 'unit' | 'integration' | 'build';
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  duration?: number;
  errors: TestError[];
  warnings: TestWarning[];
  suggestions: string[];
}

export interface TestError {
  id: string;
  file: string;
  line?: number;
  column?: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  rule?: string;
  fixable: boolean;
  suggestedFix?: string;
}

export interface TestWarning {
  id: string;
  file: string;
  line?: number;
  column?: number;
  message: string;
  rule?: string;
}

export interface CodeFix {
  file: string;
  original: string;
  fixed: string;
  description: string;
}

export interface TestRunner {
  runTests(): Promise<TestSuite[]>;
  fixErrors(errors: TestError[]): Promise<CodeFix[]>;
}