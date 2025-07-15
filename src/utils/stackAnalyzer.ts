import type { GitHubTreeItem } from '../types/github';
import type { StackAnalysis, Dependency } from '../types/analysis';

export class StackAnalyzer {
  private files: GitHubTreeItem[];
  private fileContents: Map<string, string> = new Map();

  constructor(files: GitHubTreeItem[]) {
    this.files = files;
  }

  addFileContent(path: string, content: string) {
    this.fileContents.set(path, content);
  }

  async analyzeStack(): Promise<StackAnalysis> {
    // First try LLM-enhanced analysis
    try {
      const llmAnalysis = await this.analyzeLLMEnhanced();
      if (llmAnalysis) {
        return llmAnalysis;
      }
    } catch (error) {
      console.warn('LLM analysis failed, falling back to traditional analysis:', error);
    }

    // Fallback to traditional analysis
    return this.analyzeTraditional();
  }

  private async analyzeLLMEnhanced(): Promise<StackAnalysis | null> {
    try {
      // Check if Ollama is available
      const statusResponse = await fetch('http://localhost:5001/ollama-status');
      if (!statusResponse.ok) {
        throw new Error('Ollama not available');
      }

      // Prepare data for LLM analysis
      const analysisData = {
        files: this.files.map(f => ({ path: f.path, type: f.type })),
        packageJson: this.fileContents.get('package.json'),
        requirements: this.fileContents.get('requirements.txt'),
        pomXml: this.fileContents.get('pom.xml'),
        cargoToml: this.fileContents.get('Cargo.toml'),
        goMod: this.fileContents.get('go.mod')
      };

      const response = await fetch('http://localhost:5001/analyze-stack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analysisData)
      });

      if (!response.ok) {
        throw new Error(`LLM analysis failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Convert LLM response to our StackAnalysis format
      const llmResult = data.analysis;
      
      return {
        primaryLanguage: llmResult.primaryLanguage || this.detectPrimaryLanguage(),
        framework: llmResult.framework,
        packageManager: llmResult.packageManager,
        runtime: llmResult.runtime,
        database: llmResult.database || [],
        dependencies: llmResult.dependencies || [],
        devDependencies: this.extractDevDependencies(llmResult.dependencies || []),
        scripts: this.extractScripts(),
        buildTool: llmResult.buildTool,
        testFramework: llmResult.testFramework,
        linting: llmResult.linting || [],
        styling: llmResult.styling || [],
        architecture: llmResult.architecture,
        deployment: llmResult.deployment,
        recommendations: llmResult.recommendations || [],
        dockerStrategy: llmResult.dockerStrategy
      };
    } catch (error) {
      console.error('LLM-enhanced analysis failed:', error);
      return null;
    }
  }

  private async analyzeTraditional(): Promise<StackAnalysis> {
    const analysis: StackAnalysis = {
      primaryLanguage: this.detectPrimaryLanguage(),
      dependencies: [],
      devDependencies: [],
      scripts: {}
    };

    // Analyze package.json for Node.js projects
    const packageJson = this.fileContents.get('package.json');
    if (packageJson) {
      this.analyzePackageJson(packageJson, analysis);
    }

    // Analyze requirements.txt for Python projects
    const requirementsTxt = this.fileContents.get('requirements.txt');
    if (requirementsTxt) {
      this.analyzeRequirementsTxt(requirementsTxt, analysis);
    }

    // Analyze pom.xml for Java projects
    const pomXml = this.fileContents.get('pom.xml');
    if (pomXml) {
      this.analyzePomXml(pomXml, analysis);
    }

    // Analyze Cargo.toml for Rust projects
    const cargoToml = this.fileContents.get('Cargo.toml');
    if (cargoToml) {
      this.analyzeCargoToml(cargoToml, analysis);
    }

    // Analyze go.mod for Go projects
    const goMod = this.fileContents.get('go.mod');
    if (goMod) {
      this.analyzeGoMod(goMod, analysis);
    }

    // Detect framework and additional tools
    this.detectFramework(analysis);
    this.detectBuildTools(analysis);
    this.detectDatabase(analysis);

    return analysis;
  }

  private extractDevDependencies(allDependencies: Dependency[]): Dependency[] {
    return allDependencies.filter(dep => dep.type === 'dev');
  }

  private extractScripts(): Record<string, string> {
    const packageJson = this.fileContents.get('package.json');
    if (packageJson) {
      try {
        const pkg = JSON.parse(packageJson);
        return pkg.scripts || {};
      } catch (error) {
        console.error('Error parsing package.json for scripts:', error);
      }
    }
    return {};
  }

  private detectPrimaryLanguage(): string {
    const languageCount: Record<string, number> = {};
    
    this.files.forEach(file => {
      const ext = file.path.split('.').pop()?.toLowerCase();
      if (ext) {
        const lang = this.getLanguageFromExtension(ext);
        languageCount[lang] = (languageCount[lang] || 0) + 1;
      }
    });

    // Remove generic types
    delete languageCount.text;
    delete languageCount.markdown;
    delete languageCount.json;
    delete languageCount.yaml;

    return Object.entries(languageCount)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'unknown';
  }

  private getLanguageFromExtension(ext: string): string {
    const map: Record<string, string> = {
      js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
      py: 'python', java: 'java', go: 'go', rs: 'rust', rb: 'ruby',
      php: 'php', cpp: 'cpp', c: 'c', cs: 'csharp', kt: 'kotlin',
      swift: 'swift', scala: 'scala', dart: 'dart', r: 'r'
    };
    return map[ext] || ext;
  }

  private analyzePackageJson(content: string, analysis: StackAnalysis) {
    try {
      const pkg = JSON.parse(content);
      analysis.packageManager = 'npm';
      analysis.scripts = pkg.scripts || {};

      if (pkg.dependencies) {
        Object.entries(pkg.dependencies).forEach(([name, version]) => {
          analysis.dependencies.push({
            name,
            version: version as string,
            type: 'runtime',
            category: this.categorizeDependency(name)
          });
        });
      }

      if (pkg.devDependencies) {
        Object.entries(pkg.devDependencies).forEach(([name, version]) => {
          analysis.devDependencies.push({
            name,
            version: version as string,
            type: 'dev',
            category: this.categorizeDependency(name)
          });
        });
      }
    } catch (error) {
      console.error('Error parsing package.json:', error);
    }
  }

  private analyzeRequirementsTxt(content: string, analysis: StackAnalysis) {
    analysis.packageManager = 'pip';
    const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    
    lines.forEach(line => {
      const match = line.match(/^([^>=<~!]+)([>=<~!].*)?$/);
      if (match) {
        const [, name, version] = match;
        analysis.dependencies.push({
          name: name.trim(),
          version: version?.trim(),
          type: 'runtime',
          category: this.categorizePythonDependency(name.trim())
        });
      }
    });
  }

  private analyzePomXml(content: string, analysis: StackAnalysis) {
    analysis.packageManager = 'maven';
    analysis.buildTool = 'maven';
    
    // Simple regex parsing for dependencies (in a real implementation, use XML parser)
    const dependencyRegex = /<dependency>[\s\S]*?<groupId>(.*?)<\/groupId>[\s\S]*?<artifactId>(.*?)<\/artifactId>[\s\S]*?(?:<version>(.*?)<\/version>)?[\s\S]*?<\/dependency>/g;
    let match;
    
    while ((match = dependencyRegex.exec(content)) !== null) {
      const [, groupId, artifactId, version] = match;
      analysis.dependencies.push({
        name: `${groupId}:${artifactId}`,
        version,
        type: 'runtime',
        category: this.categorizeJavaDependency(artifactId)
      });
    }
  }

  private analyzeCargoToml(content: string, analysis: StackAnalysis) {
    analysis.packageManager = 'cargo';
    analysis.buildTool = 'cargo';
    
    // Simple TOML parsing for dependencies
    const lines = content.split('\n');
    let inDependencies = false;
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed === '[dependencies]') {
        inDependencies = true;
        return;
      }
      if (trimmed.startsWith('[') && trimmed !== '[dependencies]') {
        inDependencies = false;
        return;
      }
      
      if (inDependencies && trimmed.includes('=')) {
        const [name, version] = trimmed.split('=').map(s => s.trim());
        analysis.dependencies.push({
          name: name.replace(/"/g, ''),
          version: version.replace(/"/g, ''),
          type: 'runtime',
          category: 'library'
        });
      }
    });
  }

  private analyzeGoMod(content: string, analysis: StackAnalysis) {
    analysis.packageManager = 'go mod';
    analysis.buildTool = 'go';
    
    const lines = content.split('\n');
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('require ')) {
        const match = trimmed.match(/require\s+([^\s]+)\s+([^\s]+)/);
        if (match) {
          const [, name, version] = match;
          analysis.dependencies.push({
            name,
            version,
            type: 'runtime',
            category: 'library'
          });
        }
      }
    });
  }

  private detectFramework(analysis: StackAnalysis) {
    const deps = [...analysis.dependencies, ...analysis.devDependencies];
    
    // React
    if (deps.some(d => d.name === 'react')) {
      analysis.framework = 'React';
      if (deps.some(d => d.name === 'next')) analysis.framework = 'Next.js';
      if (deps.some(d => d.name === 'gatsby')) analysis.framework = 'Gatsby';
    }
    
    // Vue
    if (deps.some(d => d.name === 'vue')) {
      analysis.framework = 'Vue.js';
      if (deps.some(d => d.name === 'nuxt')) analysis.framework = 'Nuxt.js';
    }
    
    // Angular
    if (deps.some(d => d.name.startsWith('@angular/'))) {
      analysis.framework = 'Angular';
    }
    
    // Node.js frameworks
    if (deps.some(d => d.name === 'express')) analysis.framework = 'Express.js';
    if (deps.some(d => d.name === 'fastify')) analysis.framework = 'Fastify';
    if (deps.some(d => d.name === 'koa')) analysis.framework = 'Koa.js';
    
    // Python frameworks
    if (deps.some(d => d.name === 'django')) analysis.framework = 'Django';
    if (deps.some(d => d.name === 'flask')) analysis.framework = 'Flask';
    if (deps.some(d => d.name === 'fastapi')) analysis.framework = 'FastAPI';
    
    // Java frameworks
    if (deps.some(d => d.name.includes('spring'))) analysis.framework = 'Spring Boot';
  }

  private detectBuildTools(analysis: StackAnalysis) {
    const hasFile = (name: string) => this.files.some(f => f.path === name);
    
    if (hasFile('webpack.config.js')) analysis.buildTool = 'Webpack';
    if (hasFile('vite.config.js') || hasFile('vite.config.ts')) analysis.buildTool = 'Vite';
    if (hasFile('rollup.config.js')) analysis.buildTool = 'Rollup';
    if (hasFile('gulpfile.js')) analysis.buildTool = 'Gulp';
    if (hasFile('Gruntfile.js')) analysis.buildTool = 'Grunt';
    
    // Test frameworks
    const deps = [...analysis.dependencies, ...analysis.devDependencies];
    if (deps.some(d => d.name === 'jest')) analysis.testFramework = 'Jest';
    if (deps.some(d => d.name === 'mocha')) analysis.testFramework = 'Mocha';
    if (deps.some(d => d.name === 'vitest')) analysis.testFramework = 'Vitest';
    if (deps.some(d => d.name === 'cypress')) analysis.testFramework = 'Cypress';
    
    // Linting
    analysis.linting = [];
    if (deps.some(d => d.name === 'eslint')) analysis.linting.push('ESLint');
    if (deps.some(d => d.name === 'prettier')) analysis.linting.push('Prettier');
    if (deps.some(d => d.name === 'tslint')) analysis.linting.push('TSLint');
    
    // Styling
    analysis.styling = [];
    if (deps.some(d => d.name === 'tailwindcss')) analysis.styling.push('Tailwind CSS');
    if (deps.some(d => d.name === 'sass')) analysis.styling.push('Sass');
    if (deps.some(d => d.name === 'less')) analysis.styling.push('Less');
    if (deps.some(d => d.name === 'styled-components')) analysis.styling.push('Styled Components');
  }

  private detectDatabase(analysis: StackAnalysis) {
    const deps = [...analysis.dependencies, ...analysis.devDependencies];
    analysis.database = [];
    
    if (deps.some(d => d.name.includes('mongodb') || d.name === 'mongoose')) {
      analysis.database.push('MongoDB');
    }
    if (deps.some(d => d.name.includes('postgres') || d.name === 'pg')) {
      analysis.database.push('PostgreSQL');
    }
    if (deps.some(d => d.name.includes('mysql'))) {
      analysis.database.push('MySQL');
    }
    if (deps.some(d => d.name.includes('redis'))) {
      analysis.database.push('Redis');
    }
    if (deps.some(d => d.name.includes('sqlite'))) {
      analysis.database.push('SQLite');
    }
  }

  private categorizeDependency(name: string): string {
    const categories: Record<string, string> = {
      'react': 'framework', 'vue': 'framework', 'angular': 'framework',
      'express': 'framework', 'fastify': 'framework', 'koa': 'framework',
      'webpack': 'build', 'vite': 'build', 'rollup': 'build',
      'jest': 'testing', 'mocha': 'testing', 'cypress': 'testing',
      'eslint': 'linting', 'prettier': 'linting',
      'tailwindcss': 'styling', 'sass': 'styling', 'styled-components': 'styling',
      'axios': 'http', 'fetch': 'http', 'request': 'http',
      'lodash': 'utility', 'moment': 'utility', 'date-fns': 'utility'
    };
    
    return categories[name] || 'library';
  }

  private categorizePythonDependency(name: string): string {
    const categories: Record<string, string> = {
      'django': 'framework', 'flask': 'framework', 'fastapi': 'framework',
      'requests': 'http', 'urllib3': 'http',
      'numpy': 'data', 'pandas': 'data', 'matplotlib': 'data',
      'pytest': 'testing', 'unittest': 'testing',
      'black': 'linting', 'flake8': 'linting', 'pylint': 'linting'
    };
    
    return categories[name] || 'library';
  }

  private categorizeJavaDependency(name: string): string {
    const categories: Record<string, string> = {
      'spring-boot-starter': 'framework', 'spring-web': 'framework',
      'junit': 'testing', 'mockito': 'testing',
      'jackson': 'serialization', 'gson': 'serialization',
      'hibernate': 'orm', 'jpa': 'orm'
    };
    
    return categories[name] || 'library';
  }
}