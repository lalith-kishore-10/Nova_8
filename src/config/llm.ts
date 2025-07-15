export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'local';
  apiKey: string;
  model: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
}

export const getLLMConfig = (): LLMConfig => {
  const provider = (import.meta.env.VITE_LLM_PROVIDER || 'openai') as LLMConfig['provider'];
  
  const configs: Record<string, Partial<LLMConfig>> = {
    openai: {
      apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
      model: import.meta.env.VITE_LLM_MODEL || 'gpt-4',
      baseUrl: 'https://api.openai.com/v1',
      maxTokens: 4000,
      temperature: 0.1
    },
    anthropic: {
      apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY || '',
      model: import.meta.env.VITE_LLM_MODEL || 'claude-3-sonnet-20240229',
      baseUrl: 'https://api.anthropic.com/v1',
      maxTokens: 4000,
      temperature: 0.1
    },
    local: {
      apiKey: '',
      model: 'llama2',
      baseUrl: 'http://localhost:11434/v1',
      maxTokens: 4000,
      temperature: 0.1
    }
  };

  return {
    provider,
    ...configs[provider],
    apiKey: configs[provider].apiKey || '',
    model: configs[provider].model || 'gpt-4'
  } as LLMConfig;
};

export const isLLMConfigured = (): boolean => {
  const config = getLLMConfig();
  return config.provider !== 'local' ? !!config.apiKey : true;
};