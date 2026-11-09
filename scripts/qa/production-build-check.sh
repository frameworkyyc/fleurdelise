#!/usr/bin/env bash
# Local, offline pre-flight for the PRODUCTION build + Worker config. Deploys nothing, contacts nothing.
#   bash scripts/qa/production-build-check.sh
# Uses a DUMMY public Turnstile site key so the build guard passes; the real key is a Cloudflare build variable.
set -euo pipefail
cd "$(dirname "$0")/../.."
export PUBLIC_TURNSTILE_SITEKEY="${PUBLIC_TURNSTILE_SITEKEY:-0x4AAAAAAAdummyPublicKey}"
echo "1/5 type checks";            npx astro check | tail -2; npx tsc -p worker && echo "worker types ok"
echo "2/5 worker unit tests";      npm run -s test:worker 2>&1 | grep -E "^# (tests|pass|fail)"
echo "3/5 production build";       npm run -s build:production 2>&1 | grep -E "post-build|redirects|rror" || true
echo "4/5 production SEO checks";  node scripts/check-seo.mjs dist --mode=production
echo "5/5 production Worker config (dry run, no deploy)"; npx wrangler deploy --dry-run -c wrangler.production.jsonc --outdir /tmp/wr-prod-check 2>&1 | grep -E "env\.|Total Upload|rror" || true
echo "Restoring the staging build in ./dist"; env -u PUBLIC_TURNSTILE_SITEKEY npm run -s build:staging >/dev/null 2>&1 && echo done
