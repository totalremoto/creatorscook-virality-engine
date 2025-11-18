import { createClient } from './supabase';
import {
  ProductContainer,
  ProductContainerWithAnalysis,
  CreateProductRequest,
  CreateProductResponse,
  UserSubscription,
  ViralityPack,
  PainPoint,
  DelightFactor,
  BrandRule,
  Script,
  ProductAnalytics
} from '@/types/product';

// Get a Supabase client with server-side auth
function getServerClient() {
  return createClient('service');
}

// URL validation and platform detection
function validateAndDetectPlatform(url: string): { valid: boolean; platform: string; error?: string } {
  try {
    const urlObj = new URL(url);

    // Check if it's a valid HTTP/HTTPS URL
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { valid: false, platform: '', error: 'Invalid URL protocol' };
    }

    // Detect platform
    if (urlObj.hostname.includes('tiktok.com') && urlObj.pathname.includes('/shop/')) {
      return { valid: true, platform: 'tiktok_shop' };
    } else if (urlObj.hostname.includes('amazon.com') || urlObj.hostname.includes('amzn.to')) {
      return { valid: true, platform: 'amazon' };
    } else if (urlObj.hostname.includes('aliexpress.com') || urlObj.hostname.includes('s.click.aliexpress.com')) {
      return { valid: true, platform: 'aliexpress' };
    } else {
      return { valid: true, platform: 'external' };
    }
  } catch (error) {
    return { valid: false, platform: '', error: 'Invalid URL format' };
  }
}

// Create a new product container
export async function createProductContainer(
  userId: string,
  request: CreateProductRequest
): Promise<CreateProductResponse> {
  try {
    // Validate URL and detect platform
    const { valid, platform, error } = validateAndDetectPlatform(request.product_url);
    if (!valid) {
      return { success: false, error: error || 'Invalid URL' };
    }

    // Check if user has sufficient credits for external links
    if (platform === 'external') {
      const supabase = getServerClient();
      const { data: hasCredits } = await supabase.rpc('has_sufficient_credits', {
        p_user_id: userId
      });

      if (!hasCredits) {
        return {
          success: false,
          error: 'Insufficient angle credits. Please upgrade your plan to analyze external products.'
        };
      }

      // Consume a credit for external link analysis
      await supabase.rpc('consume_angle_credit', { p_user_id: userId });
    }

    const supabase = getServerClient();

    // Create the product container
    const { data, error: insertError } = await supabase
      .from('product_containers')
      .insert({
        user_id: userId,
        product_url: request.product_url,
        platform: platform,
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating product container:', insertError);
      return { success: false, error: 'Failed to create product container' };
    }

    // Initialize brand rules for this container
    await supabase
      .from('brand_rules')
      .insert({
        product_container_id: data.id,
        forbidden_keywords: [],
        required_keywords: [],
        custom_rules: []
      });

    return {
      success: true,
      product_container: data as ProductContainer
    };

  } catch (error) {
    console.error('Unexpected error in createProductContainer:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Get all product containers for a user
export async function getUserProductContainers(userId: string): Promise<ProductContainer[]> {
  try {
    const supabase = getServerClient();

    const { data, error } = await supabase
      .from('product_containers')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching product containers:', error);
      return [];
    }

    return data as ProductContainer[];
  } catch (error) {
    console.error('Unexpected error in getUserProductContainers:', error);
    return [];
  }
}

// Get a single product container with full analysis
export async function getProductContainerWithAnalysis(
  userId: string,
  containerId: string
): Promise<ProductContainerWithAnalysis | null> {
  try {
    const supabase = getServerClient();

    // Get the product container
    const { data: container, error: containerError } = await supabase
      .from('product_containers')
      .select('*')
      .eq('id', containerId)
      .eq('user_id', userId)
      .single();

    if (containerError || !container) {
      return null;
    }

    // Get related data in parallel
    const [
      viralityPacksResult,
      painPointsResult,
      delightFactorsResult,
      brandRuleResult,
      scriptsResult
    ] = await Promise.all([
      supabase
        .from('virality_packs')
        .select('*')
        .eq('product_container_id', containerId)
        .order('virality_score', { ascending: false }),

      supabase
        .from('pain_points')
        .select('*')
        .eq('product_container_id', containerId)
        .order('mentions', { ascending: false }),

      supabase
        .from('delight_factors')
        .select('*')
        .eq('product_container_id', containerId)
        .order('mentions', { ascending: false }),

      supabase
        .from('brand_rules')
        .select('*')
        .eq('product_container_id', containerId)
        .single(),

      supabase
        .from('scripts')
        .select('*')
        .eq('product_container_id', containerId)
        .order('updated_at', { ascending: false })
    ]);

    return {
      ...container,
      virality_packs: viralityPacksResult.data as ViralityPack[] || [],
      pain_points: painPointsResult.data as PainPoint[] || [],
      delight_factors: delightFactorsResult.data as DelightFactor[] || [],
      brand_rule: brandRuleResult.data as BrandRule || undefined,
      scripts: scriptsResult.data as Script[] || []
    } as ProductContainerWithAnalysis;

  } catch (error) {
    console.error('Unexpected error in getProductContainerWithAnalysis:', error);
    return null;
  }
}

// Update product container status
export async function updateProductContainerStatus(
  containerId: string,
  status: ProductContainer['status'],
  errorMessage?: string,
  additionalData?: Partial<ProductContainer>
): Promise<boolean> {
  try {
    const supabase = getServerClient();

    const updateData: Partial<ProductContainer> = {
      status,
      ...additionalData
    };

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    const { error } = await supabase
      .from('product_containers')
      .update(updateData)
      .eq('id', containerId);

    return !error;
  } catch (error) {
    console.error('Error updating product container status:', error);
    return false;
  }
}

// Delete a product container
export async function deleteProductContainer(
  userId: string,
  containerId: string
): Promise<boolean> {
  try {
    const supabase = getServerClient();

    const { error } = await supabase
      .from('product_containers')
      .delete()
      .eq('id', containerId)
      .eq('user_id', userId);

    return !error;
  } catch (error) {
    console.error('Error deleting product container:', error);
    return false;
  }
}

// Get user subscription information
export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  try {
    const supabase = getServerClient();

    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // Create default subscription if it doesn't exist
      if (error.code === 'PGRST116') {
        const { data: newSub, error: createError } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id: userId,
            plan: 'starter',
            status: 'trialing',
            angle_credits: 3,
            credits_used: 0
          })
          .select()
          .single();

        return createError ? null : newSub as UserSubscription;
      }
      return null;
    }

    return data as UserSubscription;
  } catch (error) {
    console.error('Error fetching user subscription:', error);
    return null;
  }
}

// Get user analytics
export async function getUserAnalytics(userId: string): Promise<ProductAnalytics> {
  try {
    const supabase = getServerClient();

    // Get product containers summary
    const { data: products } = await supabase
      .from('product_containers')
      .select('status')
      .eq('user_id', userId);

    // Get virality packs for scores
    const { data: viralityPacks } = await supabase
      .from('virality_packs')
      .select('sentiment_score, virality_score')
      .in('product_container_id',
        products?.filter(p => p.status === 'completed').map(p => p.id) || []
      );

    // Get scripts count
    const { count: scriptsCount } = await supabase
      .from('scripts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get subscription info
    const subscription = await getUserSubscription(userId);

    const totalProducts = products?.length || 0;
    const completedAnalyses = products?.filter(p => p.status === 'completed').length || 0;

    const avgSentimentScore = viralityPacks && viralityPacks.length > 0
      ? viralityPacks.reduce((sum, pack) => sum + (pack.sentiment_score || 0), 0) / viralityPacks.length
      : 0;

    const avgViralityScore = viralityPacks && viralityPacks.length > 0
      ? viralityPacks.reduce((sum, pack) => sum + (pack.virality_score || 0), 0) / viralityPacks.length
      : 0;

    return {
      total_products: totalProducts,
      completed_analyses: completedAnalyses,
      total_scripts: scriptsCount || 0,
      average_sentiment_score: avgSentimentScore,
      average_virality_score: avgViralityScore,
      credits_remaining: subscription ? subscription.angle_credits - subscription.credits_used : 0,
      credits_used: subscription?.credits_used || 0
    };
  } catch (error) {
    console.error('Error fetching user analytics:', error);
    return {
      total_products: 0,
      completed_analyses: 0,
      total_scripts: 0,
      average_sentiment_score: 0,
      average_virality_score: 0,
      credits_remaining: 0,
      credits_used: 0
    };
  }
}