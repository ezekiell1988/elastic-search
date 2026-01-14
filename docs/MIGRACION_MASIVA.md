# 🚀 Guía de Migración Masiva - Millones de Registros

## 📊 Estrategia para Datos Masivos

Esta guía explica cómo migrar **todos los datos** de ClickEat a Elasticsearch, incluyendo millones de registros.

---

## ⚙️ Características del Sistema de Migración

### ✅ Optimizaciones Implementadas

1. **Procesamiento por Lotes (Batches)**
   - SQL: 5,000 registros por consulta
   - Elasticsearch: 1,000 documentos por bulk insert
   - Pausa de 100ms entre batches

2. **Checkpoint y Recuperación**
   - Guarda progreso cada 10,000 registros
   - Puede reanudar migración interrumpida
   - Archivo: `.migration-checkpoint.json`

3. **Reintentos Automáticos**
   - 3 intentos por batch fallido
   - Delay incremental entre reintentos
   - Continúa con siguiente batch si falla

4. **Índices Optimizados**
   - Sin réplicas durante migración
   - Refresh interval deshabilitado
   - Force merge al finalizar

5. **Pool de Conexiones**
   - Máximo 10 conexiones simultáneas a SQL Server
   - Timeout extendido a 120 segundos
   - Reutilización de conexiones

6. **Relaciones Anidadas**
   - Clientes con sus direcciones
   - Órdenes con sus productos
   - Un solo documento por entidad

---

## 🎯 Comandos de Migración

### Migración Completa (Nueva)

```bash
# Migrar TODOS los datos (puede tomar horas)
npm run migrate:full
```

### Reanudar Migración Interrumpida

```bash
# Si la migración se interrumpió, reanudar desde checkpoint
npm run migrate:resume
```

### Migración Rápida (Limitada)

```bash
# Solo TOP 1000 clientes y 5000 órdenes
npm run migrate:simple
```

---

## 📈 Configuración Ajustable

Edita `src/scripts/migrate-full.js` para ajustar:

```javascript
const MIGRATION_CONFIG = {
  batchSize: 1000,           // ⬆️ Aumentar si tienes buena red
  sqlBatchSize: 5000,        // ⬆️ Aumentar para más velocidad
  maxRetries: 3,             // Reintentos por batch
  delayBetweenBatches: 100,  // ⬇️ Reducir para más velocidad
  checkpointInterval: 10000, // Frecuencia de guardado
  parallelBatches: 3         // Batches en paralelo (futuro)
};
```

### Recomendaciones según Tamaño

| Registros | batchSize | sqlBatchSize | Tiempo Estimado |
|-----------|-----------|--------------|-----------------|
| < 100K    | 1000      | 5000         | 5-15 min        |
| 100K-1M   | 2000      | 10000        | 30-90 min       |
| 1M-10M    | 1000      | 5000         | 2-6 horas       |
| > 10M     | 500       | 2500         | 6-24 horas      |

---

## 🔄 Flujo de Migración

```
┌─────────────────────────────────────┐
│ 1. Conectar a SQL Server y ES       │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│ 2. Crear índices optimizados        │
│    - Sin réplicas                   │
│    - Refresh deshabilitado          │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│ 3. Migrar CLIENTES                  │
│    ├─ Leer 5000 de SQL              │
│    ├─ Obtener direcciones           │
│    ├─ Insertar 1000 en ES           │
│    ├─ Guardar checkpoint            │
│    └─ Repetir hasta completar       │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│ 4. Migrar ÓRDENES                   │
│    ├─ Leer 5000 de SQL              │
│    ├─ Obtener productos             │
│    ├─ Insertar 1000 en ES           │
│    ├─ Guardar checkpoint            │
│    └─ Repetir hasta completar       │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│ 5. Migrar PRODUCTOS                 │
│    ├─ Leer 5000 de SQL              │
│    ├─ Insertar 1000 en ES           │
│    └─ Repetir hasta completar       │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│ 6. Optimizar índices                │
│    ├─ Habilitar refresh             │
│    ├─ Agregar réplicas              │
│    └─ Force merge                   │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│ 7. Limpiar checkpoint               │
│    └─ Eliminar archivo temporal     │
└─────────────────────────────────────┘
```

---

## 📊 Monitoreo Durante Migración

### En la Terminal

Verás progreso en tiempo real:

```
👥 Migrando TODOS los clientes...
   Total a migrar: 1,234,567 clientes
   Progreso: 5,000/1,234,567 (0.40%)
   Progreso: 10,000/1,234,567 (0.81%)
   Progreso: 15,000/1,234,567 (1.21%)
   ...
✅ Clientes migrados: 1,234,567 (Errores: 12)

🧾 Migrando TODAS las órdenes...
   Total a migrar: 5,678,901 órdenes
   Progreso: 5,000/5,678,901 (0.09%)
   ...
```

### Checkpoint File

El archivo `.migration-checkpoint.json` guarda:

```json
{
  "step": "ordenes",
  "offset": 150000,
  "migratedCount": 150000,
  "errorCount": 23,
  "timestamp": "2026-01-13T12:34:56.789Z"
}
```

---

## 🛠️ Solución de Problemas

### Migración Lenta

**Problema:** Toma demasiado tiempo

**Soluciones:**
```javascript
// 1. Aumentar tamaño de batches
batchSize: 2000,
sqlBatchSize: 10000,

// 2. Reducir delay
delayBetweenBatches: 50,

// 3. Aumentar timeout
requestTimeout: 180000,

// 4. Ejecutar en horario de menor carga
```

### Memoria Insuficiente

**Problema:** Error "Out of memory"

**Soluciones:**
```javascript
// 1. Reducir tamaño de batches
batchSize: 500,
sqlBatchSize: 2000,

// 2. Aumentar memoria de Node.js
// package.json
"migrate:full": "node --max-old-space-size=4096 src/scripts/migrate-full.js"
```

### Conexión Perdida

**Problema:** Se pierde conexión durante migración

**Solución:**
```bash
# Simplemente reanudar
npm run migrate:resume

# El checkpoint guardará el progreso y continuará desde ahí
```

### Demasiados Errores

**Problema:** Muchos documentos fallan

**Diagnóstico:**
```bash
# Ver checkpoint
cat .migration-checkpoint.json

# Ver logs de Elasticsearch
# Buscar errores específicos
```

**Soluciones:**
- Verificar mappings de índices
- Verificar datos nulos o inválidos
- Aumentar reintentos: `maxRetries: 5`

---

## 💡 Mejores Prácticas

### Antes de Migrar

1. **Backup de Elasticsearch**
   ```bash
   # Si tienes datos importantes
   # Crear snapshot antes de eliminar índices
   ```

2. **Verificar Espacio en Disco**
   ```bash
   # SQL Server puede estar en otra máquina
   # Pero Elasticsearch necesita espacio local
   ```

3. **Probar con Datos Limitados**
   ```bash
   # Primero probar con migrate:simple
   npm run migrate:simple
   
   # Luego la migración completa
   npm run migrate:full
   ```

### Durante la Migración

1. **NO interrumpir manualmente**
   - Si necesitas detener, usa Ctrl+C una vez
   - Deja que guarde el checkpoint

2. **Monitorear recursos**
   ```bash
   # CPU, memoria, red
   top
   htop
   ```

3. **Verificar progreso del checkpoint**
   ```bash
   # Ver archivo en tiempo real
   watch cat .migration-checkpoint.json
   ```

### Después de Migrar

1. **Verificar conteos**
   ```bash
   # Ejecutar consultas de validación
   npm run query:clickeat
   ```

2. **Crear alias de índices**
   ```json
   POST /_aliases
   {
     "actions": [
       {
         "add": {
           "index": "clickeat_clientes",
           "alias": "clientes"
         }
       }
     ]
   }
   ```

3. **Configurar snapshot policy**
   - Backups automáticos diarios
   - Retención según necesidades

---

## 📅 Migración Incremental

Para mantener sincronizado con cambios en SQL Server:

### Opción 1: Re-migración Completa

```bash
# Cada semana/mes ejecutar migración completa
npm run migrate:full
```

### Opción 2: Migración de Cambios Recientes

Modifica el script para migrar solo registros nuevos:

```javascript
// En lugar de:
ORDER BY Id_cliente

// Usar:
WHERE FechaCreacion >= '2026-01-01'
ORDER BY Id_cliente
```

### Opción 3: Change Data Capture (CDC)

Implementar sistema que detecte cambios:
- SQL Server Change Tracking
- Triggers en tablas
- Polling periódico

---

## 🎯 Casos de Uso Específicos

### Solo Clientes Activos

```javascript
// En migrateClientesFull(), cambiar query:
WHERE Estado = 1
ORDER BY Id_cliente
```

### Solo Órdenes del Último Año

```javascript
// En migrateOrdenesFull(), agregar filtro:
WHERE f.Fecha_facturado >= DATEADD(YEAR, -1, GETDATE())
```

### Productos de una Compañía

```javascript
// En migrateProductosFull(), filtrar:
WHERE Id_compania = 1
```

---

## 📊 Estimación de Tiempos

Basado en configuración por defecto:

| Tabla | Registros | Tiempo Estimado |
|-------|-----------|-----------------|
| Clientes | 100,000 | ~15 minutos |
| Clientes | 1,000,000 | ~2.5 horas |
| Órdenes | 500,000 | ~1 hora |
| Órdenes | 5,000,000 | ~8 horas |
| Productos | 50,000 | ~10 minutos |

**Total para BD grande (5M órdenes):** ~10-12 horas

---

## 🔍 Verificación Post-Migración

### Script de Validación

```bash
# Contar registros migrados
npm run query:clickeat

# O crear script específico
node src/scripts/validate-migration.js
```

### Consultas SQL vs Elasticsearch

```sql
-- SQL Server
SELECT COUNT(*) FROM tbClientes;
SELECT COUNT(*) FROM tbFactura;
SELECT COUNT(*) FROM tbCatalogo;
```

```json
// Elasticsearch
GET /clickeat_clientes/_count
GET /clickeat_ordenes/_count
GET /clickeat_productos/_count
```

---

## 🚨 Plan de Contingencia

### Si la Migración Falla

1. **Revisar checkpoint**
   ```bash
   cat .migration-checkpoint.json
   ```

2. **Reanudar desde checkpoint**
   ```bash
   npm run migrate:resume
   ```

3. **Si persiste el error:**
   - Reducir tamaño de batches
   - Aumentar timeouts
   - Revisar logs de ES

4. **Última opción:**
   ```bash
   # Eliminar checkpoint y empezar de nuevo
   rm .migration-checkpoint.json
   npm run migrate:full
   ```

---

## 📞 Checklist Pre-Migración

- [ ] Verificar credenciales de SQL Server en `.env`
- [ ] Verificar credenciales de Elasticsearch en `.env`
- [ ] Probar conexión a ambos sistemas
- [ ] Estimar espacio necesario en Elasticsearch
- [ ] Decidir configuración de batches
- [ ] Programar en horario de baja carga
- [ ] Tener plan de rollback
- [ ] Notificar al equipo sobre migración
- [ ] Preparar monitoreo de recursos
- [ ] Backup de datos actuales en ES (si existen)

---

## ✨ Resumen de Comandos

```bash
# Migración completa de TODOS los datos
npm run migrate:full

# Reanudar si se interrumpió
npm run migrate:resume

# Migración rápida (limitada)
npm run migrate:simple

# Consultar datos migrados
npm run query:clickeat

# Ejecutar scripts SQL
npm run sql get-schema.sql

# Ver checkpoint actual
cat .migration-checkpoint.json

# Limpiar checkpoint manualmente
rm .migration-checkpoint.json
```

---

**¡Listo para migrar millones de registros! 🚀**
