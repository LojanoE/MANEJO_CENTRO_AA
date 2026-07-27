# Centro de Rehabilitación AA — Sistema de Gestión

Sistema integral de gestión para centro de rehabilitación de Alcohólicos Anónimos.
Web + PWA (instalable en móvil). Backend en Firebase. Fotos y backups en Google Drive.

## Stack

- **Frontend**: React 18 + Vite + TypeScript + TailwindCSS + PWA
- **Backend**: Firebase (Auth, Firestore, Cloud Functions v2, Hosting)
- **Almacenamiento de archivos**: Google Drive via Service Account (no Firebase Storage)
- **Backups**: Cloud Function diaria → JSON en Drive
- **CI/CD**: GitHub Actions (deploy automático a Firebase desde `main`)

## Estructura

```
apps/web/        React PWA (cliente)
functions/       Cloud Functions v2 (Drive, backups, custom claims)
firestore.rules  Reglas de seguridad
firestore.indexes.json
.github/workflows/  CI + deploy
```

## Setup local

### 1. Requisitos previos

- Node 20+
- Firebase CLI: `npm i -g firebase-tools`

### 2. Frontend

```bash
cd apps/web
cp .env.example .env       # rellena con tu config de Firebase
npm install
npm run dev
```

### 3. Backend (Cloud Functions)

```bash
cd functions
npm install
npm run build
```

### 4. Emulador Firebase (opcional)

```bash
firebase emulators:start
```

## Configurar Firebase (una sola vez)

1. **Consola Firebase**: habilita Authentication (Email/Password), Firestore (production mode) y Hosting.
2. **Dominios autorizados** en Authentication ▸ Settings: `localhost`, `manejo-centro-aa.firebaseapp.com`.
3. **Token CI**: ejecuta localmente `firebase login:ci` y guarda el JSON en GitHub Secrets como `FIREBASE_SERVICE_ACCOUNT`.
4. **GitHub Secrets** (repo ▸ Settings ▸ Secrets ▸ Actions):
   - `FIREBASE_SERVICE_ACCOUNT` (JSON del token)
   - `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MEASUREMENT_ID`

## Configurar Google Drive (Service Account)

1. Google Cloud Console → habilitar **Drive API**.
2. IAM ▸ Service Accounts → crear → descargar JSON.
3. Crear carpeta `Centro_AA` en Drive y **compartirla con el email del SA** (`<sa>@<proj>.iam.gserviceaccount.com`).
4. Obtener el **folder ID** (URL de la carpeta) y guardarlo como `DRIVE_ROOT_FOLDER_ID`.
5. Subir el JSON completo del SA como secret de Cloud Functions:

```bash
firebase functions:secrets:set DRIVE_SA
firebase functions:secrets:set DRIVE_ROOT_FOLDER_ID
```

6. Redeplegar: `firebase deploy --only functions`.

## Deploy

- **Automático**: push a `main` despliega hosting + rules + indexes + functions vía GitHub Actions.
- **Manual**:
  ```bash
  cd apps/web && npm run build
  firebase deploy --only hosting,firestore:rules,firestore:indexes,functions
  ```

## Módulos (en desarrollo)

- [x] Fase 0 — Scaffold + Firebase init
- [x] Fase 1 — Auth + Layout
- [x] Fase 2 — Dashboard + Pacientes (CRUD + fotos en Drive)
- [x] Fase 3 — Pagos, Visitas, Autorizaciones médicas
- [x] Fase 4 — Fichas médicas (historial + entradas con timeline)
- [x] Fase 5 — Tareas del centro ⭐ (lista + kanban + recurrencias)
- [x] Fase 6 — Usuarios, Profesionales, Configuración
- [x] Fase 7 — Drive (fotos + backups diarios + test de conexión)
- [x] Fase 8 — Reportes (gráficas reales en vivo)
- [x] Fase 9 — PWA final (instalable, cámara, offline fallback)
- [ ] Fase 10 — Despliegue a producción (ver `CHECKLIST-DEPLOY.md`)

> 📘 El checklist completo de despliegue está en [`CHECKLIST-DEPLOY.md`](./CHECKLIST-DEPLOY.md).

## Seguridad

- Las **API keys web** de Firebase son seguras de publicar; la protección real viene de las Firestore Security Rules + Auth.
- El **JSON del Service Account** nunca se commitea (está en `.gitignore` y se gestiona con Firebase Functions Secrets).
- Reglas por rol (`admin`, `medico`, `administrativo`) en `firestore.rules`.