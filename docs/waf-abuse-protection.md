# Infra-Level WAF and Abuse Protection Guide

## Goal

Protect the platform from scanners, bots, brute-force traffic, and request-flood abuse before requests hit application logic.

## Layered Model

1. Edge WAF (Cloudflare or AWS WAF) filters hostile traffic.
2. Reverse proxy (Nginx/Load Balancer) enforces request limits and timeouts.
3. App-layer safeguards (already implemented) reject suspicious payloads and rate-limit sensitive routes.

## App-Side Controls Enabled

- Suspicious path and payload blocking middleware
- Proxy-aware IP extraction and per-IP rate limiting
- Strict auth and AI route rate limits
- Security headers and optional HTTPS enforcement
- Optional explicit blocked-IP list (`BLOCKED_IPS`)

## Required Environment Flags

```env
ABUSE_PROTECTION_ENABLED=true
ABUSE_REQUIRE_USER_AGENT=true
BLOCKED_IPS=
TRUST_PROXY=1
ENFORCE_HTTPS=true
```

Use `TRUST_PROXY=1` when backend is behind Cloudflare/Nginx/Load Balancer.

## Cloudflare WAF Rules (Recommended)

1. Enable "Bot Fight Mode" (or Super Bot Fight if plan allows).
2. Add managed WAF rulesets for OWASP and common CVEs.
3. Add custom block rules:
   - URI contains `/.env`, `/wp-admin`, `/phpmyadmin`, `/cgi-bin`
   - Method is unusual for API and URI starts with `/api/`
   - JA3/ASN/IP reputation rules for bad actors
4. Add rate limiting:
   - `/api/auth/*`: strict (for example 10-20 req / 15 min per IP)
   - `/api/ai/*`: medium (for example 30 req / 10 min per IP)
   - Global API: burst control (for example 120 req / min per IP)
5. Challenge traffic for suspicious countries/ASNs if your user base is region-limited.

## AWS WAF Equivalent (If Using ALB/API Gateway)

1. Attach AWS Managed Rules:
   - `AWSManagedRulesCommonRuleSet`
   - `AWSManagedRulesKnownBadInputsRuleSet`
   - `AWSManagedRulesAmazonIpReputationList`
2. Add rate-based rules:
   - lower threshold for `/api/auth/*`
   - medium threshold for `/api/ai/*`
3. Add custom byte-match rules for known exploit paths/patterns.
4. Send WAF logs to CloudWatch/S3 and alert on spikes.

## Reverse Proxy Recommendations (Nginx Example)

- Set request body limits per route (`client_max_body_size`)
- Configure connection/request timeouts
- Add per-IP burst control (`limit_req_zone`, `limit_req`)
- Block malformed headers early

## Monitoring and Incident Handling

1. Track 403/429 rates and top offending IPs.
2. Add offending IPs/ASNs to WAF blocklists.
3. Temporarily tighten `/api/auth/*` limits during attack windows.
4. Rotate JWT secrets if credential abuse is suspected.
