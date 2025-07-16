import { logger } from './logger';
import type { TestSuite, TestError, TestWarning, CodeFix, TestRunner } from '../types/testing';
import type { StackAnalysis, GeneratedFiles } from '../types/analysis';

export class CodeTestRunner implements TestRunner {
  private analysis: StackAnalysis;
  private dockerFiles: GeneratedFiles;
  private projectFiles: Map<string, string>;

  constructor(analysis: StackAnalysis, dockerFiles: GeneratedFiles, projectFiles: Map<string, string>) {
    this.analysis = analysis;
    this.dockerFiles = dockerFiles;
    this.projectFiles = projectFiles;
  }

  async runTests(): Promise<TestSuite[]> {
    const suites: TestSuite[] = [];
    
    logger.info('testing', 'Starting comprehensive test suite');

    // Run syntax validation
    suites.push(await this.runSyntaxTests());
    
    // Run linting tests
    suites.push(await this.runLintTests());
    
    // Run Docker validation
    suites.push(await this.runDockerTests());
    
    // Run build tests
    suites.push(await this.runBuildTests());
    
    // Run security tests
    suites.push(await this.runSecurityTests());

    const totalErrors = suites.reduce((sum, suite) => sum + suite.errors.length, 0);
    const totalWarnings = suites.reduce((sum, suite) => sum + suite.warnings.length, 0);
    
    logger.info('testing', `Test suite completed: ${totalErrors} errors, ${totalWarnings} warnings`);
    
    return suites;
  }

  private async runSyntaxTests(): Promise<TestSuite> {
    const suite: TestSuite = {
      id: 'syntax',
      name: 'Syntax Validation',
      type: 'syntax',
      status: 'running',
      errors: [],
      warnings: [],
      suggestions: []
    };

    try {
      // Validate JavaScript/TypeScript files
      if (this.analysis.primaryLanguage === 'javascript' || this.analysis.primaryLanguage === 'typescript') {
        await this.validateJavaScriptSyntax(suite);
      }

      // Validate Python files
      if (this.analysis.primaryLanguage === 'python') {
        await this.validatePythonSyntax(suite);
      }

      // Validate JSON files
      await this.validateJsonFiles(suite);

      // Validate Docker files
      await this.validateDockerSyntax(suite);

      suite.status = suite.errors.length > 0 ? 'failed' : 'passed';
    } catch (error) {
      suite.status = 'failed';
      suite.errors.push({
        id: 'syntax-error',
        file: 'unknown',
        message: error instanceof Error ? error.message : 'Unknown syntax error',
        severity: 'error',
        fixable: false
      });
    }

    return suite;
  }

  private async validateJavaScriptSyntax(suite: TestSuite) {
    // Simulate JavaScript/TypeScript syntax validation
    for (const [filePath, content] of this.projectFiles) {
      if (filePath.endsWith('.js') || filePath.endsWith('.ts') || filePath.endsWith('.jsx') || filePath.endsWith('.tsx')) {
        try {
          // Basic syntax validation using acorn for JS files
          if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
            const acorn = await import('acorn');
            acorn.parse(content, { ecmaVersion: 2022, sourceType: 'module' });
          }
        } catch (error: any) {
          suite.errors.push({
            id: `syntax-${filePath}`,
            file: filePath,
            line: error.loc?.line,
            column: error.loc?.column,
            message: error.message,
            severity: 'error',
            fixable: this.isSyntaxErrorFixable(error.message),
            suggestedFix: this.getSyntaxFix(error.message)
          });
        }
      }
    }
  }

  private async validatePythonSyntax(suite: TestSuite) {
    // Simulate Python syntax validation
    for (const [filePath, content] of this.projectFiles) {
      if (filePath.endsWith('.py')) {
        // Basic Python syntax checks
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          // Check for common Python syntax issues
          if (line.trim().endsWith(':') && !line.trim().match(/^(if|else|elif|for|while|def|class|try|except|finally|with)/)) {
            suite.warnings.push({
              id: `python-syntax-${filePath}-${index}`,
              file: filePath,
              line: index + 1,
              message: 'Potential syntax issue: unexpected colon',
              rule: 'python-syntax'
            });
          }
        });
      }
    }
  }

  private async validateJsonFiles(suite: TestSuite) {
    for (const [filePath, content] of this.projectFiles) {
      if (filePath.endsWith('.json')) {
        try {
          JSON.parse(content);
        } catch (error: any) {
          suite.errors.push({
            id: `json-${filePath}`,
            file: filePath,
            message: `Invalid JSON: ${error.message}`,
            severity: 'error',
            fixable: true,
            suggestedFix: 'Fix JSON syntax errors'
          });
        }
      }
    }
  }

  private async validateDockerSyntax(suite: TestSuite) {
    // Validate Dockerfile syntax
    const dockerfile = this.dockerFiles.dockerfile;
    const lines = dockerfile.split('\n');
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        // Check for valid Docker instructions
        const instruction = trimmed.split(' ')[0].toUpperCase();
        const validInstructions = [
          'FROM', 'RUN', 'CMD', 'LABEL', 'EXPOSE', 'ENV', 'ADD', 'COPY',
          'ENTRYPOINT', 'VOLUME', 'USER', 'WORKDIR', 'ARG', 'ONBUILD',
          'STOPSIGNAL', 'HEALTHCHECK', 'SHELL'
        ];
        
        if (!validInstructions.includes(instruction)) {
          suite.errors.push({
            id: `dockerfile-${index}`,
            file: 'Dockerfile',
            line: index + 1,
            message: `Unknown Docker instruction: ${instruction}`,
            severity: 'error',
            fixable: false
          });
        }
      }
    });
  }

  private async runLintTests(): Promise<TestSuite> {
    const suite: TestSuite = {
      id: 'lint',
      name: 'Code Linting',
      type: 'lint',
      status: 'running',
      errors: [],
      warnings: [],
      suggestions: []
    };

    try {
      // JavaScript/TypeScript linting
      if (this.analysis.primaryLanguage === 'javascript' || this.analysis.primaryLanguage === 'typescript') {
        await this.runESLintChecks(suite);
      }

      // Python linting
      if (this.analysis.primaryLanguage === 'python') {
        await this.runPythonLintChecks(suite);
      }

      // General code quality checks
      await this.runCodeQualityChecks(suite);

      suite.status = suite.errors.length > 0 ? 'failed' : 'passed';
    } catch (error) {
      suite.status = 'failed';
      suite.errors.push({
        id: 'lint-error',
        file: 'unknown',
        message: error instanceof Error ? error.message : 'Unknown linting error',
        severity: 'error',
        fixable: false
      });
    }

    return suite;
  }

  private async runESLintChecks(suite: TestSuite) {
    // Simulate ESLint checks
    for (const [filePath, content] of this.projectFiles) {
      if (filePath.endsWith('.js') || filePath.endsWith('.ts') || filePath.endsWith('.jsx') || filePath.endsWith('.tsx')) {
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          // Check for common linting issues
          if (line.includes('console.log')) {
            suite.warnings.push({
              id: `eslint-console-${filePath}-${index}`,
              file: filePath,
              line: index + 1,
              message: 'Unexpected console statement',
              rule: 'no-console'
            });
          }
          
          if (line.includes('var ')) {
            suite.warnings.push({
              id: `eslint-var-${filePath}-${index}`,
              file: filePath,
              line: index + 1,
              message: 'Unexpected var, use let or const instead',
              rule: 'no-var'
            });
          }
          
          if (line.includes('==') && !line.includes('===')) {
            suite.warnings.push({
              id: `eslint-equality-${filePath}-${index}`,
              file: filePath,
              line: index + 1,
              message: 'Expected === and instead saw ==',
              rule: 'eqeqeq'
            });
          }
        });
      }
    }
  }

  private async runPythonLintChecks(suite: TestSuite) {
    // Simulate Python linting (flake8, pylint style)
    for (const [filePath, content] of this.projectFiles) {
      if (filePath.endsWith('.py')) {
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          // Check line length
          if (line.length > 88) {
            suite.warnings.push({
              id: `python-line-length-${filePath}-${index}`,
              file: filePath,
              line: index + 1,
              message: 'Line too long (>88 characters)',
              rule: 'line-too-long'
            });
          }
          
          // Check for unused imports (simplified)
          if (line.trim().startsWith('import ') && !content.includes(line.split(' ')[1])) {
            suite.warnings.push({
              id: `python-unused-import-${filePath}-${index}`,
              file: filePath,
              line: index + 1,
              message: 'Unused import',
              rule: 'unused-import'
            });
          }
        });
      }
    }
  }

  private async runCodeQualityChecks(suite: TestSuite) {
    // General code quality checks
    for (const [filePath, content] of this.projectFiles) {
      const lines = content.split('\n');
      
      // Check for TODO/FIXME comments
      lines.forEach((line, index) => {
        if (line.includes('TODO') || line.includes('FIXME')) {
          suite.warnings.push({
            id: `todo-${filePath}-${index}`,
            file: filePath,
            line: index + 1,
            message: 'TODO/FIXME comment found',
            rule: 'todo-comment'
          });
        }
      });
      
      // Check file size
      if (lines.length > 500) {
        suite.warnings.push({
          id: `file-size-${filePath}`,
          file: filePath,
          message: 'File is very large (>500 lines), consider splitting',
          rule: 'file-size'
        });
      }
    }
  }

  private async runDockerTests(): Promise<TestSuite> {
    const suite: TestSuite = {
      id: 'docker',
      name: 'Docker Validation',
      type: 'build',
      status: 'running',
      errors: [],
      warnings: [],
      suggestions: []
    };

    try {
      // Validate Dockerfile best practices
      await this.validateDockerBestPractices(suite);
      
      // Validate docker-compose.yml
      if (this.dockerFiles.dockerCompose) {
        await this.validateDockerCompose(suite);
      }

      suite.status = suite.errors.length > 0 ? 'failed' : 'passed';
    } catch (error) {
      suite.status = 'failed';
      suite.errors.push({
        id: 'docker-error',
        file: 'Dockerfile',
        message: error instanceof Error ? error.message : 'Unknown Docker error',
        severity: 'error',
        fixable: false
      });
    }

    return suite;
  }

  private async validateDockerBestPractices(suite: TestSuite) {
    const dockerfile = this.dockerFiles.dockerfile;
    const lines = dockerfile.split('\n');
    
    // Check for best practices
    if (!dockerfile.includes('USER ')) {
      suite.warnings.push({
        id: 'docker-user',
        file: 'Dockerfile',
        message: 'Consider adding USER instruction for security',
        rule: 'docker-user'
      });
    }
    
    if (!dockerfile.includes('HEALTHCHECK')) {
      suite.suggestions.push('Consider adding HEALTHCHECK instruction');
    }
    
    // Check for layer optimization
    const runCommands = lines.filter(line => line.trim().startsWith('RUN')).length;
    if (runCommands > 5) {
      suite.warnings.push({
        id: 'docker-layers',
        file: 'Dockerfile',
        message: 'Consider combining RUN commands to reduce layers',
        rule: 'docker-layers'
      });
    }
  }

  private async validateDockerCompose(suite: TestSuite) {
    try {
      const yaml = await import('js-yaml');
      const compose = yaml.load(this.dockerFiles.dockerCompose!);
      
      // Basic validation
      if (typeof compose !== 'object' || !compose) {
        suite.errors.push({
          id: 'compose-invalid',
          file: 'docker-compose.yml',
          message: 'Invalid docker-compose.yml structure',
          severity: 'error',
          fixable: false
        });
      }
    } catch (error) {
      suite.errors.push({
        id: 'compose-syntax',
        file: 'docker-compose.yml',
        message: 'Invalid YAML syntax in docker-compose.yml',
        severity: 'error',
        fixable: true,
        suggestedFix: 'Fix YAML syntax errors'
      });
    }
  }

  private async runBuildTests(): Promise<TestSuite> {
    const suite: TestSuite = {
      id: 'build',
      name: 'Build Validation',
      type: 'build',
      status: 'running',
      errors: [],
      warnings: [],
      suggestions: []
    };

    try {
      // Validate build configuration
      await this.validateBuildConfig(suite);
      
      // Check dependencies
      await this.validateDependencies(suite);

      suite.status = suite.errors.length > 0 ? 'failed' : 'passed';
    } catch (error) {
      suite.status = 'failed';
      suite.errors.push({
        id: 'build-error',
        file: 'build',
        message: error instanceof Error ? error.message : 'Unknown build error',
        severity: 'error',
        fixable: false
      });
    }

    return suite;
  }

  private async validateBuildConfig(suite: TestSuite) {
    // Check for build scripts
    if (!this.analysis.scripts.build && !this.analysis.scripts.start) {
      suite.warnings.push({
        id: 'no-build-script',
        file: 'package.json',
        message: 'No build or start script found',
        rule: 'build-script'
      });
    }
    
    // Check for production dependencies
    if (this.analysis.dependencies.length === 0) {
      suite.warnings.push({
        id: 'no-dependencies',
        file: 'package.json',
        message: 'No production dependencies found',
        rule: 'dependencies'
      });
    }
  }

  private async validateDependencies(suite: TestSuite) {
    // Check for potential dependency issues
    const deps = this.analysis.dependencies;
    
    // Check for conflicting versions
    const packageNames = new Set();
    deps.forEach(dep => {
      if (packageNames.has(dep.name)) {
        suite.warnings.push({
          id: `duplicate-dep-${dep.name}`,
          file: 'package.json',
          message: `Duplicate dependency: ${dep.name}`,
          rule: 'duplicate-dependency'
        });
      }
      packageNames.add(dep.name);
    });
  }

  private async runSecurityTests(): Promise<TestSuite> {
    const suite: TestSuite = {
      id: 'security',
      name: 'Security Validation',
      type: 'lint',
      status: 'running',
      errors: [],
      warnings: [],
      suggestions: []
    };

    try {
      // Check for security issues
      await this.validateSecurity(suite);

      suite.status = suite.errors.length > 0 ? 'failed' : 'passed';
    } catch (error) {
      suite.status = 'failed';
      suite.errors.push({
        id: 'security-error',
        file: 'security',
        message: error instanceof Error ? error.message : 'Unknown security error',
        severity: 'error',
        fixable: false
      });
    }

    return suite;
  }

  private async validateSecurity(suite: TestSuite) {
    // Check for hardcoded secrets
    for (const [filePath, content] of this.projectFiles) {
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        // Check for potential secrets
        if (line.match(/(password|secret|key|token)\s*[:=]\s*['"][^'"]+['"]/i)) {
          suite.errors.push({
            id: `hardcoded-secret-${filePath}-${index}`,
            file: filePath,
            line: index + 1,
            message: 'Potential hardcoded secret detected',
            severity: 'error',
            fixable: true,
            suggestedFix: 'Move secrets to environment variables'
          });
        }
        
        // Check for eval usage
        if (line.includes('eval(')) {
          suite.warnings.push({
            id: `eval-usage-${filePath}-${index}`,
            file: filePath,
            line: index + 1,
            message: 'Use of eval() detected - potential security risk',
            rule: 'no-eval'
          });
        }
      });
    }
  }

  async fixErrors(errors: TestError[]): Promise<CodeFix[]> {
    const fixes: CodeFix[] = [];
    
    for (const error of errors) {
      if (error.fixable) {
        const fix = await this.generateFix(error);
        if (fix) {
          fixes.push(fix);
        }
      }
    }
    
    return fixes;
  }

  private async generateFix(error: TestError): Promise<CodeFix | null> {
    const content = this.projectFiles.get(error.file);
    if (!content) return null;
    
    const lines = content.split('\n');
    
    switch (error.rule) {
      case 'no-console':
        if (error.line) {
          const line = lines[error.line - 1];
          const fixed = line.replace(/console\.log\([^)]*\);?/, '// console.log removed');
          lines[error.line - 1] = fixed;
          
          return {
            file: error.file,
            original: content,
            fixed: lines.join('\n'),
            description: 'Removed console.log statement'
          };
        }
        break;
        
      case 'no-var':
        if (error.line) {
          const line = lines[error.line - 1];
          const fixed = line.replace(/\bvar\b/, 'let');
          lines[error.line - 1] = fixed;
          
          return {
            file: error.file,
            original: content,
            fixed: lines.join('\n'),
            description: 'Replaced var with let'
          };
        }
        break;
        
      case 'eqeqeq':
        if (error.line) {
          const line = lines[error.line - 1];
          const fixed = line.replace(/==/g, '===').replace(/!=/g, '!==');
          lines[error.line - 1] = fixed;
          
          return {
            file: error.file,
            original: content,
            fixed: lines.join('\n'),
            description: 'Replaced == with === and != with !=='
          };
        }
        break;
    }
    
    return null;
  }

  private isSyntaxErrorFixable(message: string): boolean {
    const fixableErrors = [
      'missing semicolon',
      'unexpected token',
      'missing comma',
      'missing closing bracket'
    ];
    
    return fixableErrors.some(error => message.toLowerCase().includes(error));
  }

  private getSyntaxFix(message: string): string | undefined {
    if (message.includes('missing semicolon')) {
      return 'Add missing semicolon';
    }
    if (message.includes('missing comma')) {
      return 'Add missing comma';
    }
    if (message.includes('missing closing bracket')) {
      return 'Add missing closing bracket';
    }
    return undefined;
  }
}