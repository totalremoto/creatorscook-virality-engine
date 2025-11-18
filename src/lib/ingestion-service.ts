import { createSupabaseServerClient } from './supabase-server';
import { scrapingManager, ScrapingResult, ScrapedReviewData } from './scraping-service';
import { updateProductContainerStatus } from './product-service';
import { angleReasoningService } from './angle-reasoning-service';

// Types for ingestion jobs
export interface IngestionJob {
  id: string;
  product_container_id: string;
  product_url: string;
  status: 'pending' | 'scraping' | 'processing' | 'completed' | 'failed';
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  scraped_data?: ScrapingResult;
}

// Process scraped reviews to extract pain points and delight factors
export interface ProcessedInsights {
  pain_points: Array<{
    theme: string;
    sentiment: number;
    mentions: number;
    example_quotes: string[];
  }>;
  delight_factors: Array<{
    theme: string;
    sentiment: number;
    mentions: number;
    example_quotes: string[];
  }>;
}

export class IngestionService {
  private async getSupabase() {
    return createSupabaseServerClient();
  }

  // Start the ingestion process for a product container
  async startIngestion(productContainerId: string, productUrl: string): Promise<string> {
    const jobId = crypto.randomUUID();

    // Update container status to scraping
    await updateProductContainerStatus(productContainerId, 'scraping', undefined, {
      scraping_job_id: jobId
    });

    // Start the ingestion process in the background
    this.processIngestionAsync(jobId, productContainerId, productUrl).catch(console.error);

    return jobId;
  }

  // Main ingestion process
  private async processIngestionAsync(
    jobId: string,
    productContainerId: string,
    productUrl: string
  ): Promise<void> {
    try {
      console.log(`Starting ingestion job ${jobId} for container ${productContainerId}`);

      // Step 1: Scrape the product
      await updateProductContainerStatus(productContainerId, 'scraping');
      const scrapingResult = await scrapingManager.scrapeProduct(productUrl);

      if (!scrapingResult.success) {
        await updateProductContainerStatus(
          productContainerId,
          'failed',
          scrapingResult.error
        );
        return;
      }

      // Step 2: Update product information
      await updateProductContainerStatus(productContainerId, 'analyzing', undefined, {
        product_name: scrapingResult.product_data?.name,
        product_description: scrapingResult.product_data?.description,
        product_image_url: scrapingResult.product_data?.images?.[0]
      });

      // Step 3: Process reviews and extract insights
      const insights = await this.processReviews(scrapingResult.reviews || []);

      // Step 4: Store insights in database
      await this.storeInsights(productContainerId, insights);

      // Step 5: Generate virality packs using Angle Reasoning Engine
      console.log(`Starting AI analysis for container ${productContainerId}`);
      const aiSuccess = await angleReasoningService.startAngleReasoning(productContainerId);

      if (!aiSuccess) {
        throw new Error('AI analysis failed during angle reasoning');
      }

      // Step 6: Mark as completed
      await updateProductContainerStatus(
        productContainerId,
        'completed',
        scrapingResult.warning
      );

      console.log(`Completed ingestion job ${jobId} for container ${productContainerId}`);

    } catch (error) {
      console.error(`Ingestion job ${jobId} failed:`, error);
      await updateProductContainerStatus(
        productContainerId,
        'failed',
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }

  // Process reviews to extract pain points and delight factors
  private async processReviews(reviews: ScrapedReviewData[]): Promise<ProcessedInsights> {
    const painPoints: Map<string, { sentiment: number; mentions: number; quotes: string[] }> = new Map();
    const delightFactors: Map<string, { sentiment: number; mentions: number; quotes: string[] }> = new Map();

    for (const review of reviews) {
      const rating = review.rating;
      const content = review.content.toLowerCase();
      const sentiment = this.calculateSentiment(rating);

      // Extract themes using keyword-based approach (simplified version)
      const themes = this.extractThemes(content);

      for (const theme of themes) {
        const quote = this.transformQuote(review.content, review.title);

        if (sentiment < 0) {
          // Pain point
          if (!painPoints.has(theme)) {
            painPoints.set(theme, { sentiment: 0, mentions: 0, quotes: [] });
          }
          const point = painPoints.get(theme)!;
          point.sentiment += sentiment;
          point.mentions += 1;
          point.quotes.push(quote);
        } else if (sentiment > 0.3) {
          // Delight factor
          if (!delightFactors.has(theme)) {
            delightFactors.set(theme, { sentiment: 0, mentions: 0, quotes: [] });
          }
          const factor = delightFactors.get(theme)!;
          factor.sentiment += sentiment;
          factor.mentions += 1;
          factor.quotes.push(quote);
        }
      }
    }

    // Convert to final format with average sentiment
    const processedPainPoints = Array.from(painPoints.entries())
      .map(([theme, data]) => ({
        theme,
        sentiment: data.sentiment / data.mentions,
        mentions: data.mentions,
        example_quotes: data.quotes.slice(0, 3) // Limit to 3 quotes
      }))
      .filter(p => p.mentions >= 1) // Only include themes with at least 1 mention
      .sort((a, b) => b.mentions - a.mentions);

    const processedDelightFactors = Array.from(delightFactors.entries())
      .map(([theme, data]) => ({
        theme,
        sentiment: data.sentiment / data.mentions,
        mentions: data.mentions,
        example_quotes: data.quotes.slice(0, 3) // Limit to 3 quotes
      }))
      .filter(d => d.mentions >= 1) // Only include themes with at least 1 mention
      .sort((a, b) => b.mentions - a.mentions);

    return {
      pain_points: processedPainPoints,
      delight_factors: processedDelightFactors
    };
  }

  // Calculate sentiment based on rating (1-5 scale)
  private calculateSentiment(rating: number): number {
    // Convert 1-5 rating to -1 to 1 scale
    return (rating - 3) / 2;
  }

  // Extract themes from review content (simplified keyword-based approach)
  private extractThemes(content: string): string[] {
    const themes: string[] = [];

    // Taste/Flavor related
    if (content.match(/taste|flavor|gross|delicious|yummy|awful|good|bad/i)) {
      themes.push('taste_quality');
    }

    // Price/Value related
    if (content.match(/price|cost|expensive|cheap|worth|value|money/i)) {
      themes.push('price_value');
    }

    // Effectiveness/Results related
    if (content.match(/work|result|effect|effective|useless|help|improve|better|worse/i)) {
      themes.push('effectiveness');
    }

    // Quality/Build related
    if (content.match(/quality|build|durable|cheaply|sturdy|fragile|well-made|poorly-made/i)) {
      themes.push('build_quality');
    }

    // Customer Service related
    if (content.match(/service|support|customer|help|response|reply|company|seller/i)) {
      themes.push('customer_service');
    }

    // Shipping/Delivery related
    if (content.match(/shipping|delivery|arrive|package|box|damaged|fast|slow/i)) {
      themes.push('shipping_delivery');
    }

    // Ease of Use related
    if (content.match(/easy|difficult|hard|simple|complicated|use|operate|setup/i)) {
      themes.push('ease_of_use');
    }

    // Size/Fit related
    if (content.match(/size|fit|large|small|big|tight|loose|comfortable|uncomfortable/i)) {
      themes.push('size_fit');
    }

    // Battery Life related (for electronics)
    if (content.match(/battery|charge|last|long|short|power|dead/i)) {
      themes.push('battery_life');
    }

    // Appearance/Looks related
    if (content.match(/look|appearance|color|design|beautiful|ugly|attractive|stylish/i)) {
      themes.push('appearance');
    }

    // Smell/Arroma related
    if (content.match(/smell|odor|scent|aroma|fragrance|stink|fresh|bad smell/i)) {
      themes.push('smell_aroma');
    }

    return themes.length > 0 ? themes : ['general_experience'];
  }

  // Transform quotes to avoid copyright issues (legal compliance)
  private transformQuote(content: string, title?: string): string {
    // This is a simplified version - in production, this would use AI to transform
    // the content while preserving the sentiment and key information
    let transformed = content;

    // Remove brand names and specific identifiers
    transformed = transformed.replace(/\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g, 'this product');
    transformed = transformed.replace(/\b[A-Z]{2,}\b/g, 'this brand');

    // Simplify language while keeping sentiment
    const replacements: [RegExp, string][] = [
      [/absolutely wonderful/gi, 'really good'],
      [/terrible awful/gi, 'very bad'],
      [/completely useless/gi, 'did not work'],
      [/exceeded expectations/gi, 'better than expected'],
      [/highly recommend/gi, 'would recommend'],
      [/waste of money/gi, 'not worth the price'],
      [/love this product/gi, 'really like this'],
      [/hate this product/gi, 'dislike this']
    ];

    for (const [pattern, replacement] of replacements) {
      transformed = transformed.replace(pattern, replacement);
    }

    // Add title if available
    if (title) {
      transformed = `${title}: ${transformed}`;
    }

    return transformed;
  }

  // Store insights in the database
  private async storeInsights(productContainerId: string, insights: ProcessedInsights): Promise<void> {
    try {
      const supabase = await this.getSupabase();
      
      // Store pain points
      for (const painPoint of insights.pain_points) {
        await supabase
          .from('pain_points')
          .insert({
            product_container_id: productContainerId,
            theme: painPoint.theme,
            sentiment: painPoint.sentiment,
            mentions: painPoint.mentions,
            example_quotes: painPoint.example_quotes
          });
      }

      // Store delight factors
      for (const delightFactor of insights.delight_factors) {
        await supabase
          .from('delight_factors')
          .insert({
            product_container_id: productContainerId,
            theme: delightFactor.theme,
            sentiment: delightFactor.sentiment,
            mentions: delightFactor.mentions,
            example_quotes: delightFactor.example_quotes
          });
      }

      console.log(`Stored ${insights.pain_points.length} pain points and ${insights.delight_factors.length} delight factors for container ${productContainerId}`);

    } catch (error) {
      console.error('Error storing insights:', error);
      throw error;
    }
  }

  // Get ingestion job status (for future use with real-time updates)
  async getJobStatus(jobId: string): Promise<IngestionJob | null> {
    // This would typically query a jobs table
    // For now, we'll return a basic implementation
    return null;
  }

  // Cancel an ingestion job
  async cancelIngestion(productContainerId: string): Promise<boolean> {
    try {
      await updateProductContainerStatus(
        productContainerId,
        'failed',
        'Ingestion cancelled by user'
      );
      return true;
    } catch (error) {
      console.error('Error cancelling ingestion:', error);
      return false;
    }
  }
}

// Singleton instance
export const ingestionService = new IngestionService();