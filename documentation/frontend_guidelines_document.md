# Frontend Guideline Document

This document outlines the frontend architecture, design principles, technologies, and best practices for the CreatorsCook.com platform, built on the `creatorscook-virality-engine` Next.js starter kit. It is written in clear, everyday language so that anyone—even without a technical background—can understand how the frontend is set up and how to work with it.

## 1. Frontend Architecture

### Overview
- **Framework:** Next.js 15 (App Router) with TypeScript. This gives us a solid, modern foundation for server-side rendering (SSR), server components, and file-based routing.
- **UI Library:** `shadcn/ui` for building reusable, accessible components.
- **Styling:** Tailwind CSS v4 (utility-first) for fast, consistent styling.
- **Authentication:** Clerk for user sign-up, login, and multi-tenant session management.
- **Database:** Supabase (PostgreSQL) with Row Level Security (RLS) to ensure each user only sees their own data.
- **AI Integration:** Vercel AI SDK to connect to LLMs (Anthropic Claude, OpenAI GPT-4o) for the Angle Reasoning Engine and Compliant Co-Pilot.
- **Theming:** `next-themes` to support light/dark mode toggling.
- **Containerization:** Docker Dev Container for a uniform development environment.

### Scalability, Maintainability, Performance
- **Server Components:** Heavy data fetching and rendering happen on the server, reducing client payloads and improving load times.
- **Modular Folder Structure:** Clear separation of concerns under `src/app/`, `src/components/`, and `src/lib/` makes it easy to add features without tangled code.
- **TypeScript:** Enforces type safety, catching errors early and easing future refactoring.
- **Row Level Security:** Supabase RLS scales securely across many tenants without code changes.
- **AI SDK Abstraction:** The Vercel AI SDK layer lets us swap or combine models without rewriting business logic.

## 2. Design Principles

### Key Principles
- **Usability:** Interfaces are intuitive. Clear labels, consistent button styles, and step-by-step flows guide users through tasks.
- **Accessibility:** Components follow WAI-ARIA guidelines. We use semantic HTML, proper color contrast, and keyboard navigation support.
- **Responsiveness:** Layouts adapt to all screen sizes. Mobile, tablet, and desktop views are tested to ensure consistent experience.
- **Consistency:** A unified look and feel across all pages—buttons, forms, modals—reinforces our brand identity.

### Application in UI Design
- **Form Feedback:** Inline validation messages and clear error states reduce user frustration.
- **Focus States:** Visible outlines on interactive elements help keyboard users.
- **Fluid Grids & Flexbox:** Tailwind’s utility classes (`flex`, `grid`, `gap`) enable responsive layouts with minimal custom CSS.

## 3. Styling and Theming

### Styling Approach
- **Tailwind CSS (v4):** A utility-first framework that keeps CSS close to the markup for rapid development.
- **BEM-like Naming in Custom CSS:** For any custom styles outside Tailwind, we follow a simple Block__Element--Modifier pattern.
- **No Heavy Preprocessors:** Tailwind covers most cases; additional SASS or PostCSS is optional but discouraged.

### Theming
- **next-themes:** Provides a `<ThemeProvider>` wrapper. Users can toggle between light and dark modes; preferences are stored in `localStorage`.
- **Dark Mode Support:** Colors automatically switch in dark mode using Tailwind’s `dark:` variants.

### Style & Look
- **Style:** Modern flat design with subtle glassmorphism touches on modals and cards (semi-transparent backgrounds, soft shadows).
- **Font:** Inter — a modern, legible sans-serif font. Fallback: system-ui, sans-serif.

### Color Palette
- **Primary:** #4F46E5 (Indigo 600)  
- **Secondary:** #7C3AED (Purple 500)  
- **Accent/Teal:** #14B8A6 (Teal 500)  
- **Background (Light):** #F9FAFB  
- **Background (Dark):** #111827  
- **Text (Dark mode):** #F3F4F6  
- **Text (Light mode):** #1F2937  
- **Neutral/Border:** #E5E7EB  

## 4. Component Structure

### Organization
- **`src/app/`:** Route-based folders using Next.js App Router. Each folder may contain `page.tsx`, `layout.tsx`, and subfolders for nested routes.
- **`src/components/`:** Shared UI and layout components (buttons, inputs, cards).
  - **`ui/`:** Themed `shadcn/ui` components customized for branding (e.g., `<Button>`, `<Modal>`).
- **`src/lib/`:** Helper functions and service wrappers:
  - `supabase.ts` (authenticated Supabase client),
  - `user.ts` (current user utilities),
  - `aiClient.ts` (Vercel AI SDK wrapper).

### Reusability & Maintainability
- **Atomic Components:** Small, single-purpose components (e.g., `<Avatar>`, `<IconButton>`).
- **Composite Components:** Combine atomic pieces into higher-level UI (e.g., `<ProductCard>`, `<ScriptEditor>`).
- **Folder-by-Feature:** Future features (ingestion, AI analysis) get their own subfolders under `src/services/` or `src/lib/server/`.

## 5. State Management

### Approach
- **Server State:** Fetched in server components using Next.js data fetching (`fetch` or Supabase client). No external library needed.
- **Client State:** Local `useState` or `useReducer` for simple UI toggles and forms.
- **Global UI State:** React Context for theme or user preferences.

### Advanced State Needs
- For complex, shared client state—such as real-time script editing—you can introduce a lightweight state manager like **Zustand** or **Jotai**. These keep code simple yet scalable.

## 6. Routing and Navigation

### Next.js App Router
- **File-Based Routing:** Any folder under `src/app/` with a `page.tsx` becomes a route.
- **Dynamic Routes:** Use brackets: `app/products/[productId]/page.tsx` for product-specific dashboards.
- **Layouts & Nested Layouts:** `layout.tsx` wraps children routes, sharing headers, sidebars, and providers.

### Navigation Structure
- **Public Routes:** `/signin`, `/signup`, `/` (landing page).
- **Protected Routes:** Wrapped in Clerk middleware (`middleware.ts`), under `/dashboard` or route group `(app)/(dashboard)`.
- **Client Links:** `<Link href="/dashboard/products/123" />` for fast, client-side navigation.

## 7. Performance Optimization

- **Server Components:** Offload heavy rendering to the server to reduce JavaScript on the client.
- **Code Splitting:** Next.js automatically splits code per route. For large components (e.g., script editor), use dynamic imports (`next/dynamic`).
- **Lazy Loading:** Defer non-critical components or third-party SDKs until needed (e.g., chart libraries).
- **Image Optimization:** Use `next/image` for automatic resizing and lazy loading.
- **Cache Control:** Leverage Next.js cache headers and ISR (Incremental Static Regeneration) where appropriate.

## 8. Testing and Quality Assurance

### Testing Strategy
- **Unit Tests:** Jest + React Testing Library for components and utility functions (`src/lib/`, `src/services/`).
- **Integration Tests:** Test API routes and Supabase interactions with a test database or Supabase’s testing tools.
- **End-to-End (E2E) Tests:** Playwright or Cypress to simulate real user flows (sign up, product creation, AI analysis, script editing).

### Tools & Workflow
- **ESLint & Prettier:** Enforce coding style and find errors early. Integrated into CI pipeline.
- **Type Checking:** `tsc --noEmit` in CI to catch type errors.
- **Continuous Integration:** Run tests and lint in GitHub Actions or similar on every pull request.

## 9. Conclusion and Overall Frontend Summary

The CreatorsCook.com frontend blends Next.js 15’s modern architecture with Tailwind CSS, `shadcn/ui`, Clerk, Supabase, and the Vercel AI SDK to create a scalable, maintainable, and high-performing platform. Key takeaways:

- A **modular structure** and **server components** keep complexity in check.
- **Design principles**—usability, accessibility, responsiveness—ensure a cohesive user experience.
- **Theming**, **styling**, and a clear **color palette** reinforce brand consistency.
- **State** and **routing** leverage Next.js features with options for advanced needs.
- **Performance** best practices and a **robust testing strategy** safeguard quality as the app grows.

With these guidelines in place, any developer joining the project can quickly understand how the frontend works, how to extend it, and how to maintain a consistently high standard across all UI and code.

---
*End of Frontend Guideline Document*