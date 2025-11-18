"use client";

import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { ProductDashboard } from "@/components/product-dashboard";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { TrendingUpIcon, ZapIcon, ShieldIcon, BarChart3Icon } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <TrendingUpIcon className="h-8 w-8 text-purple-600" />
                <div>
                  <h1 className="text-xl font-bold">CreatorsCook</h1>
                  <p className="text-xs text-muted-foreground">AI Virality Engine</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <SignedOut>
                <SignInButton>
                  <Button variant="outline" size="sm">
                    Sign In
                  </Button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <UserButton />
              </SignedIn>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        <SignedIn>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <ProductDashboard />
          </div>
        </SignedIn>

        <SignedOut>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center max-w-4xl mx-auto">
              {/* Hero Section */}
              <div className="mb-16">
                <div className="flex items-center justify-center mb-6">
                  <TrendingUpIcon className="h-16 w-16 text-purple-600" />
                </div>
                <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
                  <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Stop Guessing, Start Winning
                  </span>
                </h1>
                <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                  Transform your TikTok content strategy with AI-powered insights that fuse customer sentiment with proven viral mechanics.
                </p>
                <SignInButton>
                  <Button size="lg" className="text-lg px-8">
                    Get Started Free
                  </Button>
                </SignInButton>
              </div>

              {/* Features */}
              <div className="grid md:grid-cols-3 gap-8 mb-16">
                <div className="text-center p-6 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10">
                  <ZapIcon className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Angle Reasoning Engine</h3>
                  <p className="text-muted-foreground">
                    Our core AI synthesizes customer reviews with viral patterns to generate data-driven creative angles.
                  </p>
                </div>

                <div className="text-center p-6 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/10 dark:to-cyan-900/10">
                  <BarChart3Icon className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Virality Packs</h3>
                  <p className="text-muted-foreground">
                    Complete creative packages with hooks, scripts, visual notes, and audio suggestions tailored for virality.
                  </p>
                </div>

                <div className="text-center p-6 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10">
                  <ShieldIcon className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Compliance Co-Pilot</h3>
                  <p className="text-muted-foreground">
                    Real-time script analysis that keeps your content compliant but edgy, avoiding platform violations.
                  </p>
                </div>
              </div>

              {/* How It Works */}
              <div className="text-left max-w-3xl mx-auto mb-16">
                <h2 className="text-2xl font-bold mb-6 text-center">How It Works</h2>
                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-semibold">
                      1
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Add Product URL</h3>
                      <p className="text-muted-foreground">
                        Drop in any product link from TikTok Shop, Amazon, AliExpress, or other platforms.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-semibold">
                      2
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">AI Analysis</h3>
                      <p className="text-muted-foreground">
                        Our system analyzes customer reviews for pain points and studies viral content patterns.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-semibold">
                      3
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Generate Virality Packs</h3>
                      <p className="text-muted-foreground">
                        Receive complete creative angles with hooks, scripts, and viral-ready content suggestions.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="p-8 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                <h2 className="text-2xl font-bold mb-4">Ready to Transform Your Content?</h2>
                <p className="text-lg mb-6 opacity-90">
                  Join creators who are moving from guessing to data-driven viral strategies.
                </p>
                <SignInButton>
                  <Button size="lg" variant="secondary" className="text-lg px-8">
                    Start Creating Viral Content
                  </Button>
                </SignInButton>
              </div>
            </div>
          </div>
        </SignedOut>
      </main>
    </div>
  );
}
