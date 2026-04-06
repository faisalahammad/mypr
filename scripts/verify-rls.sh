#!/bin/bash

# Quick RLS verification script
# Run this to verify Row Level Security is enabled on all tables

echo "🔒 Checking Row Level Security status..."
echo ""

# Load environment variables
source .env.local

# Use the Supabase connection info
SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
PROJECT_REF=$(echo $SUPABASE_URL | sed 's|https://||' | sed 's|\.supabase\.co||')

echo "Project: $PROJECT_REF"
echo ""
echo "Please run this SQL in your Supabase SQL Editor:"
echo "https://app.supabase.com/project/${PROJECT_REF}/sql/new"
echo ""
echo "-- Copy and paste this query:"
echo ""
cat <<'EOF'
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'follows', 'repositories', 'pull_requests')
ORDER BY tablename;
EOF
echo ""
echo "Expected result: All tables should show 'rls_enabled = true'"
