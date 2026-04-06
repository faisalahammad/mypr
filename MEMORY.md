# MEMORY.md — mypr.pro.bd

Session state tracker. Update this at the end of every Claude session.
Paste this file (along with CLAUDE.md) at the start of each new session to restore context.

---

## Current Status

**Phase:** Phase 1 — Project Scaffolding (in progress)
**Active task:** 1.2 — Install shadcn/ui components

---

## Completed Tasks

- ✅ **1.1 — Initialize Next.js project**
  - Created Next.js 14 project with TypeScript, App Router, Tailwind CSS
  - Installed dependencies: octokit, html2canvas
  - Initialized shadcn/ui with base configuration
  - Created folder structure as per CLAUDE.md

---

## In Progress

- 🔄 **1.2 — Install shadcn/ui components** (Next task)
  - Need to install: Card, Badge, Avatar, Separator, Skeleton, Dialog, Switch, Tooltip

---

## Manual Steps Required Before Phase 2

**❗ CRITICAL: Supabase Project Setup**

Before starting Phase 2 (Supabase Integration), you must:

1. **Create Supabase Project**
   - Go to https://supabase.com
   - Create new project: `mypr-pro-bd`
   - Choose region closest to your users
   - Save the project URL and anon key

2. **Configure GitHub OAuth App**
   - Go to GitHub Settings → Developer settings → OAuth Apps
   - Create new OAuth App:
     - Application name: `mypr.pro.bd`
     - Homepage URL: `http://localhost:3000` (dev), `https://mypr.pro.bd` (prod)
     - Authorization callback URL: `https://[YOUR-SUPABASE-PROJECT].supabase.co/auth/v1/callback`
   - Save the Client ID and generate Client Secret
   - Add OAuth app to Supabase: Authentication → Providers → GitHub

3. **Set Environment Variables**
   - Create `.env.local` file with:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your-project-url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
     SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
     NEXT_PUBLIC_APP_URL=http://localhost:3000
     ```

4. **Run Database Migrations**
   - After Supabase setup, run the SQL migration to create tables
   - Enable Row Level Security (RLS) policies
   - Create storage buckets if needed

---

## Known Issues / Blockers

_None._

---

## Notes

- shadcn/ui is initialized with Tailwind CSS v4
- Next.js dev server ready: `npm run dev`
- All project dependencies installed (400 packages, no vulnerabilities)
- Folder structure matches CLAUDE.md specification

---

**Last updated:** 2026-04-06 (Phase 1.1 complete)
