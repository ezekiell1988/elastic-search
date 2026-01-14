#!/usr/bin/env node

/**
 * CONSULTAS PARA REACTIVACIÓN DE CLIENTES
 * 
 * Este script permite identificar clientes para campañas de reactivación
 * basándose en su última compra y días de inactividad.
 */

import esClient from '../config/elasticsearch.js';

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

/**
 * Detecta qué índices están disponibles
 */
async function detectIndices() {
  // Buscar primero los índices _v2 (de migrate-simple)
  const indexPatterns = ['clickeat_ordenes_v2', 'clickeat_ordenes'];
  
  for (const pattern of indexPatterns) {
    try {
      const exists = await esClient.indices.exists({ index: pattern });
      if (exists) {
        // Verificar que tenga datos
        const count = await esClient.count({ index: pattern });
        if (count.count > 0) {
          return { ordenes: pattern, found: true };
        }
      }
    } catch (error) {
      // Continuar con el siguiente patrón
    }
  }
  
  return { ordenes: null, found: false };
}

/**
 * Formatea una fecha en formato legible
 */
function formatDate(date) {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleDateString('es-CR', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Calcula días entre dos fechas
 */
function daysBetween(date1, date2) {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((date1 - date2) / oneDay));
}

/**
 * 1. Última compra por cliente (Top 10)
 */
async function queryUltimaCompraPorCliente(ordenesIndex) {
  console.log(`\n${colors.bright}${colors.blue}═══════════════════════════════════════════════════════════`);
  console.log('📅 1. ÚLTIMA COMPRA POR CLIENTE (Top 10)');
  console.log(`═══════════════════════════════════════════════════════════${colors.reset}\n`);

  const response = await esClient.search({
    index: ordenesIndex,
    body: {
      size: 0,
      aggs: {
        clientes: {
          terms: {
            field: 'id_cliente',
            size: 10,
            order: { ultima_compra: 'desc' }
          },
          aggs: {
            ultima_compra: {
              max: { field: 'fecha_facturado' }
            },
            total_ordenes: {
              value_count: { field: 'id_orden' }
            },
            total_gastado: {
              sum: { field: 'monto_total' }
            },
            nombre: {
              top_hits: {
                size: 1,
                _source: ['nombre_cliente', 'correo', 'telefono']
              }
            }
          }
        }
      }
    }
  });

  const ahora = new Date();
  
  console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ Cliente ID │ Nombre               │ Última Compra    │ Días │ Órdenes │ Total  │');
  console.log('├─────────────────────────────────────────────────────────────────────────────┤');

  response.aggregations.clientes.buckets.forEach(bucket => {
    const clienteId = bucket.key.toString().padEnd(10);
    const info = bucket.nombre.hits.hits[0]._source;
    const nombre = (info.nombre_cliente || 'Sin nombre').substring(0, 20).padEnd(20);
    const ultimaCompra = new Date(bucket.ultima_compra.value);
    const fecha = ultimaCompra.toLocaleDateString('es-CR').padEnd(16);
    const diasInactivo = daysBetween(ahora, ultimaCompra).toString().padStart(4);
    const ordenes = bucket.total_ordenes.value.toString().padStart(7);
    const total = `₡${bucket.total_gastado.value.toFixed(0)}`.padStart(6);
    
    // Colorear según días de inactividad
    let colorDias = colors.green;
    if (diasInactivo > 90) colorDias = colors.red;
    else if (diasInactivo > 30) colorDias = colors.yellow;
    
    console.log(`│ ${clienteId} │ ${nombre} │ ${fecha} │ ${colorDias}${diasInactivo}${colors.reset} │ ${ordenes} │ ${total} │`);
  });

  console.log('└─────────────────────────────────────────────────────────────────────────────┘\n');
  
  return response.aggregations.clientes.buckets;
}

/**
 * 2. Clientes inactivos por rango de días
 */
async function queryClientesInactivos(ordenesIndex, diasMinimo = 30) {
  console.log(`\n${colors.bright}${colors.yellow}═══════════════════════════════════════════════════════════`);
  console.log(`⚠️  2. CLIENTES INACTIVOS (Más de ${diasMinimo} días)`);
  console.log(`═══════════════════════════════════════════════════════════${colors.reset}\n`);

  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() - diasMinimo);

  const response = await esClient.search({
    index: ordenesIndex,
    body: {
      size: 0,
      aggs: {
        clientes_inactivos: {
          terms: {
            field: 'id_cliente',
            size: 100
          },
          aggs: {
            ultima_compra: {
              max: { field: 'fecha_facturado' }
            },
            filtrar_inactivos: {
              bucket_selector: {
                buckets_path: {
                  ultima: 'ultima_compra'
                },
                script: `params.ultima < ${fechaLimite.getTime()}L`
              }
            },
            total_historico: {
              sum: { field: 'monto_total' }
            },
            num_ordenes: {
              value_count: { field: 'id_orden' }
            },
            info: {
              top_hits: {
                size: 1,
                _source: ['nombre_cliente', 'correo', 'telefono']
              }
            }
          }
        }
      }
    }
  });

  const ahora = new Date();
  const clientesInactivos = response.aggregations.clientes_inactivos.buckets;

  console.log(`Total de clientes inactivos: ${colors.bright}${clientesInactivos.length}${colors.reset}\n`);
  
  console.log('┌──────────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ ID      │ Nombre               │ Última Compra    │ Días │ Órdenes │ Gasto Total │');
  console.log('├──────────────────────────────────────────────────────────────────────────────────┤');

  // Ordenar por días de inactividad (más días primero)
  clientesInactivos
    .sort((a, b) => a.ultima_compra.value - b.ultima_compra.value)
    .slice(0, 20) // Top 20
    .forEach(bucket => {
      const clienteId = bucket.key.toString().substring(0, 7).padEnd(7);
      const info = bucket.info.hits.hits[0]._source;
      const nombre = (info.nombre_cliente || 'Sin nombre').substring(0, 20).padEnd(20);
      const ultimaCompra = new Date(bucket.ultima_compra.value);
      const fecha = ultimaCompra.toLocaleDateString('es-CR').padEnd(16);
      const diasInactivo = daysBetween(ahora, ultimaCompra);
      const dias = diasInactivo.toString().padStart(4);
      const ordenes = bucket.num_ordenes.value.toString().padStart(7);
      const total = `₡${bucket.total_historico.value.toFixed(0)}`.padStart(11);
      
      // Colorear según nivel de urgencia
      let colorDias = colors.yellow;
      if (diasInactivo > 180) colorDias = colors.red;
      else if (diasInactivo > 90) colorDias = colors.yellow;
      
      console.log(`│ ${clienteId} │ ${nombre} │ ${fecha} │ ${colorDias}${dias}${colors.reset} │ ${ordenes} │ ${total} │`);
    });

  console.log('└──────────────────────────────────────────────────────────────────────────────────┘\n');
  
  return clientesInactivos;
}

/**
 * 3. Segmentación de clientes por nivel de actividad
 */
async function querySegmentacionClientes(ordenesIndex) {
  console.log(`\n${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════`);
  console.log('📊 3. SEGMENTACIÓN DE CLIENTES POR ACTIVIDAD');
  console.log(`═══════════════════════════════════════════════════════════${colors.reset}\n`);

  const ahora = new Date();
  const hace30dias = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000);
  const hace90dias = new Date(ahora.getTime() - 90 * 24 * 60 * 60 * 1000);
  const hace180dias = new Date(ahora.getTime() - 180 * 24 * 60 * 60 * 1000);

  const response = await esClient.search({
    index: ordenesIndex,
    body: {
      size: 0,
      aggs: {
        clientes_activos: {
          filter: {
            range: {
              fecha_facturado: { gte: hace30dias.toISOString() }
            }
          },
          aggs: {
            clientes_unicos: {
              cardinality: { field: 'id_cliente' }
            },
            total_ventas: {
              sum: { field: 'monto_total' }
            }
          }
        },
        clientes_riesgo: {
          filter: {
            range: {
              fecha_facturado: { 
                gte: hace90dias.toISOString(),
                lt: hace30dias.toISOString()
              }
            }
          },
          aggs: {
            clientes_unicos: {
              cardinality: { field: 'id_cliente' }
            },
            total_ventas: {
              sum: { field: 'monto_total' }
            }
          }
        },
        clientes_inactivos: {
          filter: {
            range: {
              fecha_facturado: { 
                gte: hace180dias.toISOString(),
                lt: hace90dias.toISOString()
              }
            }
          },
          aggs: {
            clientes_unicos: {
              cardinality: { field: 'id_cliente' }
            }
          }
        },
        clientes_perdidos: {
          filter: {
            range: {
              fecha_facturado: { 
                lt: hace180dias.toISOString()
              }
            }
          },
          aggs: {
            clientes_unicos: {
              cardinality: { field: 'id_cliente' }
            }
          }
        }
      }
    }
  });

  const aggs = response.aggregations;

  console.log('┌────────────────────────────────────────────────────────────┐');
  console.log('│ Segmento              │ Clientes │ Total Ventas (30d)    │');
  console.log('├────────────────────────────────────────────────────────────┤');
  
  const activos = aggs.clientes_activos.clientes_unicos.value.toString().padStart(8);
  const ventasActivos = `₡${aggs.clientes_activos.total_ventas.value.toFixed(0)}`.padStart(21);
  console.log(`│ ${colors.green}🟢 Activos (0-30d)${colors.reset}     │ ${activos} │ ${ventasActivos} │`);
  
  const riesgo = aggs.clientes_riesgo.clientes_unicos.value.toString().padStart(8);
  const ventasRiesgo = `₡${aggs.clientes_riesgo.total_ventas.value.toFixed(0)}`.padStart(21);
  console.log(`│ ${colors.yellow}🟡 En Riesgo (30-90d)${colors.reset}  │ ${riesgo} │ ${ventasRiesgo} │`);
  
  const inactivos = aggs.clientes_inactivos.clientes_unicos.value.toString().padStart(8);
  console.log(`│ ${colors.red}🔴 Inactivos (90-180d)${colors.reset} │ ${inactivos} │ ${'N/A'.padStart(21)} │`);
  
  const perdidos = aggs.clientes_perdidos.clientes_unicos.value.toString().padStart(8);
  console.log(`│ ${colors.red}⚫ Perdidos (+180d)${colors.reset}     │ ${perdidos} │ ${'N/A'.padStart(21)} │`);
  
  console.log('└────────────────────────────────────────────────────────────┘\n');

  // Recomendaciones
  console.log(`${colors.bright}💡 RECOMENDACIONES:${colors.reset}\n`);
  
  if (aggs.clientes_riesgo.clientes_unicos.value > 0) {
    console.log(`   • ${colors.yellow}Campaña de retención${colors.reset}: ${aggs.clientes_riesgo.clientes_unicos.value} clientes en riesgo`);
    console.log(`     Descuentos del 15-20% en próxima compra\n`);
  }
  
  if (aggs.clientes_inactivos.clientes_unicos.value > 0) {
    console.log(`   • ${colors.red}Campaña de reactivación${colors.reset}: ${aggs.clientes_inactivos.clientes_unicos.value} clientes inactivos`);
    console.log(`     Cupones especiales + recordatorio de productos favoritos\n`);
  }
  
  if (aggs.clientes_perdidos.clientes_unicos.value > 0) {
    console.log(`   • ${colors.red}Campaña de reconquista${colors.reset}: ${aggs.clientes_perdidos.clientes_unicos.value} clientes perdidos`);
    console.log(`     Encuesta de satisfacción + incentivo fuerte (30-40% descuento)\n`);
  }

  return aggs;
}

/**
 * 4. Top clientes por valor histórico con días de inactividad
 */
async function queryTopClientesPorValor(ordenesIndex, limit = 20) {
  console.log(`\n${colors.bright}${colors.green}═══════════════════════════════════════════════════════════`);
  console.log(`💰 4. TOP ${limit} CLIENTES POR VALOR (Con estado de actividad)`);
  console.log(`═══════════════════════════════════════════════════════════${colors.reset}\n`);

  const response = await esClient.search({
    index: ordenesIndex,
    body: {
      size: 0,
      aggs: {
        top_clientes: {
          terms: {
            field: 'id_cliente',
            size: limit,
            order: { total_gastado: 'desc' }
          },
          aggs: {
            total_gastado: {
              sum: { field: 'monto_total' }
            },
            num_ordenes: {
              value_count: { field: 'id_orden' }
            },
            ticket_promedio: {
              avg: { field: 'monto_total' }
            },
            primera_compra: {
              min: { field: 'fecha_facturado' }
            },
            ultima_compra: {
              max: { field: 'fecha_facturado' }
            },
            info: {
              top_hits: {
                size: 1,
                _source: ['nombre_cliente', 'correo', 'telefono']
              }
            }
          }
        }
      }
    }
  });

  const ahora = new Date();

  console.log('┌───────────────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ ID    │ Nombre          │ Total Gastado │ Órdenes │ Ticket Avg │ Últ.Compra │ Días │');
  console.log('├───────────────────────────────────────────────────────────────────────────────────────┤');

  response.aggregations.top_clientes.buckets.forEach((bucket, index) => {
    const rank = (index + 1).toString().padStart(2);
    const clienteId = bucket.key.toString().substring(0, 5).padEnd(5);
    const info = bucket.info.hits.hits[0]._source;
    const nombre = (info.nombre_cliente || 'Sin nombre').substring(0, 15).padEnd(15);
    const totalGastado = `₡${bucket.total_gastado.value.toFixed(0)}`.padStart(13);
    const ordenes = bucket.num_ordenes.value.toString().padStart(7);
    const ticketAvg = `₡${bucket.ticket_promedio.value.toFixed(0)}`.padStart(10);
    const ultimaCompra = new Date(bucket.ultima_compra.value);
    const fecha = ultimaCompra.toLocaleDateString('es-CR').substring(0, 10).padEnd(10);
    const diasInactivo = daysBetween(ahora, ultimaCompra);
    const dias = diasInactivo.toString().padStart(4);
    
    // Colorear según estado
    let estado = colors.green;
    if (diasInactivo > 90) estado = colors.red;
    else if (diasInactivo > 30) estado = colors.yellow;
    
    console.log(`│ ${rank}.${clienteId} │ ${nombre} │ ${totalGastado} │ ${ordenes} │ ${ticketAvg} │ ${fecha} │ ${estado}${dias}${colors.reset} │`);
  });

  console.log('└───────────────────────────────────────────────────────────────────────────────────────┘\n');

  return response.aggregations.top_clientes.buckets;
}

/**
 * 5. Clientes VIP en riesgo (alto valor pero inactivos)
 */
async function queryVIPEnRiesgo(ordenesIndex) {
  console.log(`\n${colors.bright}${colors.red}═══════════════════════════════════════════════════════════`);
  console.log('🚨 5. CLIENTES VIP EN RIESGO (Alto valor + Inactivos)');
  console.log(`═══════════════════════════════════════════════════════════${colors.reset}\n`);

  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() - 45); // 45 días sin comprar

  const response = await esClient.search({
    index: ordenesIndex,
    body: {
      size: 0,
      aggs: {
        todos_clientes: {
          terms: {
            field: 'id_cliente',
            size: 1000
          },
          aggs: {
            total_gastado: {
              sum: { field: 'monto_total' }
            },
            num_ordenes: {
              value_count: { field: 'id_orden' }
            },
            ultima_compra: {
              max: { field: 'fecha_facturado' }
            },
            filtrar_vip_riesgo: {
              bucket_selector: {
                buckets_path: {
                  total: 'total_gastado',
                  ultima: 'ultima_compra'
                },
                script: `params.total > 500000 && params.ultima < ${fechaLimite.getTime()}L`
              }
            },
            info: {
              top_hits: {
                size: 1,
                _source: ['nombre_cliente', 'correo', 'telefono']
              }
            }
          }
        }
      }
    }
  });

  const ahora = new Date();
  const vipsEnRiesgo = response.aggregations.todos_clientes.buckets;

  console.log(`Total de VIPs en riesgo: ${colors.bright}${colors.red}${vipsEnRiesgo.length}${colors.reset}\n`);

  if (vipsEnRiesgo.length === 0) {
    console.log(`${colors.green}✅ No hay clientes VIP en riesgo actualmente${colors.reset}\n`);
    return [];
  }

  console.log('┌─────────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ ID      │ Nombre               │ Total Gastado │ Órdenes │ Días sin comprar │');
  console.log('├─────────────────────────────────────────────────────────────────────────────────┤');

  vipsEnRiesgo
    .sort((a, b) => b.total_gastado.value - a.total_gastado.value)
    .slice(0, 15)
    .forEach(bucket => {
      const clienteId = bucket.key.toString().substring(0, 7).padEnd(7);
      const info = bucket.info.hits.hits[0]._source;
      const nombre = (info.nombre_cliente || 'Sin nombre').substring(0, 20).padEnd(20);
      const totalGastado = `₡${bucket.total_gastado.value.toFixed(0)}`.padStart(13);
      const ordenes = bucket.num_ordenes.value.toString().padStart(7);
      const ultimaCompra = new Date(bucket.ultima_compra.value);
      const diasInactivo = daysBetween(ahora, ultimaCompra);
      const dias = diasInactivo.toString().padStart(16);
      
      console.log(`│ ${clienteId} │ ${nombre} │ ${totalGastado} │ ${ordenes} │ ${colors.red}${dias}${colors.reset} │`);
    });

  console.log('└─────────────────────────────────────────────────────────────────────────────────┘\n');

  console.log(`${colors.bright}🎯 ACCIÓN INMEDIATA:${colors.reset}`);
  console.log(`   • Contacto personalizado por gerente de cuenta`);
  console.log(`   • Descuento VIP exclusivo del 30%`);
  console.log(`   • Regalo especial en próxima compra\n`);

  return vipsEnRiesgo;
}

/**
 * Función principal
 */
async function main() {
  try {
    console.log(`\n${colors.bright}${colors.cyan}╔══════════════════════════════════════════════════════════════╗`);
    console.log('║                                                              ║');
    console.log('║       📊 ANÁLISIS DE REACTIVACIÓN DE CLIENTES 📊           ║');
    console.log('║                   ClickEat Database                          ║');
    console.log('║                                                              ║');
    console.log(`╚══════════════════════════════════════════════════════════════╝${colors.reset}\n`);

    // Detectar índices disponibles
    console.log('🔍 Detectando índices disponibles...');
    const indices = await detectIndices();
    
    if (!indices.found) {
      console.log(`\n${colors.red}❌ Error: No se encontraron índices de órdenes${colors.reset}`);
      console.log('\n💡 Ejecuta primero la migración:');
      console.log('   npm run migrate:simple   (migración de prueba)');
      console.log('   npm run migrate:full     (migración completa)\n');
      process.exit(1);
    }

    console.log(`✅ Usando índice: ${colors.bright}${indices.ordenes}${colors.reset}\n`);

    // Ejecutar todas las consultas
    await queryUltimaCompraPorCliente(indices.ordenes);
    await queryClientesInactivos(indices.ordenes, 30);
    await querySegmentacionClientes(indices.ordenes);
    await queryTopClientesPorValor(indices.ordenes, 20);
    await queryVIPEnRiesgo(indices.ordenes);

    console.log(`\n${colors.bright}${colors.green}✅ Análisis completado exitosamente${colors.reset}\n`);

  } catch (error) {
    console.error(`\n${colors.red}❌ Error:${colors.reset}`, error.message);
    if (error.meta) {
      console.error('Detalles:', JSON.stringify(error.meta.body, null, 2));
    }
    process.exit(1);
  }
}

// Ejecutar solo si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  queryUltimaCompraPorCliente,
  queryClientesInactivos,
  querySegmentacionClientes,
  queryTopClientesPorValor,
  queryVIPEnRiesgo
};
