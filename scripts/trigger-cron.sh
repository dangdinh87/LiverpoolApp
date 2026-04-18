#!/bin/bash

# Trigger a cron job locally
# Usage: ./scripts/trigger-cron.sh <cron_secret> [endpoint] [url]
# Example: ./scripts/trigger-cron.sh my_secret /api/news/sync http://localhost:3000

SECRET=$1
ENDPOINT=${2:-"/api/news/sync"}
BASE_URL=${3:-"http://localhost:3000"}

# Handle legacy usage where endpoint is omitted but URL is provided
if [[ "$ENDPOINT" == http* ]]; then
  BASE_URL=$ENDPOINT
  ENDPOINT="/api/news/sync"
fi

if [ -z "$SECRET" ]; then
  # Try to extract it from .env.local or .env
  if [ -f ".env.local" ]; then
    SECRET=$(grep "^CRON_SECRET=" .env.local | cut -d '=' -f2 | tr -d '"')
  elif [ -f ".env" ]; then
    SECRET=$(grep "^CRON_SECRET=" .env | cut -d '=' -f2 | tr -d '"')
  fi
fi

if [ -z "$SECRET" ]; then
  echo "Error: Please provide a CRON_SECRET or ensure it is set in .env.local"
  echo "Usage: $0 <cron_secret> [endpoint] [url]"
  exit 1
fi

echo "Triggering cron job at $BASE_URL$ENDPOINT..."
# Use curl directly instead of piping to grep so we can capture output properly
OUTPUT=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $SECRET" "$BASE_URL$ENDPOINT")
HTTP_CODE=$(echo "$OUTPUT" | tail -n1)
RESPONSE=$(echo "$OUTPUT" | sed '$d')

if [[ "$HTTP_CODE" == 2* ]]; then
  echo "Cron job triggered successfully!"
  echo "Response: $RESPONSE"
else
  echo "Failed to trigger cron job or it returned an error (HTTP $HTTP_CODE)."
  echo "Response: $RESPONSE"
  exit 1
fi
