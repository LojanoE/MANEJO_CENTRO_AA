# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> For full technical detail (security warnings, Drive/Storage internals, deploy steps), read [`AGENTS.md`](./AGENTS.md) — it's the source of truth and is kept up to date; `README.md` is the user-facing overview.

## What this is

A PWA for internal management of an AA (Alcohólicos Anónimos) rehab center: patients, payments, visits, medical records, tasks, users/roles, reports. Currently a **pilot deployed to GitHub Pages** (not Firebase Hosting) with permissive Firestore rules — this is intentional for now, not an oversight to "fix".

Monorepo: `apps/web/` (React frontend, actively deployed) + `functions/` (Cloud Functions v2, **implemented but inactive** — Firebase Spark plan has no Functions; do not assume they run).

## Commands

All frontend work happens in `apps/web/`:

```bash
cd apps/web
npm install
npm run dev          # dev server at http://localhost:5173
npm run build         # tsc -b && vite build — this is the real type check + build gate
npm run typecheck     # tsc -b --noEmit
npm run lint           # oxlint (.oxlintrc.json)
npm run preview
```

`functions/` (rarely touched — inactive in the pilot):

```bash
cd functions
npm run build   # tsc -> lib/
npm run lint     # eslint --ext .ts src
```

**No test suite exists in either package.** CI (`.github/workflows/ci.yml`) only runs typecheck, lint, and build. Lint failures do not fail `web-build` in CI (`continue-on-error: true`), but treat lint/type errors as real when you introduce them.

## Architecture

- **Routing**: `react-router-dom` with `HashRouter` (`apps/web/src/main.tsx`) — required because GitHub Pages doesn't serve SPA routes. Never switch to `BrowserRouter`.
- **Vite base path**: `vite.config.ts` sets `base: process.env.GITHUB_ACTIONS ? '/MANEJO_CENTRO_AA/' : '/'`. Changing this breaks either local dev or the deployed Pages site.
- **State**: Zustand (`stores/authStore.ts`) for auth/session; everything else reads live from Firestore via hooks.
- **Data access pattern**: `hooks/useCollection` / `useSubcollection` subscribe in real time to Firestore and inject the Firestore doc `id` onto each record (not `uid`). Writes go through helpers in `firebase/firestore.ts` (`saveDoc`, `updateDocHelper`, `removeDoc`, `saveSubDoc`, ...). Prefer these over calling the Firestore SDK directly.
- **Identifier gotcha**: `users` docs have a separate `uid` field that must match Firebase Auth's uid. It's normalized in `useUsers.ts` via `u.uid ?? u.id`. Don't assume `uid` is always present elsewhere.
- **`modules/`**: one folder per app section (patients, payments, visits, users, tasks, reports, ...); page components and their forms live together. `modules/patients/PatientDetail.tsx` is the unified patient record (payments + clinical history + visits tabs) — the most central screen in the app. Forms use `react-hook-form` + `zod` (see `modules/patients/PatientForm.tsx` as the reference pattern).
- **`firebase/`**: all external integration lives here.
  - `firebase/storage.ts` — patient photos and payment/expense receipts go to **Firebase Storage** (not Drive; service accounts have no Drive storage quota).
  - `firebase/drive.ts` + `config/drive.ts` — JSON backups only, uploaded directly from the browser using a Service Account JWT signed client-side with `jose`. This embeds the SA private key in the public bundle; it's an accepted pilot-only tradeoff (see AGENTS.md §6), not something to silently "fix" by refactoring auth.
  - `activityLog` writes go through `logActivity`.
- **Roles**: `admin`, `medico`, `administrativo`. Per-role navigation is defined in `config/nav.ts`. Login accepts either `username` or email — `username` lets one person hold multiple role-specific profiles under one email. There is no public sign-up; users are created in Firebase Console or via the admin flow in `modules/users/Users.tsx` (`createAuthUser` in `firebase/auth.ts`, uses the Identity Toolkit REST API so it doesn't clobber the admin's own session).
- **UI language**: interface text, errors, and notifications are in **Spanish**. Source code identifiers (variables/functions) are in English.

## Things to not accidentally "fix"

These are known, intentional pilot-state tradeoffs documented in AGENTS.md §6 — don't refactor them away without being asked:
- Firestore rules are `auth != null` (any authenticated user can read/write anything).
- The Drive Service Account JSON ships in the frontend bundle.
- `.github/workflows/deploy.yml.disabled` (the old Firebase Hosting deploy) stays disabled — don't rename/re-enable it.
- `functions/` code is real but not deployed/called by the frontend.
