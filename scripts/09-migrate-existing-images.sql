-- Script para migrar imágenes existentes de Vercel Blob a Supabase Storage
-- Este script debe ejecutarse manualmente después de configurar los buckets

-- Actualizar URLs de imágenes existentes (ejemplo)
-- Nota: Este es un ejemplo, las URLs reales deben actualizarse manualmente
-- UPDATE sorteos SET imagen_url = REPLACE(imagen_url, 'https://blob.vercel-storage.com/', 'https://your-supabase-url.supabase.co/storage/v1/object/public/sorteo-images/');
-- UPDATE compradores SET comprobante_url = REPLACE(comprobante_url, 'https://blob.vercel-storage.com/', 'https://your-supabase-url.supabase.co/storage/v1/object/public/comprobantes/');

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_sorteos_imagen_url ON sorteos(imagen_url);
CREATE INDEX IF NOT EXISTS idx_compradores_comprobante_url ON compradores(comprobante_url);
