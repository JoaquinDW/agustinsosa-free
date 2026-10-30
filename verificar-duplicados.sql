-- ===== QUERY 1: Buscar TODOS los números duplicados =====
-- Este query busca números que aparecen en más de un comprador

WITH numeros_expandidos AS (
  SELECT 
    c.id as comprador_id,
    c.nombre,
    c.sorteo_id,
    c.cantidad_chances,
    c.estado_pago,
    c.created_at,
    unnest(c.numeros_asignados) as numero
  FROM compradores c
  WHERE c.estado_pago = 'pagado'
),
numeros_duplicados AS (
  SELECT 
    numero,
    COUNT(*) as veces_usado
  FROM numeros_expandidos
  GROUP BY numero
  HAVING COUNT(*) > 1
)
SELECT 
  nd.numero,
  nd.veces_usado,
  ne.comprador_id,
  ne.nombre,
  ne.sorteo_id,
  ne.cantidad_chances,
  ne.created_at,
  TO_CHAR(ne.created_at, 'DD/MM/YYYY HH24:MI:SS') as fecha_legible
FROM numeros_duplicados nd
JOIN numeros_expandidos ne ON nd.numero = ne.numero
ORDER BY nd.numero, ne.created_at;

-- ===== QUERY 2: Verificar específicamente el número 4699 =====

SELECT 
  c.id,
  c.nombre,
  c.sorteo_id,
  c.cantidad_chances,
  c.estado_pago,
  c.created_at,
  TO_CHAR(c.created_at, 'DD/MM/YYYY HH24:MI:SS') as fecha_legible,
  c.numeros_asignados,
  (SELECT COUNT(*) FROM unnest(c.numeros_asignados) WHERE unnest = 4699) as tiene_4699
FROM compradores c
WHERE 
  c.estado_pago = 'pagado'
  AND 4699 = ANY(c.numeros_asignados)
ORDER BY c.created_at;

-- ===== QUERY 3: Estadísticas generales de números =====

WITH numeros_expandidos AS (
  SELECT 
    unnest(numeros_asignados) as numero
  FROM compradores
  WHERE estado_pago = 'pagado'
)
SELECT 
  COUNT(*) as total_numeros_asignados,
  COUNT(DISTINCT numero) as numeros_unicos,
  COUNT(*) - COUNT(DISTINCT numero) as numeros_duplicados_total
FROM numeros_expandidos;

-- ===== QUERY 4: Encontrar todos los compradores con números duplicados =====
-- (para ver el contexto completo de cada comprador afectado)

WITH numeros_expandidos AS (
  SELECT 
    c.id as comprador_id,
    unnest(c.numeros_asignados) as numero
  FROM compradores c
  WHERE c.estado_pago = 'pagado'
),
numeros_problematicos AS (
  SELECT numero
  FROM numeros_expandidos
  GROUP BY numero
  HAVING COUNT(*) > 1
)
SELECT DISTINCT
  c.*,
  TO_CHAR(c.created_at, 'DD/MM/YYYY HH24:MI:SS') as fecha_legible,
  (
    SELECT array_agg(n.numero ORDER BY n.numero)
    FROM unnest(c.numeros_asignados) n(numero)
    WHERE n.numero IN (SELECT numero FROM numeros_problematicos)
  ) as numeros_duplicados_que_tiene
FROM compradores c
WHERE 
  c.estado_pago = 'pagado'
  AND EXISTS (
    SELECT 1 
    FROM unnest(c.numeros_asignados) n(numero)
    WHERE n.numero IN (SELECT numero FROM numeros_problematicos)
  )
ORDER BY c.created_at;
