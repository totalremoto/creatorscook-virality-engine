'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  SaveIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  XCircleIcon,
  RefreshCwIcon,
  LightbulbIcon,
  ShieldIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  TrashIcon
} from 'lucide-react';
import {
  Script,
  BrandRule,
  ComplianceFlag,
  StreamingScriptSuggestion
} from '@/types/product';
import { scriptEditorService } from '@/lib/script-editor-service';

interface ScriptEditorProps {
  scriptId: string;
  userId: string;
  onSave?: (script: Script) => void;
  onCancel?: () => void;
}

export function ScriptEditor({ scriptId, userId, onSave, onCancel }: ScriptEditorProps) {
  const [script, setScript] = useState<Script | null>(null);
  const [brandRules, setBrandRules] = useState<BrandRule | null>(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [complianceFlags, setComplianceFlags] = useState<ComplianceFlag[]>([]);
  const [suggestions, setSuggestions] = useState<StreamingScriptSuggestion[]>([]);
  const [complianceScore, setComplianceScore] = useState(1.0);
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high'>('low');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCompliance, setShowCompliance] = useState(true);
  const [activeTab, setActiveTab] = useState('editor');

  const analysisTimeoutRef = useRef<NodeJS.Timeout>();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load script and brand rules
  const loadScript = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await scriptEditorService.getScriptWithBrandRules(scriptId, userId);

      if (!result.script) {
        throw new Error('Script not found');
      }

      setScript(result.script);
      setBrandRules(result.brand_rules);
      setContent(result.script.content);
      setTitle(result.script.title);
      setComplianceFlags(result.script.compliance_flags || []);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load script');
    } finally {
      setLoading(false);
    }
  };

  // Analyze script for compliance (debounced)
  const analyzeScript = useCallback(async () => {
    if (!content.trim() || !brandRules) return;

    try {
      setAnalyzing(true);
      setError(null);

      const result = await scriptEditorService.analyzeScript(
        scriptId,
        content,
        userId,
        brandRules
      );

      setComplianceFlags(result.compliance_flags);
      setSuggestions(result.suggestions);
      setComplianceScore(result.overall_compliance_score);
      setRiskLevel(result.risk_level);

    } catch (err) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  }, [content, scriptId, userId, brandRules]);

  // Debounced analysis
  useEffect(() => {
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }

    analysisTimeoutRef.current = setTimeout(() => {
      analyzeScript();
    }, 1000); // 1 second delay

    return () => {
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }
    };
  }, [content, analyzeScript]);

  // Save script
  const saveScript = async () => {
    if (!title.trim()) {
      setError('Please enter a script title');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const updatedScript = await scriptEditorService.updateScript(
        scriptId,
        userId,
        content,
        title
      );

      setScript(updatedScript);
      setSuccess('Script saved successfully!');
      onSave?.(updatedScript);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save script');
    } finally {
      setSaving(false);
    }
  };

  // Apply suggestion
  const applySuggestion = (suggestion: StreamingScriptSuggestion) => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const cursorPos = textarea.selectionStart;

      // For simplicity, just append the suggestion
      const newContent = content + '\n\n' + suggestion.content;
      setContent(newContent);

      // Focus back to textarea
      textarea.focus();
    }
  };

  // Get compliance flag icon
  const getComplianceIcon = (severity: ComplianceFlag['severity']) => {
    switch (severity) {
      case 'high':
        return <XCircleIcon className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <AlertTriangleIcon className="h-4 w-4 text-yellow-500" />;
      case 'low':
        return <CheckCircleIcon className="h-4 w-4 text-blue-500" />;
      default:
        return <ShieldIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get compliance score color
  const getComplianceScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Get risk level badge variant
  const getRiskLevelVariant = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'low':
        return 'default';
      case 'medium':
        return 'secondary';
      case 'high':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Copy script to clipboard
  const copyScript = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setSuccess('Script copied to clipboard!');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError('Failed to copy script');
    }
  };

  // Highlight compliance issues in text
  const highlightText = (text: string) => {
    if (!showCompliance || complianceFlags.length === 0) {
      return text;
    }

    let highlightedText = text;
    const highlights: Array<{ start: number; end: number; className: string }> = [];

    complianceFlags.forEach(flag => {
      if (flag.position) {
        highlights.push({
          start: flag.position.start,
          end: flag.position.end,
          className: flag.severity === 'high' ? 'bg-red-200 dark:bg-red-900/30' :
                     flag.severity === 'medium' ? 'bg-yellow-200 dark:bg-yellow-900/30' :
                     'bg-blue-200 dark:bg-blue-900/30'
        });
      }
    });

    // Sort highlights by start position
    highlights.sort((a, b) => a.start - b.start);

    // Apply highlights (simplified version)
    return highlightedText;
  };

  useEffect(() => {
    loadScript();
  }, [scriptId, userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && !script) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">Script Editor</h2>
          <div className="flex items-center gap-2">
            <Badge variant={getRiskLevelVariant(riskLevel)}>
              Risk: {riskLevel}
            </Badge>
            <Badge variant="outline">
              <ShieldIcon className="h-3 w-3 mr-1" />
              <span className={getComplianceScoreColor(complianceScore)}>
                {Math.round(complianceScore * 100)}% Compliant
              </span>
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCompliance(!showCompliance)}
          >
            {showCompliance ? <EyeOffIcon className="h-4 w-4 mr-2" /> : <EyeIcon className="h-4 w-4 mr-2" />}
            {showCompliance ? 'Hide' : 'Show'} Compliance
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={copyScript}
          >
            <CopyIcon className="h-4 w-4 mr-2" />
            Copy
          </Button>
          <Button
            onClick={saveScript}
            disabled={saving}
          >
            {saving ? (
              <>
                <LoadingSpinner className="mr-2 h-4 w-4" />
                Saving
              </>
            ) : (
              <>
                <SaveIcon className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </Button>
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Editor */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Script Content
                {analyzing && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <LoadingSpinner className="mr-2 h-4 w-4" />
                    Analyzing compliance...
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="title" className="text-sm font-medium mb-2 block">
                  Script Title
                </label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter script title..."
                  disabled={saving}
                />
              </div>

              <div>
                <label htmlFor="content" className="text-sm font-medium mb-2 block">
                  Script Content
                </label>
                <Textarea
                  ref={textareaRef}
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your TikTok script here..."
                  className="min-h-[400px] font-mono text-sm"
                  disabled={saving}
                />
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <span>{content.length} characters</span>
                  <span>~{Math.ceil(content.length / 4)} seconds when spoken</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Compliance Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldIcon className="h-5 w-5" />
                Compliance Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              {complianceFlags.length > 0 ? (
                <div className="space-y-3">
                  {complianceFlags.map((flag, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-start gap-2">
                        {getComplianceIcon(flag.severity)}
                        <div className="flex-1">
                          <p className="text-sm font-medium">{flag.message}</p>
                          {flag.suggestion && (
                            <p className="text-xs text-muted-foreground mt-1">
                              💡 {flag.suggestion}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  <CheckCircleIcon className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p className="text-sm">No compliance issues detected</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Suggestions */}
          {suggestions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LightbulbIcon className="h-5 w-5" />
                  AI Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {suggestions.map((suggestion, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{suggestion.content}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {suggestion.reason}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => applySuggestion(suggestion)}
                          className="ml-2"
                        >
                          Apply
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Brand Rules */}
          {brandRules && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Brand Rules</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {brandRules.forbidden_keywords.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-red-600 mb-1">Forbidden Keywords</h4>
                    <div className="flex flex-wrap gap-1">
                      {brandRules.forbidden_keywords.map((keyword, index) => (
                        <Badge key={index} variant="destructive" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {brandRules.required_keywords.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-green-600 mb-1">Required Keywords</h4>
                    <div className="flex flex-wrap gap-1">
                      {brandRules.required_keywords.map((keyword, index) => (
                        <Badge key={index} variant="default" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}