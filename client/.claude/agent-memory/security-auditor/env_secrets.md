---
name: Environment & Secrets Security Observations
description: Secret management risks and .env hygiene observed in initial audit
type: project
---

# Environment & Secrets Observations (audited 2026-05-08)

- server/.env is NOT tracked in git (correct — .gitignore excludes it)
- server/.env.example ships BETTER_AUTH_SECRET="12345" — weak placeholder, dangerous if copied verbatim
- server/.env.example ships SEED_ADMIN_PASSWORD="password123" — weak default
- Actual server/.env has a strong BETTER_AUTH_SECRET (base64, looks like 32 bytes) — good
- No BETTER_AUTH_SECRET validation at startup (e.g., minimum length check) — app will start with a weak secret if .env.example is used directly
- DATABASE_URL uses no password (local dev peer auth) — acceptable for dev, must be secured in prod
- CORS origins are hardcoded strings in app.ts, not loaded from env — will need to change for any non-localhost deployment
