#!/bin/bash

# Direct migration execution via PostgreSQL connection
# This script connects directly to Supabase PostgreSQL to run migrations

set -e

# Load environment variables
source .env.local

SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
PROJECT_REF=$(echo $SUPABASE_URL | sed 's|https://||' | sed 's|\.supabase\.co||')

echo "🚀 Running database migration for mypr.pro.bd"
echo "📡 Project: $PROJECT_REF"
echo ""
echo "⚠️  This script requires your Supabase database password."
echo "   You can find it in: https://app.supabase.com/project/${PROJECT_REF}/settings/database"
echo ""
echo "   Alternatively, run the migration manually in the SQL Editor:"
echo "   https://app.supabase.com/project/${PROJECT_REF}/sql/new"
echo ""
echo "   Files to execute in order: supabase/migrations/*.sql"
echo ""

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ psql is not installed."
    echo ""
    echo "Please install PostgreSQL client:"
    echo "  macOS:   brew install postgresql"
    echo "  Ubuntu:  sudo apt install postgresql-client"
    echo ""
    echo "Or run the migration manually in Supabase Dashboard → SQL Editor"
    exit 1
fi

# Prompt for database password
echo -n "Enter Supabase database password: "
read -s DB_PASSWORD
echo ""

if [ -z "$DB_PASSWORD" ]; then
    echo "❌ Password cannot be empty"
    exit 1
fi

# Construct connection string
CONNECTION_STRING="postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres"

# Execute migrations
echo "📊 Executing migrations..."
MIGRATION_FILES=$(find supabase/migrations -maxdepth 1 -name '*.sql' | sort)

if [ -z "$MIGRATION_FILES" ]; then
    echo "❌ No migration files found in supabase/migrations"
    exit 1
fi

if cat $MIGRATION_FILES | psql "$CONNECTION_STRING"; then
    echo ""
    echo "✅ Migrations completed successfully!"
    echo ""
    echo "Database schema updated with:"
    echo "  ✓ profiles table"
    echo "  ✓ follows table"
    echo "  ✓ repositories table"
    echo "  ✓ pull_requests table"
    echo "  ✓ RLS policies enabled"
    echo "  ✓ Indexes created"
    echo "  ✓ Triggers set up"
    echo "  ✓ Public visibility RPCs/functions"
else
    echo ""
    echo "❌ Migration failed!"
    echo "Please check the error messages above and try again."
    exit 1
fi
