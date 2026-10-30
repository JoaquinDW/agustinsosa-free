BEGIN;

-- El despliegue comienza cerrado. Un valor existente nunca se pisa.
INSERT INTO public.configuracion (clave, valor, updated_at)
VALUES ('sitio_publicado', 'false', NOW())
ON CONFLICT (clave) DO NOTHING;

-- Rate limit persistente del login. Los identificadores son HMACs de la IP,
-- nunca direcciones IP en texto plano.
CREATE TABLE IF NOT EXISTS public.admin_login_attempts (
  identifier_hash TEXT PRIMARY KEY,
  failed_attempts INTEGER NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
  blocked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_updated_at
  ON public.admin_login_attempts (updated_at);

DROP INDEX IF EXISTS public.idx_compradores_mercadopago_id_unique;
CREATE UNIQUE INDEX idx_compradores_mercadopago_id_unique
  ON public.compradores (mercadopago_id)
  WHERE mercadopago_id ~ '^[0-9]+$';

ALTER TABLE public.admin_login_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_login_attempts FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_admin_login_failure(
  p_identifier_hash TEXT
)
RETURNS TABLE(failed_attempts INTEGER, blocked_until TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.admin_login_attempts AS attempts (
    identifier_hash,
    failed_attempts,
    blocked_until,
    updated_at
  )
  VALUES (p_identifier_hash, 1, NULL, NOW())
  ON CONFLICT (identifier_hash) DO UPDATE
  SET
    failed_attempts = CASE
      WHEN attempts.updated_at < NOW() - INTERVAL '15 minutes' THEN 1
      ELSE attempts.failed_attempts + 1
    END,
    blocked_until = CASE
      WHEN (
        CASE
          WHEN attempts.updated_at < NOW() - INTERVAL '15 minutes' THEN 1
          ELSE attempts.failed_attempts + 1
        END
      ) >= 5 THEN NOW() + INTERVAL '15 minutes'
      ELSE NULL
    END,
    updated_at = NOW()
  RETURNING attempts.failed_attempts, attempts.blocked_until;
$$;

REVOKE ALL ON FUNCTION public.record_admin_login_failure(TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_admin_login_failure(TEXT)
  TO service_role;

-- Retirar las políticas de compatibilidad que permitían escribir usando la
-- clave pública del navegador.
DROP POLICY IF EXISTS "Permitir todas las operaciones en sorteos" ON public.sorteos;
DROP POLICY IF EXISTS "Permitir todas las operaciones en compradores" ON public.compradores;
DROP POLICY IF EXISTS "Permitir todas las operaciones en configuracion" ON public.configuracion;
DROP POLICY IF EXISTS "Permitir todas las operaciones en ganadores" ON public.ganadores_pasados;
DROP POLICY IF EXISTS "Ganadores visibles son públicos" ON public.ganadores_pasados;
DROP POLICY IF EXISTS "ganadores_express_select_visible" ON public.ganadores_express;
DROP POLICY IF EXISTS "ganadores_express_all_operations" ON public.ganadores_express;
DROP POLICY IF EXISTS "Lectura de historial" ON public.contenido_historial;
DROP POLICY IF EXISTS sorteos_compatibilidad_app ON public.sorteos;
DROP POLICY IF EXISTS compradores_compatibilidad_app ON public.compradores;
DROP POLICY IF EXISTS configuracion_compatibilidad_app ON public.configuracion;
DROP POLICY IF EXISTS ganadores_pasados_lectura ON public.ganadores_pasados;
DROP POLICY IF EXISTS ganadores_pasados_escritura ON public.ganadores_pasados;
DROP POLICY IF EXISTS ganadores_express_lectura ON public.ganadores_express;
DROP POLICY IF EXISTS ganadores_express_escritura ON public.ganadores_express;
DROP POLICY IF EXISTS contenido_historial_lectura ON public.contenido_historial;
DROP POLICY IF EXISTS sorteos_public_read ON public.sorteos;
DROP POLICY IF EXISTS configuracion_public_read ON public.configuracion;
DROP POLICY IF EXISTS ganadores_pasados_public_read ON public.ganadores_pasados;
DROP POLICY IF EXISTS ganadores_express_public_read ON public.ganadores_express;

ALTER TABLE public.sorteos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ganadores_pasados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ganadores_express ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contenido_historial ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.sorteos,
  public.compradores,
  public.configuracion,
  public.ganadores_pasados,
  public.ganadores_express,
  public.contenido_historial
FROM anon, authenticated;

-- El frontend conserva sólo lecturas de información pública. Compradores e
-- historial quedan completamente fuera de la Data API pública.
GRANT SELECT ON TABLE
  public.sorteos,
  public.configuracion,
  public.ganadores_pasados,
  public.ganadores_express
TO anon, authenticated;

CREATE POLICY sorteos_public_read
  ON public.sorteos FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY configuracion_public_read
  ON public.configuracion FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY ganadores_pasados_public_read
  ON public.ganadores_pasados FOR SELECT TO anon, authenticated
  USING (visible = true);

CREATE POLICY ganadores_express_public_read
  ON public.ganadores_express FOR SELECT TO anon, authenticated
  USING (visible = true);

-- Las funciones que leen compradores o mutan el pool sólo se ejecutan desde
-- rutas de servidor. La función de ganadores visibles sí es pública.
DO $security$
DECLARE
  function_signature TEXT;
BEGIN
  FOREACH function_signature IN ARRAY ARRAY[
    'public.generar_numeros_unicos_atomico(uuid,integer)',
    'public.obtener_estadisticas_sorteo(uuid)',
    'public.contar_compradores_sorteo(uuid,boolean)',
    'public.contar_chances_vendidas(uuid)',
    'public.verificar_sorteo_completo(uuid)',
    'public.obtener_resumen_sorteo_activo()',
    'public.diagnosticar_duplicados(uuid)',
    'public.obtener_compradores_con_duplicados(uuid)',
    'public.obtener_numeros_disponibles_para_reasignacion(uuid)',
    'public.diagnosticar_duplicados_rapido(uuid)',
    'public.obtener_compradores_duplicados_sample(uuid,integer)',
    'public.corregir_duplicados_comprador(uuid,uuid)'
  ] LOOP
    IF TO_REGPROCEDURE(function_signature) IS NOT NULL THEN
      EXECUTE format(
        'REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',
        function_signature
      );
      EXECUTE format(
        'GRANT EXECUTE ON FUNCTION %s TO service_role',
        function_signature
      );
    END IF;
  END LOOP;

  IF TO_REGPROCEDURE(
    'public.obtener_ganadores_express_visibles(uuid)'
  ) IS NOT NULL THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.obtener_ganadores_express_visibles(uuid) TO anon, authenticated, service_role';
  END IF;
END;
$security$;

-- Storage: los assets promocionales continúan siendo públicos para lectura,
-- los comprobantes pasan a privados y toda escritura queda del lado servidor.
UPDATE storage.buckets SET public = false WHERE id = 'comprobantes';

DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Public upload access" ON storage.objects;
DROP POLICY IF EXISTS "Public update access" ON storage.objects;
DROP POLICY IF EXISTS "Public delete access" ON storage.objects;
DROP POLICY IF EXISTS sosa_imagenes_insert ON storage.objects;
DROP POLICY IF EXISTS sosa_imagenes_select ON storage.objects;
DROP POLICY IF EXISTS sosa_imagenes_update ON storage.objects;
DROP POLICY IF EXISTS sosa_public_assets_read ON storage.objects;

CREATE POLICY sosa_public_assets_read
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id IN ('sorteo-images', 'tshirt-previews'));

COMMIT;
