-- Agregar nuevos estados para los sorteos
ALTER TABLE sorteos ADD COLUMN IF NOT EXISTS estado VARCHAR(50) DEFAULT 'activo';

-- Actualizar estados existentes
UPDATE sorteos SET estado = 'activo' WHERE estado IS NULL;

-- Agregar índice para mejor performance en consultas de estado
CREATE INDEX IF NOT EXISTS idx_sorteos_estado ON sorteos(estado);

-- Agregar campo para el ganador
ALTER TABLE sorteos ADD COLUMN IF NOT EXISTS ganador_id UUID REFERENCES compradores(id);
ALTER TABLE sorteos ADD COLUMN IF NOT EXISTS numero_ganador INTEGER;
ALTER TABLE sorteos ADD COLUMN IF NOT EXISTS fecha_sorteo_realizado TIMESTAMP WITH TIME ZONE;

-- Agregar campo para marcar al ganador en compradores
ALTER TABLE compradores ADD COLUMN IF NOT EXISTS es_ganador BOOLEAN DEFAULT FALSE;

-- Crear índice para ganadores
CREATE INDEX IF NOT EXISTS idx_compradores_ganador ON compradores(es_ganador);

-- Comentarios para documentar los estados
COMMENT ON COLUMN sorteos.estado IS 'Estados: activo, completo, sorteado, cerrado';
