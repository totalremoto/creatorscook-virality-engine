'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  ArrowLeftIcon,
  ExternalLinkIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  PlayIcon,
  RefreshCwIcon,
  BarChart3Icon,
  MessageSquareIcon,
  StarIcon,
  CopyIcon,
  Volume2Icon,
  EyeIcon,
  PlusIcon,
  EditIcon,
  TrashIcon
} from 'lucide-react';
import {
  ProductContainerWithAnalysis,
  ViralityPack,
  PainPoint,
  DelightFactor,
  Script
} from '@/types/product';
import { ScriptEditor } from './script-editor';

interface ProductDetailProps {
  containerId: string;
  onBack: () => void;
}

export function ProductDetail({ containerId, onBack }: ProductDetailProps) {
  const { userId } = useAuth();
  const [container, setContainer] = useState<ProductContainerWithAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('virality-packs');
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);
  const [creatingScript, setCreatingScript] = useState(false);

  // Fetch product container details
  const fetchContainerDetails = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/products/${containerId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch product details');
      }

      setContainer(data.container);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Regenerate virality packs
  const regenerateViralityPacks = async (options?: {
    focus_areas?: string[];
    tone?: string;
    target_length?: string;
  }) => {
    if (!userId) return;

    try {
      setRegenerating(true);
      setError(null);

      const response = await fetch(`/api/products/${containerId}/regenerate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options || {}),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to regenerate virality packs');
      }

      // Refresh data
      await fetchContainerDetails();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setRegenerating(false);
    }
  };

  // Copy script to clipboard
  const copyScript = async (script: string) => {
    try {
      await navigator.clipboard.writeText(script);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy script:', err);
    }
  };

  // Format sentiment score
  const formatSentiment = (score: number) => {
    const percentage = Math.round(Math.abs(score) * 100);
    const sign = score > 0 ? '+' : '';
    return `${sign}${percentage}%`;
  };

  // Get sentiment color
  const getSentimentColor = (score: number) => {
    if (score > 0.3) return 'text-green-600';
    if (score < -0.3) return 'text-red-600';
    return 'text-yellow-600';
  };

  // Get virality score color
  const getViralityColor = (score: number) => {
    if (score > 0.7) return 'text-green-600';
    if (score > 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Create a new script
  const createScript = async (title: string, content: string, viralityPackId?: string) => {
    if (!userId) return null;

    try {
      setCreatingScript(true);
      setError(null);

      const response = await fetch('/api/scripts/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_container_id: containerId,
          title,
          content,
          virality_pack_id: viralityPackId
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create script');
      }

      // Refresh container data to show new script
      await fetchContainerDetails();
      return data.script;

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create script');
      return null;
    } finally {
      setCreatingScript(false);
    }
  };

  // Edit existing script
  const editScript = (scriptId: string) => {
    setSelectedScriptId(scriptId);
  };

  // Handle script save/update
  const handleScriptSave = (script: Script) => {
    setSelectedScriptId(null);
    // Refresh container data to show updated script
    fetchContainerDetails();
  };

  // Handle script cancel
  const handleScriptCancel = () => {
    setSelectedScriptId(null);
  };

  // Create script from virality pack
  const createScriptFromPack = async (pack: ViralityPack) => {
    const title = `${pack.angle_name} - TikTok Script`;
    const success = await createScript(title, pack.full_script || '', pack.id);
    if (success) {
      setActiveTab('scripts');
    }
  };

  useEffect(() => {
    fetchContainerDetails();
  }, [userId, containerId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !container) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error || 'Product container not found'}
        </AlertDescription>
      </Alert>
    );
  }

  const avgSentiment = container.virality_packs?.length
    ? container.virality_packs.reduce((sum, pack) => sum + (pack.sentiment_score || 0), 0) / container.virality_packs.length
    : 0;

  const avgVirality = container.virality_packs?.length
    ? container.virality_packs.reduce((sum, pack) => sum + (pack.virality_score || 0), 0) / container.virality_packs.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Show Script Editor if a script is selected */}
      {selectedScriptId ? (
        <ScriptEditor
          scriptId={selectedScriptId}
          userId={userId}
          onSave={handleScriptSave}
          onCancel={handleScriptCancel}
        />
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={onBack}>
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h2 className="text-2xl font-bold">{container.product_name || 'Product Analysis'}</h2>
                <p className="text-muted-foreground">{container.platform}</p>
              </div>
            </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(container.product_url, '_blank')}
          >
            <ExternalLinkIcon className="h-4 w-4 mr-2" />
            View Product
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => regenerateViralityPacks()}
            disabled={regenerating || container.status !== 'completed'}
          >
            {regenerating ? (
              <>
                <LoadingSpinner className="mr-2 h-4 w-4" />
                Regenerating
              </>
            ) : (
              <>
                <RefreshCwIcon className="mr-2 h-4 w-4" />
                Regenerate
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Analytics Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Virality Packs</CardTitle>
            <BarChart3Icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{container.virality_packs?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Creative angles generated
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Virality Score</CardTitle>
            <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getViralityColor(avgVirality)}`}>
              {Math.round(avgVirality * 100)}%
            </div>
            <Progress value={avgVirality * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sentiment Score</CardTitle>
            {avgSentiment > 0 ? (
              <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
            ) : (
              <TrendingDownIcon className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getSentimentColor(avgSentiment)}`}>
              {formatSentiment(avgSentiment)}
            </div>
            <Progress
              value={Math.abs(avgSentiment) * 100}
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customer Insights</CardTitle>
            <MessageSquareIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(container.pain_points?.length || 0) + (container.delight_factors?.length || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Themes identified
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="virality-packs">Virality Packs</TabsTrigger>
          <TabsTrigger value="insights">Customer Insights</TabsTrigger>
          <TabsTrigger value="scripts">Scripts</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Virality Packs Tab */}
        <TabsContent value="virality-packs" className="space-y-4">
          {container.virality_packs && container.virality_packs.length > 0 ? (
            <div className="space-y-4">
              {container.virality_packs
                .sort((a, b) => (b.virality_score || 0) - (a.virality_score || 0))
                .map((pack, index) => (
                  <ViralityPackCard
                    key={pack.id}
                    pack={pack}
                    rank={index + 1}
                    onCopyScript={copyScript}
                    onCreateScript={createScriptFromPack}
                  />
                ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <BarChart3Icon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No virality packs generated yet.</p>
                  <p className="text-sm mt-2">
                    Complete the product analysis to generate creative angles.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Customer Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Pain Points */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDownIcon className="h-5 w-5 text-red-500" />
                  Pain Points
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {container.pain_points && container.pain_points.length > 0 ? (
                  container.pain_points
                    .sort((a, b) => b.mentions - a.mentions)
                    .map((point) => (
                      <div key={point.id} className="border-l-4 border-red-500 pl-4">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium capitalize">
                            {point.theme.replace(/_/g, ' ')}
                          </h4>
                          <Badge variant="destructive">
                            {point.mentions} mentions
                          </Badge>
                        </div>
                        <p className="text-sm text-red-600 mb-2">
                          Sentiment: {formatSentiment(point.sentiment)}
                        </p>
                        <div className="text-xs text-muted-foreground space-y-1">
                          {point.example_quotes.slice(0, 2).map((quote, idx) => (
                            <p key={idx}>"{quote}"</p>
                          ))}
                        </div>
                      </div>
                    ))
                ) : (
                  <p className="text-muted-foreground">No pain points identified.</p>
                )}
              </CardContent>
            </Card>

            {/* Delight Factors */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUpIcon className="h-5 w-5 text-green-500" />
                  Delight Factors
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {container.delight_factors && container.delight_factors.length > 0 ? (
                  container.delight_factors
                    .sort((a, b) => b.mentions - a.mentions)
                    .map((factor) => (
                      <div key={factor.id} className="border-l-4 border-green-500 pl-4">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium capitalize">
                            {factor.theme.replace(/_/g, ' ')}
                          </h4>
                          <Badge variant="default">
                            {factor.mentions} mentions
                          </Badge>
                        </div>
                        <p className="text-sm text-green-600 mb-2">
                          Sentiment: {formatSentiment(factor.sentiment)}
                        </p>
                        <div className="text-xs text-muted-foreground space-y-1">
                          {factor.example_quotes.slice(0, 2).map((quote, idx) => (
                            <p key={idx}>"{quote}"</p>
                          ))}
                        </div>
                      </div>
                    ))
                ) : (
                  <p className="text-muted-foreground">No delight factors identified.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Scripts Tab */}
        <TabsContent value="scripts" className="space-y-4">
          {container.scripts && container.scripts.length > 0 ? (
            <div className="space-y-4">
              {container.scripts.map((script) => (
                <Card key={script.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{script.title}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          script.status === 'approved' ? 'default' :
                          script.status === 'reviewing' ? 'secondary' :
                          script.status === 'rejected' ? 'destructive' : 'outline'
                        }>
                          {script.status}
                        </Badge>
                        <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => editScript(script.id)}
                        >
                          <EditIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyScript(script.content)}
                        >
                          <CopyIcon className="h-4 w-4" />
                        </Button>
                      </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap">{script.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <MessageSquareIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No scripts created yet.</p>
                  <p className="text-sm mt-2">
                    Use the virality packs as inspiration to create your scripts.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Analysis Status</span>
                    <Badge variant={container.status === 'completed' ? 'default' : 'secondary'}>
                      {container.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Reviews Analyzed</span>
                    <span>{container.pain_points?.reduce((sum, p) => sum + p.mentions, 0) || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Themes Identified</span>
                    <span>{(container.pain_points?.length || 0) + (container.delight_factors?.length || 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Engagement Potential</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>High Virality Packs</span>
                    <span>
                      {container.virality_packs?.filter(p => (p.virality_score || 0) > 0.7).length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Positive Sentiment</span>
                    <span>
                      {container.virality_packs?.filter(p => (p.sentiment_score || 0) > 0.1).length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Scripts</span>
                    <span>{container.scripts?.length || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
        </>
      )}
    </div>
  );
}

// Virality Pack Card Component
interface ViralityPackCardProps {
  pack: ViralityPack;
  rank: number;
  onCopyScript: (script: string) => void;
  onCreateScript?: (pack: ViralityPack) => void;
}

function ViralityPackCard({ pack, rank, onCopyScript, onCreateScript }: ViralityPackCardProps) {
  const getScoreColor = (score: number) => {
    if (score > 0.7) return 'text-green-600';
    if (score > 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score > 0.7) return 'default';
    if (score > 0.4) return 'secondary';
    return 'destructive';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
              {rank}
            </div>
            <div>
              <CardTitle className="text-lg">{pack.angle_name}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{pack.core_angle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getScoreBadge(pack.virality_score || 0)}>
              <TrendingUpIcon className="h-3 w-3 mr-1" />
              {Math.round((pack.virality_score || 0) * 100)}%
            </Badge>
            <Badge variant="outline">
              {pack.sentiment_score && pack.sentiment_score > 0 ? '+' : ''}
              {Math.round((pack.sentiment_score || 0) * 100)}%
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hook Options */}
        <div>
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <PlayIcon className="h-4 w-4" />
            Hook Options
          </h4>
          <div className="space-y-2">
            {pack.hook_options.map((hook, index) => (
              <div key={index} className="p-2 bg-muted rounded text-sm">
                "{hook}"
              </div>
            ))}
          </div>
        </div>

        {/* Full Script */}
        {pack.full_script && (
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <MessageSquareIcon className="h-4 w-4" />
              Full Script
            </h4>
            <div className="p-3 bg-muted rounded text-sm">
              <p className="whitespace-pre-wrap">{pack.full_script}</p>
            </div>
            <div className="flex gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCopyScript(pack.full_script!)}
              >
                <CopyIcon className="h-4 w-4 mr-2" />
                Copy
              </Button>
              {onCreateScript && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onCreateScript(pack)}
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Script
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Visual Pacing Notes */}
        {pack.visual_pacing_notes && (
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <EyeIcon className="h-4 w-4" />
              Visual & Pacing Notes
            </h4>
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded text-sm">
              <p>{pack.visual_pacing_notes}</p>
            </div>
          </div>
        )}

        {/* Audio Suggestion */}
        {pack.audio_suggestion && (
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Volume2Icon className="h-4 w-4" />
              Audio Suggestion
            </h4>
            <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded text-sm">
              <p>{pack.audio_suggestion}</p>
            </div>
          </div>
        )}

        {/* Scores */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className={`text-2xl font-bold ${getScoreColor(pack.virality_score || 0)}`}>
              {Math.round((pack.virality_score || 0) * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">Virality Score</p>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${getScoreColor(pack.sentiment_score || 0)}`}>
              {pack.sentiment_score && pack.sentiment_score > 0 ? '+' : ''}
              {Math.round((pack.sentiment_score || 0) * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">Sentiment</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}