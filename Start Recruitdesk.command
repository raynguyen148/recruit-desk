#!/bin/zsh
set -eu
cd "${0:A:h}"
if ! command -v node >/dev/null 2>&1; then
  print 'Node.js is needed to serve this offline app. Install Node.js 22 or later, then reopen this file.'
  read '?Press Enter to close.'
  exit 1
fi
if /usr/bin/curl --silent --fail http://127.0.0.1:4173/manifest.webmanifest 2>/dev/null | /usr/bin/grep -q 'Recruitdesk'; then
  open http://127.0.0.1:4173
  exit 0
fi
node scripts/serve.mjs &
recruitdesk_pid=$!
trap 'kill "$recruitdesk_pid" 2>/dev/null || true' EXIT INT TERM
for attempt in {1..30}; do
  if /usr/bin/curl --silent --fail http://127.0.0.1:4173/manifest.webmanifest >/dev/null 2>&1; then
    open http://127.0.0.1:4173
    print 'Recruitdesk is running locally. Keep this window open. Press Control-C to stop.'
    wait "$recruitdesk_pid"
    exit $?
  fi
  sleep 0.2
done
print 'Could not start Recruitdesk. Check whether another app is using port 4173.'
exit 1
