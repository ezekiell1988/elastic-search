// Test de consulta SQL para facturas

import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

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
    }
};

async function testQuery() {
    try {
        const pool = await sql.connect(sqlConfig);
        
        console.log('✅ Conectado a SQL Server\n');
        
        // Consulta de prueba
        const result = await pool.request().query(`
            SELECT TOP 10
                Id_factura, Id_cliente, Fecha_facturado, MontoTotal
            FROM tbFactura
            WHERE Pagado = 1 
              AND Fecha_facturado IS NOT NULL
              AND Fecha_facturado > '1900-01-01'
            ORDER BY Fecha_facturado
        `);
        
        console.log(`📊 Facturas encontradas: ${result.recordset.length}\n`);
        
        result.recordset.forEach(f => {
            console.log(`- ID: ${f.Id_factura}, Cliente: ${f.Id_cliente}, Fecha: ${f.Fecha_facturado}, Monto: ${f.MontoTotal}`);
        });
        
        await pool.close();
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testQuery();
