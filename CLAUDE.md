# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## This repo: free-raffle site

This is a copy of `JoaquinDW/sorteo-sosa-motos` for **free raffles only** (client Agustín Sosa). Its purpose is to collect participant contacts to later promote the main paid site. Differences from the main site:

- Uses the `gratis` Postgres schema of the **same** Supabase project (`NEXT_PUBLIC_SUPABASE_DB_SCHEMA`, default `gratis` here). Create it with `scripts/31-crear-schema-gratis.sql` and add `gratis` under Data API → Exposed schemas.
- The home (`app/page.tsx`) shows the free participation form (`components/formulario-gratis.tsx`) instead of packs. `/free` renders the same form. The ranking is hidden by default.
- `/api/transferencia` returns 410: no chances are sold here.
- Free participation requires the participant's Instagram user (`datos_encuesta.instagram`, also `gratis.leads.instagram`) and one screenshot per account in `CUENTAS_INSTAGRAM`. Only one entry per sorteo per email, phone (stored normalized `549…`/`595…`) or Instagram user: checked by `buscarParticipacionGratuitaDuplicada` and enforced by the unique indexes in `scripts/32-gratis-unicos.sql`.
- Each free participation also upserts `gratis.leads` (`lib/leads.ts`) with one optional, unticked-by-default marketing consent checkbox that sets both `acepta_email` and `acepta_whatsapp`. The exact accepted text (`lib/consentimientos.ts`), timestamp, IP and UTM origin are stored. Only contact leads with `baja_at IS NULL` and the matching `acepta_*` flag.

The rest of this file describes the shared codebase inherited from the main site.

## Commands

```bash
pnpm dev            # Start development server
pnpm build          # Production build (TypeScript and ESLint errors are intentionally ignored)
pnpm lint           # Run ESLint
pnpm test:pagos     # Verify Mercado Pago endpoints remain disabled
pnpm test:promos    # Verify transfer pricing and promo rules

# Lottery system scripts (run with tsx via pnpm)
pnpm run scrapper           # Run the Quiniela Buenos Aires scraper manually
pnpm run verificar-sorteos  # Check for pending sorteos and trigger winner selection
pnpm run cron-sorteos       # Same as verificar-sorteos (alias used for cron)
pnpm run prueba-rapida      # Quick smoke test against the database
```

The `__tests__/` directory contains concurrency tests that require a live Supabase connection and are intended for manual invocation with `tsx`.

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_DB_SCHEMA` — optional, defaults to `gratis` in this repo (`public` in the main site): the Postgres schema of the shared Supabase project (created by `scripts/31-crear-schema-gratis.sql`, which also creates `gratis.leads`). The schema must be added under Data API → Exposed schemas.
- `CRON_SECRET` — used to authenticate calls to `/api/verificar-sorteos`
- `MERCADOPAGO_ACCESS_TOKEN` — disabled legacy variable; do not configure or use it
- `RESEND_API_KEY` — for transactional emails via Resend
- `BLOB_READ_WRITE_TOKEN` — for Vercel Blob image storage
- `SUPABASE_SERVICE_ROLE_KEY` — server-only key. Used by `lib/supabase-admin.ts` to mint signed URLs for the private `contenido-packs` bucket (gated per-pack downloads in `/api/descargar/[id]`) and by `scripts/upload-contenido-packs.ts`. Must also be set in Vercel for downloads to work in production.
- `NEXT_PUBLIC_APP_URL` — base URL used to build the download link inside confirmation emails and the `/comprobante/{id}` link sent by WhatsApp.
- `TWILIO_ACCOUNT_SID` + (`TWILIO_AUTH_TOKEN` or `TWILIO_API_KEY_SID`/`TWILIO_API_KEY_SECRET`), `TWILIO_WHATSAPP_FROM` (`whatsapp:+…` or `MG…`), `TWILIO_CONTENT_SID` (`HX…` approved template), `WHATSAPP_BRAND_NAME` (template `{{2}}`, default `Agustin Sosa`), `WHATSAPP_COMPROBANTE_BASE_URL` (default `NEXT_PUBLIC_APP_URL`, then `https://www.agustinsosa.com`) — WhatsApp notification on transfer approval, read by `lib/whatsapp/config.ts`. Non-secret values are in `.env.example`; never commit SIDs/tokens.
- `OWNER_PASSWORD` — unlocks `/backoffice/owner` (Twilio base cost + margin for the WhatsApp report).
- `TWILIO_CONTENT_SID_PROMO` — approved Marketing template for personal ranking promotions; only promotion sending requires it.
- `TWILIO_CONTENT_SID_PROMO_RANKING` — optional approved Marketing template with a seventh variable containing the three ranking prizes. See `docs/RANKING_PREMIOS_TWILIO.md`.
- `TWILIO_AUTH_TOKEN` — also validates Twilio delivery callbacks for promo messages. Keep it configured even when sending with `TWILIO_API_KEY_SID`/`TWILIO_API_KEY_SECRET`; without it the report can show sent messages but cannot confirm delivery.

## Architecture

### Tech stack
Next.js 15 (App Router) + TypeScript, Supabase (Postgres), Vercel Blob (images), bank transfers (payments), Resend (email), Playwright (scraping), Tailwind + Radix UI (shadcn/ui components).

### Data layer (`lib/`)

- **`lib/supabase.ts`** — Supabase client singleton and all TypeScript interfaces (`Sorteo`, `Comprador`, `GanadorExpress`, etc.)
- **`lib/database.ts`** — All database operations. This is the single source of truth for data access. Key details:
  - `sorteoId === "default"` is a fallback path that reads/writes `localStorage` when no Supabase tables exist (dev/demo mode)
  - Number generation uses the PostgreSQL function `generar_numeros_unicos_atomico` (atomic, FOR UPDATE) to prevent race conditions under concurrent purchases
  - Statistics use `obtener_estadisticas_sorteo` SQL RPC to avoid pulling all rows to the client
  - `obtenerGanadoresExpress` uses `obtener_ganadores_express_visibles` SQL RPC
  - Buyer lists are paginated in 1000-row pages to handle large sorteos

### Database schema

Core tables: `sorteos`, `compradores`, `ganadores_express`, `ganadores_pasados`, `configuracion` (key-value store; holds alias/titular transferencia and the whole editable site copy under `clave = 'contenido_sitio'` — see `lib/contenido.ts`), `contenido_historial` (audit/undo log for `configuracion`).

Migration scripts are numbered in `scripts/` (01–31). Apply them in order to a fresh Supabase project. `31-crear-schema-gratis.sql` is a one-off that clones the current `public` structure (tables, functions, triggers, RLS, grants) into the `gratis` schema; it is not needed for the main site. The critical SQL functions for production (atomicity + stats optimization) are in `scripts/17-add-optimized-functions.sql`.

- **Config edits are never lost.** `actualizarContenido` (`lib/contenido.ts`) is a read-merge-write: it only overwrites the fields that changed, never the whole `contenido_sitio` blob. On top of that, the trigger `trg_historial_configuracion` (`scripts/23-add-contenido-historial.sql`) saves the previous value of any `configuracion` row into `contenido_historial` (last 50 versions per key) before it's overwritten. Recover a prior version with `SELECT valor_anterior, reemplazado_at FROM contenido_historial WHERE clave='contenido_sitio' ORDER BY reemplazado_at DESC`.

### Sorteo state machine

States: `activo` → `completo` → `sorteado` (or `cerrado` for manual closure).

- Transition to `completo` happens when `chancesVendidas >= total_chances`
- Transition to `sorteado` is triggered by the Vercel Cron (`/api/verificar-sorteos`, runs daily at 14:00 UTC) which calls the Playwright scraper to fetch the first number from Quiniela Buenos Aires and find the matching buyer

### Payment flows

The only enabled payment method is **transferencia bancaria**. Mercado Pago is permanently disabled: its UI and code remain commented, its API routes return 410, and its return pages are hidden. Never uncomment or reactivate that flow.

Besides the fixed packs, the landing has an "Elegí tu propia cantidad" card (`components/cantidad-personalizada-card.tsx`) for any quantity from 1 to `MAX_CHANCES_PERSONALIZADAS` (1000, capped to the chances left). `obtenerPrecioTransferencia` (`lib/precios-transferencia.ts`) is the single price source on client and server: a quantity matching a visible pack costs the pack price, any other costs the per-chance price of the smallest visible pack. `/api/transferencia` validates the quantity and remaining chances server-side.

The buyer uploads a payment proof; numbers are assigned only when admin approves via backoffice (`aprobarTransferencia` in `lib/database.ts`). On approval the backoffice sends the email (`/api/email-transferencia`) **and**, if `telefono` is a phone number (not an `@usuario`), a WhatsApp via Twilio (`/api/whatsapp-transferencia` → `lib/whatsapp/`). Phones are normalized to `549…` (AR) or `595…` (PY, from `pais_transferencia`). Template variables (`construirVariablesTemplate`): `{{1}}` nombre, `{{2}}` marca (`WHATSAPP_BRAND_NAME`), `{{3}}` chances, `{{4}}` números (`1,4,75`), `{{5}}` total pagado (`formatearMonto`), `{{6}}` compradorId (URL button suffix → `https://www.agustinsosa.com/comprobante/{{6}}`). `/comprobante/[id]` is public (excluded from the `sitio_publicado` middleware gate, noindex) and only returns that buyer's name/numbers when `estado_pago = 'pagado'`. Tests: `pnpm test:whatsapp`. Every attempt is logged in `whatsapp_envios` (`scripts/26-add-whatsapp-envios.sql`) with a snapshot of the unit cost; the "WhatsApp" backoffice tab and `/backoffice/owner` show the cost report.

A third, free entry path also exists:
3. **Participación gratuita** (`/free` → `/api/participacion-gratuita`, `crearCompradorGratuito` in `lib/database.ts`) — a `comprador` with `cantidad_chances = 1`, `precio_pagado = 0`, `estado_pago = 'pagado'` (so it enters the pool and is eligible to win) and `metodo_pago = 'gratuito'` (the distinguishing marker, used only for stats). Survey answers + address are stored in the `datos_encuesta` JSONB column (NULL for purchases). Limited to one entry per email per sorteo via `existeParticipacionGratuita`. Because they are `estado_pago = 'pagado'`, free entries DO count toward `chancesVendidas`/completion (legal "igualdad de condiciones"). Schema in `scripts/21-add-participacion-gratuita.sql`.

### Pages and routes

- `/` (`app/page.tsx`) — public landing: sorteo info, pack selection, buyer lookup by email
- `/backoffice` (`app/backoffice/page.tsx`) — admin panel (password-protected client-side via `components/admin-login.tsx`); manages buyers, transfers, images, sorteo settings, winner selection
- `/pago/exito|error|pendiente` — disabled legacy Mercado Pago redirect pages (404)
- `/free` (`app/free/page.tsx`) — free-participation page (replaces the old Google Form QR). Replicates the marketing survey; on submit assigns exactly ONE number from the same pool and emails a confirmation. Posts to `/api/participacion-gratuita`.
- `/terminos` — terms of service

API routes live in `app/api/`. Each corresponds to a specific action (create sorteo, confirm payment, upload image, etc.).

### Image storage

Images are uploaded to Vercel Blob via `/api/upload-image`. Sorteos support one main image and up to 8 carousel images (`carousel_image_1`…`carousel_image_8` columns on `sorteos`).

### Important invariants

- **Number uniqueness is enforced at the PostgreSQL level** via the `generar_numeros_unicos_atomico` function and a trigger (`04-trigger-validacion-duplicados.sql`). Never bypass these by inserting `numeros_asignados` directly without going through `generarNumerosUnicos()`.
- Deleting a `compradores` row automatically frees its numbers for reassignment (no separate number-tracking table).
- Buyers with `es_ganador = true` cannot be deleted.
