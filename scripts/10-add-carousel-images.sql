-- Agregar campos para imágenes del carrusel
ALTER TABLE sorteos 
ADD COLUMN IF NOT EXISTS carousel_image_1 TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS carousel_image_2 TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS carousel_image_3 TEXT DEFAULT NULL;

-- Crear índice para mejorar performance
CREATE INDEX IF NOT EXISTS idx_sorteos_carousel_images ON sorteos(carousel_image_1, carousel_image_2, carousel_image_3);

-- Comentarios para documentar los campos
COMMENT ON COLUMN sorteos.carousel_image_1 IS 'Primera imagen del carrusel (ej: persona con iPhone)';
COMMENT ON COLUMN sorteos.carousel_image_2 IS 'Segunda imagen del carrusel (ej: iPhone solo)';
COMMENT ON COLUMN sorteos.carousel_image_3 IS 'Tercera imagen del carrusel (ej: iPhone solo desde otro ángulo)';
