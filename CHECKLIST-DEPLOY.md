> ⚠️ **ESTE CHECKLIST ESTÁ INACTIVO.** El proyecto usa actualmente **GitHub Pages** como deploy activo (ver `AGENTS.md` y `.github/workflows/pages.yml`). El workflow de Firebase (`.github/workflows/deploy.yml.disabled`) está deshabilitado y las Cloud Functions no se despliegan en el piloto. Este documento se conserva solo como referencia histórica.

# Checklist de Despliegue — Centro de Rehabilitación AA (inactivo)

Pasos históricos para el primer despliegue a Firebase + GitHub Actions. No aplican al deploy actual en GitHub Pages.

## Requisitos previos

- [x] Cuenta de Google con acceso a Firebase y Google Cloud
- [x] Node 20+ y Firebase CLI instalados (`npm i -g firebase-tools`)
- [x] Repo de GitHub (`MANEJO_CENTRO_AA`) con permisos de escritura
- [x] Proyecto Firebase `manejo-centro-aa` ya creado (confirmado en Fase 0)

## Fase A — Habilitar servicios en Firebase Console

1. Ir a https://console.firebase.google.com/project/manejo-centro-aa

2. **Authentication**
   - Build ▸ Authentication ▸ Get started
   - Sign-in method ▸ habilitar **Email/Password**
   - Settings ▸ Authorized domains: añadir
     - `localhost` (dev local)
     - `manejo-centro-aa.firebaseapp.com`
     - `manejo-centro-aa.web.app`
     - En producción: tu dominio personalizado

3. **Cloud Firestore**
   - Build ▸ Firestore Database ▸ Create database
   - **Production mode** (las reglas `firestore.rules` ya están en el repo)
   - Región: `us-central1` (o la más cercana a Ecuador: `southamerica-east1`)

4. **Cloud Functions**
   - Build ▸ Functions ▸ Get started
   - Confirmar plan **Blaze (pay-as-you-go)** (requerido para Functions v2 y scheduler)
   - Las funciones se desplegarán automáticamente en el primer deploy

5. **Hosting**
   - Build ▸ Hosting ▸ Get started
   - No es necesario hacer nada manualmente — el deploy vía GitHub Actions lo configura

## Fase B — Service Account de Google Drive

1. Ir a https://console.cloud.google.com/iam-admin/serviceaccounts?project=manejo-centro-aa

2. **Crear Service Account**
   - CREATE SERVICE ACCOUNT
   - Nombre: `centro-aa-drive`
   - Rol: ninguno (Drive scope se maneja por carpeta, no por IAM)
   - Done

3. **Crear clave JSON**
   - Click en el SA creado ▸ Keys ▸ ADD KEY ▸ Create new key ▸ JSON
   - Se descarga un archivo `.json` — **guárdalo en lugar seguro, no se commitea**

4. **Habilitar Drive API**
   - https://console.cloud.google.com/apis/library/drive.googleapis.com?project=manejo-centro-aa
   - ENABLE

5. **Compartir carpeta de Drive**
   - En Google Drive, crea la carpeta `Centro_AA`
   - Clic derecho ▸ Compartir ▸ añadir el email del SA:
     `<centro-aa-drive@manejo-centro-aa.iam.gserviceaccount.com>`
   - Permiso: **Lector** (suficiente para subir/listar;.Editor si también quieres eliminar desde Drive)
   - Copiar el **folder ID** de la URL: `drive.google.com/drive/folders/ESTE_ID`

6. **Configurar secret en Cloud Functions**
   ```powershell
   firebase login
   cd functions
   firebase functions:secrets:set DRIVE_SA
   # Pegar el contenido completo del JSON descargado
   # Enter para guardar

   firebase functions:secrets:set DRIVE_ROOT_FOLDER_ID
   # Pegar el folder ID de la carpeta Cento_AA
   # Enter para guardar
   ```
   > Estos secrets también se pueden definir desde el panel de Functions en consola.

## Fase C — Token CI para GitHub Actions

1. Generar token de deploy:
   ```powershell
   firebase login:ci
   ```
   - Se abre el navegador, autenticarse
   - Copia el token impreso (largo)

2. **Alternativa más segura (recomendada)**: descargar Service Account de Firebase Admin
   - Consola Firebase ⚙️ Project settings ▸ Service accounts ▸ **Generate new private key**
   - Guardar el JSON como `FIREBASE_SERVICE_ACCOUNT` en GitHub Secrets (siguiente paso)

## Fase D — GitHub Secrets

Ir al repo en GitHub: `Settings ▸ Secrets and variables ▸ Actions ▸ New repository secret`

Añadir los siguientes:

| Secret name | Valor |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | JSON completo descargado en Fase C (alternativa 2) — **recomendado porque el workflow usa `w9jds/firebase-action`** |
| `VITE_FIREBASE_API_KEY` | `<TU_API_KEY>` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `<TU_PROJECT_ID>.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `<TU_PROJECT_ID>` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `<TU_BUCKET>.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `<TU_SENDER_ID>` |
| `VITE_FIREBASE_APP_ID` | `<TU_APP_ID>` |
| `VITE_FIREBASE_MEASUREMENT_ID` | `<TU_MEASUREMENT_ID>` (opcional, analytics desactivado por defecto) |

> Los valores ya están en `apps/web/.env` local. NO commitear ese archivo.

## Fase E — Probar localmente (opcional pero recomendado)

1. Levantar emulador:
   ```powershell
   firebase emulators:start
   ```

2. En otra terminal:
   ```powershell
   cd apps/web
   npm run dev
   ```
   - Login y CRUD funcionan contra el emulador (no toca producción)

3. Para sembrar datos demo en producción ( administering **una sola vez**):
   ```powershell
   cd functions
   npm run build
   # Descargar Service Account desde Consola Firebase ⚙️ Service accounts ▸ Generate new private key
   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\ruta\al\firebase-sa.json"
   node lib/seed.js
   ```

4. Crear el primer admin (si no usaste seed):
   - Consola Firebase ▸ Authentication ▸ Add user
   - Consola Firebase ▸ Firestore ▸ crear documento `users/{uid}`:
     ```json
     { "name": "Administrador", "email": "admin@centroaa.org", "role": "admin", "status": "Activo", "lastLogin": null }
     ```

## Fase F — Despliegue

### Opción 1 — Automático (recomendado)

1. Subir todo a `main`:
   ```powershell
   git push origin main
   ```
2. GitHub Actions workflow `deploy.yml` se ejecutaría automáticamente si estuviera activo:
   - typecheck + build PWA
   - build Functions
   - `firebase deploy --only hosting,firestore:rules,firestore:indexes,functions`
   - Actualmente el workflow está deshabilitado (`.github/workflows/deploy.yml.disabled`).
3. Monitorear: `Actions` tab del repo
4. URL pública: `https://manejo-centro-aa.web.app`

### Opción 2 — Manual (debug)

```powershell
# Construir PWA
cd apps/web
npm run build

# Deploy todo desde la raíz
cd ..
firebase deploy --only hosting,firestore:rules,firestore:indexes,functions
```

## Fase G — Verificación post-deploy

1. Abrir `https://manejo-centro-aa.web.app`
   - Login con el admin creado
   - Verificar dashboard carga datos (aún vacíos salvo que hiciste seed)

2. **Test Drive**:
   - Navegar a **Configuración**
   - Pegar el **folder ID** de la carpeta `Centro_AA`
   - Click **"Probar conexión"** → debe mostrar ✅ verde + email del SA
   - Si falla: revisar que la carpeta esté compartida con el email del SA

3. **Test foto**:
   - Crear paciente con foto → debe subirse a Firebase Storage en `patients/{patientId}/`
   - Editar el paciente y cambiar la foto → debe reemplazarse en Firebase Storage

4. **Test backup**:
   - Configuración ▸ "Backup manual" → revisa que aparezca en la lista
   - Verificar en Drive: `Centro_AA/backups/firestore/{fecha}/firestore-export.json`

5. **Test PWA en móvil**:
   - Abrir URL en Chrome Android
   - Menú ⋮ ▸ "Agregar a pantalla de inicio"
   - Abrir la app instalada → debe verse standalone (sin barra del navegador)

## Fase H — Mantenimiento

- **Backups automáticos**: cada noche a las 3:00 AM (America/Guayaquil)
- **Logs de Functions**: Consola Firebase ▸ Functions ▸ Logs
- **Rollback**: revert commit en main + push → redeploy automático
- **Nuevos íconos**: ejecutar `node scripts/gen-icons.mjs` en `apps/web/`
- **Esquema Firestore**: cambios en `firestore.rules`/`indexes.json` se deployan con `firebase deploy --only firestore`

## Troubleshooting

| Síntoma | Solución |
|---|---|
| Login falla: "Perfil no encontrado" | Crear doc en `users/{uid}` con el rol correcto |
| Foto no sube: "DRIVE_SA secret not configured" | `firebase functions:secrets:set DRIVE_SA` (pegar JSON completo) |
| Backup falla: "No Drive root folder ID" | Configurar folder ID en Settings ▸ Drive (UI) |
| Functions no aparecen | Verificar plan Blaze activado; reglas de firewall |
| Reglas bloquean escritura | `firebase deploy --only firestore:rules` |
| Build GitHub Actions falla | Revisar Secrets; en particular `VITE_FIREBASE_*` |
| PWA no instala en iOS | Usar Safari, "Añadir a inicio" desde botón compartir |
| "beforeinstallprompt" no aparece | PWA requiere HTTPS (Hosting ya lo da) y service worker registrado |