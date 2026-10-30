-- Crear tabla para los sorteos
CREATE TABLE IF NOT EXISTS sorteos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  total_chances INTEGER NOT NULL DEFAULT 150,
  precio_6_chances INTEGER NOT NULL DEFAULT 21000,
  precio_12_chances INTEGER NOT NULL DEFAULT 42000,
  precio_24_chances INTEGER NOT NULL DEFAULT 84000,
  fecha_sorteo DATE,
  estado VARCHAR(50) DEFAULT 'activo', -- activo, completo, sorteado
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla para los compradores
CREATE TABLE IF NOT EXISTS compradores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sorteo_id UUID REFERENCES sorteos(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  cantidad_chances INTEGER NOT NULL,
  numeros_asignados INTEGER[] NOT NULL,
  precio_pagado INTEGER NOT NULL,
  estado_pago VARCHAR(50) DEFAULT 'pendiente', -- pendiente, pagado, cancelado
  mercadopago_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejor performance
CREATE INDEX IF NOT EXISTS idx_compradores_sorteo_id ON compradores(sorteo_id);
CREATE INDEX IF NOT EXISTS idx_compradores_email ON compradores(email);
CREATE INDEX IF NOT EXISTS idx_compradores_estado_pago ON compradores(estado_pago);

-- Insertar sorteo por defecto
INSERT INTO sorteos (nombre, descripcion, total_chances, fecha_sorteo) 
VALUES (
  'T-SHIRT 150M - SORTEO EXCLUSIVO',
  'Sorteo exclusivo de remera premium edición limitada',
  9999,
  '2025-02-15'
) ON CONFLICT DO NOTHING;
