# 📋 Instrucciones para Corregir Números Duplicados

## 🔍 Resumen del Problema

### Números actuales:
- **Total de compradores pagados:** 1,403
- **Números asignados (con duplicados):** 9,999
- **Números únicos reales:** 8,798
- **Números duplicados:** 1,201
- **Números disponibles para reasignar:** 2,108

### ¿Por qué hay duplicados?
El problema fue causado por un **race condition** en la función que genera números únicos. Cuando múltiples personas compraban al mismo tiempo, podían recibir los mismos números antes de que se guardaran en la base de datos.

### ¿Por qué el backoffice muestra 9,999 vendidos si hay 2,108 disponibles?
El backoffice está contando números **con duplicados**. En realidad, solo se vendieron **7,891 números únicos**.

---

## 📝 Plan de Corrección

### Compradores afectados:
- **347 compradores** recibirán nuevos números
- **906 números diferentes** están duplicados entre compradores
- **1,201 reasignaciones totales** necesarias

### Estrategia:
1. El comprador **más antiguo** (primera compra) **mantiene** el número duplicado
2. Los compradores **más recientes** recibirán números nuevos del pool disponible
3. Se mantienen todos los números que **NO están duplicados**

---

## 🚀 Pasos para Ejecutar la Corrección

### Paso 1: Revisar el Reporte (YA GENERADO)

El reporte CSV ya fue generado y contiene:
- Nombre del comprador
- Email
- Instagram
- Tipo de duplicado
- Números que se van a remover
- Números nuevos que recibirá
- Números finales

**Ubicación del reporte:**
```
scripts/reporte-cambios-duplicados-2026-01-08.csv
```

**Abrilo en Excel o Google Sheets** para revisar todos los cambios que se van a realizar.

---

### Paso 2: Ejecutar la Corrección (DRY RUN - Simulación)

Antes de hacer cambios reales, ejecutá una simulación para verificar todo:

```bash
npx tsx scripts/fix-duplicates-simple.ts c0cb539f-e867-4475-a9ca-b6c6e345b4ba dry-run
```

Esto:
- ✅ NO modifica la base de datos
- ✅ Muestra qué cambios se harían
- ✅ Genera el reporte CSV

---

### Paso 3: Ejecutar la Corrección REAL

⚠️ **IMPORTANTE:** Este paso SÍ modificará la base de datos.

**Antes de ejecutar:**
1. ✅ Revisaste el reporte CSV completo
2. ✅ Hiciste un backup de la base de datos (si es posible)
3. ✅ Estás seguro de continuar

**Comando para ejecutar:**
```bash
npx tsx scripts/fix-duplicates-simple.ts c0cb539f-e867-4475-a9ca-b6c6e345b4ba execute
```

Este comando:
- Identificará los 347 compradores afectados
- Reasignará 1,201 números duplicados
- Actualizará la base de datos
- Generará un reporte final

---

### Paso 4: Verificar que se Corrigió

Después de ejecutar, verificá en Supabase que no quedan duplicados:

```sql
SELECT * FROM diagnosticar_duplicados_rapido('c0cb539f-e867-4475-a9ca-b6c6e345b4ba');
```

Debería mostrar:
- `numeros_duplicados: 0`

---

## 📧 Notificar a los Compradores Afectados

Usando el reporte CSV, deberás contactar a los **347 compradores** que recibieron números nuevos.

### Mensaje sugerido:

**Asunto:** Actualización de tus números para el sorteo

**Cuerpo:**
```
Hola [NOMBRE],

Te contactamos para informarte que hemos detectado y corregido un error técnico que causó que algunos números se asignaran por duplicado a diferentes participantes.

Para garantizar la transparencia del sorteo, hemos reasignado números únicos a los participantes afectados.

Tus números anteriores:
[NÚMEROS REMOVIDOS]

Tus nuevos números:
[NÚMEROS FINALES]

Todos tus números nuevos están confirmados y participan normalmente en el sorteo. Lamentamos las molestias y agradecemos tu comprensión.

Si tenés alguna duda, respondé este mensaje.

¡Gracias por participar!
```

### Formas de contacto (del reporte CSV):
1. **Email** (columna Email)
2. **Instagram** (columna Instagram) - enviar DM
3. Si ambos son "N/A", buscar en el sistema por nombre

---

## 🛡️ Prevención de Futuros Duplicados

### Ya se implementó:
✅ **Función SQL atómica** (`generar_numeros_unicos_atomico`) que usa `FOR UPDATE` para prevenir race conditions

### Por hacer:
1. **Aplicar la función SQL en Supabase:**
   - Ir a Supabase → SQL Editor
   - Ejecutar el contenido de: `scripts/03-fix-duplicate-numbers-optimized.sql`
   - Esto creará las funciones de prevención

2. **Actualizar el código de la app:**
   - Ya está actualizado en `lib/database.ts` (líneas 821-827)
   - Ahora usa `supabase.rpc("generar_numeros_unicos_atomico", ...)`
   - Esto previene nuevos duplicados

---

## ❓ Preguntas Frecuentes

### ¿Por qué algunos compradores pierden números que ya tenían?
Solo pierden números que **están duplicados** con otros compradores. El comprador más antiguo mantiene el número, los más recientes reciben nuevos números del pool disponible.

### ¿Los números nuevos son aleatorios?
Sí, se toman aleatoriamente del pool de 2,108 números disponibles.

### ¿Qué pasa si un comprador se queja?
Podés explicarle que había un error técnico que duplicó números entre diferentes personas. Se corrigió dando prioridad a quien compró primero (first-come, first-served). Todos los números nuevos tienen las mismas chances de ganar.

### ¿Esto afecta al sorteo?
No. El sorteo se realiza de forma aleatoria, así que cambiar números no afecta las probabilidades de nadie.

---

## 📞 Soporte

Si tenés problemas durante la ejecución:

1. **Error de timeout:** El script está optimizado, pero si falla, volvé a ejecutarlo
2. **Error de variables de entorno:** Verificá que `.env.local` tenga las credenciales correctas
3. **Dudas técnicas:** Revisá los logs del script, son detallados

---

## ✅ Checklist Final

Antes de considerar el proceso completo:

- [ ] Ejecuté el dry-run y revisé el output
- [ ] Revisé el reporte CSV completo
- [ ] Ejecuté la corrección REAL con `execute`
- [ ] Verifiqué que no quedan duplicados (SQL query)
- [ ] Generé el reporte final con los cambios aplicados
- [ ] Contacté a los 347 compradores afectados por email/Instagram
- [ ] Apliqué las funciones SQL de prevención en Supabase
- [ ] El código actualizado está deployado

---

**¡Éxito con la corrección!** 🎉
