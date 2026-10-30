-- Agregar campo de imagen a la tabla sorteos
ALTER TABLE sorteos ADD COLUMN IF NOT EXISTS imagen_url TEXT;

-- Actualizar sorteos existentes con una imagen por defecto
UPDATE sorteos 
SET imagen_url = '/placeholder.jpg' 
WHERE imagen_url IS NULL;
