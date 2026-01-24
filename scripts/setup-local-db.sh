#!/bin/bash

# Script to set up local Postgres database
# Usage: ./scripts/setup-local-db.sh [database_name] [username] [host] [port]

DB_NAME="${1:-femmli_casestudy}"
DB_USER="${2:-postgres}"
DB_HOST="${3:-localhost}"
DB_PORT="${4:-5432}"
MIGRATION_FILE="supabase/migrations/local_setup.sql"

echo "Setting up local database: $DB_NAME"
echo "Using user: $DB_USER"
echo ""

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "Error: psql command not found. Please install PostgreSQL client tools."
    exit 1
fi

# Check if migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "Error: Migration file not found: $MIGRATION_FILE"
    exit 1
fi

# Run the migration
echo "Running migration..."
PGPASSWORD="${PGPASSWORD:-postgres}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database setup complete!"
    echo ""
    echo "Connection string example:"
    echo "  postgresql://$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
    echo ""
    echo "For Docker setup, password is: postgres"
else
    echo ""
    echo "❌ Migration failed. Make sure:"
    echo "  1. PostgreSQL is running (try: npm run db:start)"
    echo "  2. Database '$DB_NAME' exists"
    echo "  3. User '$DB_USER' has proper permissions"
    echo "  4. If using Docker, set PGPASSWORD=postgres"
    exit 1
fi
