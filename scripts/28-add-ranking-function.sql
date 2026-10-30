-- El índice compuesto ya existe en 17-add-optimized-functions.sql.
CREATE OR REPLACE FUNCTION public.obtener_ranking_sorteo(
  p_sorteo_id uuid,
  p_limite integer DEFAULT NULL
)
RETURNS TABLE (
  persona_key text,
  nombre text,
  email text,
  telefono text,
  pais_transferencia text,
  chances bigint,
  compras bigint,
  ultima_compra timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH compras_validas AS (
    SELECT c.*,
      COALESCE(NULLIF(lower(trim(c.email)), ''),
               NULLIF(regexp_replace(COALESCE(c.telefono, ''), '[^0-9]', '', 'g'), '')) AS clave
    FROM public.compradores c
    WHERE c.sorteo_id = p_sorteo_id
      AND c.estado_pago = 'pagado'
      AND c.metodo_pago <> 'gratuito'
  ), agrupadas AS (
    SELECT clave AS persona_key,
      sum(cantidad_chances)::bigint AS chances,
      count(*)::bigint AS compras,
      max(created_at) AS ultima_compra
    FROM compras_validas
    WHERE clave IS NOT NULL
    GROUP BY clave
  ), recientes AS (
    SELECT clave, nombre, email, telefono, pais_transferencia,
      row_number() OVER (PARTITION BY clave ORDER BY created_at DESC, id DESC) AS fila
    FROM compras_validas
    WHERE clave IS NOT NULL
  )
  SELECT a.persona_key, r.nombre::text, r.email::text, r.telefono::text,
    r.pais_transferencia::text, a.chances, a.compras, a.ultima_compra
  FROM agrupadas a
  JOIN recientes r ON r.clave = a.persona_key AND r.fila = 1
  ORDER BY a.chances DESC, a.ultima_compra ASC, a.persona_key ASC
  LIMIT CASE WHEN p_limite IS NULL THEN NULL ELSE GREATEST(0, p_limite) END;
$$;
REVOKE ALL ON FUNCTION public.obtener_ranking_sorteo(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.obtener_ranking_sorteo(uuid, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.obtener_ultimo_envio_promo(p_sorteo_id uuid)
RETURNS TABLE (persona_key text, ultimo_envio timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  SELECT codigo.persona_key, max(envio.created_at)
  FROM public.promo_codigos codigo
  JOIN public.promo_campanias campania ON campania.id = codigo.campania_id
  JOIN public.whatsapp_envios envio ON envio.promo_codigo_id = codigo.id AND envio.tipo = 'promo'
  WHERE campania.sorteo_id = p_sorteo_id
  GROUP BY codigo.persona_key
  ORDER BY codigo.persona_key;
$$;
REVOKE ALL ON FUNCTION public.obtener_ultimo_envio_promo(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.obtener_ultimo_envio_promo(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.obtener_reporte_campanias(p_sorteo_id uuid)
RETURNS TABLE (
  id uuid, created_at timestamptz, porcentaje integer, vence_at timestamptz,
  total bigint, enviados bigint, entregados bigint, errores bigint, procesando bigint, usados bigint,
  recaudado jsonb, costo_whatsapp numeric
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  SELECT campania.id, campania.created_at, campania.porcentaje, campania.vence_at,
    (SELECT count(*) FROM public.promo_codigos codigo WHERE codigo.campania_id = campania.id),
    (SELECT count(*) FROM public.whatsapp_envios envio JOIN public.promo_codigos codigo ON codigo.id = envio.promo_codigo_id WHERE codigo.campania_id = campania.id AND envio.tipo = 'promo' AND envio.estado IN ('enviado', 'entregado', 'leido')),
    (SELECT count(*) FROM public.whatsapp_envios envio JOIN public.promo_codigos codigo ON codigo.id = envio.promo_codigo_id WHERE codigo.campania_id = campania.id AND envio.tipo = 'promo' AND envio.estado IN ('entregado', 'leido')),
    (SELECT count(*) FROM public.whatsapp_envios envio JOIN public.promo_codigos codigo ON codigo.id = envio.promo_codigo_id WHERE codigo.campania_id = campania.id AND envio.tipo = 'promo' AND envio.estado = 'error'),
    (SELECT count(*) FROM public.whatsapp_envios envio JOIN public.promo_codigos codigo ON codigo.id = envio.promo_codigo_id WHERE codigo.campania_id = campania.id AND envio.tipo = 'promo' AND envio.estado = 'procesando'),
    (SELECT count(*) FROM public.promo_codigos codigo WHERE codigo.campania_id = campania.id AND codigo.usos_confirmados > 0),
    (SELECT COALESCE(jsonb_agg(jsonb_build_object('moneda', x.moneda, 'monto', x.monto)), '[]'::jsonb)
      FROM (SELECT COALESCE(comprador.moneda, 'ARS') AS moneda, sum(comprador.precio_pagado) AS monto
        FROM public.compradores comprador JOIN public.promo_codigos codigo ON codigo.id = comprador.promo_codigo_id
        WHERE codigo.campania_id = campania.id AND comprador.estado_pago = 'pagado'
        GROUP BY COALESCE(comprador.moneda, 'ARS')) x),
    (SELECT COALESCE(sum(envio.costo_unitario), 0)
      FROM public.whatsapp_envios envio JOIN public.promo_codigos codigo ON codigo.id = envio.promo_codigo_id
      WHERE codigo.campania_id = campania.id AND envio.tipo = 'promo' AND envio.estado IN ('enviado', 'entregado', 'leido'))
  FROM public.promo_campanias campania
  WHERE campania.sorteo_id = p_sorteo_id
  ORDER BY campania.created_at DESC, campania.id DESC;
$$;
REVOKE ALL ON FUNCTION public.obtener_reporte_campanias(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.obtener_reporte_campanias(uuid) TO service_role;
