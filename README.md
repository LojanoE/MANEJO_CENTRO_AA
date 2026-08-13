# Centro de Rehabilitación AA — Sistema de Gestión

Sistema integral de gestión para un centro de rehabilitación de Alcohólicos Anónimos. Es una **PWA web** (instalable en móvil y tablet) que se despliega en GitHub Pages.

🔗 **URL de producción:** `https://lojanoe.github.io/MANEJO_CENTRO_AA/`

> 📘 Para detalles técnicos completos del proyecto, lee [`AGENTS.md`](./AGENTS.md).

## Stack actual

| Capa | Tecnología |
|------|------------|
| Frontend | React 18 + Vite 5 + TypeScript 5.6 + TailwindCSS 3 |
| Estado | Zustand |
| Routing | `react-router-dom` (HashRouter por GitHub Pages) |
| Backend | Firebase Authentication + Cloud Firestore |
| Almacenamiento de fotos/comprobantes | Firebase Storage |
| Backups JSON | Google Drive (vía Service Account desde el navegador) |
| CI/CD | GitHub Actions → GitHub Pages |

## Estado del proyecto

**Piloto activo en GitHub Pages.**

- El deploy real y automático es a GitHub Pages mediante `.github/workflows/pages.yml`.
- Las **Cloud Functions** en `functions/` están implementadas pero **inactivas** (plan Firebase Spark gratuito).
- Las reglas de Firestore son permisivas (`auth != null`) para facilitar el piloto; **no son seguras para producción real**.
- El **Service Account de Google Drive se embebe en el bundle** del frontend para backups JSON. Esto es aceptable solo para el piloto; en producción real debe ir por backend.

## Funcionalidades principales

- **Autenticación por nombre de usuario**: una misma persona puede tener varios usuarios (por ejemplo, uno como médico y otro como administrador) usando distintos nombres de usuario.
- **Gestión de pacientes**: registro, edición, importación masiva desde Excel y ficha unificada con pagos, historial clínico y visitas.
- **Ficha unificada por paciente**: desde el listado de pacientes se abre una vista (`/patients/:patientId`) con pestañas de resumen, pagos, historial clínico y visitas.
- **Finanzas**: control de ingresos (pagos) y egresos del centro.
- **Control de visitas**: solicitudes, aprobación/denegación por médicos y registro histórico.
- **Fichas médicas**: historial clínico con entradas de seguimiento en formato timeline.
- **Tareas del centro**: lista y vista kanban con recurrencias.
- **Usuarios y roles**: administrador, médico y administrativo.
- **Reportes**: estadísticas en vivo de pacientes, recaudación y tareas.
- **Responsive**: interfaz adaptada para móvil, tablet y desktop.
- **PWA**: instalable en dispositivos móviles, con service worker y fallback offline.

## Estructura del repositorio

```
MANEJO_CENTRO_AA/
├── apps/web/                 # Frontend React + PWA
│   ├── src/
│   │   ├── components/       # Layout, UI genérico
│   │   ├── config/           # Navegación por rol, config de Drive
│   │   ├── firebase/         # Auth, Firestore, Storage, Drive (cliente JWT)
│   │   ├── hooks/            # Hooks de dominio y colecciones
│   │   ├── modules/          # Pantallas funcionales
│   │   ├── stores/           # Zustand
│   │   ├── types/            # Tipos TypeScript
│   │   ├── App.tsx           # Rutas
│   │   ├── main.tsx          # Entry point
│   │   └── index.css         # Tailwind + estilos globales
│   ├── package.json
│   ├── vite.config.ts
│   └── ...
├── functions/                # Cloud Functions v2 (inactivas en piloto)
├── firebase.json             # Config de emuladores y servicios
├── firestore.rules           # Reglas permisivas del piloto
├── firestore.indexes.json    # Índices compuestos
├── .github/workflows/
│   ├── pages.yml             # Deploy activo a GitHub Pages
│   ├── ci.yml                # CI
│   └── deploy.yml.disabled   # Deploy a Firebase (inactivo)
├── AGENTS.md                 # Guía técnica completa para desarrolladores
├── CHECKLIST-DEPLOY.md       # Checklist histórico de despliegue a Firebase (inactivo)
└── README.md                 # Este archivo
```

## Setup local

### Requisitos

- Node 20+
- Cuenta de Firebase con proyecto configurado

### Frontend

```bash
cd apps/web
cp .env.example .env       # rellena con tus credenciales de Firebase y Drive
npm install
npm run dev                # http://localhost:5173
```

### Comandos útiles

```bash
npm run typecheck          # Verificación de tipos TypeScript
npm run build              # Build de producción
npm run lint               # Oxlint
npm run preview            # Previsualizar build
```

### Emuladores de Firebase (opcional)

```bash
firebase emulators:start
```

## Seguridad y advertencias del piloto

- El **Service Account de Google Drive** (`VITE_DRIVE_SA_JSON`) se incluye en el bundle del build. Cualquier usuario puede extraer la clave privada. **Solo es aceptable para este piloto.**
- Las **Firestore Security Rules** actuales permiten leer/escribir a cualquier usuario autenticado. No usar en producción.
- Las **Cloud Functions** no se ejecutan en el piloto.
- Las **web API keys de Firebase** son públicas por diseño; la seguridad real viene de Auth + Firestore Rules.

## Despliegue

El despliegue a producción es automático en cada push a `main` mediante GitHub Actions (`.github/workflows/pages.yml`).

URL resultante: `https://lojanoe.github.io/MANEJO_CENTRO_AA/`

> El checklist de despliegue a Firebase (`CHECKLIST-DEPLOY.md`) está **inactivo**; se conserva solo como referencia histórica.

## Recursos

- [`AGENTS.md`](./AGENTS.md) — guía técnica completa.
- [`CHECKLIST-DEPLOY.md`](./CHECKLIST-DEPLOY.md) — checklist histórico de Firebase (inactivo).
