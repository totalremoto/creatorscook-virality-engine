'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  PlusIcon,
  ExternalLinkIcon,
  TrashIcon,
  TrendingUpIcon,
  BarChart3Icon,
  CreditCardIcon,
  PlayIcon,
  RefreshCwIcon,
  EyeIcon
} from 'lucide-react';
import {
  ProductContainer,
  ProductAnalytics,
  CreateProductRequest
} from '@/types/product';
import { ProductDetail } from './product-detail';

interface ProductDashboardProps {
  className?: string;
}

export function ProductDashboard({ className }: ProductDashboardProps) {
  const { userId, isLoaded } = useAuth();
  const [containers, setContainers] = useState<ProductContainer[]>([]);
  const [analytics, setAnalytics] = useState<ProductAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [productUrl, setProductUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [ingestingContainers, setIngestingContainers] = useState<Set<string>>(new Set());
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);

  // Fetch product containers and analytics
  const fetchData = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/products?include_analytics=true', {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }

      const data = await response.json();
      setContainers(data.containers || []);
      setAnalytics(data.analytics || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Create new product container
  const createContainer = async () => {
    if (!productUrl.trim()) {
      setError('Please enter a product URL');
      return;
    }

    if (!userId) return;

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      const request: CreateProductRequest = {
        product_url: productUrl.trim()
      };

      const response = await fetch('/api/products/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create product container');
      }

      setSuccess('Product container created successfully! You can now start the analysis.');
      setProductUrl('');

      // Refresh data
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  // Start ingestion for a product container
  const startIngestion = async (containerId: string) => {
    if (!userId) return;

    try {
      setError(null);
      setSuccess(null);

      // Add to ingesting set
      setIngestingContainers(prev => new Set(prev).add(containerId));

      const response = await fetch(`/api/products/${containerId}/ingest`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start product analysis');
      }

      setSuccess('Product analysis started! This may take a few minutes.');

      // Set up polling for real-time updates
      const pollInterval = setInterval(async () => {
        try {
          const updatedResponse = await fetch('/api/products?include_analytics=false');
          const updatedData = await updatedResponse.json();

          if (updatedData.success && updatedData.containers) {
            const updatedContainer = updatedData.containers.find((c: ProductContainer) => c.id === containerId);

            if (updatedContainer && (updatedContainer.status === 'completed' || updatedContainer.status === 'failed')) {
              // Stop polling when analysis is complete
              clearInterval(pollInterval);
              setIngestingContainers(prev => {
                const newSet = new Set(prev);
                newSet.delete(containerId);
                return newSet;
              });

              // Refresh all data
              await fetchData();

              if (updatedContainer.status === 'completed') {
                setSuccess('Product analysis completed successfully!');
              } else {
                setError(`Product analysis failed: ${updatedContainer.error_message || 'Unknown error'}`);
              }
            } else if (updatedContainer) {
              // Update the container status in real-time
              setContainers(prev => prev.map(c =>
                c.id === containerId ? updatedContainer : c
              ));
            }
          }
        } catch (pollError) {
          console.error('Error polling for updates:', pollError);
        }
      }, 3000); // Poll every 3 seconds

      // Stop polling after 5 minutes max
      setTimeout(() => {
        clearInterval(pollInterval);
        setIngestingContainers(prev => {
          const newSet = new Set(prev);
          newSet.delete(containerId);
          return newSet;
        });
      }, 300000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIngestingContainers(prev => {
        const newSet = new Set(prev);
        newSet.delete(containerId);
        return newSet;
      });
    }
  };

  // Delete product container
  const deleteContainer = async (containerId: string) => {
    if (!userId) return;
    if (!confirm('Are you sure you want to delete this product container?')) return;

    try {
      setError(null);

      const response = await fetch(`/api/products/${containerId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete product container');
      }

      // Refresh data
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'scraping':
      case 'analyzing':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  // Get status display text
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Ready to Analyze';
      case 'scraping':
        return 'Scraping Data';
      case 'analyzing':
        return 'Analyzing Insights';
      case 'completed':
        return 'Analysis Complete';
      case 'failed':
        return 'Analysis Failed';
      default:
        return status;
    }
  };

  // Check if container can be analyzed
  const canAnalyze = (container: ProductContainer) => {
    return container.status === 'pending' || container.status === 'failed';
  };

  // Check if container is currently being analyzed
  const isAnalyzing = (containerId: string) => {
    return ingestingContainers.has(containerId);
  };

  // Handle back to dashboard
  const handleBackToDashboard = () => {
    setSelectedContainerId(null);
    setError(null);
    setSuccess(null);
    // Refresh data when returning to dashboard
    fetchData();
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  useEffect(() => {
    if (isLoaded && userId) {
      fetchData();
    }
  }, [isLoaded, userId]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (!userId) {
    return (
      <Alert>
        <AlertDescription>
          Please sign in to access your product containers.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Show Product Detail if a container is selected */}
      {selectedContainerId ? (
        <ProductDetail
          containerId={selectedContainerId}
          onBack={handleBackToDashboard}
        />
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Product Dashboard</h1>
              <p className="text-muted-foreground">
                Manage your product analysis containers and track virality insights.
              </p>
            </div>
          </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <BarChart3Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.total_products}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.completed_analyses} completed analyses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Sentiment</CardTitle>
              <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.average_sentiment_score.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Customer sentiment score
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Virality Score</CardTitle>
              <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.average_virality_score.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Average virality potential
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Credits Remaining</CardTitle>
              <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.credits_remaining}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.credits_used} credits used
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add New Product */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Product</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter product URL (Amazon, TikTok Shop, AliExpress, etc.)"
              value={productUrl}
              onChange={(e) => setProductUrl(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && createContainer()}
              disabled={submitting}
            />
            <Button
              onClick={createContainer}
              disabled={submitting || !productUrl.trim()}
            >
              {submitting ? (
                <LoadingSpinner className="mr-2 h-4 w-4" />
              ) : (
                <PlusIcon className="mr-2 h-4 w-4" />
              )}
              Add Product
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            External links consume 1 angle credit. TikTok Shop links are free to analyze.
          </p>
        </CardContent>
      </Card>

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

      {/* Product Containers List */}
      <Card>
        <CardHeader>
          <CardTitle>Product Containers</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <LoadingSpinner />
            </div>
          ) : containers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No product containers yet.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Add your first product URL above to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {containers.map((container) => (
                <div
                  key={container.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium truncate">
                        {container.product_name || 'Processing...'}
                      </h3>
                      <Badge variant={getStatusVariant(container.status)}>
                        {getStatusText(container.status)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate mb-2">
                      {container.product_url}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Platform: {container.platform}</span>
                      <span>Created: {formatDate(container.created_at)}</span>
                    </div>
                    {container.error_message && (
                      <p className="text-sm text-destructive mt-2">
                        Error: {container.error_message}
                      </p>
                    )}
                    {(container.status === 'scraping' || container.status === 'analyzing') && (
                      <div className="flex items-center gap-2 text-xs text-blue-600 mt-2">
                        <RefreshCwIcon className="h-3 w-3 animate-spin" />
                        <span>Analysis in progress...</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {/* Analyze button */}
                    {canAnalyze(container) && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => startIngestion(container.id)}
                        disabled={isAnalyzing(container.id)}
                      >
                        {isAnalyzing(container.id) ? (
                          <>
                            <LoadingSpinner className="mr-2 h-4 w-4" />
                            Analyzing
                          </>
                        ) : (
                          <>
                            <PlayIcon className="mr-2 h-4 w-4" />
                            Analyze
                          </>
                        )}
                      </Button>
                    )}

                    {/* View details button */}
                    {container.status === 'completed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedContainerId(container.id)}
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                    )}

                    {/* External link button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(container.product_url, '_blank')}
                    >
                      <ExternalLinkIcon className="h-4 w-4" />
                    </Button>

                    {/* Delete button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteContainer(container.id)}
                      disabled={container.status === 'scraping' || container.status === 'analyzing'}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}