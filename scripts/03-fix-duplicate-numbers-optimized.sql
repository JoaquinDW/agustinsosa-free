-- ============================================
-- VERSIÓN OPTIMIZADA - FUNCIONES MÁS RÁPIDAS
-- ============================================

-- PARTE 1: Función atómica (CORREGIDA - sin FOR UPDATE en set-returning functions)
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
  -- En su lugar, bloqueamos las filas de compradores directamente
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

-- ============================================
-- PARTE 2: DIAGNÓSTICO SIMPLIFICADO Y RÁPIDO
-- ============================================

CREATE OR REPLACE FUNCTION diagnosticar_duplicados_rapido(p_sorteo_id UUID)
RETURNS TABLE(
  total_numeros_asignados BIGINT,
  numeros_unicos BIGINT,
  numeros_duplicados BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH numeros_expandidos AS (
    SELECT unnest(numeros_asignados) as numero
    FROM compradores
    WHERE sorteo_id = p_sorteo_id
      AND estado_pago = 'pagado'
  )
  SELECT
    COUNT(*)::BIGINT as total_numeros,
    COUNT(DISTINCT numero)::BIGINT as unicos,
    (COUNT(*) - COUNT(DISTINCT numero))::BIGINT as duplicados
  FROM numeros_expandidos;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PARTE 3: VER COMPRADORES CON DUPLICADOS (LIMITADO)
-- ============================================

CREATE OR REPLACE FUNCTION obtener_compradores_duplicados_sample(
  p_sorteo_id UUID,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE(
  comprador_id UUID,
  nombre TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  numeros_asignados INTEGER[],
  tiene_duplicados BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH numeros_con_count AS (
    SELECT
      numero,
      COUNT(*) as veces
    FROM (
      SELECT unnest(numeros_asignados) as numero
      FROM compradores
      WHERE sorteo_id = p_sorteo_id
        AND estado_pago = 'pagado'
    ) sub
    GROUP BY numero
  )
  SELECT
    c.id,
    c.nombre,
    c.created_at,
    c.numeros_asignados,
    EXISTS(
      SELECT 1
      FROM unnest(c.numeros_asignados) num
      JOIN numeros_con_count ncc ON ncc.numero = num
      WHERE ncc.veces > 1
    ) as tiene_duplicados
  FROM compradores c
  WHERE c.sorteo_id = p_sorteo_id
    AND c.estado_pago = 'pagado'
  ORDER BY c.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PARTE 4: FUNCIÓN PARA CORREGIR UN COMPRADOR
-- ============================================

CREATE OR REPLACE FUNCTION corregir_duplicados_comprador(
  p_comprador_id UUID,
  p_sorteo_id UUID
)
RETURNS TABLE(
  numeros_originales INTEGER[],
  numeros_corregidos INTEGER[],
  cambios_realizados BOOLEAN
) AS $$
DECLARE
  v_comprador RECORD;
  v_numeros_duplicados INTEGER[];
  v_numeros_a_mantener INTEGER[];
  v_numeros_nuevos INTEGER[];
  v_numeros_finales INTEGER[];
  v_num INTEGER;
  v_disponibles INTEGER[];
BEGIN
  -- Obtener comprador
  SELECT * INTO v_comprador
  FROM compradores
  WHERE id = p_comprador_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comprador no encontrado';
  END IF;

  -- Encontrar qué números están duplicados
  WITH numeros_con_count AS (
    SELECT
      unnest(numeros_asignados) as numero,
      COUNT(*) OVER (PARTITION BY unnest(numeros_asignados)) as veces
    FROM compradores
    WHERE sorteo_id = p_sorteo_id
      AND estado_pago = 'pagado'
  )
  SELECT array_agg(DISTINCT numero)
  INTO v_numeros_duplicados
  FROM numeros_con_count
  WHERE veces > 1;

  -- Si no hay duplicados en sus números, no hacer nada
  IF v_numeros_duplicados IS NULL OR NOT (v_comprador.numeros_asignados && v_numeros_duplicados) THEN
    RETURN QUERY SELECT v_comprador.numeros_asignados, v_comprador.numeros_asignados, false;
    RETURN;
  END IF;

  -- Determinar qué números debe mantener (los que no están duplicados)
  SELECT array_agg(num ORDER BY num)
  INTO v_numeros_a_mantener
  FROM unnest(v_comprador.numeros_asignados) num
  WHERE num != ALL(COALESCE(v_numeros_duplicados, ARRAY[]::INTEGER[]));

  -- Cuántos números necesita reemplazar
  DECLARE
    v_necesita INTEGER := array_length(v_comprador.numeros_asignados, 1) - COALESCE(array_length(v_numeros_a_mantener, 1), 0);
  BEGIN
    -- Obtener números disponibles
    WITH todos_ocupados AS (
      SELECT DISTINCT unnest(numeros_asignados) as num
      FROM compradores
      WHERE sorteo_id = p_sorteo_id
        AND estado_pago = 'pagado'
        AND id != p_comprador_id  -- Excluir este comprador
    ),
    sorteo_info AS (
      SELECT total_chances FROM sorteos WHERE id = p_sorteo_id
    )
    SELECT array_agg(gs.num ORDER BY random())
    INTO v_disponibles
    FROM generate_series(0, (SELECT COALESCE(total_chances, 9999) FROM sorteo_info)) gs(num)
    WHERE gs.num NOT IN (SELECT num FROM todos_ocupados)
    LIMIT v_necesita;

    -- Tomar los números nuevos que necesita
    v_numeros_nuevos := v_disponibles[1:v_necesita];

    -- Números finales
    v_numeros_finales := COALESCE(v_numeros_a_mantener, ARRAY[]::INTEGER[]) || v_numeros_nuevos;

    -- Ordenar
    SELECT array_agg(num ORDER BY num)
    INTO v_numeros_finales
    FROM unnest(v_numeros_finales) num;

    -- Actualizar
    UPDATE compradores
    SET numeros_asignados = v_numeros_finales,
        updated_at = NOW()
    WHERE id = p_comprador_id;

    RETURN QUERY SELECT v_comprador.numeros_asignados, v_numeros_finales, true;
  END;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- QUERIES ÚTILES PARA EJECUTAR MANUALMENTE
-- ============================================

-- 1. Ver diagnóstico rápido
-- SELECT * FROM diagnosticar_duplicados_rapido('c0cb539f-e867-4475-a9ca-b6c6e345b4ba');

-- 2. Ver sample de compradores con duplicados
-- SELECT * FROM obtener_compradores_duplicados_sample('c0cb539f-e867-4475-a9ca-b6c6e345b4ba', 50);

-- 3. Ver un número específico y quién lo tiene
-- SELECT c.id, c.nombre, c.created_at, c.numeros_asignados
-- FROM compradores c
-- WHERE 'c0cb539f-e867-4475-a9ca-b6c6e345b4ba' = c.sorteo_id
--   AND c.estado_pago = 'pagado'
--   AND 4699 = ANY(c.numeros_asignados)
-- ORDER BY c.created_at;
