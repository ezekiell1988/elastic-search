// 🔄 Sistema de Sincronización Incremental ClickEat
// Detecta cambios desde la última sincronización y actualiza solo registros nuevos/modificados

import sql from 'mssql';
import esClient from '../config/elasticsearch.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de SQL Server
const sqlConfig = {
    server: process.env.DB_HOST_CLICKEAT,
    database: process.env.DB_DATABASE_CLICKEAT,
    user: process.env.DB_USER_CLICKEAT,
    password: process.env.DB_PASSWORD_CLICKEAT,
    port: parseInt(process.env.DB_PORT_CLICKEAT || '1433'),
    options: {
        encrypt: true,
        trustServerCertificate: true,
        enableArithAbort: true,
        requestTimeout: 60000
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

class SyncManager {
    constructor() {
        this.checkpointFile = '.sync-checkpoint.json';
        this.checkpoint = this.loadCheckpoint();
        this.sqlPool = null;
    }

    // 🔌 Conectar a SQL Server
    async connectSQL() {
        if (!this.sqlPool) {
            try {
                this.sqlPool = await sql.connect(sqlConfig);
                console.log('✅ Conexión SQL establecida');
            } catch (error) {
                console.error('❌ Error conectando a SQL:', error);
                throw error;
            }
        }
        return this.sqlPool;
    }

    // 🔌 Cerrar conexión SQL
    async disconnectSQL() {
        if (this.sqlPool) {
            await this.sqlPool.close();
            this.sqlPool = null;
            console.log('🔌 Conexión SQL cerrada');
        }
    }

    // 📁 Cargar checkpoint de sincronización
    loadCheckpoint() {
        try {
            if (fs.existsSync(this.checkpointFile)) {
                return JSON.parse(fs.readFileSync(this.checkpointFile, 'utf8'));
            }
        } catch (error) {
            console.warn('⚠️  No se pudo cargar checkpoint:', error.message);
        }
        
        return this.getDefaultCheckpoint();
    }

    // 🎯 Estructura por defecto del checkpoint
    getDefaultCheckpoint() {
        return {
            version: "1.0",
            last_full_sync: null,
            last_incremental_sync: null,
            tables: {
                tbClientes: {
                    sync_method: "date_field",
                    date_field: "FechaCreacion",
                    last_sync: null,
                    last_max_id: 0,
                    records_added: 0,
                    records_updated: 0
                },
                tbClientesDireccion: {
                    sync_method: "client_relation",
                    depends_on: "tbClientes",
                    last_sync: null,
                    last_max_id: 0,
                    records_added: 0,
                    records_updated: 0
                },
                tbFactura: {
                    sync_method: "date_field",
                    date_field: "Fecha_facturado",
                    filter: "Pagado = 1",
                    last_sync: null,
                    last_fecha: null,
                    records_added: 0,
                    records_updated: 0
                },
                tbFacturaDetalle: {
                    sync_method: "factura_relation",
                    depends_on: "tbFactura",
                    last_sync: null,
                    records_added: 0,
                    records_updated: 0
                },
                tbFacturaIngredientes: {
                    sync_method: "factura_relation",
                    depends_on: "tbFactura",
                    last_sync: null,
                    records_added: 0,
                    records_updated: 0
                },
                tbCatalogo: {
                    sync_method: "max_id",
                    last_sync: null,
                    last_max_id: 0,
                    records_added: 0,
                    records_updated: 0
                },
                tbCompania: {
                    sync_method: "max_id",
                    last_sync: null,
                    last_max_id: 0,
                    records_added: 0,
                    records_updated: 0
                },
                tbRestaurantes: {
                    sync_method: "max_id",
                    last_sync: null,
                    last_max_id: 0,
                    records_added: 0,
                    records_updated: 0
                }
            },
            aggregated_indexes: {
                clickeat_ventas_por_producto: {
                    last_rebuild: null,
                    records_processed: 0,
                    products_updated: 0
                },
                clickeat_ventas_por_restaurante: {
                    last_rebuild: null,
                    records_processed: 0,
                    restaurants_updated: 0
                },
                clickeat_ventas_por_cliente: {
                    last_rebuild: null,
                    records_processed: 0,
                    clients_updated: 0
                },
                clickeat_ventas_por_telefono: {
                    last_rebuild: null,
                    records_processed: 0,
                    phones_updated: 0
                }
            }
        };
    }

    // 💾 Guardar checkpoint
    saveCheckpoint() {
        try {
            fs.writeFileSync(this.checkpointFile, JSON.stringify(this.checkpoint, null, 2));
            console.log('✅ Checkpoint guardado correctamente');
        } catch (error) {
            console.error('❌ Error guardando checkpoint:', error);
        }
    }

    // 🔍 Detectar cambios en todas las tablas
    async detectChanges() {
        console.log('🔍 Detectando cambios desde la última sincronización...\n');
        
        // Conectar a SQL
        await this.connectSQL();
        
        const changes = {
            total_new_records: 0,
            tables_with_changes: [],
            estimated_sync_time: '0 min'
        };

        try {
            // Detectar cambios por tabla
            for (const [tableName, config] of Object.entries(this.checkpoint.tables)) {
                const tableChanges = await this.detectTableChanges(tableName, config);
                
                if (tableChanges.new_records > 0) {
                    changes.tables_with_changes.push({
                        table: tableName,
                        new_records: tableChanges.new_records,
                        method: config.sync_method
                    });
                    changes.total_new_records += tableChanges.new_records;
                }
            }

            // Estimar tiempo de sincronización (50 registros/segundo)
            const estimatedSeconds = Math.ceil(changes.total_new_records / 50);
            changes.estimated_sync_time = estimatedSeconds < 60 ? 
                `${estimatedSeconds} seg` : 
                `${Math.ceil(estimatedSeconds / 60)} min`;

        } finally {
            await this.disconnectSQL();
        }

        return changes;
    }

    // 🔍 Detectar cambios en una tabla específica
    async detectTableChanges(tableName, config) {
        try {
            let query = '';
            let params = {};

            switch (config.sync_method) {
                case 'date_field':
                    if (tableName === 'tbClientes') {
                        query = `
                            SELECT COUNT(*) as nuevos
                            FROM tbClientes
                            WHERE FechaCreacion > @lastSync OR FechaCreacion IS NULL
                        `;
                        params.lastSync = config.last_sync || '1900-01-01';
                    } else if (tableName === 'tbFactura') {
                        query = `
                            SELECT COUNT(*) as nuevos
                            FROM tbFactura
                            WHERE Pagado = 1 
                              AND Fecha_facturado IS NOT NULL
                              AND Fecha_facturado > @lastSync
                        `;
                        params.lastSync = config.last_sync || '1900-01-01';
                    }
                    break;

                case 'max_id':
                    if (tableName === 'tbCatalogo') {
                        query = `
                            SELECT COUNT(*) as nuevos
                            FROM tbCatalogo
                            WHERE Id_producto > @lastMaxId
                        `;
                        params.lastMaxId = config.last_max_id || 0;
                    } else if (tableName === 'tbCompania') {
                        query = `
                            SELECT COUNT(*) as nuevos
                            FROM tbCompania
                            WHERE Id_compania > @lastMaxId
                        `;
                        params.lastMaxId = config.last_max_id || 0;
                    } else if (tableName === 'tbRestaurantes') {
                        query = `
                            SELECT COUNT(*) as nuevos
                            FROM tbRestaurantes
                            WHERE Id_restaurante > @lastMaxId
                        `;
                        params.lastMaxId = config.last_max_id || 0;
                    }
                    break;

                case 'client_relation':
                case 'factura_relation':
                    // Estas tablas dependen de otras, calcular basado en dependencia
                    return { new_records: 0 }; // Se calculará cuando se sincronicen las tablas padre
            }

            if (query) {
                const request = new sql.Request();
                
                // Agregar parámetros
                Object.keys(params).forEach(key => {
                    request.input(key, params[key]);
                });

                const result = await request.query(query);
                return { new_records: result.recordset[0].nuevos };
            }

        } catch (error) {
            console.error(`❌ Error detectando cambios en ${tableName}:`, error);
        }

        return { new_records: 0 };
    }

    // 📊 Mostrar resumen de cambios
    async showChangesSummary() {
        const changes = await this.detectChanges();
        
        console.log('📊 RESUMEN DE CAMBIOS DETECTADOS\n');
        console.log(`🔢 Total nuevos registros: ${changes.total_new_records.toLocaleString()}`);
        console.log(`⏱️  Tiempo estimado sync: ${changes.estimated_sync_time}`);
        
        if (changes.tables_with_changes.length > 0) {
            console.log('\n📋 TABLAS CON CAMBIOS:');
            changes.tables_with_changes.forEach(table => {
                console.log(`   📁 ${table.table}: ${table.new_records.toLocaleString()} nuevos (${table.method})`);
            });
        } else {
            console.log('\n✅ No hay cambios pendientes de sincronización');
        }

        console.log('\n📅 ÚLTIMA SINCRONIZACIÓN:');
        console.log(`   🔄 Completa: ${this.checkpoint.last_full_sync || 'Nunca'}`);
        console.log(`   ⚡ Incremental: ${this.checkpoint.last_incremental_sync || 'Nunca'}`);

        return changes;
    }

    // 🚀 Ejecutar sincronización incremental
    async syncIncremental(tableName = null) {
        console.log('🚀 Iniciando sincronización incremental...\n');
        
        const syncStart = new Date();
        let totalProcessed = 0;

        try {
            // Si se especifica tabla, sincronizar solo esa
            if (tableName) {
                totalProcessed = await this.syncTable(tableName);
            } else {
                // Sincronizar todas las 8 tablas principales
                const tableOrder = [
                    'tbClientes',           // 773,700 registros
                    'tbClientesDireccion',  // ~1.5M registros (direcciones por cliente)
                    'tbFactura',            // 879,962 registros pagados
                    'tbFacturaDetalle',     // ~5M registros (productos de factura)
                    'tbFacturaIngredientes',// ~500K registros (ingredientes por producto)
                    'tbCatalogo',           // 2,427 productos
                    'tbCompania',           // ~100 registros
                    'tbRestaurantes'        // ~500 registros
                ];

                for (const table of tableOrder) {
                    const processed = await this.syncTable(table);
                    totalProcessed += processed;
                }
            }

            // Actualizar checkpoint general
            this.checkpoint.last_incremental_sync = syncStart.toISOString();
            this.saveCheckpoint();

            const syncEnd = new Date();
            const duration = Math.round((syncEnd - syncStart) / 1000);

            console.log(`\n✅ SINCRONIZACIÓN COMPLETADA`);
            console.log(`📊 Registros procesados: ${totalProcessed.toLocaleString()}`);
            console.log(`⏱️  Tiempo total: ${duration} segundos`);

        } catch (error) {
            console.error('❌ Error en sincronización incremental:', error);
            throw error;
        }
    }

    // 🔄 Sincronizar una tabla específica
    async syncTable(tableName) {
        console.log(`🔄 Sincronizando tabla: ${tableName}`);
        
        const config = this.checkpoint.tables[tableName];
        if (!config) {
            console.log(`⚠️  Configuración no encontrada para ${tableName}`);
            return 0;
        }

        try {
            await this.connectSQL();
            
            let totalProcessed = 0;
            // Mapeo de tabla SQL a índice ES (8 tablas principales)
            const indexMap = {
                tbClientes: 'clickeat_clientes',
                tbClientesDireccion: 'clickeat_direcciones',
                tbFactura: 'clickeat_facturas',
                tbFacturaDetalle: 'clickeat_factura_detalles',
                tbFacturaIngredientes: 'clickeat_factura_ingredientes',
                tbCatalogo: 'clickeat_productos',
                tbCompania: 'clickeat_companias',
                tbRestaurantes: 'clickeat_restaurantes'
            };
            
            const indexName = indexMap[tableName];
            if (!indexName) {
                console.log(`   ⚠️  Tabla ${tableName} no tiene índice ES asignado`);
                return 0;
            }
            
            // Crear índice si no existe
            const indexExists = await esClient.indices.exists({ index: indexName });
            if (!indexExists) {
                console.log(`   📋 Creando índice ${indexName}...`);
                await esClient.indices.create({
                    index: indexName
                    // Sin configuración de settings para Elasticsearch Serverless
                });
            }
            
            // Procesar en múltiples iteraciones hasta obtener todos los registros
            let hasMoreRecords = true;
            let iteration = 0;
            
            while (hasMoreRecords) {
                iteration++;
                
                // Obtener datos de SQL Server
                const query = this.getQueryForTable(tableName, config);
                if (!query) {
                    console.log(`   ⚠️  No hay query definida para ${tableName}`);
                    break;
                }
                
                if (iteration === 1) {
                    console.log(`   📊 Obteniendo datos de ${tableName}...`);
                    if (tableName === 'tbFactura') {
                        console.log(`   🔍 Debug: lastSync = ${config.last_sync}`);
                    }
                }
                
                const result = await this.sqlPool.request().query(query);
                const records = result.recordset;
                
                if (iteration === 1 && tableName === 'tbFactura') {
                    console.log(`   📋 Query resultó en: ${records.length} registros`);
                }
                
                if (records.length === 0) {
                    if (iteration === 1) {
                        console.log(`   ✅ No hay registros nuevos en ${tableName}`);
                    }
                    hasMoreRecords = false;
                    break;
                }
                
                if (iteration === 1) {
                    console.log(`   📤 Indexando registros en batches de 5,000...`);
                }
                
                // Indexar en batches de 1000 documentos
                const BATCH_SIZE = 1000;
                for (let i = 0; i < records.length; i += BATCH_SIZE) {
                    const batch = records.slice(i, i + BATCH_SIZE);
                    const operations = batch.flatMap(doc => [
                        { index: { _index: indexName, _id: this.getDocumentId(tableName, doc) } },
                        this.transformDocument(tableName, doc)
                    ]);
                    
                    await esClient.bulk({ operations, refresh: false });
                    totalProcessed += batch.length;
                }
                
                // Actualizar checkpoint después de cada iteración
                // Obtener el último timestamp/id procesado para continuar desde ahí
                const lastRecord = records[records.length - 1];
                if (lastRecord.FechaCreacion) {
                    config.last_sync = new Date(lastRecord.FechaCreacion).toISOString();
                } else if (lastRecord.Fecha_facturado) {
                    config.last_sync = new Date(lastRecord.Fecha_facturado).toISOString();
                } else {
                    // Para tablas con max_id
                    const idField = this.getIdFieldName(tableName);
                    if (idField && lastRecord[idField]) {
                        config.last_max_id = lastRecord[idField];
                    }
                }
                
                this.saveCheckpoint();
                
                console.log(`   ⏳ Progreso: ${totalProcessed.toLocaleString()} registros procesados`);
                
                // Si obtuvimos menos registros que el límite, no hay más datos
                if (records.length < 5000) {
                    hasMoreRecords = false;
                }
            }
            
            // Refresh del índice al finalizar
            await esClient.indices.refresh({ index: indexName });
            
            // Guardar estadísticas finales
            config.last_records_processed = totalProcessed;
            this.saveCheckpoint();
            
            console.log(`   ✅ ${tableName} sincronizada: ${totalProcessed.toLocaleString()} registros`);
            return totalProcessed;
            
        } catch (error) {
            console.error(`   ❌ Error sincronizando ${tableName}:`, error.message);
            throw error;
        } finally {
            await this.disconnectSQL();
        }
    }
    
    // 📝 Obtener query para cada tabla
    getQueryForTable(tableName, config) {
        const lastSync = config.last_sync || '1900-01-01';
        const lastId = config.last_max_id || 0;
        
        const queries = {
            tbClientes: `
                SELECT TOP 5000
                    Id_cliente, Nombre, Correo, Telefono, Cedula,
                    FechaCreacion, Id_compania, Puntos, Estado
                FROM tbClientes
                WHERE FechaCreacion > '${lastSync}'
                ORDER BY FechaCreacion
            `,
            tbClientesDireccion: `
                SELECT TOP 5000
                    Id_direccion, Id_cliente, Id_compania,
                    Nombre_contacto, Telefono_contacto, Correo_contacto,
                    Direccion, Nombre_direccion, Punto_referencia,
                    Latitud, Longitud, DireccionPorDefecto
                FROM tbClientesDireccion
                WHERE Id_direccion > ${lastId}
                ORDER BY Id_direccion
            `,
            tbFactura: `
                SELECT TOP 5000
                    Id_factura, Id_cliente, Id_restaurante, Id_compania,
                    Fecha_facturado, MontoTotal, Pagado, Estado, EstadoFactura,
                    Direccion, Cedula, Telefono, Nombre, Correo_facturacion,
                    Tipo_entrega, Puntos, Puntos_utilizados
                FROM tbFactura
                WHERE Pagado = 1 
                  AND Fecha_facturado IS NOT NULL
                  AND Fecha_facturado > '${lastSync}'
                ORDER BY Fecha_facturado
            `,
            tbFacturaDetalle: `
                SELECT TOP 5000
                    Id_detalle, Id_factura, Id_producto,
                    Cantidad, Precio, Descuento, MontoTotal, ImpuestoVenta, ImpuestoServicio
                FROM tbFacturaDetalle
                WHERE Id_detalle > ${lastId}
                ORDER BY Id_detalle
            `,
            tbFacturaIngredientes: `
                SELECT TOP 5000
                    Id_ingrediente, Id_factura, Id_producto,
                    Cantidad, Precio, MontoTotal, ImpuestoVenta, ImpuestoServicio
                FROM tbFacturaIngredientes
                WHERE Id_ingrediente > ${lastId}
                ORDER BY Id_ingrediente
            `,
            tbCatalogo: `
                SELECT TOP 5000
                    Id_producto, NombreCatalogo, Descripcion, 
                    PrecioEnExpress, PrecioEnRecoger, PrecioEnMesa, PrecioEnAuto,
                    Activo_app, Id_compania, Foto_producto, Estado
                FROM tbCatalogo
                WHERE Id_producto > ${lastId}
                ORDER BY Id_producto
            `,
            tbCompania: `
                SELECT TOP 5000
                    Id_compania, Nombre_compania, Nombrecorto_compania, Estado
                FROM tbCompania
                WHERE Id_compania > ${lastId}
                ORDER BY Id_compania
            `,
            tbRestaurantes: `
                SELECT TOP 5000
                    Id_restaurante, Nombre_restaurante, Telefono, Correo_restaurante,
                    Id_compania, Activo, Foto_restaurante, Estado
                FROM tbRestaurantes
                WHERE Id_restaurante > ${lastId}
                ORDER BY Id_restaurante
            `
        };
        
        return queries[tableName] || null;
    }
    
    // 🔄 Transformar documento según la tabla
    transformDocument(tableName, doc) {
        // Transformaciones específicas por tabla
        if (tableName === 'tbClientes') {
            return {
                id_cliente: doc.Id_cliente,
                nombre: doc.Nombre,
                email: doc.Correo,
                telefono: doc.Telefono,
                cedula: doc.Cedula,
                fecha_registro: doc.FechaCreacion,
                puntos: doc.Puntos || 0,
                estado: doc.Estado,
                compania: {
                    id_compania: doc.Id_compania
                }
            };
        }
        
        if (tableName === 'tbClientesDireccion') {
            return {
                id_direccion: doc.Id_direccion,
                id_cliente: doc.Id_cliente,
                nombre_contacto: doc.Nombre_contacto,
                telefono_contacto: doc.Telefono_contacto,
                correo_contacto: doc.Correo_contacto,
                direccion: doc.Direccion,
                nombre_direccion: doc.Nombre_direccion,
                punto_referencia: doc.Punto_referencia,
                ubicacion: {
                    lat: doc.Latitud,
                    lon: doc.Longitud
                },
                es_principal: doc.DireccionPorDefecto,
                compania: {
                    id_compania: doc.Id_compania
                }
            };
        }
        
        if (tableName === 'tbFactura') {
            // Parsear el JSON del campo Direccion
            let ubicacion = null;
            if (doc.Direccion) {
                try {
                    const direccionArray = JSON.parse(doc.Direccion);
                    if (direccionArray && direccionArray.length > 0) {
                        const dir = direccionArray[0];
                        ubicacion = {
                            provincia: dir.Nombre_provincia,
                            canton: dir.Nombre_canton,
                            distrito: dir.Nombre_distrito,
                            barrio: dir.Nombre_barrio,
                            direccion: dir.Direccion,
                            nombre_direccion: dir.Nombre_direccion,
                            punto_referencia: dir.Punto_referencia,
                            lat: dir.Latitud,
                            lon: dir.Longitud
                        };
                    }
                } catch (e) {
                    // Si no se puede parsear, dejar como null
                }
            }
            
            return {
                id_factura: doc.Id_factura,
                id_cliente: doc.Id_cliente,
                id_restaurante: doc.Id_restaurante,
                fecha_facturado: doc.Fecha_facturado,
                monto_total: doc.MontoTotal,
                pagado: doc.Pagado === 1,
                estado: doc.Estado,
                estado_factura: doc.EstadoFactura,
                tipo_entrega: doc.Tipo_entrega,
                cliente_info: {
                    cedula: doc.Cedula,
                    telefono: doc.Telefono,
                    nombre: doc.Nombre,
                    correo: doc.Correo_facturacion
                },
                ubicacion: ubicacion,
                puntos: {
                    ganados: doc.Puntos || 0,
                    utilizados: doc.Puntos_utilizados || 0
                },
                compania: {
                    id_compania: doc.Id_compania
                }
            };
        }
        
        if (tableName === 'tbFacturaDetalle') {
            return {
                id_detalle: doc.Id_detalle,
                id_factura: doc.Id_factura,
                id_producto: doc.Id_producto,
                cantidad: doc.Cantidad,
                precio: doc.Precio,
                descuento: doc.Descuento || 0,
                monto_total: doc.MontoTotal,
                impuesto_venta: doc.ImpuestoVenta || 0,
                impuesto_servicio: doc.ImpuestoServicio || 0
            };
        }
        
        if (tableName === 'tbFacturaIngredientes') {
            return {
                id_ingrediente: doc.Id_ingrediente,
                id_factura: doc.Id_factura,
                id_producto: doc.Id_producto,
                cantidad: doc.Cantidad,
                precio: doc.Precio,
                monto_total: doc.MontoTotal,
                impuesto_venta: doc.ImpuestoVenta || 0,
                impuesto_servicio: doc.ImpuestoServicio || 0
            };
        }
        
        if (tableName === 'tbCatalogo') {
            return {
                id_producto: doc.Id_producto,
                nombre: doc.NombreCatalogo,
                descripcion: doc.Descripcion,
                precios: {
                    express: doc.PrecioEnExpress || 0,
                    recoger: doc.PrecioEnRecoger || 0,
                    mesa: doc.PrecioEnMesa || 0,
                    auto: doc.PrecioEnAuto || 0
                },
                activo_app: doc.Activo_app,
                estado: doc.Estado,
                foto: doc.Foto_producto,
                compania: {
                    id_compania: doc.Id_compania
                }
            };
        }
        
        if (tableName === 'tbCompania') {
            return {
                id_compania: doc.Id_compania,
                nombre: doc.Nombre_compania,
                nombre_corto: doc.Nombrecorto_compania,
                estado: doc.Estado
            };
        }
        
        if (tableName === 'tbRestaurantes') {
            return {
                id_restaurante: doc.Id_restaurante,
                nombre: doc.Nombre_restaurante,
                telefono: doc.Telefono,
                correo: doc.Correo_restaurante,
                activo: doc.Activo,
                estado: doc.Estado,
                foto: doc.Foto_restaurante,
                compania: {
                    id_compania: doc.Id_compania
                }
            };
        }
        
        // Por defecto retornar el documento tal cual
        return doc;
    }
    
    // 🆔 Obtener ID del documento (campos como vienen de SQL Server)
    getDocumentId(tableName, doc) {
        const idFields = {
            tbClientes: 'Id_cliente',
            tbClientesDireccion: 'Id_direccion',
            tbFactura: 'Id_factura',
            tbFacturaDetalle: 'Id_detalle',
            tbFacturaIngredientes: 'Id_ingrediente',
            tbCatalogo: 'Id_producto',
            tbCompania: 'Id_compania',
            tbRestaurantes: 'Id_restaurante'
        };
        
        const field = idFields[tableName];
        if (!field || !doc[field]) {
            console.error(`❌ No se encontró ID para ${tableName}, campo esperado: ${field}`);
            console.error(`   Campos disponibles:`, Object.keys(doc));
            return null;
        }
        return doc[field].toString();
    }
    
    // 🔑 Obtener nombre del campo ID para checkpoint
    getIdFieldName(tableName) {
        const idFields = {
            tbClientes: 'Id_cliente',
            tbClientesDireccion: 'Id_direccion',
            tbFactura: 'Id_factura',
            tbFacturaDetalle: 'Id_detalle',
            tbFacturaIngredientes: 'Id_ingrediente',
            tbCatalogo: 'Id_producto',
            tbCompania: 'Id_compania',
            tbRestaurantes: 'Id_restaurante'
        };
        return idFields[tableName];
    }

    // 📈 Reconstruir índices agregados
    async rebuildAggregatedIndexes() {
        console.log('📈 Reconstruyendo índices agregados...\n');
        
        try {
            // Ventas por producto (con ingredientes)
            await this.rebuildProductStats();
            
            // Ventas por restaurante
            await this.rebuildRestaurantStats();

            // Ventas por cliente (nuevo)
            await this.rebuildClientStats();

            // Ventas por teléfono (incluye guests)
            await this.rebuildPhoneStats();

            console.log('✅ Índices agregados reconstruidos correctamente');

        } catch (error) {
            console.error('❌ Error reconstruyendo índices:', error);
            throw error;
        }
    }

    // 📊 Estadísticas de productos
    async rebuildProductStats() {
        console.log('📊 Reconstruyendo estadísticas de productos...');
        
        try {
            // Crear índice si no existe
            const indexExists = await esClient.indices.exists({ index: 'clickeat_ventas_por_producto' });
            if (!indexExists) {
                await esClient.indices.create({
                    index: 'clickeat_ventas_por_producto',
                    mappings: {
                        properties: {
                            id_producto: { type: 'keyword' },
                            nombre_producto: { type: 'text', fields: { keyword: { type: 'keyword' } } },
                            categoria: { type: 'keyword' },
                            compania: {
                                properties: {
                                    id_compania: { type: 'keyword' },
                                    nombre_compania: { type: 'keyword' },
                                    pais: { type: 'keyword' }
                                }
                            },
                            total_vendido: { type: 'integer' },
                            ingreso_total: { type: 'float' },
                            precio_promedio: { type: 'float' },
                            ingredientes_populares: {
                                type: 'nested',
                                properties: {
                                    nombre: { type: 'keyword' },
                                    frecuencia: { type: 'integer' }
                                }
                            }
                        }
                    }
                });
            }

            // Usar aggregation de Elasticsearch
            const result = await esClient.search({
                index: 'clickeat_factura_detalles',
                size: 0,
                aggs: {
                    productos: {
                        terms: { field: 'id_producto', size: 10000 },
                        aggs: {
                            total_vendido: { sum: { field: 'cantidad' } },
                            ingreso_total: { sum: { field: 'subtotal' } },
                            precio_promedio: { avg: { field: 'precio_unitario' } },
                            nombre: { terms: { field: 'nombre_producto.keyword', size: 1 } },
                            id_compania: { terms: { field: 'id_compania', size: 1 } }
                        }
                    }
                }
            });

            const bulkOps = [];
            result.aggregations.productos.buckets.forEach(bucket => {
                const doc = {
                    id_producto: bucket.key,
                    nombre_producto: bucket.nombre.buckets[0]?.key || 'Desconocido',
                    total_vendido: bucket.total_vendido.value,
                    ingreso_total: bucket.ingreso_total.value,
                    precio_promedio: bucket.precio_promedio.value,
                    compania: {
                        id_compania: bucket.id_compania.buckets[0]?.key
                    }
                };

                bulkOps.push({ index: { _index: 'clickeat_ventas_por_producto', _id: bucket.key } });
                bulkOps.push(doc);
            });

            if (bulkOps.length > 0) {
                await esClient.bulk({ body: bulkOps, refresh: true });
            }

            this.checkpoint.aggregated_indexes.clickeat_ventas_por_producto.last_rebuild = new Date().toISOString();
            this.checkpoint.aggregated_indexes.clickeat_ventas_por_producto.products_updated = result.aggregations.productos.buckets.length;
            console.log(`✅ ${result.aggregations.productos.buckets.length} productos agregados`);
        } catch (error) {
            console.error('❌ Error:', error.message);
        }
    }

    // 🏪 Estadísticas de restaurantes  
    async rebuildRestaurantStats() {
        console.log('🏪 Reconstruyendo estadísticas de restaurantes...');
        
        try {
            const indexExists = await esClient.indices.exists({ index: 'clickeat_ventas_por_restaurante' });
            if (!indexExists) {
                await esClient.indices.create({
                    index: 'clickeat_ventas_por_restaurante',
                    mappings: {
                        properties: {
                            id_restaurante: { type: 'keyword' },
                            nombre_restaurante: { type: 'text', fields: { keyword: { type: 'keyword' } } },
                            ciudad: { type: 'keyword' },
                            compania: {
                                properties: {
                                    id_compania: { type: 'keyword' },
                                    nombre_compania: { type: 'keyword' }
                                }
                            },
                            total_ordenes: { type: 'integer' },
                            ingreso_total: { type: 'float' },
                            ticket_promedio: { type: 'float' }
                        }
                    }
                });
            }

            const result = await esClient.search({
                index: 'clickeat_facturas',
                size: 0,
                aggs: {
                    restaurantes: {
                        terms: { field: 'id_restaurante', size: 10000 },
                        aggs: {
                            total_ordenes: { value_count: { field: 'id_factura' } },
                            ingreso_total: { sum: { field: 'monto_total' } },
                            ticket_promedio: { avg: { field: 'monto_total' } }
                        }
                    }
                }
            });

            const bulkOps = [];
            result.aggregations.restaurantes.buckets.forEach(bucket => {
                const doc = {
                    id_restaurante: bucket.key,
                    total_ordenes: bucket.total_ordenes.value,
                    ingreso_total: bucket.ingreso_total.value,
                    ticket_promedio: bucket.ticket_promedio.value
                };

                bulkOps.push({ index: { _index: 'clickeat_ventas_por_restaurante', _id: bucket.key } });
                bulkOps.push(doc);
            });

            if (bulkOps.length > 0) {
                await esClient.bulk({ body: bulkOps, refresh: true });
            }

            this.checkpoint.aggregated_indexes.clickeat_ventas_por_restaurante.last_rebuild = new Date().toISOString();
            this.checkpoint.aggregated_indexes.clickeat_ventas_por_restaurante.restaurants_updated = result.aggregations.restaurantes.buckets.length;
            console.log(`✅ ${result.aggregations.restaurantes.buckets.length} restaurantes agregados`);
        } catch (error) {
            console.error('❌ Error:', error.message);
        }
    }

    // 👥 Estadísticas de clientes
    async rebuildClientStats() {
        console.log('👥 Reconstruyendo estadísticas de clientes...');
        
        try {
            const indexExists = await esClient.indices.exists({ index: 'clickeat_ventas_por_cliente' });
            if (!indexExists) {
                await esClient.indices.create({
                    index: 'clickeat_ventas_por_cliente',
                    mappings: {
                        properties: {
                            telefono: { type: 'keyword' },
                            nombre: { type: 'text', fields: { keyword: { type: 'keyword' } } },
                            email: { type: 'keyword' },
                            ciudad: { type: 'keyword' },
                            compania: {
                                properties: {
                                    id_compania: { type: 'keyword' }
                                }
                            },
                            total_ordenes: { type: 'integer' },
                            gasto_total: { type: 'float' },
                            ticket_promedio: { type: 'float' },
                            primera_compra: { type: 'date' },
                            ultima_compra: { type: 'date' },
                            dias_sin_compra: { type: 'integer' },
                            productos_favoritos: {
                                type: 'nested',
                                properties: {
                                    nombre: { type: 'keyword' },
                                    veces_ordenado: { type: 'integer' }
                                }
                            },
                            ingredientes_preferidos: { type: 'keyword' },
                            segmento: { type: 'keyword' }
                        }
                    }
                });
            }

            // Agregación por teléfono (captura clientes y guests)
            const result = await esClient.search({
                index: 'clickeat_facturas',
                size: 0,
                aggs: {
                    clientes: {
                        terms: { field: 'telefono', size: 100000 },
                        aggs: {
                            total_ordenes: { value_count: { field: 'id_factura' } },
                            gasto_total: { sum: { field: 'monto_total' } },
                            ticket_promedio: { avg: { field: 'monto_total' } },
                            primera_compra: { min: { field: 'fecha_factura' } },
                            ultima_compra: { max: { field: 'fecha_factura' } },
                            nombre: { terms: { field: 'nombre_cliente.keyword', size: 1 } },
                            ciudad: { terms: { field: 'ciudad.keyword', size: 1 } },
                            id_compania: { terms: { field: 'id_compania', size: 1 } }
                        }
                    }
                }
            });

            const bulkOps = [];
            const now = new Date();
            
            result.aggregations.clientes.buckets.forEach(bucket => {
                const ultimaCompra = new Date(bucket.ultima_compra.value);
                const diasSinCompra = Math.floor((now - ultimaCompra) / (1000 * 60 * 60 * 24));
                
                // Segmentación automática
                let segmento = 'ocasional';
                if (bucket.gasto_total.value > 500000) {
                    segmento = diasSinCompra > 90 ? 'vip_inactivo' : 'vip';
                } else if (bucket.total_ordenes.value > 20) {
                    segmento = diasSinCompra > 90 ? 'frecuente_inactivo' : 'frecuente';
                } else if (diasSinCompra > 180) {
                    segmento = 'perdido';
                } else if (diasSinCompra > 90) {
                    segmento = 'inactivo';
                }

                const doc = {
                    telefono: bucket.key,
                    nombre: bucket.nombre.buckets[0]?.key || 'Cliente',
                    ciudad: bucket.ciudad.buckets[0]?.key || '',
                    compania: {
                        id_compania: bucket.id_compania.buckets[0]?.key
                    },
                    total_ordenes: bucket.total_ordenes.value,
                    gasto_total: bucket.gasto_total.value,
                    ticket_promedio: bucket.ticket_promedio.value,
                    primera_compra: bucket.primera_compra.value_as_string,
                    ultima_compra: bucket.ultima_compra.value_as_string,
                    dias_sin_compra: diasSinCompra,
                    segmento: segmento
                };

                bulkOps.push({ index: { _index: 'clickeat_ventas_por_cliente', _id: bucket.key } });
                bulkOps.push(doc);
            });

            if (bulkOps.length > 0) {
                await esClient.bulk({ body: bulkOps, refresh: true });
            }

            this.checkpoint.aggregated_indexes.clickeat_ventas_por_cliente.last_rebuild = new Date().toISOString();
            this.checkpoint.aggregated_indexes.clickeat_ventas_por_cliente.clients_updated = result.aggregations.clientes.buckets.length;
            console.log(`✅ ${result.aggregations.clientes.buckets.length} clientes agregados`);
        } catch (error) {
            console.error('❌ Error:', error.message);
        }
    }

    // 📱 Estadísticas por teléfono (incluye guests)
    async rebuildPhoneStats() {
        console.log('📱 Reconstruyendo estadísticas por teléfono...');
        
        try {
            const indexExists = await esClient.indices.exists({ index: 'clickeat_ventas_por_telefono' });
            if (!indexExists) {
                await esClient.indices.create({
                    index: 'clickeat_ventas_por_telefono',
                    mappings: {
                        properties: {
                            telefono: { type: 'keyword' },
                            nombre: { type: 'text', fields: { keyword: { type: 'keyword' } } },
                            email: { type: 'keyword' },
                            ciudad: { type: 'keyword' },
                            companias: {
                                type: 'nested',
                                properties: {
                                    id_compania: { type: 'keyword' },
                                    nombre_compania: { type: 'keyword' }
                                }
                            },
                            total_ordenes: { type: 'integer' },
                            gasto_total: { type: 'float' },
                            ticket_promedio: { type: 'float' },
                            primera_compra: { type: 'date' },
                            ultima_compra: { type: 'date' },
                            dias_sin_compra: { type: 'integer' },
                            productos_favoritos: {
                                type: 'nested',
                                properties: {
                                    nombre: { type: 'keyword' },
                                    veces_ordenado: { type: 'integer' }
                                }
                            },
                            ingredientes_favoritos: { type: 'keyword' },
                            segmento: { type: 'keyword' }
                        }
                    }
                });
            }

            // Primero agregamos por teléfono desde facturas
            const result = await esClient.search({
                index: 'clickeat_facturas',
                size: 0,
                aggs: {
                    telefonos: {
                        terms: { field: 'telefono', size: 100000 },
                        aggs: {
                            total_ordenes: { value_count: { field: 'id_factura' } },
                            gasto_total: { sum: { field: 'monto_total' } },
                            ticket_promedio: { avg: { field: 'monto_total' } },
                            primera_compra: { min: { field: 'fecha_factura' } },
                            ultima_compra: { max: { field: 'fecha_factura' } },
                            nombre: { terms: { field: 'nombre_cliente.keyword', size: 1 } },
                            ciudad: { terms: { field: 'ciudad.keyword', size: 1 } },
                            companias: { terms: { field: 'id_compania', size: 10 } }
                        }
                    }
                }
            });

            const bulkOps = [];
            const now = new Date();
            
            // Procesar cada teléfono
            for (const bucket of result.aggregations.telefonos.buckets) {
                const telefono = bucket.key;
                const ultimaCompra = new Date(bucket.ultima_compra.value);
                const diasSinCompra = Math.floor((now - ultimaCompra) / (1000 * 60 * 60 * 24));
                
                // Segmentación automática
                let segmento = 'ocasional';
                if (bucket.gasto_total.value > 500000) {
                    segmento = diasSinCompra > 90 ? 'vip_inactivo' : 'vip';
                } else if (bucket.total_ordenes.value > 20) {
                    segmento = diasSinCompra > 90 ? 'frecuente_inactivo' : 'frecuente';
                } else if (diasSinCompra > 180) {
                    segmento = 'perdido';
                } else if (diasSinCompra > 90) {
                    segmento = 'inactivo';
                }

                // Obtener productos favoritos para este teléfono
                const productosResult = await esClient.search({
                    index: 'clickeat_factura_detalles',
                    size: 0,
                    query: {
                        bool: {
                            must: [
                                { term: { telefono: telefono } }
                            ]
                        }
                    },
                    aggs: {
                        productos: {
                            terms: { field: 'nombre_producto.keyword', size: 5 },
                            aggs: {
                                cantidad: { sum: { field: 'cantidad' } }
                            }
                        },
                        ingredientes: {
                            terms: { field: 'ingredientes.keyword', size: 10 }
                        }
                    }
                });

                const productosFavoritos = productosResult.aggregations?.productos?.buckets.map(p => ({
                    nombre: p.key,
                    veces_ordenado: Math.round(p.cantidad.value)
                })) || [];

                const ingredientesFavoritos = productosResult.aggregations?.ingredientes?.buckets.map(i => i.key) || [];

                const doc = {
                    telefono: telefono,
                    nombre: bucket.nombre.buckets[0]?.key || 'Cliente',
                    ciudad: bucket.ciudad.buckets[0]?.key || '',
                    companias: bucket.companias.buckets.map(c => ({ id_compania: c.key })),
                    total_ordenes: bucket.total_ordenes.value,
                    gasto_total: bucket.gasto_total.value,
                    ticket_promedio: bucket.ticket_promedio.value,
                    primera_compra: bucket.primera_compra.value_as_string,
                    ultima_compra: bucket.ultima_compra.value_as_string,
                    dias_sin_compra: diasSinCompra,
                    segmento: segmento,
                    productos_favoritos: productosFavoritos,
                    ingredientes_favoritos: ingredientesFavoritos
                };

                bulkOps.push({ index: { _index: 'clickeat_ventas_por_telefono', _id: telefono } });
                bulkOps.push(doc);

                // Ejecutar bulk cada 100 registros para evitar timeouts
                if (bulkOps.length >= 200) {
                    await esClient.bulk({ body: bulkOps, refresh: false });
                    bulkOps.length = 0;
                    process.stdout.write('.');
                }
            }

            // Ejecutar bulk final
            if (bulkOps.length > 0) {
                await esClient.bulk({ body: bulkOps, refresh: true });
            }

            this.checkpoint.aggregated_indexes.clickeat_ventas_por_telefono.last_rebuild = new Date().toISOString();
            this.checkpoint.aggregated_indexes.clickeat_ventas_por_telefono.phones_updated = result.aggregations.telefonos.buckets.length;
            console.log(`\n✅ ${result.aggregations.telefonos.buckets.length} teléfonos agregados`);
        } catch (error) {
            console.error('❌ Error:', error.message);
        }
    }
}

// 🎯 Funciones de comando
async function detectChanges() {
    const sync = new SyncManager();
    await sync.showChangesSummary();
}

async function syncIncremental(tableName = null) {
    const sync = new SyncManager();
    await sync.syncIncremental(tableName);
}

async function rebuildAggregates() {
    const sync = new SyncManager();
    await sync.rebuildAggregatedIndexes();
}

// 🚀 Exportar para uso desde línea de comandos
if (import.meta.url === `file://${process.argv[1]}`) {
    const command = process.argv[2];
    const tableName = process.argv[3];

    (async () => {
        try {
            switch (command) {
                case 'detect':
                    await detectChanges();
                    break;
                case 'sync':
                    await syncIncremental(tableName);
                    break;
                case 'rebuild':
                    await rebuildAggregates();
                    break;
                default:
                    console.log(`
🔄 SISTEMA DE SINCRONIZACIÓN CLICKEAT

Uso:
  node src/scripts/sync-manager.js detect           - Detectar cambios
  node src/scripts/sync-manager.js sync [tabla]     - Sincronización incremental  
  node src/scripts/sync-manager.js rebuild          - Reconstruir agregados

Ejemplos:
  node src/scripts/sync-manager.js detect
  node src/scripts/sync-manager.js sync tbClientes
  node src/scripts/sync-manager.js sync
  node src/scripts/sync-manager.js rebuild
                    `);
            }
        } catch (error) {
            console.error('❌ Error:', error);
            process.exit(1);
        }
    })();
}

export { SyncManager, detectChanges, syncIncremental, rebuildAggregates };