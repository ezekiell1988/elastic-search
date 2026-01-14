import esClient from '../config/elasticsearch.js';

/**
 * Script de ejemplo para consultar los datos migrados de ClickEat
 */

async function ejemplosConsultas() {
  console.log('🔍 EJEMPLOS DE CONSULTAS - DATOS CLICKEAT\n');
  console.log('═'.repeat(50));
  
  try {
    // 1. Contar clientes
    console.log('\n📊 1. Total de clientes migrados:');
    const countClientes = await esClient.count({
      index: 'clickeat_clientes_v2'
    });
    console.log(`   Total: ${countClientes.count} clientes`);

    // 2. Contar órdenes
    console.log('\n📊 2. Total de órdenes migradas:');
    const countOrdenes = await esClient.count({
      index: 'clickeat_ordenes_v2'
    });
    console.log(`   Total: ${countOrdenes.count} órdenes`);

    // 3. Primeros 5 clientes
    console.log('\n👥 3. Primeros 5 clientes:');
    const clientes = await esClient.search({
      index: 'clickeat_clientes_v2',
      body: {
        size: 5,
        sort: [{ id_cliente: 'desc' }]
      }
    });
    clientes.hits.hits.forEach(hit => {
      const c = hit._source;
      console.log(`   - ${c.nombre} (${c.correo}) - Tel: ${c.telefono}`);
    });

    // 4. Órdenes recientes
    console.log('\n🧾 4. Últimas 5 órdenes:');
    const ordenes = await esClient.search({
      index: 'clickeat_ordenes_v2',
      body: {
        size: 5,
        sort: [{ fecha_facturado: 'desc' }]
      }
    });
    ordenes.hits.hits.forEach(hit => {
      const o = hit._source;
      const fecha = new Date(o.fecha_facturado).toLocaleDateString('es-CR');
      console.log(`   - Orden #${o.id_factura}: ${o.nombre_cliente} - ₡${o.monto_total} (${fecha})`);
    });

    // 5. Clientes activos
    console.log('\n✅ 5. Clientes activos:');
    const clientesActivos = await esClient.count({
      index: 'clickeat_clientes_v2',
      body: {
        query: {
          term: { estado: 1 }
        }
      }
    });
    console.log(`   Total: ${clientesActivos.count} clientes activos`);

    // 6. Órdenes pagadas
    console.log('\n💰 6. Órdenes pagadas:');
    const ordenesPagadas = await esClient.count({
      index: 'clickeat_ordenes_v2',
      body: {
        query: {
          term: { pagado: true }
        }
      }
    });
    console.log(`   Total: ${ordenesPagadas.count} órdenes pagadas`);

    // 7. Estadísticas de ventas
    console.log('\n📈 7. Estadísticas de ventas:');
    const stats = await esClient.search({
      index: 'clickeat_ordenes_v2',
      body: {
        size: 0,
        aggs: {
          total_ventas: { sum: { field: 'monto_total' } },
          promedio_orden: { avg: { field: 'monto_total' } },
          orden_minima: { min: { field: 'monto_total' } },
          orden_maxima: { max: { field: 'monto_total' } }
        }
      }
    });
    const aggs = stats.aggregations;
    console.log(`   Total ventas: ₡${aggs.total_ventas.value.toFixed(2)}`);
    console.log(`   Promedio por orden: ₡${aggs.promedio_orden.value.toFixed(2)}`);
    console.log(`   Orden mínima: ₡${aggs.orden_minima.value.toFixed(2)}`);
    console.log(`   Orden máxima: ₡${aggs.orden_maxima.value.toFixed(2)}`);

    // 8. Buscar clientes por nombre
    console.log('\n🔍 8. Buscar clientes que contengan "click":');
    const busqueda = await esClient.search({
      index: 'clickeat_clientes_v2',
      body: {
        size: 5,
        query: {
          match: {
            nombre: 'click'
          }
        }
      }
    });
    console.log(`   Encontrados: ${busqueda.hits.total.value} clientes`);
    busqueda.hits.hits.slice(0, 3).forEach(hit => {
      const c = hit._source;
      console.log(`   - ${c.nombre} (${c.correo})`);
    });

    // 9. Órdenes por rango de monto
    console.log('\n💵 9. Órdenes entre ₡500 y ₡1000:');
    const ordenesPorMonto = await esClient.count({
      index: 'clickeat_ordenes_v2',
      body: {
        query: {
          range: {
            monto_total: {
              gte: 500,
              lte: 1000
            }
          }
        }
      }
    });
    console.log(`   Total: ${ordenesPorMonto.count} órdenes`);

    // 10. Órdenes del último mes
    console.log('\n📅 10. Órdenes del último mes:');
    const unMesAtras = new Date();
    unMesAtras.setMonth(unMesAtras.getMonth() - 1);
    const ordenesRecientes = await esClient.count({
      index: 'clickeat_ordenes_v2',
      body: {
        query: {
          range: {
            fecha_facturado: {
              gte: unMesAtras.toISOString()
            }
          }
        }
      }
    });
    console.log(`   Total: ${ordenesRecientes.count} órdenes`);

    console.log('\n' + '═'.repeat(50));
    console.log('✅ Consultas completadas exitosamente\n');

  } catch (error) {
    console.error('❌ Error ejecutando consultas:', error.message);
    throw error;
  }
}

// Función para buscar clientes específicos
async function buscarCliente(termino) {
  console.log(`\n🔍 Buscando clientes: "${termino}"\n`);
  
  const result = await esClient.search({
    index: 'clickeat_clientes_v2',
    body: {
      query: {
        multi_match: {
          query: termino,
          fields: ['nombre', 'correo', 'telefono']
        }
      }
    }
  });

  console.log(`Encontrados: ${result.hits.total.value} clientes\n`);
  
  result.hits.hits.forEach((hit, index) => {
    const c = hit._source;
    console.log(`${index + 1}. ${c.nombre}`);
    console.log(`   Email: ${c.correo}`);
    console.log(`   Tel: ${c.telefono}`);
    console.log(`   Estado: ${c.estado === 1 ? 'Activo' : 'Inactivo'}`);
    console.log('');
  });
}

// Función para obtener órdenes de un cliente
async function ordenesDeCliente(idCliente) {
  console.log(`\n🧾 Órdenes del cliente #${idCliente}\n`);
  
  const result = await esClient.search({
    index: 'clickeat_ordenes_v2',
    body: {
      query: {
        term: { id_cliente: idCliente }
      },
      sort: [{ fecha_facturado: 'desc' }]
    }
  });

  console.log(`Total órdenes: ${result.hits.total.value}\n`);
  
  result.hits.hits.forEach((hit, index) => {
    const o = hit._source;
    const fecha = new Date(o.fecha_facturado).toLocaleDateString('es-CR');
    console.log(`${index + 1}. Orden #${o.id_factura} - ${fecha}`);
    console.log(`   Monto: ₡${o.monto_total}`);
    console.log(`   Estado: ${o.estado_factura}`);
    console.log(`   Pagado: ${o.pagado ? 'Sí' : 'No'}`);
    console.log('');
  });
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const comando = process.argv[2];
  const parametro = process.argv[3];

  (async () => {
    try {
      if (comando === 'buscar' && parametro) {
        await buscarCliente(parametro);
      } else if (comando === 'ordenes' && parametro) {
        await ordenesDeCliente(parseInt(parametro));
      } else {
        await ejemplosConsultas();
      }
      process.exit(0);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  })();
}

export { ejemplosConsultas, buscarCliente, ordenesDeCliente };
