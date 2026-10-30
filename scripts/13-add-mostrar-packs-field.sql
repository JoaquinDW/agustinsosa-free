-- Agregar campos para configurar la visibilidad de cada pack individualmente
ALTER TABLE sorteos 
ADD COLUMN IF NOT EXISTS pack_1_visible BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS pack_2_visible BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS pack_3_visible BOOLEAN DEFAULT true;

-- Actualizar el sorteo activo para mostrar solo el pack 1
UPDATE sorteos 
SET pack_1_visible = true,
    pack_2_visible = false,
    pack_3_visible = false
WHERE estado = 'activo';
