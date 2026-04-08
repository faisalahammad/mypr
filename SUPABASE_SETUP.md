# Supabase Setup Guide for mypr.pro.bd

## Current Status
✅ Environment variables configured
✅ Supabase client installed
✅ Migration files created
⚠️ Database migration needs to be executed

## Option 1: Run Migration via SQL Editor (Recommended - Easiest)

1. **Open Supabase SQL Editor**
   - Go to: https://app.supabase.com/project/xlayjufjlhfgkblymdsu/sql/new

2. **Run the migration**
   - Open file: `supabase/migrations/001_initial_schema.sql`
   - Copy entire contents
   - Paste into SQL Editor
   - Click "Run" button

3. **Verify migration**
   ```sql
   -- Check if tables exist
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
   ORDER BY table_name;
   ```

   Expected output:
   ```
   table_name
   ---------------
   follows
   profiles
   pull_requests
   repositories
   ```

## Option 2: Run Migration via PostgreSQL Connection

If you have `psql` installed:

```bash
# Install PostgreSQL client if needed
# macOS: brew install postgresql
# Ubuntu: sudo apt install postgresql-client

# Run the migration script
./scripts/direct-migrate.sh
```

You'll need your Supabase database password from:
https://app.supabase.com/project/xlayjufjlhfgkblymdsu/settings/database

## Option 3: Run Migration via Supabase CLI

```bash
# Link your Supabase project
supabase link --project-ref xlayjufjlhfgkblymdsu

# Push the migration
supabase db push
```

## Verify GitHub OAuth Configuration

1. **Check GitHub OAuth App**
   - Go to: https://github.com/settings/developers
   - Find your OAuth app for mypr.pro.bd
   - Note the Client ID and verify the callback URL

2. **Configure in Supabase**
   - Go to: https://app.supabase.com/project/xlayjufjlhfgkblymdsu/auth/providers
   - Enable GitHub provider
   - Add your GitHub OAuth credentials:
     - Client ID: from GitHub OAuth app
     - Secret: from GitHub OAuth app
   - Provider callback URL stays: `https://xlayjufjlhfgkblymdsu.supabase.co/auth/v1/callback`
   - Site URL: `https://mypr.pro.bd`
   - Add Redirect URLs:
     - `https://mypr.pro.bd/api/auth/callback`
     - `https://*.vercel.app/api/auth/callback`
     - `http://localhost:3000/api/auth/callback`

3. **Update GitHub OAuth App Callback URL**
   - In GitHub OAuth app settings, add this callback URL:
     `https://xlayjufjlhfgkblymdsu.supabase.co/auth/v1/callback`

## Test the Setup

After migration is complete, test the connection:

```bash
# Test Supabase connection
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

supabase.from('profiles').select('*').limit(1)
  .then(({ data, error }) => {
    if (error) console.error('❌ Connection failed:', error.message);
    else console.log('✅ Connection successful!');
  });
"
```

## What Gets Created

The migration creates:

### Tables
- **profiles** - User profiles with GitHub info
- **follows** - Who follows whom
- **repositories** - User's selected GitHub repositories
- **pull_requests** - Cached merged PR data

### Security
- ✅ Row Level Security (RLS) enabled on all tables
- ✅ Policies for authenticated users
- ✅ Public read access for profiles and PRs
- ✅ Private write access for own data

### Performance
- ✅ Indexes on foreign keys
- ✅ Indexes on frequently queried columns
- ✅ Composite unique constraints

### Automation
- ✅ Auto-create profile on user signup
- ✅ Trigger to handle new GitHub OAuth users

## Next Steps

After migration is complete:

1. ✅ Test GitHub OAuth sign-in
2. ✅ Create first user account
3. ✅ Verify profile is auto-created
4. ✅ Proceed with Phase 2: Supabase Integration

## Troubleshooting

**Migration fails with "permission denied"**
- Ensure you're using the service role key
- Check RLS policies allow service role operations

**GitHub OAuth not working**
- Verify the GitHub OAuth app callback URL still points to Supabase
- Verify the app callback URL is present in Supabase Redirect URLs
- Verify the Supabase Site URL is `https://mypr.pro.bd`
- Check GitHub OAuth app credentials
- Ensure GitHub provider is enabled in Supabase

**Tables not found after migration**
- Check SQL Editor for error messages
- Verify migration completed successfully
- Try running migration again

## Need Help?

If you encounter issues:

1. Check Supabase logs: https://app.supabase.com/project/xlayjufjlhfgkblymdsu/logs
2. Review migration output in SQL Editor
3. Verify environment variables are correct
4. Check GitHub OAuth app settings
