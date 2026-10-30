-- Agregar campo para título de la remera
ALTER TABLE sorteos 
ADD COLUMN IF NOT EXISTS titulo_remera VARCHAR(255) DEFAULT 'Remera Exclusiva';

-- Actualizar sorteos existentes con un título por defecto
UPDATE sorteos 
SET titulo_remera = 'Remera Exclusiva'
WHERE titulo_remera IS NULL;

-- Hacer el campo NOT NULL después de establecer valores por defecto
ALTER TABLE sorteos 
ALTER COLUMN titulo_remera SET NOT NULL;

-- Comentario para documentar el campo
COMMENT ON COLUMN sorteos.titulo_remera IS 'Título personalizable que aparece debajo de la imagen de la remera';
