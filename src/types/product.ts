// Core types for the Product Container system

export interface ProductContainer {
  id: string;
  user_id: string;
  product_url: string;
  product_name?: string;
  product_description?: string;
  product_image_url?: string;
  platform: 'tiktok_shop' | 'amazon' | 'aliexpress' | 'external';
  status: 'pending' | 'scraping' | 'analyzing' | 'completed' | 'failed';
  error_message?: string;
  scraping_job_id?: string;
  analysis_job_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ViralityPack {
  id: string;
  product_container_id: string;
  angle_name: string;
  core_angle: string;
  hook_options: string[];
  full_script?: string;
  visual_pacing_notes?: string;
  audio_suggestion?: string;
  sentiment_score?: number; // -1.0 to 1.0
  virality_score?: number; // 0.0 to 1.0
  created_at: string;
  updated_at: string;
}

export interface PainPoint {
  id: string;
  product_container_id: string;
  theme: string;
  sentiment: number; // -1.0 to 1.0 (negative to positive)
  mentions: number;
  example_quotes: string[];
  created_at: string;
}

export interface DelightFactor {
  id: string;
  product_container_id: string;
  theme: string;
  sentiment: number; // 0.0 to 1.0 (positive only)
  mentions: number;
  example_quotes: string[];
  created_at: string;
}

export interface BrandRule {
  id: string;
  product_container_id: string;
  forbidden_keywords: string[];
  required_keywords: string[];
  custom_rules: string[];
  created_at: string;
  updated_at: string;
}

export interface Script {
  id: string;
  product_container_id: string;
  virality_pack_id?: string;
  title: string;
  content: string;
  status: 'draft' | 'reviewing' | 'approved' | 'rejected';
  compliance_flags: Record<string, any>;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  plan: 'starter' | 'professional' | 'enterprise';
  status: 'trialing' | 'active' | 'canceled' | 'past_due';
  angle_credits: number;
  credits_used: number;
  current_period_start?: string;
  current_period_end?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProductRequest {
  product_url: string;
}

export interface CreateProductResponse {
  success: boolean;
  product_container?: ProductContainer;
  error?: string;
}

export interface ProductContainerWithAnalysis extends ProductContainer {
  virality_packs?: ViralityPack[];
  pain_points?: PainPoint[];
  delight_factors?: DelightFactor[];
  brand_rule?: BrandRule;
  scripts?: Script[];
}

export interface ComplianceFlag {
  type: 'tos_violation' | 'brand_rule' | 'suggestion';
  severity: 'low' | 'medium' | 'high';
  message: string;
  suggestion?: string;
  position?: {
    start: number;
    end: number;
  };
}

export interface StreamingScriptSuggestion {
  type: 'hook' | 'transition' | 'call_to_action' | 'compliance_fix';
  content: string;
  reason: string;
  confidence: number;
}

export interface ProductAnalytics {
  total_products: number;
  completed_analyses: number;
  total_scripts: number;
  average_sentiment_score: number;
  average_virality_score: number;
  credits_remaining: number;
  credits_used: number;
}