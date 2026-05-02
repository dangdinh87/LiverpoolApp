#!/bin/bash

# Trigger the sync cron job
# Usage: ./scripts/trigger-cron.sh <cron_secret> [endpoint] [url]
# Example: ./scripts/trigger-cron.sh my_secret /api/news/sync http://localhost:3000
# Example (backward compatible): ./scripts/trigger-cron.sh my_secret http://localhost:3000

SECRET=$1
ENDPOINT="/api/news/sync"
BASE_URL="http://localhost:3000"

if [ -n "$2" ]; then
  if [[ "$2" == http* ]]; then
    BASE_URL=$2
  else
    ENDPOINT=$2
    if [ -n "$3" ]; then
      BASE_URL=$3
    fi
  fi
fi

if [ -z "$SECRET" ]; then
  # Try to extract it from .env.local or .env
  if [ -f ".env.local" ]; then
    SECRET=$(grep "^CRON_SECRET=" .env.local | cut -d '=' -f2 | tr -d '"'\''\r ')
  elif [ -f ".env" ]; then
    SECRET=$(grep "^CRON_SECRET=" .env | cut -d '=' -f2 | tr -d '"'\''\r ')
  fi
fi

if [ -z "$SECRET" ]; then
  echo "Error: Please provide a CRON_SECRET or ensure it is set in .env.local"
  echo "Usage: $0 <cron_secret> [endpoint] [url]"
  exit 1
fi

echo "Triggering cron job at $BASE_URL$ENDPOINT..."
curl -s -H "Authorization: Bearer $SECRET" "$BASE_URL$ENDPOINT" | grep '"ok":true' > /dev/null

if [ $? -eq 0 ]; then
  echo "Cron job triggered successfully!"
else
  echo "Failed to trigger cron job or it returned an error."
  # Show output for debugging
  curl -H "Authorization: Bearer $SECRET" "$BASE_URL$ENDPOINT"
  exit 1
fi
