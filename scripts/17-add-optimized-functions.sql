-- ============================================
-- FUNCIONES SQL OPTIMIZADAS PARA REDUCIR EGRESS
-- ============================================
-- Este script crea funciones de PostgreSQL que calculan estadísticas
-- directamente en el servidor, reduciendo significativamente el tráfico
-- de datos entre Supabase y el cliente.

-- ============================================
-- 1. FUNCIÓN PARA OBTENER ESTADÍSTICAS DE SORTEO
-- ============================================
-- En lugar de traer todos los compradores al cliente y procesarlos,
-- esta función calcula las estadísticas directamente en el servidor.
-- Reducción estimada de egress: ~90%

CREATE OR REPLACE FUNCTION obtener_estadisticas_sorteo(sorteo_id_param UUID)
RETURNS TABLE (
  total_compradores BIGINT,
  chances_vendidas BIGINT,
  total_recaudado NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Contar compradores únicos pagados
    COUNT(DISTINCT id)::BIGINT as total_compradores,
    -- Contar números únicos vendidos (sin duplicados)
    (SELECT COUNT(DISTINCT numero)::BIGINT
     FROM compradores c, unnest(c.numeros_asignados) AS numero
     WHERE c.sorteo_id = sorteo_id_param AND c.estado_pago = 'pagado')::BIGINT as chances_vendidas,
    -- Sumar total recaudado
    COALESCE(SUM(precio_pagado), 0)::NUMERIC as total_recaudado
  FROM compradores
  WHERE sorteo_id = sorteo_id_param
    AND estado_pago = 'pagado';
END;
$$ LANGUAGE plpgsql STABLE;

-- Comentario sobre la función
COMMENT ON FUNCTION obtener_estadisticas_sorteo IS
'Calcula estadísticas del sorteo (total compradores, chances vendidas, total recaudado) directamente en el servidor para reducir egress.';


-- ============================================
-- 2. FUNCIÓN PARA CONTAR COMPRADORES DE UN SORTEO
-- ============================================
-- Devuelve solo el conteo sin traer todos los registros

CREATE OR REPLACE FUNCTION contar_compradores_sorteo(sorteo_id_param UUID, solo_pagados BOOLEAN DEFAULT TRUE)
RETURNS BIGINT AS $$
BEGIN
  IF solo_pagados THEN
    RETURN (
      SELECT COUNT(*)::BIGINT
      FROM compradores
      WHERE sorteo_id = sorteo_id_param AND estado_pago = 'pagado'
    );
  ELSE
    RETURN (
      SELECT COUNT(*)::BIGINT
      FROM compradores
      WHERE sorteo_id = sorteo_id_param
    );
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION contar_compradores_sorteo IS
'Cuenta compradores de un sorteo sin traer todos los registros al cliente.';


-- ============================================
-- 3. FUNCIÓN PARA CONTAR CHANCES VENDIDAS
-- ============================================
-- Cuenta chances únicas vendidas sin traer arrays completos

CREATE OR REPLACE FUNCTION contar_chances_vendidas(sorteo_id_param UUID)
RETURNS BIGINT AS $$
BEGIN
  RETURN (
    SELECT COUNT(DISTINCT numero)::BIGINT
    FROM compradores c, unnest(c.numeros_asignados) AS numero
    WHERE c.sorteo_id = sorteo_id_param AND c.estado_pago = 'pagado'
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION contar_chances_vendidas IS
'Cuenta el total de chances únicas vendidas (sin duplicados) sin traer los arrays al cliente.';


-- ============================================
-- 4. FUNCIÓN PARA VERIFICAR SI SORTEO ESTÁ COMPLETO
-- ============================================
-- Verifica si se vendieron todas las chances sin traer datos al cliente

CREATE OR REPLACE FUNCTION verificar_sorteo_completo(sorteo_id_param UUID)
RETURNS TABLE (
  completo BOOLEAN,
  total_chances INTEGER,
  chances_vendidas BIGINT,
  porcentaje_vendido NUMERIC
) AS $$
DECLARE
  total_chances_sorteo INTEGER;
  chances_vendidas_count BIGINT;
BEGIN
  -- Obtener total de chances del sorteo
  SELECT s.total_chances INTO total_chances_sorteo
  FROM sorteos s
  WHERE s.id = sorteo_id_param;

  -- Contar chances vendidas
  SELECT contar_chances_vendidas(sorteo_id_param) INTO chances_vendidas_count;

  -- Retornar resultados
  RETURN QUERY
  SELECT
    (chances_vendidas_count >= total_chances_sorteo) as completo,
    total_chances_sorteo as total_chances,
    chances_vendidas_count as chances_vendidas,
    CASE
      WHEN total_chances_sorteo > 0 THEN
        ROUND((chances_vendidas_count::NUMERIC / total_chances_sorteo::NUMERIC * 100), 2)
      ELSE 0
    END as porcentaje_vendido;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION verificar_sorteo_completo IS
'Verifica si un sorteo está completo y devuelve estadísticas de progreso sin traer datos innecesarios.';


-- ============================================
-- 5. FUNCIÓN PARA OBTENER GANADORES EXPRESS (OPTIMIZADA)
-- ============================================
-- Versión optimizada que solo trae campos necesarios

CREATE OR REPLACE FUNCTION obtener_ganadores_express_visibles(sorteo_id_param UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  numero_ganador INTEGER,
  nombre_ganador TEXT,
  premio_monto TEXT,
  fecha_premio DATE,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  IF sorteo_id_param IS NULL THEN
    -- Si no se especifica sorteo, traer del sorteo activo
    RETURN QUERY
    SELECT
      ge.id,
      ge.numero_ganador,
      ge.nombre_ganador,
      ge.premio_monto,
      ge.fecha_premio,
      ge.created_at
    FROM ganadores_express ge
    INNER JOIN sorteos s ON ge.sorteo_id = s.id
    WHERE ge.visible = true AND s.estado = 'activo'
    ORDER BY ge.created_at DESC;
  ELSE
    -- Traer de un sorteo específico
    RETURN QUERY
    SELECT
      ge.id,
      ge.numero_ganador,
      ge.nombre_ganador,
      ge.premio_monto,
      ge.fecha_premio,
      ge.created_at
    FROM ganadores_express ge
    WHERE ge.sorteo_id = sorteo_id_param AND ge.visible = true
    ORDER BY ge.created_at DESC;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION obtener_ganadores_express_visibles IS
'Obtiene solo los campos necesarios de ganadores express visibles, reduciendo el payload.';


-- ============================================
-- 6. ÍNDICES ADICIONALES PARA OPTIMIZACIÓN
-- ============================================
-- Estos índices mejoran el rendimiento de las funciones anteriores

-- Índice para búsquedas por sorteo_id y estado_pago (muy común)
CREATE INDEX IF NOT EXISTS idx_compradores_sorteo_estado
ON compradores(sorteo_id, estado_pago);

-- Índice GIN para búsquedas en arrays de números asignados
CREATE INDEX IF NOT EXISTS idx_compradores_numeros_asignados
ON compradores USING GIN (numeros_asignados);

-- Índice para ganadores express por sorteo y visibilidad
CREATE INDEX IF NOT EXISTS idx_ganadores_express_sorteo_visible
ON ganadores_express(sorteo_id, visible)
WHERE visible = true;

-- Índice para ganadores pasados visibles
CREATE INDEX IF NOT EXISTS idx_ganadores_pasados_visible_orden
ON ganadores_pasados(visible, orden DESC)
WHERE visible = true;

-- Índice para sorteos activos
CREATE INDEX IF NOT EXISTS idx_sorteos_estado
ON sorteos(estado)
WHERE estado = 'activo';


-- ============================================
-- 7. FUNCIÓN PARA OBTENER RESUMEN COMPLETO DEL SORTEO
-- ============================================
-- Una sola función que devuelve todo lo necesario para la página principal

CREATE OR REPLACE FUNCTION obtener_resumen_sorteo_activo()
RETURNS TABLE (
  sorteo_id UUID,
  sorteo_nombre TEXT,
  total_chances INTEGER,
  estado TEXT,
  total_compradores BIGINT,
  chances_vendidas BIGINT,
  total_recaudado NUMERIC,
  porcentaje_completado NUMERIC,
  cantidad_ganadores_express BIGINT
) AS $$
DECLARE
  v_sorteo_activo_id UUID;
  v_total_chances INTEGER;
BEGIN
  -- Obtener ID del sorteo activo
  SELECT s.id, s.total_chances INTO v_sorteo_activo_id, v_total_chances
  FROM sorteos s
  WHERE s.estado = 'activo'
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF v_sorteo_activo_id IS NULL THEN
    -- No hay sorteo activo
    RETURN;
  END IF;

  -- Retornar resumen completo
  RETURN QUERY
  WITH stats AS (
    SELECT * FROM obtener_estadisticas_sorteo(v_sorteo_activo_id)
  ),
  ganadores_count AS (
    SELECT COUNT(*)::BIGINT as total
    FROM ganadores_express
    WHERE ganadores_express.sorteo_id = v_sorteo_activo_id AND visible = true
  )
  SELECT
    v_sorteo_activo_id,
    s.nombre::TEXT,
    s.total_chances,
    s.estado::TEXT,
    stats.total_compradores,
    stats.chances_vendidas,
    stats.total_recaudado,
    CASE
      WHEN s.total_chances > 0 THEN
        ROUND((stats.chances_vendidas::NUMERIC / s.total_chances::NUMERIC * 100), 2)
      ELSE 0
    END as porcentaje_completado,
    ganadores_count.total as cantidad_ganadores_express
  FROM sorteos s, stats, ganadores_count
  WHERE s.id = v_sorteo_activo_id;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION obtener_resumen_sorteo_activo IS
'Obtiene un resumen completo del sorteo activo en una sola consulta optimizada.';


-- ============================================
-- PERMISOS
-- ============================================
-- Asegurar que las funciones puedan ser ejecutadas por usuarios anónimos
-- (esto depende de tu configuración de RLS en Supabase)

GRANT EXECUTE ON FUNCTION obtener_estadisticas_sorteo TO anon, authenticated;
GRANT EXECUTE ON FUNCTION contar_compradores_sorteo TO anon, authenticated;
GRANT EXECUTE ON FUNCTION contar_chances_vendidas TO anon, authenticated;
GRANT EXECUTE ON FUNCTION verificar_sorteo_completo TO anon, authenticated;
GRANT EXECUTE ON FUNCTION obtener_ganadores_express_visibles TO anon, authenticated;
GRANT EXECUTE ON FUNCTION obtener_resumen_sorteo_activo TO anon, authenticated;
