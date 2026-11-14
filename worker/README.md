# AM BUILDSTUDIO Cloudflare API

This Worker provides D1-backed user/project storage, email OTP and Google ID-token sign-in, a Workers AI project-plan endpoint, and a deterministic multi-file Android Compose starter generator.

## Provision
1. Create a Cloudflare D1 database named `am-buildstudio`.
2. Apply `worker/schema.sql` using `wrangler d1 execute am-buildstudio --file=worker/schema.sql`.
3. Replace the D1 database ID and Pages origin in `worker/wrangler.toml`.
4. Set Worker secrets: `SESSION_SECRET` (long random value), `RESEND_API_KEY`, `EMAIL_FROM`, `GITHUB_TOKEN` (fine-grained GitHub token with Actions: write and repository Contents: read access), and `BUILD_CALLBACK_SECRET` (a long random value).
5. Set `GOOGLE_CLIENT_ID` to the OAuth web client ID and configure the same client ID's authorized JavaScript origins for the Pages domain.
6. Deploy the Worker with Wrangler. Bind Workers AI and D1 as shown.

Do not commit secrets. Configure Google OAuth consent and Resend sender-domain verification before enabling sign-in. The Google endpoint accepts a Google ID token and verifies its audience, issuer, expiry and verified email server-side. Email OTPs expire after 10 minutes and are limited to five attempts.

## Website-triggered APK builds

The signed-in project screen can submit an APK build to GitHub Actions, poll its status, and download the resulting Actions artifact ZIP through an authenticated Worker endpoint. The Worker dispatches `.github/workflows/android-apk.yml` using the configured repository/ref. The workflow calls `/api/builds/callback` to update the private D1 job record.

Configure these additional GitHub Actions repository secrets before using the website build button:
- `GITHUB_BUILD_TOKEN`: a fine-grained PAT for this repository with Actions: write and Contents: read. The deployment workflow installs it in the Worker as `GITHUB_TOKEN`.
- `BUILD_CALLBACK_SECRET`: same random secret configured in the Worker.
- `BUILD_CALLBACK_URL`: exact Pages origin plus `/api/builds/callback` (for example `https://YOUR-PAGES-DOMAIN/api/builds/callback`).

The deployment workflow installs `GITHUB_BUILD_TOKEN` and `BUILD_CALLBACK_SECRET` into the Worker. Do not paste secrets into chat. Existing D1 databases created before the build metadata columns were added must apply `worker/migrations/0002_build_job_metadata.sql` once; check the table first and do not apply it if those four columns already exist. Fresh databases can use the full `worker/schema.sql`.

## API
- `GET /api/health`
- `POST /api/auth/email/request` with `{email}`
- `POST /api/auth/email/verify` with `{email,code}`
- `POST /api/auth/google` with `{credential}`
- `GET /api/auth/me`, `POST /api/auth/logout`
- Authenticated `GET/POST /api/projects`, `DELETE /api/projects/:id`
- Authenticated `POST /api/projects/:id/generate`
- Authenticated `POST /api/projects/:id/android-project` returns a multi-file Android starter project as JSON.
- Authenticated `POST /api/projects/:id/builds` queues a project-specific debug APK build.
- Authenticated `GET /api/projects/:id/builds` and `GET /api/builds/:id` return build status/history.
- Authenticated `GET /api/builds/:id/download` redirects to the short-lived GitHub artifact download URL.

## Important limitations
The authenticated browser UI can download the generated Android starter source ZIP or request a project-specific debug APK. The APK is built from the current deterministic Compose starter scaffold plus the project name, description, and AI plan. It is not yet full natural-language-to-complete-app/game generation, a signed production release, or an emulator-tested install. GitHub Actions artifacts are temporary (14-day retention by default).

## Automated deployment
The repository includes a manual Cloudflare deployment workflow at `.github/workflows/deploy-cloudflare.yml`. Before running it, create the Pages project and D1 database (database name `am-buildstudio`), replace the database ID and Pages origin in `worker/wrangler.toml`, and add GitHub Actions secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `SESSION_SECRET`, `RESEND_API_KEY`, and `EMAIL_FROM`. Add the Actions variable `GOOGLE_CLIENT_ID`. The Cloudflare token needs Pages write, Workers scripts write, D1 edit and account read permissions. The workflow deploys a Pages preview for `cloudflare-migration-prep`, applies the D1 schema, configures Worker secrets and deploys the Worker. After deployment, set the Pages environment variable `API_ORIGIN` to the deployed Worker origin, and set Worker `APP_ORIGIN` to the Pages preview origin. Configure the same Google client ID in the Pages build and Worker and add the Pages origin to Google's authorized JavaScript origins. Do not paste any secrets into chat or commit them.

## Same-origin API proxy
Cloudflare Pages Function `functions/api/[[path]].js` proxies browser `/api/*` calls to the Worker using the Pages environment variable `API_ORIGIN` (the deployed Worker origin, e.g. its workers.dev URL). This keeps browser auth cookies first-party on the Pages domain. Set `API_ORIGIN` in Pages project settings and set Worker `APP_ORIGIN` to the Pages site's exact origin. Leave `VITE_API_BASE_URL` empty so the app uses same-origin `/api` routes.
