# Security Hardening Manual: Secrets, Dependencies, DDoS & Firewall Whitelisting

This manual serves as the operational guide for securing the Campus Knowledge Hub production environment. It covers secret management, package audits, DDoS/WAF protection, reverse proxies, and database IP whitelisting.

---

## 1. Environment Secrets Management

### Zero-Commit Policy
- **No hardcoded secrets**: All credentials, private API keys, and certificate paths must never be checked into Git.
- **Gitignore configuration**: Ensure that `.env`, `.env.local`, `.env.production`, and `.env.development` are explicitly ignored in the root `.gitignore`.

### Double-Mode Secret Loader
The backend includes a custom `secretLoader.js` which supports two options for loading secret configurations:
1. **Direct Environment Variables**: Loaded directly via `process.env.SECRET_NAME` (e.g., `JWT_SECRET`).
2. **File-Mounted Secrets**: Loaded by specifying a file path using a `_FILE` suffix (e.g., `JWT_SECRET_FILE=/run/secrets/jwt_secret`). This is highly recommended for Docker Swarm, Kubernetes Secrets, or HashiCorp Vault integrations.

#### Supported Secrets
- `JWT_SECRET` / `JWT_SECRET_FILE`
- `JWT_PREVIOUS_SECRETS` / `JWT_PREVIOUS_SECRETS_FILE`
- `GEMINI_API_KEY` / `GEMINI_API_KEY_FILE`
- `OPENAI_API_KEY` / `OPENAI_API_KEY_FILE`
- `ANTHROPIC_API_KEY` / `ANTHROPIC_API_KEY_FILE`
- `SMTP_PASS` / `SMTP_PASS_FILE`
- `R2_SECRET_ACCESS_KEY` / `R2_SECRET_ACCESS_KEY_FILE`
- `RAZORPAY_KEY_SECRET` / `RAZORPAY_KEY_SECRET_FILE`

### Zero-Downtime JWT Secret Rotation
To rotate the `JWT_SECRET` without logging out currently active users:
1. **Generate a new cryptographically secure secret** (e.g., 64-character hex string).
2. **Move the active `JWT_SECRET`** to `JWT_PREVIOUS_SECRETS` (comma or newline separated list).
3. **Set the new secret** as the current `JWT_SECRET`.
4. **Deploy/restart the backend**. The system validates signatures using both the current secret and any values in `JWT_PREVIOUS_SECRETS`, allowing active user tokens to remain valid.
5. **After token expiry** (e.g., 7 days matching `JWT_EXPIRES_IN`), remove the old secret from `JWT_PREVIOUS_SECRETS` and restart the backend.

### Cloud Dashboards Injection
- **Render Backend**: Set secrets in the **Environment** tab of the Render Service Dashboard.
- **Vercel Frontend**: Set frontend environment variables (like `VITE_API_URL`) in the **Environment Variables** section of the Vercel Project Settings. Trigger a fresh deployment push to compile Vite using the new variables.

---

## 2. Dependency Vulnerability Resolution

### Policy & Auditing
- **Automated Alerts**: Monitor GitHub Dependabot alerts on the repository.
- **Auditing Command**: Run `npm audit` across the workspace regularly:
  ```powershell
  npm audit --workspaces
  ```

### Audit Fix Procedure
1. **Automatic Fixing**: Run `npm audit fix --workspace client` or `npm audit fix --workspace server` depending on where vulnerabilities are identified.
2. **Manual Upgrades**: If vulnerabilities cannot be patched automatically (due to breaking major version boundaries), manually update `package.json` package versions to target the safe release specified in the advisory and run `npm install`.
3. **Build Validation**: Run `npm run build` in the updated workspace to ensure bundling succeeds.
4. **Test Run**: Run test suites using `npm run test:server` to verify that package updates did not break runtime logic or validations.

---

## 3. DDoS & Abuse Protection

### Application-Layer Safeguards (Built-in)
The backend features an active `abuseProtection.js` middleware enforcing:
- **Suspicious Path Blocking**: Rejects patterns like `/.env`, `/wp-admin`, `/phpmyadmin`, `/cgi-bin`, etc.
- **Payload Inspection**: Detects directory traversals (`../`), script tags (`<script`), SQL Injection signatures (`union select`), and execution commands (`curl `, `wget `).
- **IP Blocklist**: Explicitly blocks traffic from IPs configured in the `BLOCKED_IPS` environment list.
- **User-Agent Requirement**: Rejects requests lacking a `User-Agent` header (standard feature of malicious scripts/scanners).

### Edge DDoS Protection (Cloudflare Recommendation)
To block massive network volume attacks (Layer 3/4) and application-layer floods (Layer 7):
1. **Change Nameservers**: Move DNS management to Cloudflare.
2. **Enable Bot Fight Mode**: Challenges automated web scraping engines and botnets.
3. **Configure Edge Rate Limiting Rules**:
   - **Strict Auth API Route Limit**: Limit requests to `/api/auth/*` to a maximum of 20 requests per 15 minutes per IP.
   - **Medium AI API Route Limit**: Limit requests to `/api/ai/*` to a maximum of 40 requests per 10 minutes per IP.
   - **Global Limit**: Limit total endpoint requests to 150 per minute per IP.
4. **Challenge/Block Rule**: Challenge traffic matching high-risk ASNs, bad reputation IPs, or geolocations outside your target audience.

---

## 4. Firewall & IP Whitelisting

### CORS Configuration
The Express backend restricts cross-origin request headers using `cors` configured in `server/src/app.js`:
```javascript
cors({
  origin: env.clientUrl,
  credentials: true
})
```
Make sure `CLIENT_URL` is set to the production frontend domain (`https://campus-knowledge-hub-client.vercel.app`) in the production environment variables to prevent third-party domains from loading data via browser-based scripts.

### MongoDB Atlas Whitelisting
To prevent unauthorized access to your database cluster:
1. **Whitelisting All (0.0.0.0/0)**: Allowed *only* during development and temporary deployments where server outbound IPs are fully dynamic and unpredictable (such as Render's Free tier).
2. **Production Whitelisting (Render Paid/Static IP)**:
   - On Render Paid instances, outbound IP addresses are fixed. Retrieve these static IPs from the Render dashboard.
   - Go to **MongoDB Atlas > Network Access > IP Access List**.
   - Add the specific static IP addresses of the Render backend servers. Remove the wildcard `0.0.0.0/0` rule.
3. **Custom Proxy Gateway (Alternative)**:
   - If utilizing Render's free tier, configure a custom proxy service (e.g., using a proxy service like QuotaGuard Static or a small VPS on AWS/DigitalOcean with a static IP) to route database traffic through a static gateway IP. Whitelist only this gateway IP on MongoDB Atlas.
