// AI Configuration and validation
export interface AIConfig {
  openaiApiKey?: string;
  anthropicApiKey?: string;
  preferredModel: 'openai' | 'anthropic';
  maxTokens: number;
  temperature: number;
}

export function getAIConfig(): AIConfig {
  const config: AIConfig = {
    preferredModel: 'anthropic', // Default to Claude for better reasoning
    maxTokens: 4000,
    temperature: 0.7
  };

  // Check for API keys
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (openaiKey && openaiKey !== 'your_openai_api_key_here') {
    config.openaiApiKey = openaiKey;
  }

  if (anthropicKey && anthropicKey !== 'your_anthropic_api_key_here') {
    config.anthropicApiKey = anthropicKey;
  }

  // Fallback to OpenAI if Anthropic is not available
  if (!config.anthropicApiKey && config.openaiApiKey) {
    config.preferredModel = 'openai';
  }

  return config;
}

export function validateAIConfig(): { isValid: boolean; errors: string[] } {
  const config = getAIConfig();
  const errors: string[] = [];

  if (!config.openaiApiKey && !config.anthropicApiKey) {
    errors.push('No AI API keys configured. Please set OPENAI_API_KEY or ANTHROPIC_API_KEY');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function getAvailableModels(): Array<{ provider: 'openai' | 'anthropic'; model: string; available: boolean }> {
  const config = getAIConfig();

  return [
    {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      available: !!config.anthropicApiKey
    },
    {
      provider: 'openai',
      model: 'gpt-4o',
      available: !!config.openaiApiKey
    }
  ];
}