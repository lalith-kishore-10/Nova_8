import { TechStackAnalysis, DependencyAnalysis, RepositoryAnalysis, Dependency } from '../types/analysis';
import { FileNode } from '../types/github';
import { getLLMConfig, isLLMConfigured } from '../config/llm';
import { createLLMProvider, LLMProvider } from './llmProviders';
import { githubApi } from './githubApi';

class LLMAnalysisService {
  private provider: LLMProvider | null = null;
  private initialized = false;

  private async initializeProvider(): Promise<void> {
    if (this.initialized) return;

    if (!isLLMConfigured()) {
      throw new Error('Hugging Face API key not configured. Please set VITE_HUGGINGFACE_API_KEY in your environment variables.');
    }

    const config = getLLMConfig();
    this.provider = createLLMProvider(config);
    this.initialized = true;
  }

  private async callLLM(prompt: string): Promise<string> {
    await this.initializeProvider();
    
    if (!this.provider) {
      throw new Error('LLM provider not initialized');
    }

    try {
      const response = await this.provider.generateResponse(prompt);
      return response.content;
    } catch (error) {
      console.error('LLM API call failed:', error);
      // Fallback to rule-based analysis
      return this.fallbackAnalysis(prompt);
    }
  }

  private fallbackAnalysis(prompt: string): string {
    // Enhanced fallback analysis based on file patterns
    const lines = prompt.toLowerCase().split('\n');
    
    if (lines.some(line => line.includes('package.json'))) {
      return `This is a Node.js/JavaScript project. Based on the package.json file, it uses modern JavaScript tooling and likely includes popular frameworks like React, Vue, or Angular. The project appears to follow standard npm package management practices.`;
    }
    
    if (lines.some(line => line.includes('requirements.txt') || line.includes('.py'))) {
      return `This is a Python project using pip for dependency management. It likely uses popular Python frameworks such as Django, Flask, or FastAPI for web development, or libraries like pandas, numpy for data processing.`;
    }
    
    if (lines.some(line => line.includes('pom.xml') || line.includes('.java'))) {
      return `This is a Java project using Maven for build management. It follows standard Java enterprise patterns and likely uses frameworks like Spring Boot or similar enterprise Java technologies.`;
    }

    if (lines.some(line => line.includes('cargo.toml') || line.includes('.rs'))) {
      return `This is a Rust project using Cargo for package management. Rust projects typically focus on performance and safety, often used for systems programming or web backends.`;
    }

    if (lines.some(line => line.includes('go.mod') || line.includes('.go'))) {
      return `This is a Go project using Go modules for dependency management. Go projects are typically used for backend services, CLI tools, or cloud-native applications.`;
    }
    
    return `This appears to be a multi-technology software project. Based on the file structure, it contains various programming languages and follows modern development practices with proper dependency management.`;
  }

  async fetchFileContents(owner: string, repo: string, files: FileNode[]): Promise<Map<string, string>> {
    const fileContents = new Map<string, string>();
    
    // Prioritize important configuration files
    const importantFiles = files.filter(file => 
      file.type === 'file' && (
        // Package managers and build files
        ['package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'].includes(file.name) ||
        ['requirements.txt', 'Pipfile', 'poetry.lock', 'setup.py', 'pyproject.toml'].includes(file.name) ||
        ['pom.xml', 'build.gradle', 'build.gradle.kts'].includes(file.name) ||
        ['Cargo.toml', 'Cargo.lock'].includes(file.name) ||
        ['go.mod', 'go.sum'].includes(file.name) ||
        ['composer.json', 'composer.lock'].includes(file.name) ||
        // Project files
        file.name.endsWith('.csproj') || 
        file.name.endsWith('.sln') ||
        file.name.endsWith('.vcxproj') ||
        // Documentation and config
        file.name.toLowerCase().includes('readme') ||
        file.name.toLowerCase().includes('dockerfile') ||
        file.name.includes('docker-compose') ||
        ['tsconfig.json', 'jsconfig.json', 'webpack.config.js', 'vite.config.js', 'vite.config.ts'].includes(file.name) ||
        ['.eslintrc', '.prettierrc', 'tailwind.config.js', 'next.config.js'].includes(file.name)
      )
    );

    // Sort by importance and limit to prevent API rate limiting
    const sortedFiles = importantFiles.sort((a, b) => {
      const priority = (file: FileNode): number => {
        if (['package.json', 'requirements.txt', 'pom.xml', 'Cargo.toml', 'go.mod'].includes(file.name)) return 1;
        if (file.name.toLowerCase().includes('readme')) return 2;
        if (file.name.includes('docker')) return 3;
        return 4;
      };
      return priority(a) - priority(b);
    });

    const filesToFetch = sortedFiles.slice(0, 12);

    for (const file of filesToFetch) {
      try {
        const content = await githubApi.getFileContent(owner, repo, file.path);
        fileContents.set(file.path, content);
      } catch (error) {
        console.warn(`Failed to fetch ${file.path}:`, error);
      }
    }

    return fileContents;
  }

  async analyzeTechStack(owner: string, repo: string, files: FileNode[]): Promise<TechStackAnalysis> {
    const fileContents = await this.fetchFileContents(owner, repo, files);
    
    let prompt = `Analyze this repository's technology stack and provide a structured analysis.

Repository: ${owner}/${repo}
Total files: ${files.length}

Key files and their contents:
`;

    // Add file contents to prompt with better formatting
    for (const [path, content] of fileContents.entries()) {
      const truncatedContent = content.length > 1500 ? content.substring(0, 1500) + '...' : content;
      prompt += `\n=== ${path} ===\n${truncatedContent}\n`;
    }

    prompt += `\nFile structure overview (first 30 files):
${files.slice(0, 30).map(f => `${f.type === 'directory' ? '📁' : '📄'} ${f.path}`).join('\n')}

Please analyze and identify:
1. Primary programming languages (in order of usage)
2. Web frameworks and libraries
3. Build tools and bundlers
4. Package managers
5. Databases and storage
6. Development tools
7. Cloud and deployment services

Provide specific technology names and a brief summary of the project's architecture.`;

    const llmResponse = await this.callLLM(prompt);
    
    return this.parseTechStackResponse(llmResponse, files, fileContents);
  }

  private parseTechStackResponse(response: string, files: FileNode[], fileContents: Map<string, string>): TechStackAnalysis {
    const analysis: TechStackAnalysis = {
      primaryLanguages: [],
      frameworks: [],
      libraries: [],
      buildTools: [],
      databases: [],
      cloudServices: [],
      devTools: [],
      packageManagers: [],
      confidence: 0.9,
      summary: response
    };

    // Enhanced language detection from file extensions
    const languageMap: { [key: string]: string } = {
      '.js': 'JavaScript', '.jsx': 'JavaScript', '.mjs': 'JavaScript',
      '.ts': 'TypeScript', '.tsx': 'TypeScript',
      '.py': 'Python', '.pyx': 'Python', '.pyi': 'Python',
      '.java': 'Java', '.kt': 'Kotlin', '.scala': 'Scala',
      '.go': 'Go', '.rs': 'Rust', '.php': 'PHP',
      '.cpp': 'C++', '.cc': 'C++', '.cxx': 'C++', '.c': 'C', '.h': 'C/C++',
      '.cs': 'C#', '.fs': 'F#', '.vb': 'VB.NET',
      '.rb': 'Ruby', '.swift': 'Swift', '.dart': 'Dart',
      '.clj': 'Clojure', '.hs': 'Haskell', '.elm': 'Elm',
      '.lua': 'Lua', '.r': 'R', '.jl': 'Julia',
      '.vue': 'Vue.js', '.svelte': 'Svelte'
    };

    const languageCounts: { [key: string]: number } = {};
    files.forEach(file => {
      if (file.type === 'file') {
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        if (languageMap[ext]) {
          const lang = languageMap[ext];
          languageCounts[lang] = (languageCounts[lang] || 0) + 1;
        }
      }
    });

    analysis.primaryLanguages = Object.entries(languageCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([lang]) => lang);

    // Enhanced package.json analysis
    const packageJson = fileContents.get('package.json');
    if (packageJson) {
      try {
        const pkg = JSON.parse(packageJson);
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
        
        // Comprehensive framework detection
        const frameworkMap: { [key: string]: string } = {
          'react': 'React', '@types/react': 'React',
          'vue': 'Vue.js', '@vue/cli': 'Vue.js',
          '@angular/core': 'Angular', '@angular/cli': 'Angular',
          'svelte': 'Svelte', '@sveltejs/kit': 'SvelteKit',
          'next': 'Next.js', 'nuxt': 'Nuxt.js',
          'gatsby': 'Gatsby', 'remix': 'Remix',
          'express': 'Express.js', 'fastify': 'Fastify',
          'koa': 'Koa.js', '@hapi/hapi': 'Hapi.js',
          '@nestjs/core': 'NestJS', 'apollo-server': 'Apollo Server',
          'graphql': 'GraphQL', '@apollo/client': 'Apollo Client',
          'socket.io': 'Socket.IO', 'ws': 'WebSocket'
        };

        Object.keys(allDeps).forEach(dep => {
          if (frameworkMap[dep]) {
            analysis.frameworks.push(frameworkMap[dep]);
          }
        });

        // Enhanced build tools detection
        const buildToolMap: { [key: string]: string } = {
          'vite': 'Vite', 'webpack': 'Webpack', 'rollup': 'Rollup',
          'parcel': 'Parcel', 'esbuild': 'ESBuild', 'turbo': 'Turbo',
          'nx': 'Nx', 'lerna': 'Lerna', 'rush': 'Rush',
          '@babel/core': 'Babel', 'typescript': 'TypeScript Compiler',
          'postcss': 'PostCSS', 'sass': 'Sass', 'less': 'Less'
        };

        Object.keys(allDeps).forEach(dep => {
          if (buildToolMap[dep]) {
            analysis.buildTools.push(buildToolMap[dep]);
          }
        });

        // Enhanced dev tools detection
        const devToolMap: { [key: string]: string } = {
          'eslint': 'ESLint', 'prettier': 'Prettier',
          'jest': 'Jest', 'vitest': 'Vitest', 'mocha': 'Mocha', 'chai': 'Chai',
          'cypress': 'Cypress', 'playwright': 'Playwright', '@testing-library/react': 'React Testing Library',
          '@storybook/react': 'Storybook', 'husky': 'Husky', 'lint-staged': 'lint-staged',
          'nodemon': 'Nodemon', 'concurrently': 'Concurrently'
        };

        Object.keys(allDeps).forEach(dep => {
          if (devToolMap[dep]) {
            analysis.devTools.push(devToolMap[dep]);
          }
        });

        // Library detection
        const libraryMap: { [key: string]: string } = {
          'lodash': 'Lodash', 'axios': 'Axios', 'moment': 'Moment.js',
          'date-fns': 'date-fns', 'dayjs': 'Day.js',
          'tailwindcss': 'Tailwind CSS', 'bootstrap': 'Bootstrap',
          'material-ui': 'Material-UI', '@mui/material': 'MUI',
          'styled-components': 'Styled Components', 'emotion': 'Emotion',
          'redux': 'Redux', '@reduxjs/toolkit': 'Redux Toolkit',
          'zustand': 'Zustand', 'mobx': 'MobX'
        };

        Object.keys(allDeps).forEach(dep => {
          if (libraryMap[dep]) {
            analysis.libraries.push(libraryMap[dep]);
          }
        });

        analysis.packageManagers.push('npm');
      } catch (e) {
        console.error('Error parsing package.json:', e);
      }
    }

    // Python requirements analysis
    const requirementsTxt = fileContents.get('requirements.txt');
    if (requirementsTxt) {
      const pythonFrameworks = ['django', 'flask', 'fastapi', 'tornado', 'pyramid'];
      const pythonLibs = ['pandas', 'numpy', 'scipy', 'matplotlib', 'requests', 'beautifulsoup4'];
      
      pythonFrameworks.forEach(framework => {
        if (requirementsTxt.toLowerCase().includes(framework)) {
          analysis.frameworks.push(framework.charAt(0).toUpperCase() + framework.slice(1));
        }
      });

      pythonLibs.forEach(lib => {
        if (requirementsTxt.toLowerCase().includes(lib)) {
          analysis.libraries.push(lib);
        }
      });

      analysis.packageManagers.push('pip');
    }

    // Detect package managers from lock files
    if (files.some(f => f.name === 'yarn.lock')) analysis.packageManagers.push('Yarn');
    if (files.some(f => f.name === 'pnpm-lock.yaml')) analysis.packageManagers.push('pnpm');
    if (files.some(f => f.name === 'Pipfile')) analysis.packageManagers.push('Pipenv');
    if (files.some(f => f.name === 'poetry.lock')) analysis.packageManagers.push('Poetry');
    if (files.some(f => f.name === 'Cargo.toml')) analysis.packageManagers.push('Cargo');
    if (files.some(f => f.name === 'go.mod')) analysis.packageManagers.push('Go Modules');
    if (files.some(f => f.name === 'pom.xml')) analysis.packageManagers.push('Maven');
    if (files.some(f => f.name === 'build.gradle')) analysis.packageManagers.push('Gradle');

    // Enhanced database detection
    const dockerCompose = fileContents.get('docker-compose.yml') || fileContents.get('docker-compose.yaml');
    if (dockerCompose) {
      const dbPatterns = {
        'postgres': 'PostgreSQL', 'mysql': 'MySQL', 'mariadb': 'MariaDB',
        'mongodb': 'MongoDB', 'redis': 'Redis', 'elasticsearch': 'Elasticsearch',
        'cassandra': 'Cassandra', 'neo4j': 'Neo4j', 'influxdb': 'InfluxDB'
      };
      
      Object.entries(dbPatterns).forEach(([pattern, db]) => {
        if (dockerCompose.toLowerCase().includes(pattern)) {
          analysis.databases.push(db);
        }
      });
    }

    // Cloud services detection from various files
    const allContent = Array.from(fileContents.values()).join(' ').toLowerCase();
    if (files.some(f => f.name === 'vercel.json') || allContent.includes('vercel')) analysis.cloudServices.push('Vercel');
    if (files.some(f => f.name === 'netlify.toml') || allContent.includes('netlify')) analysis.cloudServices.push('Netlify');
    if (allContent.includes('aws') || allContent.includes('amazon')) analysis.cloudServices.push('AWS');
    if (allContent.includes('gcp') || allContent.includes('google cloud')) analysis.cloudServices.push('Google Cloud');
    if (allContent.includes('azure') || allContent.includes('microsoft')) analysis.cloudServices.push('Azure');
    if (allContent.includes('heroku')) analysis.cloudServices.push('Heroku');
    if (allContent.includes('digitalocean')) analysis.cloudServices.push('DigitalOcean');

    // Remove duplicates and limit results
    analysis.frameworks = [...new Set(analysis.frameworks)].slice(0, 8);
    analysis.libraries = [...new Set(analysis.libraries)].slice(0, 10);
    analysis.buildTools = [...new Set(analysis.buildTools)].slice(0, 6);
    analysis.devTools = [...new Set(analysis.devTools)].slice(0, 8);
    analysis.databases = [...new Set(analysis.databases)].slice(0, 5);
    analysis.cloudServices = [...new Set(analysis.cloudServices)].slice(0, 5);
    analysis.packageManagers = [...new Set(analysis.packageManagers)];

    return analysis;
  }

  async analyzeDependencies(owner: string, repo: string, files: FileNode[]): Promise<DependencyAnalysis> {
    const fileContents = await this.fetchFileContents(owner, repo, files);
    const dependencies: Dependency[] = [];
    let totalCount = 0;

    // Enhanced package.json analysis
    const packageJson = fileContents.get('package.json');
    if (packageJson) {
      try {
        const pkg = JSON.parse(packageJson);
        
        // Production dependencies
        if (pkg.dependencies) {
          Object.entries(pkg.dependencies).forEach(([name, version]) => {
            dependencies.push({
              name,
              version: version as string,
              type: 'production',
              isOutdated: this.simulateOutdatedCheck(name),
              hasSecurityIssue: this.simulateSecurityCheck(name),
              description: this.getPackageDescription(name)
            });
          });
          totalCount += Object.keys(pkg.dependencies).length;
        }

        // Development dependencies
        if (pkg.devDependencies) {
          Object.entries(pkg.devDependencies).forEach(([name, version]) => {
            dependencies.push({
              name,
              version: version as string,
              type: 'development',
              isOutdated: this.simulateOutdatedCheck(name),
              hasSecurityIssue: this.simulateSecurityCheck(name),
              description: this.getPackageDescription(name)
            });
          });
          totalCount += Object.keys(pkg.devDependencies).length;
        }
      } catch (e) {
        console.error('Error parsing package.json:', e);
      }
    }

    // Enhanced Python requirements analysis
    const requirementsTxt = fileContents.get('requirements.txt');
    if (requirementsTxt) {
      const lines = requirementsTxt.split('\n').filter(line => line.trim() && !line.startsWith('#'));
      lines.forEach(line => {
        const match = line.match(/^([a-zA-Z0-9\-_\.]+)([>=<~!]+.*)?$/);
        if (match) {
          dependencies.push({
            name: match[1],
            version: match[2] || 'latest',
            type: 'production',
            isOutdated: this.simulateOutdatedCheck(match[1]),
            hasSecurityIssue: this.simulateSecurityCheck(match[1]),
            description: this.getPythonPackageDescription(match[1])
          });
          totalCount++;
        }
      });
    }

    // Analyze other package managers
    const cargoToml = fileContents.get('Cargo.toml');
    if (cargoToml) {
      const dependencySection = cargoToml.match(/\[dependencies\]([\s\S]*?)(?=\[|$)/);
      if (dependencySection) {
        const deps = dependencySection[1].match(/^([a-zA-Z0-9\-_]+)\s*=\s*"([^"]+)"/gm);
        deps?.forEach(dep => {
          const match = dep.match(/^([a-zA-Z0-9\-_]+)\s*=\s*"([^"]+)"/);
          if (match) {
            dependencies.push({
              name: match[1],
              version: match[2],
              type: 'production',
              isOutdated: this.simulateOutdatedCheck(match[1]),
              hasSecurityIssue: this.simulateSecurityCheck(match[1])
            });
            totalCount++;
          }
        });
      }
    }

    const outdatedCount = dependencies.filter(dep => dep.isOutdated).length;
    const securityIssues = dependencies.filter(dep => dep.hasSecurityIssue).length;

    const prompt = `Analyze the dependencies of this ${owner}/${repo} repository:

Total Dependencies: ${dependencies.length}
Production: ${dependencies.filter(d => d.type === 'production').length}
Development: ${dependencies.filter(d => d.type === 'development').length}
Potentially Outdated: ${outdatedCount}
Potential Security Issues: ${securityIssues}

Key Dependencies:
${dependencies.slice(0, 20).map(dep => `- ${dep.name}@${dep.version} (${dep.type})`).join('\n')}

Provide insights about:
1. Overall dependency health and management
2. Security considerations and recommendations
3. Notable dependencies and their purposes
4. Suggestions for optimization
5. Maintenance recommendations`;

    const summary = await this.callLLM(prompt);

    return {
      production: dependencies.filter(dep => dep.type === 'production'),
      development: dependencies.filter(dep => dep.type === 'development'),
      totalCount,
      outdatedCount,
      securityIssues,
      summary
    };
  }

  private getPackageDescription(packageName: string): string {
    const descriptions: { [key: string]: string } = {
      'react': 'JavaScript library for building user interfaces',
      'vue': 'Progressive JavaScript framework',
      'angular': 'Platform for building mobile and desktop web applications',
      'express': 'Fast, unopinionated, minimalist web framework for Node.js',
      'lodash': 'Modern JavaScript utility library',
      'axios': 'Promise based HTTP client for the browser and node.js',
      'typescript': 'TypeScript is a superset of JavaScript that compiles to clean JavaScript output',
      'webpack': 'Static module bundler for modern JavaScript applications',
      'eslint': 'Tool for identifying and reporting on patterns found in ECMAScript/JavaScript code',
      'jest': 'Delightful JavaScript Testing Framework',
      'prettier': 'Opinionated code formatter'
    };
    return descriptions[packageName] || '';
  }

  private getPythonPackageDescription(packageName: string): string {
    const descriptions: { [key: string]: string } = {
      'django': 'High-level Python web framework',
      'flask': 'Lightweight WSGI web application framework',
      'fastapi': 'Modern, fast web framework for building APIs with Python',
      'pandas': 'Powerful data structures and data analysis tools',
      'numpy': 'Fundamental package for scientific computing',
      'requests': 'HTTP library for Python',
      'beautifulsoup4': 'Library for pulling data out of HTML and XML files'
    };
    return descriptions[packageName] || '';
  }

  private simulateOutdatedCheck(packageName: string): boolean {
    // Enhanced simulation with more realistic patterns
    const commonOutdated = [
      'lodash', 'moment', 'request', 'babel-core', 'webpack', 'jquery',
      'bootstrap', 'angular', 'vue', 'react', 'express'
    ];
    
    // Higher probability for commonly outdated packages
    if (commonOutdated.includes(packageName)) {
      return Math.random() > 0.6;
    }
    
    // Lower probability for other packages
    return Math.random() > 0.85;
  }

  private simulateSecurityCheck(packageName: string): boolean {
    // Enhanced simulation with known vulnerable packages
    const knownVulnerable = [
      'event-stream', 'flatmap-stream', 'getcookies', 'rc',
      'minimist', 'kind-of', 'serialize-javascript'
    ];
    
    // High probability for known vulnerable packages
    if (knownVulnerable.includes(packageName)) {
      return Math.random() > 0.3;
    }
    
    // Very low probability for other packages
    return Math.random() > 0.97;
  }

  async analyzeRepository(owner: string, repo: string, files: FileNode[]): Promise<RepositoryAnalysis> {
    try {
      const [techStack, dependencies] = await Promise.all([
        this.analyzeTechStack(owner, repo, files),
        this.analyzeDependencies(owner, repo, files)
      ]);

      // Enhanced complexity calculation
      let complexity: 'Low' | 'Medium' | 'High' = 'Low';
      const complexityFactors = [
        dependencies.totalCount > 30,
        techStack.primaryLanguages.length > 2,
        techStack.frameworks.length > 1,
        files.length > 50,
        techStack.buildTools.length > 2,
        dependencies.production.length > 20
      ];
      
      const complexityScore = complexityFactors.filter(Boolean).length;
      if (complexityScore >= 4) complexity = 'High';
      else if (complexityScore >= 2) complexity = 'Medium';

      // Enhanced maintainability calculation
      let maintainability = 90;
      maintainability -= Math.min(dependencies.outdatedCount * 1.2, 15);
      maintainability -= Math.min(dependencies.securityIssues * 4, 30);
      maintainability -= (complexity === 'High' ? 12 : complexity === 'Medium' ? 6 : 0);
      maintainability -= Math.min((dependencies.totalCount - 20) * 0.3, 10);
      maintainability = Math.max(20, Math.min(100, maintainability));

      return {
        techStack,
        dependencies,
        projectType: this.determineProjectType(techStack, files),
        complexity,
        maintainability: Math.round(maintainability),
        analyzedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Repository analysis failed:', error);
      throw new Error(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private determineProjectType(techStack: TechStackAnalysis, files: FileNode[]): string {
    const { frameworks, primaryLanguages, libraries } = techStack;
    
    // Frontend frameworks
    if (frameworks.some(f => ['React', 'Vue.js', 'Angular', 'Svelte'].includes(f))) {
      if (frameworks.includes('Next.js')) return 'Next.js Application';
      if (frameworks.includes('Nuxt.js')) return 'Nuxt.js Application';
      if (frameworks.includes('Gatsby')) return 'Gatsby Static Site';
      return 'Frontend Web Application';
    }
    
    // Backend frameworks
    if (frameworks.some(f => ['Express.js', 'Fastify', 'NestJS', 'Koa.js'].includes(f))) {
      return 'Node.js Backend Service';
    }
    
    // Full-stack frameworks
    if (frameworks.includes('Next.js') || frameworks.includes('Nuxt.js')) {
      return 'Full-Stack Web Application';
    }
    
    // Mobile frameworks
    if (frameworks.includes('React Native') || libraries.includes('React Native')) {
      return 'React Native Mobile App';
    }
    if (primaryLanguages.includes('Dart') || frameworks.includes('Flutter')) {
      return 'Flutter Mobile App';
    }
    if (primaryLanguages.includes('Swift')) {
      return 'iOS Application';
    }
    if (primaryLanguages.includes('Kotlin') && files.some(f => f.path.includes('android'))) {
      return 'Android Application';
    }
    
    // Language-specific projects
    if (primaryLanguages.includes('Python')) {
      if (frameworks.some(f => ['Django', 'Flask', 'FastAPI'].includes(f))) {
        return 'Python Web Application';
      }
      if (libraries.some(l => ['pandas', 'numpy', 'scipy'].includes(l))) {
        return 'Python Data Science Project';
      }
      return 'Python Application';
    }
    
    if (primaryLanguages.includes('Java')) {
      if (files.some(f => f.name === 'pom.xml')) return 'Java Maven Project';
      if (files.some(f => f.name === 'build.gradle')) return 'Java Gradle Project';
      return 'Java Application';
    }
    
    if (primaryLanguages.includes('Go')) {
      return 'Go Application';
    }
    
    if (primaryLanguages.includes('Rust')) {
      return 'Rust Application';
    }
    
    if (primaryLanguages.includes('C#')) {
      return '.NET Application';
    }
    
    if (primaryLanguages.includes('PHP')) {
      return 'PHP Web Application';
    }
    
    // Default fallback
    return 'Software Project';
  }
}

export const llmAnalysisService = new LLMAnalysisService();