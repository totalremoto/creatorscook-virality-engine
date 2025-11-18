# Tech Stack Document

This document outlines the technology choices powering the **CreatorsCook.com** platform, built on the `creatorscook-virality-engine` Next.js starter kit. It explains each component in everyday language, so non-technical readers can understand how everything fits together.

---

## 1. Frontend Technologies

These are the tools and libraries used to build the parts of the app that run in your browser and create the interface you see and interact with.

- **Next.js 15 (App Router)**
  - A React framework that simplifies building both page-based and API-driven parts of the app.
  - Supports **server components** for fast, SEO-friendly pages and **client components** for dynamic user interactions.

- **shadcn/ui**
  - A collection of pre-built, customizable React components (buttons, forms, tables) that speed up UI development.
  - Ensures a consistent look and feel across dashboards, editors, and forms.

- **Tailwind CSS v4**
  - A utility-first styling tool that lets developers apply CSS classes directly in markup for rapid, consistent design.

- **next-themes**
  - Manages light and dark mode toggles automatically, giving users control over their preferred color scheme.

- **TypeScript**
  - Adds type checking on top of JavaScript, catching errors early and making the codebase safer and more maintainable.

- **Zustand (optional)**
  - A lightweight state management library considered for complex client-side state in the script editor (Compliant Co-Pilot).

**How these choices enhance user experience:**
- Fast page loads and smooth transitions thanks to server-rendered pages.
- A polished, consistent user interface built quickly with reusable components.
- Easy implementation of dark mode and responsive design across devices.

---

## 2. Backend Technologies

These are the systems and services running on servers, handling data storage, authentication, and business logic behind the scenes.

- **Next.js API Routes & App Router**
  - Server-side endpoints that handle data fetching, form submissions, AI requests, and background triggers.

- **Clerk**
  - Outsourced sign-up, log-in, and session management. Provides secure JWT tokens to identify users and teams.

- **Supabase**
  - A hosted PostgreSQL database with built-in authentication integration and **Row Level Security (RLS)**.
  - Stores products, analysis results, generated scripts, and brand rules. RLS ensures each creator only sees their own data.
  - Migration scripts define and evolve the database schema over time.

- **Vercel AI SDK**
  - A bridge between your code and large language models (Anthropic Claude, OpenAI GPT-4o).
  - Powers the “Angle Reasoning Engine” and “Compliant Co-Pilot” features via streaming chat endpoints.

- **Apify, TikTok Shop & Research APIs**
  - Services that fetch public content and metadata from product URLs and social platforms.
  - Feeds raw signals into the data ingestion pipeline (no raw data is stored, only transformed insights).

- **Inngest (or Vercel Cron Jobs)**
  - A background job framework to handle long-running tasks like scraping, multimodal analysis, and data transformation outside of the immediate API response.

**How these components work together:**
1. Users authenticate via Clerk to get a secure JWT.
2. Frontend calls Next.js API routes (e.g., `/api/products/create`).
3. The route triggers a background job (Inngest) to fetch and analyze data via Apify/TikTok and AI.
4. Processed insights are saved in Supabase (using RLS to isolate data).
5. Frontend fetches and displays results in real time or near-real time.

---

## 3. Infrastructure and Deployment

This layer covers where and how the application is hosted, how code gets from developers’ machines into production, and how the team maintains consistency.

- **Vercel Hosting Platform**
  - Automatically deploys branches and production builds from GitHub.
  - Offers serverless functions for API routes and edge caching for static assets.

- **Git & GitHub**
  - Version control system to track code changes and enable team collaboration.

- **CI/CD Pipelines (GitHub Actions)**
  - Automated workflows that run tests, enforce linting, and deploy to Vercel on merges to `main`.

- **Docker Dev Containers**
  - Standardized development environments that ensure every developer has the same Node.js version, dependencies, and tooling.

- **ESLint & Prettier**
  - Code linting and formatting tools integrated into CI to maintain consistency and best practices.

- **Observability & Monitoring**
  - Tools like Logtail or Datadog (recommended) to collect logs, monitor performance, and track costs from AI/API usage.

**Benefits of these choices:**
- Reliable, repeatable deployments with zero-downtime pushes.
- Fast onboarding for new developers with preconfigured containers.
- Automated quality checks before code reaches production.

---

## 4. Third-Party Integrations

These external services enhance the platform’s functionality without reinventing the wheel.

- **Stripe**
  - Handles subscription billing, payment processing, and webhook events to manage user plans and “Angle Credit” usage.

- **Anthropic Claude & OpenAI GPT-4o**
  - Large language models accessed via the Vercel AI SDK for generating angles, summaries, and script suggestions.

- **Apify & TikTok APIs**
  - Power the data ingestion layer, fetching product detail pages, social signals, and media for analysis.

- **Logtail / Datadog**
  - Centralizes application logs and metrics to help debug errors, monitor performance, and control third-party costs.

**How these integrations help:**
- Offload complex services (billing, AI, scraping) to specialized vendors.
- Accelerate time to market by using battle-tested APIs.
- Gain deep insights into application health and usage patterns.

---

## 5. Security and Performance Considerations

Security and performance are built in from day one to keep user data safe and ensure a snappy experience.

- **Authentication & Authorization**
  - Clerk issues JWTs for secure user sessions.
  - Next.js middleware guards all protected routes, redirecting unauthenticated users to log in.
  - Supabase RLS ensures database queries only return rows belonging to the authenticated user.

- **Data Protection**
  - No raw scraped data is stored. Only transformed insights and summaries live in the database.
  - HTTPS everywhere, enforced by Vercel.

- **Error Handling & Logging**
  - Consistent try/catch patterns in API routes and background jobs.
  - Structured logs sent to Logtail/Datadog for rapid troubleshooting.

- **Performance Optimizations**
  - Server components for data-heavy pages reduce client workload.
  - Streaming AI responses provide incremental feedback in the UI.
  - Caching static assets and edge functions on Vercel for global low-latency delivery.

---

## 6. Conclusion and Overall Tech Stack Summary

CreatorsCook.com leverages a modern, full-stack JavaScript architecture designed for speed, security, and scalability:

- **Frontend:** Next.js, React Server Components, shadcn/ui, Tailwind CSS, next-themes, TypeScript
- **Backend:** Next.js API Routes, Clerk, Supabase (PostgreSQL + RLS), Vercel AI SDK, Apify & TikTok scraping, Inngest
- **Infrastructure:** Vercel hosting, GitHub Actions, Docker Dev Containers, ESLint/Prettier
- **Integrations:** Stripe, Anthropic & OpenAI models, Logtail/Datadog
- **Security & Performance:** JWT auth, RLS, HTTPS, error logging, server-side rendering, edge caching

Together, these choices ensure:
- A fast, polished user interface that creators and agencies will love.
- Rock-solid data isolation for multi-tenant privacy and compliance.
- Flexible AI services for powering unique angle generation and script guidance.
- A developer-friendly environment that accelerates feature delivery and maintains high code quality.

This tech stack provides a future-proof foundation for CreatorsCook.com’s ambitious B2B SaaS goals, letting the team focus on building the core “Angle Reasoning Engine” and unique value propositions rather than reinventing infrastructure from scratch.