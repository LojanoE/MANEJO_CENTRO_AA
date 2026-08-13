# Frontend — Centro de Rehabilitación AA

Aplicación React + TypeScript + Vite que sirve como PWA para la gestión del centro.

## Comandos

```bash
npm install
npm run dev          # Servidor de desarrollo en http://localhost:5173
npm run typecheck    # Verificación de tipos
npm run build        # Build de producción
npm run lint         # Oxlint
npm run preview      # Previsualizar build
```

## Configuración

Copia `.env.example` a `.env` y completa tus credenciales:

```bash
cp .env.example .env
```

Variables necesarias:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID` (opcional)
- `VITE_DRIVE_SA_JSON` (JSON del Service Account para backups en Drive)
- `VITE_DRIVE_ROOT_FOLDER_ID` (ID de la carpeta raíz en Drive)

## Estructura

- `src/components/` — UI reutilizable y layout.
- `src/config/` — navegación por rol y configuración de Drive.
- `src/firebase/` — auth, firestore, storage, drive.
- `src/hooks/` — hooks de dominio y suscripción a Firestore.
- `src/modules/` — pantallas funcionales de la app.
- `src/stores/` — estado global con Zustand.
- `src/types/` — tipos TypeScript.

## Notas

- Usa `HashRouter` porque el deploy es en GitHub Pages.
- El Service Account de Drive se embebe en el bundle en el piloto; en producción real debe ir por backend.
- Ver la documentación general en [`../../README.md`](../../README.md) y [`../../AGENTS.md`](../../AGENTS.md).
