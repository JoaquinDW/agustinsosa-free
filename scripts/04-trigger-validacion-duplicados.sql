-- ============================================
-- TRIGGER DE VALIDACIÓN DE NÚMEROS DUPLICADOS
-- ============================================
-- Este trigger es la ÚLTIMA LÍNEA DE DEFENSA
-- Previene que se inserten o actualicen compradores con números duplicados
-- Se ejecuta ANTES de INSERT o UPDATE en la tabla compradores

-- Función que valida números únicos
CREATE OR REPLACE FUNCTION validar_numeros_unicos_antes_cambio()
RETURNS TRIGGER AS $$
DECLARE
  v_numeros_duplicados INTEGER[];
  v_total_duplicados INTEGER;
BEGIN
  -- Solo validar si el estado de pago es 'pagado' y tiene números asignados
  IF NEW.estado_pago = 'pagado' AND array_length(NEW.numeros_asignados, 1) > 0 THEN

    -- Buscar números que ya existen en otros compradores del mismo sorteo
    SELECT array_agg(DISTINCT numero)
    INTO v_numeros_duplicados
    FROM (
      SELECT unnest(numeros_asignados) as numero
      FROM compradores
      WHERE sorteo_id = NEW.sorteo_id
        AND estado_pago = 'pagado'
        AND id != NEW.id  -- Excluir el comprador actual (para UPDATEs)
    ) AS numeros_existentes
    WHERE numero = ANY(NEW.numeros_asignados);

    -- Si encontramos duplicados, abortar la operación
    IF v_numeros_duplicados IS NOT NULL THEN
      v_total_duplicados := array_length(v_numeros_duplicados, 1);

      RAISE EXCEPTION
        'VALIDACIÓN FALLIDA: Se detectaron % número(s) duplicado(s) en el sorteo %: %. Esta operación ha sido ABORTADA para prevenir duplicados.',
        v_total_duplicados,
        NEW.sorteo_id,
        v_numeros_duplicados
        USING ERRCODE = '23505';  -- unique_violation error code
    END IF;

    -- Validación adicional: verificar duplicados DENTRO del mismo array
    WITH numeros_del_comprador AS (
      SELECT unnest(NEW.numeros_asignados) as numero
    )
    SELECT array_agg(numero)
    INTO v_numeros_duplicados
    FROM numeros_del_comprador
    GROUP BY numero
    HAVING COUNT(*) > 1;

    IF v_numeros_duplicados IS NOT NULL THEN
      RAISE EXCEPTION
        'VALIDACIÓN FALLIDA: El comprador % tiene números DUPLICADOS INTERNAMENTE en su array: %. Esta operación ha sido ABORTADA.',
        NEW.id,
        v_numeros_duplicados
        USING ERRCODE = '23505';
    END IF;

  END IF;

  -- Si todo está OK, permitir la operación
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger
DROP TRIGGER IF EXISTS trigger_validar_numeros_unicos ON compradores;

CREATE TRIGGER trigger_validar_numeros_unicos
  BEFORE INSERT OR UPDATE ON compradores
  FOR EACH ROW
  EXECUTE FUNCTION validar_numeros_unicos_antes_cambio();

-- ============================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- ============================================

COMMENT ON FUNCTION validar_numeros_unicos_antes_cambio() IS
'Valida que no existan números duplicados antes de insertar o actualizar un comprador.
Verifica dos tipos de duplicados:
1. Números que ya existen en otros compradores del mismo sorteo
2. Números duplicados dentro del mismo array del comprador
Si detecta duplicados, lanza una excepción y aborta la operación.';

COMMENT ON TRIGGER trigger_validar_numeros_unicos ON compradores IS
'Trigger de seguridad que previene la inserción de números duplicados.
Se ejecuta ANTES de INSERT o UPDATE en compradores.
Es la última línea de defensa contra duplicados.';

-- ============================================
-- TESTING DEL TRIGGER
-- ============================================

-- Para probar el trigger (NO EJECUTAR EN PRODUCCIÓN):
/*

-- Test 1: Intentar insertar comprador con número duplicado (debe fallar)
BEGIN;
  -- Asumir que ya existe un comprador con número 100
  INSERT INTO compradores (
    sorteo_id, nombre, email, cantidad_chances,
    numeros_asignados, precio_pagado, estado_pago
  ) VALUES (
    'tu-sorteo-id-aqui',
    'Test Usuario',
    'test@test.com',
    1,
    ARRAY[100],  -- Número que ya existe
    1000,
    'pagado'
  );
  -- Esto debe FALLAR con error de duplicado
ROLLBACK;

-- Test 2: Intentar insertar comprador con duplicados internos (debe fallar)
BEGIN;
  INSERT INTO compradores (
    sorteo_id, nombre, email, cantidad_chances,
    numeros_asignados, precio_pagado, estado_pago
  ) VALUES (
    'tu-sorteo-id-aqui',
    'Test Usuario 2',
    'test2@test.com',
    3,
    ARRAY[200, 201, 200],  -- 200 está duplicado
    3000,
    'pagado'
  );
  -- Esto debe FALLAR con error de duplicado interno
ROLLBACK;

-- Test 3: Insertar comprador válido (debe funcionar)
BEGIN;
  INSERT INTO compradores (
    sorteo_id, nombre, email, cantidad_chances,
    numeros_asignados, precio_pagado, estado_pago
  ) VALUES (
    'tu-sorteo-id-aqui',
    'Test Usuario 3',
    'test3@test.com',
    2,
    ARRAY[9998, 9999],  -- Números únicos
    2000,
    'pagado'
  );
  -- Esto debe FUNCIONAR
ROLLBACK;

*/

-- ============================================
-- VERIFICACIÓN DE INSTALACIÓN
-- ============================================

-- Ejecutar este query para verificar que el trigger está activo:
/*
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_validar_numeros_unicos';
*/
