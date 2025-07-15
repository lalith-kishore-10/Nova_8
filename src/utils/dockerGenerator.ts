import type { StackAnalysis, DockerConfig, GeneratedFiles } from '../types/analysis';

export class DockerGenerator {
  private analysis: StackAnalysis;

  constructor(analysis: StackAnalysis) {
    this.analysis = analysis;
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

  generateFiles(): GeneratedFiles {
    const config = this.generateDockerConfig();
    
    return {
      dockerfile: this.generateDockerfile(config),
      dockerCompose: this.generateDockerCompose(config),
      dockerignore: this.generateDockerignore(),
      readme: this.generateReadme(config)
    };
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

  private generateDockerfile(config: DockerConfig): string {
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

    // Add start command
    dockerfile += `CMD ["${config.startCommand.split(' ')[0]}"`;
    const args = config.startCommand.split(' ').slice(1);
    if (args.length > 0) {
      dockerfile += `, "${args.join('", "')}"`;
    }
    dockerfile += ']\n';

    return dockerfile;
  }

  private generateDockerCompose(config: DockerConfig): string {
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

volumes:
  redis_data:
`;
    }

    return compose;
  }

  private generateDockerignore(): string {
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

  private generateReadme(config: DockerConfig): string {
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
- Set up health checks
- Configure proper logging
- Use secrets for sensitive data
- Set resource limits
`;
  }
}