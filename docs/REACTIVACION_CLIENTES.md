# 🎯 Sistema de Reactivación de Clientes

## 📋 Resumen

Este documento describe cómo usar el sistema completo para analizar clientes inactivos y ejecutar campañas de reactivación basadas en datos de Elasticsearch.

## 🚀 Flujo Completo

### 1️⃣ Preparar Base de Datos

```bash
# Ver esquema de las tablas
npm run sql sql-queries/get-schema.sql

# Ver datos de ejemplo
npm run sql sql-queries/get-sample-data.sql
```

### 2️⃣ Migrar Datos a Elasticsearch

**Opción A: Migración Rápida (Pruebas)**
```bash
# Migra 1,000 clientes y 5,000 órdenes
npm run migrate:simple
```

**Opción B: Migración Completa (Producción)**
```bash
# Migra TODOS los registros con sistema de checkpoints
npm run migrate:full

# Si se interrumpe, reanudar desde el último checkpoint
npm run migrate:resume
```

### 3️⃣ Validar Migración

```bash
# Verifica que los datos coincidan entre SQL Server y Elasticsearch
npm run migrate:validate
```

Salida esperada:
```
╔════════════════════════════════════════════╗
║  VALIDACIÓN DE MIGRACIÓN                   ║
║  ClickEat Database → Elasticsearch         ║
╚════════════════════════════════════════════╝

📊 CONTEO DE REGISTROS:

👥 CLIENTES:
   SQL Server: 773,700
   Elasticsearch: 773,700
   ✅ Coinciden perfectamente

📦 ÓRDENES:
   SQL Server: 1,069,417
   Elasticsearch: 1,069,417
   ✅ Coinciden perfectamente
```

### 4️⃣ Análisis de Reactivación

```bash
# Ejecutar análisis completo de clientes
npm run query:reactivation
```

## 📊 Consultas Disponibles

### 1. Última Compra por Cliente (Top 10)

Muestra los 10 clientes con compras más recientes y sus días de inactividad.

**Output:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Cliente ID │ Nombre               │ Última Compra    │ Días │ Órdenes │ Total  │
├─────────────────────────────────────────────────────────────────────────────┤
│ 12345      │ Juan Pérez           │ 15/12/2024       │   15 │     45  │ ₡89500 │
│ 67890      │ María González       │ 10/12/2024       │   20 │     32  │ ₡65200 │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Código de colores:**
- 🟢 Verde: 0-30 días (cliente activo)
- 🟡 Amarillo: 31-90 días (en riesgo)
- 🔴 Rojo: +90 días (inactivo)

### 2. Clientes Inactivos

Lista clientes que no han comprado en más de X días (por defecto 30).

**Output:**
```
⚠️  2. CLIENTES INACTIVOS (Más de 30 días)

Total de clientes inactivos: 15,234

┌──────────────────────────────────────────────────────────────────────────────────┐
│ ID      │ Nombre               │ Última Compra    │ Días │ Órdenes │ Gasto Total │
├──────────────────────────────────────────────────────────────────────────────────┤
│ 98765   │ Carlos Ramírez       │ 15/08/2024       │  137 │     28  │ ₡520000    │
│ 54321   │ Ana López            │ 20/09/2024       │  101 │     15  │ ₡380000    │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 3. Segmentación por Nivel de Actividad

Divide los clientes en 4 segmentos:

- 🟢 **Activos (0-30 días)**: Clientes recientes
- 🟡 **En Riesgo (30-90 días)**: Necesitan retención
- 🔴 **Inactivos (90-180 días)**: Necesitan reactivación
- ⚫ **Perdidos (+180 días)**: Necesitan reconquista

**Output:**
```
┌────────────────────────────────────────────────────────────┐
│ Segmento              │ Clientes │ Total Ventas (30d)    │
├────────────────────────────────────────────────────────────┤
│ 🟢 Activos (0-30d)     │   45,230 │ ₡125,450,000         │
│ 🟡 En Riesgo (30-90d)  │   12,456 │ ₡18,230,000          │
│ 🔴 Inactivos (90-180d) │    8,934 │ N/A                   │
│ ⚫ Perdidos (+180d)     │   15,678 │ N/A                   │
└────────────────────────────────────────────────────────────┘

💡 RECOMENDACIONES:

   • Campaña de retención: 12,456 clientes en riesgo
     Descuentos del 15-20% en próxima compra

   • Campaña de reactivación: 8,934 clientes inactivos
     Cupones especiales + recordatorio de productos favoritos

   • Campaña de reconquista: 15,678 clientes perdidos
     Encuesta de satisfacción + incentivo fuerte (30-40% descuento)
```

### 4. Top Clientes por Valor

Identifica los clientes más valiosos y su estado de actividad.

**Output:**
```
💰 4. TOP 20 CLIENTES POR VALOR (Con estado de actividad)

┌───────────────────────────────────────────────────────────────────────────────────────┐
│ ID    │ Nombre          │ Total Gastado │ Órdenes │ Ticket Avg │ Últ.Compra │ Días │
├───────────────────────────────────────────────────────────────────────────────────────┤
│  1.12345 │ Juan Pérez      │ ₡1,250,000   │     125 │ ₡10,000   │ 15/12/2024 │   15 │
│  2.67890 │ María González  │ ₡980,500     │      89 │ ₡11,018   │ 10/11/2024 │   50 │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

### 5. Clientes VIP en Riesgo 🚨

**ALERTA CRÍTICA**: Clientes de alto valor (>₡500,000) que llevan más de 45 días sin comprar.

**Output:**
```
🚨 5. CLIENTES VIP EN RIESGO (Alto valor + Inactivos)

Total de VIPs en riesgo: 23

┌─────────────────────────────────────────────────────────────────────────────────┐
│ ID      │ Nombre               │ Total Gastado │ Órdenes │ Días sin comprar │
├─────────────────────────────────────────────────────────────────────────────────┤
│ 45678   │ Roberto Vargas       │ ₡2,340,000   │     156 │               67 │
│ 23456   │ Laura Hernández      │ ₡1,890,500   │     102 │               89 │
└─────────────────────────────────────────────────────────────────────────────────┘

🎯 ACCIÓN INMEDIATA:
   • Contacto personalizado por gerente de cuenta
   • Descuento VIP exclusivo del 30%
   • Regalo especial en próxima compra
```

## 🎯 Estrategias de Reactivación

### Para Clientes en Riesgo (30-90 días)
```
📧 Email: "Te extrañamos, [Nombre]"
💰 Oferta: 15-20% de descuento
⏰ Urgencia: Válido por 7 días
```

### Para Clientes Inactivos (90-180 días)
```
📧 Email: "¡Vuelve y recibe un regalo!"
💰 Oferta: 25% descuento + envío gratis
🎁 Bonus: Producto favorito con descuento adicional
⏰ Urgencia: Válido por 5 días
```

### Para Clientes Perdidos (+180 días)
```
📧 Email: "¿Qué pasó? Queremos mejorar"
📋 Encuesta: Formulario de satisfacción
💰 Oferta: 30-40% descuento en todo
🎁 Regalo: Producto gratis en compra mínima
⏰ Urgencia: Oferta única por 3 días
```

### Para VIPs en Riesgo
```
📞 Llamada: Contacto personal del gerente
💰 Oferta: Descuento VIP exclusivo 30%
🎁 Regalo: Producto premium gratis
🌟 Beneficio: Acceso anticipado a nuevos productos
```

## 📈 Métricas de Éxito

### KPIs a Monitorear

1. **Tasa de Reactivación**
   ```
   (Clientes reactivados / Emails enviados) × 100
   ```

2. **Revenue Recuperado**
   ```
   Suma de compras de clientes reactivados
   ```

3. **Tiempo Promedio de Reactivación**
   ```
   Días desde email hasta primera compra
   ```

4. **ROI de Campaña**
   ```
   (Revenue generado - Costo campaña) / Costo campaña × 100
   ```

## 🔄 Automatización

### Crear Job Diario

**Linux/Mac:**
```bash
# Editar crontab
crontab -e

# Ejecutar todos los días a las 8:00 AM
0 8 * * * cd /ruta/proyecto && npm run query:reactivation > logs/reactivation-$(date +\%Y\%m\%d).log 2>&1
```

**Windows (Task Scheduler):**
```powershell
# Crear tarea programada
schtasks /create /tn "ClienteReactivacion" /tr "npm run query:reactivation" /sc daily /st 08:00
```

## 💻 Integración con CRM

### Exportar Clientes Inactivos

Puedes modificar el script para exportar a CSV:

```javascript
import fs from 'fs';

// Después de obtener clientes inactivos
const csvData = clientesInactivos.map(c => ({
  id: c.key,
  nombre: c.info.hits.hits[0]._source.nombre_cliente,
  email: c.info.hits.hits[0]._source.correo,
  dias_inactivo: daysBetween(new Date(), new Date(c.ultima_compra.value)),
  total_gastado: c.total_historico.value
}));

fs.writeFileSync('clientes-inactivos.csv', 
  'ID,Nombre,Email,Días Inactivo,Total Gastado\n' +
  csvData.map(c => `${c.id},"${c.nombre}",${c.email},${c.dias_inactivo},${c.total_gastado}`).join('\n')
);
```

## 🛠️ Troubleshooting

### Error: "No se encontraron índices"
```bash
# Verificar si existen los índices
curl -X GET "https://tu-elasticsearch/clickeat_*"

# Si no existen, ejecutar migración
npm run migrate:simple
```

### Error: "Connection timeout"
```bash
# Verificar conexión a Elasticsearch
node -e "import('./src/config/elasticsearch.js').then(m => m.default.ping())"

# Verificar conexión a SQL Server
node -e "import('mssql').then(m => m.default.connect(process.env.SQL_CONNECTION_STRING))"
```

### Migración Lenta
```javascript
// Ajustar configuración en migrate-full.js
const MIGRATION_CONFIG = {
  sqlBatchSize: 10000,  // Aumentar de 5000 a 10000
  batchSize: 2000,      // Aumentar de 1000 a 2000
  checkpointInterval: 20000  // Aumentar de 10000 a 20000
};
```

## 📚 Referencias

- [Elasticsearch Aggregations](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations.html)
- [Query DSL](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl.html)
- [Best Practices para CRM](https://www.elastic.co/blog/crm-customer-analytics-elasticsearch)

## 🤝 Contribuir

Si encuentras mejoras o nuevas consultas útiles, documéntalas aquí para el equipo.

---

**Última actualización:** Diciembre 2024  
**Autor:** Equipo ClickEat  
**Versión:** 1.0.0
