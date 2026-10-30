BEGIN;

INSERT INTO public.configuracion(clave, valor, updated_at)
SELECT
  clave,
  valor,
  updated_at::TIMESTAMPTZ
FROM public._restore_configuracion
ON CONFLICT (clave) DO UPDATE SET
  valor = EXCLUDED.valor,
  updated_at = EXCLUDED.updated_at;

INSERT INTO public.contenido_historial(id, clave, valor_anterior, reemplazado_at)
SELECT
  id::BIGINT,
  clave,
  valor_anterior,
  reemplazado_at::TIMESTAMPTZ
FROM public._restore_contenido_historial
ON CONFLICT (id) DO UPDATE SET
  clave = EXCLUDED.clave,
  valor_anterior = EXCLUDED.valor_anterior,
  reemplazado_at = EXCLUDED.reemplazado_at;

INSERT INTO public.ganadores_pasados(
  id,
  nombre_ganador,
  premio,
  precio_premio,
  fecha_sorteo,
  numero_ganador,
  imagen_1_url,
  imagen_2_url,
  imagen_3_url,
  orden,
  visible,
  created_at,
  updated_at
)
SELECT
  id::UUID,
  nombre_ganador,
  premio,
  precio_premio,
  fecha_sorteo::DATE,
  numero_ganador::INTEGER,
  nullif(imagen_1_url, ''),
  nullif(imagen_2_url, ''),
  nullif(imagen_3_url, ''),
  orden::INTEGER,
  visible::BOOLEAN,
  created_at::TIMESTAMPTZ,
  updated_at::TIMESTAMPTZ
FROM public._restore_ganadores_pasados
ON CONFLICT (id) DO UPDATE SET
  nombre_ganador = EXCLUDED.nombre_ganador,
  premio = EXCLUDED.premio,
  precio_premio = EXCLUDED.precio_premio,
  fecha_sorteo = EXCLUDED.fecha_sorteo,
  numero_ganador = EXCLUDED.numero_ganador,
  imagen_1_url = EXCLUDED.imagen_1_url,
  imagen_2_url = EXCLUDED.imagen_2_url,
  imagen_3_url = EXCLUDED.imagen_3_url,
  orden = EXCLUDED.orden,
  visible = EXCLUDED.visible,
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at;

INSERT INTO public.compradores(
  id,
  sorteo_id,
  nombre,
  email,
  cantidad_chances,
  numeros_asignados,
  precio_pagado,
  estado_pago,
  mercadopago_id,
  created_at,
  updated_at,
  es_ganador,
  telefono,
  metodo_pago,
  comprobante_url,
  estado_transferencia,
  fecha_transferencia,
  admin_revisor,
  notas_admin,
  instagram_username,
  datos_encuesta
)
SELECT
  s.id::UUID,
  s.sorteo_id::UUID,
  s.nombre,
  nullif(s.email, ''),
  s.cantidad_chances::INTEGER,
  CASE
    WHEN coalesce(nullif(trim(s.numeros_asignados), ''), '[]') = '[]'
      THEN ARRAY[]::INTEGER[]
    ELSE ARRAY(
      SELECT value::INTEGER
      FROM jsonb_array_elements_text(s.numeros_asignados::JSONB) AS value
    )
  END,
  s.precio_pagado::INTEGER,
  s.estado_pago,
  nullif(s.mercadopago_id, ''),
  s.created_at::TIMESTAMPTZ,
  s.updated_at::TIMESTAMPTZ,
  s.es_ganador::BOOLEAN,
  nullif(s.telefono, ''),
  nullif(s.metodo_pago, ''),
  nullif(s.comprobante_url, ''),
  nullif(s.estado_transferencia, ''),
  nullif(s.fecha_transferencia, '')::TIMESTAMP,
  nullif(s.admin_revisor, ''),
  nullif(s.notas_admin, ''),
  nullif(s.instagram_username, ''),
  nullif(s.datos_encuesta, '')::JSONB
FROM public._restore_compradores AS s
ON CONFLICT (id) DO UPDATE SET
  sorteo_id = EXCLUDED.sorteo_id,
  nombre = EXCLUDED.nombre,
  email = EXCLUDED.email,
  cantidad_chances = EXCLUDED.cantidad_chances,
  numeros_asignados = EXCLUDED.numeros_asignados,
  precio_pagado = EXCLUDED.precio_pagado,
  estado_pago = EXCLUDED.estado_pago,
  mercadopago_id = EXCLUDED.mercadopago_id,
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at,
  es_ganador = EXCLUDED.es_ganador,
  telefono = EXCLUDED.telefono,
  metodo_pago = EXCLUDED.metodo_pago,
  comprobante_url = EXCLUDED.comprobante_url,
  estado_transferencia = EXCLUDED.estado_transferencia,
  fecha_transferencia = EXCLUDED.fecha_transferencia,
  admin_revisor = EXCLUDED.admin_revisor,
  notas_admin = EXCLUDED.notas_admin,
  instagram_username = EXCLUDED.instagram_username,
  datos_encuesta = EXCLUDED.datos_encuesta;

-- El resultado final no estaba en los CSV, pero se recuperó de una captura del
-- sitio anterior y coincide con el comprador que tiene asignado el número 8326.
UPDATE public.compradores
SET es_ganador = (id = 'e3f598ab-14bd-4251-8614-2bf7ad1f5162')
WHERE sorteo_id = '88bf8af4-ed1c-4c38-b0fb-b9a492ed5752';

UPDATE public.sorteos
SET
  estado = 'sorteado',
  ganador_id = 'e3f598ab-14bd-4251-8614-2bf7ad1f5162',
  ganador_nombre = 'Acosta Alcides Ariel',
  numero_ganador = 8326,
  fecha_sorteo_realizado = TIMESTAMPTZ '2026-07-11 12:00:00-03',
  updated_at = TIMESTAMPTZ '2026-07-11 12:00:00-03'
WHERE id = '88bf8af4-ed1c-4c38-b0fb-b9a492ed5752';

SELECT setval(
  'public.contenido_historial_id_seq',
  greatest(coalesce(max(id), 1), 1),
  max(id) IS NOT NULL
)
FROM public.contenido_historial;

-- Verificación fuerte: si algún conteo o vínculo no coincide, toda la mezcla
-- hace rollback y los datos existentes quedan intactos.
DO $verify$
DECLARE
  v_esperados BIGINT;
  v_restaurados BIGINT;
  v_total_numeros BIGINT;
  v_numeros_unicos BIGINT;
BEGIN
  SELECT count(*) INTO v_esperados FROM public._restore_configuracion;
  SELECT count(*) INTO v_restaurados
  FROM public.configuracion AS d
  JOIN public._restore_configuracion AS s USING (clave);
  IF v_restaurados <> v_esperados THEN
    RAISE EXCEPTION 'configuracion: esperados %, restaurados %', v_esperados, v_restaurados;
  END IF;

  SELECT count(*) INTO v_esperados FROM public._restore_contenido_historial;
  SELECT count(*) INTO v_restaurados
  FROM public.contenido_historial AS d
  JOIN public._restore_contenido_historial AS s ON s.id::BIGINT = d.id;
  IF v_restaurados <> v_esperados THEN
    RAISE EXCEPTION 'contenido_historial: esperados %, restaurados %', v_esperados, v_restaurados;
  END IF;

  SELECT count(*) INTO v_esperados FROM public._restore_ganadores_pasados;
  SELECT count(*) INTO v_restaurados
  FROM public.ganadores_pasados AS d
  JOIN public._restore_ganadores_pasados AS s ON s.id::UUID = d.id;
  IF v_restaurados <> v_esperados THEN
    RAISE EXCEPTION 'ganadores_pasados: esperados %, restaurados %', v_esperados, v_restaurados;
  END IF;

  SELECT count(*) INTO v_esperados FROM public._restore_compradores;
  SELECT count(*) INTO v_restaurados
  FROM public.compradores AS d
  JOIN public._restore_compradores AS s ON s.id::UUID = d.id;
  IF v_restaurados <> v_esperados THEN
    RAISE EXCEPTION 'compradores: esperados %, restaurados %', v_esperados, v_restaurados;
  END IF;

  SELECT count(*), count(DISTINCT numero)
  INTO v_total_numeros, v_numeros_unicos
  FROM public.compradores AS c
  CROSS JOIN LATERAL unnest(c.numeros_asignados) AS numero
  WHERE c.sorteo_id = '88bf8af4-ed1c-4c38-b0fb-b9a492ed5752'
    AND c.estado_pago = 'pagado';

  IF v_total_numeros <> 9999 OR v_numeros_unicos <> 9999 THEN
    RAISE EXCEPTION
      'numeros pagados invalidos: total %, unicos % (se esperaban 9999 y 9999)',
      v_total_numeros,
      v_numeros_unicos;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.compradores AS c
    JOIN public.sorteos AS s ON s.ganador_id = c.id
    WHERE s.id = '88bf8af4-ed1c-4c38-b0fb-b9a492ed5752'
      AND s.estado = 'sorteado'
      AND s.numero_ganador = 8326
      AND c.es_ganador = true
      AND 8326 = ANY(c.numeros_asignados)
  ) THEN
    RAISE EXCEPTION 'El ganador restaurado no coincide con el numero 8326';
  END IF;
END
$verify$;

-- Reactivar el historial automático luego de cargar la copia exacta.
DROP TRIGGER IF EXISTS trg_historial_configuracion ON public.configuracion;
CREATE TRIGGER trg_historial_configuracion
  BEFORE UPDATE ON public.configuracion
  FOR EACH ROW
  EXECUTE FUNCTION public.registrar_historial_configuracion();

-- Volver a instalar la defensa contra números duplicados para operaciones futuras.
CREATE OR REPLACE FUNCTION public.validar_numeros_unicos_antes_cambio()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_duplicados INTEGER[];
BEGIN
  IF NEW.estado_pago = 'pagado'
     AND coalesce(array_length(NEW.numeros_asignados, 1), 0) > 0 THEN
    SELECT array_agg(DISTINCT existente)
    INTO v_duplicados
    FROM public.compradores AS c
    CROSS JOIN LATERAL unnest(c.numeros_asignados) AS existente
    WHERE c.sorteo_id = NEW.sorteo_id
      AND c.estado_pago = 'pagado'
      AND c.id <> NEW.id
      AND existente = ANY(NEW.numeros_asignados);

    IF v_duplicados IS NOT NULL THEN
      RAISE EXCEPTION 'Numeros ya asignados: %', v_duplicados
        USING ERRCODE = '23505';
    END IF;

    SELECT array_agg(numero)
    INTO v_duplicados
    FROM (
      SELECT numero
      FROM unnest(NEW.numeros_asignados) AS numero
      GROUP BY numero
      HAVING count(*) > 1
    ) AS duplicados_internos;

    IF v_duplicados IS NOT NULL THEN
      RAISE EXCEPTION 'Numeros duplicados dentro del comprador: %', v_duplicados
        USING ERRCODE = '23505';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_validar_numeros_unicos ON public.compradores;
CREATE TRIGGER trigger_validar_numeros_unicos
  BEFORE INSERT OR UPDATE ON public.compradores
  FOR EACH ROW
  EXECUTE FUNCTION public.validar_numeros_unicos_antes_cambio();

DROP TABLE public._restore_contenido_historial;
DROP TABLE public._restore_ganadores_pasados;
DROP TABLE public._restore_configuracion;
DROP TABLE public._restore_compradores;

COMMIT;

SELECT
  (SELECT count(*) FROM public.configuracion) AS configuraciones,
  (SELECT count(*) FROM public.contenido_historial) AS versiones_contenido,
  (SELECT count(*) FROM public.ganadores_pasados) AS ganadores_pasados,
  (SELECT count(*) FROM public.compradores) AS compradores,
  (
    SELECT count(DISTINCT numero)
    FROM public.compradores AS c
    CROSS JOIN LATERAL unnest(c.numeros_asignados) AS numero
    WHERE c.sorteo_id = '88bf8af4-ed1c-4c38-b0fb-b9a492ed5752'
      AND c.estado_pago = 'pagado'
  ) AS numeros_pagados_unicos;
