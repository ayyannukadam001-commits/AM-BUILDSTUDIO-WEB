# AM BUILDSTUDIO

Mobile-responsive React + Vite workspace with a Cloudflare Worker backend and an Android Compose project generator.

## Run and validate

```bash
npm install
npm run dev
```

Run the frontend production build and Android generator tests:

```bash
npm run check
```

## Android project build workflow

The GitHub Actions workflow is .github/workflows/android-apk.yml.

It can generate a starter from the workflow fallback fields, or accept a project-specific JSON input with this shape:

```json
{
  "name": "My Project",
  "kind": "App",
  "description": "What the project should do",
  "plan": {
    "summary": "Short project overview",
    "screens": ["Home", "Settings"],
    "features": ["Search", "Profile"]
  }
}
```

The workflow creates an Android Studio-compatible Kotlin/Jetpack Compose project, compiles a debug APK, verifies that the APK exists, and uploads the APK as a GitHub Actions artifact for 14 days. The artifact is a ZIP download supplied by GitHub Actions; it contains the APK.

## Current implementation boundaries

- Project JSON currently populates the generated starter's app name, screens, summary and feature list. It does not turn arbitrary natural-language requirements into a complete production app or game implementation.
- The APK workflow is a GitHub Actions workflow, not yet a connected per-user in-app build queue. The website does not yet dispatch a build for each saved project or show its live build logs/status.
- There is no Android emulator runtime preview or install-on-device verification in the web UI. A source/screen preview must not be described as an emulator preview.
- Asset gallery cards remain clearly marked placeholders; image/3D generation and importing are not wired up.
- Release signing, secure signing-key management, production security review and end-to-end tests against a live Cloudflare deployment remain outstanding.

## Backend configuration still required

Cloudflare Pages/Worker deployment, D1 database provisioning, APP_ORIGIN, GOOGLE_CLIENT_ID, session signing, Resend sender verification and the relevant GitHub Actions secrets are deployment-specific. Keep all tokens and signing material in encrypted secrets; never commit them.

## Website-triggered APK builds (upgrade branch)

The project page now includes a **Build Android APK** action. It creates an owner-scoped D1 build job, dispatches the Android workflow, and displays the job state and GitHub Actions run link. The workflow reports queued/running/succeeded/failed state back to the Worker through a shared callback secret.

Before enabling this feature on a deployed Worker:

1. Apply the D1 migration once:
   `npx wrangler d1 execute am-buildstudio --remote --file=worker/migrations/0002_build_job_dispatch.sql`
2. Set Worker secrets (never commit their values):
   - `GITHUB_TOKEN`: fine-grained GitHub token with Actions: read/write and repository metadata access for this repository.
   - `BUILD_CALLBACK_SECRET`: long random secret shared with the repository Actions secret of the same name.
3. Set repository Actions secrets:
   - `BUILD_CALLBACK_URL`: the deployed Worker callback URL ending in `/api/builds/callback`.
   - `BUILD_CALLBACK_SECRET`: same value as the Worker secret.
4. Set Worker variables `GITHUB_REPOSITORY=ayyannukadam001-commits/AM-BUILDSTUDIO-WEB` and `GITHUB_BUILD_REF` to a branch containing the workflow. After this upgrade is merged, use the production branch name.
5. Deploy the Worker and frontend only after reviewing the pull request and applying the D1 migration.

Build artifact delivery currently opens the GitHub Actions run. GitHub stores the APK inside a downloadable artifact ZIP. The website does not yet proxy the APK bytes into a direct APK download, and it does not provide a true Android emulator preview.

## Remaining product limitations

- The Android generator currently builds a real, compilable Compose starter populated with the saved project's title, plan summary, screen names and feature labels. It is not yet a full AI implementation of arbitrary app/game requirements.
- The workspace does not yet generate/import real image or 3D assets; the gallery remains a clearly labeled placeholder.
- A screen-map/plan is not an emulator preview. Device rendering and install testing still need an Android emulator/device service.
- The website-triggered queue requires the deployment secrets and D1 migration above. This repository branch alone cannot configure a user's Cloudflare account or GitHub secrets.
- No production deploy or merge to `main` has been performed.


## Safe rollout

All changes in this upgrade are on am-buildstudio-upgrade-audit. The production branch has not been changed. Merge or deploy only after CI, backend configuration and a real project build have been reviewed.

Version: 0.2.0
