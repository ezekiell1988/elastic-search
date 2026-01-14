// Script para construir el índice clickeat_ventas_por_cliente
// Este índice permite búsquedas por producto, ciudad, días sin compra, etc.

import esClient from '../config/elasticsearch.js';

async function buildCustomerIndex() {
    console.log('👥 Construyendo índice clickeat_ventas_por_cliente...\n');

    try {
        // 1. Obtener una muestra de clientes para ver su estructura
        console.log('🔍 Verificando estructura de clientes...');
        const sampleClientes = await esClient.search({
            index: 'clickeat_clientes',
            size: 3
        });
        
        console.log('Muestra de clientes:');
        sampleClientes.hits.hits.forEach(hit => {
            console.log(`- ID: ${hit._source.id_cliente}, Nombre: ${hit._source.nombre}, Teléfono: ${hit._source.telefono}`);
        });

        // 2. Verificar estructura de facturas
        console.log('\n🔍 Verificando estructura de facturas...');
        const sampleFacturas = await esClient.search({
            index: 'clickeat_facturas',
            size: 3
        });
        
        console.log('Muestra de facturas:');
        sampleFacturas.hits.hits.forEach(hit => {
            const f = hit._source;
            console.log(`- ID Factura: ${f.id_factura}, ID Cliente: ${f.id_cliente}, Monto: ${f.monto_total}, Fecha: ${f.fecha_facturado}`);
        });

        // 3. Crear o recrear el índice
        console.log('\n🔨 Creando índice clickeat_ventas_por_cliente...');
        const indexExists = await esClient.indices.exists({ index: 'clickeat_ventas_por_cliente' });
        if (indexExists) {
            await esClient.indices.delete({ index: 'clickeat_ventas_por_cliente' });
            console.log('✅ Índice anterior eliminado');
        }

        await esClient.indices.create({
            index: 'clickeat_ventas_por_cliente',
            mappings: {
                properties: {
                    id_cliente: { type: 'keyword' },
                    telefono: { type: 'keyword' },
                    nombre: { type: 'text', fields: { keyword: { type: 'keyword' } } },
                    correo: { type: 'keyword' },
                    id_compania: { type: 'keyword' },
                    total_ordenes: { type: 'integer' },
                    gasto_total: { type: 'float' },
                    ticket_promedio: { type: 'float' },
                    primera_compra: { type: 'date' },
                    ultima_compra: { type: 'date' },
                    dias_sin_compra: { type: 'integer' },
                    segmento: { type: 'keyword' },
                    productos_favoritos: {
                        type: 'nested',
                        properties: {
                            id_producto: { type: 'keyword' },
                            nombre: { type: 'keyword' },
                            veces_ordenado: { type: 'integer' }
                        }
                    },
                    ingredientes_favoritos: { type: 'keyword' }
                }
            }
        });
        console.log('✅ Índice creado');

        // 4. Procesar clientes en lotes pequeños
        console.log('\n📊 Procesando clientes en lotes...');
        
        // Obtener clientes con scroll para evitar timeout
        let scrollResp = await esClient.search({
            index: 'clickeat_clientes',
            scroll: '2m',
            size: 100,
            query: {
                exists: { field: 'telefono' }
            }
        });

        const bulkOps = [];
        const now = new Date();
        let processed = 0;
        let totalWithOrders = 0;

        while (scrollResp.hits.hits.length > 0) {
            for (const hit of scrollResp.hits.hits) {
                const cliente = hit._source;
                const idCliente = cliente.id_cliente;
                
                // Obtener estadísticas de facturas de este cliente
                const facturasStats = await esClient.search({
                    index: 'clickeat_facturas',
                    size: 0,
                    query: {
                        term: { id_cliente: idCliente }
                    },
                    aggs: {
                        total_ordenes: { value_count: { field: 'id_factura' } },
                        gasto_total: { sum: { field: 'monto_total' } },
                        ticket_promedio: { avg: { field: 'monto_total' } },
                        primera_compra: { min: { field: 'fecha_facturado' } },
                        ultima_compra: { max: { field: 'fecha_facturado' } }
                    }
                });

                const totalOrdenes = facturasStats.aggregations.total_ordenes.value;
                if (totalOrdenes === 0) {
                    processed++;
                    continue;
                }

                const ultimaCompra = new Date(facturasStats.aggregations.ultima_compra.value);
                const diasSinCompra = Math.floor((now - ultimaCompra) / (1000 * 60 * 60 * 24));
                const gastoTotal = facturasStats.aggregations.gasto_total.value;

                // Segmentación
                let segmento = 'ocasional';
                if (gastoTotal > 500000) {
                    segmento = diasSinCompra > 90 ? 'vip_inactivo' : 'vip';
                } else if (totalOrdenes > 20) {
                    segmento = diasSinCompra > 90 ? 'frecuente_inactivo' : 'frecuente';
                } else if (diasSinCompra > 180) {
                    segmento = 'perdido';
                } else if (diasSinCompra > 90) {
                    segmento = 'inactivo';
                }

                // Obtener IDs de facturas del cliente para luego buscar productos
                const facturasIds = await esClient.search({
                    index: 'clickeat_facturas',
                    size: 1000,
                    _source: ['id_factura'],
                    query: {
                        term: { id_cliente: idCliente }
                    }
                });

                const idsFacturas = facturasIds.hits.hits.map(h => h._source.id_factura);
                
                // Productos favoritos usando IDs de facturas
                let productosFavoritos = [];
                if (idsFacturas.length > 0) {
                    const productosResult = await esClient.search({
                        index: 'clickeat_factura_detalles',
                        size: 0,
                        query: {
                            terms: { id_factura: idsFacturas.slice(0, 100) } // Limitar a 100 facturas para evitar timeout
                        },
                        aggs: {
                            productos: {
                                terms: { field: 'id_producto', size: 5 },
                                aggs: {
                                    cantidad_total: { sum: { field: 'cantidad' } }
                                }
                            }
                        }
                    });

                    productosFavoritos = productosResult.aggregations?.productos?.buckets.map(p => ({
                        id_producto: p.key,
                        veces_ordenado: Math.round(p.cantidad_total.value)
                    })) || [];
                }

                const doc = {
                    id_cliente: idCliente,
                    telefono: cliente.telefono || '',
                    nombre: cliente.nombre || 'Cliente',
                    correo: cliente.email || '',
                    id_compania: cliente.compania?.id_compania,
                    total_ordenes: totalOrdenes,
                    gasto_total: gastoTotal,
                    ticket_promedio: facturasStats.aggregations.ticket_promedio.value,
                    primera_compra: facturasStats.aggregations.primera_compra.value_as_string,
                    ultima_compra: facturasStats.aggregations.ultima_compra.value_as_string,
                    dias_sin_compra: diasSinCompra,
                    segmento: segmento,
                    productos_favoritos: productosFavoritos
                };

                bulkOps.push({ index: { _index: 'clickeat_ventas_por_cliente', _id: idCliente } });
                bulkOps.push(doc);
                totalWithOrders++;

                // Bulk cada 50 registros
                if (bulkOps.length >= 100) {
                    await esClient.bulk({ body: bulkOps, refresh: false });
                    bulkOps.length = 0;
                }

                processed++;
                if (processed % 100 === 0) {
                    process.stdout.write(`\r📝 Procesados: ${processed} clientes (${totalWithOrders} con órdenes)`);
                }
            }

            // Siguiente lote
            scrollResp = await esClient.scroll({
                scroll_id: scrollResp._scroll_id,
                scroll: '2m'
            });
        }

        // Bulk final
        if (bulkOps.length > 0) {
            await esClient.bulk({ body: bulkOps, refresh: true });
        }

        console.log(`\n\n✅ ${totalWithOrders} clientes con órdenes indexados correctamente (de ${processed} procesados)`);
        
        // Verificar resultado
        const count = await esClient.count({ index: 'clickeat_ventas_por_cliente' });
        console.log(`📊 Total documentos en índice: ${count.count}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    }
}

buildCustomerIndex();
