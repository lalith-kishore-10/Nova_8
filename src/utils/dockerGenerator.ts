import type { StackAnalysis, DockerConfig, GeneratedFiles } from '../types/analysis';

export class DockerGenerator {
  private analysis: StackAnalysis;

  constructor(analysis: StackAnalysis) {
    this.analysis = analysis;
  }

  async generateFiles(): Promise<GeneratedFiles> {
    // Try LLM-enhanced generation first
    try {
      const llmFiles = await this.generateLLMEnhanced();
      if (llmFiles) {
        return llmFiles;
      }
    } catch (error) {
      console.warn('LLM Docker generation failed, falling back to traditional generation:', error);
    }

    // Fallback to traditional generation
    return this.generateTraditional();
  }

  private async generateLLMEnhanced(): Promise<GeneratedFiles | null> {
    try {
      // Check if Ollama is available
      const statusResponse = await fetch('http://localhost:5001/ollama-status', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      if (!statusResponse.ok) {
        throw new Error('Ollama not available');
      }

      const response = await fetch('http://localhost:5001/generate-docker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(30000), // 30 second timeout for generation
        body: JSON.stringify({
          analysis: this.analysis,
          projectName: 'project',
          files: []
        })
      });

      if (!response.ok) {
        throw new Error(`LLM Docker generation failed: ${response.statusText}`);
      }

      const data = await response.json();
      const dockerConfig = data.dockerConfig;

      return {
        dockerfile: dockerConfig.dockerfile || this.generateTraditionalDockerfile(),
        dockerCompose: dockerConfig.dockerCompose || this.generateTraditionalDockerCompose(),
        dockerignore: dockerConfig.dockerignore || this.generateTraditionalDockerignore(),
        readme: dockerConfig.readme || this.generateTraditionalReadme(),
        healthCheck: dockerConfig.healthCheck,
        buildScript: dockerConfig.buildScript,
        securityRecommendations: dockerConfig.securityRecommendations,
        optimizations: dockerConfig.optimizations,
        estimatedSize: dockerConfig.estimatedSize,
        buildTime: dockerConfig.buildTime
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn('LLM Docker generation timed out, falling back to traditional generation');
      } else if (error.message?.includes('Failed to fetch')) {
        console.warn('Backend server not accessible at http://localhost:5001. Please run "npm run dev:full" to start both frontend and backend servers.');
      } else {
        console.warn('LLM-enhanced Docker generation failed, falling back to traditional generation:', error.message);
      }
      return null;
    }
  }

  private generateTraditional(): GeneratedFiles {
    const config = this.generateDockerConfig();
    
    return {
      dockerfile: this.generateTraditionalDockerfile(config),
      dockerCompose: this.generateTraditionalDockerCompose(config),
      dockerignore: this.generateTraditionalDockerignore(),
      readme: this.generateTraditionalReadme(config)
    };
  }

  generateDockerConfig(): DockerConfig {
    const config: DockerConfig = {
      baseImage: this.getBaseImage(),
      workdir: '/app',
      copyInstructions: [],
      runInstructions: [],
      exposePort: this.getDefaultPort(),
      startCommand: this.getStartCommand()
    };

    this.addCopyInstructions(config);
    this.addRunInstructions(config);
    this.addEnvironmentVars(config);

    return config;
  }

  private getBaseImage(): string {
    const { primaryLanguage, framework, runtime } = this.analysis;

    switch (primaryLanguage) {
      case 'javascript':
      case 'typescript':
        if (framework === 'Next.js') return 'node:18-alpine';
        return 'node:18-alpine';
      
      case 'python':
        if (framework === 'Django' || framework === 'Flask') return 'python:3.11-slim';
        return 'python:3.11-alpine';
      
      case 'java':
        if (framework === 'Spring Boot') return 'openjdk:17-jdk-slim';
        return 'openjdk:17-jdk-alpine';
      
      case 'go':
        return 'golang:1.21-alpine';
      
      case 'rust':
        return 'rust:1.70-slim';
      
      case 'php':
        return 'php:8.2-fpm-alpine';
      
      case 'ruby':
        return 'ruby:3.2-alpine';
      
      default:
        return 'node:18-alpine';
    }
  }

  private getDefaultPort(): number {
    const { framework, primaryLanguage } = this.analysis;
    
    if (framework === 'Next.js') return 3000;
    if (framework === 'React' && this.analysis.buildTool === 'Vite') return 5173;
    if (framework === 'Django') return 8000;
    if (framework === 'Flask') return 5000;
    if (framework === 'FastAPI') return 8000;
    if (framework === 'Spring Boot') return 8080;
    if (framework === 'Express.js') return 3000;
    
    // Default ports by language
    switch (primaryLanguage) {
      case 'javascript':
      case 'typescript':
        return 3000;
      case 'python':
        return 8000;
      case 'java':
        return 8080;
      case 'go':
        return 8080;
      case 'rust':
        return 8000;
      case 'php':
        return 80;
      case 'ruby':
        return 3000;
      default:
        return 3000;
    }
  }

  private getStartCommand(): string {
    const { framework, primaryLanguage, scripts } = this.analysis;
    
    // Check for common start scripts
    if (scripts.start) return 'npm start';
    if (scripts.dev) return 'npm run dev';
    if (scripts.serve) return 'npm run serve';
    
    // Framework-specific commands
    if (framework === 'Next.js') return 'npm start';
    if (framework === 'Django') return 'python manage.py runserver 0.0.0.0:8000';
    if (framework === 'Flask') return 'python app.py';
    if (framework === 'FastAPI') return 'uvicorn main:app --host 0.0.0.0 --port 8000';
    if (framework === 'Spring Boot') return 'java -jar target/*.jar';
    
    // Language defaults
    switch (primaryLanguage) {
      case 'javascript':
      case 'typescript':
        return 'node index.js';
      case 'python':
        return 'python main.py';
      case 'java':
        return 'java -jar app.jar';
      case 'go':
        return './main';
      case 'rust':
        return './target/release/app';
      default:
        return 'npm start';
    }
  }

  private addCopyInstructions(config: DockerConfig) {
    const { primaryLanguage, packageManager } = this.analysis;
    
    switch (primaryLanguage) {
      case 'javascript':
      case 'typescript':
        config.copyInstructions = [
          'COPY package*.json ./',
          'COPY . .'
        ];
        break;
      
      case 'python':
        config.copyInstructions = [
          'COPY requirements.txt .',
          'COPY . .'
        ];
        break;
      
      case 'java':
        config.copyInstructions = [
          'COPY pom.xml .',
          'COPY src ./src'
        ];
        break;
      
      case 'go':
        config.copyInstructions = [
          'COPY go.mod go.sum ./',
          'COPY . .'
        ];
        break;
      
      case 'rust':
        config.copyInstructions = [
          'COPY Cargo.toml Cargo.lock ./',
          'COPY src ./src'
        ];
        break;
      
      default:
        config.copyInstructions = ['COPY . .'];
    }
  }

  private addRunInstructions(config: DockerConfig) {
    const { primaryLanguage, framework, buildTool } = this.analysis;
    
    switch (primaryLanguage) {
      case 'javascript':
      case 'typescript':
        config.runInstructions = [
          'RUN npm ci --only=production',
          ...(framework === 'Next.js' ? ['RUN npm run build'] : [])
        ];
        break;
      
      case 'python':
        config.runInstructions = [
          'RUN pip install --no-cache-dir -r requirements.txt'
        ];
        break;
      
      case 'java':
        config.runInstructions = [
          'RUN mvn clean package -DskipTests'
        ];
        break;
      
      case 'go':
        config.runInstructions = [
          'RUN go mod download',
          'RUN go build -o main .'
        ];
        break;
      
      case 'rust':
        config.runInstructions = [
          'RUN cargo build --release'
        ];
        break;
      
      default:
        config.runInstructions = ['RUN echo "No specific build instructions"'];
    }
  }

  private addEnvironmentVars(config: DockerConfig) {
    const { framework, primaryLanguage } = this.analysis;
    
    config.environmentVars = {
      NODE_ENV: 'production'
    };
    
    if (framework === 'Next.js') {
      config.environmentVars.NEXT_TELEMETRY_DISABLED = '1';
    }
    
    if (primaryLanguage === 'python') {
      config.environmentVars.PYTHONUNBUFFERED = '1';
      config.environmentVars.PYTHONDONTWRITEBYTECODE = '1';
    }
  }

  private generateTraditionalDockerfile(config?: DockerConfig): string {
    if (!config) config = this.generateDockerConfig();
    
    let dockerfile = `# Generated Dockerfile for ${this.analysis.framework || this.analysis.primaryLanguage} application
FROM ${config.baseImage}

WORKDIR ${config.workdir}

`;

    // Add environment variables
    if (config.environmentVars) {
      Object.entries(config.environmentVars).forEach(([key, value]) => {
        dockerfile += `ENV ${key}=${value}\n`;
      });
      dockerfile += '\n';
    }

    // Add copy instructions
    config.copyInstructions.forEach(instruction => {
      dockerfile += `${instruction}\n`;
    });
    dockerfile += '\n';

    // Add run instructions
    config.runInstructions.forEach(instruction => {
      dockerfile += `${instruction}\n`;
    });
    dockerfile += '\n';

    // Expose port
    dockerfile += `EXPOSE ${config.exposePort}\n\n`;

    // Add health check
    dockerfile += `HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \\\n`;
    dockerfile += `  CMD curl -f http://localhost:${config.exposePort}/health || exit 1\n\n`;

    // Add start command
    dockerfile += `CMD ["${config.startCommand.split(' ')[0]}"`;
    const args = config.startCommand.split(' ').slice(1);
    if (args.length > 0) {
      dockerfile += `, "${args.join('", "')}"`;
    }
    dockerfile += ']\n';

    return dockerfile;
  }

  private generateTraditionalDockerCompose(config?: DockerConfig): string {
    if (!config) config = this.generateDockerConfig();
    
    const serviceName = 'app';
    let compose = `version: '3.8'

services:
  ${serviceName}:
    build: .
    ports:
      - "${config.exposePort}:${config.exposePort}"
    environment:
`;

    // Add environment variables
    if (config.environmentVars) {
      Object.entries(config.environmentVars).forEach(([key, value]) => {
        compose += `      - ${key}=${value}\n`;
      });
    }

    compose += `    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:${config.exposePort}/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    restart: unless-stopped
`;

    // Add database services if detected
    if (this.analysis.database?.includes('PostgreSQL')) {
      compose += `
  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=app_db
      - POSTGRES_USER=app_user
      - POSTGRES_PASSWORD=app_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app_user -d app_db"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  postgres_data:
`;
    }

    if (this.analysis.database?.includes('MongoDB')) {
      compose += `
  mongodb:
    image: mongo:6-alpine
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=password
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/test --quiet
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  mongodb_data:
`;
    }

    if (this.analysis.database?.includes('Redis')) {
      compose += `
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  redis_data:
`;
    }

    return compose;
  }

  private generateTraditionalDockerignore(): string {
    const { primaryLanguage } = this.analysis;
    
    let dockerignore = `# Generated .dockerignore
node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
.DS_Store
*.log
Dockerfile
docker-compose.yml
.dockerignore
`;

    switch (primaryLanguage) {
      case 'javascript':
      case 'typescript':
        dockerignore += `
# Node.js specific
.npm
.nyc_output
coverage
.next
.nuxt
dist
build
`;
        break;
      
      case 'python':
        dockerignore += `
# Python specific
__pycache__
*.pyc
*.pyo
*.pyd
.Python
env
pip-log.txt
pip-delete-this-directory.txt
.tox
.coverage
.coverage.*
.cache
nosetests.xml
coverage.xml
*.cover
*.log
.git
.mypy_cache
.pytest_cache
.hypothesis
`;
        break;
      
      case 'java':
        dockerignore += `
# Java specific
target/
*.class
*.jar
*.war
*.ear
*.logs
hs_err_pid*
`;
        break;
      
      case 'go':
        dockerignore += `
# Go specific
*.exe
*.exe~
*.dll
*.so
*.dylib
*.test
*.out
vendor/
`;
        break;
      
      case 'rust':
        dockerignore += `
# Rust specific
target/
Cargo.lock
`;
        break;
    }

    return dockerignore;
  }

  private generateTraditionalReadme(config?: DockerConfig): string {
    if (!config) config = this.generateDockerConfig();
    
    const { framework, primaryLanguage } = this.analysis;
    
    return `# Docker Configuration

This Docker configuration was automatically generated for your ${framework || primaryLanguage} application.

## Quick Start

### Using Docker
\`\`\`bash
# Build the image
docker build -t my-app .

# Run the container
docker run -p ${config.exposePort}:${config.exposePort} my-app
\`\`\`

### Using Docker Compose
\`\`\`bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
\`\`\`

## Health Checks

The application includes built-in health checks:
- **Endpoint**: \`http://localhost:${config.exposePort}/health\`
- **Interval**: 30 seconds
- **Timeout**: 10 seconds
- **Retries**: 3

## Configuration Details

- **Base Image**: ${config.baseImage}
- **Exposed Port**: ${config.exposePort}
- **Start Command**: ${config.startCommand}
- **Framework**: ${framework || 'None detected'}
- **Primary Language**: ${primaryLanguage}

## Environment Variables

${Object.entries(config.environmentVars || {}).map(([key, value]) => `- \`${key}\`: ${value}`).join('\n')}

## Database Services

${this.analysis.database?.length ? 
  this.analysis.database.map(db => `- ${db}`).join('\n') : 
  'No database services detected'
}

## Development

For development, you may want to:

1. Mount your source code as a volume
2. Use a different start command for hot reloading
3. Expose additional ports for debugging

Example development docker-compose override:

\`\`\`yaml
version: '3.8'
services:
  app:
    volumes:
      - .:/app
    command: ${this.analysis.scripts.dev ? 'npm run dev' : config.startCommand}
    environment:
      - NODE_ENV=development
\`\`\`

## Production Considerations

- Use multi-stage builds for smaller images
- Set up health checks (already included)
- Configure proper logging
- Use secrets for sensitive data
- Set resource limits
- Enable security scanning

## Testing Docker Configuration

You can test the Docker configuration using:

\`\`\`bash
# Test build
docker build -t test-app .

# Test health check
docker run -d --name test-container -p ${config.exposePort}:${config.exposePort} test-app
sleep 60  # Wait for startup
curl -f http://localhost:${config.exposePort}/health

# Cleanup
docker stop test-container
docker rm test-container
\`\`\`
`;
  }

  async testDockerConfiguration(dockerfile: string, dockerCompose?: string): Promise<any> {
    try {
      const response = await fetch('http://localhost:5001/test-docker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(15000), // 15 second timeout
        body: JSON.stringify({
          dockerfile,
          dockerCompose,
          projectName: 'test-project'
        })
      });

      if (!response.ok) {
        throw new Error(`Docker test failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.testResults;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn('Docker configuration test timed out');
      } else if (error.message?.includes('Failed to fetch')) {
        console.warn('Backend server not accessible. Docker test skipped.');
      } else {
        console.warn('Docker configuration test failed:', error.message);
      }
      return {
        validation: { isValid: false, errors: [error.message] },
        security: { score: 0, vulnerabilities: [] },
        performance: { score: 0, issues: [] }
      };
    }
  }

  async generateHealthCheck(): Promise<any> {
    try {
      const response = await fetch('http://localhost:5001/generate-healthcheck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000), // 10 second timeout
        body: JSON.stringify({
          analysis: this.analysis,
          framework: this.analysis.framework,
          port: this.getDefaultPort()
        })
      });

      if (!response.ok) {
        throw new Error(`Health check generation failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.healthConfig;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn('Health check generation timed out, using default configuration');
      } else if (error.message?.includes('Failed to fetch')) {
        console.warn('Backend server not accessible. Using default health check configuration.');
      } else {
        console.warn('Health check generation failed, using default configuration:', error.message);
      }
      return {
        endpoint: '/health',
        dockerHealthCheck: {
          command: `curl -f http://localhost:${this.getDefaultPort()}/health || exit 1`,
          interval: '30s',
          timeout: '10s',
          retries: 3,
          startPeriod: '60s'
        }
      };
    }
  }
}