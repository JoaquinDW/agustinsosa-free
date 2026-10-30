-- Agregar campo ganador_nombre a la tabla sorteos
-- Permite registrar el nombre del ganador directamente en el sorteo (para finalizaciones manuales)
ALTER TABLE sorteos ADD COLUMN IF NOT EXISTS ganador_nombre TEXT;
