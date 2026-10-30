-- ============================================
-- FIX PARA ERROR: FOR UPDATE is not allowed with set-returning functions
-- ============================================
-- Este script corrige el error que ocurre al aprobar transferencias
-- cuando la función generar_numeros_unicos_atomico usa FOR UPDATE con unnest()

-- SOLUCIÓN: Reemplazar FOR UPDATE con Advisory Locks
-- Los advisory locks son específicos de PostgreSQL y permiten
-- bloquear a nivel de aplicación sin bloquear filas de la tabla

CREATE OR REPLACE FUNCTION generar_numeros_unicos_atomico(
  p_sorteo_id UUID,
  p_cantidad INTEGER
)
RETURNS INTEGER[] AS $$
DECLARE
  v_numeros_ocupados INTEGER[];
  v_numeros_disponibles INTEGER[];
  v_numeros_seleccionados INTEGER[] := ARRAY[]::INTEGER[];
  v_total_chances INTEGER;
  v_random_index INTEGER;
  v_lock_acquired BOOLEAN;
BEGIN
  -- Usar advisory lock para garantizar atomicidad
  -- Esto previene que dos procesos generen números al mismo tiempo
  -- Convertir UUID a bigint para el lock (usando hashtext)
  SELECT pg_try_advisory_xact_lock(hashtext(p_sorteo_id::text)) INTO v_lock_acquired;

  IF NOT v_lock_acquired THEN
    RAISE EXCEPTION 'No se pudo obtener el lock para el sorteo. Intenta nuevamente.';
  END IF;

  -- Obtener total de chances del sorteo
  SELECT total_chances INTO v_total_chances
  FROM sorteos
  WHERE id = p_sorteo_id;

  IF v_total_chances IS NULL THEN
    v_total_chances := 9999;
  END IF;

  -- Obtener números ocupados SIN FOR UPDATE en unnest
  -- En su lugar, usamos el advisory lock que obtuvimos arriba
  WITH numeros_expandidos AS (
    SELECT DISTINCT unnest(c.numeros_asignados) as numero
    FROM compradores c
    WHERE c.sorteo_id = p_sorteo_id
      AND c.estado_pago = 'pagado'
  )
  SELECT COALESCE(array_agg(numero ORDER BY numero), ARRAY[]::INTEGER[])
  INTO v_numeros_ocupados
  FROM numeros_expandidos;

  -- Generar números disponibles
  SELECT array_agg(num ORDER BY num)
  INTO v_numeros_disponibles
  FROM generate_series(0, v_total_chances) AS num
  WHERE num != ALL(v_numeros_ocupados);

  -- Verificar que hay suficientes números disponibles
  IF array_length(v_numeros_disponibles, 1) IS NULL OR array_length(v_numeros_disponibles, 1) < p_cantidad THEN
    RAISE EXCEPTION 'No hay suficientes números disponibles. Solicitados: %, Disponibles: %',
      p_cantidad,
      COALESCE(array_length(v_numeros_disponibles, 1), 0);
  END IF;

  -- Seleccionar números aleatoriamente
  FOR i IN 1..p_cantidad LOOP
    v_random_index := 1 + floor(random() * array_length(v_numeros_disponibles, 1))::INTEGER;
    v_numeros_seleccionados := array_append(
      v_numeros_seleccionados,
      v_numeros_disponibles[v_random_index]
    );
    -- Remover el número seleccionado de los disponibles
    v_numeros_disponibles := array_cat(
      v_numeros_disponibles[1:v_random_index-1],
      v_numeros_disponibles[v_random_index+1:array_length(v_numeros_disponibles, 1)]
    );
  END LOOP;

  -- Ordenar los números seleccionados
  SELECT array_agg(num ORDER BY num)
  INTO v_numeros_seleccionados
  FROM unnest(v_numeros_seleccionados) AS num;

  -- ============================================
  -- VALIDACIÓN FINAL: Verificar que NO haya duplicados
  -- Si hay duplicados, REEMPLAZARLOS con números disponibles
  -- ============================================
  DECLARE
    v_duplicados_encontrados INTEGER[];
    v_numeros_buenos INTEGER[];
    v_cantidad_reemplazar INTEGER;
    v_numeros_reemplazo INTEGER[];
    v_todos_ocupados INTEGER[];
  BEGIN
    -- Verificar si alguno de los números seleccionados ya existe
    SELECT array_agg(DISTINCT numero)
    INTO v_duplicados_encontrados
    FROM (
      SELECT unnest(c.numeros_asignados) as numero
      FROM compradores c
      WHERE c.sorteo_id = p_sorteo_id
        AND c.estado_pago = 'pagado'
    ) AS todos_los_numeros
    WHERE numero = ANY(v_numeros_seleccionados);

    -- Si encontramos duplicados, REEMPLAZARLOS
    IF v_duplicados_encontrados IS NOT NULL AND array_length(v_duplicados_encontrados, 1) > 0 THEN
      RAISE WARNING 'Se detectaron duplicados %, regenerando números...', v_duplicados_encontrados;

      -- Separar números buenos de duplicados
      SELECT array_agg(num)
      INTO v_numeros_buenos
      FROM unnest(v_numeros_seleccionados) num
      WHERE num != ALL(v_duplicados_encontrados);

      -- Cuántos números necesitamos reemplazar
      v_cantidad_reemplazar := array_length(v_duplicados_encontrados, 1);

      -- Obtener TODOS los números ocupados (incluyendo los buenos que acabamos de generar)
      SELECT array_agg(DISTINCT numero)
      INTO v_todos_ocupados
      FROM (
        SELECT unnest(c.numeros_asignados) as numero
        FROM compradores c
        WHERE c.sorteo_id = p_sorteo_id AND c.estado_pago = 'pagado'
        UNION
        SELECT unnest(COALESCE(v_numeros_buenos, ARRAY[]::INTEGER[])) as numero
      ) sub;

      -- Generar números de reemplazo
      SELECT array_agg(num ORDER BY random())
      INTO v_numeros_reemplazo
      FROM generate_series(0, v_total_chances) AS num
      WHERE num != ALL(v_todos_ocupados)
      LIMIT v_cantidad_reemplazar;

      -- Verificar que tenemos suficientes números
      IF array_length(v_numeros_reemplazo, 1) < v_cantidad_reemplazar THEN
        RAISE EXCEPTION 'No hay suficientes números disponibles para reemplazar duplicados';
      END IF;

      -- Combinar números buenos + números de reemplazo
      v_numeros_seleccionados := COALESCE(v_numeros_buenos, ARRAY[]::INTEGER[]) || v_numeros_reemplazo;

      -- Ordenar
      SELECT array_agg(num ORDER BY num)
      INTO v_numeros_seleccionados
      FROM unnest(v_numeros_seleccionados) num;

      RAISE WARNING 'Duplicados reemplazados exitosamente. Nuevos números: %', v_numeros_seleccionados;
    END IF;
  END;

  RETURN v_numeros_seleccionados;

  -- El advisory lock se libera automáticamente al final de la transacción
END;
$$ LANGUAGE plpgsql;

-- Comentario sobre la función
COMMENT ON FUNCTION generar_numeros_unicos_atomico IS
'Genera números únicos para un sorteo de forma atómica usando advisory locks en lugar de FOR UPDATE.';

-- ============================================
-- INSTRUCCIONES
-- ============================================
-- 1. Ejecuta este SQL en el SQL Editor de Supabase
-- 2. Prueba aprobando una transferencia
-- 3. El error "FOR UPDATE is not allowed..." debería estar resuelto
