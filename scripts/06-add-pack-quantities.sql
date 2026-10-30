-- Agregar campos para cantidades de chances configurables
ALTER TABLE sorteos 
ADD COLUMN IF NOT EXISTS cantidad_pack_1 INTEGER DEFAULT 6,
ADD COLUMN IF NOT EXISTS cantidad_pack_2 INTEGER DEFAULT 12,
ADD COLUMN IF NOT EXISTS cantidad_pack_3 INTEGER DEFAULT 24;

-- Actualizar sorteos existentes con valores por defecto
UPDATE sorteos 
SET 
  cantidad_pack_1 = 6,
  cantidad_pack_2 = 12,
  cantidad_pack_3 = 24
WHERE cantidad_pack_1 IS NULL OR cantidad_pack_2 IS NULL OR cantidad_pack_3 IS NULL;

-- Hacer los campos NOT NULL después de establecer valores por defecto
ALTER TABLE sorteos 
ALTER COLUMN cantidad_pack_1 SET NOT NULL,
ALTER COLUMN cantidad_pack_2 SET NOT NULL,
ALTER COLUMN cantidad_pack_3 SET NOT NULL;
