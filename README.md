# Sistema de Sorteos Automatizado 🎯

_Automatically synced with your [v0.dev](https://v0.dev) deployments_

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/joaquindws-projects/v0-sorteo-de-remeras)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.dev-black?style=for-the-badge)](https://v0.dev/chat/projects/hn6Noy6w9Xw)

## Características Principales

✨ **Sistema Completamente Automatizado**

- Venta de chances con números únicos
- Detección automática cuando se agotan las chances
- Ejecución automática del sorteo 24h después
- Scrapping de la Quiniela Buenos Aires para números ganadores

🎲 **Flujo Inteligente**

1. Los usuarios compran chances → sistema asigna números únicos
2. Cuando se venden todas las chances → estado cambia a "completo"
3. Al día siguiente → scrapper obtiene número ganador automáticamente
4. Sistema determina y notifica al ganador

🔧 **Tecnologías**

- Next.js 15 + TypeScript
- Supabase (Base de datos)
- Playwright (Web scraping)
- Vercel Cron Jobs
- Tailwind CSS + Radix UI

## Comandos Disponibles

\`\`\`bash
# Desarrollo
pnpm dev

# Ejecutar scrapper manualmente
pnpm run scrapper

# Verificar sorteos pendientes
pnpm run verificar-sorteos

# Build para producción
pnpm build
\`\`\`

## Configuración

1. Copia `.env.example` a `.env.local`
2. Completa las variables de Supabase
3. Define un `CRON_SECRET` para seguridad

### Backoffice privado y publicación

El backoffice usa una sesión de servidor de 24 horas. Generá las credenciales
sin guardar la contraseña en texto plano:

```bash
pnpm admin:generate-secrets sosamotos
```

Copiá `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` y `ADMIN_SESSION_SECRET` a
`.env.local` y a las variables de entorno de Vercel. La clave de sesión debe ser
la misma en todas las instancias y su rotación cierra todas las sesiones.

Para activar el modo seguro en producción:

1. Desplegá primero el código nuevo con las variables administrativas.
2. Ejecutá `scripts/24-admin-preview-security.sql` en Supabase.
3. Ejecutá `pnpm security:verify` apuntando `.env.local` al proyecto migrado.
4. Ingresá a `/backoffice`; el sitio comienza oculto y se publica con el switch
   **Sitio publicado**.

Mientras está oculto, las páginas muestran únicamente “Próximamente”, la sesión
administrativa obtiene una preview visual y las operaciones comerciales nuevas
responden con `SITE_UNPUBLISHED`. Webhooks, cron y descargas existentes continúan
funcionando.

## Documentación Detallada

📖 Ver [Sistema de Sorteos Automáticos](docs/SORTEOS_AUTOMATICOS.md) para información completa sobre:

- Configuración de cron jobs
- Estados del sorteo
- API endpoints
- Monitoreo y logs

## Overview

This repository will stay in sync with your deployed chats on [v0.dev](https://v0.dev).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.dev](https://v0.dev).

## Deployment

Your project is live at:

**[https://vercel.com/joaquindws-projects/v0-sorteo-de-remeras](https://vercel.com/joaquindws-projects/v0-sorteo-de-remeras)**

## Build your app

Continue building your app on:

**[https://v0.dev/chat/projects/hn6Noy6w9Xw](https://v0.dev/chat/projects/hn6Noy6w9Xw)**

## How It Works

1. Create and modify your project using [v0.dev](https://v0.dev)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository
