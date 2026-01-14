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
    requestTimeout: 30000
  }
};

/**
 * Crea los índices en Elasticsearch con sus mappings
 */
async function createIndices() {
  console.log('\n📋 Creando índices en Elasticsearch...\n');

  // Índice de clientes
  try {
    await esClient.indices.delete({ index: 'clickeat_clientes' });
    console.log('🗑️  Índice anterior eliminado: clickeat_clientes');
  } catch (err) {
    // Índice no existe, continuar
  }

  await esClient.indices.create({
    index: 'clickeat_clientes',
    body: {
      mappings: {
        properties: {
          id_cliente: { type: 'integer' },
          nombre: { type: 'text', fields: { keyword: { type: 'keyword' } } },
          cedula: { type: 'keyword' },
          telefono: { type: 'keyword' },
          correo: { type: 'keyword' },
          fecha_registro: { type: 'date' },
          estado: { type: 'integer' },
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
          },
          estadisticas: {
            properties: {
              total_ordenes: { type: 'integer' },
              ultima_compra: { type: 'date' },
              dias_sin_comprar: { type: 'integer' },
              total_gastado: { type: 'double' },
              promedio_por_orden: { type: 'double' }
            }
          }
        }
      }
    }
  });
  console.log('✅ Índice creado: clickeat_clientes');

  // Índice de facturas/órdenes
  try {
    await esClient.indices.delete({ index: 'clickeat_ordenes' });
    console.log('🗑️  Índice anterior eliminado: clickeat_ordenes');
  } catch (err) {}

  await esClient.indices.create({
    index: 'clickeat_ordenes',
    body: {
      mappings: {
        properties: {
          id_factura: { type: 'integer' },
          id_cliente: { type: 'integer' },
          nombre_cliente: { type: 'text', fields: { keyword: { type: 'keyword' } } },
          correo_cliente: { type: 'keyword' },
          fecha_factura: { type: 'date' },
          fecha_entrega: { type: 'date' },
          estado_pedido: { type: 'keyword' },
          monto_total: { type: 'double' },
          monto_subtotal: { type: 'double' },
          monto_envio: { type: 'double' },
          monto_descuento: { type: 'double' },
          moneda: { type: 'keyword' },
          tipo_pago: { type: 'keyword' },
          id_restaurante: { type: 'integer' },
          nombre_restaurante: { type: 'text', fields: { keyword: { type: 'keyword' } } },
          id_compania: { type: 'integer' },
          nombre_compania: { type: 'text', fields: { keyword: { type: 'keyword' } } },
          productos: {
            type: 'nested',
            properties: {
              id_detalle: { type: 'integer' },
              id_producto: { type: 'integer' },
              nombre_producto: { type: 'text', fields: { keyword: { type: 'keyword' } } },
              descripcion: { type: 'text' },
              cantidad: { type: 'double' },
              precio_unitario: { type: 'double' },
              monto_total: { type: 'double' },
              comentario: { type: 'text' },
              ingredientes: {
                type: 'nested',
                properties: {
                  id_ingrediente: { type: 'integer' },
                  nombre: { type: 'text' },
                  cantidad: { type: 'double' },
                  precio: { type: 'double' }
                }
              }
            }
          }
        }
      }
    }
  });
  console.log('✅ Índice creado: clickeat_ordenes');

  // Índice de productos
  try {
    await esClient.indices.delete({ index: 'clickeat_productos' });
    console.log('🗑️  Índice anterior eliminado: clickeat_productos');
  } catch (err) {}

  await esClient.indices.create({
    index: 'clickeat_productos',
    body: {
      mappings: {
        properties: {
          id_producto: { type: 'integer' },
          codigo: { type: 'keyword' },
          nombre: { type: 'text', fields: { keyword: { type: 'keyword' } } },
          descripcion: { type: 'text' },
          precio_venta: { type: 'double' },
          tipo_nodo: { type: 'keyword' },
          id_compania: { type: 'integer' },
          estado: { type: 'integer' },
          foto_producto: { type: 'keyword' },
          padre: { type: 'integer' }
        }
      }
    }
  });
  console.log('✅ Índice creado: clickeat_productos');

  console.log('\n✅ Todos los índices creados exitosamente\n');
}

/**
 * Migra clientes con sus direcciones y estadísticas
 */
async function migrateClientes(pool) {
  console.log('👥 Migrando clientes...');

  // Obtener clientes con estadísticas
  const clientesQuery = `
    SELECT 
      c.Id_cliente,
      c.Nombre,
      c.Cedula,
      c.Telefono,
      c.Correo,
      c.Fecha_registro,
      c.Estado,
      COUNT(f.Id_factura) AS Total_ordenes,
      MAX(f.Fecha_factura) AS Ultima_compra,
      DATEDIFF(DAY, MAX(f.Fecha_factura), GETDATE()) AS Dias_sin_comprar,
      SUM(f.Monto_total) AS Total_gastado,
      AVG(f.Monto_total) AS Promedio_por_orden
    FROM tbClientes c
    LEFT JOIN tbFactura f ON c.Id_cliente = f.Id_cliente
    GROUP BY 
      c.Id_cliente, c.Nombre, c.Cedula, c.Telefono, 
      c.Correo, c.Fecha_registro, c.Estado
  `;

  const clientes = await pool.request().query(clientesQuery);

  // Obtener direcciones
  const direccionesQuery = `
    SELECT 
      Id_direccion,
      Id_cliente,
      Nombre_contacto,
      Telefono_contacto,
      Direccion,
      Provincia,
      Canton,
      Distrito
    FROM tbClientesDireccion
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

  // Preparar datos para bulk insert
  const operations = [];
  clientes.recordset.forEach(cliente => {
    operations.push({ index: { _index: 'clickeat_clientes', _id: cliente.Id_cliente } });
    operations.push({
      id_cliente: cliente.Id_cliente,
      nombre: cliente.Nombre,
      cedula: cliente.Cedula,
      telefono: cliente.Telefono,
      correo: cliente.Correo,
      fecha_registro: cliente.Fecha_registro,
      estado: cliente.Estado,
      direcciones: direccionesPorCliente[cliente.Id_cliente] || [],
      estadisticas: {
        total_ordenes: cliente.Total_ordenes || 0,
        ultima_compra: cliente.Ultima_compra,
        dias_sin_comprar: cliente.Dias_sin_comprar,
        total_gastado: cliente.Total_gastado || 0,
        promedio_por_orden: cliente.Promedio_por_orden || 0
      }
    });
  });

  if (operations.length > 0) {
    await esClient.bulk({ operations, refresh: true });
  }

  console.log(`✅ ${clientes.recordset.length} clientes migrados`);
  return clientes.recordset.length;
}

/**
 * Migra productos del catálogo
 */
async function migrateProductos(pool) {
  console.log('📦 Migrando productos...');

  const query = `
    SELECT 
      Id_producto,
      Codigo,
      NombreCatalogo,
      Descripcion,
      Precio_venta,
      TipoNodo,
      Id_compania,
      Estado,
      Foto_producto,
      Padre
    FROM tbCatalogo
    WHERE Estado = 1
  `;

  const result = await pool.request().query(query);

  const operations = [];
  result.recordset.forEach(producto => {
    operations.push({ index: { _index: 'clickeat_productos', _id: producto.Id_producto } });
    operations.push({
      id_producto: producto.Id_producto,
      codigo: producto.Codigo,
      nombre: producto.NombreCatalogo,
      descripcion: producto.Descripcion,
      precio_venta: producto.Precio_venta,
      tipo_nodo: producto.TipoNodo,
      id_compania: producto.Id_compania,
      estado: producto.Estado,
      foto_producto: producto.Foto_producto,
      padre: producto.Padre
    });
  });

  if (operations.length > 0) {
    await esClient.bulk({ operations, refresh: true });
  }

  console.log(`✅ ${result.recordset.length} productos migrados`);
  return result.recordset.length;
}

/**
 * Migra órdenes/facturas con sus detalles e ingredientes
 */
async function migrateOrdenes(pool) {
  console.log('🧾 Migrando órdenes...');

  // Obtener facturas
  const facturasQuery = `
    SELECT TOP 5000
      f.Id_factura,
      f.Id_cliente,
      c.Nombre AS Nombre_cliente,
      c.Correo AS Correo_cliente,
      f.Fecha_factura,
      f.Fecha_entrega,
      f.Estado_pedido,
      f.Monto_total,
      f.Monto_subtotal,
      f.Monto_envio,
      f.Monto_descuento,
      f.Moneda,
      f.Tipo_pago,
      f.Id_restaurante,
      r.Nombre_restaurante,
      f.Id_compania,
      comp.Nombre_compania
    FROM tbFactura f
    INNER JOIN tbClientes c ON f.Id_cliente = c.Id_cliente
    LEFT JOIN tbRestaurantes r ON f.Id_restaurante = r.Id_restaurante
    LEFT JOIN tbCompania comp ON f.Id_compania = comp.Id_compania
    ORDER BY f.Fecha_factura DESC
  `;

  const facturas = await pool.request().query(facturasQuery);

  // Obtener detalles de todas las facturas
  const detallesQuery = `
    SELECT 
      fd.Id_detalle,
      fd.Id_factura,
      fd.Id_producto,
      cat.NombreCatalogo AS Nombre_producto,
      cat.Descripcion AS Descripcion_producto,
      fd.Cantidad,
      fd.Precio_unitario,
      fd.MontoTotal,
      fd.Comentario
    FROM tbFacturaDetalle fd
    INNER JOIN tbCatalogo cat ON fd.Id_producto = cat.Id_producto
  `;

  const detalles = await pool.request().query(detallesQuery);

  // Obtener ingredientes de todos los detalles
  const ingredientesQuery = `
    SELECT 
      fi.Id_ingrediente,
      fi.Id_detalle,
      fi.Id_producto,
      cat.NombreCatalogo AS Nombre_ingrediente,
      fi.Cantidad,
      fi.Precio,
      fi.MontoTotal
    FROM tbFacturaIngredientes fi
    INNER JOIN tbCatalogo cat ON fi.Id_producto = cat.Id_producto
  `;

  const ingredientes = await pool.request().query(ingredientesQuery);

  // Agrupar ingredientes por detalle
  const ingredientesPorDetalle = {};
  ingredientes.recordset.forEach(ing => {
    if (!ingredientesPorDetalle[ing.Id_detalle]) {
      ingredientesPorDetalle[ing.Id_detalle] = [];
    }
    ingredientesPorDetalle[ing.Id_detalle].push({
      id_ingrediente: ing.Id_ingrediente,
      nombre: ing.Nombre_ingrediente,
      cantidad: ing.Cantidad,
      precio: ing.Precio
    });
  });

  // Agrupar detalles por factura
  const detallesPorFactura = {};
  detalles.recordset.forEach(det => {
    if (!detallesPorFactura[det.Id_factura]) {
      detallesPorFactura[det.Id_factura] = [];
    }
    detallesPorFactura[det.Id_factura].push({
      id_detalle: det.Id_detalle,
      id_producto: det.Id_producto,
      nombre_producto: det.Nombre_producto,
      descripcion: det.Descripcion_producto,
      cantidad: det.Cantidad,
      precio_unitario: det.Precio_unitario,
      monto_total: det.MontoTotal,
      comentario: det.Comentario,
      ingredientes: ingredientesPorDetalle[det.Id_detalle] || []
    });
  });

  // Preparar datos para bulk insert
  const operations = [];
  facturas.recordset.forEach(factura => {
    operations.push({ index: { _index: 'clickeat_ordenes', _id: factura.Id_factura } });
    operations.push({
      id_factura: factura.Id_factura,
      id_cliente: factura.Id_cliente,
      nombre_cliente: factura.Nombre_cliente,
      correo_cliente: factura.Correo_cliente,
      fecha_factura: factura.Fecha_factura,
      fecha_entrega: factura.Fecha_entrega,
      estado_pedido: factura.Estado_pedido,
      monto_total: factura.Monto_total,
      monto_subtotal: factura.Monto_subtotal,
      monto_envio: factura.Monto_envio,
      monto_descuento: factura.Monto_descuento,
      moneda: factura.Moneda,
      tipo_pago: factura.Tipo_pago,
      id_restaurante: factura.Id_restaurante,
      nombre_restaurante: factura.Nombre_restaurante,
      id_compania: factura.Id_compania,
      nombre_compania: factura.Nombre_compania,
      productos: detallesPorFactura[factura.Id_factura] || []
    });
  });

  if (operations.length > 0) {
    await esClient.bulk({ operations, refresh: true });
  }

  console.log(`✅ ${facturas.recordset.length} órdenes migradas`);
  return facturas.recordset.length;
}

/**
 * Ejecuta la migración completa
 */
async function runMigration() {
  let pool;
  const startTime = Date.now();

  try {
    console.log('╔════════════════════════════════════════════╗');
    console.log('║  MIGRACIÓN SQL SERVER → ELASTICSEARCH      ║');
    console.log('║  ClickEat Database                         ║');
    console.log('╚════════════════════════════════════════════╝\n');

    // Conectar a SQL Server
    console.log('🔌 Conectando a SQL Server...');
    pool = await sql.connect(config);
    console.log('✅ Conectado a SQL Server\n');

    // Verificar conexión a Elasticsearch
    console.log('🔍 Verificando conexión a Elasticsearch...');
    await esClient.ping();
    console.log('✅ Elasticsearch conectado\n');

    // Crear índices
    await createIndices();

    // Migrar datos
    const stats = {
      clientes: await migrateClientes(pool),
      productos: await migrateProductos(pool),
      ordenes: await migrateOrdenes(pool)
    };

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║  MIGRACIÓN COMPLETADA                      ║');
    console.log('╚════════════════════════════════════════════╝\n');
    console.log(`⏱️  Duración: ${duration}s`);
    console.log(`👥 Clientes: ${stats.clientes}`);
    console.log(`📦 Productos: ${stats.productos}`);
    console.log(`🧾 Órdenes: ${stats.ordenes}`);
    console.log(`📊 Total registros: ${stats.clientes + stats.productos + stats.ordenes}\n`);

  } catch (err) {
    console.error('❌ Error en la migración:', err);
    throw err;
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔌 Conexión a SQL Server cerrada');
    }
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

export { runMigration, createIndices, migrateClientes, migrateProductos, migrateOrdenes };
