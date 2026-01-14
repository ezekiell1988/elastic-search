import express from 'express';
import customerService from '../services/customerService.js';
import { exportToExcel } from '../utils/excelExporter.js';

const router = express.Router();

/**
 * POST /api/customers/search
 * Búsqueda avanzada de clientes inactivos
 * 
 * Body:
 * {
 *   "gender": "mujer",
 *   "city": "San José",
 *   "products": ["Pizza Pepperoni"],
 *   "ingredients": ["pepperoni"],
 *   "minDaysSinceLastPurchase": 90,
 *   "companyId": "COMP001",
 *   "from": 0,
 *   "size": 100
 * }
 */
router.post('/search', async (req, res) => {
  try {
    const result = await customerService.searchInactiveCustomers(req.body);
    res.json(result);
  } catch (error) {
    console.error('Error en búsqueda:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/customers/free-text-search
 * Búsqueda conversacional
 * 
 * Body:
 * {
 *   "searchText": "mujer pepperoni san jose",
 *   "minDaysSinceLastPurchase": 90,
 *   "from": 0,
 *   "size": 100
 * }
 */
router.post('/free-text-search', async (req, res) => {
  try {
    const { searchText, ...options } = req.body;
    
    if (!searchText) {
      return res.status(400).json({ error: 'searchText es requerido' });
    }

    const result = await customerService.freeTextSearch(searchText, options);
    res.json(result);
  } catch (error) {
    console.error('Error en búsqueda de texto libre:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/customers/inactive-stats
 * Estadísticas de clientes inactivos
 * 
 * Query params:
 * - companyId (opcional)
 */
router.get('/inactive-stats', async (req, res) => {
  try {
    const { companyId } = req.query;
    const result = await customerService.getInactiveCustomersStats(companyId);
    res.json(result);
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/customers/:id
 * Detalles completos de un cliente
 */
router.get('/:id', async (req, res) => {
  try {
    const result = await customerService.getCustomerDetails(req.params.id);
    
    if (!result) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error obteniendo detalles:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/customers/export
 * Exportar resultados a Excel
 * 
 * Body: mismo que /search o /free-text-search
 * Returns: archivo Excel
 */
router.post('/export', async (req, res) => {
  try {
    let customers;
    
    // Determinar tipo de búsqueda
    if (req.body.searchText) {
      const { searchText, ...options } = req.body;
      const result = await customerService.freeTextSearch(searchText, {
        ...options,
        size: 10000 // Exportar más registros
      });
      customers = result.customers;
    } else {
      const result = await customerService.searchInactiveCustomers({
        ...req.body,
        size: 10000 // Exportar más registros
      });
      customers = result.customers;
    }

    const buffer = await exportToExcel(customers);
    
    const filename = `clientes_inactivos_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
    
  } catch (error) {
    console.error('Error exportando a Excel:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
