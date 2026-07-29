# AGENTS.md — Centro AA (piloto)

## Estado actual del piloto (⚠️ el README está desactualizado)
- **Deploy real: GitHub Pages** (`.github/workflows/pages.yml`, push a `main` → build → `https://lojanoe.github.io/MANEJO_CENTRO_AA/`). El workflow de Firebase está deshabilitado (`deploy.yml.disabled`); **no reactivarlo**.
- **Plan Spark**: Cloud Functions (`functions/`) existen pero **no se despliegan ni se usan**. Toda la lógica de Drive/usuarios vive en el frontend.
- El Service Account de Drive se embebe en el bundle via `VITE_DRIVE_SA_JSON` (decisión aceptada para el piloto, inseguro para producción). Las operaciones de Drive son JWT firmado con `jose` en el navegador: `apps/web/src/firebase/drive.ts`.
- `firestore.rules` actuales son **permisivas de piloto** (`auth != null`). Las reglas por rol fallaron y están en el historial de git (commit anterior a "Update firestore.rules"); restaurarlas para producción.
- Config pública de Firebase hardcodeada como fallback en `apps/web/src/firebase/config.ts` (las web API keys son públicas por diseño, no es un secreto).

## Comandos (apps/web)
- `npm run build` = `tsc -b && vite build` (verifica tipos + build en un solo paso).
- `npm run lint` = `oxlint`; `npm run typecheck` = `tsc -b --noEmit`.
- No hay tests ni workspace raíz: `apps/web` y `functions` son paquetes independientes con su propio `package.json`.

## Gotchas específicos del repo
- **GitHub Pages**: `base` de Vite es condicional a `GITHUB_ACTIONS` en `apps/web/vite.config.ts`, y se usa `HashRouter` en `apps/web/src/main.tsx` (Pages no sirve rutas SPA). No cambiar a `BrowserRouter`.
- `useCollection`/`useSubcollection` (`apps/web/src/hooks/useCollection.ts`) inyectan el campo **`id`**, no `uid`. Los documentos de `users` deben mapear `uid: u.uid ?? u.id` (ver `useUsers.ts`). El módulo Usuarios ahora protege los `.slice()` sobre `uid` para evitar crashes con documentos antiguos.
- `useUsers.create` crea el usuario en Firebase Auth vía la **Identity Toolkit REST API** (`apps/web/src/firebase/auth.ts`) y luego escribe el doc en Firestore con `role` y `status: "Activo"`. Esto funciona en Spark sin Functions, pero depende de las reglas permisivas de piloto. En producción real migrar a Cloud Functions + reglas por rol.
- UI en español; mantener textos de interfaz en español.
- El CLI de Firebase **no está autenticado en este entorno** → los cambios de `firestore.rules` hay que publicarlos manualmente en la Consola de Firebase.
- Secrets de GitHub necesarios para el build de Pages: `VITE_DRIVE_SA_JSON`, `VITE_DRIVE_ROOT_FOLDER_ID` (los `VITE_FIREBASE_*` tienen fallback hardcodeado). Sin `VITE_DRIVE_SA_JSON`, los uploads de Drive fallan en runtime.
