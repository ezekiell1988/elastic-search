# 🔄 ESTRATEGIA DE CÁLCULO: DÍAS SIN COMPRA

## ❓ TUS PREGUNTAS

1. **¿Quién calcula los días sin compra?** → Elasticsearch en tiempo real
2. **¿Cómo se actualiza automáticamente cada día?** → Se calcula dinámicamente en cada consulta

---

## 📊 CÓMO FUNCIONA ACTUALMENTE

### ✅ Estrategia Actual: CÁLCULO DINÁMICO EN TIEMPO REAL

```
┌─────────────────────────────────────────────────────────────┐
│                    BASE DE DATOS                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │ tbFactura                                          │    │
│  │ ├─ Id_factura: 12345                              │    │
│  │ ├─ Id_cliente: 100                                │    │
│  │ ├─ Fecha_facturado: 2025-07-20 (FECHA FIJA)      │    │
│  │ ├─ MontoTotal: 15000                              │    │
│  │ └─ Pagado: 1                                      │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ Migración (copia tal cual)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    ELASTICSEARCH                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │ clickeat_ordenes_v2                               │    │
│  │ ├─ id_factura: 12345                              │    │
│  │ ├─ id_cliente: 100                                │    │
│  │ ├─ fecha_facturado: "2025-07-20" (FECHA FIJA)     │    │
│  │ ├─ monto_total: 15000                             │    │
│  │ └─ pagado: true                                   │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ Query con cálculo en tiempo real
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              ANÁLISIS DE REACTIVACIÓN                       │
│                                                             │
│  JavaScript calcula en cada ejecución:                     │
│                                                             │
│  const ahora = new Date();  // 2026-01-13                  │
│  const ultimaCompra = new Date("2025-07-20");              │
│  const dias = (ahora - ultimaCompra) / (1000*60*60*24);   │
│  // Resultado: 177 días SIN COMPRA                         │
│                                                             │
│  👉 Mañana (2026-01-14) automáticamente será: 178 días     │
│  👉 Pasado mañana (2026-01-15) será: 179 días             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 VENTAJAS DE LA ESTRATEGIA ACTUAL

### ✅ Cálculo en Tiempo Real (JavaScript)

| Aspecto | Beneficio |
|---------|-----------|
| **Actualización automática** | ✅ Los días se actualizan automáticamente cada vez que ejecutas el reporte |
| **Sin mantenimiento** | ✅ No necesitas un proceso diario para actualizar campos |
| **Datos precisos** | ✅ Siempre refleja la realidad al momento de consultar |
| **Simplicidad** | ✅ No hay jobs, triggers ni scripts adicionales |
| **Costos** | ✅ Sin procesamiento adicional en BD o ES |

### 📝 Código Actual

```javascript
// En query-customer-reactivation.js (línea 66-68)
function daysBetween(date1, date2) {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((date1 - date2) / oneDay));
}

// Ejemplo de uso (línea 124)
const ahora = new Date();  // HOY (se actualiza automáticamente)
const ultimaCompra = new Date(bucket.ultima_compra.value);
const diasInactivo = daysBetween(ahora, ultimaCompra);

console.log(`Cliente ${id} lleva ${diasInactivo} días sin comprar`);
// Resultado HOY (2026-01-13): "Cliente 100 lleva 177 días sin comprar"
// Resultado MAÑANA (2026-01-14): "Cliente 100 lleva 178 días sin comprar"
```

---

## 🔄 ALTERNATIVAS (SI LAS NECESITAS)

### Opción 2: Campo Calculado en Elasticsearch (Scripted Field)

```javascript
// Elasticsearch calcula en cada query usando Painless
{
  "script_fields": {
    "dias_sin_compra": {
      "script": {
        "source": "(new Date().getTime() - doc['fecha_facturado'].value.toInstant().toEpochMilli()) / (1000L * 60 * 60 * 24)"
      }
    }
  }
}
```

**Ventajas:**
- ✅ Cálculo dentro de ES
- ✅ Puede usarse en sorts y aggregations

**Desventajas:**
- ⚠️ Más complejo
- ⚠️ Performance: calcula en CADA documento (no solo agregaciones)

### Opción 3: Campo Materializado con Job Diario

```javascript
// Job diario que actualiza el campo
// Requiere: Node.js cron job o AWS Lambda programada

// Cada día a las 00:00 ejecuta:
await esClient.updateByQuery({
  index: 'clickeat_ordenes_v2',
  body: {
    script: {
      source: `
        long now = System.currentTimeMillis();
        long orderDate = doc['fecha_facturado'].value.toInstant().toEpochMilli();
        ctx._source.dias_sin_compra = (int)((now - orderDate) / (1000L * 60 * 60 * 24));
      `
    }
  }
});
```

**Ventajas:**
- ✅ Campo físico almacenado
- ✅ Queries más rápidas (no calcula en tiempo real)
- ✅ Puede indexarse para búsquedas

**Desventajas:**
- ❌ Requiere infraestructura adicional (cron/lambda)
- ❌ Actualiza TODOS los documentos diariamente (879,962 órdenes)
- ❌ Más complejo de mantener
- ❌ Costo de procesamiento diario

---

## 💡 RECOMENDACIÓN

### ✅ MANTENER ESTRATEGIA ACTUAL (Cálculo en Tiempo Real)

#### ¿Por qué?

1. **Es suficiente para tu caso de uso:**
   - Los reportes de reactivación se ejecutan bajo demanda (no cada segundo)
   - El cálculo de días es trivial (milisegundos)
   - Solo calculas para clientes agregados (no millones de documentos)

2. **Cero mantenimiento:**
   - No necesitas jobs programados
   - No necesitas actualizar datos
   - No hay punto de fallo adicional

3. **Siempre preciso:**
   - Cada vez que ejecutas `npm run query:reactivation` obtienes datos actualizados
   - No hay desfase temporal

4. **Escalable:**
   - El cálculo es en agregaciones (pocos clientes)
   - No en documentos individuales (879,962 órdenes)

#### Ejemplo de flujo de trabajo:

```bash
# Lunes 13 de enero, 2026 - 09:00 AM
$ npm run query:reactivation
✅ Cliente 12345 lleva 177 días sin comprar

# Martes 14 de enero, 2026 - 09:00 AM
$ npm run query:reactivation
✅ Cliente 12345 lleva 178 días sin comprar  # 👈 ACTUALIZADO AUTOMÁTICAMENTE

# Miércoles 15 de enero, 2026 - 09:00 AM
$ npm run query:reactivation
✅ Cliente 12345 lleva 179 días sin comprar  # 👈 ACTUALIZADO AUTOMÁTICAMENTE
```

---

## 🔧 SI NECESITAS CAMPO MATERIALIZADO (Futuro)

Si en el futuro necesitas el campo almacenado para:
- Búsquedas complejas por rango de días
- Dashboards en tiempo real
- APIs que necesiten responder en <100ms

Puedes implementar un job diario simple:

```javascript
// cron-update-days.js
import esClient from './config/elasticsearch.js';
import cron from 'node-cron';

// Cada día a las 00:00
cron.schedule('0 0 * * *', async () => {
  console.log('🔄 Actualizando días sin compra...');
  
  const now = new Date().getTime();
  
  await esClient.updateByQuery({
    index: 'clickeat_ordenes_v2',
    body: {
      script: {
        source: `
          ctx._source.dias_sin_compra = 
            (${now}L - ctx._source.fecha_facturado) / (1000L * 60 * 60 * 24);
        `
      }
    }
  });
  
  console.log('✅ Días actualizados');
});
```

---

## 📊 COMPARACIÓN DE ESTRATEGIAS

| Aspecto | Tiempo Real (Actual) | Scripted Field | Campo Materializado |
|---------|----------------------|----------------|---------------------|
| **Complejidad** | 🟢 Muy Simple | 🟡 Media | 🔴 Alta |
| **Mantenimiento** | 🟢 Cero | 🟢 Bajo | 🔴 Alto (job diario) |
| **Performance Query** | 🟢 Excelente | 🟡 Buena | 🟢 Excelente |
| **Actualización** | 🟢 Automática | 🟢 Automática | 🟡 Cada 24h |
| **Precisión** | 🟢 Exacta | 🟢 Exacta | 🟡 Desfase <24h |
| **Costo Procesamiento** | 🟢 Mínimo | 🟡 Medio | 🔴 Alto |
| **Infraestructura** | 🟢 Ninguna | 🟢 Ninguna | 🔴 Job/Lambda |
| **Recomendado para** | ✅ Reportes bajo demanda | ⚠️ Queries frecuentes | ⚠️ APIs tiempo real |

---

## ✅ CONCLUSIÓN

### Tu Sistema Actual es ÓPTIMO:

```
✅ Los días se calculan en JavaScript en tiempo real
✅ Se actualiza automáticamente cada vez que ejecutas el reporte
✅ No necesitas procesos adicionales
✅ Elasticsearch solo almacena la fecha_facturado (dato fijo)
✅ El campo "días sin compra" NO existe en ES, se calcula al vuelo
```

### Flujo completo:

1. **Migración**: Copia `fecha_facturado` de SQL → Elasticsearch (dato fijo)
2. **Consulta**: JavaScript lee `fecha_facturado` y calcula días vs HOY
3. **Resultado**: Siempre actualizado según la fecha actual
4. **Mañana**: Mismo proceso, automáticamente +1 día

**No hay nada que cambiar.** El sistema ya funciona correctamente. 🎉
