# Project Requirements Document (PRD) for `creatorscook-virality-engine`

---

## 1. Project Overview

CreatorsCook.com is a B2B SaaS platform built on a Next.js starter kit called `creatorscook-virality-engine`. Its main goal is to help product creators and marketing agencies generate data-driven, AI-powered marketing angles and compliant script drafts (the “Angle Reasoning Engine” and “Compliant Co-Pilot”). Instead of building boilerplate infrastructure from scratch, the team leverages this kit’s integrated authentication, database, UI, and AI plumbing so they can focus on the core intellectual property.

We’re building this platform to streamline the ideation-to-script workflow. Creators paste a product URL, the system ingests relevant public data (social metrics, feeds it through multimodal AI pipelines, and outputs “Virality Packs” with pain points, virality factors, and brand-safe script suggestions. Success is measured by secure multi-tenant isolation, AI accuracy in angle generation (target ≥80% relevance), sub-2-second dashboard loads, and a seamless script-editing experience with real-time AI feedback.

---

## 2. In-Scope vs. Out-of-Scope

### In-Scope (Version 1)

- User sign-up, login, and session management via Clerk (JWT-based).
- Multi-tenant data isolation enforced by Supabase Row Level Security (RLS).
- Product-container creation: users submit a URL, trigger ingestion.
- Data ingestion pipeline (serverless API endpoint) that enqueues or runs scraping + analysis jobs.
- Angle Reasoning Engine API: AI calls to Claude 3 or GPT-4o via Vercel AI SDK.
- Virality Pack dashboard: visual display of AI-generated insights (pain points, share triggers).
- Compliant Co-Pilot script editor: rich text area with streaming LLM suggestions.
- Brand rule management: simple UI to define do’s/don’ts for scripts.
- Dark mode support using Tailwind CSS and next-themes.
- Docker-based dev container for consistent local setup.
- Basic error handling and user feedback (spinners, toasts).

### Out-of-Scope (Planned for Later Phases)

- Subscription and billing integration (Stripe).
- Advanced analytics beyond the initial Virality Pack.
- Push notifications or in-app messaging.
- Mobile-optimized views or native apps.
- Full background job processing framework (e.g., Inngest): out-of-the-box support is stubbed.
- A/B testing framework and performance dashboards.
- Internationalization/localization (i18n).

---

## 3. User Flow

A new user lands on the marketing site, clicks “Get Started,” and signs up with email/password or OAuth via Clerk. Once logged in, they are redirected to the dashboard, which shows existing Product Containers (initially empty). The primary call to action is a button to “Create New Container.”

The user enters a product URL and clicks “Analyze.” The frontend calls `/api/products/create`, which validates the URL and triggers the ingestion pipeline. While the job runs, the user sees a loading state. When complete, the dashboard refreshes and displays a card for the new container. Clicking the card opens the Product Container page, where the Virality Pack insights render in server-side components for fast load.

From that page, the user navigates to the “Script Editor” tab. Here, they draft or paste a script. The Compliant Co-Pilot (powered by a streaming LLM endpoint) offers inline suggestions and highlights compliance issues based on the user’s custom brand rules. The user can accept, edit, or reject suggestions in real time. Finally, they export the finalized script or start another analysis.

---

## 4. Core Features

- **Authentication & Authorization**  
  Secure sign-up/login with Clerk. JWT tokens passed to Supabase for RLS.
- **Multi-Tenant Data Isolation**  
  Supabase Row Level Security ensures each user sees only their own containers and data.
- **Product Container Management**  
  Create, list, and delete containers linked to unique product URLs.
- **Data Ingestion API**  
  Endpoint to validate URLs, scrape data (via Apify), and enqueue AI analysis tasks.
- **Angle Reasoning Engine**  
  Backend service calling Vercel AI SDK to Claude 3 or GPT-4o to generate pain points and share triggers.
- **Virality Pack Dashboard**  
  UI modules displaying AI-generated metrics, charts, and textual insights.
- **Compliant Co-Pilot Script Editor**  
  Rich text editor with streaming LLM suggestions, compliance highlighting based on brand rules.
- **Brand Rule Management**  
  CRUD interface for custom do’s/don’ts that feed into the compliance engine.
- **UI & Theming**  
  shadcn/ui components, Tailwind CSS v4, dark mode via next-themes.
- **Development Environment**  
  Docker dev containers, TypeScript, ESLint, Prettier.

---

## 5. Tech Stack & Tools

- **Frontend Framework**: Next.js 15 (App Router) with React Server and Client Components.
- **Language & Typing**: TypeScript for end-to-end type safety.
- **UI Library**: shadcn/ui + Tailwind CSS v4.
- **Theming**: next-themes for dark/light mode.
- **Authentication**: Clerk for user management (OAuth, email/password).
- **Database**: Supabase (PostgreSQL) with built-in Row Level Security and migrations.
- **AI Integration**: Vercel AI SDK connecting to Anthropic Claude and OpenAI GPT-4o.
- **Data Ingestion**: Apify SDK or custom serverless functions for scraping.
- **Containerization**: Dev Container (Docker) for consistent local environments.
- **IDE Integrations** (optional): GitHub Copilot, Cursor.dev plugins, Windsurf for AI-assisted coding.
- **Testing & CI/CD**: Jest for unit tests, Playwright for E2E, GitHub Actions for linting and builds.

---

## 6. Non-Functional Requirements

- **Performance**  
  • Initial page load ≤2s on 3G simulated network.  
  • Standard API (non-ingestion) responses ≤400ms.
- **Scalability**  
  Architected to support hundreds of concurrent users and dozens of ingestion jobs per hour.
- **Security & Compliance**  
  TLS everywhere, JWT auth, RLS on all Supabase tables, OWASP-level best practices.
- **Usability & Accessibility**  
  WCAG 2.1 AA compliance: keyboard nav, ARIA labels, contrast ratios.
- **Reliability**  
  99.9% uptime for core APIs; retry logic with exponential backoff for external calls.
- **Maintainability**  
  Modular codebase with clear folder conventions, TypeScript typings, documented public interfaces.

---

## 7. Constraints & Assumptions

- **AI Model Availability**  
  Access to Claude 3 and GPT-4o via Vercel AI SDK is stable and within rate limits.
- **External Services**  
  Supabase, Clerk, and Apify accounts are set up and accessible from deployed environment.
- **Background Jobs**  
  Initially handled inline or via serverless function calls—no separate worker cluster in v1.
- **Network & Hosting**  
  Deployed on Vercel or similar platform supporting Next.js serverless functions.
- **User Behavior**  
  Assumes users input valid, publicly accessible product URLs.

---

## 8. Known Issues & Potential Pitfalls

- **API Rate Limits**  
  • Apify or TikTok API may throttle calls.  
  Mitigation: implement queueing, exponential backoff, and fallback messages to user.
- **Long-Running Ingestion**  
  Scraping+analysis can exceed serverless timeouts.  
  Mitigation: break into smaller jobs or integrate a background job runner in v2 (e.g., Inngest).
- **Data Consistency**  
  Partial failures could leave stale containers.  
  Mitigation: use database transactions or a status field (`pending`, `completed`, `failed`).
- **LLM Costs & Variability**  
  High token usage can inflate bills; outputs may vary.  
  Mitigation: set max token limits, caching common prompts, allow model selection per task.
- **UI State Complexity**  
  Streaming AI responses in the editor may conflict with user typing.  
  Mitigation: debounce user input, queue suggestions, and provide an undo/redo stack.

---

This document serves as the single source of truth for all future technical artifacts—tech stack details, frontend guidelines, backend architecture, file structure, and CI/CD rules—ensuring every team member and AI model has a crystal-clear understanding of the foundation and scope of `creatorscook-virality-engine`.