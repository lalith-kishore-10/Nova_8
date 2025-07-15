interface TechStackAnalysis {
  languages: string[];
  frameworks: string[];
  libraries: string[];
  tools: string[];
  databases: string[];
  deployment: string[];
  confidence: number;
}

interface DependencyAnalysis {
  dependencies: {
    name: string;
    version?: string;
    type: 'runtime' | 'dev' | 'peer';
    description?: string;
  }[];
  packageManager: string;
  totalDependencies: number;
}

interface RepositoryAnalysis {
  techStack: TechStackAnalysis;
  dependencies: DependencyAnalysis;
  summary: string;
  recommendations: string[];
}

class LLMAnalysisService {
  private apiKey: string;
  private model: string;
  private baseUrl = 'https://api-inference.huggingface.co/models';

  constructor() {
    this.apiKey = import.meta.env.VITE_HUGGINGFACE_API_KEY;
    this.model = import.meta.env.VITE_LLM_MODEL || 'deepseek-ai/deepseek-coder-6.7b-instruct';
    
    if (!this.apiKey) {
      throw new Error('Hugging Face API key not configured. Please set VITE_HUGGINGFACE_API_KEY in your environment variables.');
    }
  }

  private async callLLM(prompt: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/${this.model}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 1000,
          temperature: 0.1,
          return_full_text: false,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Hugging Face API error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    
    if (Array.isArray(data) && data[0]?.generated_text) {
      return data[0].generated_text;
    } else if (data.generated_text) {
      return data.generated_text;
    } else {
      throw new Error('Unexpected response format from Hugging Face API');
    }
  }

  private async analyzeTechStack(files: { name: string; content?: string; path: string }[]): Promise<TechStackAnalysis> {
    const fileList = files.map(f => `${f.path} (${f.name})`).join('\n');
    const sampleContent = files
      .filter(f => f.content && f.content.length < 2000)
      .slice(0, 5)
      .map(f => `File: ${f.path}\n${f.content?.substring(0, 500)}...`)
      .join('\n\n');

    const prompt = `Analyze this repository and identify the tech stack. Based on the file structure and sample code, provide a JSON response with the following structure:

{
  "languages": ["list of programming languages"],
  "frameworks": ["list of frameworks"],
  "libraries": ["list of major libraries"],
  "tools": ["list of build tools, bundlers, etc."],
  "databases": ["list of databases if any"],
  "deployment": ["list of deployment platforms/tools"],
  "confidence": 0.95
}

File structure:
${fileList}

Sample code content:
${sampleContent}

Respond only with valid JSON:`;

    try {
      const response = await this.callLLM(prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No valid JSON found in response');
    } catch (error) {
      console.error('Tech stack analysis failed:', error);
      return {
        languages: [],
        frameworks: [],
        libraries: [],
        tools: [],
        databases: [],
        deployment: [],
        confidence: 0
      };
    }
  }

  private async analyzeDependencies(files: { name: string; content?: string; path: string }[]): Promise<DependencyAnalysis> {
    // Find package files
    const packageFiles = files.filter(f => 
      ['package.json', 'requirements.txt', 'Gemfile', 'composer.json', 'pom.xml', 'build.gradle', 'Cargo.toml', 'go.mod'].includes(f.name)
    );

    if (packageFiles.length === 0) {
      return {
        dependencies: [],
        packageManager: 'unknown',
        totalDependencies: 0
      };
    }

    const packageContent = packageFiles
      .map(f => `File: ${f.name}\n${f.content || 'Content not available'}`)
      .join('\n\n');

    const prompt = `Analyze the following package/dependency files and extract dependency information. Provide a JSON response with this structure:

{
  "dependencies": [
    {
      "name": "dependency-name",
      "version": "version-if-available",
      "type": "runtime|dev|peer",
      "description": "brief description if known"
    }
  ],
  "packageManager": "npm|yarn|pip|composer|maven|gradle|cargo|go",
  "totalDependencies": 0
}

Package files:
${packageContent}

Focus on the main dependencies and provide accurate information. Respond only with valid JSON:`;

    try {
      const response = await this.callLLM(prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No valid JSON found in response');
    } catch (error) {
      console.error('Dependency analysis failed:', error);
      return {
        dependencies: [],
        packageManager: 'unknown',
        totalDependencies: 0
      };
    }
  }

  private async generateSummary(techStack: TechStackAnalysis, dependencies: DependencyAnalysis): Promise<{ summary: string; recommendations: string[] }> {
    const prompt = `Based on this tech stack and dependency analysis, provide a brief summary and recommendations:

Tech Stack:
- Languages: ${techStack.languages.join(', ')}
- Frameworks: ${techStack.frameworks.join(', ')}
- Libraries: ${techStack.libraries.join(', ')}
- Tools: ${techStack.tools.join(', ')}

Dependencies:
- Package Manager: ${dependencies.packageManager}
- Total Dependencies: ${dependencies.totalDependencies}
- Key Dependencies: ${dependencies.dependencies.slice(0, 5).map(d => d.name).join(', ')}

Provide a JSON response:
{
  "summary": "Brief 2-3 sentence summary of the project's tech stack",
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"]
}

Respond only with valid JSON:`;

    try {
      const response = await this.callLLM(prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No valid JSON found in response');
    } catch (error) {
      console.error('Summary generation failed:', error);
      return {
        summary: 'Unable to generate summary',
        recommendations: []
      };
    }
  }

  async analyzeRepository(files: { name: string; content?: string; path: string }[]): Promise<RepositoryAnalysis> {
    try {
      const [techStack, dependencies] = await Promise.all([
        this.analyzeTechStack(files),
        this.analyzeDependencies(files)
      ]);

      const { summary, recommendations } = await this.generateSummary(techStack, dependencies);

      return {
        techStack,
        dependencies,
        summary,
        recommendations
      };
    } catch (error) {
      console.error('Repository analysis failed:', error);
      throw error;
    }
  }
}

export const llmAnalysisService = new LLMAnalysisService();
export type { RepositoryAnalysis, TechStackAnalysis, DependencyAnalysis };