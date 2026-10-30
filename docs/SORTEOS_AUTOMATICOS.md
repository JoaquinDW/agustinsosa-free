# Sistema Automático de Sorteos

Este sistema maneja automáticamente los sorteos desde la venta hasta la determinación del ganador.

## Flujo Automático

### 1. Venta de Chances

- Los usuarios compran chances normalmente
- El sistema asigna números únicos automáticamente
- **Verificación automática**: Cada vez que se vende/aprueba una chance, se verifica si se completó el sorteo

### 2. Sorteo Completo

Cuando `chancesVendidas >= total_chances`:

- El estado del sorteo cambia automáticamente de `"activo"` a `"completo"`
- Se registra la fecha de finalización en `fecha_sorteo_realizado`
- Ya no se pueden vender más chances

### 3. Ejecución del Sorteo (24h después)

Al día siguiente de completarse el sorteo:

- El sistema ejecuta automáticamente el scrapper de la lotería
- Obtiene el primer número de la Quiniela Buenos Aires
- Ajusta el número al rango del sorteo (1 - total_chances)
- Determina al ganador buscando quién tiene ese número
- Actualiza el estado a `"sorteado"` con el número ganador

## Estados del Sorteo

- `"activo"`: Se están vendiendo chances
- `"completo"`: Todas las chances vendidas, esperando ejecución
- `"sorteado"`: Ya se ejecutó y hay un ganador
- `"cerrado"`: Sorteo finalizado/cancelado

## Comandos Disponibles

### Ejecutar scrapper manualmente

\`\`\`bash
pnpm run scrapper
\`\`\`

### Verificar sorteos pendientes

\`\`\`bash
pnpm run verificar-sorteos
\`\`\`

### Endpoint API para verificación automática

\`\`\`
POST /api/verificar-sorteos
\`\`\`

## Configuración de Cron Job

Para ejecutar automáticamente todos los días a las 14:00 (hora Argentina):

\`\`\`bash
# Editar crontab
crontab -e

# Agregar esta línea:
0 14 * * * cd /ruta/a/tu/proyecto && pnpm run verificar-sorteos >> /var/log/sorteos-cron.log 2>&1
\`\`\`

## Configuración con Vercel Cron (Recomendado)

En `vercel.json`:

\`\`\`json
{
  "crons": [
    {
      "path": "/api/verificar-sorteos",
      "schedule": "0 14 * * *"
    }
  ]
}
\`\`\`

## Variables de Entorno

Agregar a tu `.env.local`:

\`\`\`
CRON_SECRET=tu-token-secreto-aqui
\`\`\`

## Logs y Monitoreo

- Todos los procesos se logean en consola
- Los errores se capturan y reportan
- El endpoint API devuelve estado y timestamp

## Desarrollo y Testing

### Probar el scrapper

\`\`\`bash
pnpm run scrapper
\`\`\`

### Forzar verificación

\`\`\`bash
curl -X POST http://localhost:3000/api/verificar-sorteos \
  -H "Authorization: Bearer tu-token-secreto"
\`\`\`

### Simular sorteo completo

En el código, puedes temporalmente cambiar la condición de verificación para probar el flujo completo.
