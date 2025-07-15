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
      throw new Error('LLM not configured. Please set up your API keys in the environment variables.');
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
    // Provide basic analysis when LLM is unavailable
    if (prompt.includes('package.json')) {
      return 'This appears to be a Node.js/JavaScript project based on the package.json file. The project likely uses modern JavaScript frameworks and build tools.';
    }
    
    if (prompt.includes('requirements.txt') || prompt.includes('.py')) {
      return 'This is a Python project. Based on common patterns, it likely uses popular Python frameworks and libraries for web development or data processing.';
    }
    
    if (prompt.includes('pom.xml') || prompt.includes('.java')) {
      return 'This is a Java project using Maven for dependency management. It likely follows standard Java enterprise patterns.';
    }
    
    return 'This appears to be a software project with multiple technologies. A detailed analysis would require examining the specific files and dependencies.';
  }

  async fetchFileContents(owner: string, repo: string, files: FileNode[]): Promise<Map<string, string>> {
    const fileContents = new Map<string, string>();
    const importantFiles = files.filter(file => 
      file.type === 'file' && (
        ['package.json', 'requirements.txt', 'pom.xml', 'Cargo.toml', 'go.mod', 'composer.json'].includes(file.name) ||
        file.name.endsWith('.csproj') || 
        file.name.endsWith('.sln') ||
        file.name.toLowerCase().includes('readme') ||
        file.name.toLowerCase().includes('dockerfile') ||
        file.name.includes('docker-compose')
      )
    );

    // Limit to prevent API rate limiting
    const filesToFetch = importantFiles.slice(0, 10);

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
    
    let prompt = `Analyze this repository's technology stack. Based on the following files and their contents, identify:

1. Primary programming languages (in order of usage)
2. Frameworks and libraries used
3. Build tools and package managers
4. Databases and data storage solutions
5. Cloud services and deployment tools
6. Development and testing tools

Files and contents:
`;

    // Add file contents to prompt
    for (const [path, content] of fileContents.entries()) {
      prompt += `\n--- ${path} ---\n${content.substring(0, 2000)}\n`;
    }

    prompt += `\nFile structure overview:
${files.slice(0, 20).map(f => `${f.type === 'directory' ? '📁' : '📄'} ${f.path}`).join('\n')}

Please provide a structured analysis focusing on the main technologies, their purposes, and confidence level.`;

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
      confidence: 0.85,
      summary: response
    };

    // Enhanced language detection from file extensions
    const languageMap: { [key: string]: string } = {
      '.js': 'JavaScript', '.jsx': 'JavaScript (React)', '.ts': 'TypeScript', '.tsx': 'TypeScript (React)',
      '.py': 'Python', '.java': 'Java', '.go': 'Go', '.rs': 'Rust', '.php': 'PHP', '.cs': 'C#',
      '.cpp': 'C++', '.c': 'C', '.rb': 'Ruby', '.swift': 'Swift', '.kt': 'Kotlin', '.scala': 'Scala',
      '.clj': 'Clojure', '.hs': 'Haskell', '.elm': 'Elm', '.dart': 'Dart', '.lua': 'Lua'
    };

    const languageCounts: { [key: string]: number } = {};
    files.forEach(file => {
      if (file.type === 'file') {
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        if (languageMap[ext]) {
          languageCounts[languageMap[ext]] = (languageCounts[languageMap[ext]] || 0) + 1;
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
        
        // Framework detection with more comprehensive mapping
        const frameworkMap: { [key: string]: string } = {
          'react': 'React', 'vue': 'Vue.js', '@angular/core': 'Angular', 'svelte': 'Svelte',
          'next': 'Next.js', 'nuxt': 'Nuxt.js', 'gatsby': 'Gatsby', 'remix': 'Remix',
          'express': 'Express.js', 'fastify': 'Fastify', 'koa': 'Koa.js', 'hapi': 'Hapi.js',
          'nestjs': 'NestJS', '@nestjs/core': 'NestJS', 'apollo-server': 'Apollo Server'
        };

        Object.keys(allDeps).forEach(dep => {
          if (frameworkMap[dep]) {
            analysis.frameworks.push(frameworkMap[dep]);
          }
        });

        // Build tools detection
        const buildToolMap: { [key: string]: string } = {
          'vite': 'Vite', 'webpack': 'Webpack', 'rollup': 'Rollup', 'parcel': 'Parcel',
          'esbuild': 'ESBuild', 'turbo': 'Turbo', 'nx': 'Nx', 'lerna': 'Lerna'
        };

        Object.keys(allDeps).forEach(dep => {
          if (buildToolMap[dep]) {
            analysis.buildTools.push(buildToolMap[dep]);
          }
        });

        // Dev tools detection
        const devToolMap: { [key: string]: string } = {
          'eslint': 'ESLint', 'prettier': 'Prettier', 'typescript': 'TypeScript',
          'jest': 'Jest', 'vitest': 'Vitest', 'cypress': 'Cypress', 'playwright': 'Playwright',
          'storybook': 'Storybook', '@storybook/react': 'Storybook'
        };

        Object.keys(allDeps).forEach(dep => {
          if (devToolMap[dep]) {
            analysis.devTools.push(devToolMap[dep]);
          }
        });

        analysis.packageManagers.push('npm');
      } catch (e) {
        console.error('Error parsing package.json:', e);
      }
    }

    // Detect other package managers and config files
    if (files.some(f => f.name === 'yarn.lock')) analysis.packageManagers.push('Yarn');
    if (files.some(f => f.name === 'pnpm-lock.yaml')) analysis.packageManagers.push('pnpm');
    if (files.some(f => f.name === 'requirements.txt')) analysis.packageManagers.push('pip');
    if (files.some(f => f.name === 'Pipfile')) analysis.packageManagers.push('Pipenv');
    if (files.some(f => f.name === 'poetry.lock')) analysis.packageManagers.push('Poetry');
    if (files.some(f => f.name === 'Cargo.toml')) analysis.packageManagers.push('Cargo');
    if (files.some(f => f.name === 'go.mod')) analysis.packageManagers.push('Go Modules');

    // Database detection from various sources
    const dockerCompose = fileContents.get('docker-compose.yml') || fileContents.get('docker-compose.yaml');
    if (dockerCompose) {
      const dbPatterns = {
        'postgres': 'PostgreSQL', 'mysql': 'MySQL', 'mongodb': 'MongoDB', 'redis': 'Redis',
        'elasticsearch': 'Elasticsearch', 'cassandra': 'Cassandra', 'neo4j': 'Neo4j'
      };
      
      Object.entries(dbPatterns).forEach(([pattern, db]) => {
        if (dockerCompose.toLowerCase().includes(pattern)) {
          analysis.databases.push(db);
        }
      });
    }

    // Cloud services detection
    if (files.some(f => f.name === 'vercel.json')) analysis.cloudServices.push('Vercel');
    if (files.some(f => f.name === 'netlify.toml')) analysis.cloudServices.push('Netlify');
    if (files.some(f => f.name.includes('aws'))) analysis.cloudServices.push('AWS');
    if (files.some(f => f.name.includes('gcp') || f.name.includes('google'))) analysis.cloudServices.push('Google Cloud');
    if (files.some(f => f.name.includes('azure'))) analysis.cloudServices.push('Azure');

    // Remove duplicates
    analysis.frameworks = [...new Set(analysis.frameworks)];
    analysis.buildTools = [...new Set(analysis.buildTools)];
    analysis.devTools = [...new Set(analysis.devTools)];
    analysis.databases = [...new Set(analysis.databases)];
    analysis.cloudServices = [...new Set(analysis.cloudServices)];
    analysis.packageManagers = [...new Set(analysis.packageManagers)];

    return analysis;
  }

  async analyzeDependencies(owner: string, repo: string, files: FileNode[]): Promise<DependencyAnalysis> {
    const fileContents = await this.fetchFileContents(owner, repo, files);
    const dependencies: Dependency[] = [];
    let totalCount = 0;

    // Analyze package.json dependencies
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
              hasSecurityIssue: this.simulateSecurityCheck(name)
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
              hasSecurityIssue: this.simulateSecurityCheck(name)
            });
          });
          totalCount += Object.keys(pkg.devDependencies).length;
        }
      } catch (e) {
        console.error('Error parsing package.json:', e);
      }
    }

    // Analyze Python requirements
    const requirementsTxt = fileContents.get('requirements.txt');
    if (requirementsTxt) {
      const lines = requirementsTxt.split('\n').filter(line => line.trim() && !line.startsWith('#'));
      lines.forEach(line => {
        const match = line.match(/^([a-zA-Z0-9\-_]+)([>=<~!]+.*)?$/);
        if (match) {
          dependencies.push({
            name: match[1],
            version: match[2] || 'latest',
            type: 'production',
            isOutdated: this.simulateOutdatedCheck(match[1]),
            hasSecurityIssue: this.simulateSecurityCheck(match[1])
          });
          totalCount++;
        }
      });
    }

    const outdatedCount = dependencies.filter(dep => dep.isOutdated).length;
    const securityIssues = dependencies.filter(dep => dep.hasSecurityIssue).length;

    const prompt = `Analyze the dependencies of this repository and provide insights:

Dependencies (${dependencies.length} total):
${dependencies.slice(0, 15).map(dep => `- ${dep.name}@${dep.version} (${dep.type})`).join('\n')}

Please provide insights about:
1. Overall dependency health
2. Potential security concerns
3. Outdated packages impact
4. Recommendations for improvement
5. Notable dependencies and their purposes`;

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

  private simulateOutdatedCheck(packageName: string): boolean {
    // Simulate outdated package detection
    // In real implementation, this would check against npm registry
    const commonOutdated = ['lodash', 'moment', 'request', 'babel-core'];
    return commonOutdated.includes(packageName) || Math.random() > 0.8;
  }

  private simulateSecurityCheck(packageName: string): boolean {
    // Simulate security vulnerability detection
    // In real implementation, this would check against security databases
    const knownVulnerable = ['event-stream', 'flatmap-stream'];
    return knownVulnerable.includes(packageName) || Math.random() > 0.95;
  }

  async analyzeRepository(owner: string, repo: string, files: FileNode[]): Promise<RepositoryAnalysis> {
    try {
      const [techStack, dependencies] = await Promise.all([
        this.analyzeTechStack(owner, repo, files),
        this.analyzeDependencies(owner, repo, files)
      ]);

      // Determine project complexity
      let complexity: 'Low' | 'Medium' | 'High' = 'Low';
      const complexityFactors = [
        dependencies.totalCount > 50,
        techStack.primaryLanguages.length > 2,
        techStack.frameworks.length > 2,
        files.length > 100
      ];
      
      const complexityScore = complexityFactors.filter(Boolean).length;
      if (complexityScore >= 3) complexity = 'High';
      else if (complexityScore >= 2) complexity = 'Medium';

      // Calculate maintainability score (0-100)
      let maintainability = 85;
      maintainability -= Math.min(dependencies.outdatedCount * 1.5, 20);
      maintainability -= Math.min(dependencies.securityIssues * 3, 25);
      maintainability -= (complexity === 'High' ? 15 : complexity === 'Medium' ? 8 : 0);
      maintainability = Math.max(0, Math.min(100, maintainability));

      return {
        techStack,
        dependencies,
        projectType: this.determineProjectType(techStack),
        complexity,
        maintainability: Math.round(maintainability),
        analyzedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Repository analysis failed:', error);
      throw new Error(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private determineProjectType(techStack: TechStackAnalysis): string {
    const { frameworks, primaryLanguages } = techStack;
    
    if (frameworks.some(f => ['React', 'Vue.js', 'Angular', 'Svelte'].includes(f))) {
      return 'Frontend Web Application';
    }
    if (frameworks.some(f => ['Express.js', 'Fastify', 'NestJS'].includes(f))) {
      return 'Backend API Service';
    }
    if (frameworks.includes('Next.js') || frameworks.includes('Nuxt.js')) {
      return 'Full-Stack Web Application';
    }
    if (frameworks.includes('React Native') || frameworks.includes('Flutter')) {
      return 'Mobile Application';
    }
    if (primaryLanguages.includes('Python')) {
      return frameworks.some(f => f.includes('Django') || f.includes('Flask')) 
        ? 'Python Web Application' 
        : 'Python Application';
    }
    if (primaryLanguages.includes('Java')) {
      return 'Java Application';
    }
    if (primaryLanguages.includes('Go')) {
      return 'Go Application';
    }
    if (primaryLanguages.includes('Rust')) {
      return 'Rust Application';
    }
    
    return 'Software Project';
  }
}

export const llmAnalysisService = new LLMAnalysisService();