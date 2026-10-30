# 🧪 Guía de Testing del Sistema de Sorteos

Esta guía te muestra cómo testear completamente el flujo automatizado de sorteos.

## 🎯 Opciones de Testing

### 1. **Testing desde el Backoffice (Interfaz Web)**

Ve a `/backoffice` y entra en la pestaña "Testing":

- **Test Completo**: Ejecuta todo el flujo automáticamente
- **Completar**: Fuerza que el sorteo se marque como completo
- **Simular días**: Modifica la fecha para simular que pasó tiempo
- **Resetear**: Vuelve el sorteo al estado activo
- **Solo Scrapper**: Prueba únicamente el scraping de la lotería
- **Verificar**: Ejecuta manualmente la verificación de sorteos

### 2. **Scripts de Línea de Comandos**

\`\`\`bash
# Ver ayuda completa
pnpm run test-sorteos

# Listar sorteos disponibles
pnpm run test-sorteos listar

# Flujo completo automático
pnpm run test-sorteos flujo <sorteoId>

# Pasos individuales
pnpm run test-sorteos completar <sorteoId>
pnpm run test-sorteos simular <sorteoId> 2
pnpm run test-sorteos verificar
pnpm run test-sorteos resetear <sorteoId>

# Solo probar scrapper
pnpm run test-sorteos scrapper

# Prueba rápida sin DB
pnpm run prueba-rapida
\`\`\`

### 3. **APIs para Testing Automatizado**

#### `/api/test-sorteos` (POST)

\`\`\`json
// Test completo
{
  "accion": "test-completo",
  "sorteoId": "tu-sorteo-id"
}

// Completar sorteo
{
  "accion": "completar-sorteo",
  "sorteoId": "tu-sorteo-id"
}

// Simular días
{
  "accion": "simular-dia-siguiente",
  "sorteoId": "tu-sorteo-id",
  "diasASimular": 2
}

// Resetear
{
  "accion": "resetear-sorteo",
  "sorteoId": "tu-sorteo-id"
}
\`\`\`

#### `/api/scrapper` (GET/POST)

Prueba solo el scrapper de lotería

#### `/api/verificar-sorteos` (POST)

Ejecuta la verificación de sorteos pendientes

## 🔄 Flujo de Testing Recomendado

### Opción A: Test Completo Automático

\`\`\`bash
# 1. Listar sorteos disponibles
pnpm run test-sorteos listar

# 2. Ejecutar flujo completo (copia el ID del sorteo)
pnpm run test-sorteos flujo abc123-def456-...
\`\`\`

### Opción B: Test Paso a Paso

\`\`\`bash
# 1. Completar sorteo manualmente
pnpm run test-sorteos completar <sorteoId>

# 2. Simular que pasó un día
pnpm run test-sorteos simular <sorteoId> 1

# 3. Ejecutar verificación
pnpm run test-sorteos verificar

# 4. Ver resultado en el backoffice o listar sorteos
pnpm run test-sorteos listar
\`\`\`

### Opción C: Desde el Backoffice

1. Ve a `/backoffice` → pestaña "Testing"
2. Haz clic en "Test Completo"
3. Observa el resultado en el área de texto

## 🧪 Casos de Prueba

### Test 1: Scrapper Básico

\`\`\`bash
pnpm run prueba-rapida
\`\`\`

**Esperado**: Obtiene número de la lotería y lo convierte al rango del sorteo.

### Test 2: Flujo Completo

1. Sorteo con estado "activo"
2. Se marca como "completo"
3. Se simula que pasó 1 día
4. Se ejecuta el scrapper automáticamente
5. Se determina el ganador
6. Estado cambia a "sorteado"

### Test 3: Sin Comprador Ganador

- Mismo flujo pero el número ganador no coincide con ningún comprador
- Debería mostrar "número determinado pero sin comprador asignado"

### Test 4: Reset y Repetición

\`\`\`bash
pnpm run test-sorteos resetear <sorteoId>
pnpm run test-sorteos flujo <sorteoId>
\`\`\`

## 🎲 Simulación de Números

El sistema:

1. Obtiene el primer número de la Quiniela Buenos Aires
2. Toma los últimos 4 dígitos
3. Aplica módulo según el total de chances del sorteo
4. Suma 1 para que esté en rango 1-N
5. Busca al comprador con ese número

Ejemplo:

- Número de lotería: `1857`
- Total chances: `9999`
- Cálculo: `(1857 % 9999) + 1 = 1858`

## ⚠️ Notas Importantes

- **Variables de Entorno**: Los scripts necesitan configuración de Supabase
- **Estado del Sorteo**: Algunos tests solo funcionan con ciertos estados
- **Datos Reales**: Ten cuidado al testear con sorteos reales en producción
- **Reset**: Usa "resetear" para volver el sorteo a estado inicial

## 🚀 Automatización en Producción

El sistema incluye:

- **Vercel Cron**: Ejecuta verificación diaria a las 14:00
- **Webhook Manual**: `/api/verificar-sorteos`
- **Detección Automática**: Se ejecuta cuando se completan las chances

Para monitorear en producción, revisa los logs en Vercel Functions.
