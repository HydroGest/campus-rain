#!/usr/bin/env bash
set -u

TOKEN_FILE="$HOME/.campus-rain-token"
LAST_FILE="$HOME/.campus-rain-last"
INTERVAL_SEC=$((45 * 60))

if [ -f "$LAST_FILE" ]; then
  last=$(stat -c %Y "$LAST_FILE")
  now=$(date +%s)
  age=$((now - last))
  if [ "$age" -lt "$INTERVAL_SEC" ]; then
    echo "skip: last run ${age}s ago"
    exit 0
  fi
fi

if [ ! -f "$TOKEN_FILE" ]; then
  echo "missing token file"
  exit 1
fi

code=$(curl -sS -m 20 -o /tmp/campus-rain-dispatch.out -w '%{http_code}' -X POST \
  -H "Authorization: Bearer $(cat "$TOKEN_FILE")" \
  -H "Accept: application/vnd.github+json" \
  -H "Content-Type: application/json" \
  https://api.github.com/repos/HydroGest/campus-rain/actions/workflows/weather.yml/dispatches \
  -d '{"ref":"main"}')

touch "$LAST_FILE"
if [ "$code" = "204" ]; then
  echo "triggered ok $(date -Is)"
else
  echo "trigger failed http=$code"
  cat /tmp/campus-rain-dispatch.out
  exit 1
fi
