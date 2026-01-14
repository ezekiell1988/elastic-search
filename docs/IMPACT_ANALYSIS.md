# 📊 ANÁLISIS DE IMPACTO DE MIGRACIÓN A ELASTICSEARCH
## Base de Datos ClickEat (Producción)

Fecha: 13 de enero de 2026

---

## 🔢 VOLUMEN DE DATOS

| Entidad | Registros | Batches SQL | Tiempo Estimado |
|---------|-----------|-------------|-----------------|
| **Clientes** | 773,700 | 155 batches | ~5 minutos |
| **Órdenes (Pagadas)** | 879,962 | 176 batches | ~9 minutos |
| **Productos** | 2,427 | 1 batch | ~1 segundo |
| **TOTAL** | 1,656,089 | 332 batches | **~14 minutos** |

---

## ⚡ CONFIGURACIÓN DE MIGRACIÓN

```javascript
{
  batchSize: 1000,           // Docs por batch a Elasticsearch
  sqlBatchSize: 5000,        // Registros por consulta SQL
  maxRetries: 3,             // Reintentos automáticos
  delayBetweenBatches: 100,  // 100ms espera entre batches
  parallelBatches: 3         // 3 batches simultáneos a ES
}
```

---

## 📉 IMPACTO EN BASE DE DATOS DE PRODUCCIÓN

### ✅ BAJO IMPACTO - Operaciones de Solo Lectura

#### 1️⃣ **Tipo de Consultas**
```sql
-- Solo SELECT con paginación
SELECT columnas...
FROM tabla
WHERE condiciones
ORDER BY id
OFFSET N ROWS FETCH NEXT 5000 ROWS ONLY
```

- ✅ **No escribe** en la base de datos
- ✅ **No bloquea** tablas
- ✅ **No modifica** datos
- ✅ **No afecta** transacciones de usuarios

#### 2️⃣ **Carga en SQL Server**

| Aspecto | Impacto | Detalle |
|---------|---------|---------|
| **CPU** | 🟢 Bajo (5-10%) | Queries simples con índices |
| **Memoria** | 🟢 Bajo | 5,000 registros en RAM por batch |
| **Disco I/O** | 🟡 Medio | ~332 lecturas secuenciales |
| **Conexiones** | 🟢 Bajo | 1 conexión permanente (pool) |
| **Locks** | 🟢 Ninguno | Solo shared locks en lectura |
| **Transacciones Usuarias** | 🟢 No afectadas | Sin bloqueos |

#### 3️⃣ **Patrón de Acceso**

```
Clientes: 155 queries × 5,000 registros = 773,700 registros
├─ Query cada ~2 segundos
├─ Lectura secuencial por Id_cliente (índice PK)
└─ Sin joins pesados

Órdenes: 176 queries × 5,000 registros = 879,962 registros
├─ Query cada ~3 segundos
├─ Lectura secuencial por Id_factura (índice PK)
├─ JOIN con tbFacturaDetalle (productos)
└─ Filtro: Pagado = 1 (índice existente)

Productos: 1 query × 2,427 registros
└─ Lectura completa (tabla pequeña)
```

---

## ⏱️ DURACIÓN ESTIMADA

| Fase | Tiempo | Operación |
|------|--------|-----------|
| **Crear índices ES** | ~5 seg | 3 índices (clientes, órdenes, productos) |
| **Migrar Clientes** | ~5 min | 773,700 registros |
| **Migrar Órdenes** | ~9 min | 879,962 registros + productos |
| **Migrar Productos** | ~1 seg | 2,427 registros |
| **Optimizar ES** | ~5 seg | Refresh + replicas |
| **TOTAL** | **~14-15 minutos** | Estimado conservador |

---

## 🛡️ MEDIDAS DE PROTECCIÓN IMPLEMENTADAS

### 1. **Checkpoint System**
```javascript
// Archivo: .migration-checkpoint.json
{
  "lastClienteId": 500000,
  "lastOrdenId": 450000,
  "timestamp": "2026-01-13T10:30:00Z"
}
```
- ✅ Guarda progreso cada 10,000 registros
- ✅ Puede reanudar si se interrumpe
- ✅ No repite datos migrados

### 2. **Connection Pool**
```javascript
pool: {
  max: 10,              // Máximo 10 conexiones
  min: 0,               // Mínimo 0 (cierra si no usa)
  idleTimeoutMillis: 30000  // Cierra conexiones inactivas
}
```

### 3. **Timeouts Configurados**
```javascript
options: {
  connectTimeout: 30000,    // 30s para conectar
  requestTimeout: 120000    // 2 minutos por query
}
```

### 4. **Retry Logic**
- Reintentos automáticos (hasta 3 intentos)
- Delay incremental entre reintentos
- Log de errores sin detener migración

---

## 🎯 RECOMENDACIONES PARA PRODUCCIÓN

### ⚠️ HORARIO ÓPTIMO
```
🌙 Fuera de horas pico (ej: 2:00 AM - 6:00 AM)
📅 Día de menor carga (ej: Domingo/Lunes madrugada)
```

### 🔧 AJUSTES OPCIONALES PARA REDUCIR IMPACTO AÚN MÁS

#### Opción 1: Reducir velocidad (Más lento = Menos impacto)
```javascript
const MIGRATION_CONFIG = {
  sqlBatchSize: 2000,        // ⬇️ De 5000 a 2000
  delayBetweenBatches: 500,  // ⬆️ De 100ms a 500ms
};
// Duración: ~30-40 minutos (pero impacto casi imperceptible)
```

#### Opción 2: Migración incremental por bloques
```bash
# Día 1: Solo clientes (5 minutos)
npm run migrate:clientes

# Día 2: Solo órdenes (9 minutos)
npm run migrate:ordenes

# Día 3: Solo productos (1 segundo)
npm run migrate:productos
```

#### Opción 3: Limitar por fecha
```sql
-- Solo últimos 2 años de órdenes
WHERE Fecha_facturado >= DATEADD(YEAR, -2, GETDATE())
  AND Pagado = 1
```

---

## 📊 MONITOREO DURANTE MIGRACIÓN

### SQL Server
```sql
-- Monitorear queries activas
SELECT 
  session_id,
  status,
  command,
  cpu_time,
  total_elapsed_time,
  reads,
  writes
FROM sys.dm_exec_requests
WHERE session_id > 50;

-- Ver conexiones activas
SELECT 
  COUNT(*) AS conexiones,
  program_name
FROM sys.dm_exec_sessions
WHERE program_name LIKE '%node%'
GROUP BY program_name;
```

### Durante la Migración
```bash
# Terminal 1: Ejecutar migración
npm run migrate:full

# Terminal 2: Ver progreso en tiempo real
tail -f .migration-checkpoint.json

# Terminal 3: Monitorear SQL Server (si tienes acceso)
# Ejecutar queries de monitoreo arriba
```

---

## ✅ LISTA DE VERIFICACIÓN PRE-MIGRACIÓN

- [ ] **Backup de ES**: Confirmar que puedes eliminar índices si algo falla
- [ ] **Horario**: Programar en ventana de bajo tráfico
- [ ] **Conexión estable**: Red confiable (no WiFi pública)
- [ ] **Elasticsearch**: Confirmar espacio disponible (~2-3 GB estimado)
- [ ] **SQL Server**: Confirmar que no hay mantenimiento programado
- [ ] **Checkpoint**: Eliminar `.migration-checkpoint.json` si existe
- [ ] **Monitoreo**: Tener acceso para monitorear SQL Server (opcional)
- [ ] **Plan B**: Saber cómo detener la migración (Ctrl+C) y reanudar

---

## 🚨 QUÉ HACER SI HAY PROBLEMAS

### Si la migración es lenta
```bash
# Ctrl+C para detener
# Ajustar configuración para ser más lento
# Reanudar: npm run migrate:full (continúa desde checkpoint)
```

### Si SQL Server se satura
```bash
# Ctrl+C para detener
# Esperar a horario de menor carga
# Reanudar más tarde
```

### Si Elasticsearch falla
```bash
# La migración reintenta automáticamente
# Si persiste: revisar logs y conexión a ES
# Checkpoint permite reanudar sin perder progreso
```

---

## 💡 CONCLUSIÓN

### Impacto Esperado: **BAJO** 🟢

- ✅ Solo lectura (no modifica BD)
- ✅ Queries simples con índices
- ✅ Duración corta (~14 minutos)
- ✅ No bloquea usuarios
- ✅ Puede ejecutarse en producción con monitoreo
- ✅ Sistema de checkpoint para reanudar

### Momento Ideal:
```
🌙 Madrugada (2:00 AM - 6:00 AM)
📉 Día de menor tráfico
⏱️ ~15 minutos de ventana
```

### Riesgo: **MÍNIMO**
La migración es **segura** para ejecutar en producción con las configuraciones actuales.

---

## 📞 CONTACTO Y SOPORTE

Si durante la migración necesitas:
- Detener: `Ctrl+C` (guarda checkpoint automático)
- Reanudar: `npm run migrate:full`
- Limpiar y reiniciar: `rm .migration-checkpoint.json && npm run migrate:full`
