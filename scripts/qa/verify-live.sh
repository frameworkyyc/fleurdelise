#!/usr/bin/env bash
# READ-ONLY live verification of the production + staging + old domains. Run it from your own computer (the Claude sandbox cannot reach these hosts).
#   bash scripts/qa/verify-live.sh                      # defaults below
#   PROD=https://fleurdelisehealing.ca STAGING=https://fleurdelise.frameworktools.ca bash scripts/qa/verify-live.sh
# Sends only GET/HEAD requests. Never POSTs to /api/inquiry and never submits a form. Paste the output back to Claude.
PROD="${PROD:-https://fleurdelisehealing.ca}"; WWW="${WWW:-https://www.fleurdelisehealing.ca}"
STAGING="${STAGING:-https://fleurdelise.frameworktools.ca}"; OLD="${OLD:-https://fleurdelisehealing.com}"
host() { echo "$1" | sed -E 's#https?://##; s#/.*##'; }
hr() { printf '\n==== %s\n' "$*"; }
hdrs() { curl -sS -m 20 -o /dev/null -D - "$@" 2>&1 | tr -d '\r' | grep -iE '^(HTTP/|location:|server:|cf-ray:|x-robots-tag:|strict-transport|x-content-type|referrer-policy|permissions-policy|content-security|x-frame|cache-control:|content-type:|cf-cache-status:)' ; }
body() { curl -sS -m 20 "$@" 2>&1; }

hr "1. DNS"; for h in "$(host $PROD)" "$(host $WWW)" "$(host $STAGING)" "$(host $OLD)"; do printf '%s  A: %s | AAAA: %s | NS: %s\n' "$h" "$(dig +short A $h | tr '\n' ' ')" "$(dig +short AAAA $h | tr '\n' ' ')" "$(dig +short NS $(echo $h | sed -E 's/^www\.//') | tr '\n' ' ')"; done
for t in "TXT $(host $PROD)" "MX $(host $PROD)" "TXT _dmarc.$(host $PROD)" "CAA $(host $PROD)" "DS $(host $PROD)"; do printf '%s: %s\n' "$t" "$(dig +short $t | tr '\n' ' ')"; done

hr "2. HTTPS certificate (production apex + www)"; for h in "$(host $PROD)" "$(host $WWW)"; do echo "-- $h"; echo | openssl s_client -servername $h -connect $h:443 2>/dev/null | openssl x509 -noout -subject -issuer -dates -ext subjectAltName 2>/dev/null | sed 's/^/   /'; done

hr "3. Redirects"; echo "-- http -> https (apex)"; hdrs "http://$(host $PROD)/"; echo "-- www"; hdrs "$WWW/"; echo "-- trailing slash / index.html"; hdrs "$PROD/about/"; hdrs "$PROD/index.html"

hr "4. Production home: headers"; hdrs "$PROD/"
hr "5. Production head (title, robots, canonical, og:url, sitekey) — expect .ca and NO noindex"; body "$PROD/" | grep -oE '<title>[^<]*</title>|<meta name="robots"[^>]*>|<link rel="canonical"[^>]*>|<meta property="og:url"[^>]*>' 
body "$PROD/book" | grep -oE 'data-sitekey="[^"]*"' | head -1
echo "-- stray hosts in page source (expect none besides .ca):"; body "$PROD/" | grep -oE 'fleurdelisehealing\.com|frameworktools\.ca' | sort | uniq -c
hr "6. robots.txt and sitemap"; body "$PROD/robots.txt"; echo; hdrs "$PROD/sitemap-index.xml"; body "$PROD/sitemap-0.xml" | grep -oE '<loc>[^<]*</loc>' | head -20
hr "7. 404 and API behaviour (GET only)"; hdrs "$PROD/this-page-does-not-exist-xyz"; hdrs "$PROD/api/inquiry"; body "$PROD/api/inquiry"; echo
hr "8. Forms: is the live site in TEST mode? (looks for the staging Turnstile test key in the page)"; if body "$PROD/book" | grep -q '1x00000000000000000000AA'; then echo "!! TEST Turnstile key present — production forms are NOT protected / not live"; else echo "no Turnstile test key found"; fi
hr "9. Staging (expect login wall or noindex)"; hdrs "$STAGING/"; hdrs "$STAGING/robots.txt"
hr "10. Old Wix domain (informational)"; hdrs "$OLD/"; hdrs "https://www.$(host $OLD)/"
