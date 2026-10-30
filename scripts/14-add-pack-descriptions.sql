-- Agregar campos de descripción para cada pack
ALTER TABLE sorteos
ADD COLUMN IF NOT EXISTS descripcion_pack_1 TEXT DEFAULT 'Honda Wave 2025',
ADD COLUMN IF NOT EXISTS descripcion_pack_2 TEXT DEFAULT 'Honda Wave 2025 + 5 oportunidades en pre-venta Nueva Titan 2018',
ADD COLUMN IF NOT EXISTS descripcion_pack_3 TEXT DEFAULT 'Honda Wave 2025 + 5 chances pre-venta New Titan 2018';

-- Actualizar sorteos existentes con las descripciones por defecto si están vacías
UPDATE sorteos
SET 
  descripcion_pack_1 = COALESCE(descripcion_pack_1, 'Honda Wave 2025'),
  descripcion_pack_2 = COALESCE(descripcion_pack_2, 'Honda Wave 2025 + 5 oportunidades en pre-venta Nueva Titan 2018'),
  descripcion_pack_3 = COALESCE(descripcion_pack_3, 'Honda Wave 2025 + 5 chances pre-venta New Titan 2018')
WHERE descripcion_pack_1 IS NULL OR descripcion_pack_2 IS NULL OR descripcion_pack_3 IS NULL;
