import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { verifyConnection } from './config/elasticsearch.js';
import customerRoutes from './routes/customerRoutes.js';
import indicesRoutes from './routes/indicesRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Verificar conexión al iniciar
await verifyConnection();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Documentación de la API
app.get('/api', (req, res) => {
  res.json({
    message: 'API de Reactivación de Clientes',
    version: '1.0.0',
    endpoints: {
      // Customers
      indexTotals: 'GET /api/customers/index-totals - Totales de índices',
      search: 'POST /api/customers/search - Búsqueda avanzada',
      freeText: 'POST /api/customers/free-text-search - Búsqueda por texto libre',
      stats: 'GET /api/customers/inactive-stats - Estadísticas de inactivos',
      details: 'GET /api/customers/:id - Detalles de cliente',
      export: 'POST /api/customers/export - Exportar a Excel',
      
      // Indices Management
      listIndices: 'GET /api/indices - Lista todos los índices',
      createIndex: 'POST /api/indices - Crear nuevo índice',
      deleteIndex: 'DELETE /api/indices/:name - Eliminar índice',
      indexData: 'POST /api/indices/:name/data - Obtener datos del índice',
      exportIndex: 'POST /api/indices/:name/export - Exportar datos del índice'
    }
  });
});

// Routes de la API
app.use('/api/customers', customerRoutes);
app.use('/api/indices', indicesRoutes);

// Servir archivos estáticos desde la carpeta public (debe ir DESPUÉS de las rutas de la API)
app.use(express.static(path.join(__dirname, '../public')));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Algo salió mal', 
    message: err.message 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
