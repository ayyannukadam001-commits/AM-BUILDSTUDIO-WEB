# AM BUILDSTUDIO Cloudflare API

This Worker provides D1-backed user/project storage, email OTP and Google ID-token sign-in, a Workers AI project-plan endpoint, and a deterministic multi-file Android Compose starter generator.

## Provision
1. Create a Cloudflare D1 database named `am-buildstudio`.
2. Apply `worker/schema.sql` using `wrangler d1 execute am-buildstudio --file=worker/schema.sql`.
3. Replace the D1 database ID and Pages origin in `worker/wrangler.toml`.
4. Set Worker secrets: `SESSION_SECRET` (long random value), `RESEND_API_KEY`, and `EMAIL_FROM`.
5. Set `GOOGLE_CLIENT_ID` to the OAuth web client ID and configure the same client ID's authorized JavaScript origins for the Pages domain.
6. Deploy the Worker with Wrangler. Bind Workers AI and D1 as shown.

Do not commit secrets. Configure Google OAuth consent and Resend sender-domain verification before enabling sign-in. The Google endpoint accepts a Google ID token and verifies its audience, issuer, expiry and verified email server-side. Email OTPs expire after 10 minutes and are limited to five attempts.

## API
- `GET /api/health`
- `POST /api/auth/email/request` with `{email}`
- `POST /api/auth/email/verify` with `{email,code}`
- `POST /api/auth/google` with `{credential}`
- `GET /api/auth/me`, `POST /api/auth/logout`
- Authenticated `GET/POST /api/projects`, `DELETE /api/projects/:id`
- Authenticated `POST /api/projects/:id/generate`
- Authenticated `POST /api/projects/:id/android-project` returns a complete multi-file starter project as JSON.

## Important limitations
The Android generator currently returns source files as JSON; it does not yet create a ZIP or run Gradle itself. The generated project is a starter scaffold, not a complete realization of arbitrary app/game requirements. A successful APK requires the Android build workflow and its build environment to be run against exported project files. This repository's CI validates the web frontend and Worker source; it does not claim a real APK has been built.

## Automated deployment
The repository includes a manual Cloudflare deployment workflow at `.github/workflows/deploy-cloudflare.yml`. Before running it, create the Pages project and D1 database (database name `am-buildstudio`), replace the database ID and Pages origin in `wrangler.toml`, and add repository Actions secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. The token needs Pages write, Workers scripts write, D1 edit and account read permissions. Set the Actions variable `VITE_API_BASE_URL` to the API base URL used by the frontend. Configure Worker secrets `SESSION_SECRET`, `RESEND_API_KEY`, and `EMAIL_FROM` in Cloudflare before sign-in is enabled. Configure the Google OAuth client ID and authorized origins. Use a same-site custom domain or Pages Functions proxy for cookie-based sessions; cross-site third-party cookie restrictions can otherwise block browser sessions.
