-- RLS policies para las tablas principales
-- La app usa auth propia (password hardcodeado en el frontend),
-- no Supabase Auth, por lo que se permiten todas las operaciones via anon key.

-- sorteos
ALTER TABLE sorteos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todas las operaciones en sorteos" ON sorteos;
CREATE POLICY "Permitir todas las operaciones en sorteos" ON sorteos
  FOR ALL USING (true) WITH CHECK (true);

-- compradores
ALTER TABLE compradores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todas las operaciones en compradores" ON compradores;
CREATE POLICY "Permitir todas las operaciones en compradores" ON compradores
  FOR ALL USING (true) WITH CHECK (true);

-- configuracion
ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todas las operaciones en configuracion" ON configuracion;
CREATE POLICY "Permitir todas las operaciones en configuracion" ON configuracion
  FOR ALL USING (true) WITH CHECK (true);
