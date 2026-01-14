#!/usr/bin/env node

/**
 * VALIDACIÓN DE MIGRACIÓN
 * 
 * Compara los datos migrados a Elasticsearch con la fuente original en SQL Server
 * para verificar integridad y consistencia.
 */

import sql from 'mssql';
import dotenv from 'dotenv';
import esClient from '../config/elasticsearch.js';

dotenv.config();

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
    requestTimeout: 30000
  }
};

/**
 * Detecta qué índices están disponibles
 */
async function detectIndices() {
  const result = {
    clientes: null,
    ordenes: null,
    productos: null
  };

  // Buscar índice de clientes
  try {
    await esClient.indices.get({ index: 'clickeat_clientes' });
    result.clientes = 'clickeat_clientes';
  } catch (err) {
    try {
      await esClient.indices.get({ index: 'clickeat_clientes_v2' });
      result.clientes = 'clickeat_clientes_v2';
    } catch (err2) {
      // No existe
    }
  }

  // Buscar índice de órdenes
  try {
    await esClient.indices.get({ index: 'clickeat_ordenes' });
    result.ordenes = 'clickeat_ordenes';
  } catch (err) {
    try {
      await esClient.indices.get({ index: 'clickeat_ordenes_v2' });
      result.ordenes = 'clickeat_ordenes_v2';
    } catch (err2) {
      // No existe
    }
  }

  // Buscar índice de productos
  try {
    await esClient.indices.get({ index: 'clickeat_productos' });
    result.productos = 'clickeat_productos';
  } catch (err) {
    // No existe
  }

  return result;
}

async function validateMigration() {
  let pool;

  try {
    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║  VALIDACIÓN DE MIGRACIÓN                   ║');
    console.log('║  ClickEat Database → Elasticsearch         ║');
    console.log('╚════════════════════════════════════════════╝\n');

    // Conectar a SQL Server
    console.log('🔌 Conectando a SQL Server...');
    pool = await sql.connect(config);
    console.log('✅ Conectado a SQL Server\n');

    // Conectar a Elasticsearch
    console.log('🔍 Conectando a Elasticsearch...');
    await esClient.ping();
    console.log('✅ Conectado a Elasticsearch\n');

    // Detectar índices disponibles
    console.log('📋 Detectando índices migrados...');
    const indices = await detectIndices();
    
    if (!indices.clientes && !indices.ordenes && !indices.productos) {
      console.log('\n⚠️  No se encontraron índices migrados.');
      console.log('   Ejecuta primero: npm run migrate:simple o npm run migrate:full\n');
      return;
    }

    console.log(`   Clientes: ${indices.clientes || '❌ No migrado'}`);
    console.log(`   Órdenes: ${indices.ordenes || '❌ No migrado'}`);
    console.log(`   Productos: ${indices.productos || '❌ No migrado'}\n`);

    console.log('╔════════════════════════════════════════════╗');
    console.log('║  📊 CONTEO DE REGISTROS                    ║');
    console.log('╚════════════════════════════════════════════╝\n');

    let diffClientes = 0;
    let diffOrdenes = 0;
    let diffProductos = 0;

    // Validar clientes
    if (indices.clientes) {
      console.log('👥 CLIENTES:');
      const sqlClientes = await pool.request().query('SELECT COUNT(*) AS total FROM tbClientes');
      const esClientes = await esClient.count({ index: indices.clientes });
      
      console.log(`   SQL Server: ${sqlClientes.recordset[0].total.toLocaleString()}`);
      console.log(`   Elasticsearch: ${esClientes.count.toLocaleString()}`);
      
      diffClientes = sqlClientes.recordset[0].total - esClientes.count;
      if (diffClientes === 0) {
        console.log('   ✅ Coinciden perfectamente');
      } else {
        const percentage = ((esClientes.count / sqlClientes.recordset[0].total) * 100).toFixed(2);
        console.log(`   ⚠️  Diferencia: ${diffClientes} registros (${percentage}% migrado)`);
      }
    }

    // Validar órdenes
    if (indices.ordenes) {
      console.log('\n🧾 ÓRDENES:');
      const sqlOrdenes = await pool.request().query(
        'SELECT COUNT(*) AS total FROM tbFactura WHERE Fecha_facturado IS NOT NULL'
      );
      const esOrdenes = await esClient.count({ index: indices.ordenes });
      
      console.log(`   SQL Server: ${sqlOrdenes.recordset[0].total.toLocaleString()}`);
      console.log(`   Elasticsearch: ${esOrdenes.count.toLocaleString()}`);
      
      diffOrdenes = sqlOrdenes.recordset[0].total - esOrdenes.count;
      if (diffOrdenes === 0) {
        console.log('   ✅ Coinciden perfectamente');
      } else {
        const percentage = ((esOrdenes.count / sqlOrdenes.recordset[0].total) * 100).toFixed(2);
        console.log(`   ⚠️  Diferencia: ${diffOrdenes} registros (${percentage}% migrado)`);
      }
    }

    // Validar productos
    if (indices.productos) {
      console.log('\n📦 PRODUCTOS:');
      const sqlProductos = await pool.request().query('SELECT COUNT(*) AS total FROM tbCatalogo');
      const esProductos = await esClient.count({ index: indices.productos });
      
      console.log(`   SQL Server: ${sqlProductos.recordset[0].total.toLocaleString()}`);
      console.log(`   Elasticsearch: ${esProductos.count.toLocaleString()}`);
      
      diffProductos = sqlProductos.recordset[0].total - esProductos.count;
      if (diffProductos === 0) {
        console.log('   ✅ Coinciden perfectamente');
      } else {
        const percentage = ((esProductos.count / sqlProductos.recordset[0].total) * 100).toFixed(2);
        console.log(`   ⚠️  Diferencia: ${diffProductos} registros (${percentage}% migrado)`);
      }
    }

    // Validar integridad de datos
    if (indices.ordenes) {
      console.log('\n╔════════════════════════════════════════════╗');
      console.log('║  🔍 VALIDACIÓN DE INTEGRIDAD               ║');
      console.log('╚════════════════════════════════════════════╝\n');

      // Verificar que clientes en órdenes existan
      console.log('1. Verificando clientes en órdenes...');
      const ordenesConClientes = await esClient.search({
        index: indices.ordenes,
        body: {
          size: 0,
          query: { exists: { field: 'id_cliente' } }
        }
      });
      console.log(`   ✅ ${ordenesConClientes.hits.total.value.toLocaleString()} órdenes tienen id_cliente`);

      // Verificar órdenes con productos
      console.log('2. Verificando productos en órdenes...');
      const ordenesConProductos = await esClient.search({
        index: indices.ordenes,
        body: {
          size: 0,
          query: { 
            nested: {
              path: 'productos',
              query: { exists: { field: 'productos.id_producto' } }
            }
          }
        }
      });
      console.log(`   ✅ ${ordenesConProductos.hits.total.value.toLocaleString()} órdenes tienen productos`);

      // Verificar clientes con direcciones (si existe índice de clientes)
      if (indices.clientes) {
        console.log('3. Verificando direcciones en clientes...');
        const clientesConDirecciones = await esClient.search({
          index: indices.clientes,
          body: {
            size: 0,
            query: {
              nested: {
                path: 'direcciones',
                query: { exists: { field: 'direcciones.id_direccion' } }
              }
            }
          }
        });
        console.log(`   ✅ ${clientesConDirecciones.hits.total.value.toLocaleString()} clientes tienen direcciones`);
      }
    }

    // Estadísticas de órdenes
    if (indices.ordenes) {
      console.log('\n╔════════════════════════════════════════════╗');
      console.log('║  📊 ESTADÍSTICAS                           ║');
      console.log('╚════════════════════════════════════════════╝\n');

      const statsES = await esClient.search({
        index: indices.ordenes,
        body: {
          size: 0,
          aggs: {
            total_ventas: { sum: { field: 'monto_total' } },
            promedio: { avg: { field: 'monto_total' } },
            minimo: { min: { field: 'monto_total' } },
            maximo: { max: { field: 'monto_total' } }
          }
        }
      });

      const statsSQL = await pool.request().query(`
        SELECT 
          SUM(MontoTotal) AS total,
          AVG(MontoTotal) AS promedio,
          MIN(MontoTotal) AS minimo,
          MAX(MontoTotal) AS maximo
        FROM tbFactura
        WHERE Fecha_facturado IS NOT NULL
      `);

      console.log('Estadísticas de Ventas:');
      console.log('\n   Elasticsearch:');
      console.log(`     Total: ₡${(statsES.aggregations.total_ventas.value || 0).toFixed(2)}`);
      console.log(`     Promedio: ₡${(statsES.aggregations.promedio.value || 0).toFixed(2)}`);
      console.log(`     Mínimo: ₡${(statsES.aggregations.minimo.value || 0).toFixed(2)}`);
      console.log(`     Máximo: ₡${(statsES.aggregations.maximo.value || 0).toFixed(2)}`);

      console.log('\n   SQL Server:');
      const sqlTotal = statsSQL.recordset[0].total || 0;
      const sqlPromedio = statsSQL.recordset[0].promedio || 0;
      const sqlMinimo = statsSQL.recordset[0].minimo || 0;
      const sqlMaximo = statsSQL.recordset[0].maximo || 0;
      
      console.log(`     Total: ₡${sqlTotal.toFixed(2)}`);
      console.log(`     Promedio: ₡${sqlPromedio.toFixed(2)}`);
      console.log(`     Mínimo: ₡${sqlMinimo.toFixed(2)}`);
      console.log(`     Máximo: ₡${sqlMaximo.toFixed(2)}`);

      if (sqlTotal > 0) {
        const diffTotal = Math.abs(statsES.aggregations.total_ventas.value - sqlTotal);
        const diffPercentage = (diffTotal / sqlTotal * 100).toFixed(4);
        
        if (diffPercentage < 0.01) {
          console.log(`\n   ✅ Estadísticas coinciden (diff: ${diffPercentage}%)`);
        } else {
          console.log(`\n   ⚠️  Diferencia en totales: ${diffPercentage}%`);
        }
      } else {
        console.log(`\n   ⚠️  No hay datos en SQL Server para comparar`);
      }
    }

    // Resumen
    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║  RESUMEN DE VALIDACIÓN                     ║');
    console.log('╚════════════════════════════════════════════╝\n');

    const allMatch = diffClientes === 0 && diffOrdenes === 0 && diffProductos === 0;
    
    if (allMatch) {
      console.log('✅ Migración 100% exitosa');
      console.log('✅ Todos los registros coinciden');
      if (indices.ordenes) {
        console.log('✅ Integridad de datos verificada');
        console.log('✅ Estadísticas validadas');
      }
      console.log('\n');
    } else {
      console.log('⚠️  Revisar diferencias encontradas');
      console.log('💡 Puede ser normal si la migración está en progreso\n');
    }

  } catch (err) {
    console.error('\n❌ Error en validación:', err.message);
    if (err.meta && err.meta.body) {
      console.error('Detalles:', JSON.stringify(err.meta.body, null, 2));
    }
    throw err;
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔌 Conexión a SQL Server cerrada\n');
    }
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  validateMigration()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

export { validateMigration };
