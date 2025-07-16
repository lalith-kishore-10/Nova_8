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
    const analysis: StackAnalysis = {
      primaryLanguage: this.detectPrimaryLanguage(),
      framework: undefined,
      packageManager: undefined,
      runtime: undefined,
      database: [],
      dependencies: [],
      devDependencies: [],
      scripts: {},
      buildTool: undefined,
      testFramework: undefined,
      linting: [],
      styling: []
    };

    console.log('Starting stack analysis with files:', this.files.length);
    console.log('File contents loaded:', this.fileContents.size);
    console.log('Detected primary language:', analysis.primaryLanguage);

    // Analyze package.json for Node.js projects
    const packageJson = this.fileContents.get('package.json');
    if (packageJson) {
      console.log('Found package.json, analyzing...');
      this.analyzePackageJson(packageJson, analysis);
    } else {
      console.log('No package.json found');
    }

    // Analyze requirements.txt for Python projects
    const requirementsTxt = this.fileContents.get('requirements.txt');
    if (requirementsTxt) {
      console.log('Found requirements.txt, analyzing...');
      this.analyzeRequirementsTxt(requirementsTxt, analysis);
    } else {
      console.log('No requirements.txt found');
    }

    // Analyze pom.xml for Java projects
    const pomXml = this.fileContents.get('pom.xml');
    if (pomXml) {
      console.log('Found pom.xml, analyzing...');
      this.analyzePomXml(pomXml, analysis);
    } else {
      console.log('No pom.xml found');
    }

    // Analyze Cargo.toml for Rust projects
    const cargoToml = this.fileContents.get('Cargo.toml');
    if (cargoToml) {
      console.log('Found Cargo.toml, analyzing...');
      this.analyzeCargoToml(cargoToml, analysis);
    } else {
      console.log('No Cargo.toml found');
    }

    // Analyze go.mod for Go projects
    const goMod = this.fileContents.get('go.mod');
    if (goMod) {
      console.log('Found go.mod, analyzing...');
      this.analyzeGoMod(goMod, analysis);
    } else {
      console.log('No go.mod found');
    }

    // Detect framework and additional tools
    this.detectFramework(analysis);
    this.detectBuildTools(analysis);
    this.detectDatabase(analysis);
    this.detectPackageManager(analysis);

    console.log('Final analysis results:', {
      primaryLanguage: analysis.primaryLanguage,
      framework: analysis.framework,
      runtime: analysis.runtime,
      packageManager: analysis.packageManager,
      dependenciesCount: analysis.dependencies.length,
      devDependenciesCount: analysis.devDependencies.length,
      scriptsCount: Object.keys(analysis.scripts).length
    });
    
    return analysis;
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
      console.log('Parsing package.json:', { 
        name: pkg.name, 
        dependencies: Object.keys(pkg.dependencies || {}),
        devDependencies: Object.keys(pkg.devDependencies || {})
      });
      
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
        console.log(`Added ${Object.keys(pkg.dependencies).length} runtime dependencies`);
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
        console.log(`Added ${Object.keys(pkg.devDependencies).length} dev dependencies`);
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
    const hasFile = (name: string) => this.files.some(f => f.path === name || f.path.endsWith(`/${name}`));
    
    console.log('Detecting framework from dependencies:', deps.map(d => d.name));
    console.log('Checking for framework files...');
    
    // React
    if (deps.some(d => d.name === 'react')) {
      analysis.framework = 'React';
      console.log('Detected React framework');
      if (deps.some(d => d.name === 'next')) analysis.framework = 'Next.js';
      if (deps.some(d => d.name === 'gatsby')) analysis.framework = 'Gatsby';
      if (hasFile('next.config.js') || hasFile('next.config.ts')) analysis.framework = 'Next.js';
    }
    
    // Vue
    if (deps.some(d => d.name === 'vue')) {
      analysis.framework = 'Vue.js';
      console.log('Detected Vue.js framework');
      if (deps.some(d => d.name === 'nuxt')) analysis.framework = 'Nuxt.js';
      if (hasFile('nuxt.config.js') || hasFile('nuxt.config.ts')) analysis.framework = 'Nuxt.js';
    }
    
    // Angular
    if (deps.some(d => d.name.startsWith('@angular/'))) {
      analysis.framework = 'Angular';
      console.log('Detected Angular framework');
    }
    
    // Check for framework files if no dependencies detected
    if (!analysis.framework) {
      console.log('No framework detected from dependencies, checking config files...');
      if (hasFile('angular.json')) analysis.framework = 'Angular';
      if (hasFile('vue.config.js')) analysis.framework = 'Vue.js';
      if (hasFile('svelte.config.js')) analysis.framework = 'Svelte';
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
    
    console.log('Final detected framework:', analysis.framework);
    
    // Set runtime based on language and framework
    if (analysis.primaryLanguage === 'javascript' || analysis.primaryLanguage === 'typescript') {
      analysis.runtime = 'Node.js';
    } else if (analysis.primaryLanguage === 'python') {
      analysis.runtime = 'Python';
    } else if (analysis.primaryLanguage === 'java') {
      analysis.runtime = 'JVM';
    } else if (analysis.primaryLanguage === 'go') {
      analysis.runtime = 'Go';
    } else if (analysis.primaryLanguage === 'rust') {
      analysis.runtime = 'Rust';
    } else if (analysis.primaryLanguage === 'php') {
      analysis.runtime = 'PHP';
    } else if (analysis.primaryLanguage === 'ruby') {
      analysis.runtime = 'Ruby';
    }
    
    console.log('Set runtime:', analysis.runtime);
  }

  private detectPackageManager(analysis: StackAnalysis) {
    const hasFile = (name: string) => this.files.some(f => f.path === name);
    
    if (hasFile('package-lock.json')) {
      analysis.packageManager = 'npm';
    } else if (hasFile('yarn.lock')) {
      analysis.packageManager = 'yarn';
    } else if (hasFile('pnpm-lock.yaml')) {
      analysis.packageManager = 'pnpm';
    } else if (hasFile('requirements.txt')) {
      analysis.packageManager = 'pip';
    } else if (hasFile('Pipfile')) {
      analysis.packageManager = 'pipenv';
    } else if (hasFile('poetry.lock')) {
      analysis.packageManager = 'poetry';
    } else if (hasFile('Cargo.toml')) {
      analysis.packageManager = 'cargo';
    } else if (hasFile('go.mod')) {
      analysis.packageManager = 'go mod';
    } else if (hasFile('composer.json')) {
      analysis.packageManager = 'composer';
    } else if (hasFile('Gemfile')) {
      analysis.packageManager = 'bundler';
    }
  }

  private detectBuildTools(analysis: StackAnalysis) {
    const hasFile = (name: string) => this.files.some(f => f.path === name);
    
    if (hasFile('webpack.config.js')) analysis.buildTool = 'Webpack';
    if (hasFile('vite.config.js') || hasFile('vite.config.ts')) analysis.buildTool = 'Vite';
    if (hasFile('rollup.config.js')) analysis.buildTool = 'Rollup';
    if (hasFile('gulpfile.js')) analysis.buildTool = 'Gulp';
    if (hasFile('Gruntfile.js')) analysis.buildTool = 'Grunt';
    if (hasFile('esbuild.config.js')) analysis.buildTool = 'esbuild';
    if (hasFile('snowpack.config.js')) analysis.buildTool = 'Snowpack';
    
    // Test frameworks
    const deps = [...analysis.dependencies, ...analysis.devDependencies];
    if (deps.some(d => d.name === 'jest')) analysis.testFramework = 'Jest';
    if (deps.some(d => d.name === 'mocha')) analysis.testFramework = 'Mocha';
    if (deps.some(d => d.name === 'vitest')) analysis.testFramework = 'Vitest';
    if (deps.some(d => d.name === 'cypress')) analysis.testFramework = 'Cypress';
    if (deps.some(d => d.name === 'playwright')) analysis.testFramework = 'Playwright';
    if (deps.some(d => d.name === 'puppeteer')) analysis.testFramework = 'Puppeteer';
    
    // Linting
    if (deps.some(d => d.name === 'eslint')) analysis.linting.push('ESLint');
    if (deps.some(d => d.name === 'prettier')) analysis.linting.push('Prettier');
    if (deps.some(d => d.name === 'tslint')) analysis.linting.push('TSLint');
    if (hasFile('.eslintrc.js') || hasFile('.eslintrc.json')) analysis.linting.push('ESLint');
    if (hasFile('.prettierrc') || hasFile('prettier.config.js')) analysis.linting.push('Prettier');
    
    // Styling
    if (deps.some(d => d.name === 'tailwindcss')) analysis.styling.push('Tailwind CSS');
    if (deps.some(d => d.name === 'sass')) analysis.styling.push('Sass');
    if (deps.some(d => d.name === 'less')) analysis.styling.push('Less');
    if (deps.some(d => d.name === 'styled-components')) analysis.styling.push('Styled Components');
    if (hasFile('tailwind.config.js') || hasFile('tailwind.config.ts')) analysis.styling.push('Tailwind CSS');
  }

  private detectDatabase(analysis: StackAnalysis) {
    const deps = [...analysis.dependencies, ...analysis.devDependencies];
    
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
    if (deps.some(d => d.name.includes('firebase'))) {
      analysis.database.push('Firebase');
    }
    if (deps.some(d => d.name.includes('supabase'))) {
      analysis.database.push('Supabase');
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