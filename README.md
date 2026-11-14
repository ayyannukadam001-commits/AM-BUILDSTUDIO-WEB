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

## Safe rollout

All changes in this upgrade are on am-buildstudio-upgrade-audit. The production branch has not been changed. Merge or deploy only after CI, backend configuration and a real project build have been reviewed.

Version: 0.2.0
