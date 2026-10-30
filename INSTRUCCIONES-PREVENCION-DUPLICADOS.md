# 🛡️ Instrucciones de Prevención de Duplicados - Deployment

> **Actualización vigente:** la prueba histórica con Mercado Pago ya no aplica. El único pago habilitado es transferencia bancaria; no reactivar Mercado Pago.

## 📋 Resumen

Este sistema implementa **5 capas de protección** para prevenir números duplicados bajo cualquier circunstancia:

1. **Función SQL Atómica** con `FOR UPDATE` (previene race conditions)
2. **Trigger de Validación BD** (última línea de defensa)
3. **Validación Post-Generación TypeScript** (double-check)
4. **Health Check** (monitoreo proactivo)
5. **Tests de Concurrencia** (prevención de regresiones)

---

## 🚀 FASE 1: DEPLOYMENT URGENTE (Hacer Primero)

### Paso 1: Aplicar Funciones SQL en Supabase

**⚠️ CRÍTICO: Esto debe hacerse ANTES de desplegar el código**

1. Ir a **Supabase Dashboard** → **SQL Editor**

2. Ejecutar el primer archivo SQL:
   ```
   scripts/03-fix-duplicate-numbers-optimized.sql
   ```

   Esto crea:
   - ✅ `generar_numeros_unicos_atomico()` - Función atómica con FOR UPDATE
   - ✅ `diagnosticar_duplicados_rapido()` - Función de diagnóstico

3. Ejecutar el segundo archivo SQL:
   ```
   scripts/04-trigger-validacion-duplicados.sql
   ```

   Esto crea:
   - ✅ `validar_numeros_unicos_antes_cambio()` - Función del trigger
   - ✅ `trigger_validar_numeros_unicos` - Trigger que se ejecuta antes de INSERT/UPDATE

### Paso 2: Verificar Instalación

Ejecutar en Supabase SQL Editor:

```sql
-- Verificar funciones
SELECT proname, prosrc
FROM pg_proc
WHERE proname IN ('generar_numeros_unicos_atomico', 'diagnosticar_duplicados_rapido');

-- Verificar trigger
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trigger_validar_numeros_unicos';
```

**Resultado esperado:**
- 2 funciones encontradas ✅
- 1 trigger encontrado ✅

### Paso 3: Desplegar Código de la Aplicación

El código ya está actualizado en:
- ✅ `lib/database.ts` - Ya usa `generar_numeros_unicos_atomico()`
- ✅ `app/api/confirmar-pago/route.ts` - Validación agregada
- ✅ `lib/verificarNumerosUnicos.ts` - Nueva función creada

**Comandos de deployment:**

```bash
# Commit cambios
git add .
git commit -m "feat: implementar sistema de prevención de duplicados con 5 capas de protección"

# Push a producción
git push origin main

# O si usas Vercel:
vercel --prod
```

### Paso 4: Verificar Deployment

1. Acceder a: `https://tu-dominio.com/api/health/duplicados`

2. Verificar respuesta:
   ```json
   {
     "estado": "ok",
     "mensaje": "Sistema funcionando correctamente",
     "healthCheck": {
       "ok": true,
       "funcionesDisponibles": [
         "generar_numeros_unicos_atomico",
         "diagnosticar_duplicados_rapido"
       ],
       "funcionesFaltantes": []
     },
     "duplicados": {
       "total_numeros_asignados": XXXX,
       "numeros_unicos": XXXX,
       "numeros_duplicados": 0
     }
   }
   ```

3. **Si `duplicados.numeros_duplicados > 0`:**
   - ⚠️ Hay duplicados existentes en la BD
   - Ejecutar script de corrección (ver más abajo)

4. **Si `healthCheck.ok == false`:**
   - ❌ Funciones SQL no están aplicadas
   - Volver al Paso 1

---

## 📊 FASE 2: MONITOREO Y TESTING

### Configurar Monitoreo Automático (Opcional)

#### Opción A: Cron Job con Vercel

Agregar a `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/health/duplicados",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

Esto ejecuta el health check cada 6 horas.

#### Opción B: Monitoring Service Externo

Configurar Uptime Robot o similar para hacer ping a:
```
https://tu-dominio.com/api/health/duplicados
```

Configurar alerta si:
- Status code != 200
- `response.json().estado != "ok"`

### Ejecutar Tests de Concurrencia

```bash
# Instalar dependencias si es necesario
npm install --save-dev jest @types/jest

# Ejecutar tests
npm test -- __tests__/generarNumeros.concurrency.test.ts

# Ejecutar con coverage
npm test -- --coverage
```

**Resultado esperado:**
```
✅ Previene duplicados en 10 requests simultáneos
✅ Previene duplicados en 50 requests simultáneos (stress test)
✅ Verificación post-generación detecta duplicados
✅ Detecta duplicados internos en array
✅ Requests secuenciales no generan duplicados
✅ Función generar_numeros_unicos_atomico está disponible
```

---

## 🔧 TROUBLESHOOTING

### Problema 1: Funciones SQL No se Crearon

**Síntoma:**
```json
{
  "healthCheck": {
    "ok": false,
    "funcionesFaltantes": ["generar_numeros_unicos_atomico"]
  }
}
```

**Solución:**
1. Ir a Supabase Dashboard → SQL Editor
2. Ejecutar manualmente el contenido de `scripts/03-fix-duplicate-numbers-optimized.sql`
3. Verificar con:
   ```sql
   SELECT * FROM pg_proc WHERE proname LIKE 'generar%';
   ```

### Problema 2: Trigger No se Activa

**Síntoma:**
Se insertan duplicados y no se lanza excepción.

**Solución:**
1. Verificar que trigger existe:
   ```sql
   SELECT * FROM information_schema.triggers
   WHERE trigger_name = 'trigger_validar_numeros_unicos';
   ```

2. Si no existe, ejecutar `scripts/04-trigger-validacion-duplicados.sql`

3. Probar trigger manualmente:
   ```sql
   -- Esto DEBE fallar si hay un comprador con número 100
   BEGIN;
   INSERT INTO compradores (sorteo_id, nombre, email, cantidad_chances, numeros_asignados, precio_pagado, estado_pago)
   VALUES ('tu-sorteo-id', 'Test', 'test@test.com', 1, ARRAY[100], 1000, 'pagado');
   ROLLBACK;
   ```

### Problema 3: Validación TypeScript No se Ejecuta

**Síntoma:**
No aparecen logs de validación en consola.

**Solución:**
1. Verificar que imports están correctos:
   ```typescript
   import { verificarNumerosUnicos } from "@/lib/verificarNumerosUnicos"
   ```

2. Verificar que `confirmar-pago/route.ts` tiene la validación (líneas 54-79)

3. Revisar logs del servidor para errores de import

### Problema 4: Tests Fallan

**Síntoma:**
```
❌ Previene duplicados en 10 requests simultáneos
   Expected: 0 duplicados
   Received: 5 duplicados
```

**Causa:**
Las funciones SQL no están aplicadas en el ambiente de test.

**Solución:**
1. Asegurarse que `.env.test` apunta a BD con funciones SQL
2. O mockear `generarNumerosUnicos` para tests unitarios

---

## 📈 FASE 3: OPTIMIZACIONES FUTURAS (Opcional)

### Migrar a Tabla de Números Separada

Para máxima robustez, considerar crear tabla dedicada:

```sql
CREATE TABLE numeros_asignados (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sorteo_id UUID REFERENCES sorteos(id) ON DELETE CASCADE,
  comprador_id UUID REFERENCES compradores(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- CONSTRAINT ÚNICO garantiza imposibilidad de duplicados
  CONSTRAINT unique_numero_por_sorteo UNIQUE (sorteo_id, numero)
);
```

**Ventajas:**
- PostgreSQL garantiza unicidad con UNIQUE constraint
- Imposible duplicar a nivel de base de datos
- Más fácil de auditar

**Desventajas:**
- Requiere migración de datos
- Más complejo de mantener

---

## ✅ CHECKLIST DE DEPLOYMENT

Antes de considerar el deployment completo:

### Pre-Deployment
- [ ] Backup de base de datos creado
- [ ] Funciones SQL aplicadas en Supabase
- [ ] Trigger de validación aplicado
- [ ] Verificación manual ejecutada en SQL Editor

### Deployment
- [ ] Código pusheado a repositorio
- [ ] Build exitoso
- [ ] Tests pasando
- [ ] Deployment a producción completado

### Post-Deployment
- [ ] Health check endpoint responde OK
- [ ] `funcionesDisponibles` incluye ambas funciones
- [ ] `duplicados.numeros_duplicados == 0`
- [ ] Logs muestran validaciones ejecutándose
- [ ] Monitoreo configurado (opcional)

### Testing en Producción
- [ ] Crear comprador de prueba con MercadoPago
- [ ] Verificar que números se asignan correctamente
- [ ] Verificar logs de validación
- [ ] Aprobar transferencia de prueba
- [ ] Verificar que funciona sin duplicados

---

## 📞 SOPORTE

Si encuentras problemas:

1. **Verificar logs del servidor** para errores de las validaciones
2. **Ejecutar health check** en `/api/health/duplicados`
3. **Revisar Supabase logs** para errores SQL
4. **Contactar al equipo de desarrollo**

---

## 🎯 GARANTÍA

Con estas 5 capas de protección implementadas:

1. ✅ **Función SQL Atómica** → Previene race conditions
2. ✅ **Trigger BD** → Rechaza cualquier INSERT/UPDATE con duplicados
3. ✅ **Validación TypeScript** → Double-check antes de guardar
4. ✅ **Health Check** → Detecta problemas proactivamente
5. ✅ **Tests** → Previene regresiones

**Es virtualmente IMPOSIBLE que se generen duplicados.**

Cada capa es independiente. Si una falla, las otras 4 siguen funcionando.

---

**¡Deployment exitoso! 🎉**
