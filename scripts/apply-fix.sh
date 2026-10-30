#!/bin/bash
# Script de aplicación rápida del fix de números duplicados
#
# Este script guía al usuario paso a paso en la corrección

set -e  # Exit on error

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   FIX DE NÚMEROS DUPLICADOS - INSTALACIÓN                ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar que estamos en el directorio correcto
if [ ! -f "scripts/02-fix-duplicate-numbers.sql" ]; then
    echo -e "${RED}❌ Error: Ejecutar este script desde la raíz del proyecto${NC}"
    exit 1
fi

echo "Este script te guiará en la corrección de números duplicados."
echo ""
echo "PASOS QUE SE REALIZARÁN:"
echo "  1. Verificar archivos necesarios"
echo "  2. Obtener ID del sorteo activo"
echo "  3. Diagnosticar duplicados"
echo "  4. Aplicar funciones SQL a la base de datos"
echo "  5. Ejecutar corrección (dry-run primero)"
echo ""

# Verificar que las variables de entorno estén configuradas
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  VERIFICANDO CONFIGURACIÓN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Cargar variables de entorno
if [ -f ".env.local" ]; then
    source .env.local
    echo -e "${GREEN}✓${NC} Variables de entorno cargadas desde .env.local"
else
    echo -e "${YELLOW}⚠${NC}  No se encontró .env.local, usando variables del sistema"
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo -e "${RED}❌ Error: NEXT_PUBLIC_SUPABASE_URL no está configurada${NC}"
    exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}❌ Error: SUPABASE_SERVICE_ROLE_KEY no está configurada${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Supabase URL configurada"
echo -e "${GREEN}✓${NC} Service Role Key configurada"
echo ""

# Verificar archivos
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  VERIFICANDO ARCHIVOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ! -f "scripts/02-fix-duplicate-numbers.sql" ]; then
    echo -e "${RED}❌ Error: No se encuentra el script SQL${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} scripts/02-fix-duplicate-numbers.sql"

if [ ! -f "scripts/fix-duplicates.ts" ]; then
    echo -e "${RED}❌ Error: No se encuentra el script TypeScript${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} scripts/fix-duplicates.ts"

if [ ! -f "scripts/README-FIX-DUPLICATES.md" ]; then
    echo -e "${YELLOW}⚠${NC}  No se encuentra la documentación"
else
    echo -e "${GREEN}✓${NC} scripts/README-FIX-DUPLICATES.md"
fi
echo ""

# Instrucciones para aplicar SQL
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  APLICAR FUNCIONES SQL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Debes ejecutar el script SQL en Supabase:"
echo ""
echo "1. Ir a tu proyecto en https://supabase.com"
echo "2. Ir a SQL Editor"
echo "3. Crear una nueva query"
echo "4. Copiar el contenido de: ${GREEN}scripts/02-fix-duplicate-numbers.sql${NC}"
echo "5. Pegar y ejecutar"
echo ""
echo -e "${YELLOW}⚠${NC}  Esto creará las funciones necesarias para prevenir duplicados"
echo ""
read -p "¿Has ejecutado el script SQL en Supabase? (s/n): " sql_ejecutado

if [ "$sql_ejecutado" != "s" ] && [ "$sql_ejecutado" != "S" ]; then
    echo -e "${RED}❌ Por favor ejecuta el script SQL primero${NC}"
    echo "   Luego vuelve a ejecutar este script"
    exit 1
fi

echo -e "${GREEN}✓${NC} Script SQL aplicado"
echo ""

# Obtener sorteo ID
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  OBTENER ID DEL SORTEO ACTIVO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Para obtener el ID del sorteo activo, ejecuta esta query en Supabase:"
echo ""
echo -e "${GREEN}SELECT id, nombre, estado FROM sorteos WHERE estado = 'activo';${NC}"
echo ""
read -p "Ingresa el ID del sorteo activo: " SORTEO_ID

if [ -z "$SORTEO_ID" ]; then
    echo -e "${RED}❌ Error: Debes ingresar un ID de sorteo${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Sorteo ID: $SORTEO_ID"
echo ""

# Ejecutar diagnóstico
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  EJECUTANDO DIAGNÓSTICO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Ejecuta esta query en Supabase para ver el diagnóstico:"
echo ""
echo -e "${GREEN}SELECT * FROM diagnosticar_duplicados('$SORTEO_ID');${NC}"
echo ""
read -p "Presiona Enter cuando hayas visto el diagnóstico..."
echo ""

# Ejecutar dry-run
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣  EJECUTAR SIMULACIÓN (DRY RUN)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Vamos a simular la corrección sin hacer cambios reales."
echo ""
read -p "¿Continuar? (s/n): " continuar

if [ "$continuar" != "s" ] && [ "$continuar" != "S" ]; then
    echo "Operación cancelada"
    exit 0
fi

echo ""
echo "Ejecutando dry-run..."
npx tsx scripts/fix-duplicates.ts "$SORTEO_ID" dry-run

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7️⃣  REVISAR REPORTE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Se generó un reporte en la carpeta scripts/"
echo "Revísalo cuidadosamente antes de ejecutar la corrección real."
echo ""

# Preguntar si ejecutar la corrección real
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "8️⃣  EJECUTAR CORRECCIÓN REAL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${YELLOW}⚠ ADVERTENCIA: Esto MODIFICARÁ la base de datos${NC}"
echo ""
echo "Antes de continuar, asegúrate de:"
echo "  1. Haber hecho un backup de la base de datos"
echo "  2. Haber revisado el reporte del dry-run"
echo "  3. Estar seguro de que los cambios son correctos"
echo ""
read -p "¿Ejecutar la corrección REAL? (escribe 'EJECUTAR' para confirmar): " confirmar

if [ "$confirmar" != "EJECUTAR" ]; then
    echo ""
    echo "Corrección cancelada."
    echo "Para ejecutarla manualmente más tarde:"
    echo "  npx tsx scripts/fix-duplicates.ts \"$SORTEO_ID\" execute"
    exit 0
fi

echo ""
echo "Ejecutando corrección real..."
npx tsx scripts/fix-duplicates.ts "$SORTEO_ID" execute

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ PROCESO COMPLETADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Próximos pasos:"
echo "  1. Verificar en Supabase que no hay duplicados:"
echo "     ${GREEN}SELECT * FROM diagnosticar_duplicados('$SORTEO_ID');${NC}"
echo ""
echo "  2. Notificar a los compradores afectados (ver reporte)"
echo ""
echo "  3. Monitorear que no se generen nuevos duplicados"
echo ""
echo "  4. Leer la documentación completa:"
echo "     ${GREEN}scripts/README-FIX-DUPLICATES.md${NC}"
echo ""
