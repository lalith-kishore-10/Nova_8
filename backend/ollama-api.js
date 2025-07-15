const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = 5001;
const OLLAMA_URL = 'http://localhost:11434';
const OLLAMA_MODEL = 'codellama:7b';

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Ollama API server is running' });
});

// Check if Ollama is running
app.get('/ollama-status', async (req, res) => {
  try {
    const response = await axios.get(`${OLLAMA_URL}/api/tags`, { timeout: 5000 });
    res.json({ 
      status: 'connected', 
      models: response.data.models || [],
      endpoint: OLLAMA_URL,
      defaultModel: OLLAMA_MODEL
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'disconnected', 
      error: `Cannot connect to Ollama at ${OLLAMA_URL}. Make sure Ollama is running with: ollama serve`,
      details: error.message
    });
  }
});

// Enhanced stack analysis using LLM
app.post('/analyze-stack', async (req, res) => {
  try {
    const { files, packageJson, requirements, pomXml, cargoToml, goMod } = req.body;
    
    if (!files || !Array.isArray(files)) {
      return res.status(400).json({ error: 'Files array is required' });
    }

    const prompt = `Analyze this software project and provide a comprehensive stack analysis. 

Project files structure:
${files.slice(0, 50).map(f => f.path).join('\n')}

Configuration files content:
${packageJson ? `package.json:\n${packageJson}\n\n` : ''}
${requirements ? `requirements.txt:\n${requirements}\n\n` : ''}
${pomXml ? `pom.xml:\n${pomXml}\n\n` : ''}
${cargoToml ? `Cargo.toml:\n${cargoToml}\n\n` : ''}
${goMod ? `go.mod:\n${goMod}\n\n` : ''}

Please provide a detailed analysis in JSON format with the following structure:
{
  "primaryLanguage": "detected primary language",
  "framework": "main framework if detected",
  "packageManager": "package manager used",
  "runtime": "runtime environment",
  "database": ["detected databases"],
  "buildTool": "build tool used",
  "testFramework": "testing framework",
  "linting": ["linting tools"],
  "styling": ["styling tools/frameworks"],
  "architecture": "detected architecture pattern",
  "deployment": "deployment strategy suggestions",
  "dependencies": [
    {
      "name": "dependency name",
      "version": "version",
      "type": "runtime|dev|peer",
      "category": "framework|library|tool|database",
      "security": "security assessment",
      "recommendation": "upgrade/keep/remove recommendation"
    }
  ],
  "recommendations": [
    "specific recommendations for improvement"
  ],
  "dockerStrategy": {
    "baseImage": "recommended base image",
    "buildStage": "multi-stage build recommendation",
    "optimizations": ["optimization suggestions"],
    "securityConsiderations": ["security recommendations"]
  }
}

Focus on:
1. Accurate technology detection
2. Security vulnerabilities in dependencies
3. Performance optimization opportunities
4. Docker containerization best practices
5. Testing and CI/CD recommendations`;

    const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      options: {
        temperature: 0.1,
        top_p: 0.9,
        max_tokens: 4000
      }
    }, { timeout: 30000 });

    // Try to parse JSON response
    let analysis;
    try {
      analysis = JSON.parse(response.data.response);
    } catch (parseError) {
      // If JSON parsing fails, create a structured response from text
      analysis = {
        primaryLanguage: 'unknown',
        framework: null,
        dependencies: [],
        recommendations: [response.data.response],
        rawResponse: response.data.response
      };
    }

    res.json({
      analysis,
      model: OLLAMA_MODEL,
      endpoint: OLLAMA_URL
    });
  } catch (error) {
    console.error('Stack Analysis Error:', error.message);
    res.status(500).json({ 
      error: 'Failed to analyze stack with LLM',
      details: error.response?.data || error.message
    });
  }
});

// Enhanced Docker generation using LLM
app.post('/generate-docker', async (req, res) => {
  try {
    const { analysis, projectName, files } = req.body;
    
    if (!analysis) {
      return res.status(400).json({ error: 'Stack analysis is required' });
    }

    const prompt = `Generate optimized Docker configuration for this project:

Project: ${projectName}
Primary Language: ${analysis.primaryLanguage}
Framework: ${analysis.framework || 'None'}
Package Manager: ${analysis.packageManager || 'None'}
Build Tool: ${analysis.buildTool || 'None'}
Database: ${analysis.database?.join(', ') || 'None'}

Key Dependencies:
${analysis.dependencies?.slice(0, 10).map(d => `- ${d.name}${d.version ? '@' + d.version : ''}`).join('\n') || 'None listed'}

File structure (sample):
${files?.slice(0, 20).map(f => f.path).join('\n') || 'Not provided'}

Generate a complete Docker setup with the following files in JSON format:
{
  "dockerfile": "complete Dockerfile content with multi-stage build if beneficial",
  "dockerCompose": "docker-compose.yml with all necessary services",
  "dockerignore": ".dockerignore file content",
  "healthCheck": {
    "endpoint": "/health endpoint path",
    "command": "health check command",
    "interval": "check interval",
    "timeout": "timeout duration",
    "retries": "retry count"
  },
  "buildScript": "build.sh script for automated building",
  "readme": "comprehensive Docker README with instructions",
  "securityRecommendations": ["security best practices"],
  "optimizations": ["performance optimizations applied"],
  "estimatedSize": "estimated final image size",
  "buildTime": "estimated build time"
}

Requirements:
1. Use multi-stage builds for smaller images
2. Implement proper health checks
3. Follow security best practices (non-root user, minimal base image)
4. Optimize for caching and build speed
5. Include development and production configurations
6. Add proper environment variable handling
7. Include database services if detected
8. Add monitoring and logging considerations`;

    const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      options: {
        temperature: 0.1,
        top_p: 0.9,
        max_tokens: 6000
      }
    }, { timeout: 45000 });

    // Try to parse JSON response
    let dockerConfig;
    try {
      dockerConfig = JSON.parse(response.data.response);
    } catch (parseError) {
      // Fallback if JSON parsing fails
      dockerConfig = {
        dockerfile: response.data.response,
        dockerCompose: '',
        dockerignore: '',
        readme: 'Generated Docker configuration',
        rawResponse: response.data.response
      };
    }

    res.json({
      dockerConfig,
      model: OLLAMA_MODEL,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Docker Generation Error:', error.message);
    res.status(500).json({ 
      error: 'Failed to generate Docker configuration with LLM',
      details: error.response?.data || error.message
    });
  }
});

// Test and validate Docker configuration
app.post('/test-docker', async (req, res) => {
  try {
    const { dockerfile, dockerCompose, projectName } = req.body;
    
    if (!dockerfile) {
      return res.status(400).json({ error: 'Dockerfile content is required' });
    }

    const prompt = `Analyze and test this Docker configuration for potential issues:

Project: ${projectName}

Dockerfile:
${dockerfile}

${dockerCompose ? `Docker Compose:\n${dockerCompose}\n` : ''}

Perform a comprehensive analysis and provide results in JSON format:
{
  "validation": {
    "isValid": true/false,
    "syntaxErrors": ["syntax error descriptions"],
    "warnings": ["warning messages"],
    "suggestions": ["improvement suggestions"]
  },
  "security": {
    "score": "security score 0-100",
    "vulnerabilities": [
      {
        "type": "vulnerability type",
        "severity": "low|medium|high|critical",
        "description": "vulnerability description",
        "fix": "how to fix it"
      }
    ],
    "recommendations": ["security recommendations"]
  },
  "performance": {
    "score": "performance score 0-100",
    "issues": ["performance issues"],
    "optimizations": ["optimization suggestions"],
    "estimatedBuildTime": "estimated build time",
    "estimatedImageSize": "estimated final image size"
  },
  "bestPractices": {
    "score": "best practices score 0-100",
    "violations": ["best practice violations"],
    "improvements": ["improvement suggestions"]
  },
  "testCommands": [
    {
      "command": "docker command to test",
      "description": "what this command tests",
      "expectedResult": "expected outcome"
    }
  ],
  "healthCheck": {
    "isConfigured": true/false,
    "endpoint": "health check endpoint",
    "recommendations": ["health check improvements"]
  }
}

Focus on:
1. Dockerfile syntax and best practices
2. Security vulnerabilities (root user, exposed secrets, etc.)
3. Performance optimizations (layer caching, multi-stage builds)
4. Health check configuration
5. Resource usage and limits
6. Network security
7. Build reproducibility`;

    const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      options: {
        temperature: 0.1,
        top_p: 0.9,
        max_tokens: 4000
      }
    });

    // Try to parse JSON response
    let testResults;
    try {
      testResults = JSON.parse(response.data.response);
    } catch (parseError) {
      // Fallback if JSON parsing fails
      testResults = {
        validation: { isValid: true, warnings: [], suggestions: [] },
        security: { score: 70, vulnerabilities: [], recommendations: [] },
        performance: { score: 70, issues: [], optimizations: [] },
        rawResponse: response.data.response
      };
    }

    res.json({
      testResults,
      model: OLLAMA_MODEL,
      testedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Docker Test Error:', error.message);
    res.status(500).json({ 
      error: 'Failed to test Docker configuration with LLM',
      details: error.response?.data || error.message
    });
  }
});

// Generate health check configuration
app.post('/generate-healthcheck', async (req, res) => {
  try {
    const { analysis, framework, port = 3000 } = req.body;
    
    const prompt = `Generate a comprehensive health check configuration for this application:

Framework: ${framework || analysis?.framework || 'Unknown'}
Primary Language: ${analysis?.primaryLanguage || 'Unknown'}
Port: ${port}
Database: ${analysis?.database?.join(', ') || 'None'}

Generate health check configuration in JSON format:
{
  "endpoint": "/health",
  "dockerHealthCheck": {
    "command": "health check command for Dockerfile",
    "interval": "30s",
    "timeout": "10s",
    "retries": 3,
    "startPeriod": "60s"
  },
  "applicationHealthCheck": {
    "route": "health check route code",
    "checks": [
      {
        "name": "check name",
        "type": "database|service|file|memory",
        "command": "check command or code",
        "timeout": "timeout duration"
      }
    ]
  },
  "monitoring": {
    "metrics": ["metrics to collect"],
    "alerts": ["alert conditions"],
    "logging": "logging configuration"
  },
  "kubernetesProbes": {
    "livenessProbe": "liveness probe configuration",
    "readinessProbe": "readiness probe configuration",
    "startupProbe": "startup probe configuration"
  }
}

Include checks for:
1. Application startup and readiness
2. Database connectivity
3. External service dependencies
4. Memory and resource usage
5. File system access
6. Network connectivity`;

    const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      options: {
        temperature: 0.1,
        top_p: 0.9,
        max_tokens: 3000
      }
    });

    // Try to parse JSON response
    let healthConfig;
    try {
      healthConfig = JSON.parse(response.data.response);
    } catch (parseError) {
      // Fallback configuration
      healthConfig = {
        endpoint: '/health',
        dockerHealthCheck: {
          command: `curl -f http://localhost:${port}/health || exit 1`,
          interval: '30s',
          timeout: '10s',
          retries: 3,
          startPeriod: '60s'
        },
        rawResponse: response.data.response
      };
    }

    res.json({
      healthConfig,
      model: OLLAMA_MODEL,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health Check Generation Error:', error.message);
    res.status(500).json({ 
      error: 'Failed to generate health check configuration with LLM',
      details: error.response?.data || error.message
    });
  }
});

// Generic ask endpoint for AI interaction
app.post('/ask', async (req, res) => {
  try {
    const { prompt, model = OLLAMA_MODEL } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model,
      prompt,
      stream: false
    });

    res.json({ 
      response: response.data.response,
      model: response.data.model,
      done: response.data.done
    });
  } catch (error) {
    console.error('Ollama API Error:', error.message);
    res.status(500).json({ 
      error: 'Failed to communicate with Ollama',
      details: error.response?.data || error.message
    });
  }
});

// Analyze code for bugs and issues
app.post('/analyze', async (req, res) => {
  try {
    const { code, filename, language } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    const prompt = `Analyze this ${language || 'code'} file (${filename || 'unknown'}) for bugs, security vulnerabilities, performance issues, and code quality problems. Provide a detailed analysis with specific line numbers where possible:

\`\`\`${language || 'javascript'}
${code}
\`\`\`

Please categorize issues as:
1. SYNTAX_ERROR - Code that won't compile/run
2. RUNTIME_ERROR - Potential runtime failures
3. SECURITY_VULNERABILITY - Security risks
4. PERFORMANCE_ISSUE - Performance problems
5. CODE_QUALITY - Style and maintainability issues

Format your response as JSON with this structure:
{
  "issues": [
    {
      "type": "SECURITY_VULNERABILITY",
      "severity": "high|medium|low",
      "line": 15,
      "message": "Description of the issue",
      "suggestion": "How to fix it"
    }
  ],
  "summary": "Overall assessment",
  "codeQualityScore": "score 0-100",
  "securityScore": "score 0-100",
  "maintainabilityScore": "score 0-100"
}`;

    const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model: OLLAMA_MODEL,
      prompt,
      stream: false
    });

    // Try to parse JSON response, fallback to text if parsing fails
    let analysisResult;
    try {
      analysisResult = JSON.parse(response.data.response);
    } catch (parseError) {
      // If JSON parsing fails, create a structured response from text
      analysisResult = {
        issues: [],
        summary: response.data.response,
        rawResponse: response.data.response
      };
    }

    res.json({
      analysis: analysisResult,
      filename,
      language,
      model: OLLAMA_MODEL
    });
  } catch (error) {
    console.error('Analysis Error:', error.message);
    res.status(500).json({ 
      error: 'Failed to analyze code',
      details: error.response?.data || error.message
    });
  }
});

// Generate AI fixes for code
app.post('/fix', async (req, res) => {
  try {
    const { code, issues, filename, language } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    const issuesText = issues ? issues.map(issue => 
      `- Line ${issue.line}: ${issue.message} (${issue.type})`
    ).join('\n') : 'General code improvement';

    const prompt = `Fix the following ${language || 'code'} file (${filename || 'unknown'}) based on these identified issues:

Issues to fix:
${issuesText}

Original code:
\`\`\`${language || 'javascript'}
${code}
\`\`\`

Please provide:
1. The complete fixed code
2. A summary of changes made
3. Explanation of each fix

Format your response as JSON:
{
  "fixedCode": "complete fixed code here",
  "changes": [
    {
      "line": 15,
      "original": "original code",
      "fixed": "fixed code",
      "explanation": "why this was changed"
    }
  ],
  "summary": "Overall summary of fixes applied",
  "improvementScore": "improvement score 0-100",
  "securityImprovements": ["security improvements made"],
  "performanceImprovements": ["performance improvements made"]
}`;

    const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model: OLLAMA_MODEL,
      prompt,
      stream: false
    });

    // Try to parse JSON response
    let fixResult;
    try {
      fixResult = JSON.parse(response.data.response);
    } catch (parseError) {
      // Fallback if JSON parsing fails
      fixResult = {
        fixedCode: response.data.response,
        changes: [],
        summary: 'AI-generated fix (raw response)',
        rawResponse: response.data.response
      };
    }

    res.json({
      fix: fixResult,
      filename,
      language,
      model: OLLAMA_MODEL
    });
  } catch (error) {
    console.error('Fix Error:', error.message);
    res.status(500).json({ 
      error: 'Failed to generate fixes',
      details: error.response?.data || error.message
    });
  }
});

// Batch analyze multiple files
app.post('/analyze-batch', async (req, res) => {
  try {
    const { files } = req.body;
    
    if (!files || !Array.isArray(files)) {
      return res.status(400).json({ error: 'Files array is required' });
    }

    const results = [];
    
    for (const file of files.slice(0, 10)) { // Limit to 10 files to prevent overload
      try {
        const analysisResponse = await axios.post(`http://localhost:${PORT}/analyze`, {
          code: file.content,
          filename: file.filename,
          language: file.language
        });
        
        results.push({
          filename: file.filename,
          success: true,
          analysis: analysisResponse.data.analysis
        });
      } catch (error) {
        results.push({
          filename: file.filename,
          success: false,
          error: error.message
        });
      }
    }

    res.json({ results, model: OLLAMA_MODEL });
  } catch (error) {
    console.error('Batch Analysis Error:', error.message);
    res.status(500).json({ 
      error: 'Failed to perform batch analysis',
      details: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Ollama API server running at http://localhost:${PORT}`);
  console.log(`📡 Connected to Ollama at ${OLLAMA_URL}`);
  console.log(`🤖 Using model: ${OLLAMA_MODEL}`);
  console.log(`🔧 Enhanced with LLM-powered analysis capabilities`);
});

module.exports = app;