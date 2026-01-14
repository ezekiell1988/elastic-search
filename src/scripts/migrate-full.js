import sql from 'mssql';
import dotenv from 'dotenv';
import esClient from '../config/elasticsearch.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de SQL Server
const config = {
  server: process.env.DB_HOST_CLICKEAT,
  database: process.env.DB_DATABASE_CLICKEAT,
  user: process.env.DB_USER_CLICKEAT,
  password: process.env.DB_PASSWORD_CLICKEAT,
  port: parseInt(process.env.DB_PORT_CLICKEAT || '1433'),
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true,
    connectTimeout: 30000,
    requestTimeout: 120000
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// Configuración de migración
const MIGRATION_CONFIG = {
  batchSize: 1000,           // Documentos por batch en Elasticsearch
  sqlBatchSize: 5000,        // Registros por consulta SQL
  maxRetries: 3,             // Reintentos por batch
  delayBetweenBatches: 100,  // ms de espera entre batches
  checkpointInterval: 10000, // Guardar progreso cada N registros
  parallelBatches: 3         // Batches en paralelo para ES
};

// Archivo de checkpoint para reanudar migraciones
const CHECKPOINT_FILE = path.join(__dirname, '../../.migration-checkpoint.json');

/**
 * Guardar el progreso de la migración
 */
function saveCheckpoint(data) {
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(data, null, 2));
}

/**
 * Cargar el progreso de la migración
 */
function loadCheckpoint() {
  try {
    if (fs.existsSync(CHECKPOINT_FILE)) {
      return JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('⚠️  Error cargando checkpoint:', err.message);
  }
  return null;
}

/**
 * Eliminar checkpoint
 */
function clearCheckpoint() {
  try {
    if (fs.existsSync(CHECKPOINT_FILE)) {
      fs.unlinkSync(CHECKPOINT_FILE);
    }
  } catch (err) {
    console.error('⚠️  Error eliminando checkpoint:', err.message);
  }
}

/**
 * Crear índices con configuración optimizada para bulk insert
 */
async function createOptimizedIndices() {
  console.log('\n📋 Creando índices optimizados...\n');

  const settings = {
    number_of_shards: 1,
    number_of_replicas: 0, // Sin réplicas durante migración
    refresh_interval: '-1' // Deshabilitar refresh durante migración
  };

  // Índice de clientes
  try {
    await esClient.indices.delete({ index: 'clickeat_clientes' });
  } catch (err) {}

  await esClient.indices.create({
    index: 'clickeat_clientes',
    body: {
      settings,
      mappings: {
        properties: {
          id_cliente: { type: 'integer' },
          nombre: { type: 'text', fields: { keyword: { type: 'keyword' } } },
          cedula: { type: 'keyword' },
          telefono: { type: 'keyword' },
          correo: { type: 'keyword' },
          fecha_creacion: { type: 'date' },
          estado: { type: 'integer' },
          id_compania: { type: 'integer' },
          balance: { type: 'double' },
          puntos: { type: 'double' },
          direcciones: {
            type: 'nested',
            properties: {
              id_direccion: { type: 'integer' },
              nombre_contacto: { type: 'text' },
              telefono_contacto: { type: 'keyword' },
              direccion: { type: 'text' },
              provincia: { type: 'keyword' },
              canton: { type: 'keyword' },
              distrito: { type: 'keyword' }
            }
          }
        }
      }
    }
  });
  console.log('✅ Índice clickeat_clientes creado');

  // Índice de órdenes
  try {
    await esClient.indices.delete({ index: 'clickeat_ordenes' });
  } catch (err) {}

  await esClient.indices.create({
    index: 'clickeat_ordenes',
    body: {
      settings,
      mappings: {
        properties: {
          id_factura: { type: 'integer' },
          id_cliente: { type: 'integer' },
          nombre_cliente: { type: 'text', fields: { keyword: { type: 'keyword' } } },
          correo_cliente: { type: 'keyword' },
          fecha_facturado: { type: 'date' },
          fecha_entregado: { type: 'date' },
          estado_factura: { type: 'integer' },
          monto_total: { type: 'double' },
          impuesto_ventas: { type: 'double' },
          costo_entrega: { type: 'double' },
          descuento: { type: 'double' },
          moneda: { type: 'keyword' },
          pagado: { type: 'boolean' },
          id_restaurante: { type: 'integer' },
          id_compania: { type: 'integer' },
          productos: {
            type: 'nested',
            properties: {
              id_detalle: { type: 'integer' },
              id_producto: { type: 'integer' },
              nombre_producto: { type: 'text' },
              cantidad: { type: 'double' },
              precio: { type: 'double' },
              monto_total: { type: 'double' }
            }
          }
        }
      }
    }
  });
  console.log('✅ Índice clickeat_ordenes creado');

  // Índice de productos
  try {
    await esClient.indices.delete({ index: 'clickeat_productos' });
  } catch (err) {}

  await esClient.indices.create({
    index: 'clickeat_productos',
    body: {
      settings,
      mappings: {
        properties: {
          id_producto: { type: 'integer' },
          codigo: { type: 'keyword' },
          nombre: { type: 'text', fields: { keyword: { type: 'keyword' } } },
          descripcion: { type: 'text' },
          precio_venta: { type: 'double' },
          tipo_nodo: { type: 'keyword' },
          id_compania: { type: 'integer' },
          estado: { type: 'integer' }
        }
      }
    }
  });
  console.log('✅ Índice clickeat_productos creado\n');
}

/**
 * Reconfigurar índices después de migración
 */
async function optimizeIndicesAfterMigration() {
  console.log('\n⚙️  Optimizando índices...');

  const indices = ['clickeat_clientes', 'clickeat_ordenes', 'clickeat_productos'];

  for (const index of indices) {
    // Habilitar refresh
    await esClient.indices.putSettings({
      index,
      body: {
        refresh_interval: '1s',
        number_of_replicas: 1
      }
    });

    // Forzar refresh
    await esClient.indices.refresh({ index });

    // Force merge para optimizar segmentos
    await esClient.indices.forcemerge({
      index,
      max_num_segments: 1
    });

    console.log(`✅ Índice ${index} optimizado`);
  }
}

/**
 * Contar total de registros en una tabla
 */
async function contarRegistros(pool, tabla, whereClause = '') {
  const query = `SELECT COUNT(*) AS total FROM ${tabla}${whereClause ? ' WHERE ' + whereClause : ''}`;
  const result = await pool.request().query(query);
  return result.recordset[0].total;
}

/**
 * Migrar clientes con direcciones en batches
 */
async function migrateClientesFull(pool, startFrom = 0) {
  console.log('\n👥 Migrando TODOS los clientes...');

  const totalClientes = await contarRegistros(pool, 'tbClientes');
  console.log(`   Total a migrar: ${totalClientes.toLocaleString()} clientes`);

  let offset = startFrom;
  let migratedCount = 0;
  let errorCount = 0;

  while (offset < totalClientes) {
    try {
      // Obtener batch de clientes
      const clientesQuery = `
        SELECT 
          Id_cliente, Nombre, Cedula, Telefono, Correo,
          Estado, FechaCreacion, Id_compania, BalanceCliente, Puntos
        FROM tbClientes
        ORDER BY Id_cliente
        OFFSET ${offset} ROWS
        FETCH NEXT ${MIGRATION_CONFIG.sqlBatchSize} ROWS ONLY
      `;

      const clientes = await pool.request().query(clientesQuery);

      if (clientes.recordset.length === 0) break;

      // Obtener IDs de clientes para buscar direcciones
      const clienteIds = clientes.recordset.map(c => c.Id_cliente);
      const direccionesQuery = `
        SELECT Id_direccion, Id_cliente, Nombre_contacto, Telefono_contacto,
               Direccion, Provincia, Canton, Distrito
        FROM tbClientesDireccion
        WHERE Id_cliente IN (${clienteIds.join(',')})
      `;

      const direcciones = await pool.request().query(direccionesQuery);

      // Agrupar direcciones por cliente
      const direccionesPorCliente = {};
      direcciones.recordset.forEach(dir => {
        if (!direccionesPorCliente[dir.Id_cliente]) {
          direccionesPorCliente[dir.Id_cliente] = [];
        }
        direccionesPorCliente[dir.Id_cliente].push({
          id_direccion: dir.Id_direccion,
          nombre_contacto: dir.Nombre_contacto,
          telefono_contacto: dir.Telefono_contacto,
          direccion: dir.Direccion,
          provincia: dir.Provincia,
          canton: dir.Canton,
          distrito: dir.Distrito
        });
      });

      // Preparar operaciones bulk en sub-batches
      const totalRecords = clientes.recordset.length;
      for (let i = 0; i < totalRecords; i += MIGRATION_CONFIG.batchSize) {
        const batch = clientes.recordset.slice(i, i + MIGRATION_CONFIG.batchSize);
        const operations = [];

        batch.forEach(cliente => {
          operations.push({ index: { _index: 'clickeat_clientes', _id: cliente.Id_cliente } });
          operations.push({
            id_cliente: cliente.Id_cliente,
            nombre: cliente.Nombre,
            cedula: cliente.Cedula,
            telefono: cliente.Telefono,
            correo: cliente.Correo,
            fecha_creacion: cliente.FechaCreacion,
            estado: cliente.Estado,
            id_compania: cliente.Id_compania,
            balance: cliente.BalanceCliente || 0,
            puntos: cliente.Puntos || 0,
            direcciones: direccionesPorCliente[cliente.Id_cliente] || []
          });
        });

        // Insertar con reintentos
        let retries = 0;
        let success = false;

        while (retries < MIGRATION_CONFIG.maxRetries && !success) {
          try {
            const bulkResponse = await esClient.bulk({ operations });

            if (bulkResponse.errors) {
              const erroredDocs = bulkResponse.items.filter(item => 
                item.index && item.index.error
              );
              errorCount += erroredDocs.length;
              console.log(`   ⚠️  ${erroredDocs.length} errores en este batch`);
            }

            migratedCount += batch.length;
            success = true;
          } catch (err) {
            retries++;
            if (retries < MIGRATION_CONFIG.maxRetries) {
              console.log(`   ⚠️  Reintentando batch (intento ${retries})...`);
              await new Promise(resolve => setTimeout(resolve, 1000 * retries));
            } else {
              console.error(`   ❌ Batch falló después de ${MIGRATION_CONFIG.maxRetries} intentos`);
              errorCount += batch.length;
            }
          }
        }

        // Pequeña pausa entre batches
        await new Promise(resolve => setTimeout(resolve, MIGRATION_CONFIG.delayBetweenBatches));
      }

      offset += MIGRATION_CONFIG.sqlBatchSize;

      // Mostrar progreso
      const progress = ((offset / totalClientes) * 100).toFixed(2);
      console.log(`   Progreso: ${migratedCount.toLocaleString()}/${totalClientes.toLocaleString()} (${progress}%)`);

      // Guardar checkpoint
      if (migratedCount % MIGRATION_CONFIG.checkpointInterval < MIGRATION_CONFIG.sqlBatchSize) {
        saveCheckpoint({
          step: 'clientes',
          offset,
          migratedCount,
          errorCount,
          timestamp: new Date().toISOString()
        });
      }

    } catch (err) {
      console.error(`   ❌ Error en offset ${offset}:`, err.message);
      errorCount += MIGRATION_CONFIG.sqlBatchSize;
      offset += MIGRATION_CONFIG.sqlBatchSize;
    }
  }

  console.log(`✅ Clientes migrados: ${migratedCount.toLocaleString()} (Errores: ${errorCount})`);
  return { migratedCount, errorCount };
}

/**
 * Migrar órdenes con productos en batches
 */
async function migrateOrdenesFull(pool, startFrom = 0) {
  console.log('\n🧾 Migrando TODAS las órdenes...');

  const totalOrdenes = await contarRegistros(pool, 'tbFactura', 'Fecha_facturado IS NOT NULL AND Pagado = 1');
  console.log(`   Total a migrar: ${totalOrdenes.toLocaleString()} órdenes (solo pagadas)`);

  let offset = startFrom;
  let migratedCount = 0;
  let errorCount = 0;

  while (offset < totalOrdenes) {
    try {
      // Obtener batch de facturas
      const facturasQuery = `
        SELECT 
          f.Id_factura, f.Id_cliente, f.Nombre AS Nombre_cliente,
          f.Correo_facturacion, f.Fecha_facturado, f.Fecha_entregado,
          f.EstadoFactura, f.MontoTotal, f.ImpuestoVentas,
          f.Costo_entrega, f.Descuento, f.Moneda, f.Pagado,
          f.Id_restaurante, f.Id_compania
        FROM tbFactura f
        WHERE f.Fecha_facturado IS NOT NULL AND f.Pagado = 1
        ORDER BY f.Id_factura
        OFFSET ${offset} ROWS
        FETCH NEXT ${MIGRATION_CONFIG.sqlBatchSize} ROWS ONLY
      `;

      const facturas = await pool.request().query(facturasQuery);

      if (facturas.recordset.length === 0) break;

      // Obtener productos de estas facturas
      const facturaIds = facturas.recordset.map(f => f.Id_factura);
      const productosQuery = `
        SELECT 
          fd.Id_detalle, fd.Id_factura, fd.Id_producto,
          fd.Cantidad, fd.Precio, fd.MontoTotal,
          fd.Nombre_producto
        FROM tbFacturaDetalle fd
        WHERE fd.Id_factura IN (${facturaIds.join(',')})
      `;

      const productos = await pool.request().query(productosQuery);

      // Agrupar productos por factura
      const productosPorFactura = {};
      productos.recordset.forEach(prod => {
        if (!productosPorFactura[prod.Id_factura]) {
          productosPorFactura[prod.Id_factura] = [];
        }
        productosPorFactura[prod.Id_factura].push({
          id_detalle: prod.Id_detalle,
          id_producto: prod.Id_producto,
          nombre_producto: prod.Nombre_producto,
          cantidad: prod.Cantidad,
          precio: prod.Precio,
          monto_total: prod.MontoTotal
        });
      });

      // Preparar operaciones bulk en sub-batches
      const totalRecords = facturas.recordset.length;
      for (let i = 0; i < totalRecords; i += MIGRATION_CONFIG.batchSize) {
        const batch = facturas.recordset.slice(i, i + MIGRATION_CONFIG.batchSize);
        const operations = [];

        batch.forEach(factura => {
          operations.push({ index: { _index: 'clickeat_ordenes', _id: factura.Id_factura } });
          operations.push({
            id_factura: factura.Id_factura,
            id_cliente: factura.Id_cliente,
            nombre_cliente: factura.Nombre_cliente,
            correo_cliente: factura.Correo_facturacion,
            fecha_facturado: factura.Fecha_facturado,
            fecha_entregado: factura.Fecha_entregado,
            estado_factura: factura.EstadoFactura,
            monto_total: factura.MontoTotal || 0,
            impuesto_ventas: factura.ImpuestoVentas || 0,
            costo_entrega: factura.Costo_entrega || 0,
            descuento: factura.Descuento || 0,
            moneda: factura.Moneda,
            pagado: factura.Pagado === 1 || factura.Pagado === true,
            id_restaurante: factura.Id_restaurante,
            id_compania: factura.Id_compania,
            productos: productosPorFactura[factura.Id_factura] || []
          });
        });

        // Insertar con reintentos
        let retries = 0;
        let success = false;

        while (retries < MIGRATION_CONFIG.maxRetries && !success) {
          try {
            const bulkResponse = await esClient.bulk({ operations });

            if (bulkResponse.errors) {
              const erroredDocs = bulkResponse.items.filter(item => 
                item.index && item.index.error
              );
              errorCount += erroredDocs.length;
            }

            migratedCount += batch.length;
            success = true;
          } catch (err) {
            retries++;
            if (retries < MIGRATION_CONFIG.maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 1000 * retries));
            } else {
              errorCount += batch.length;
            }
          }
        }

        await new Promise(resolve => setTimeout(resolve, MIGRATION_CONFIG.delayBetweenBatches));
      }

      offset += MIGRATION_CONFIG.sqlBatchSize;

      // Mostrar progreso
      const progress = ((offset / totalOrdenes) * 100).toFixed(2);
      console.log(`   Progreso: ${migratedCount.toLocaleString()}/${totalOrdenes.toLocaleString()} (${progress}%)`);

      // Guardar checkpoint
      if (migratedCount % MIGRATION_CONFIG.checkpointInterval < MIGRATION_CONFIG.sqlBatchSize) {
        saveCheckpoint({
          step: 'ordenes',
          offset,
          migratedCount,
          errorCount,
          timestamp: new Date().toISOString()
        });
      }

    } catch (err) {
      console.error(`   ❌ Error en offset ${offset}:`, err.message);
      errorCount += MIGRATION_CONFIG.sqlBatchSize;
      offset += MIGRATION_CONFIG.sqlBatchSize;
    }
  }

  console.log(`✅ Órdenes migradas: ${migratedCount.toLocaleString()} (Errores: ${errorCount})`);
  return { migratedCount, errorCount };
}

/**
 * Migrar productos del catálogo
 */
async function migrateProductosFull(pool, startFrom = 0) {
  console.log('\n📦 Migrando TODOS los productos...');

  const totalProductos = await contarRegistros(pool, 'tbCatalogo');
  console.log(`   Total a migrar: ${totalProductos.toLocaleString()} productos`);

  let offset = startFrom;
  let migratedCount = 0;
  let errorCount = 0;

  while (offset < totalProductos) {
    try {
      const query = `
        SELECT 
          Id_producto, Codigo, NombreCatalogo, Descripcion,
          Precio_venta, TipoNodo, Id_compania, Estado
        FROM tbCatalogo
        ORDER BY Id_producto
        OFFSET ${offset} ROWS
        FETCH NEXT ${MIGRATION_CONFIG.sqlBatchSize} ROWS ONLY
      `;

      const result = await pool.request().query(query);

      if (result.recordset.length === 0) break;

      // Procesar en sub-batches
      for (let i = 0; i < result.recordset.length; i += MIGRATION_CONFIG.batchSize) {
        const batch = result.recordset.slice(i, i + MIGRATION_CONFIG.batchSize);
        const operations = [];

        batch.forEach(producto => {
          operations.push({ index: { _index: 'clickeat_productos', _id: producto.Id_producto } });
          operations.push({
            id_producto: producto.Id_producto,
            codigo: producto.Codigo,
            nombre: producto.NombreCatalogo,
            descripcion: producto.Descripcion,
            precio_venta: producto.Precio_venta,
            tipo_nodo: producto.TipoNodo,
            id_compania: producto.Id_compania,
            estado: producto.Estado
          });
        });

        let retries = 0;
        let success = false;

        while (retries < MIGRATION_CONFIG.maxRetries && !success) {
          try {
            await esClient.bulk({ operations });
            migratedCount += batch.length;
            success = true;
          } catch (err) {
            retries++;
            if (retries >= MIGRATION_CONFIG.maxRetries) {
              errorCount += batch.length;
            }
          }
        }

        await new Promise(resolve => setTimeout(resolve, MIGRATION_CONFIG.delayBetweenBatches));
      }

      offset += MIGRATION_CONFIG.sqlBatchSize;
      const progress = ((offset / totalProductos) * 100).toFixed(2);
      console.log(`   Progreso: ${migratedCount.toLocaleString()}/${totalProductos.toLocaleString()} (${progress}%)`);

    } catch (err) {
      console.error(`   ❌ Error en offset ${offset}:`, err.message);
      offset += MIGRATION_CONFIG.sqlBatchSize;
    }
  }

  console.log(`✅ Productos migrados: ${migratedCount.toLocaleString()} (Errores: ${errorCount})`);
  return { migratedCount, errorCount };
}

/**
 * Ejecutar migración completa
 */
async function runFullMigration(resume = false) {
  let pool;
  const startTime = Date.now();

  try {
    console.log('╔════════════════════════════════════════════╗');
    console.log('║  MIGRACIÓN COMPLETA - TODOS LOS DATOS      ║');
    console.log('║  ClickEat → Elasticsearch                  ║');
    console.log('╚════════════════════════════════════════════╝\n');

    console.log('⚙️  Configuración:');
    console.log(`   Batch SQL: ${MIGRATION_CONFIG.sqlBatchSize.toLocaleString()} registros`);
    console.log(`   Batch ES: ${MIGRATION_CONFIG.batchSize.toLocaleString()} documentos`);
    console.log(`   Reintentos: ${MIGRATION_CONFIG.maxRetries}`);
    console.log(`   Checkpoint: cada ${MIGRATION_CONFIG.checkpointInterval.toLocaleString()} registros`);

    // Conectar a SQL Server
    console.log('\n🔌 Conectando a SQL Server...');
    pool = await sql.connect(config);
    console.log('✅ Conectado a SQL Server');

    // Verificar Elasticsearch
    console.log('🔍 Verificando Elasticsearch...');
    await esClient.ping();
    console.log('✅ Elasticsearch conectado');

    let checkpoint = null;
    if (resume) {
      checkpoint = loadCheckpoint();
      if (checkpoint) {
        console.log(`\n📍 Reanudando desde checkpoint: ${checkpoint.step} (offset: ${checkpoint.offset})`);
      }
    }

    // Crear índices solo si no estamos reanudando
    if (!checkpoint) {
      await createOptimizedIndices();
    }

    // Migrar datos
    const stats = {
      clientes: { migratedCount: 0, errorCount: 0 },
      ordenes: { migratedCount: 0, errorCount: 0 },
      productos: { migratedCount: 0, errorCount: 0 }
    };

    // Migrar clientes
    if (!checkpoint || checkpoint.step === 'clientes') {
      const offset = checkpoint?.step === 'clientes' ? checkpoint.offset : 0;
      stats.clientes = await migrateClientesFull(pool, offset);
    }

    // Migrar órdenes
    if (!checkpoint || checkpoint.step === 'clientes' || checkpoint.step === 'ordenes') {
      const offset = checkpoint?.step === 'ordenes' ? checkpoint.offset : 0;
      stats.ordenes = await migrateOrdenesFull(pool, offset);
    }

    // Migrar productos
    if (!checkpoint || checkpoint.step !== 'completado') {
      const offset = checkpoint?.step === 'productos' ? checkpoint.offset : 0;
      stats.productos = await migrateProductosFull(pool, offset);
    }

    // Optimizar índices
    await optimizeIndicesAfterMigration();

    // Limpiar checkpoint
    clearCheckpoint();

    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
    const totalMigrated = stats.clientes.migratedCount + stats.ordenes.migratedCount + stats.productos.migratedCount;
    const totalErrors = stats.clientes.errorCount + stats.ordenes.errorCount + stats.productos.errorCount;

    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║  MIGRACIÓN COMPLETADA                      ║');
    console.log('╚════════════════════════════════════════════╝\n');
    console.log(`⏱️  Duración: ${duration} minutos`);
    console.log(`👥 Clientes: ${stats.clientes.migratedCount.toLocaleString()}`);
    console.log(`🧾 Órdenes: ${stats.ordenes.migratedCount.toLocaleString()}`);
    console.log(`📦 Productos: ${stats.productos.migratedCount.toLocaleString()}`);
    console.log(`📊 Total: ${totalMigrated.toLocaleString()} documentos`);
    if (totalErrors > 0) {
      console.log(`⚠️  Errores: ${totalErrors.toLocaleString()}`);
    }
    console.log('');

  } catch (err) {
    console.error('❌ Error crítico:', err);
    throw err;
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔌 Conexión cerrada');
    }
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const resume = process.argv.includes('--resume');

  runFullMigration(resume)
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

export { runFullMigration };
