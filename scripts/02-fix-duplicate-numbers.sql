-- ============================================
-- SCRIPT PARA PREVENIR Y CORREGIR NÚMEROS DUPLICADOS
-- ============================================

-- PARTE 1: FUNCIÓN PARA GENERAR NÚMEROS DE FORMA ATÓMICA
-- ============================================

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
BEGIN
  -- Obtener información del sorteo
  SELECT total_chances INTO v_total_chances
  FROM sorteos
  WHERE id = p_sorteo_id;

  IF v_total_chances IS NULL THEN
    v_total_chances := 9999;
  END IF;

  -- Obtener todos los números ocupados CON BLOQUEO DE FILA
  -- Esto previene que otras transacciones lean datos obsoletos
  SELECT COALESCE(array_agg(DISTINCT numero), ARRAY[]::INTEGER[])
  INTO v_numeros_ocupados
  FROM (
    SELECT unnest(numeros_asignados) as numero
    FROM compradores
    WHERE sorteo_id = p_sorteo_id
      AND estado_pago = 'pagado'
    FOR UPDATE  -- BLOQUEO CRÍTICO: Previene race conditions
  ) AS numeros;

  -- Generar lista de números disponibles
  SELECT array_agg(num ORDER BY num)
  INTO v_numeros_disponibles
  FROM generate_series(0, v_total_chances) AS num
  WHERE num != ALL(v_numeros_ocupados);

  -- Verificar que hay suficientes números
  IF array_length(v_numeros_disponibles, 1) < p_cantidad THEN
    RAISE EXCEPTION 'No hay suficientes números disponibles. Solicitados: %, Disponibles: %',
      p_cantidad,
      COALESCE(array_length(v_numeros_disponibles, 1), 0);
  END IF;

  -- Seleccionar números aleatoriamente
  FOR i IN 1..p_cantidad LOOP
    -- Generar índice aleatorio
    v_random_index := 1 + floor(random() * array_length(v_numeros_disponibles, 1))::INTEGER;

    -- Agregar número seleccionado
    v_numeros_seleccionados := array_append(
      v_numeros_seleccionados,
      v_numeros_disponibles[v_random_index]
    );

    -- Remover número seleccionado del pool disponible
    v_numeros_disponibles := array_cat(
      v_numeros_disponibles[1:v_random_index-1],
      v_numeros_disponibles[v_random_index+1:array_length(v_numeros_disponibles, 1)]
    );
  END LOOP;

  -- Retornar números ordenados
  SELECT array_agg(num ORDER BY num)
  INTO v_numeros_seleccionados
  FROM unnest(v_numeros_seleccionados) AS num;

  RETURN v_numeros_seleccionados;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PARTE 2: DIAGNÓSTICO DE DUPLICADOS
-- ============================================

-- Función para obtener estadísticas de duplicados
CREATE OR REPLACE FUNCTION diagnosticar_duplicados(p_sorteo_id UUID DEFAULT NULL)
RETURNS TABLE(
  sorteo_id UUID,
  total_numeros_asignados BIGINT,
  numeros_unicos BIGINT,
  numeros_duplicados BIGINT,
  compradores_afectados BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH numeros_expandidos AS (
    SELECT
      c.sorteo_id,
      c.id as comprador_id,
      unnest(c.numeros_asignados) as numero
    FROM compradores c
    WHERE c.estado_pago = 'pagado'
      AND (p_sorteo_id IS NULL OR c.sorteo_id = p_sorteo_id)
  ),
  stats AS (
    SELECT
      ne.sorteo_id,
      COUNT(*) as total_numeros,
      COUNT(DISTINCT ne.numero) as unicos,
      COUNT(*) - COUNT(DISTINCT ne.numero) as duplicados,
      COUNT(DISTINCT CASE
        WHEN ne.numero IN (
          SELECT numero
          FROM numeros_expandidos ne2
          WHERE ne2.sorteo_id = ne.sorteo_id
          GROUP BY numero
          HAVING COUNT(*) > 1
        ) THEN ne.comprador_id
      END) as compradores_afect
    FROM numeros_expandidos ne
    GROUP BY ne.sorteo_id
  )
  SELECT
    s.sorteo_id,
    s.total_numeros,
    s.unicos,
    s.duplicados,
    s.compradores_afect
  FROM stats s;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PARTE 3: IDENTIFICAR COMPRADORES AFECTADOS
-- ============================================

-- Función para obtener compradores que tienen números duplicados
CREATE OR REPLACE FUNCTION obtener_compradores_con_duplicados(p_sorteo_id UUID)
RETURNS TABLE(
  comprador_id UUID,
  comprador_nombre TEXT,
  numeros_duplicados INTEGER[],
  numeros_unicos INTEGER[],
  fecha_compra TIMESTAMP WITH TIME ZONE,
  debe_mantener BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH numeros_expandidos AS (
    SELECT
      c.id as comprador_id,
      c.nombre,
      c.created_at,
      c.numeros_asignados,
      unnest(c.numeros_asignados) as numero
    FROM compradores c
    WHERE c.sorteo_id = p_sorteo_id
      AND c.estado_pago = 'pagado'
  ),
  numeros_duplicados_list AS (
    SELECT numero
    FROM numeros_expandidos
    GROUP BY numero
    HAVING COUNT(*) > 1
  ),
  primer_comprador_por_numero AS (
    SELECT DISTINCT ON (ne.numero)
      ne.numero,
      ne.comprador_id as primer_comprador_id,
      ne.created_at
    FROM numeros_expandidos ne
    WHERE ne.numero IN (SELECT numero FROM numeros_duplicados_list)
    ORDER BY ne.numero, ne.created_at ASC
  )
  SELECT DISTINCT
    ne.comprador_id,
    ne.nombre::TEXT,
    array_agg(DISTINCT ne.numero ORDER BY ne.numero) FILTER (
      WHERE ne.numero IN (SELECT numero FROM numeros_duplicados_list)
    ) as nums_duplicados,
    array_agg(DISTINCT ne.numero ORDER BY ne.numero) FILTER (
      WHERE ne.numero NOT IN (SELECT numero FROM numeros_duplicados_list)
    ) as nums_unicos,
    ne.created_at,
    -- Un comprador debe mantener sus números si es el primero para TODOS sus números duplicados
    bool_and(
      CASE
        WHEN ne.numero IN (SELECT numero FROM numeros_duplicados_list)
        THEN ne.comprador_id = (SELECT primer_comprador_id FROM primer_comprador_por_numero WHERE numero = ne.numero)
        ELSE true
      END
    ) as debe_mantener
  FROM numeros_expandidos ne
  WHERE ne.numero IN (SELECT numero FROM numeros_duplicados_list)
  GROUP BY ne.comprador_id, ne.nombre, ne.created_at;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PARTE 4: OBTENER NÚMEROS DISPONIBLES
-- ============================================

CREATE OR REPLACE FUNCTION obtener_numeros_disponibles_para_reasignacion(p_sorteo_id UUID)
RETURNS TABLE(numero INTEGER) AS $$
DECLARE
  v_total_chances INTEGER;
BEGIN
  -- Obtener total de chances del sorteo
  SELECT total_chances INTO v_total_chances
  FROM sorteos
  WHERE id = p_sorteo_id;

  IF v_total_chances IS NULL THEN
    v_total_chances := 9999;
  END IF;

  RETURN QUERY
  WITH numeros_que_se_mantienen AS (
    -- Solo números de compradores que mantienen sus números
    SELECT DISTINCT unnest(numeros_asignados) as num
    FROM compradores c
    WHERE c.sorteo_id = p_sorteo_id
      AND c.estado_pago = 'pagado'
      AND c.id IN (
        SELECT comprador_id
        FROM obtener_compradores_con_duplicados(p_sorteo_id)
        WHERE debe_mantener = true
      )
    UNION
    -- Números únicos (no duplicados) de todos los compradores
    SELECT DISTINCT unnest(numeros_asignados) as num
    FROM compradores c
    WHERE c.sorteo_id = p_sorteo_id
      AND c.estado_pago = 'pagado'
      AND NOT EXISTS (
        SELECT 1
        FROM compradores c2
        WHERE c2.sorteo_id = p_sorteo_id
          AND c2.estado_pago = 'pagado'
          AND c2.id != c.id
          AND c.numeros_asignados && c2.numeros_asignados -- Arrays overlap
      )
  )
  SELECT gs.num
  FROM generate_series(0, v_total_chances) gs(num)
  WHERE gs.num NOT IN (SELECT num FROM numeros_que_se_mantienen)
  ORDER BY gs.num;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- QUERIES DE DIAGNÓSTICO PARA EJECUTAR MANUALMENTE
-- ============================================

-- Query 1: Ver estadísticas generales
-- SELECT * FROM diagnosticar_duplicados();

-- Query 2: Ver compradores afectados con detalles
-- SELECT * FROM obtener_compradores_con_duplicados('<sorteo_id>');

-- Query 3: Ver números disponibles para reasignación
-- SELECT * FROM obtener_numeros_disponibles_para_reasignacion('<sorteo_id>');

-- Query 4: Contar cuántos números necesitamos reasignar
-- SELECT
--   COUNT(*) as compradores_a_modificar,
--   SUM(array_length(numeros_duplicados, 1)) as total_numeros_a_reasignar
-- FROM obtener_compradores_con_duplicados('<sorteo_id>')
-- WHERE debe_mantener = false;
