# 📊 Estrategia de Migración Masiva - Resumen Ejecutivo

## 🎯 Sistema Implementado

He creado un **sistema profesional de migración masiva** que puede manejar **millones de registros** con las siguientes características:

### ✅ Características Principales

1. **Procesamiento por Lotes**
   - SQL: 5,000 registros por consulta
   - Elasticsearch: 1,000 documentos por bulk insert
   - Optimizado para evitar timeouts

2. **Sistema de Checkpoint**
   - Guarda progreso cada 10,000 registros
   - Puede reanudar en caso de interrupción
   - No pierdes progreso si algo falla

3. **Reintentos Automáticos**
   - 3 intentos por batch fallido
   - Continúa con el siguiente si persiste el error
   - Log de errores para análisis

4. **Relaciones Anidadas**
   - Clientes incluyen sus direcciones
   - Órdenes incluyen sus productos
   - Todo en un solo documento

5. **Optimización de Performance**
   - Índices sin réplicas durante migración
   - Refresh deshabilitado temporalmente
   - Force merge al finalizar
   - Pool de conexiones optimizado

---

## 🚀 Comandos Principales

```bash
# 1. MIGRACIÓN COMPLETA (Todos los datos)
npm run migrate:full

# 2. REANUDAR si se interrumpió
npm run migrate:resume

# 3. VALIDAR después de migrar
npm run migrate:validate

# 4. CONSULTAR datos migrados
npm run query:clickeat
```

---

## 📊 Escenarios de Uso

### Escenario 1: Base de Datos Pequeña (< 100K registros)

```bash
# Usar migración simple
npm run migrate:simple

# Tiempo estimado: 5-15 minutos
```

### Escenario 2: Base de Datos Mediana (100K - 1M registros)

```bash
# Usar migración completa
npm run migrate:full

# Tiempo estimado: 30 minutos - 2 horas
```

### Escenario 3: Base de Datos Grande (> 1M registros)

```bash
# 1. Ajustar configuración en migrate-full.js
batchSize: 2000,
sqlBatchSize: 10000,

# 2. Ejecutar en horario de baja carga
npm run migrate:full

# 3. Si se interrumpe, reanudar
npm run migrate:resume

# 4. Validar al finalizar
npm run migrate:validate

# Tiempo estimado: 2-12 horas dependiendo de tamaño
```

---

## 🔄 Flujo Completo Recomendado

```bash
# PASO 1: Verificar conexiones
npm run sql test-columns.sql

# PASO 2: Probar con datos limitados (opcional)
npm run migrate:simple

# PASO 3: Migración completa
npm run migrate:full

# PASO 4: Validar migración
npm run migrate:validate

# PASO 5: Consultar datos
npm run query:clickeat
```

---

## ⚙️ Ajustes de Performance

### Para Mejorar Velocidad

Edita `src/scripts/migrate-full.js`:

```javascript
const MIGRATION_CONFIG = {
  batchSize: 2000,        // ⬆️ Aumentar a 2000
  sqlBatchSize: 10000,    // ⬆️ Aumentar a 10000
  delayBetweenBatches: 50,// ⬇️ Reducir a 50ms
  maxRetries: 3,
  checkpointInterval: 10000,
  parallelBatches: 3
};
```

### Para Mayor Estabilidad

```javascript
const MIGRATION_CONFIG = {
  batchSize: 500,         // ⬇️ Reducir a 500
  sqlBatchSize: 2000,     // ⬇️ Reducir a 2000
  delayBetweenBatches: 200,// ⬆️ Aumentar a 200ms
  maxRetries: 5,          // ⬆️ Más reintentos
  checkpointInterval: 5000,
  parallelBatches: 1
};
```

---

## 📈 Estimación de Tiempos

| Registros Totales | Configuración | Tiempo Estimado |
|-------------------|---------------|-----------------|
| 100,000 | Default | 15 min |
| 500,000 | Default | 1 hora |
| 1,000,000 | Default | 2.5 horas |
| 5,000,000 | Default | 10-12 horas |
| 10,000,000 | Optimizada | 15-20 horas |

**Nota:** Tiempos aproximados, dependen de:
- Velocidad de red
- Recursos del servidor SQL
- Performance de Elasticsearch
- Cantidad de relaciones (direcciones, productos)

---

## 🛡️ Sistema de Recuperación

### Si la Migración se Interrumpe

El sistema automáticamente guarda el progreso en `.migration-checkpoint.json`:

```json
{
  "step": "ordenes",
  "offset": 150000,
  "migratedCount": 150000,
  "errorCount": 23,
  "timestamp": "2026-01-13T12:34:56.789Z"
}
```

**Para reanudar:**
```bash
npm run migrate:resume
```

Continuará desde el último checkpoint sin re-migrar datos existentes.

---

## 📊 Monitoreo en Tiempo Real

Durante la migración verás:

```
╔════════════════════════════════════════════╗
║  MIGRACIÓN COMPLETA - TODOS LOS DATOS      ║
║  ClickEat → Elasticsearch                  ║
╚════════════════════════════════════════════╝

⚙️  Configuración:
   Batch SQL: 5,000 registros
   Batch ES: 1,000 documentos
   Reintentos: 3
   Checkpoint: cada 10,000 registros

👥 Migrando TODOS los clientes...
   Total a migrar: 1,234,567 clientes
   Progreso: 10,000/1,234,567 (0.81%)
   Progreso: 20,000/1,234,567 (1.62%)
   ...
✅ Clientes migrados: 1,234,567 (Errores: 12)

🧾 Migrando TODAS las órdenes...
   Total a migrar: 5,678,901 órdenes
   Progreso: 10,000/5,678,901 (0.18%)
   ...
```

---

## ✅ Validación Post-Migración

Después de migrar, ejecuta:

```bash
npm run migrate:validate
```

**Output esperado:**
```
╔════════════════════════════════════════════╗
║  VALIDACIÓN DE MIGRACIÓN                   ║
╚════════════════════════════════════════════╝

👥 CLIENTES:
   SQL Server: 1,234,567
   Elasticsearch: 1,234,567
   ✅ Coinciden perfectamente

🧾 ÓRDENES:
   SQL Server: 5,678,901
   Elasticsearch: 5,678,901
   ✅ Coinciden perfectamente

📦 PRODUCTOS:
   SQL Server: 45,678
   Elasticsearch: 45,678
   ✅ Coinciden perfectamente

✅ Migración 100% exitosa
✅ Todos los registros coinciden
✅ Integridad de datos verificada
✅ Estadísticas validadas
```

---

## 🎯 Estructura de Datos Migrada

### Cliente con Direcciones
```json
{
  "id_cliente": 3016,
  "nombre": "Juan Pérez",
  "correo": "juan@example.com",
  "telefono": "+50688888888",
  "estado": 1,
  "puntos": 150,
  "direcciones": [
    {
      "id_direccion": 14657,
      "nombre_contacto": "Juan Pérez",
      "direccion": "San José, Centro, 100m norte del parque",
      "provincia": "San José",
      "canton": "San José",
      "distrito": "Carmen"
    }
  ]
}
```

### Orden con Productos
```json
{
  "id_factura": 8516563,
  "id_cliente": 3016,
  "nombre_cliente": "Juan Pérez",
  "fecha_facturado": "2026-01-12",
  "monto_total": 3180.50,
  "estado_factura": 5,
  "pagado": true,
  "productos": [
    {
      "id_producto": 473,
      "nombre_producto": "Coca Cola 355 ML",
      "cantidad": 1,
      "precio": 750,
      "monto_total": 750
    },
    {
      "id_producto": 125,
      "nombre_producto": "Pizza Margherita",
      "cantidad": 1,
      "precio": 2430.50,
      "monto_total": 2430.50
    }
  ]
}
```

---

## 💡 Mejores Prácticas

### ✅ HACER

1. **Probar primero con datos limitados**
   ```bash
   npm run migrate:simple
   ```

2. **Ejecutar en horario de baja carga**
   - Madrugada o fines de semana
   - Menos impacto en usuarios

3. **Monitorear recursos**
   - CPU, memoria, red
   - Disk I/O en ambos servidores

4. **Validar después de migrar**
   ```bash
   npm run migrate:validate
   ```

5. **Guardar logs**
   ```bash
   npm run migrate:full > migration.log 2>&1
   ```

### ❌ NO HACER

1. **No interrumpir manualmente** sin necesidad
2. **No ejecutar múltiples migraciones** simultáneas
3. **No modificar checkpoint** manualmente
4. **No omitir validación** post-migración

---

## 📞 Comandos Rápidos de Referencia

```bash
# Migración completa
npm run migrate:full

# Reanudar
npm run migrate:resume

# Validar
npm run migrate:validate

# Ver progreso (en otra terminal)
watch cat .migration-checkpoint.json

# Limpiar checkpoint
rm .migration-checkpoint.json

# Consultar datos
npm run query:clickeat

# Ver schema SQL
npm run sql get-schema.sql
```

---

## 🎉 Resultado Final

Después de ejecutar `npm run migrate:full` tendrás:

✅ **3 índices en Elasticsearch:**
- `clickeat_clientes` (con direcciones)
- `clickeat_ordenes` (con productos)
- `clickeat_productos`

✅ **Datos completos migrados:**
- Todos los clientes
- Todas las órdenes
- Todos los productos
- Todas las relaciones preservadas

✅ **Performance optimizado:**
- Búsquedas en milisegundos
- Agregaciones rápidas
- Queries complejas eficientes

✅ **Sistema de consultas:**
- API REST disponible
- Scripts de ejemplo
- Validación integrada

---

**¡Sistema listo para producción! 🚀**

Para más detalles, consulta:
- [MIGRACION_MASIVA.md](MIGRACION_MASIVA.md) - Guía técnica detallada
- [GUIA_RAPIDA.md](GUIA_RAPIDA.md) - Guía de inicio rápido
- [MAPEO_COLUMNAS.md](MAPEO_COLUMNAS.md) - Referencia de campos
