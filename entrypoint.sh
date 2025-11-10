#!/bin/sh
# This script runs database migrations and then starts the application.

# 1. Run Prisma migrations
echo "Running database migrations..."
npx prisma migrate deploy

# 2. Check if migration was successful
if [ $? -ne 0 ]; then
  echo "Migration failed. Exiting."
  exit 1
fi

echo "Migrations complete."

# 3. Execute the Docker CMD (which is "node server.js")
# 'exec "$@"' passes control to the CMD from the Dockerfile
exec "$@"