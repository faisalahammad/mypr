#!/bin/bash

# Migration script for mypr.pro.bd
# This script executes the SQL migration using the Supabase REST API

set -e

# Load environment variables
source .env.local

SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
SUPABASE_KEY=$SUPABASE_SERVICE_ROLE_KEY

echo "🚀 Running database migration..."

# Extract project ref from URL
PROJECT_REF=$(echo $SUPABASE_URL | sed 's|https://||' | sed 's|\.supabase\.co||')

echo "📡 Connecting to Supabase project: $PROJECT_REF"

# Read the migration file
SQL_CONTENT=$(cat supabase/migrations/001_initial_schema.sql)

# Use psql if available, otherwise provide instructions
if command -v psql &> /dev/null; then
    echo "✅ Using psql to execute migration..."

    # Construct PostgreSQL connection string
    # Note: You'll need the database password for this
    DB_CONNECTION_STRING="postgresql://postgres:${SUPABASE_DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres"

    echo "$SQL_CONTENT" | psql "$DB_CONNECTION_STRING"

    echo "✅ Migration completed successfully!"
else
    echo "⚠️  psql not found. Please run the migration manually:"
    echo ""
    echo "1. Go to: https://app.supabase.com/project/${PROJECT_REF}/sql"
    echo "2. Copy and paste the contents of: supabase/migrations/001_initial_schema.sql"
    echo "3. Click 'Run' to execute the migration"
    echo ""
    echo "Or install PostgreSQL client tools:"
    echo "  brew install postgresql  # macOS"
    echo "  sudo apt install postgresql-client  # Ubuntu"
fi
