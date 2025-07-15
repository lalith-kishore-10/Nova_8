import { TechStackAnalysis, DependencyAnalysis, RepositoryAnalysis, Dependency } from '../types/analysis';
import { FileNode } from '../types/github';

class LLMAnalysisService {
  private async callLLM(prompt: string): Promise<string> {
    // In a real implementation, this would call your preferred LLM API
    // For demo purposes, we'll simulate LLM responses based on file analysis
    return this.simulateLLMResponse(prompt);
  }

  private simulateLLMResponse(prompt: string): string {
    // This simulates an LLM response based on the prompt content
    // In production, replace with actual LLM API calls (OpenAI, Anthropic, etc.)
    
    if (prompt.includes('package.json')) {
      return `Based on the package.json analysis, this appears to be a Node.js/JavaScript project using React framework with TypeScript. Key dependencies include React, TypeScript, Vite for building, and various development tools like ESLint and testing frameworks.`;
    }
    
    if (prompt.includes('requirements.txt') || prompt.includes('.py')) {
      return `This is a Python project. Dependencies suggest it uses Flask/Django for web development, with data science libraries like pandas and numpy. Testing is done with pytest.`;
    }
    
    if (prompt.includes('pom.xml') || prompt.includes('.java')) {
      return `Java project using Maven for dependency management. Appears to be a Spring Boot application with JPA for database access and JUnit for testing.`;
    }
    
    return `Mixed technology stack detected. Multiple languages and frameworks are present, suggesting a polyglot or microservices architecture.`;
  }

  async analyzeTechStack(files: FileNode[], fileContents: Map<string, string>): Promise<TechStackAnalysis> {
    const configFiles = files.filter(file => 
      ['package.json', 'requirements.txt', 'pom.xml', 'Cargo.toml', 'go.mod', 'composer.json'].includes(file.name) ||
      file.name.endsWith('.csproj') || file.name.endsWith('.sln')
    );

    const sourceFiles = files.filter(file => 
      file.name.endsWith('.js') || file.name.endsWith('.ts') || file.name.endsWith('.py') ||
      file.name.endsWith('.java') || file.name.endsWith('.go') || file.name.endsWith('.rs') ||
      file.name.endsWith('.php') || file.name.endsWith('.cs')
    );

    let prompt = `Analyze this repository's tech stack based on the following files:\n\n`;
    
    // Add config file contents to prompt
    for (const file of configFiles.slice(0, 3)) { // Limit to avoid token limits
      const content = fileContents.get(file.path);
      if (content) {
        prompt += `File: ${file.name}\n${content.substring(0, 1000)}\n\n`;
      }
    }

    // Add sample source files
    for (const file of sourceFiles.slice(0, 5)) {
      const content = fileContents.get(file.path);
      if (content) {
        prompt += `File: ${file.name}\n${content.substring(0, 500)}\n\n`;
      }
    }

    prompt += `Please identify the primary languages, frameworks, libraries, build tools, databases, and cloud services used in this project.`;

    const llmResponse = await this.callLLM(prompt);
    
    // Parse the response and extract structured data
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

    // Detect languages from file extensions
    const languageMap: { [key: string]: string } = {
      '.js': 'JavaScript',
      '.ts': 'TypeScript',
      '.jsx': 'JavaScript (React)',
      '.tsx': 'TypeScript (React)',
      '.py': 'Python',
      '.java': 'Java',
      '.go': 'Go',
      '.rs': 'Rust',
      '.php': 'PHP',
      '.cs': 'C#',
      '.cpp': 'C++',
      '.c': 'C',
      '.rb': 'Ruby',
      '.swift': 'Swift',
      '.kt': 'Kotlin'
    };

    const languageCounts: { [key: string]: number } = {};
    files.forEach(file => {
      const ext = '.' + file.name.split('.').pop();
      if (languageMap[ext]) {
        languageCounts[languageMap[ext]] = (languageCounts[languageMap[ext]] || 0) + 1;
      }
    });

    analysis.primaryLanguages = Object.entries(languageCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([lang]) => lang);

    // Detect frameworks and tools from package.json
    const packageJson = fileContents.get('package.json');
    if (packageJson) {
      try {
        const pkg = JSON.parse(packageJson);
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
        
        // Framework detection
        if (allDeps.react) analysis.frameworks.push('React');
        if (allDeps.vue) analysis.frameworks.push('Vue.js');
        if (allDeps.angular || allDeps['@angular/core']) analysis.frameworks.push('Angular');
        if (allDeps.svelte) analysis.frameworks.push('Svelte');
        if (allDeps.next) analysis.frameworks.push('Next.js');
        if (allDeps.nuxt) analysis.frameworks.push('Nuxt.js');
        if (allDeps.express) analysis.frameworks.push('Express.js');
        if (allDeps.fastify) analysis.frameworks.push('Fastify');

        // Build tools
        if (allDeps.vite) analysis.buildTools.push('Vite');
        if (allDeps.webpack) analysis.buildTools.push('Webpack');
        if (allDeps.rollup) analysis.buildTools.push('Rollup');
        if (allDeps.parcel) analysis.buildTools.push('Parcel');

        // Dev tools
        if (allDeps.eslint) analysis.devTools.push('ESLint');
        if (allDeps.prettier) analysis.devTools.push('Prettier');
        if (allDeps.jest) analysis.devTools.push('Jest');
        if (allDeps.vitest) analysis.devTools.push('Vitest');
        if (allDeps.cypress) analysis.devTools.push('Cypress');

        analysis.packageManagers.push('npm');
      } catch (e) {
        console.error('Error parsing package.json:', e);
      }
    }

    // Detect other package managers
    if (files.some(f => f.name === 'yarn.lock')) analysis.packageManagers.push('Yarn');
    if (files.some(f => f.name === 'pnpm-lock.yaml')) analysis.packageManagers.push('pnpm');
    if (files.some(f => f.name === 'requirements.txt')) analysis.packageManagers.push('pip');
    if (files.some(f => f.name === 'Cargo.toml')) analysis.packageManagers.push('Cargo');
    if (files.some(f => f.name === 'go.mod')) analysis.packageManagers.push('Go Modules');

    // Detect databases from common config files
    const dockerCompose = fileContents.get('docker-compose.yml') || fileContents.get('docker-compose.yaml');
    if (dockerCompose) {
      if (dockerCompose.includes('postgres')) analysis.databases.push('PostgreSQL');
      if (dockerCompose.includes('mysql')) analysis.databases.push('MySQL');
      if (dockerCompose.includes('mongodb')) analysis.databases.push('MongoDB');
      if (dockerCompose.includes('redis')) analysis.databases.push('Redis');
    }

    return analysis;
  }

  async analyzeDependencies(files: FileNode[], fileContents: Map<string, string>): Promise<DependencyAnalysis> {
    const dependencies: Dependency[] = [];
    let totalCount = 0;
    let outdatedCount = 0;
    let securityIssues = 0;

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
              isOutdated: Math.random() > 0.7, // Simulate outdated check
              hasSecurityIssue: Math.random() > 0.9 // Simulate security check
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
              isOutdated: Math.random() > 0.7,
              hasSecurityIssue: Math.random() > 0.95
            });
          });
          totalCount += Object.keys(pkg.devDependencies).length;
        }
      } catch (e) {
        console.error('Error parsing package.json:', e);
      }
    }

    // Count issues
    outdatedCount = dependencies.filter(dep => dep.isOutdated).length;
    securityIssues = dependencies.filter(dep => dep.hasSecurityIssue).length;

    const prompt = `Analyze the dependencies of this project and provide insights about potential issues, outdated packages, and security concerns:\n\n${JSON.stringify(dependencies.slice(0, 20), null, 2)}`;
    
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

  async analyzeRepository(files: FileNode[], selectedFiles: string[]): Promise<RepositoryAnalysis> {
    // Fetch content for key files
    const fileContents = new Map<string, string>();
    
    // This would be populated by fetching actual file contents
    // For demo, we'll simulate some content
    const packageJsonFile = files.find(f => f.name === 'package.json');
    if (packageJsonFile) {
      // In real implementation, fetch actual content
      fileContents.set('package.json', JSON.stringify({
        name: "example-project",
        dependencies: {
          react: "^18.0.0",
          typescript: "^4.9.0",
          vite: "^4.0.0"
        },
        devDependencies: {
          eslint: "^8.0.0",
          jest: "^29.0.0"
        }
      }, null, 2));
    }

    const [techStack, dependencies] = await Promise.all([
      this.analyzeTechStack(files, fileContents),
      this.analyzeDependencies(files, fileContents)
    ]);

    // Determine project complexity
    let complexity: 'Low' | 'Medium' | 'High' = 'Low';
    if (dependencies.totalCount > 50 || techStack.primaryLanguages.length > 2) {
      complexity = 'Medium';
    }
    if (dependencies.totalCount > 100 || techStack.frameworks.length > 3) {
      complexity = 'High';
    }

    // Calculate maintainability score (0-100)
    let maintainability = 85;
    maintainability -= dependencies.outdatedCount * 2;
    maintainability -= dependencies.securityIssues * 5;
    maintainability -= (complexity === 'High' ? 15 : complexity === 'Medium' ? 5 : 0);
    maintainability = Math.max(0, Math.min(100, maintainability));

    return {
      techStack,
      dependencies,
      projectType: this.determineProjectType(techStack),
      complexity,
      maintainability,
      analyzedAt: new Date().toISOString()
    };
  }

  private determineProjectType(techStack: TechStackAnalysis): string {
    if (techStack.frameworks.some(f => ['React', 'Vue.js', 'Angular'].includes(f))) {
      return 'Frontend Web Application';
    }
    if (techStack.frameworks.some(f => ['Express.js', 'Fastify'].includes(f))) {
      return 'Backend API Service';
    }
    if (techStack.frameworks.includes('Next.js')) {
      return 'Full-Stack Web Application';
    }
    if (techStack.primaryLanguages.includes('Python')) {
      return 'Python Application';
    }
    if (techStack.primaryLanguages.includes('Java')) {
      return 'Java Application';
    }
    return 'Software Project';
  }
}

export const llmAnalysisService = new LLMAnalysisService();