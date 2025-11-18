import { createSupabaseServerClient } from './supabase-server';
import { aiService } from './ai-service';
import { ViralityAnalysisInput, ViralityPackGeneration } from './ai-service';
import { updateProductContainerStatus } from './product-service';
import { ViralityPack, ProductContainer, PainPoint, DelightFactor } from '@/types/product';

export interface AngleReasoningResult {
  success: boolean;
  virality_packs?: ViralityPack[];
  error?: string;
}

export class AngleReasoningService {
  private async getSupabase() {
    return createSupabaseServerClient();
  }

  // Start the angle reasoning process for a product container
  async startAngleReasoning(productContainerId: string): Promise<boolean> {
    try {
      console.log(`Starting angle reasoning for container ${productContainerId}`);

      // Update status to analyzing
      await updateProductContainerStatus(productContainerId, 'analyzing');

      const supabase = await this.getSupabase();

      // Get the product container and related data
      const { data: container, error: containerError } = await supabase
        .from('product_containers')
        .select('*')
        .eq('id', productContainerId)
        .single();

      if (containerError || !container) {
        throw new Error('Product container not found');
      }

      // Get pain points and delight factors
      const [painPointsResult, delightFactorsResult] = await Promise.all([
        supabase
          .from('pain_points')
          .select('*')
          .eq('product_container_id', productContainerId)
          .order('mentions', { ascending: false }),

        supabase
          .from('delight_factors')
          .select('*')
          .eq('product_container_id', productContainerId)
          .order('mentions', { ascending: false })
      ]);

      if (painPointsResult.error || delightFactorsResult.error) {
        throw new Error('Failed to fetch insights data');
      }

      const painPoints = painPointsResult.data || [];
      const delightFactors = delightFactorsResult.data || [];

      // Check if we have enough data to analyze
      if (painPoints.length === 0 && delightFactors.length === 0) {
        throw new Error('Insufficient customer data to generate insights');
      }

      // Prepare input for AI analysis
      const analysisInput: ViralityAnalysisInput = {
        product_name: container.product_name || 'Unknown Product',
        product_description: container.product_description || '',
        pain_points: painPoints as PainPoint[],
        delight_factors: delightFactors as DelightFactor[],
        platform: container.platform,
        target_audience: this.inferTargetAudience(container, painPoints, delightFactors)
      };

      // Generate virality packs using AI
      const aiAnalysis = await aiService.generateViralityPacks(analysisInput);

      // Store virality packs in database
      await this.storeViralityPacks(productContainerId, aiAnalysis.virality_packs);

      // Update container status to completed
      await updateProductContainerStatus(
        productContainerId,
        'completed',
        undefined,
        {
          analysis_job_id: crypto.randomUUID()
        }
      );

      console.log(`Completed angle reasoning for container ${productContainerId}, generated ${aiAnalysis.virality_packs.length} virality packs`);

      return true;

    } catch (error) {
      console.error(`Angle reasoning failed for container ${productContainerId}:`, error);
      await updateProductContainerStatus(
        productContainerId,
        'failed',
        error instanceof Error ? error.message : 'Angle reasoning failed'
      );
      return false;
    }
  }

  // Infer target audience based on product and insights
  private inferTargetAudience(
    container: ProductContainer,
    painPoints: PainPoint[],
    delightFactors: DelightFactor[]
  ): string {
    // Simple audience inference based on product type and review themes
    const productThemes = [
      ...painPoints.map(p => p.theme),
      ...delightFactors.map(d => d.theme)
    ].join(' ').toLowerCase();

    if (productThemes.includes('health') || productThemes.includes('wellness') || productThemes.includes('fitness')) {
      return 'Health-conscious individuals looking to improve their wellness';
    } else if (productThemes.includes('beauty') || productThemes.includes('skin') || productThemes.includes('makeup')) {
      return 'Beauty enthusiasts seeking effective skincare solutions';
    } else if (productThemes.includes('tech') || productThemes.includes('gadget') || productThemes.includes('electronic')) {
      return 'Tech-savvy consumers interested in innovative gadgets';
    } else if (productThemes.includes('fitness') || productThemes.includes('workout') || productThemes.includes('gym')) {
      return 'Fitness enthusiasts and gym-goers';
    } else if (productThemes.includes('home') || productThemes.includes('kitchen') || productThemes.includes('decor')) {
      return 'Homeowners interested in lifestyle improvements';
    } else {
      return 'General consumers looking for quality products';
    }
  }

  // Store generated virality packs in the database
  private async storeViralityPacks(
    productContainerId: string,
    viralityPacks: ViralityPackGeneration[]
  ): Promise<void> {
    try {
      const supabase = await this.getSupabase();
      
      // Clear existing virality packs for this container
      await supabase
        .from('virality_packs')
        .delete()
        .eq('product_container_id', productContainerId);

      // Insert new virality packs
      const packsToInsert = viralityPacks.map((pack, index) => ({
        product_container_id: productContainerId,
        angle_name: pack.angle_name,
        core_angle: pack.core_angle,
        hook_options: pack.hook_options,
        full_script: pack.full_script,
        visual_pacing_notes: pack.visual_pacing_notes,
        audio_suggestion: pack.audio_suggestion,
        sentiment_score: pack.sentiment_score,
        virality_score: pack.virality_score
      }));

      const { error } = await supabase
        .from('virality_packs')
        .insert(packsToInsert);

      if (error) {
        throw new Error(`Failed to store virality packs: ${error.message}`);
      }

      console.log(`Stored ${viralityPacks.length} virality packs for container ${productContainerId}`);

    } catch (error) {
      console.error('Error storing virality packs:', error);
      throw error;
    }
  }

  // Get virality packs for a product container
  async getViralityPacks(productContainerId: string): Promise<ViralityPack[]> {
    try {
      const supabase = await this.getSupabase();
      const { data, error } = await supabase
        .from('virality_packs')
        .select('*')
        .eq('product_container_id', productContainerId)
        .order('virality_score', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch virality packs: ${error.message}`);
      }

      return data as ViralityPack[];

    } catch (error) {
      console.error('Error fetching virality packs:', error);
      return [];
    }
  }

  // Regenerate virality packs with different parameters
  async regenerateViralityPacks(
    productContainerId: string,
    options?: {
      focus_areas?: string[];
      tone?: 'humorous' | 'serious' | 'educational' | 'inspirational';
      target_length?: 'short' | 'medium' | 'long';
    }
  ): Promise<boolean> {
    try {
      console.log(`Regenerating virality packs for container ${productContainerId}`);

      const supabase = await this.getSupabase();

      // Get the product container and related data
      const { data: container } = await supabase
        .from('product_containers')
        .select('*')
        .eq('id', productContainerId)
        .single();

      if (!container) {
        throw new Error('Product container not found');
      }

      // Get pain points and delight factors
      const [painPointsResult, delightFactorsResult] = await Promise.all([
        supabase
          .from('pain_points')
          .select('*')
          .eq('product_container_id', productContainerId),

        supabase
          .from('delight_factors')
          .select('*')
          .eq('product_container_id', productContainerId)
      ]);

      const painPoints = painPointsResult.data || [];
      const delightFactors = delightFactorsResult.data || [];

      // Filter data based on focus areas if provided
      let filteredPainPoints = painPoints;
      let filteredDelightFactors = delightFactors;

      if (options?.focus_areas && options.focus_areas.length > 0) {
        filteredPainPoints = painPoints.filter(pp =>
          options.focus_areas!.some(area => pp.theme.toLowerCase().includes(area.toLowerCase()))
        );
        filteredDelightFactors = delightFactors.filter(df =>
          options.focus_areas!.some(area => df.theme.toLowerCase().includes(area.toLowerCase()))
        );
      }

      // Prepare enhanced input for AI analysis
      const analysisInput: ViralityAnalysisInput = {
        product_name: container.product_name || 'Unknown Product',
        product_description: container.product_description || '',
        pain_points: filteredPainPoints as PainPoint[],
        delight_factors: filteredDelightFactors as DelightFactor[],
        platform: container.platform,
        target_audience: this.inferTargetAudience(container, painPoints, delightFactors)
      };

      // Add custom instructions to the prompt based on options
      let customInstructions = '';
      if (options?.tone) {
        customInstructions += `\nTONE: Make the content ${options.tone}. `;
      }
      if (options?.target_length) {
        const lengthGuidance = {
          short: 'Keep scripts under 15 seconds',
          medium: 'Aim for 15-25 seconds',
          long: 'Make scripts 25-35 seconds'
        };
        customInstructions += `\nLENGTH: ${lengthGuidance[options.target_length]}. `;
      }

      // Generate new virality packs with custom instructions
      const aiAnalysis = await aiService.generateViralityPacks(analysisInput);

      // Store the new virality packs
      await this.storeViralityPacks(productContainerId, aiAnalysis.virality_packs);

      console.log(`Regenerated ${aiAnalysis.virality_packs.length} virality packs for container ${productContainerId}`);

      return true;

    } catch (error) {
      console.error(`Failed to regenerate virality packs for container ${productContainerId}:`, error);
      return false;
    }
  }

  // Get analytics summary for virality packs
  async getViralityAnalytics(productContainerId: string): Promise<{
    total_packs: number;
    average_sentiment_score: number;
    average_virality_score: number;
    top_performing_angles: string[];
    sentiment_distribution: {
      positive: number;
      neutral: number;
      negative: number;
    };
  }> {
    try {
      const supabase = await this.getSupabase();
      const { data: packs } = await supabase
        .from('virality_packs')
        .select('angle_name, sentiment_score, virality_score')
        .eq('product_container_id', productContainerId);

      if (!packs || packs.length === 0) {
        return {
          total_packs: 0,
          average_sentiment_score: 0,
          average_virality_score: 0,
          top_performing_angles: [],
          sentiment_distribution: { positive: 0, neutral: 0, negative: 0 }
        };
      }

      const totalPacks = packs.length;
      const avgSentiment = packs.reduce((sum, pack) => sum + (pack.sentiment_score || 0), 0) / totalPacks;
      const avgVirality = packs.reduce((sum, pack) => sum + (pack.virality_score || 0), 0) / totalPacks;

      const topAngles = packs
        .sort((a, b) => (b.virality_score || 0) - (a.virality_score || 0))
        .slice(0, 3)
        .map(pack => pack.angle_name);

      const sentimentDistribution = packs.reduce(
        (acc, pack) => {
          const sentiment = pack.sentiment_score || 0;
          if (sentiment > 0.1) acc.positive++;
          else if (sentiment < -0.1) acc.negative++;
          else acc.neutral++;
          return acc;
        },
        { positive: 0, neutral: 0, negative: 0 }
      );

      return {
        total_packs: totalPacks,
        average_sentiment_score: avgSentiment,
        average_virality_score: avgVirality,
        top_performing_angles: topAngles,
        sentiment_distribution: sentimentDistribution
      };

    } catch (error) {
      console.error('Error generating virality analytics:', error);
      return {
        total_packs: 0,
        average_sentiment_score: 0,
        average_virality_score: 0,
        top_performing_angles: [],
        sentiment_distribution: { positive: 0, neutral: 0, negative: 0 }
      };
    }
  }
}

// Singleton instance
export const angleReasoningService = new AngleReasoningService();