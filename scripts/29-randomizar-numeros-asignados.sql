-- Aplicar en la base de datos del sorteo actual para que las próximas
-- aprobaciones de transferencias elijan números de todo el rango libre.
-- No modifica los números ya asignados.
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

  -- ORDER BY debe estar en la subconsulta para elegir entre todos los libres.
  -- El orden ascendente exterior facilita mostrar los números elegidos.
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
