# AGENTS.md — Centro de Rehabilitación AA

> Guía para agentes de codificación. Si no conoces el proyecto, lee este archivo antes de tocar código.

---

## 1. Visión general

**Centro de Rehabilitación AA** es una aplicación web tipo PWA para la gestión interna de un centro de Alcohólicos Anónimos. Permite administrar pacientes, pagos, visitas, autorizaciones médicas, fichas médicas, tareas del centro, usuarios/roles, profesionales, reportes y configuración.

**Estado actual del proyecto: piloto en GitHub Pages.**

- Deploy real: GitHub Pages (`https://lojanoe.github.io/MANEJO_CENTRO_AA/`).
- El workflow de Firebase (`.github/workflows/deploy.yml.disabled`) está deshabilitado; **no reactivarlo**.
- Las Cloud Functions existen en `functions/` pero **no se despliegan ni se usan** en el piloto. Toda la lógica de Google Drive vive en el frontend.
- Las reglas de Firestore son permisivas (`auth != null`) para facilitar el piloto; no son seguras para producción real.

---

## 2. Arquitectura y stack

### Frontend (`apps/web/`)

| Tecnología | Uso |
|------------|-----|
| React 18 | UI declarativa |
| Vite 5 | Build y dev server |
| TypeScript 5.6 | Tipado estricto |
| TailwindCSS 3 + PostCSS + autoprefixer | Estilos utilitarios |
| `react-router-dom` | Enrutamiento (HashRouter obligatorio por GitHub Pages) |
| Zustand | Estado global (`stores/authStore.ts`) |
| React Hook Form + Zod | Formularios y validación |
| `lucide-react` | Iconos |
| `date-fns` | Manipulación de fechas |
| Firebase Web SDK | Auth, Firestore, Storage (inicializado) |
| `jose` | Firma JWT para llamadas a Google Drive desde el navegador |
| `vite-plugin-pwa` | Service worker, manifest e instalación como PWA |

### Backend / Cloud Functions (`functions/`)

| Tecnología | Uso |
|------------|-----|
| Firebase Functions v2 | Funciones HTTPS onCall y scheduler |
| Firebase Admin SDK | Auth, Firestore |
| `googleapis` | Integración con Google Drive |

**Nota:** Las funciones están implementadas pero inactivas. El plan actual usa Firebase Spark (gratuito), que no permite Cloud Functions. El frontend realiza las operaciones de Drive directamente.

### Servicios externos

- **Firebase Authentication** — email/password.
- **Cloud Firestore** — base de datos principal.
- **Google Drive** — almacenamiento de fotos de pacientes y backups JSON.

### Diagrama de alto nivel

```
┌─────────────────────┐         ┌──────────────────────┐
│   Navegador / PWA   │◄───────►│  Firebase Auth       │
│   (apps/web)        │         │  Cloud Firestore     │
│                     │◄───────►│  (reglas permisivas) │
│  jose JWT ──────────┼────────►│  Google Drive API    │
│  (Service Account)  │         │  (fotos + backups)   │
└─────────────────────┘         └──────────────────────┘

functions/  ──►  Cloud Functions v2 (no desplegadas en piloto)
```

---

## 3. Estructura de directorios

```
MANEJO_CENTRO_AA/
├── apps/web/                 # Frontend React + PWA
│   ├── src/
│   │   ├── components/       # AuthGuard, AppShell, Header, Sidebar, UI genérico
│   │   ├── config/           # drive.ts, nav.ts (constantes de navegación y Drive)
│   │   ├── firebase/         # config, auth, firestore helpers, drive (cliente JWT), driveApi
│   │   ├── hooks/            # useCollection, useSubcollection, hooks por dominio
│   │   ├── modules/          # Pantallas funcionales (auth, dashboard, patients, ...)
│   │   ├── stores/           # Zustand (authStore)
│   │   ├── types/            # Tipos TypeScript por dominio
│   │   ├── App.tsx           # Definición de rutas
│   │   ├── main.tsx          # Entry point con HashRouter y SW
│   │   └── index.css         # Tailwind + estilos globales
│   ├── package.json
│   ├── vite.config.ts        # PWA config; base condicional a GITHUB_ACTIONS
│   ├── tsconfig*.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── .oxlintrc.json
├── functions/                # Cloud Functions v2 (TypeScript)
│   ├── src/
│   │   ├── index.ts          # Funciones onCall + scheduler
│   │   ├── drive.ts          # Cliente Drive con Service Account
│   │   └── seed.ts           # Script de datos demo (node lib/seed.js)
│   ├── package.json
│   └── tsconfig.json
├── firebase.json             # Config de hosting, Firestore, Functions y emuladores
├── firestore.rules           # ⚠️ Reglas permisivas de piloto
├── firestore.indexes.json    # Índices compuestos usados por la app
├── .github/workflows/
│   ├── pages.yml             # Deploy activo a GitHub Pages
│   ├── ci.yml                # CI: typecheck + lint + build
│   └── deploy.yml.disabled   # Deploy a Firebase (inactivo)
├── CHECKLIST-DEPLOY.md       # Guía detallada de despliegue a Firebase
└── README.md                 # Documentación general (desactualizada)
```

### Organización del frontend

- **`modules/`**: cada carpeta representa una sección de la app. Componentes de página y formularios viven juntos aquí.
- **`firebase/`**: toda interacción con Firebase y Drive. `drive.ts` contiene la lógica JWT y subida directa a Drive; `driveApi.ts` expone wrappers nombrados como si fueran llamadas a Functions (para migración futura).
- **`hooks/`**: `useCollection` y `useSubcollection` suscriben en tiempo real a Firestore e inyectan `id`. Los demás hooks (`usePatients`, `useUsers`, etc.) encapsulan lógica de dominio.
- **`types/`**: tipos planos; los campos `createdAt`/`updatedAt` se guardan como `serverTimestamp()` en Firestore.

---

## 4. Comandos de build, lint y test

### `apps/web/`

```bash
cd apps/web
npm install
npm run dev          # Servidor de desarrollo en http://localhost:5173
npm run build        # tsc -b && vite build  (verifica tipos + build)
npm run typecheck    # tsc -b --noEmit
npm run lint         # oxlint (según .oxlintrc.json)
npm run preview      # Previsualiza el build de producción
```

### `functions/`

```bash
cd functions
npm install
npm run build        # tsc  (genera lib/)
npm run lint         # eslint --ext .ts src
npm run serve        # build + firebase emulators:start --only functions
npm run deploy       # firebase deploy --only functions
```

### Emuladores de Firebase

```bash
firebase emulators:start
```

Configuración en `firebase.json`: Auth (9099), Firestore (8080), Functions (5001), Hosting (5000), UI (4000).

### Tests

**No hay tests unitarios ni de integración.** El CI solo verifica typecheck, lint y build.

---

## 5. Convenciones de código

### Idioma

- **La interfaz de usuario está en español.** Mantén textos de interfaz, mensajes de error, placeholders y notificaciones en español.
- Los comentarios y nombres de commits pueden estar en español o inglés según prefiera el equipo; el código fuente usa inglés para nombres de variables/funciones.

### TypeScript

- `strict: true` en ambos paquetes.
- En `apps/web/tsconfig.app.json`: `verbatimModuleSyntax: true`, `noUnusedLocals: true`, `noUnusedParameters: true`.
- No se permite `any` implícito; usa tipos de `types/`.

### Manejo de identificadores

- **`useCollection`** y **`useSubcollection`** inyectan el campo **`id`** (el ID del documento en Firestore), no `uid`.
- El documento de `users` tiene un campo `uid` que debe coincidir con `Auth.uid`. En `useUsers.ts` se normaliza:
  ```ts
  const users = rawUsers.map((u) => ({ ...u, uid: u.uid ?? u.id }))
  ```
- **Cuidado**: no asumas que `uid` existe siempre; operar sobre `u.uid` sin fallback puede romper el módulo Usuarios.

### Usuarios y roles

- Roles: `admin`, `medico`, `administrativo`.
- La navegación por rol está definida en `config/nav.ts` (`NAV_CONFIG`).
- **No hay sign-up público.** Los usuarios se crean:
  - Manualmente en Firebase Console (Auth + documento en Firestore con `role` y `status: "Activo"`).
  - O mediante el flujo de la app en `modules/users/Users.tsx`, que usa `createAuthUser` (`firebase/auth.ts`) para crear el usuario vía Identity Toolkit REST API sin cerrar la sesión del admin actual.

### Firestore y hooks

- Preferir `useCollection`/`useSubcollection` para listados en tiempo real.
- Para escrituras, usar helpers en `firebase/firestore.ts`: `saveDoc`, `updateDocHelper`, `removeDoc`, `saveSubDoc`, etc.
- Registrar actividad relevante con `logActivity` (se guarda en colección `activityLog`).

### Formularios

- Usar `react-hook-form` + `zod` para validación.
- Ejemplo de patrón: ver `modules/patients/PatientForm.tsx`.

### Drive

- El Service Account JSON se lee desde `VITE_DRIVE_SA_JSON` (env) en `config/drive.ts`.
- `firebase/drive.ts` implementa JWT con `jose`, cache de token, y operaciones de subida/listado/preview/eliminación.
- En producción real, estas operaciones deben moverse a Cloud Functions; en el piloto, el frontend las ejecuta directamente.

---

## 6. Seguridad

### ⚠️ Advertencias críticas del piloto

1. **Service Account embebido en el bundle.**
   - `VITE_DRIVE_SA_JSON` se incluye en el build de GitHub Pages. Cualquier usuario puede extraer la clave privada del Service Account.
   - **Esto es aceptable solo para el piloto.** En producción real, las operaciones de Drive deben ir por backend (Cloud Functions) y el SA nunca debe llegar al cliente.

2. **Firestore Security Rules permisivas.**
   - `firestore.rules` permite leer/escribir cualquier documento a cualquier usuario autenticado.
   - **No usar en producción.** En el historial de git existen reglas por rol (`admin`, `medico`, `administrativo`) en un commit anterior a "Update firestore.rules"; restaúralas para producción.

3. **Cloud Functions inactivas.**
   - Las funciones en `functions/src/index.ts` incluyen control de roles, backups automáticos y operaciones de Drive seguras, pero **no se ejecutan** en el piloto.
   - La app no llama a Functions; usa `firebase/drive.ts` directamente.

4. **Config pública de Firebase hardcodeada.**
   - `apps/web/src/firebase/config.ts` tiene valores fallback para las credenciales web de Firebase.
   - Las web API keys son públicas por diseño; la seguridad real viene de Auth + Firestore Rules, no del secreto de la key.

### Secrets necesarios para GitHub Actions

Para que el build de Pages funcione correctamente:

- `VITE_DRIVE_SA_JSON` — **obligatorio** para uploads de Drive.
- `VITE_DRIVE_ROOT_FOLDER_ID` — ID de la carpeta raíz de Drive.
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID` (opcional)

Los `VITE_FIREBASE_*` tienen fallback hardcodeado, por lo que el build no falla si faltan, pero las operaciones reales requieren los valores correctos.

---

## 7. Despliegue y CI/CD

### Deploy activo: GitHub Pages

Archivo: `.github/workflows/pages.yml`

- Se ejecuta en cada push a `main` y por `workflow_dispatch`.
- Pasos:
  1. Checkout.
  2. Setup Node 20 con cache de `apps/web/package-lock.json`.
  3. `npm ci` en `apps/web`.
  4. `npm run build` con las variables de entorno de los secrets.
  5. Subir artefacto `apps/web/dist` a GitHub Pages.
  6. Deploy a Pages.

URL resultante: `https://lojanoe.github.io/MANEJO_CENTRO_AA/`

### CI

Archivo: `.github/workflows/ci.yml`

- Se ejecuta en PR y push a `main`.
- Jobs:
  - `web-build`: instala deps, typecheck, lint (`continue-on-error: true`) y build con valores dummy para las variables de Firebase.
  - `functions-build`: instala deps y compila TypeScript.

### Workflow de Firebase (inactivo)

`.github/workflows/deploy.yml.disabled` contiene el deploy original a Firebase Hosting + Firestore + Functions. **Permanece deshabilitado.** No lo renombres ni lo actives sin coordinar.

### Manual (solo si se reactivara Firebase)

```bash
cd apps/web && npm run build
cd ..
firebase deploy --only hosting,firestore:rules,firestore:indexes,functions
```

**Nota:** El CLI de Firebase no está autenticado en este entorno. Cualquier cambio en `firestore.rules` debe publicarse manualmente en la Consola de Firebase.

---

## 8. Gotchas y notas operativas

- **HashRouter obligatorio.** `apps/web/src/main.tsx` usa `HashRouter` porque GitHub Pages no sirve rutas SPA. No cambiar a `BrowserRouter`.
- **Base de Vite condicional.** `vite.config.ts` usa `base: process.env.GITHUB_ACTIONS ? '/MANEJO_CENTRO_AA/' : '/'`. No modificar sin entender el impacto en Pages.
- **PWA offline.** El service worker se registra con `registerSW({ immediate: true })`. Al perder conexión, la app redirige a `/offline`.
- **Íconos PWA.** Se asumen archivos `icon-192.png`, `icon-512.png` e `icon-512-maskable.png` en `public/`. Para regenerar iconos, ejecutar `node scripts/gen-icons.mjs` en `apps/web/` (ver `CHECKLIST-DEPLOY.md`).
- **Seed de datos demo.** `functions/src/seed.ts` inserta pacientes, pagos, tareas, activityLog y settings. Requiere `GOOGLE_APPLICATION_CREDENTIALS` o ejecutarse dentro del entorno de Cloud Functions.
- **Backup manual.** Desde `Configuración` se puede disparar un backup JSON de Firestore a Drive (ruta `backups/firestore/{fecha}/firestore-export.json`). En las Functions, el backup automático está programado a las 3:00 AM (`America/Guayaquil`).
- **No modificar `.github/workflows/deploy.yml.disabled`.**
- **No implementar sign-up por Functions.** La creación de usuarios es manual o mediante el flujo de administrador en el frontend.

---

## 9. Recursos adicionales

- `README.md` — descripción general (nota: desactualizado, priorizar este archivo).
- `CHECKLIST-DEPLOY.md` — pasos detallados para desplegar a Firebase (inactivo actualmente).
- `firebase.json` — configuración de emuladores y servicios.
- `firestore.indexes.json` — índices compuestos requeridos por las consultas de la app.

