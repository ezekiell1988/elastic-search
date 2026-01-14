# 🏭 Guía de Producción

## 🎯 De Demo a Producción

Esta guía cubre los pasos para llevar el sistema de demo a un entorno de producción con 800k+ clientes.

## 📋 Checklist de Producción

### 1. Infraestructura

#### Elasticsearch
- ✅ **Ya configurado**: Elasticsearch Serverless Cloud
- ✅ **Ventajas**:
  - Escala automáticamente
  - Alta disponibilidad built-in
  - Backups automáticos
  - Seguridad incluida

#### API Server
- [ ] Deploy en servicio cloud (opciones):
  - **AWS**: ECS, Lambda, Elastic Beanstalk
  - **Azure**: App Service, Container Instances
  - **Google Cloud**: Cloud Run, App Engine
  - **Heroku/Render**: Para proyectos pequeños

#### Recomendación
```
Node.js API → AWS ECS/Fargate
- Auto-scaling
- Load balancing
- Health checks
- ~$50-100/mes
```

### 2. Seguridad

#### Variables de Entorno
```bash
# Producción
ELASTIC_SEARCH_ENDPOINT=<tu-endpoint>
ELASTIC_SEARCH_API_KEY=<api-key>
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://tu-dominio.com
API_KEY_SECRET=<genera-un-secret>
RATE_LIMIT_MAX=100
```

#### Agregar autenticación a la API

Crear `src/middleware/auth.js`:
```javascript
export function requireApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || apiKey !== process.env.API_KEY_SECRET) {
    return res.status(401).json({ error: 'API key inválida' });
  }
  
  next();
}
```

Aplicar en `src/routes/customerRoutes.js`:
```javascript
import { requireApiKey } from '../middleware/auth.js';

router.use(requireApiKey); // Proteger todas las rutas
```

#### Rate Limiting

```bash
npm install express-rate-limit
```

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // máximo 100 requests por ventana
});

app.use('/api/', limiter);
```

### 3. Optimización de Datos

#### Estrategia de Indexación

**Para 800k clientes:**

1. **Batch processing nocturno**
```javascript
// src/jobs/nightly-sync.js
import cron from 'node-cron';

// Ejecutar a las 2 AM diariamente
cron.schedule('0 2 * * *', async () => {
  console.log('🌙 Iniciando sincronización nocturna...');
  
  // 1. Extraer datos de DB principal
  const customers = await fetchCustomersFromDB();
  
  // 2. Calcular estadísticas
  const enrichedCustomers = await enrichCustomerData(customers);
  
  // 3. Actualizar Elasticsearch
  await bulkUpdateElasticsearch(enrichedCustomers);
  
  console.log('✅ Sincronización completada');
});
```

2. **Real-time updates** (opcional)
```javascript
// Usar CDC (Change Data Capture) con Debezium
// O webhooks desde tu sistema principal
```

#### Schema de Base de Datos Recomendado

```sql
-- Vista materializada para evitar JOINs pesados
CREATE MATERIALIZED VIEW customer_stats AS
SELECT 
  c.customer_id,
  c.company_id,
  c.phone,
  c.name,
  c.email,
  c.gender,
  c.city,
  MAX(i.invoice_date) as last_purchase_date,
  COUNT(DISTINCT i.invoice_id) as total_purchases,
  SUM(i.total_amount) as total_spent,
  AVG(i.total_amount) as average_ticket,
  ARRAY_AGG(DISTINCT p.name) as favorite_products,
  ARRAY_AGG(DISTINCT ing.name) as favorite_ingredients
FROM customers c
LEFT JOIN invoices i ON c.customer_id = i.customer_id
LEFT JOIN invoice_products ip ON i.invoice_id = ip.invoice_id
LEFT JOIN products p ON ip.product_id = p.product_id
LEFT JOIN product_ingredients ping ON p.product_id = ping.product_id
LEFT JOIN ingredients ing ON ping.ingredient_id = ing.ingredient_id
GROUP BY c.customer_id, c.company_id, c.phone, c.name, c.email, c.gender, c.city;

-- Refrescar diariamente
REFRESH MATERIALIZED VIEW CONCURRENTLY customer_stats;
```

### 4. Monitoreo

#### Health Checks

Agregar a `src/index.js`:
```javascript
app.get('/health', async (req, res) => {
  try {
    // Verificar Elasticsearch
    await client.ping();
    
    // Verificar índices
    const customerCount = await client.count({ index: 'customers' });
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      elasticsearch: 'connected',
      customerCount: customerCount.count,
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

#### Logging

```bash
npm install winston
```

```javascript
// src/config/logger.js
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

export default logger;
```

#### Métricas

```bash
npm install prom-client
```

```javascript
// src/middleware/metrics.js
import promClient from 'prom-client';

const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

export function metricsMiddleware(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(duration);
  });
  
  next();
}

export { register };
```

### 5. Performance

#### Caching

```bash
npm install redis ioredis
```

```javascript
// src/config/redis.js
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function cachedSearch(key, searchFn, ttl = 300) {
  // Buscar en cache
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Si no está, ejecutar búsqueda
  const result = await searchFn();
  
  // Guardar en cache (5 minutos default)
  await redis.setex(key, ttl, JSON.stringify(result));
  
  return result;
}
```

Uso:
```javascript
// En customerService.js
const cacheKey = `search:${JSON.stringify(params)}`;
return cachedSearch(cacheKey, () => {
  return client.search({ ... });
}, 600); // 10 minutos
```

#### Índices Compuestos

```javascript
// Agregar a indices.js para búsquedas frecuentes
{
  index: 'customers',
  mappings: {
    properties: {
      // ...existentes
      
      // Campo compuesto para búsquedas frecuentes
      search_filters: {
        type: 'keyword',
        // Combina: companyId_city_gender_isInactive
        // Ejemplo: "COMP001_SanJose_mujer_true"
      }
    }
  }
}
```

### 6. Backup y Recuperación

#### Snapshots de Elasticsearch

Elasticsearch Serverless hace backups automáticos, pero considera:

```javascript
// Script manual de backup (opcional)
// src/scripts/backup.js
import fs from 'fs';
import { client } from '../config/elasticsearch.js';

async function backupCustomers() {
  const allCustomers = await client.search({
    index: 'customers',
    scroll: '2m',
    size: 1000,
    body: { query: { match_all: {} } }
  });
  
  const backup = {
    timestamp: new Date().toISOString(),
    total: allCustomers.hits.total.value,
    customers: allCustomers.hits.hits
  };
  
  const filename = `backup-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(backup));
  
  console.log(`✅ Backup guardado: ${filename}`);
}
```

### 7. Costos Estimados

#### Elasticsearch Serverless
```
800k clientes:
- Almacenamiento: ~2-3 GB = $10-15/mes
- Queries (100k/día): ~$100-150/mes
- Total: ~$110-165/mes
```

#### API Server (AWS ECS Fargate)
```
- 2 vCPU, 4 GB RAM
- ~$50-80/mes
```

#### Redis (ElastiCache)
```
- cache.t3.micro
- ~$15-20/mes
```

#### Total mensual: ~$175-265/mes

### 8. CI/CD Pipeline

#### GitHub Actions ejemplo

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Build Docker image
      run: docker build -t customer-reactivation .
    
    - name: Deploy to AWS ECS
      run: |
        # Comandos de deploy específicos
```

### 9. Testing

```bash
npm install --save-dev jest supertest
```

```javascript
// tests/api.test.js
import request from 'supertest';
import app from '../src/index.js';

describe('Customer API', () => {
  test('POST /api/customers/search', async () => {
    const response = await request(app)
      .post('/api/customers/search')
      .send({
        gender: 'mujer',
        city: 'San José',
        minDaysSinceLastPurchase: 90
      });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('total');
    expect(response.body).toHaveProperty('customers');
  });
});
```

### 10. Documentación API

Agregar Swagger/OpenAPI:

```bash
npm install swagger-ui-express swagger-jsdoc
```

```javascript
// src/index.js
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Customer Reactivation API',
      version: '1.0.0',
    },
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
```

## 🚀 Plan de Migración (2-3 semanas)

### Semana 1: Preparación
- [ ] Configurar entorno de staging
- [ ] Implementar autenticación y seguridad
- [ ] Configurar logging y monitoreo
- [ ] Pruebas de carga

### Semana 2: Integración de Datos
- [ ] Script de importación desde DB real
- [ ] Pruebas con subset de datos reales
- [ ] Validación de resultados
- [ ] Optimización de queries

### Semana 3: Deploy
- [ ] Deploy a staging
- [ ] Pruebas de usuario final
- [ ] Deploy a producción (gradual)
- [ ] Monitoreo intensivo primeros días

## 📊 KPIs a Medir

1. **Performance**
   - Latencia promedio de búsquedas
   - P95/P99 latencias
   - Throughput (requests/segundo)

2. **Negocio**
   - Clientes reactivados por campaña
   - ROI de campañas de reactivación
   - Tasa de apertura de emails

3. **Sistema**
   - Uptime
   - Error rate
   - Costo por búsqueda

## 📞 Soporte Post-Producción

1. **Documentación**: Mantener README actualizado
2. **Runbooks**: Guías para errores comunes
3. **Alertas**: Configurar para caídas o degradación
4. **On-call**: Definir quién responde a incidentes

---

¿Preguntas? Contacta al equipo de desarrollo.
