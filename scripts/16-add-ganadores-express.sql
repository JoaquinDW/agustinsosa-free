-- Migration: Crear tabla de ganadores express (premios instantáneos)
-- Created: 2025-12-12
-- Description: Tabla para gestionar ganadores de premios express/instantáneos del sorteo
-- 
-- Para aplicar esta migración en Supabase:
-- 1. Ve a tu proyecto en https://supabase.com/dashboard
-- 2. Navega a "SQL Editor" en el menú lateral
-- 3. Haz clic en "New query"
-- 4. Copia y pega todo este contenido
-- 5. Haz clic en "Run" para ejecutar

-- ============================================
-- PASO 1: Crear la tabla ganadores_express
-- ============================================

CREATE TABLE IF NOT EXISTS ganadores_express (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sorteo_id UUID REFERENCES sorteos(id) ON DELETE CASCADE,
  numero_ganador INTEGER NOT NULL,
  nombre_ganador TEXT,
  premio_monto TEXT NOT NULL,
  fecha_premio DATE NOT NULL DEFAULT CURRENT_DATE,
  visible BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PASO 2: Crear índices para optimizar consultas
-- ============================================

CREATE INDEX IF NOT EXISTS idx_ganadores_express_sorteo 
  ON ganadores_express(sorteo_id);

CREATE INDEX IF NOT EXISTS idx_ganadores_express_numero 
  ON ganadores_express(numero_ganador);

CREATE INDEX IF NOT EXISTS idx_ganadores_express_visible 
  ON ganadores_express(visible);

CREATE INDEX IF NOT EXISTS idx_ganadores_express_created 
  ON ganadores_express(created_at DESC);

-- ============================================
-- PASO 3: Habilitar Row Level Security (RLS)
-- ============================================

ALTER TABLE ganadores_express ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PASO 4: Crear políticas de seguridad
-- ============================================

-- Política para permitir lectura pública de ganadores visibles
CREATE POLICY "ganadores_express_select_visible" 
  ON ganadores_express
  FOR SELECT 
  USING (visible = true);

-- Política para permitir todas las operaciones (para uso del backoffice vía service role)
CREATE POLICY "ganadores_express_all_operations" 
  ON ganadores_express
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- ============================================
-- PASO 5: Crear función para actualizar updated_at
-- ============================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PASO 6: Crear trigger para updated_at automático
-- ============================================

DROP TRIGGER IF EXISTS set_ganadores_express_updated_at ON ganadores_express;

CREATE TRIGGER set_ganadores_express_updated_at
  BEFORE UPDATE ON ganadores_express
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================
-- PASO 7: Agregar comentarios a la tabla
-- ============================================

COMMENT ON TABLE ganadores_express IS 'Tabla para almacenar ganadores de premios express/instantáneos del sorteo';
COMMENT ON COLUMN ganadores_express.id IS 'Identificador único del ganador express';
COMMENT ON COLUMN ganadores_express.sorteo_id IS 'ID del sorteo al que pertenece este ganador';
COMMENT ON COLUMN ganadores_express.numero_ganador IS 'Número ganador del sorteo';
COMMENT ON COLUMN ganadores_express.nombre_ganador IS 'Nombre del ganador (autocompletado si existe en compradores)';
COMMENT ON COLUMN ganadores_express.premio_monto IS 'Descripción del monto del premio (ej: 500$ o 10.000$ MIL)';
COMMENT ON COLUMN ganadores_express.fecha_premio IS 'Fecha en que se otorgó el premio';
COMMENT ON COLUMN ganadores_express.visible IS 'Si el ganador es visible públicamente';

-- ============================================
-- Migración completada exitosamente
-- ============================================

-- Verificar que la tabla se creó correctamente
SELECT 'Tabla ganadores_express creada exitosamente' as status,
       COUNT(*) as registros
FROM ganadores_express;

