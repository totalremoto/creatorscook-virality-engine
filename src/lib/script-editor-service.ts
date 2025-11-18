import { supabase } from './supabase-client';
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { Script, BrandRule, ComplianceFlag, StreamingScriptSuggestion } from '@/types/product';

export interface ScriptEditorSession {
  script_id: string;
  user_id: string;
  content: string;
  cursor_position: number;
  compliance_flags: ComplianceFlag[];
  last_updated: string;
}

export interface ScriptAnalysisResult {
  compliance_flags: ComplianceFlag[];
  suggestions: StreamingScriptSuggestion[];
  overall_compliance_score: number;
  risk_level: 'low' | 'medium' | 'high';
}

export interface ComplianceRule {
  type: 'tos_violation' | 'brand_rule' | 'guideline';
  pattern: string | RegExp;
  message: string;
  severity: 'low' | 'medium' | 'high';
  suggestion?: string;
}

export class ScriptEditorService {
  private supabase = supabase;

  // TikTok Community Guidelines compliance rules (simplified)
  private readonly tosRules: ComplianceRule[] = [
    {
      type: 'tos_violation',
      pattern: /\b(guarantee|guaranteed|promise|ensure|certainty)\b/gi,
      message: 'Avoid making absolute guarantees',
      severity: 'high',
      suggestion: 'Use "may help" or "can support" instead of guarantees'
    },
    {
      type: 'tos_violation',
      pattern: /\b(lose.*weight|weight.*loss|fat.*burner|diet.*pill)\b/gi,
      message: 'Weight loss claims are restricted',
      severity: 'high',
      suggestion: 'Focus on wellness benefits rather than specific weight loss claims'
    },
    {
      type: 'tos_violation',
      pattern: /\b(medical|cure|heal|treat|prevent|diagnose)\b/gi,
      message: 'Avoid medical claims',
      severity: 'high',
      suggestion: 'Use "supports" or "helps with" instead of medical terminology'
    },
    {
      type: 'tos_violation',
      pattern: /\b(click.*link|bio.*link|link.*in.*bio)\b/gi,
      message: 'Direct call-to-action language may be restricted',
      severity: 'medium',
      suggestion: 'Use "check description" or "see more" instead of direct link references'
    },
    {
      type: 'tos_violation',
      pattern: /\b(buy.*now|purchase|order|sale|discount.*price)\b/gi,
      message: 'Sales pressure language may be restricted',
      severity: 'medium',
      suggestion: 'Focus on product benefits rather than direct sales language'
    },
    {
      type: 'tos_violation',
      pattern: /\b(free.*money|cash.*back|get.*paid|earn.*money)\b/gi,
      message: 'Financial opportunity claims are restricted',
      severity: 'high',
      suggestion: 'Avoid making income or financial benefit claims'
    }
  ];

  // Analyze script for compliance issues
  async analyzeScript(
    scriptId: string,
    content: string,
    userId: string,
    brandRules?: BrandRule
  ): Promise<ScriptAnalysisResult> {
    try {
      const complianceFlags: ComplianceFlag[] = [];

      // Check against TikTok ToS rules
      for (const rule of this.tosRules) {
        const matches = this.findRuleMatches(content, rule);
        matches.forEach(match => {
          complianceFlags.push({
            type: rule.type,
            severity: rule.severity,
            message: rule.message,
            suggestion: rule.suggestion,
            position: match
          });
        });
      }

      // Check against custom brand rules
      if (brandRules) {
        const brandViolations = this.checkBrandRules(content, brandRules);
        complianceFlags.push(...brandViolations);
      }

      // Generate AI suggestions for improvement
      const suggestions = await this.generateScriptSuggestions(content, complianceFlags);

      // Calculate overall compliance score
      const complianceScore = this.calculateComplianceScore(complianceFlags, content.length);
      const riskLevel = this.determineRiskLevel(complianceFlags);

      // Update script with compliance flags
      await this.updateScriptCompliance(scriptId, complianceFlags);

      return {
        compliance_flags: complianceFlags,
        suggestions,
        overall_compliance_score: complianceScore,
        risk_level: riskLevel
      };

    } catch (error) {
      console.error('Error analyzing script:', error);
      throw new Error('Failed to analyze script compliance');
    }
  }

  // Find matches for a compliance rule
  private findRuleMatches(content: string, rule: ComplianceRule): Array<{ start: number; end: number }> {
    const matches: Array<{ start: number; end: number }> = [];
    let match;

    if (rule.pattern instanceof RegExp) {
      const regex = new RegExp(rule.pattern, rule.pattern.flags || 'gi');
      while ((match = regex.exec(content)) !== null) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length
        });
      }
    } else {
      const pattern = new RegExp(rule.pattern, 'gi');
      while ((match = pattern.exec(content)) !== null) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length
        });
      }
    }

    return matches;
  }

  // Check against custom brand rules
  private checkBrandRules(content: string, brandRules: BrandRule): ComplianceFlag[] {
    const flags: ComplianceFlag[] = [];
    const lowerContent = content.toLowerCase();

    // Check forbidden keywords
    brandRules.forbidden_keywords.forEach(keyword => {
      if (lowerContent.includes(keyword.toLowerCase())) {
        const index = lowerContent.indexOf(keyword.toLowerCase());
        flags.push({
          type: 'brand_rule',
          severity: 'high',
          message: `Forbidden keyword: "${keyword}"`,
          suggestion: 'Remove this term as it violates brand guidelines',
          position: {
            start: index,
            end: index + keyword.length
          }
        });
      }
    });

    // Check for required keywords (suggestion rather than violation)
    if (brandRules.required_keywords.length > 0) {
      const hasRequiredKeyword = brandRules.required_keywords.some(keyword =>
        lowerContent.includes(keyword.toLowerCase())
      );

      if (!hasRequiredKeyword) {
        flags.push({
          type: 'brand_rule',
          severity: 'low',
          message: 'Consider including required brand keywords',
          suggestion: `Try to include: ${brandRules.required_keywords.join(', ')}`
        });
      }
    }

    return flags;
  }

  // Generate AI-powered script suggestions
  private async generateScriptSuggestions(
    content: string,
    complianceFlags: ComplianceFlag[]
  ): Promise<StreamingScriptSuggestion[]> {
    try {
      // Only get suggestions if there are compliance issues
      if (complianceFlags.length === 0) {
        return [];
      }

      const model = anthropic('claude-3-5-sonnet-20241022');

      const problematicSections = complianceFlags.map(flag => ({
        text: flag.position ? content.slice(flag.position.start, flag.position.end) : 'General',
        issue: flag.message,
        suggestion: flag.suggestion
      }));

      const prompt = `You are a TikTok content compliance expert. I have a script with some compliance issues. Please provide specific, actionable suggestions to fix them.

SCRIPT:
"${content}"

COMPLIANCE ISSUES FOUND:
${problematicSections.map((section, i) =>
  `${i + 1}. Issue: "${section.issue}" - "${section.text}" - Suggestion: ${section.suggestion}`
).join('\n')}

Please provide 3-4 specific suggestions to improve this script. For each suggestion, provide:
- type: "compliance_fix"
- content: the exact text to replace or add
- reason: why this change helps
- confidence: how confident you are this will work (0-1)

Respond in JSON format like:
[
  {
    "type": "compliance_fix",
    "content": "Replace 'guaranteed results' with 'may help support'",
    "reason": "Removes absolute guarantee language while maintaining benefit focus",
    "confidence": 0.9
  }
]`;

      const result = await generateText({
        model,
        prompt,
        temperature: 0.3,
        maxTokens: 1000,
      });

      try {
        const suggestions = JSON.parse(result.text);
        return Array.isArray(suggestions) ? suggestions.map(this.validateSuggestion) : [];
      } catch (parseError) {
        console.error('Error parsing AI suggestions:', parseError);
        return [];
      }

    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      return [];
    }
  }

  // Validate and sanitize suggestion data
  private validateSuggestion(suggestion: any): StreamingScriptSuggestion {
    return {
      type: suggestion.type || 'suggestion',
      content: String(suggestion.content || 'Review script for compliance'),
      reason: String(suggestion.reason || 'To improve compliance'),
      confidence: Math.min(1, Math.max(0, Number(suggestion.confidence) || 0.5))
    };
  }

  // Calculate overall compliance score
  private calculateComplianceScore(flags: ComplianceFlag[], contentLength: number): number {
    if (flags.length === 0) return 1.0;

    let totalScore = 1.0;

    flags.forEach(flag => {
      const weight = flag.severity === 'high' ? 0.3 : flag.severity === 'medium' ? 0.15 : 0.05;
      totalScore -= weight;
    });

    // Bonus for longer content (more context)
    const lengthBonus = Math.min(0.1, contentLength / 1000);
    totalScore += lengthBonus;

    return Math.max(0, Math.min(1, totalScore));
  }

  // Determine risk level based on flags
  private determineRiskLevel(flags: ComplianceFlag[]): 'low' | 'medium' | 'high' {
    const highSeverityFlags = flags.filter(f => f.severity === 'high').length;
    const mediumSeverityFlags = flags.filter(f => f.severity === 'medium').length;

    if (highSeverityFlags > 0) return 'high';
    if (mediumSeverityFlags > 2) return 'high';
    if (mediumSeverityFlags > 0 || flags.length > 3) return 'medium';
    return 'low';
  }

  // Update script compliance in database
  private async updateScriptCompliance(scriptId: string, complianceFlags: ComplianceFlag[]): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('scripts')
        .update({
          compliance_flags: complianceFlags,
          updated_at: new Date().toISOString()
        })
        .eq('id', scriptId);

      if (error) {
        throw new Error(`Failed to update script compliance: ${error.message}`);
      }
    } catch (error) {
      console.error('Error updating script compliance:', error);
      throw error;
    }
  }

  // Create a new script
  async createScript(
    userId: string,
    productContainerId: string,
    title: string,
    content: string,
    viralityPackId?: string
  ): Promise<Script> {
    try {
      const { data, error } = await this.supabase
        .from('scripts')
        .insert({
          user_id: userId,
          product_container_id: productContainerId,
          virality_pack_id: viralityPackId,
          title,
          content,
          status: 'draft',
          compliance_flags: {}
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create script: ${error.message}`);
      }

      return data as Script;

    } catch (error) {
      console.error('Error creating script:', error);
      throw error;
    }
  }

  // Update script content
  async updateScript(
    scriptId: string,
    userId: string,
    content: string,
    title?: string
  ): Promise<Script> {
    try {
      const updateData: Partial<Script> = {
        content,
        updated_at: new Date().toISOString()
      };

      if (title) {
        updateData.title = title;
      }

      const { data, error } = await this.supabase
        .from('scripts')
        .update(updateData)
        .eq('id', scriptId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update script: ${error.message}`);
      }

      return data as Script;

    } catch (error) {
      console.error('Error updating script:', error);
      throw error;
    }
  }

  // Get script with brand rules
  async getScriptWithBrandRules(scriptId: string, userId: string): Promise<{
    script: Script | null;
    brand_rules: BrandRule | null;
  }> {
    try {
      // Get script
      const { data: script, error: scriptError } = await this.supabase
        .from('scripts')
        .select('*')
        .eq('id', scriptId)
        .eq('user_id', userId)
        .single();

      if (scriptError || !script) {
        return { script: null, brand_rules: null };
      }

      // Get brand rules for the product container
      const { data: brandRules } = await this.supabase
        .from('brand_rules')
        .select('*')
        .eq('product_container_id', script.product_container_id)
        .single();

      return {
        script: script as Script,
        brand_rules: brandRules as BrandRule || null
      };

    } catch (error) {
      console.error('Error fetching script:', error);
      return { script: null, brand_rules: null };
    }
  }

  // Get scripts for a product container
  async getScriptsForContainer(productContainerId: string, userId: string): Promise<Script[]> {
    try {
      const { data, error } = await this.supabase
        .from('scripts')
        .select('*')
        .eq('product_container_id', productContainerId)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch scripts: ${error.message}`);
      }

      return data as Script[];

    } catch (error) {
      console.error('Error fetching scripts:', error);
      return [];
    }
  }

  // Update script status
  async updateScriptStatus(
    scriptId: string,
    userId: string,
    status: Script['status']
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('scripts')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', scriptId)
        .eq('user_id', userId);

      return !error;

    } catch (error) {
      console.error('Error updating script status:', error);
      return false;
    }
  }

  // Delete script
  async deleteScript(scriptId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('scripts')
        .delete()
        .eq('id', scriptId)
        .eq('user_id', userId);

      return !error;

    } catch (error) {
      console.error('Error deleting script:', error);
      return false;
    }
  }
}

// Singleton instance
export const scriptEditorService = new ScriptEditorService();