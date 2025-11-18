# Backend Structure Document for CreatorsCook.com

This document outlines the backend architecture, database management, API design, hosting, infrastructure, security, and maintenance strategies for the CreatorsCook.com platform. It’s written in everyday language to ensure clarity.

## 1. Backend Architecture

### Overview
The backend of CreatorsCook.com is built on a modern JavaScript/TypeScript stack using Next.js and serverless functions. We follow a component-driven, serverless pattern that separates concerns between API routes, background jobs, and database operations.

### Key Frameworks & Design Patterns
- **Next.js 15 (App Router)**: Handles server-side rendering (SSR) and API routes in a serverless environment. Routes and server components simplify data fetching and rendering.
- **Serverless Functions**: API endpoints are deployed as individual functions (e.g., on Vercel). This scales automatically with load.
- **Background Job Processing**: Long-running tasks (web scraping, AI analysis) are offloaded to a job queue (using Inngest or Vercel Cron Jobs) so the user never waits for them to finish.
- **Modular Service Layer**: Business logic is grouped under `src/services/` for integrations (Apify, TikTok API, Stripe) and AI pipelines, making code easier to maintain and test.

### Scalability, Maintainability, Performance
- **Scalability**: Serverless functions auto-scale; the database (Supabase/PostgreSQL) can be scaled vertically and horizontally. Background jobs run independently of user requests.
- **Maintainability**: A clear folder structure (`app/`, `components/`, `lib/`, `services/`) and TypeScript type checks ensure new developers can onboard quickly.
- **Performance**: Server components handle most data fetching on the server side, reducing client bundle size. Vercel’s global CDN caches static assets and serverless function responses at the edge.

## 2. Database Management

### Technology & Type
- **Supabase** (PostgreSQL-based backend-as-a-service)
  - Offers built-in Row Level Security (RLS)
  - Managed hosting, automatic backups, and scaling

### Data Storage & Access
- **Structured Storage**: Data is organized into tables (products, analysis results, scripts, brand rules, subscriptions).
- **Row Level Security**: Each user can only see their own records, enforced by JWTs from Clerk.
- **Migrations**: Schema changes are tracked via SQL migration files under `supabase/migrations/`, enabling versioned database evolution.
- **Access Patterns**:
  - API routes use an authenticated Supabase client to fetch/store data.
  - Background jobs connect with a service role key (limited permissions) to insert analysis outputs.

## 3. Database Schema

Below is a simplified PostgreSQL schema in human-readable SQL syntax. It shows core tables and relationships.

```sql
-- Users are managed by Clerk, not stored here.

-- 1. Products table: One entry per product container
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Analysis results: Stores AI-generated summaries and scores
CREATE TABLE analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  type TEXT NOT NULL,        -- e.g., 'sentiment_summary', 'virality_breakdown'
  content JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Virality packs: Packaged insights ready for the dashboard
CREATE TABLE virality_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  configuration JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Scripts: User-created or AI-generated scripts
CREATE TABLE scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status TEXT NOT NULL,       -- e.g., 'draft', 'final'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Brand rules: Custom rules per user for compliance checks
CREATE TABLE brand_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  rule_name TEXT NOT NULL,
  rule_definition JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. Subscriptions: Tracks Stripe subscription details
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  stripe_subscription_id TEXT NOT NULL,
  plan TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

## 4. API Design and Endpoints

We use RESTful API routes under `src/app/api/` with serverless functions.

### Authentication & User
- **POST /api/auth/session**: Verify Clerk session token, return user info

### Product Management
- **POST /api/products**: Create a new product container, triggers background ingestion and analysis job
- **GET /api/products**: List all products belonging to the authenticated user
- **GET /api/products/[id]**: Fetch details and latest virality packs for a product

### Analysis & AI
- **POST /api/analysis/run**: Manually trigger AI analysis for a product
- **GET /api/analysis/[productId]**: Retrieve analysis results

### Scripts & Co-Pilot
- **POST /api/scripts**: Save or update a draft/final script
- **GET /api/scripts/[productId]**: List scripts for a product

### Brand Rules & Compliance
- **GET /api/brand-rules**: List user’s rules
- **POST /api/brand-rules**: Create or update a rule

### Subscriptions & Billing
- **POST /api/subscriptions/create**: Create Stripe checkout session
- **POST /api/subscriptions/webhook**: Handle Stripe events to update subscription status

Each endpoint validates the user via Clerk middleware and uses Supabase for data operations.

## 5. Hosting Solutions

- **Platform**: Vercel (serverless-first)
  - **Benefits**:
    - Instant global deployments with zero-downtime
    - Built-in global CDN for static assets and edge caching
    - Automatic scaling of serverless functions
- **Database Hosting**: Supabase (managed PostgreSQL)
  - Built-in daily backups and scaling
  - Row Level Security out of the box

## 6. Infrastructure Components

- **Load Balancers & Edge**: Managed by Vercel’s edge network, routing requests to nearest serverless function location.
- **CDN**: Vercel’s global CDN caches static assets (JS, CSS, images) and can cache API responses.
- **Caching**:
  - HTTP caching headers on read-heavy endpoints (e.g., product metadata)
  - In-memory caches (e.g., within serverless function warm instances) for repeated reads
- **Background Jobs**:
  - **Inngest** or **Vercel Cron** triggers to run ingestion/analysis
  - Dedicated job functions call Apify, TikTok APIs, and the Vercel AI SDK

## 7. Security Measures

- **Authentication**: Clerk handles user sign-up, login, and JWT issuance.
- **Authorization**: Supabase Row Level Security ensures users only access their data.
- **Data Encryption**:
  - TLS for all data in transit
  - Supabase’s AES encryption at rest
- **API Protection**:
  - Clerk middleware guards all protected routes
  - Rate limiting on critical endpoints (e.g., AI calls)
- **Compliance**:
  - No raw scraped data is persisted; only transformed results are stored
  - Stripe PCI compliance handled by Stripe

## 8. Monitoring and Maintenance

- **Logging & Observability**:
  - Integrate Datadog or Logtail for centralized logs from serverless functions and background jobs
  - Track API latency, error rates, and throughput
- **Performance Monitoring**:
  - Use Vercel Analytics and Supabase dashboards
  - Monitor database slow queries via Supabase
- **Maintenance Strategies**:
  - Scheduled database migrations via CI/CD
  - Automated linting and formatting (ESLint, Prettier) in pull request pipelines
  - Regular dependency updates and security audits

## 9. Conclusion and Overall Backend Summary

CreatorsCook.com’s backend is a modern, serverless architecture built on Next.js, Supabase, and Clerk. It balances rapid scalability with strong data isolation and security. Our use of serverless functions and job queues ensures responsive user-facing endpoints and reliable background processing. The clearly defined database schema and modular code structure make it easy to extend features like AI-driven analysis and subscription management.

This setup aligns with the platform’s goals to deliver fast, personalized, and secure virality insights for creators and agencies, all while keeping maintenance overhead low and developer experience high.

---

*Prepared by Senior Full-Stack Development Team*