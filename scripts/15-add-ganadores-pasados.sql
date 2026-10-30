-- Script de migración para crear la tabla de ganadores pasados
-- Fecha: 2025-11-24

-- Crear tabla de ganadores pasados
CREATE TABLE IF NOT EXISTS ganadores_pasados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre_ganador TEXT NOT NULL,
  premio TEXT NOT NULL,
  precio_premio TEXT NOT NULL,
  fecha_sorteo DATE NOT NULL,
  numero_ganador INTEGER NOT NULL,
  imagen_1_url TEXT,
  imagen_2_url TEXT,
  imagen_3_url TEXT,
  orden INTEGER NOT NULL DEFAULT 0,
  visible BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Crear índice para ordenamiento
CREATE INDEX IF NOT EXISTS idx_ganadores_pasados_orden ON ganadores_pasados(orden DESC);

-- Crear índice para filtrar visibles
CREATE INDEX IF NOT EXISTS idx_ganadores_pasados_visible ON ganadores_pasados(visible);

-- Habilitar Row Level Security
ALTER TABLE ganadores_pasados ENABLE ROW LEVEL SECURITY;

-- Política para permitir lectura pública de ganadores visibles
CREATE POLICY "Ganadores visibles son públicos" ON ganadores_pasados
  FOR SELECT USING (visible = true);

-- Política para permitir todas las operaciones (necesario para el backoffice)
CREATE POLICY "Permitir todas las operaciones en ganadores" ON ganadores_pasados
  FOR ALL USING (true);

-- Función para actualizar el campo updated_at
CREATE OR REPLACE FUNCTION actualizar_ganadores_pasados_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at automáticamente
CREATE TRIGGER trigger_actualizar_ganadores_pasados_updated_at
  BEFORE UPDATE ON ganadores_pasados
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_ganadores_pasados_updated_at();

-- Insertar ganador de ejemplo
INSERT INTO ganadores_pasados (
  nombre_ganador,
  premio,
  precio_premio,
  fecha_sorteo,
  numero_ganador,
  orden,
  visible
) VALUES (
  'Pedro Agustín Sáez',
  'iPhone 14 Pro Max nuevo en caja',
  '$10 mil pesos',
  '2025-10-10',
  3966,
  1,
  true
);
