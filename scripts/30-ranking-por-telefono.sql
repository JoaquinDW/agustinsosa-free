-- Agrupa las compras pagadas por WhatsApp normalizado, aunque usen distintos
-- correos. Cada compra histórica sin teléfono válido queda como fila individual.
CREATE OR REPLACE FUNCTION public.normalizar_telefono_ranking(p_telefono text, p_pais text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
DECLARE
  digitos text;
BEGIN
  IF p_telefono IS NULL OR p_telefono !~ '^[0-9[:space:]+()-]+$' THEN
    RETURN NULL;
  END IF;

  digitos := regexp_replace(p_telefono, '[^0-9]', '', 'g');
  IF left(digitos, 2) = '00' THEN
    digitos := substr(digitos, 3);
  END IF;

  IF left(digitos, 3) = '595' THEN
    digitos := substr(digitos, 4);
    IF left(digitos, 1) = '0' THEN digitos := substr(digitos, 2); END IF;
    IF length(digitos) BETWEEN 8 AND 9 THEN RETURN '595' || digitos; END IF;
  ELSIF left(digitos, 2) = '54' THEN
    digitos := substr(digitos, CASE WHEN left(digitos, 3) = '549' THEN 4 ELSE 3 END);
    IF left(digitos, 1) = '0' THEN digitos := substr(digitos, 2); END IF;
    IF length(digitos) BETWEEN 10 AND 11 THEN RETURN '549' || digitos; END IF;
  ELSIF upper(coalesce(p_pais, 'AR')) = 'PY' THEN
    IF left(digitos, 1) = '0' THEN digitos := substr(digitos, 2); END IF;
    IF length(digitos) BETWEEN 8 AND 9 THEN RETURN '595' || digitos; END IF;
  ELSE
    IF left(digitos, 1) = '0' THEN digitos := substr(digitos, 2); END IF;
    IF length(digitos) BETWEEN 10 AND 11 THEN RETURN '549' || digitos; END IF;
  END IF;

  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.normalizar_telefono_ranking(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.normalizar_telefono_ranking(text, text) TO service_role;

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
      coalesce(
        'tel:' || public.normalizar_telefono_ranking(c.telefono, c.pais_transferencia::text),
        'compra:' || c.id::text
      ) AS clave
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

-- Los códigos anteriores guardaban persona_key por correo. Buscar sus envíos
-- por el teléfono guardado evita perder la fecha de la última campaña.
CREATE OR REPLACE FUNCTION public.obtener_ultimo_envio_promo(p_sorteo_id uuid)
RETURNS TABLE (persona_key text, ultimo_envio timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  WITH envios AS (
    SELECT public.normalizar_telefono_ranking(codigo.telefono, codigo.pais) AS telefono_clave,
      envio.created_at
    FROM public.promo_codigos codigo
    JOIN public.promo_campanias campania ON campania.id = codigo.campania_id
    JOIN public.whatsapp_envios envio ON envio.promo_codigo_id = codigo.id AND envio.tipo = 'promo'
    WHERE campania.sorteo_id = p_sorteo_id
  )
  SELECT 'tel:' || telefono_clave, max(created_at)
  FROM envios
  WHERE telefono_clave IS NOT NULL
  GROUP BY telefono_clave
  ORDER BY telefono_clave;
$$;
REVOKE ALL ON FUNCTION public.obtener_ultimo_envio_promo(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.obtener_ultimo_envio_promo(uuid) TO service_role;
