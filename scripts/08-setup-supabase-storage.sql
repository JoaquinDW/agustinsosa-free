-- Crear buckets de Supabase Storage
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('sorteo-images', 'sorteo-images', true),
  ('comprobantes', 'comprobantes', true),
  ('tshirt-previews', 'tshirt-previews', true);

-- Políticas de acceso público para lectura
CREATE POLICY "Public read access" ON storage.objects FOR SELECT USING (true);

-- Políticas de escritura autenticada (o pública según necesites)
CREATE POLICY "Public upload access" ON storage.objects FOR INSERT WITH CHECK (true);

-- Política para actualizar archivos
CREATE POLICY "Public update access" ON storage.objects FOR UPDATE USING (true);

-- Política para eliminar archivos
CREATE POLICY "Public delete access" ON storage.objects FOR DELETE USING (true);
