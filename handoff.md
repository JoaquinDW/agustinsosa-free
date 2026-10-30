# Handoff: Ranking de compradores + promos con descuento por WhatsApp

> **Actualización vigente:** Mercado Pago está deshabilitado permanentemente. Toda indicación de este documento sobre implementar, probar o reactivar Mercado Pago queda anulada. El checkout y las promociones usan únicamente transferencia bancaria.

Feature nueva para el sitio de sorteos de Agustín Sosa. Presupuesto acordado con el cliente: **20 h**. Priorizá en el orden de la sección "Plan de trabajo" y no agregues alcance fuera de este documento.

Leé primero `CLAUDE.md` (arquitectura, invariantes, flujos de pago). Todo el código y los comentarios del repo están en español: seguí ese idioma y el estilo de cada archivo.

---

## 1. Qué hay que construir

1. **Ranking público en la landing** (`app/page.tsx`): top N de compradores con más chances del sorteo activo. Referencia visual: tarjetas con medalla oro/plata/bronce para el 1–3, número para el resto, nombre a la derecha y "600 CHANCES" debajo, estilo violeta/neón del sitio, mobile first, se actualiza solo.
2. **Pestaña "Ranking" en el backoffice** (`app/backoffice/page.tsx`): ranking completo con teléfono, filtro de mínimo de chances, búsqueda, casillas de selección y costo estimado del envío.
3. **Campaña de promo**: con los seleccionados, el admin define descuento (%), packs a los que aplica, vencimiento y usos. Se genera **un código personal por destinatario** y se envía por WhatsApp (template nuevo de Twilio, categoría Marketing).
4. **Página de promo + checkout con descuento**: el botón del WhatsApp lleva a `/promo/{codigo}`; la landing muestra un banner personal, cuenta regresiva y precios tachados. La compra (MercadoPago o transferencia) cobra el precio con descuento.
5. **Reporte**: por campaña (enviados, entregados/errores, usos, recaudado, costo) y el reporte de WhatsApp existente separado por tipo de mensaje.

**Fuera de alcance:** números de regalo ("duplicá tus chances"), checkbox de consentimiento de marketing, envío a usuarios sin teléfono, combinación de varias promos en una compra.

---

## 2. Decisiones ya tomadas (defaults)

Si algo de esto cambia, el humano te lo va a avisar. Mientras tanto, implementalo así:

| Tema | Decisión |
|---|---|
| Descuento | Porcentaje entero (1–90) elegido por el admin en cada campaña |
| Packs | Todos por defecto; el admin puede limitar a algunos (por `cantidad_pack_N`) |
| Usos | `unico` (1 compra confirmada por código, default) o `ilimitado` hasta vencer |
| Vencimiento | Fecha/hora elegida por el admin (default: ahora + 48 h), zona `America/Argentina/Buenos_Aires` |
| Quién entra al ranking | `estado_pago = 'pagado'`, sorteo activo, `metodo_pago <> 'gratuito'` |
| Agrupación de una persona | `lower(trim(email))`; si no hay email, teléfono solo dígitos. Se suman `cantidad_chances` |
| Nombre público | Nombre de la compra más reciente, capitalizado, truncado a ~20 caracteres con `…`. Nunca email, teléfono ni números |
| Top público | Visible/oculto y cantidad (default 5, máx. 10) configurables desde el backoffice |
| Código | 8 caracteres de alfabeto sin ambiguos (`ABCDEFGHJKMNPQRSTUVWXYZ23456789`), aleatorio criptográfico, `UNIQUE` |
| Código atado a la persona | No se valida email/teléfono en el checkout (puede reenviarse). El uso único limita el abuso |
| Redondeo | ARS: redondear al entero (`Math.round`). PYG: redondear al entero. Función pura única para ambos flujos |
| Repetición | No se envía la misma campaña dos veces a la misma persona. El backoffice muestra la fecha del último envío de promo |

---

## 3. Mapa del código relevante

| Archivo | Qué hace hoy | Qué cambia |
|---|---|---|
| `lib/database.ts` | Todo el acceso a datos. Las funciones del navegador hacen proxy al servidor vía `callAdminDatabase` (`if (typeof window !== "undefined")`) | Funciones nuevas de ranking, campañas y códigos siguiendo ese patrón |
| `lib/supabase.ts` | Cliente (service role en servidor, anon en navegador) + interfaces | Interfaces nuevas; campos nuevos en `Comprador` |
| `lib/precios-transferencia.ts` | `obtenerPrecioTransferencia(sorteo, chances, pais)` → `{monto, moneda}` | Usarlo como precio de lista y aplicar el descuento encima |
| `app/api/crear-preferencia/route.ts` | Calcula el precio del pack en servidor y crea la preferencia de MP con `metadata` | Aceptar `promoCodigo`, validar, cobrar el precio con descuento, guardar el código en `metadata` |
| `app/api/confirmar-pago/route.ts` | Webhook MP. **Valida que `transaction_amount` sea exactamente el precio de un pack visible** (`processApprovedPayment`) | **Crítico:** si hay `metadata.promo_codigo`, aceptar el monto con descuento; si no, un pago con promo falla con "El importe del pago no coincide con un pack válido" |
| `app/api/transferencia/route.ts` + `crearCompradorTransferencia` | Crea el comprador pendiente con el precio de lista | Aceptar `promoCodigo`, guardar precio con descuento y el id del código |
| `aprobarTransferencia` (`lib/database.ts`) | Asigna números y marca `pagado` | Marcar el código como usado al aprobar |
| `app/page.tsx` | Landing. Llama a `/api/crear-preferencia` (~L232) y `/api/transferencia` (~L294). `CompraModalNuevo` muestra precios | Sección de ranking, banner de promo, precios con descuento, enviar `promoCodigo` |
| `components/compra-modal-nuevo.tsx` | Selección de pack y país, precio ARS/PYG | Mostrar precio tachado y con descuento cuando hay promo |
| `lib/whatsapp/*` | Provider Twilio acoplado al template de transferencia (`enviarTransferenciaAprobada`, variables fijas `{{1}}`–`{{6}}`) | Método genérico `enviarTemplate` y reutilizarlo desde el de transferencia |
| `app/api/whatsapp-transferencia/route.ts` | Ejemplo de ruta admin: `requireAdminRequest(request, { verifyOrigin: true })`, envía y registra en `whatsapp_envios` | Patrón a copiar para el envío de promos |
| `components/reporte-whatsapp.tsx`, `obtenerReporteWhatsApp` | Reporte con un solo costo unitario (`whatsapp_costo_unitario`) | Separar por `tipo`, costo unitario por tipo |
| `lib/contenido.ts`, `components/contenido-manager.tsx` | Config editable del sitio en `configuracion.contenido_sitio` (read-merge-write) | Campos `rankingVisible`, `rankingCantidad`, títulos del ranking |
| `middleware.ts` | Si el sitio no está publicado, reescribe todo a `/proximamente` salvo `api`, `backoffice`, `comprobante` | `/promo/*` queda bajo el gate a propósito (si el sitio está oculto, la promo también) |
| `scripts/NN-*.sql` | Migraciones numeradas, la última es `26-add-whatsapp-envios.sql` | Nuevas: `27-…`, `28-…` |
| `tests/whatsapp.test.ts` | Tests con `node:test`, `pnpm test:whatsapp` | Agregar casos del método genérico; tests nuevos de promos |

---

## 4. Modelo de datos

### `scripts/27-add-ranking-y-promos.sql`

```sql
-- Campañas de promo (una por envío desde el backoffice)
CREATE TABLE IF NOT EXISTS public.promo_campanias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sorteo_id uuid NOT NULL REFERENCES public.sorteos(id) ON DELETE CASCADE,
  porcentaje integer NOT NULL CHECK (porcentaje BETWEEN 1 AND 90),
  packs_aplicables integer[],          -- cantidades de chances; NULL = todos
  usos text NOT NULL DEFAULT 'unico' CHECK (usos IN ('unico','ilimitado')),
  vence_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT NOW()
);

-- Un código personal por destinatario
CREATE TABLE IF NOT EXISTS public.promo_codigos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campania_id uuid NOT NULL REFERENCES public.promo_campanias(id) ON DELETE CASCADE,
  codigo text NOT NULL UNIQUE,
  persona_key text NOT NULL,           -- email normalizado o teléfono en dígitos
  nombre text,
  telefono text,
  pais text,
  chances_al_envio integer,
  usos_confirmados integer NOT NULL DEFAULT 0,
  primer_uso_at timestamptz,
  created_at timestamptz DEFAULT NOW(),
  UNIQUE (campania_id, persona_key)    -- idempotencia: nadie recibe dos veces la misma campaña
);

ALTER TABLE public.compradores
  ADD COLUMN IF NOT EXISTS promo_codigo_id uuid REFERENCES public.promo_codigos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS precio_lista numeric;   -- precio sin descuento, solo si hubo promo

ALTER TABLE public.whatsapp_envios
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'transferencia',  -- 'transferencia' | 'promo'
  ADD COLUMN IF NOT EXISTS promo_codigo_id uuid REFERENCES public.promo_codigos(id) ON DELETE SET NULL;

-- Mismo criterio que compradores / whatsapp_envios: fuera de la Data API pública.
ALTER TABLE public.promo_campanias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codigos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.promo_campanias FROM anon, authenticated;
REVOKE ALL ON TABLE public.promo_codigos FROM anon, authenticated;

INSERT INTO public.configuracion (clave, valor) VALUES
  ('whatsapp_costo_unitario_promo', '0.076')
ON CONFLICT (clave) DO NOTHING;
```

### `scripts/28-add-ranking-function.sql`

Función `obtener_ranking_sorteo(p_sorteo_id uuid, p_limite int DEFAULT NULL)` que devuelve una fila por persona: `persona_key`, `nombre` (de la compra más reciente), `email`, `telefono`, `pais_transferencia`, `chances` (suma), `compras` (count), `ultima_compra`. Filtros de la sección 2. Orden: `chances DESC, ultima_compra ASC` (empate: quien llegó primero). `SECURITY INVOKER`, `REVOKE EXECUTE ... FROM anon, authenticated`; se llama solo con la service role. Agregá índice si hace falta (`compradores (sorteo_id, estado_pago)` probablemente ya existe; verificá en migraciones anteriores).

No apliques las migraciones a producción: dejalas escritas y decile al humano que las corra en el SQL editor de Supabase.

---

## 5. Lógica de descuento (`lib/promos.ts`, nuevo)

Funciones puras con tests (`tests/promos.test.ts`, script `"test:promos": "tsx --test tests/promos.test.ts"`):

- `generarCodigoPromo(): string`
- `aplicarDescuento(monto: number, porcentaje: number): number` → `Math.round(monto * (100 - porcentaje) / 100)`
- `packAplica(campania, cantidadChances): boolean`
- `validarCodigo(codigo, campania, ahora)` → `{ ok: true } | { ok: false, motivo: 'no_existe' | 'vencido' | 'usado' | 'otro_sorteo' | 'pack_no_aplica' }`
- `precioConPromo(sorteo, cantidadChances, pais | 'MP', campania)` → `{ lista, final, moneda }`. MercadoPago siempre es ARS con el precio de `crear-preferencia`; transferencia usa `obtenerPrecioTransferencia`.

Server-only en `lib/database.ts`: `obtenerPromoPorCodigo(codigo)` (código + campaña), `crearCampaniaPromo(...)`, `marcarCodigoUsado(codigoId)`.

**Uso único sin carreras:** `marcarCodigoUsado` hace un UPDATE condicional (`usos_confirmados = usos_confirmados + 1, primer_uso_at = COALESCE(primer_uso_at, NOW())`, y para `usos = 'unico'` la condición `usos_confirmados = 0`). Si no actualiza ninguna fila, el código ya se usó: **nunca rechazar un pago ya aprobado por esto**. Se asignan los números igual y se loguea un warning.

---

## 6. Checkout con promo

### MercadoPago
1. `crear-preferencia` recibe `promoCodigo?`. Si viene: `validarCodigo` (sorteo, vencimiento, pack, y si es `unico` que `usos_confirmados = 0`); si no es válido → 400 con mensaje claro (`"La promo venció"`, etc.). Si es válido: `unit_price = final` y `metadata.promo_codigo = codigo`, `metadata.precio_lista = lista`.
2. `confirmar-pago` → `processApprovedPayment`: hoy busca un pack cuyo `price === amount`. Si `metadata.promo_codigo` existe, buscar la campaña y aceptar `amount === aplicarDescuento(pack.price, porcentaje)` para el pack de `metadata.chances` (no re-validar el vencimiento: el pago ya se aprobó). Crear el comprador con `precio_pagado = amount`, `promo_codigo_id`, `precio_lista`, y llamar a `marcarCodigoUsado`. `crearComprador` hoy no recibe esos campos: extendelo con parámetros opcionales al final, sin romper las llamadas existentes.
3. Mantener la idempotencia existente (`findExistingPurchase` por `mercadopago_id`): el código se marca usado solo en el camino que crea el comprador.

### Transferencia
1. `/api/transferencia` recibe `promoCodigo?` en el FormData y lo valida igual. Además rechazá si ya hay otra transferencia `pendiente` con ese `promo_codigo_id` y `usos = 'unico'`.
2. `crearCompradorTransferencia` guarda `precio_pagado = final`, `precio_lista`, `promo_codigo_id`.
3. `aprobarTransferencia` llama a `marcarCodigoUsado` después de marcar `pagado`. `rechazarTransferencia` no toca el código (queda libre).
4. El backoffice de transferencias pendientes muestra un badge "Promo −30%" cuando `promo_codigo_id` no es null, para que el admin compare con el monto del comprobante.

### Front
- `app/promo/[codigo]/page.tsx`: redirige a `/?promo={codigo}` (server component, `redirect`).
- `GET /api/promo/[codigo]` (público, con `requirePublishedSite`): devuelve solo `{ nombre (primer nombre), porcentaje, venceAt, packsAplicables }` o `{ valido: false, motivo }`. Nada de teléfono ni email.
- `app/page.tsx`: lee `?promo=`, lo valida con esa API, guarda el código en `sessionStorage` (envuelto en try/catch), muestra banner con cuenta regresiva y pasa la promo a `CompraModalNuevo` para mostrar precio tachado y precio final (ARS y PYG). Los requests a `/api/crear-preferencia` y `/api/transferencia` incluyen `promoCodigo`. Si la promo vence o no es válida, banner discreto "Esta promo ya no está disponible" y precios normales.
- El precio que se muestra en el front es solo informativo: **el servidor siempre recalcula**.

---

## 7. Ranking

- `GET /api/ranking` (público, `requirePublishedSite`): sorteo activo, respeta `rankingVisible`/`rankingCantidad` de `contenido_sitio`, devuelve `[{ puesto, nombre, chances }]` con el nombre ya truncado en el servidor. Cache: `revalidate` corto (30–60 s) o `Cache-Control: s-maxage=30, stale-while-revalidate=60`.
- `components/ranking-en-vivo.tsx`: tarjetas como la referencia, polling cada 60 s, estado vacío (no renderizar la sección si no hay datos o está oculta). Ubicación en la landing: después de la sección de packs/progreso y antes de "ver números"; ajustala si el layout lo pide.
- Backoffice, pestaña nueva `value="ranking"` (ícono `Trophy` o `Medal` de lucide) en `app/backoffice/page.tsx`, con su contenido en `components/ranking-backoffice.tsx` para no engordar más el page (ya tiene ~2300 líneas). Columnas: casilla, puesto, nombre, teléfono, país, chances, compras, último envío de promo. Filtro por mínimo de chances, búsqueda por nombre, "seleccionar todos los filtrados". Las filas sin teléfono válido (`esNumeroTelefono` + `normalizarTelefono` dan null) aparecen deshabilitadas con badge "sin teléfono".
- Datos admin vía `callAdminDatabase` (patrón existente en `lib/database.ts` y `lib/admin-database-client.ts`), con `obtenerRankingAdmin(sorteoId)`.

---

## 8. Envío por WhatsApp

### Template (lo crea el humano en Twilio, no vos)
Categoría **Marketing**, idioma `es`. Texto propuesto (pendiente de aprobación del cliente y de Meta):

```
¡Hola {{1}}! Sos uno de los participantes con más chances en el sorteo de {{2}}: tenés {{3}} chances.

Por estar en el top te dejamos un {{4}} OFF en cualquier pack para sumar más números. Válido hasta el {{5}}.
```
Botón URL: `https://www.agustinsosa.com/promo/{{6}}`

| Var | Valor | Ejemplo |
|---|---|---|
| 1 | primer nombre | Leopoldo |
| 2 | `brandName` | Agustin Sosa |
| 3 | chances al envío | 600 |
| 4 | porcentaje | 30% |
| 5 | vencimiento formateado `dd/MM a las HH:mm` (hora AR) | 05/10 a las 23:59 |
| 6 | código | K7Q2M9XA |

Env var nueva: `TWILIO_CONTENT_SID_PROMO` (`HX…`). Agregala a `getWhatsAppBrandConfig` (`contentSidPromo`), a `.env.example` sin valor real y a la sección de variables de `CLAUDE.md`. Si falta, el envío de promos responde error claro y el resto de la app funciona igual. Nunca commitees SIDs ni tokens.

### Provider
- En `TwilioProvider`, extraé el `fetch` a Twilio a `enviarTemplate({ telefono, pais, contentSid, variables })`. `enviarTransferenciaAprobada` pasa a usarlo sin cambiar su comportamiento (los tests actuales tienen que seguir pasando).
- Agregá `enviarPromo(params)` con `construirVariablesPromo(...)` exportada y testeada (ninguna variable vacía: WhatsApp las rechaza; usar `-` como hoy).

### Ruta `POST /api/promos/enviar` (admin, `requireAdminRequest(request, { verifyOrigin: true })`)
- Primera llamada: `{ sorteoId, porcentaje, packsAplicables, usos, venceAt, destinatarios: persona_key[] }` → crea la campaña y los códigos (`INSERT ... ON CONFLICT (campania_id, persona_key) DO NOTHING`), devuelve `campaniaId` y total.
- Envío por lotes: `{ campaniaId, lote }` envía hasta **20 mensajes por request** (cuidado con el timeout de Vercel) a los códigos de la campaña que todavía no tienen un `whatsapp_envios` con `tipo='promo'`. Devuelve `{ enviados, errores, pendientes }`. El cliente repite hasta `pendientes = 0`, mostrando el progreso. Esto da idempotencia gratis: si se corta, se retoma.
- Cada intento se registra en `whatsapp_envios` con `tipo='promo'`, `promo_codigo_id`, `sorteo_id` y `costo_unitario` = snapshot de `whatsapp_costo_unitario_promo`.
- Datos del destinatario: recalculalos en el servidor desde `obtener_ranking_sorteo`; no confíes en nombre ni teléfono enviados por el cliente.

### UI de campaña (en `ranking-backoffice.tsx`)
Panel debajo de la tabla: porcentaje, packs (checkboxes de los packs visibles), vencimiento (`datetime-local`), usos (radio), costo estimado (`seleccionados × costo promo`, desde `obtenerConfiguracionWhatsApp`), vista previa del mensaje con los datos del primer seleccionado, botón "Enviar promo" con diálogo de confirmación (`AlertDialog` de shadcn), y barra de progreso durante el envío.

---

## 9. Reportes

- `ConfiguracionWhatsApp` suma `costoUnitarioPromo`; `components/reporte-whatsapp.tsx` permite editarlo en modo dueño, igual que el actual.
- `obtenerReporteWhatsApp` agrega `porTipo: { tipo, cantidad, costoBase, costoConMargen }[]` y pide `tipo` en el select. Las filas viejas son `'transferencia'` por el default de la columna.
- Reporte por campaña (en la pestaña Ranking, lista de campañas del sorteo): fecha, % de descuento, vence, enviados, errores, códigos usados, recaudado (`sum(precio_pagado)` de `compradores` con ese `promo_codigo_id`, `estado_pago='pagado'`, separado por moneda) y costo de WhatsApp.

---

## 10. Plan de trabajo (en orden, con el timebox de cada parte)

1. Migraciones 27 y 28 + `lib/promos.ts` + tests (≈2 h)
2. `/api/ranking` + `ranking-en-vivo.tsx` + toggles en `contenido` (≈3 h)
3. Pestaña Ranking del backoffice con selección (≈3 h)
4. Refactor del provider + `enviarPromo` + `/api/promos/enviar` por lotes + UI de campaña (≈5 h)
5. Checkout con promo: `/promo/[codigo]`, API pública, banner, modal, `crear-preferencia`, `confirmar-pago`, transferencia, aprobación (≈4 h)
6. Reportes (≈1 h)
7. Verificación (≈2 h)

Trabajá en una rama `feat/ranking-promos`. Un commit por paso con mensajes `feat: …` como el historial existente.

---

## 11. Verificación

`pnpm build` ignora errores de TypeScript y ESLint, así que no alcanza. Antes de dar algo por terminado:

```bash
npx tsc --noEmit
pnpm lint
pnpm test:whatsapp
pnpm test:promos
```

Criterios de aceptación:
- [ ] El ranking público muestra solo pagados, agrupa a la misma persona, no expone datos de contacto y se oculta desde el backoffice.
- [ ] Una compra por MercadoPago con promo cobra el precio con descuento, el webhook la acepta, asigna números con `generarNumerosUnicos` y marca el código usado.
- [ ] Una compra por MercadoPago **sin** promo sigue funcionando igual que antes (no romper la validación de monto).
- [ ] Una transferencia con promo guarda el precio con descuento; el código se marca usado solo al aprobar; si se rechaza, queda libre.
- [ ] Un código `unico` no se puede usar en una segunda compra; uno vencido o de otro sorteo da un error claro y la landing muestra precios normales.
- [ ] Reintentar el envío de una campaña no duplica mensajes.
- [ ] Sin `TWILIO_CONTENT_SID_PROMO`, el envío de promos falla con un error claro y el aviso de transferencia sigue funcionando.
- [ ] Los envíos de promo se registran con `tipo='promo'` y su costo; el reporte los separa.

No hagas envíos reales de WhatsApp ni pagos reales: dejá eso para la prueba manual del humano y listá en el resumen final qué hay que probar a mano.

---

## 12. Invariantes que no se pueden romper

- Los números se asignan **solo** con `generarNumerosUnicos()` (función atómica en Postgres + trigger anti-duplicados). Nunca insertes `numeros_asignados` a mano.
- El precio lo calcula siempre el servidor. Nunca uses un precio que venga del cliente.
- Un pago aprobado por MercadoPago nunca se rechaza por un problema con el código: se asignan los números y se loguea.
- Las tablas nuevas quedan fuera de la Data API pública (RLS + `REVOKE`), igual que `compradores` y `whatsapp_envios`.
- `contenido_sitio` se actualiza solo con `actualizarContenido` (read-merge-write).
- Sin secretos en el repo.

## 13. Pendientes del lado del humano

- Crear el template en Twilio (sección 8), esperar la aprobación de Meta y cargar `TWILIO_CONTENT_SID_PROMO` en Vercel.
- Correr las migraciones 27 y 28 en Supabase.
- Confirmar con el cliente el texto del mensaje, el formato del nombre en el ranking y el top por defecto.
- Prueba manual end-to-end: una compra MP con promo en sandbox, una transferencia con promo aprobada y otra rechazada, y una campaña a un teléfono propio.
