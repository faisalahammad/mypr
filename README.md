# mypr.pro.bd

A developer portfolio tool that turns your merged pull requests into a public timeline. Connect your GitHub account, pick which repos to showcase, and let your open source work speak for itself.

**Live app:** [mypr.pro.bd](https://mypr.pro.bd)

## Features

- **GitHub OAuth sign-in** — authenticate with your existing GitHub account, no separate registration
- **Public PR timeline** — every visitor can browse a user's merged pull requests at `mypr.pro.bd/<username>`
- **Selective repo showcase** — choose exactly which public repositories appear on your profile
- **Home feed** — follow other developers and see their merged PRs in one place
- **Automatic syncing** — merged PRs are fetched from GitHub and cached, with scheduled background syncing
- **Shareable screenshots** — export your PR timeline as an image directly from the browser

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js](https://nextjs.org) (App Router) |
| Language | TypeScript (strict mode) |
| Auth + Database | [Supabase](https://supabase.com) |
| Styling | Tailwind CSS + shadcn/ui + Lucide React |
| GitHub API | [Octokit](https://github.com/octokit/octokit.js) |
| Screenshots | html2canvas |
| Hosting | Vercel |

## Getting Started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- A [GitHub OAuth App](https://github.com/settings/developers)

### Setup

1. Clone the repository

   ```bash
   git clone https://github.com/faisalahammad/mypr.git
   cd mypr
   ```

2. Install dependencies

   ```bash
   npm install
   ```

3. Configure environment variables

   Create a `.env.local` file in the project root with your own values:

   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

   See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for full database and OAuth configuration steps.

4. Run the development server

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to see the result.

### Testing

```bash
npm test              # run the test suite
npm run test:watch    # watch mode
npm run test:coverage # coverage report
```

## Project Structure

```
/app
  /api            → GitHub OAuth callback and PR sync API routes
  /(app)/feed     → Home timeline (protected)
  /(app)/[username] → Public profile + PR timeline
  /(app)/settings → Repo configuration (protected)
  /changelog      → Public changelog page
/components       → Shared UI and feature components
/lib              → Supabase client, GitHub helpers, shared utilities
/types            → Shared TypeScript types
/supabase         → Database migrations
```

## Contributing

Issues and pull requests are welcome. Please open an issue first to discuss significant changes before submitting a PR.

## License

This project does not currently specify a license. All rights reserved unless otherwise stated.

---

[![Powered by DartNode](https://dartnode.com/branding/DN-Open-Source-sm.png)](https://dartnode.com "Powered by DartNode - Free VPS for Open Source")
