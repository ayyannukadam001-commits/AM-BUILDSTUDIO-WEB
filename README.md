# AM BUILDSTUDIO

Mobile-responsive React + Vite workspace for creating app and game starter projects.

## Run locally
`npm install`
`npm run dev`

## Build
`npm run build`

## Implemented in the `cloudflare-migration-prep` branch
- Responsive dashboard, project creation and project brief UI.
- Cloudflare Worker API foundation with D1 schema for users, sessions, email OTPs, projects and build jobs.
- Email OTP sign-in and Google Identity ID-token verification endpoints.
- Workers AI project-plan endpoint; saved plans can supply screen and feature content to the Android starter generator.
- Authenticated cloud project CRUD endpoints.
- Downloadable multi-file Android Compose starter ZIP from the signed-in project view.
- GitHub Actions workflow that generates and compiles a debug APK starter; manual workflow dispatch accepts project name, App/Game type and description.
- CI checks for frontend build, Worker syntax and Android generator tests.
- Cloudflare Pages same-origin API proxy and a manual preview-deployment workflow.

## Still requires external configuration or additional implementation
- Cloudflare Pages project, D1 database ID, Worker deployment, Pages `API_ORIGIN`, and exact Pages/Worker origins.
- GitHub Actions secrets for Cloudflare deployment, email delivery and session signing; Google OAuth client configuration.
- Live end-to-end verification of sign-in, D1 persistence and Workers AI after deployment.
- The generated Android project is a plan-driven starter scaffold, not a fully implemented custom app/game. The current APK workflow is a starter build smoke test; it does not compile each user's saved project automatically.
- Real image/3D asset generation and asset import.
- Release APK signing, device installation tests, and production security review.

Do not commit provider credentials, Cloudflare tokens, signing keys or user secrets. Keep the existing production branch unchanged until the preview deployment and all required tests pass.

Version: 0.2.0 (migration-preparation branch)
