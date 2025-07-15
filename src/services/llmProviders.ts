import { LLMConfig } from '../config/llm';

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMProvider {
  generateResponse(prompt: string): Promise<LLMResponse>;
}

export class HuggingFaceProvider implements LLMProvider {
  constructor(private config: LLMConfig) {}

  async generateResponse(prompt: string): Promise<LLMResponse> {
    const modelUrl = `${this.config.baseUrl}/${this.config.model}`;
    
    // Format prompt for DeepSeek Coder
    const formattedPrompt = `### Instruction:
You are a senior software engineer and tech stack analyst. Analyze the provided repository information and provide detailed, accurate analysis in a structured format.

### Input:
${prompt}

### Response:`;

    const response = await fetch(modelUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: formattedPrompt,
        parameters: {
          max_new_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
          do_sample: true,
          top_p: 0.95,
          repetition_penalty: 1.1,
          return_full_text: false,
          stop: ["### Input:", "### Instruction:"]
        },
        options: {
          wait_for_model: true,
          use_cache: false
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 503) {
        throw new Error('Model is loading, please try again in a few moments');
      }
      if (response.status === 401) {
        throw new Error('Invalid Hugging Face API key. Please check your configuration.');
      }
      throw new Error(`Hugging Face API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Handle different response formats
    let content = '';
    if (Array.isArray(data) && data.length > 0) {
      content = data[0].generated_text || '';
    } else if (data.generated_text) {
      content = data.generated_text;
    } else {
      throw new Error('Unexpected response format from Hugging Face API');
    }

    return {
      content: content.trim(),
      usage: {
        promptTokens: Math.ceil(formattedPrompt.length / 4),
        completionTokens: Math.ceil(content.length / 4),
        totalTokens: Math.ceil((formattedPrompt.length + content.length) / 4)
      }
    };
  }
}

export const createLLMProvider = (config: LLMConfig): LLMProvider => {
  return new HuggingFaceProvider(config);
};