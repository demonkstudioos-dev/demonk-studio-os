# demOnk OS - Architecture & Prompt Strategy

This document outlines the core architecture of the **demOnk OS** Project Management Suite and provides the "Perfect Master Prompt" to recreate this application from scratch with maximum scalability.

## 1. Project Audit & Improvements
- **Tech Stack:** Next.js 15 (App Router), Supabase (Auth + DB + Realtime), Tailwind CSS, Framer Motion, Lucide Icons.
- **Scalability:** 
    - Supports 3 roles: `ADMIN` (Full control), `PROJECT_MANAGER` (Full project control), `TEAM_MEMBER` (Task & Time focus).
    - Database schema uses dedicated tables for Projects, Members, Tasks, Expenses, Payments, and Time Logs.
    - Security implemented via **Supabase Row Level Security (RLS)** ensuring isolated data access.
- **UI/UX:** High-contrast "Swiss Mono" design, responsive sidebar, data-rich dashboards, and smooth route transitions.

## 2. The Perfect Workable Prompt

**Prompt Title:** Build "demOnk OS" - A High-Performance Enterprise Project Management Suite

**Description:**
Build a production-ready, full-stack Project Management application called **demOnk OS** using Next.js 15 and Supabase. The app is designed for teams of 25-50 people with strict Role-Based Access Control (RBAC).

### Key Features to Implement:
1.  **Multi-Role Dashboard:**
    - **Admin:** Global financial overview (Revenue vs Costs), project health metrics, and user management.
    - **PM:** Project-specific timelines, budget tracking, and team assignment.
    - **Team:** Focused task lists, time-logging interface, and personal performance stats.
2.  **Project Lifecycle:**
    - Project creation with budget, deadline, and description.
    - Tabbed project details: Overview, Tasks, Finance (Budget/Expenses/Revenue), Team, and Timeline.
3.  **Financial Engine:**
    - Expense tracking with categories (Software, Hardware, Salary) and approval states.
    - Revenue/Payment management with "Paid" status and date tracking.
4.  **Team Dynamics:**
    - Profile management with hourly rates for cost calculation.
    - Add/Remove members to specific projects.
5.  **Activity Feed:** A real-time global and project-specific signal feed (activity logs).
6.  **Auth System:** Fully integrated Supabase auth with Login/Signup and automatic profile creation via Postgres triggers.

### Visual Aesthetic:
- **Style:** "Technical Brutalist" / "Swiss Mono".
- **Colors:** Deep Slate (`#0f172a`), Clean White, accent Emerald for success and Rose for alerts.
- **Typography:** Inter (Sans) for UI, JetBrains Mono for data points.
- **Animations:** Use `framer-motion` for page transitions and modal entries.

### Scalability Requirements:
- Use Supabase RLS for all tables.
- Centralized `lib/supabase.ts` for client initialization.
- Reusable UI components (Cards, Stats, Modals).
- Real-time listeners for the Activity Feed.

---

## 3. Deployment Steps for 25-30 People
1. **Supabase Setup:** Initialize a new project and run the provided `supabase_setup.sql`.
2. **Environment Variables:** Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. **Admin Bootstrap:** After signing up the first user, manually change their role to `ADMIN` in the `profiles` table to unlock the global dashboard.
4. **Member Invitation:** Use the Sign-up page for the remainder of the 30-person team.

---

*This application is built for mission-critical project tracking.*
