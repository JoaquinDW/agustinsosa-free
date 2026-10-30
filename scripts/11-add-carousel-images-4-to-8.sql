-- Agregar campos adicionales para imágenes del carrusel (4 a 8)
ALTER TABLE sorteos
ADD COLUMN IF NOT EXISTS carousel_image_4 TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS carousel_image_5 TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS carousel_image_6 TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS carousel_image_7 TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS carousel_image_8 TEXT DEFAULT NULL;

-- Comentarios para documentar los campos
COMMENT ON COLUMN sorteos.carousel_image_4 IS 'Cuarta imagen del carrusel';
COMMENT ON COLUMN sorteos.carousel_image_5 IS 'Quinta imagen del carrusel';
COMMENT ON COLUMN sorteos.carousel_image_6 IS 'Sexta imagen del carrusel';
COMMENT ON COLUMN sorteos.carousel_image_7 IS 'Séptima imagen del carrusel';
COMMENT ON COLUMN sorteos.carousel_image_8 IS 'Octava imagen del carrusel';
