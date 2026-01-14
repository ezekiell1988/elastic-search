import sql from 'mssql';
import dotenv from 'dotenv';
import esClient from '../config/elasticsearch.js';

dotenv.config();

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
    requestTimeout: 60000
  }
};

/**
 * Crea un índice simple para clientes
 */
async function createClientesIndex() {
  try {
    await esClient.indices.delete({ index: 'clickeat_clientes_v2' });
    console.log('🗑️  Índice anterior eliminado');
  } catch (err) {}

  await esClient.indices.create({
    index: 'clickeat_clientes_v2',
    body: {
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
          puntos: { type: 'double' }
        }
      }
    }
  });
  console.log('✅ Índice clickeat_clientes_v2 creado');
}

/**
 * Crea un índice simple para órdenes
 */
async function createOrdenesIndex() {
  try {
    await esClient.indices.delete({ index: 'clickeat_ordenes_v2' });
    console.log('🗑️  Índice anterior eliminado');
  } catch (err) {}

  await esClient.indices.create({
    index: 'clickeat_ordenes_v2',
    body: {
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
          id_compania: { type: 'integer' }
        }
      }
    }
  });
  console.log('✅ Índice clickeat_ordenes_v2 creado');
}

/**
 * Migra clientes usando las columnas reales
 */
async function migrateClientes(pool) {
  console.log('\n👥 Migrando clientes...');

  const query = `
    SELECT TOP 1000
      Id_cliente,
      Nombre,
      Cedula,
      Telefono,
      Correo,
      Estado,
      FechaCreacion,
      Id_compania,
      BalanceCliente,
      Puntos
    FROM tbClientes
    ORDER BY Id_cliente DESC
  `;

  const result = await pool.request().query(query);
  console.log(`   Registros obtenidos: ${result.recordset.length}`);

  const operations = [];
  result.recordset.forEach(cliente => {
    operations.push({ index: { _index: 'clickeat_clientes_v2', _id: cliente.Id_cliente } });
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
      puntos: cliente.Puntos || 0
    });
  });

  if (operations.length > 0) {
    const bulkResponse = await esClient.bulk({ operations, refresh: true });
    
    if (bulkResponse.errors) {
      console.log('⚠️  Algunos documentos fallaron');
      const erroredDocuments = [];
      bulkResponse.items.forEach((action, i) => {
        const operation = Object.keys(action)[0];
        if (action[operation].error) {
          erroredDocuments.push({
            status: action[operation].status,
            error: action[operation].error
          });
        }
      });
      console.log('Errores:', erroredDocuments.slice(0, 5));
    }
  }

  console.log(`✅ ${result.recordset.length} clientes migrados`);
  return result.recordset.length;
}

/**
 * Migra órdenes usando las columnas reales
 */
async function migrateOrdenes(pool) {
  console.log('\n🧾 Migrando órdenes...');

  const query = `
    SELECT TOP 5000
      f.Id_factura,
      f.Id_cliente,
      f.Nombre AS Nombre_cliente,
      f.Correo_facturacion,
      f.Fecha_facturado,
      f.Fecha_entregado,
      f.EstadoFactura,
      f.MontoTotal,
      f.ImpuestoVentas,
      f.Costo_entrega,
      f.Descuento,
      f.Moneda,
      f.Pagado,
      f.Id_restaurante,
      f.Id_compania
    FROM tbFactura f
    WHERE f.Fecha_facturado IS NOT NULL AND f.Pagado = 1
    ORDER BY f.Fecha_facturado DESC
  `;

  const result = await pool.request().query(query);
  console.log(`   Registros obtenidos: ${result.recordset.length}`);

  const operations = [];
  result.recordset.forEach(factura => {
    operations.push({ index: { _index: 'clickeat_ordenes_v2', _id: factura.Id_factura } });
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
      id_compania: factura.Id_compania
    });
  });

  if (operations.length > 0) {
    const bulkResponse = await esClient.bulk({ operations, refresh: true });
    
    if (bulkResponse.errors) {
      console.log('⚠️  Algunos documentos fallaron');
    }
  }

  console.log(`✅ ${result.recordset.length} órdenes migradas`);
  return result.recordset.length;
}

/**
 * Ejecuta la migración simplificada
 */
async function runSimpleMigration() {
  let pool;
  const startTime = Date.now();

  try {
    console.log('╔════════════════════════════════════════════╗');
    console.log('║  MIGRACIÓN SIMPLIFICADA                    ║');
    console.log('║  ClickEat → Elasticsearch                  ║');
    console.log('╚════════════════════════════════════════════╝\n');

    // Conectar a SQL Server
    console.log('🔌 Conectando a SQL Server...');
    pool = await sql.connect(config);
    console.log('✅ Conectado a SQL Server\n');

    // Verificar Elasticsearch
    console.log('🔍 Verificando Elasticsearch...');
    await esClient.ping();
    console.log('✅ Elasticsearch conectado\n');

    // Crear índices
    console.log('📋 Creando índices...\n');
    await createClientesIndex();
    await createOrdenesIndex();

    // Migrar datos
    const stats = {
      clientes: await migrateClientes(pool),
      ordenes: await migrateOrdenes(pool)
    };

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║  MIGRACIÓN COMPLETADA                      ║');
    console.log('╚════════════════════════════════════════════╝\n');
    console.log(`⏱️  Duración: ${duration}s`);
    console.log(`👥 Clientes: ${stats.clientes}`);
    console.log(`🧾 Órdenes: ${stats.ordenes}`);
    console.log(`📊 Total: ${stats.clientes + stats.ordenes}\n`);

    // Ejemplos de consultas
    console.log('💡 Ejemplos de consultas:\n');
    console.log('# Ver clientes:');
    console.log('GET /clickeat_clientes_v2/_search\n');
    console.log('# Ver órdenes recientes:');
    console.log('GET /clickeat_ordenes_v2/_search');
    console.log('{\n  "sort": [{"fecha_facturado": "desc"}]\n}\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
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
  runSimpleMigration()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

export { runSimpleMigration };
