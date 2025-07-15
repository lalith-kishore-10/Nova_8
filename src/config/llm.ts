export interface LLMConfig {
  provider: 'huggingface';
  apiKey: string;
  model: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
}

export const getLLMConfig = (): LLMConfig => {
  return {
    provider: 'huggingface',
    apiKey: import.meta.env.VITE_HUGGINGFACE_API_KEY || '',
    model: import.meta.env.VITE_LLM_MODEL || 'HuggingFaceH4/zephyr-7b-beta',
    baseUrl: 'https://api-inference.huggingface.co',
    maxTokens: 4000,
    temperature: 0.1
  };
};

export const isLLMConfigured = (): boolean => {
  const config = getLLMConfig();
  return !!config.apiKey;
};