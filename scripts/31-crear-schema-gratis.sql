-- Schema "gratis": versión de sorteos gratis en la MISMA base de Supabase.
--
-- La copia del sitio apunta a este schema con
--   NEXT_PUBLIC_SUPABASE_DB_SCHEMA=gratis
-- (lib/supabase.ts y lib/supabase-admin.ts). El sitio principal sigue en
-- "public" y no se toca.
--
-- En vez de repetir las migraciones 01–30, este script clona la estructura
-- ACTUAL de "public" (tablas, defaults, índices, checks, FKs, funciones,
-- triggers, RLS, políticas y permisos) dentro de "gratis". Las funciones se
-- recrean con search_path = gratis, así que generar_numeros_unicos_atomico,
-- obtener_estadisticas_sorteo, etc. operan sobre las tablas de "gratis".
--
-- Datos: solo se copia `configuracion` (sin contenido_sitio) con
-- sitio_publicado = false. Sorteos, compradores y demás quedan vacíos.
--
-- Al final se crea gratis.leads: contactos con consentimiento de marketing
-- para promocionar el sitio principal.
--
-- DESPUÉS DE CORRERLO: Supabase Dashboard → Project Settings → Data API →
-- "Exposed schemas" → agregar "gratis". Sin eso la API responde
-- "The schema must be one of the following: public, ...".

DO $clonar$
DECLARE
  origen CONSTANT text := 'public';
  destino CONSTANT text := 'gratis';
  r record;
  def text;
  nueva_seq text;
  nuevo_oid oid;
  roles_txt text;
BEGIN
  IF to_regclass('gratis.sorteos') IS NOT NULL THEN
    RAISE EXCEPTION 'El schema gratis ya existe con tablas. Este script es solo para la creación inicial.';
  END IF;

  -- Con search_path vacío, pg_get_*def devuelve todo calificado con "public.",
  -- y eso es lo que reemplazamos por "gratis.".
  PERFORM set_config('search_path', 'pg_catalog', true);
  -- Las funciones SQL se validan al crearse y pueden llamarse entre sí; se
  -- validan recién al ejecutarse, cuando ya existen todas.
  PERFORM set_config('check_function_bodies', 'off', true);

  EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', destino);

  -- 1. Tablas (columnas, defaults, checks, índices, identity, comentarios).
  FOR r IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = origen AND c.relkind IN ('r', 'p')
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = c.oid AND d.deptype = 'e')
    ORDER BY c.relname
  LOOP
    EXECUTE format('CREATE TABLE %I.%I (LIKE %I.%I INCLUDING ALL)', destino, r.relname, origen, r.relname);
  END LOOP;

  -- 2. Columnas serial: LIKE copia el default nextval() apuntando a la
  --    secuencia de public. Se crea una secuencia propia en gratis.
  FOR r IN
    SELECT a.attrelid::regclass AS tabla, c.relname, a.attname,
           pg_get_expr(ad.adbin, ad.adrelid) AS expr
    FROM pg_attrdef ad
    JOIN pg_attribute a ON a.attrelid = ad.adrelid AND a.attnum = ad.adnum
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = destino AND pg_get_expr(ad.adbin, ad.adrelid) LIKE 'nextval(%'
  LOOP
    nueva_seq := format('%s_%s_seq', r.relname, r.attname);
    EXECUTE format('CREATE SEQUENCE %I.%I OWNED BY %I.%I.%I', destino, nueva_seq, destino, r.relname, r.attname);
    EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN %I SET DEFAULT nextval(%L)',
      destino, r.relname, r.attname, format('%I.%I', destino, nueva_seq));
  END LOOP;

  -- 3. Configuración inicial con el sitio despublicado. No se copian los
  --    textos del sitio (contenido_sitio): el sitio gratis arranca con sus
  --    propios textos por defecto y se editan desde su backoffice.
  INSERT INTO gratis.configuracion
  SELECT * FROM public.configuracion WHERE clave <> 'contenido_sitio';
  UPDATE gratis.configuracion SET valor = 'false' WHERE clave = 'sitio_publicado';

  -- 4. Foreign keys.
  FOR r IN
    SELECT c.relname, con.conname, pg_get_constraintdef(con.oid) AS def
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = origen AND con.contype = 'f'
      AND to_regclass(format('%I.%I', destino, c.relname)) IS NOT NULL
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I %s',
      destino, r.relname, r.conname, replace(r.def, origen || '.', destino || '.'));
  END LOOP;

  -- 5. Funciones (RPCs y funciones de triggers) con search_path = gratis.
  FOR r IN
    SELECT p.oid, p.proname, p.proacl, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = origen AND p.prokind IN ('f', 'p')
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
  LOOP
    def := replace(pg_get_functiondef(r.oid), origen || '.', destino || '.');
    IF def ~ '\n SET search_path TO [^\n]*' THEN
      def := regexp_replace(def, '(\n SET search_path TO [^\n]*)',
        E'\n SET search_path TO ''gratis'', ''extensions'', ''pg_temp''');
    ELSE
      def := regexp_replace(def, '\nAS ',
        E'\n SET search_path TO ''gratis'', ''extensions'', ''pg_temp''\nAS ');
    END IF;
    EXECUTE def;

    SELECT p2.oid INTO nuevo_oid
    FROM pg_proc p2
    WHERE p2.pronamespace = destino::regnamespace AND p2.proname = r.proname
      AND pg_get_function_identity_arguments(p2.oid) = replace(r.args, origen || '.', destino || '.');
    IF r.proacl IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', nuevo_oid::regprocedure);
      FOR roles_txt IN
        SELECT CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(a.grantee)) END
        FROM aclexplode(r.proacl) a
        WHERE a.privilege_type = 'EXECUTE'
      LOOP
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO %s', nuevo_oid::regprocedure, roles_txt);
      END LOOP;
    END IF;
  END LOOP;

  -- 6. Triggers.
  FOR r IN
    SELECT t.oid
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = origen AND NOT t.tgisinternal
      AND to_regclass(format('%I.%I', destino, c.relname)) IS NOT NULL
  LOOP
    EXECUTE replace(pg_get_triggerdef(r.oid), origen || '.', destino || '.');
  END LOOP;

  -- 7. RLS + políticas.
  FOR r IN
    SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = origen AND c.relkind IN ('r', 'p')
      AND to_regclass(format('%I.%I', destino, c.relname)) IS NOT NULL
  LOOP
    IF r.relrowsecurity THEN
      EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', destino, r.relname);
    END IF;
    IF r.relforcerowsecurity THEN
      EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', destino, r.relname);
    END IF;
  END LOOP;

  FOR r IN
    SELECT c.relname, pol.polname, pol.polpermissive, pol.polcmd, pol.polroles,
           pg_get_expr(pol.polqual, pol.polrelid) AS qual,
           pg_get_expr(pol.polwithcheck, pol.polrelid) AS chk
    FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = origen
      AND to_regclass(format('%I.%I', destino, c.relname)) IS NOT NULL
  LOOP
    SELECT string_agg(CASE WHEN x = 0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(x)) END, ', ')
      INTO roles_txt
    FROM unnest(r.polroles) AS x;

    EXECUTE format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s%s%s',
      r.polname, destino, r.relname,
      CASE WHEN r.polpermissive THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
      CASE r.polcmd WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT' WHEN 'w' THEN 'UPDATE'
                    WHEN 'd' THEN 'DELETE' ELSE 'ALL' END,
      roles_txt,
      CASE WHEN r.qual IS NULL THEN '' ELSE ' USING (' || replace(r.qual, origen || '.', destino || '.') || ')' END,
      CASE WHEN r.chk IS NULL THEN '' ELSE ' WITH CHECK (' || replace(r.chk, origen || '.', destino || '.') || ')' END);
  END LOOP;

  -- 8. Permisos de tablas y secuencias: los mismos que en public.
  FOR r IN
    SELECT c.relname, c.relkind, c.relacl
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = destino AND c.relkind IN ('r', 'p', 'S')
  LOOP
    EXECUTE format('REVOKE ALL ON %s %I.%I FROM PUBLIC, anon, authenticated',
      CASE WHEN r.relkind = 'S' THEN 'SEQUENCE' ELSE 'TABLE' END, destino, r.relname);
  END LOOP;

  FOR r IN
    SELECT c.relname, a.privilege_type,
           CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(a.grantee)) END AS rol
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    CROSS JOIN LATERAL aclexplode(c.relacl) a
    WHERE n.nspname = origen AND c.relkind IN ('r', 'p') AND c.relacl IS NOT NULL
      AND a.grantee <> c.relowner
      AND to_regclass(format('%I.%I', destino, c.relname)) IS NOT NULL
  LOOP
    EXECUTE format('GRANT %s ON TABLE %I.%I TO %s', r.privilege_type, destino, r.relname, r.rol);
  END LOOP;
END
$clonar$;

-- El servidor (service role) opera sobre todo el schema; anon/authenticated
-- solo ven lo que las políticas copiadas permiten.
GRANT USAGE ON SCHEMA gratis TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA gratis TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA gratis TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA gratis TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA gratis GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA gratis GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA gratis GRANT EXECUTE ON FUNCTIONS TO service_role;

-- ---------------------------------------------------------------------------
-- Leads: un registro por persona (email y/o teléfono), con consentimiento de
-- marketing explícito (Ley 25.326 AR; opt-in requerido por Meta para
-- plantillas de marketing de WhatsApp).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gratis.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text,
  email text,
  telefono text,                     -- normalizado 549… / 595…
  instagram text,
  pais text,                         -- 'AR' | 'PY'
  provincia text,
  ciudad text,

  acepta_email boolean NOT NULL DEFAULT false,
  acepta_whatsapp boolean NOT NULL DEFAULT false,
  consentimiento_texto text,         -- texto exacto que aceptó
  consentimiento_at timestamptz,
  consentimiento_ip text,
  baja_at timestamptz,               -- se dio de baja: no contactar

  origen jsonb,                      -- utm_source, utm_campaign, referrer…
  primer_sorteo_id uuid REFERENCES gratis.sorteos(id) ON DELETE SET NULL,
  participaciones integer NOT NULL DEFAULT 0,
  ultima_participacion_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CHECK (email IS NOT NULL OR telefono IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_leads_email ON gratis.leads (lower(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_leads_telefono ON gratis.leads (telefono) WHERE telefono IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_contactables
  ON gratis.leads (created_at) WHERE baja_at IS NULL AND (acepta_email OR acepta_whatsapp);

-- Datos personales: solo el servidor (service role) lee y escribe.
ALTER TABLE gratis.leads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE gratis.leads FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE gratis.leads TO service_role;

-- Ejemplo: leads contactables que todavía no compraron en el sitio principal.
--
-- SELECT l.*
-- FROM gratis.leads l
-- WHERE l.baja_at IS NULL
--   AND (l.acepta_email OR l.acepta_whatsapp)
--   AND NOT EXISTS (
--     SELECT 1 FROM public.compradores c
--     WHERE c.estado_pago = 'pagado' AND c.metodo_pago <> 'gratuito'
--       AND (lower(c.email) = lower(l.email) OR c.telefono = l.telefono)
--   );
