# App Flow Document for CreatorsCook.com

## Onboarding and Sign-In/Sign-Up

When a brand-new user first visits CreatorsCook.com, they land on a public home page that highlights the core benefits of the platform. From there, they can click a prominent "Get Started" button to begin registration. The registration page offers two methods: signing up with an email and password or using a linked social login such as Google. In the email path, the user enters their address and a chosen password, then receives a verification email. Clicking the link in that email returns them to the site with their account activated. The social login path redirects the user to the provider’s authentication screen, and upon approval, the user is redirected back and their account is created automatically.

After registration, the user is prompted to complete their profile by entering a display name and selecting a preferred theme (light or dark). Once the profile is saved, they are taken to the main dashboard. If an existing user returns, they can click “Sign In” on the landing page. They enter their email and password or choose the social login option. On successful authentication, they are redirected to the dashboard. If a user forgets their password, they click “Forgot Password” on the sign-in page, enter their email, and receive a reset link. Following that link leads them to a secure page where they pick a new password. After submitting, they can sign in immediately.

Signing out is accessible via a profile menu in the top-right corner of every page. Clicking “Sign Out” ends the session and returns the user to the public landing page.

## Main Dashboard or Home Page

Upon logging in, the user lands on the main dashboard, which serves as the central hub. A vertical sidebar on the left lists core areas: Home, My Products, Create New Product, Virality Packs, Script Editor, Settings, and Billing. Along the top is a header showing the user’s name and a quick theme toggle. The main section displays a welcome message with recent activity, such as newly created products or generated packs. Below this, the user sees a snapshot of their latest virality analyses, each shown as a card with a thumbnail and status.

From this dashboard, the user can click any card to go directly to its product container page. They can click “My Products” in the sidebar to view a complete list of product containers. The “Create New Product” link opens the product creation flow. The “Virality Packs” link takes the user to an index page of all detailed analyses. The “Script Editor” link opens the Compliant Co-Pilot, where the user can draft content based on their products. The sidebar clearly highlights the current page so that navigation feels seamless.

## Detailed Feature Flows and Page Transitions

When the user clicks “Create New Product,” they arrive at a page with a simple form to enter a product URL and a container name. After clicking “Generate,” the form validates the URL format. If valid, the user sees a spinner and a message that ingestion is in progress. Behind the scenes, a background job scrapes the source and runs AI analysis. When the job finishes, the user is automatically navigated to the new product container page.

The product container page features tabs at the top: Overview, Virality Details, Brand Rules, and Activity Log. On the Overview tab, the user sees key summaries like pain points and a high-level virality score. The Virality Details tab breaks down metrics and renders AI-generated insights. The Brand Rules tab allows the user to define custom rules that will guide the Compliant Co-Pilot. The Activity Log tab shows timestamps of ingestion and analysis events.

From the product container, the user can click “Open Script Editor” to launch the Compliant Co-Pilot. This opens an interactive code editor on the right side, with a chat interface on the left. The user can ask for script suggestions or compliance checks, and the AI streams responses live. They can accept suggestions, make edits, and save the final script. Saved scripts appear in a list accessible via the “Script Editor” link in the sidebar.

If the user clicks “Virality Packs” in the sidebar, they reach a page listing all packs generated across their containers. Clicking a pack opens a detailed view showing the pack’s components, visuals, and export options.

For advanced workflows, users with admin privileges can access an Admin Panel via a separate sidebar section. The Admin Panel includes user management screens where they can view all accounts, adjust roles, and inspect usage metrics. Only users with the admin role see this option.

## Settings and Account Management

Users reach the Settings page by clicking the sidebar link or the profile menu in the header. On the Profile tab, they update their display name, email, and password. A theme option toggles between light and dark modes. The Notifications tab lets users choose which email updates they receive, such as job completion alerts or billing reminders.

The Billing tab integrates with Stripe. Users see their current subscription plan, renewal date, and usage statistics for Angle Credits. They can click “Manage Subscription” to open the Stripe-hosted customer portal in a new window, where they swap plans or update payment methods.

After making any changes, a confirmation appears and the user can click “Back to Dashboard” or use the sidebar to navigate elsewhere.

## Error States and Alternate Paths

If a user enters an invalid URL during product creation, an inline error message appears below the input field explaining the issue. They remain on the form to correct it. During ingestion or analysis, if a network error occurs, the user sees a toast notification saying “Something went wrong. Please try again.” They can retry or contact support via a link.

If a user attempts to access a protected route without signing in, the middleware redirects them to the sign-in page with a note that they must log in first. When an expired session is detected, the user sees a prompt to re-authenticate.

In the Compliant Co-Pilot, if the AI service fails or returns an error, the chat area displays a message and a “Retry” button. If a job takes too long, a timeout message appears, and the user can cancel the job or rerun it.

## Conclusion and Overall App Journey

From exploring CreatorsCook.com on the landing page to successfully generating AI-driven insights, the user’s journey is smooth and self-guided. They sign up easily, land on a clean dashboard, and either create a new product container or pick up where they left off. Core flows like ingestion, virality analysis, and script editing move the user toward publishing compelling content. Settings and billing are accessible but unobtrusive, and error states are handled gracefully. In daily use, a creator logs in, reviews their latest virality packs, refines scripts in the Compliant Co-Pilot, and confidently publishes content—all within a single, connected experience.