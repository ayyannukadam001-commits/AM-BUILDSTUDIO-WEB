# AM BUILDSTUDIO — Repository Audit (2026-11-14)

## Scope inspected
- `package.json`, `index.html`, `src/main.jsx`, `src/App.jsx`, `src/styles.css`
- `worker/src/index.js`, `worker/src/android-generator.js`, `worker/schema.sql`, `worker/wrangler.toml`
- `.github/workflows/android-apk.yml`, `.github/workflows/deploy-cloudflare.yml`, `.github/workflows/build.yml`, `.github/workflows/worker-check.yml`
- Root repository directory and `.github/workflows` directory listings.

This is a source-code inspection, not a claim that the production app has been deployed or end-to-end tested.

## Confirmed current behavior
1. Frontend is React + Vite. Main UI is implemented in `src/App.jsx`.
2. Project records fall back to browser localStorage when the user is not signed in.
3. Email OTP, Google sign-in, cloud project CRUD and a Workers AI project-plan endpoint are present in the Worker source.
4. AI generation currently returns a structured plan (summary, feature list, screen list). It explicitly does not generate complete application source code.
5. Android project export calls `/api/projects/:id/android-project`, receives source files and packages them into a ZIP in the browser using `fflate`.
6. `worker/src/android-generator.js` generates a small Kotlin/Compose starter scaffold. Its README says custom business logic, data services and production testing remain to be implemented.
7. The GitHub Actions Android workflow generates a generic starter project via `scripts/create-android-template.js`, compiles a debug APK, verifies the APK exists and uploads it as an artifact. It does not build each user's saved project from the cloud project database.
8. Asset gallery cards are explicitly placeholders; image/3D generation and import are not connected.
9. Cloudflare deploy configuration still contains D1 ID, Pages origin and Google client ID placeholders. Deployment workflow requires secrets for Cloudflare, session signing and Resend email delivery.

## Confirmed gaps / risks
- No in-app user-specific APK build job lifecycle is wired from project creation through queued/running/succeeded/failed state to downloadable artifact.
- No APK preview or emulator/live runtime preview is implemented. A static UI mockup would not prove the generated APK runs.
- AI is a project planner, not an autonomous multi-file app/game code generator.
- The Android generator is a starter scaffold, not a complete implementation of arbitrary requested apps/games.
- The workflow's generic debug APK artifact is a smoke-test artifact, not the APK for a user's selected project.
- No release signing, signing-key management, install/device test, or production APK verification is implemented.
- Asset cards are placeholders, not generated assets.
- Email OTP depends on Resend configuration and a verified sender; it is not currently independent of that provider.
- Deployment cannot run until Cloudflare/D1/Google/email configuration is complete.
- Frontend currently describes services as configured/not configured based on a single health check; feature-level health/diagnostics should be shown separately.

## Important implementation requirements for the upgrade
### A. Real project build pipeline
- Persist a project build request in D1 with owner, source snapshot, requested build type, status, timestamps and log reference.
- Generate a complete Android Studio project from the user's saved project specification and AI-generated source files.
- Trigger a dedicated GitHub Actions workflow using a secure server-to-server dispatch mechanism or move the build runner to an appropriate isolated build service.
- Do not put GitHub tokens in browser code or expose them to the client.
- Store resulting APK artifacts in private/object storage with owner authorization and short-lived download URLs.
- Expose job status/log/download endpoints; show real queued/running/succeeded/failed states.
- Build debug APK for testing first. Add release signing only with user-controlled secure signing configuration.
- Never return a ZIP while labeling it APK.

### B. Preview
- Provide a live web preview for web projects using an isolated preview frame.
- For Android projects, provide a clearly labeled UI/device preview from generated screen definitions, and distinguish it from a real emulator.
- Only claim emulator preview when an actual Android emulator/device runtime is connected and running the built APK.
- Include refresh, device sizes, loading/error states and project selection.

### C. AI Studio-style workspace
- Show task steps, generated/edited file tree, code editor/read-only diff, build output, error diagnostics and live preview.
- Stream or poll actual backend events; do not simulate progress.
- Preserve user approval before adding generated image/3D assets to a project.

### D. Full web audit and quality gates
- Add unit/integration tests for project APIs, auth, generator, build-job state transitions and download authorization.
- Add frontend lint/type checks, Worker tests, generator tests and build workflow tests.
- Add mobile responsive checks and browser smoke tests.
- Add security review for session/cookie/CSRF, OTP rate limits, auth ownership, secret handling and artifact access.
- Keep production branch unchanged until CI, QA and deployment verification pass.

## Recommended delivery sequence
1. Fix correctness/security defects and add automated tests.
2. Implement user-specific build job API + secure artifact storage.
3. Implement project-specific Android source generation (not generic workflow template).
4. Add real APK build execution and verified artifact download.
5. Add preview workspace with truthful Android preview/emulator labels.
6. Add live AI task/file/build activity UI.
7. Verify all features on mobile and only then deploy.

## Status
Audit completed for the listed source files. Implementation and end-to-end verification are not complete. Do not mark any of the above gaps as fixed until code changes and tests prove it.
