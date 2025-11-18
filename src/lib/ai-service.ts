import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { ViralityPack, PainPoint, DelightFactor } from '@/types/product';
import { getAIConfig, validateAIConfig } from './ai-config';

// Types for AI generation
export interface ViralityAnalysisInput {
  product_name: string;
  product_description: string;
  pain_points: PainPoint[];
  delight_factors: DelightFactor[];
  platform: string;
  target_audience?: string;
}

export interface ViralityPackGeneration {
  angle_name: string;
  core_angle: string;
  hook_options: string[];
  full_script: string;
  visual_pacing_notes: string;
  audio_suggestion: string;
  sentiment_score: number;
  virality_score: number;
}

export interface ViralityAnalysisOutput {
  overall_sentiment_score: number;
  overall_virality_potential: number;
  key_insights: string[];
  virality_packs: ViralityPackGeneration[];
  recommendations: string[];
}

export class AIService {
  private model: 'openai' | 'anthropic';

  constructor(model?: 'openai' | 'anthropic') {
    const config = getAIConfig();
    const validation = validateAIConfig();

    if (!validation.isValid) {
      console.warn('AI configuration invalid:', validation.errors);
    }

    // Use provided model or fall back to configuration
    this.model = model || config.preferredModel;

    // Validate that the selected model is available
    if (this.model === 'openai' && !config.openaiApiKey) {
      console.warn('OpenAI API key not configured, falling back to Anthropic');
      this.model = 'anthropic';
    } else if (this.model === 'anthropic' && !config.anthropicApiKey) {
      console.warn('Anthropic API key not configured, falling back to OpenAI');
      this.model = 'openai';
    }
  }

  // Get the AI model instance
  private getModel() {
    try {
      switch (this.model) {
        case 'openai':
          return openai('gpt-4o');
        case 'anthropic':
          return anthropic('claude-3-5-sonnet-20241022');
        default:
          // Fallback to any available model
          const config = getAIConfig();
          if (config.anthropicApiKey) {
            return anthropic('claude-3-5-sonnet-20241022');
          } else if (config.openaiApiKey) {
            return openai('gpt-4o');
          } else {
            throw new Error('No AI models available - check API key configuration');
          }
      }
    } catch (error) {
      console.error('Error getting AI model:', error);
      throw new Error('Failed to initialize AI model - check configuration');
    }
  }

  // Generate virality packs based on product insights
  async generateViralityPacks(input: ViralityAnalysisInput): Promise<ViralityAnalysisOutput> {
    try {
      const model = this.getModel();

      // Prepare the prompt for AI analysis
      const prompt = this.buildViralityAnalysisPrompt(input);

      const result = await generateText({
        model,
        prompt,
        temperature: 0.7,
        maxTokens: 4000,
      });

      // Parse the AI response
      const analysis = this.parseViralityAnalysis(result.text);

      // Generate additional virality packs with different angles
      const additionalPacks = await this.generateAdditionalPacks(input, analysis.virality_packs);
      analysis.virality_packs.push(...additionalPacks);

      return analysis;

    } catch (error) {
      console.error('Error generating virality packs:', error);
      throw new Error('Failed to generate AI-powered virality insights');
    }
  }

  // Build the comprehensive prompt for virality analysis
  private buildViralityAnalysisPrompt(input: ViralityAnalysisInput): string {
    const { product_name, product_description, pain_points, delight_factors, platform } = input;

    // Format pain points and delight factors for the prompt
    const formattedPainPoints = pain_points
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 5)
      .map(pp => `- ${pp.theme} (sentiment: ${pp.sentiment.toFixed(2)}, ${pp.mentions} mentions): ${pp.example_quotes.slice(0, 2).join('; ')}`)
      .join('\n');

    const formattedDelightFactors = delight_factors
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 5)
      .map(df => `- ${df.theme} (sentiment: ${df.sentiment.toFixed(2)}, ${df.mentions} mentions): ${df.example_quotes.slice(0, 2).join('; ')}`)
      .join('\n');

    return `You are an expert TikTok content strategist and viral marketing specialist. Your task is to analyze product data and create data-driven virality strategies.

PRODUCT INFORMATION:
- Name: ${product_name}
- Description: ${product_description}
- Platform: ${platform}

CUSTOMER PAIN POINTS (from real reviews):
${formattedPainPoints}

CUSTOMER DELIGHT FACTORS (from real reviews):
${formattedDelightFactors}

TASK: Generate a comprehensive virality analysis and creative angles.

Please respond with a JSON object containing:
1. overall_sentiment_score (number from -1 to 1)
2. overall_virality_potential (number from 0 to 1)
3. key_insights (array of 3-5 strategic insights)
4. virality_packs (array of 3-5 virality packs)
5. recommendations (array of 3-5 strategic recommendations)

Each virality_pack should include:
- angle_name (catchy name for the angle)
- core_angle (the strategic insight driving this angle)
- hook_options (array of 3 different hook variations)
- full_script (complete 15-30 second TikTok script)
- visual_pacing_notes (specific visual direction and timing)
- audio_suggestion (type of audio or specific sound suggestion)
- sentiment_score (number from -1 to 1)
- virality_score (number from 0 to 1)

GUIDELINES:
- Focus on angles that create contrast between pain points and delight factors
- Scripts should be 15-30 seconds when read aloud
- Include specific visual cues and transitions
- Suggest trending audio types that fit the mood
- Ensure content is "compliant but edgy"
- Focus on authentic, relatable storytelling
- Include clear calls-to-action that feel natural

Example format:
{
  "overall_sentiment_score": 0.23,
  "overall_virality_potential": 0.75,
  "key_insights": ["People love the energy boost but hate the taste"],
  "virality_packs": [
    {
      "angle_name": "Taste Test Transformation",
      "core_angle": "Contrast the dreaded taste experience with surprising energy benefits",
      "hook_options": ["Stop choking down nasty greens powders...", "I finally found a greens powder that doesn't taste like dirt...", "Your daily greens routine is about to change..."],
      "full_script": "Stop choking down nasty greens powders that taste like grass clippings... [quick cut to face] I found this one that actually tastes like vanilla and gives me energy ALL DAY... [show energy burst] ... Link in bio if you want to actually enjoy your daily greens! #greens #energy #health",
      "visual_pacing_notes": "0-2s: disgusted face with old powder; 2-3s: quick transition; 3-8s: energetic movement; 8-10s: product reveal; 10-15s: call to action",
      "audio_suggestion": "Upbeat trending sound with build-up beat drop at 3s mark",
      "sentiment_score": 0.4,
      "virality_score": 0.8
    }
  ],
  "recommendations": ["Focus on taste-first messaging", "Use before/after format", "Partner with fitness creators"]
}

Please provide your analysis in valid JSON format:`;
  }

  // Parse the AI response into structured output
  private parseViralityAnalysis(response: string): ViralityAnalysisOutput {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate and set defaults
      return {
        overall_sentiment_score: this.ensureNumber(parsed.overall_sentiment_score, 0),
        overall_virality_potential: this.ensureNumber(parsed.overall_virality_potential, 0.5),
        key_insights: Array.isArray(parsed.key_insights) ? parsed.key_insights : [],
        virality_packs: Array.isArray(parsed.virality_packs) ? parsed.virality_packs.map(this.validateViralityPack) : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : []
      };

    } catch (error) {
      console.error('Error parsing AI response:', error);
      // Return fallback analysis
      return this.getFallbackAnalysis();
    }
  }

  // Validate and sanitize virality pack data
  private validateViralityPack(pack: any): ViralityPackGeneration {
    return {
      angle_name: String(pack.angle_name || 'Untitled Angle'),
      core_angle: String(pack.core_angle || 'Focus on product benefits'),
      hook_options: Array.isArray(pack.hook_options) ? pack.hook_options.map(String) : ['Try this amazing product!'],
      full_script: String(pack.full_script || 'This product is amazing! You should try it. Link in bio!'),
      visual_pacing_notes: String(pack.visual_pacing_notes || 'Show product, speak to camera, call to action'),
      audio_suggestion: String(pack.audio_suggestion || 'Upbeat trending audio'),
      sentiment_score: this.ensureNumber(pack.sentiment_score, 0),
      virality_score: this.ensureNumber(pack.virality_score, 0.5)
    };
  }

  // Generate additional virality packs with different angles
  private async generateAdditionalPacks(
    input: ViralityAnalysisInput,
    existingPacks: ViralityPackGeneration[]
  ): Promise<ViralityPackGeneration[]> {
    if (existingPacks.length >= 5) return []; // We already have enough packs

    try {
      const model = this.getModel();

      // Extract existing angles to avoid duplicates
      const existingAngles = existingPacks.map(p => p.angle_name.toLowerCase());

      const additionalPrompt = `Generate 2-3 more virality packs for this product, focusing on DIFFERENT angles than these existing ones:
${existingPacks.map(p => `- ${p.angle_name}: ${p.core_angle}`).join('\n')}

Product: ${input.product_name}
Description: ${input.product_description}

Focus on these remaining pain points:
${input.pain_points.filter(pp => !existingAngles.some(angle => pp.theme.toLowerCase().includes(angle))).slice(0, 3).map(pp => `- ${pp.theme}`).join('\n')}

And these delight factors:
${input.delight_factors.filter(df => !existingAngles.some(angle => df.theme.toLowerCase().includes(angle))).slice(0, 3).map(df => `- ${df.theme}`).join('\n')}

Provide only the virality_packs array in JSON format:`;

      const result = await generateText({
        model,
        prompt: additionalPrompt,
        temperature: 0.8,
        maxTokens: 2000,
      });

      try {
        const jsonMatch = result.text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const additionalPacks = JSON.parse(jsonMatch[0]);
          return Array.isArray(additionalPacks) ? additionalPacks.map(this.validateViralityPack) : [];
        }
      } catch (parseError) {
        console.error('Error parsing additional packs:', parseError);
      }

      return [];

    } catch (error) {
      console.error('Error generating additional packs:', error);
      return [];
    }
  }

  // Ensure a value is a number within expected range
  private ensureNumber(value: any, defaultValue: number, min: number = -1, max: number = 1): number {
    const num = Number(value);
    if (isNaN(num)) return defaultValue;
    return Math.max(min, Math.min(max, num));
  }

  // Get fallback analysis if AI fails
  private getFallbackAnalysis(): ViralityAnalysisOutput {
    return {
      overall_sentiment_score: 0.2,
      overall_virality_potential: 0.6,
      key_insights: [
        'Product has mixed customer reviews',
        'Focus on addressing common pain points',
        'Highlight unique value proposition'
      ],
      virality_packs: [
        {
          angle_name: 'Problem-Solution',
          core_angle: 'Address common customer pain points with your product as the solution',
          hook_options: [
            'Tired of dealing with [common problem]?',
            'Finally found a solution for [problem]',
            'This changed everything for me...'
          ],
          full_script: 'Stop struggling with [pain point]... I found this product that actually works! [show product] It helped me [benefit] and now I can\'t imagine life without it. Link in bio to try it yourself! #[relevant_hashtags]',
          visual_pacing_notes: '0-3s: show pain point; 3-5s: reveal product; 5-12s: demonstrate benefits; 12-15s: call to action',
          audio_suggestion: 'Problem-solving trending audio',
          sentiment_score: 0.3,
          virality_score: 0.6
        }
      ],
      recommendations: [
        'Focus on authentic testimonials',
        'Show before/after results',
        'Use trending audio formats',
        'Keep content under 30 seconds',
        'Include clear call-to-action'
      ]
    };
  }

  // Analyze virality patterns from successful content (placeholder for future implementation)
  async analyzeViralityPatterns(videos: any[]): Promise<any> {
    // This would analyze viral video patterns from TikTok
    // For now, return basic pattern analysis
    return {
      common_hooks: ['Problem-solution', 'Transformation', 'Surprising reveal'],
      optimal_length: '15-25 seconds',
      trending_formats: ['Storytelling', 'Tutorial', 'Comparison'],
      audio_trends: ['Upbeat transitions', 'Problem-solving beats', 'Emotional build-ups']
    };
  }

  // Generate compliance checks (placeholder for future implementation)
  async checkCompliance(script: string, platform: string): Promise<any> {
    // This would check scripts against platform guidelines
    return {
      compliance_score: 0.9,
      flagged_terms: [],
      suggestions: ['Ensure all claims are truthful', 'Include necessary disclosures']
    };
  }
}

// Singleton instances for different models
export const aiService = new AIService('anthropic');
export const openaiService = new AIService('openai');