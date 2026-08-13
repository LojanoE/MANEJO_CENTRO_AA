# AGENTS.md

Repo-specific guidance for AI agents working in `MANEJO_CENTRO_AA`.

## Stack

Mono-repo with two independently-built packages:
- `apps/web/` — React 18 + Vite 5 + TS + Tailwind 3 + PWA frontend (Firebase client SDK)
- `functions/` — Cloud Functions v2 (Node 20, TS) using firebase-admin + googleapis

Firebase project: `manejo-centro-aa`. Backend: Auth + Firestore (production mode) + Cloud Functions + Hosting. File storage is **Google Drive via Service Account**, not Firebase Storage.

## Commands

Always run from the package directory, not repo root.

```powershell
# Frontend (apps/web)
cd apps/web
npm run dev          # Vite dev server on :5173 — needs .env (copy from .env.example)
npm run typecheck    # tsc -b --noEmit  ← MANDATORY before commit
npm run build        # tsc -b && vite build → dist/ + service worker

# Functions (functions/)
cd functions
npm run build        # tsc → lib/index.js
```

There is no test runner. Verification = `typecheck` + `build` for both packages.

## Critical verification order

1. `apps/web`: `npm run typecheck` (`tsc -b --noEmit` is strict — unused vars error)
2. `apps/web`: `npm run build`
3. `functions`: `npm run build`

This repo uses `noUnusedLocals` + `noUnusedParameters`. Adding a new import you don't use fails typecheck. Run typecheck after every non-trivial edit.

## Env / secrets

- `apps/web/.env` — `VITE_FIREBASE_*` keys. **Gitignored.** Web API keys are safe to expose; security comes from `firestore.rules` + Auth.
- `functions/.env` — gitignored. Drive SA is set via `firebase functions:secrets:set DRIVE_SA`, not a file.
- `apps/web/.env.example` and `functions/.env.example` are committable templates (whitelisted in `.gitignore`).
- Never commit `.env`, `service-account.json`, or `functions/lib/` (build output, gitignored).

## Architecture conventions

### Data flow

All data is live via Firestore `onSnapshot`. The generic hook is `apps/web/src/hooks/useCollection.ts`:
- `useCollection<T>('collectionName', ...QueryConstraint[])` → returns `{ data, loading, error }` where `data` is `(T & { id: string })[]`
- `useSubcollection<T>('parent', parentId, 'child', ...)` for subcollections like `medicalRecords/{id}/entries`

It serializes QueryConstraints via JSON for deps comparison — pass stable constraint objects or accept re-subscription.

### Create/update/delete pattern

Don't call firestore `addDoc`/`updateDoc` directly. Use helpers in `apps/web/src/firebase/firestore.ts`:
- `saveDoc(name, data)` — auto-adds `createdAt`/`updatedAt` serverTimestamps
- `updateDocHelper(name, id, patch)` — auto-updates `updatedAt`
- `removeDoc(name, id)`
- `saveSubDoc`/`updateSubDoc`/`removeSubDoc` for subcollections
- **`logActivity(entry)`** — append to `activityLog` collection (feeds the Dashboard feed). Every write hook (create/update/delete in `usePatients`, `usePayments`, `useVisits`, `useMedicalAuths`, `useTasks`, `useUsers`, `useRecords`) calls it. Always include `color`, `icon`, `type`, `message`, `submessage`, `refId`.

### Roles & permissions

Three roles: `admin | medico | administrativo`. Definition lives in `apps/web/src/types/user.ts` and `apps/web/src/config/nav.ts` (nav visibility).
- Firestore rules (`firestore.rules`): `isAdmin()` / `isMedico()` / `isStaff()` helpers check `users/{uid}.role` and `status === 'Activo'`.
- **Custom claims** set via Cloud Function `setUserRole` — but rules also read role from the `users` doc directly, so claims are not strictly required for security to work.
- `createUser` and `setUserRole` are callable Cloud Functions (admin-only) — not direct writes from the client.

### Cloud Functions

`functions/src/index.ts` exports:
- `bootstrapAdmin` — one-shot, only when `users` is empty
- `createUser`, `setUserRole` — admin-only callables
- `uploadDriveFile`, `listDriveFolder`, `getDrivePreview`, `removeDriveFile`, `testDriveConnection`, `listBackups`, `triggerBackup` — Drive callables (use `driveSaSecret` param)
- `dailyBackup` — schedule 0 3 * * * America/Guayaquil

Drive root folder ID is read from `firestore settings/main/driveFolderId` with fallback to env `DRIVE_ROOT_FOLDER_ID` (in `functions/src/drive.ts`). The Settings UI writes the folder ID to that doc.

### Routing & layout

- `apps/web/src/App.tsx` — all routes. Routes are flat (not nested); route IDs match `NAV_CONFIG` ids in `config/nav.ts`.
- ` medicalRecords` use sub-collection pattern: route `/records/:recordId` for detail, `/records/new/:patientId` to open, `/records/:recordId/entry` for new entry.

### PWA

- `vite-plugin-pwa` configured in `vite.config.ts`. Manifest points to `public/icon-192.png`, `icon-512.png`, `icon-512-maskable.png`.
- Regenerate icons after editing brand: `node scripts/gen-icons.mjs` (uses `pngjs` — not in deps, install with `--no-save` if missing).
- `main.tsx` registers SW and redirects `/offline` on `offline` event.

## Firestore schema (collections)

`users`, `professionals`, `patients`, `payments`, `visits`, `medicalAuths`, `medicalRecords` + subcollection `entries`, `tasks`, `activityLog`, `settings/main`. All patientId/assignedDoctorId fields are `string | null` (nullable). See `apps/web/src/types/*.ts` for exact shapes — match them exactly or typecheck fails.

## Style

- Tailwind utility classes. Shared component classes (`.form-input`, `.btn-primary`, `.status-badge`, card/stat patterns) defined in `apps/web/src/index.css` under `@layer components` — reuse rather than redefining.
- Icons are emoji literals matching `NAV_CONFIG` (not lucide-react despite it being installed).
- UI strings are Spanish; do not translate to English unless asked.

## Deploy

- Push to `main` → GitHub Actions `deploy.yml` builds + deploys hosting + firestore:rules + firestore:indexes + functions via `w9jds/firebase-action@v13`.
- Manual: `firebase deploy --only hosting,firestore:rules,firestore:indexes,functions` from repo root after `apps/web && npm run build`.
- Deploy requires GitHub Secret `FIREBASE_SERVICE_ACCOUNT` (Firebase Admin SA JSON) + `VITE_FIREBASE_*` secrets. Without them CI build uses dummy values.
- See `CHECKLIST-DEPLOY.md` for first-time setup and troubleshooting matrix.

## Don't

- Don't add comments unless explicitly asked (repo convention).
- Don't commit `.env`, `functions/lib/`, SA JSONs of any kind.
- Don't bypass `firestore.rules` by writing data with admin SDK from the client — there is no admin SDK on the client; only callable Functions use it.
- Don't add chart libraries — charts are pure CSS bars + `conic-gradient` donut in `modules/reports/Reports.tsx`.
- Don't use `firebase/firestore` directly in modules; go through `hooks/use*.ts` and `firebase/firestore.ts` helpers.