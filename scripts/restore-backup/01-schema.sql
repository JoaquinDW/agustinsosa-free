-- Esquema mínimo y funciones que necesita la aplicación para restaurar los CSV.
-- Diseñado para un proyecto Supabase nuevo. Es idempotente para permitir reintentos.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.sorteos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  total_chances INTEGER NOT NULL DEFAULT 9999,
  precio_6_chances INTEGER NOT NULL DEFAULT 21000,
  precio_12_chances INTEGER NOT NULL DEFAULT 42000,
  precio_24_chances INTEGER NOT NULL DEFAULT 84000,
  fecha_sorteo DATE,
  estado VARCHAR(50) NOT NULL DEFAULT 'activo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ganador_id UUID,
  numero_ganador INTEGER,
  fecha_sorteo_realizado TIMESTAMPTZ,
  ganador_nombre TEXT,
  cantidad_pack_1 INTEGER NOT NULL DEFAULT 6,
  cantidad_pack_2 INTEGER NOT NULL DEFAULT 12,
  cantidad_pack_3 INTEGER NOT NULL DEFAULT 24,
  titulo_remera VARCHAR(255) NOT NULL DEFAULT 'Remera Exclusiva',
  imagen_url TEXT,
  carousel_image_1 TEXT,
  carousel_image_2 TEXT,
  carousel_image_3 TEXT,
  carousel_image_4 TEXT,
  carousel_image_5 TEXT,
  carousel_image_6 TEXT,
  carousel_image_7 TEXT,
  carousel_image_8 TEXT,
  pack_1_visible BOOLEAN NOT NULL DEFAULT true,
  pack_2_visible BOOLEAN NOT NULL DEFAULT true,
  pack_3_visible BOOLEAN NOT NULL DEFAULT true,
  descripcion_pack_1 TEXT NOT NULL DEFAULT '',
  descripcion_pack_2 TEXT NOT NULL DEFAULT '',
  descripcion_pack_3 TEXT NOT NULL DEFAULT '',
  cantidad_pack_4 INTEGER NOT NULL DEFAULT 0,
  precio_pack_4 INTEGER NOT NULL DEFAULT 0,
  pack_4_visible BOOLEAN NOT NULL DEFAULT false,
  descripcion_pack_4 TEXT NOT NULL DEFAULT '',
  cantidad_pack_5 INTEGER NOT NULL DEFAULT 0,
  precio_pack_5 INTEGER NOT NULL DEFAULT 0,
  pack_5_visible BOOLEAN NOT NULL DEFAULT false,
  descripcion_pack_5 TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS public.compradores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sorteo_id UUID NOT NULL REFERENCES public.sorteos(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  cantidad_chances INTEGER NOT NULL,
  numeros_asignados INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  precio_pagado INTEGER NOT NULL,
  estado_pago VARCHAR(50) NOT NULL DEFAULT 'pendiente',
  mercadopago_id VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  es_ganador BOOLEAN NOT NULL DEFAULT false,
  telefono TEXT,
  metodo_pago VARCHAR(20) DEFAULT 'transferencia',
  comprobante_url VARCHAR(500),
  estado_transferencia VARCHAR(20),
  fecha_transferencia TIMESTAMP,
  admin_revisor VARCHAR(100),
  notas_admin TEXT,
  instagram_username VARCHAR(255),
  datos_encuesta JSONB
);

DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sorteos_ganador_id_fkey'
      AND conrelid = 'public.sorteos'::regclass
  ) THEN
    ALTER TABLE public.sorteos
      ADD CONSTRAINT sorteos_ganador_id_fkey
      FOREIGN KEY (ganador_id) REFERENCES public.compradores(id);
  END IF;
END
$do$;

CREATE TABLE IF NOT EXISTS public.ganadores_pasados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_ganador TEXT NOT NULL,
  premio TEXT NOT NULL,
  precio_premio TEXT NOT NULL,
  fecha_sorteo DATE NOT NULL,
  numero_ganador INTEGER NOT NULL,
  imagen_1_url TEXT,
  imagen_2_url TEXT,
  imagen_3_url TEXT,
  orden INTEGER NOT NULL DEFAULT 0,
  visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ganadores_express (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sorteo_id UUID REFERENCES public.sorteos(id) ON DELETE CASCADE,
  numero_ganador INTEGER NOT NULL,
  nombre_ganador TEXT,
  premio_monto TEXT NOT NULL,
  fecha_premio DATE NOT NULL DEFAULT current_date,
  visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.configuracion (
  clave VARCHAR(100) PRIMARY KEY,
  valor TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contenido_historial (
  id BIGSERIAL PRIMARY KEY,
  clave TEXT NOT NULL,
  valor_anterior TEXT NOT NULL,
  reemplazado_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sorteos_estado
  ON public.sorteos(estado);
CREATE INDEX IF NOT EXISTS idx_compradores_sorteo_id
  ON public.compradores(sorteo_id);
CREATE INDEX IF NOT EXISTS idx_compradores_sorteo_estado
  ON public.compradores(sorteo_id, estado_pago);
CREATE INDEX IF NOT EXISTS idx_compradores_email
  ON public.compradores(email);
CREATE INDEX IF NOT EXISTS idx_compradores_estado_pago
  ON public.compradores(estado_pago);
CREATE INDEX IF NOT EXISTS idx_compradores_ganador
  ON public.compradores(es_ganador);
CREATE INDEX IF NOT EXISTS idx_compradores_numeros_asignados
  ON public.compradores USING gin(numeros_asignados);
CREATE INDEX IF NOT EXISTS idx_compradores_gratuito_email
  ON public.compradores(sorteo_id, lower(email))
  WHERE metodo_pago = 'gratuito';
CREATE INDEX IF NOT EXISTS idx_ganadores_pasados_orden
  ON public.ganadores_pasados(orden DESC);
CREATE INDEX IF NOT EXISTS idx_ganadores_pasados_visible_orden
  ON public.ganadores_pasados(visible, orden DESC)
  WHERE visible = true;
CREATE INDEX IF NOT EXISTS idx_ganadores_express_sorteo_visible
  ON public.ganadores_express(sorteo_id, visible)
  WHERE visible = true;
CREATE INDEX IF NOT EXISTS idx_contenido_historial_clave_fecha
  ON public.contenido_historial(clave, reemplazado_at DESC);

-- El backup no incluyó `sorteos`. Los 1.110 compradores apuntan todos a este UUID.
-- Los campos recuperables se infirieron de los CSV y de contenido_sitio.
INSERT INTO public.sorteos (
  id,
  nombre,
  descripcion,
  total_chances,
  cantidad_pack_1,
  cantidad_pack_2,
  cantidad_pack_3,
  precio_6_chances,
  precio_12_chances,
  precio_24_chances,
  fecha_sorteo,
  estado,
  titulo_remera,
  pack_1_visible,
  pack_2_visible,
  pack_3_visible,
  created_at,
  updated_at
) VALUES (
  '88bf8af4-ed1c-4c38-b0fb-b9a492ed5752',
  'IPHONE 17 PRO MAX',
  'Sorteo restaurado desde los backups CSV disponibles',
  9999,
  3,
  10,
  25,
  3000,
  8000,
  15000,
  DATE '2026-07-10',
  'completo',
  'IPHONE 17 PRO MAX',
  false,
  false,
  false,
  TIMESTAMPTZ '2026-06-24 21:39:06.993927+00',
  TIMESTAMPTZ '2026-07-11 02:54:08.938873+00'
)
ON CONFLICT (id) DO NOTHING;

-- Funciones usadas por la landing y el backoffice.
CREATE OR REPLACE FUNCTION public.obtener_estadisticas_sorteo(sorteo_id_param UUID)
RETURNS TABLE (
  total_compradores BIGINT,
  chances_vendidas BIGINT,
  total_recaudado NUMERIC
)
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public
AS $function$
  SELECT
    count(DISTINCT c.id)::BIGINT,
    (
      SELECT count(DISTINCT numero)::BIGINT
      FROM public.compradores AS c2
      CROSS JOIN LATERAL unnest(c2.numeros_asignados) AS numero
      WHERE c2.sorteo_id = sorteo_id_param
        AND c2.estado_pago = 'pagado'
    ),
    coalesce(sum(c.precio_pagado), 0)::NUMERIC
  FROM public.compradores AS c
  WHERE c.sorteo_id = sorteo_id_param
    AND c.estado_pago = 'pagado';
$function$;

CREATE OR REPLACE FUNCTION public.obtener_ganadores_express_visibles(
  sorteo_id_param UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  numero_ganador INTEGER,
  nombre_ganador TEXT,
  premio_monto TEXT,
  fecha_premio DATE,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public
AS $function$
  SELECT
    ge.id,
    ge.numero_ganador,
    ge.nombre_ganador,
    ge.premio_monto,
    ge.fecha_premio,
    ge.created_at
  FROM public.ganadores_express AS ge
  LEFT JOIN public.sorteos AS s ON s.id = ge.sorteo_id
  WHERE ge.visible = true
    AND (
      (sorteo_id_param IS NOT NULL AND ge.sorteo_id = sorteo_id_param)
      OR
      (sorteo_id_param IS NULL AND s.estado = 'activo')
    )
  ORDER BY ge.created_at DESC;
$function$;

CREATE OR REPLACE FUNCTION public.generar_numeros_unicos_atomico(
  p_sorteo_id UUID,
  p_cantidad INTEGER
)
RETURNS INTEGER[]
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_total_chances INTEGER;
  v_resultado INTEGER[];
BEGIN
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor que cero';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_sorteo_id::TEXT));

  SELECT total_chances
  INTO v_total_chances
  FROM public.sorteos
  WHERE id = p_sorteo_id;

  IF v_total_chances IS NULL THEN
    RAISE EXCEPTION 'No existe el sorteo %', p_sorteo_id;
  END IF;

  -- Mezclar todos los números libres ANTES de limitar la cantidad.
  -- Mezclar con array_agg después del LIMIT solo reordena los primeros libres.
  SELECT array_agg(numero ORDER BY numero)
  INTO v_resultado
  FROM (
    SELECT gs.numero
    FROM generate_series(0, v_total_chances) AS gs(numero)
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.compradores AS c
      CROSS JOIN LATERAL unnest(c.numeros_asignados) AS ocupado(numero)
      WHERE c.sorteo_id = p_sorteo_id
        AND c.estado_pago = 'pagado'
        AND ocupado.numero = gs.numero
    )
    ORDER BY random()
    LIMIT p_cantidad
  ) AS candidatos;

  IF coalesce(array_length(v_resultado, 1), 0) < p_cantidad THEN
    RAISE EXCEPTION 'No hay suficientes números disponibles';
  END IF;

  RETURN v_resultado;
END;
$function$;

-- Historial de cambios de configuracion. Se instala luego de importar para no
-- crear una versión artificial durante la restauración.
CREATE OR REPLACE FUNCTION public.registrar_historial_configuracion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
  IF OLD.valor IS DISTINCT FROM NEW.valor THEN
    INSERT INTO public.contenido_historial(clave, valor_anterior)
    VALUES (OLD.clave, OLD.valor);

    DELETE FROM public.contenido_historial
    WHERE id IN (
      SELECT id
      FROM public.contenido_historial
      WHERE clave = OLD.clave
      ORDER BY reemplazado_at DESC
      OFFSET 50
    );
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.registrar_historial_configuracion() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.registrar_historial_configuracion() FROM anon, authenticated;

-- Supabase dejó de exponer automáticamente tablas nuevas al Data API en
-- proyectos nuevos. Estos grants mantienen el comportamiento de la app actual.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.sorteos,
  public.compradores,
  public.ganadores_pasados,
  public.ganadores_express,
  public.configuracion
TO anon, authenticated;
GRANT SELECT ON TABLE public.contenido_historial TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.contenido_historial_id_seq TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.obtener_estadisticas_sorteo(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.obtener_ganadores_express_visibles(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generar_numeros_unicos_atomico(UUID, INTEGER) TO anon, authenticated;

ALTER TABLE public.sorteos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ganadores_pasados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ganadores_express ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contenido_historial ENABLE ROW LEVEL SECURITY;

-- Políticas de compatibilidad con la aplicación existente. El backoffice usa
-- la anon key en el navegador, por eso hoy necesita acceso amplio. Ver README.
DROP POLICY IF EXISTS sorteos_compatibilidad_app ON public.sorteos;
CREATE POLICY sorteos_compatibilidad_app ON public.sorteos
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS compradores_compatibilidad_app ON public.compradores;
CREATE POLICY compradores_compatibilidad_app ON public.compradores
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS configuracion_compatibilidad_app ON public.configuracion;
CREATE POLICY configuracion_compatibilidad_app ON public.configuracion
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS ganadores_pasados_lectura ON public.ganadores_pasados;
CREATE POLICY ganadores_pasados_lectura ON public.ganadores_pasados
  FOR SELECT TO anon, authenticated USING (visible = true);
DROP POLICY IF EXISTS ganadores_pasados_escritura ON public.ganadores_pasados;
CREATE POLICY ganadores_pasados_escritura ON public.ganadores_pasados
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS ganadores_express_lectura ON public.ganadores_express;
CREATE POLICY ganadores_express_lectura ON public.ganadores_express
  FOR SELECT TO anon, authenticated USING (visible = true);
DROP POLICY IF EXISTS ganadores_express_escritura ON public.ganadores_express;
CREATE POLICY ganadores_express_escritura ON public.ganadores_express
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS contenido_historial_lectura ON public.contenido_historial;
CREATE POLICY contenido_historial_lectura ON public.contenido_historial
  FOR SELECT TO anon, authenticated USING (true);

COMMIT;
