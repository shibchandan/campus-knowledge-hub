# Secret Rotation and Vault-Managed Secrets Policy

## Purpose

Define how secrets are stored, loaded, rotated, and retired for Campus Knowledge Hub.

## Supported Secret Sources

The backend supports two modes for secret values:

- direct env var, for example `JWT_SECRET=...`
- file-mounted secret, for example `JWT_SECRET_FILE=/run/secrets/jwt_secret`

File-based loading is recommended for Docker/Kubernetes/Vault integrations.

## Supported File-Managed Secrets

- `JWT_SECRET_FILE`
- `JWT_PREVIOUS_SECRETS_FILE`
- `OPENAI_API_KEY_FILE`
- `GEMINI_API_KEY_FILE`
- `ANTHROPIC_API_KEY_FILE`
- `SMTP_PASS_FILE`
- `R2_SECRET_ACCESS_KEY_FILE`

## JWT Rotation Policy

1. Generate a new strong JWT secret.
2. Move current `JWT_SECRET` value into `JWT_PREVIOUS_SECRETS`.
3. Set new value as `JWT_SECRET`.
4. Restart backend.
5. Monitor login/session health.
6. After token TTL window (`JWT_EXPIRES_IN`) plus safety buffer, remove old secret from `JWT_PREVIOUS_SECRETS`.

Notes:

- Token signing always uses current `JWT_SECRET`.
- Token verification accepts current + previous JWT secrets.
- This enables zero-downtime rotation for active sessions.

## Recommended Rotation Frequency

- JWT secrets: every 30-90 days
- AI/API keys: every 60-90 days
- SMTP password/app password: every 90 days
- Cloud storage secrets: every 90 days
- Immediate rotation after any suspected leak

## Operational Controls

- Never commit real secrets to git.
- Use least privilege credentials.
- Restrict secret-read access to backend runtime only.
- Use separate secrets for development, staging, production.
- Log rotation actions in change records.

## Incident Rotation Procedure

If a secret leak is suspected:

1. Rotate compromised secret immediately.
2. Invalidate dependent sessions/tokens if JWT secret was exposed.
3. Update `JWT_PREVIOUS_SECRETS` only for controlled transition.
4. Remove compromised secret from all environments after transition.
5. Review audit logs and access logs for abuse indicators.

## Quick Example (Docker/K8s Style)

```env
JWT_SECRET_FILE=/run/secrets/jwt_current
JWT_PREVIOUS_SECRETS_FILE=/run/secrets/jwt_previous
SMTP_PASS_FILE=/run/secrets/smtp_pass
OPENAI_API_KEY_FILE=/run/secrets/openai_api_key
```

Where `jwt_previous` can contain comma-separated or newline-separated values.
