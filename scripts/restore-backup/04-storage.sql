BEGIN;

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) VALUES
  ('sorteo-images', 'sorteo-images', true, 5242880, ARRAY['image/*']),
  ('comprobantes', 'comprobantes', true, 5242880, ARRAY['image/*']),
  ('tshirt-previews', 'tshirt-previews', true, 10485760, ARRAY['image/*']),
  (
    'contenido-packs',
    'contenido-packs',
    false,
    52428800,
    ARRAY['application/pdf', 'application/zip']
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- La aplicación actual sube imágenes con la publishable key, incluso desde
-- rutas de servidor. Se restringen estas políticas a los tres buckets de
-- imágenes; contenido-packs permanece privado y requiere una secret key.
DROP POLICY IF EXISTS sosa_imagenes_insert ON storage.objects;
CREATE POLICY sosa_imagenes_insert
  ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id IN ('sorteo-images', 'comprobantes', 'tshirt-previews')
  );

-- SELECT y UPDATE son necesarios cuando upload() usa upsert: true.
DROP POLICY IF EXISTS sosa_imagenes_select ON storage.objects;
CREATE POLICY sosa_imagenes_select
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id IN ('sorteo-images', 'comprobantes', 'tshirt-previews')
  );

DROP POLICY IF EXISTS sosa_imagenes_update ON storage.objects;
CREATE POLICY sosa_imagenes_update
  ON storage.objects
  FOR UPDATE
  TO anon, authenticated
  USING (
    bucket_id IN ('sorteo-images', 'comprobantes', 'tshirt-previews')
  )
  WITH CHECK (
    bucket_id IN ('sorteo-images', 'comprobantes', 'tshirt-previews')
  );

COMMIT;

SELECT id, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id IN (
  'sorteo-images',
  'comprobantes',
  'tshirt-previews',
  'contenido-packs'
)
ORDER BY id;
