-- Product Containers Migration for CreatorsCook.com
-- This creates the core product container system with proper RLS policies

-- Create the product_containers table
CREATE TABLE IF NOT EXISTS public.product_containers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL, -- This will store the Clerk user ID
  product_url TEXT NOT NULL,
  product_name TEXT,
  product_description TEXT,
  product_image_url TEXT,
  platform TEXT NOT NULL, -- 'tiktok_shop', 'amazon', 'aliexpress', 'external'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'scraping', 'analyzing', 'completed', 'failed'
  error_message TEXT,
  scraping_job_id TEXT,
  analysis_job_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the virality_packs table to store AI-generated insights
CREATE TABLE IF NOT EXISTS public.virality_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_container_id UUID NOT NULL REFERENCES public.product_containers(id) ON DELETE CASCADE,
  angle_name TEXT NOT NULL,
  core_angle TEXT NOT NULL,
  hook_options TEXT[] DEFAULT '{}', -- Array of 3 hook options
  full_script TEXT,
  visual_pacing_notes TEXT,
  audio_suggestion TEXT,
  sentiment_score DECIMAL(3,2), -- -1.0 to 1.0
  virality_score DECIMAL(3,2), -- 0.0 to 1.0
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the pain_points table to store customer sentiment analysis
CREATE TABLE IF NOT EXISTS public.pain_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_container_id UUID NOT NULL REFERENCES public.product_containers(id) ON DELETE CASCADE,
  theme TEXT NOT NULL,
  sentiment DECIMAL(3,2) NOT NULL, -- -1.0 to 1.0 (negative to positive)
  mentions INTEGER NOT NULL DEFAULT 0,
  example_quotes TEXT[] DEFAULT '{}', -- Transformed, non-copyright quotes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the delight_factors table to store positive sentiment analysis
CREATE TABLE IF NOT EXISTS public.delight_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_container_id UUID NOT NULL REFERENCES public.product_containers(id) ON DELETE CASCADE,
  theme TEXT NOT NULL,
  sentiment DECIMAL(3,2) NOT NULL, -- 0.0 to 1.0 (positive only)
  mentions INTEGER NOT NULL DEFAULT 0,
  example_quotes TEXT[] DEFAULT '{}', -- Transformed, non-copyright quotes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the brand_rules table for custom compliance rules
CREATE TABLE IF NOT EXISTS public.brand_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_container_id UUID NOT NULL REFERENCES public.product_containers(id) ON DELETE CASCADE,
  forbidden_keywords TEXT[] DEFAULT '{}',
  required_keywords TEXT[] DEFAULT '{}',
  custom_rules TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the scripts table for user-created and AI-generated scripts
CREATE TABLE IF NOT EXISTS public.scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_container_id UUID NOT NULL REFERENCES public.product_containers(id) ON DELETE CASCADE,
  virality_pack_id UUID REFERENCES public.virality_packs(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'reviewing', 'approved', 'rejected'
  compliance_flags JSONB DEFAULT '{}', -- Store compliance issues and suggestions
  user_id TEXT NOT NULL, -- This will store the Clerk user ID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the user_subscriptions table for billing management
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL, -- This will store the Clerk user ID
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT NOT NULL DEFAULT 'starter', -- 'starter', 'professional', 'enterprise'
  status TEXT NOT NULL DEFAULT 'trialing', -- 'trialing', 'active', 'canceled', 'past_due'
  angle_credits INTEGER DEFAULT 3, -- Angle credits for external links
  credits_used INTEGER DEFAULT 0,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.product_containers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virality_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pain_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delight_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_containers table
-- Users can only access their own product containers
CREATE POLICY "Users can only access own product containers" ON public.product_containers
  FOR ALL USING (auth.jwt() ->> 'sub' = user_id);

-- RLS Policies for virality_packs table
-- Users can only access virality packs from their own product containers
CREATE POLICY "Users can only access own virality packs" ON public.virality_packs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.product_containers
      WHERE product_containers.id = virality_packs.product_container_id
      AND product_containers.user_id = auth.jwt() ->> 'sub'
    )
  );

-- RLS Policies for pain_points table
CREATE POLICY "Users can only access own pain points" ON public.pain_points
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.product_containers
      WHERE product_containers.id = pain_points.product_container_id
      AND product_containers.user_id = auth.jwt() ->> 'sub'
    )
  );

-- RLS Policies for delight_factors table
CREATE POLICY "Users can only access own delight factors" ON public.delight_factors
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.product_containers
      WHERE product_containers.id = delight_factors.product_container_id
      AND product_containers.user_id = auth.jwt() ->> 'sub'
    )
  );

-- RLS Policies for brand_rules table
CREATE POLICY "Users can only access own brand rules" ON public.brand_rules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.product_containers
      WHERE product_containers.id = brand_rules.product_container_id
      AND product_containers.user_id = auth.jwt() ->> 'sub'
    )
  );

-- RLS Policies for scripts table
-- Users can only access their own scripts
CREATE POLICY "Users can only access own scripts" ON public.scripts
  FOR ALL USING (auth.jwt() ->> 'sub' = user_id);

-- RLS Policies for user_subscriptions table
-- Users can only access their own subscription
CREATE POLICY "Users can only access own subscription" ON public.user_subscriptions
  FOR ALL USING (auth.jwt() ->> 'sub' = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_containers_user_id ON public.product_containers(user_id);
CREATE INDEX IF NOT EXISTS idx_product_containers_status ON public.product_containers(status);
CREATE INDEX IF NOT EXISTS idx_product_containers_created_at ON public.product_containers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_virality_packs_container_id ON public.virality_packs(product_container_id);
CREATE INDEX IF NOT EXISTS idx_virality_packs_sentiment ON public.virality_packs(sentiment_score);
CREATE INDEX IF NOT EXISTS idx_virality_packs_virality ON public.virality_packs(virality_score);
CREATE INDEX IF NOT EXISTS idx_pain_points_container_id ON public.pain_points(product_container_id);
CREATE INDEX IF NOT EXISTS idx_pain_points_sentiment ON public.pain_points(sentiment);
CREATE INDEX IF NOT EXISTS idx_delight_factors_container_id ON public.delight_factors(product_container_id);
CREATE INDEX IF NOT EXISTS idx_delight_factors_sentiment ON public.delight_factors(sentiment);
CREATE INDEX IF NOT EXISTS idx_brand_rules_container_id ON public.brand_rules(product_container_id);
CREATE INDEX IF NOT EXISTS idx_scripts_container_id ON public.scripts(product_container_id);
CREATE INDEX IF NOT EXISTS idx_scripts_user_id ON public.scripts(user_id);
CREATE INDEX IF NOT EXISTS idx_scripts_status ON public.scripts(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);

-- Create updated_at triggers for all tables with updated_at columns
CREATE TRIGGER update_product_containers_updated_at
  BEFORE UPDATE ON public.product_containers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_virality_packs_updated_at
  BEFORE UPDATE ON public.virality_packs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brand_rules_updated_at
  BEFORE UPDATE ON public.brand_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scripts_updated_at
  BEFORE UPDATE ON public.scripts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to check if user has sufficient angle credits
CREATE OR REPLACE FUNCTION public.has_sufficient_credits(p_user_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  current_credits INTEGER;
  credits_used INTEGER;
BEGIN
  SELECT angle_credits, credits_used INTO current_credits, credits_used
  FROM public.user_subscriptions
  WHERE user_id = p_user_id;

  RETURN (current_credits - credits_used) > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to consume an angle credit
CREATE OR REPLACE FUNCTION public.consume_angle_credit(p_user_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  subscription_id UUID;
BEGIN
  -- Update the user's subscription to consume a credit
  UPDATE public.user_subscriptions
  SET credits_used = credits_used + 1
  WHERE user_id = p_user_id
  AND has_sufficient_credits(p_user_id)
  RETURNING id INTO subscription_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user's current credit balance
CREATE OR REPLACE FUNCTION public.get_credit_balance(p_user_id TEXT)
RETURNS INTEGER AS $$
DECLARE
  current_credits INTEGER;
  credits_used INTEGER;
BEGIN
  SELECT angle_credits, credits_used INTO current_credits, credits_used
  FROM public.user_subscriptions
  WHERE user_id = p_user_id;

  RETURN COALESCE(current_credits, 0) - COALESCE(credits_used, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;