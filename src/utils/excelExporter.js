import ExcelJS from 'exceljs';

/**
 * Exporta clientes inactivos a formato Excel
 */
export async function exportToExcel(customers) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Clientes Inactivos');

  // Configurar propiedades del libro
  workbook.creator = 'Sistema de Reactivación';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Definir columnas
  worksheet.columns = [
    { header: 'ID Cliente', key: 'customer_id', width: 25 },
    { header: 'Nombre', key: 'name', width: 30 },
    { header: 'Teléfono', key: 'phone', width: 15 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Género', key: 'gender', width: 10 },
    { header: 'Ciudad', key: 'city', width: 20 },
    { header: 'Compañía', key: 'company_id', width: 15 },
    { header: 'Última Compra', key: 'last_purchase_date', width: 15 },
    { header: 'Días Sin Comprar', key: 'days_since_last_purchase', width: 18 },
    { header: 'Total Compras', key: 'total_purchases', width: 15 },
    { header: 'Total Gastado', key: 'total_spent', width: 15 },
    { header: 'Ticket Promedio', key: 'average_ticket', width: 18 },
    { header: 'Segmento', key: 'customer_segment', width: 15 },
    { header: 'Productos Favoritos', key: 'favorite_products', width: 40 },
    { header: 'Ingredientes Favoritos', key: 'favorite_ingredients', width: 40 }
  ];

  // Estilo del encabezado
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0070C0' }
  };
  worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  // Agregar datos
  customers.forEach(customer => {
    worksheet.addRow({
      customer_id: customer.customer_id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      gender: customer.gender,
      city: customer.city,
      company_id: customer.company_id,
      last_purchase_date: customer.last_purchase_date 
        ? new Date(customer.last_purchase_date).toLocaleDateString('es-ES')
        : 'N/A',
      days_since_last_purchase: customer.days_since_last_purchase,
      total_purchases: customer.total_purchases,
      total_spent: customer.total_spent ? `$${customer.total_spent.toFixed(2)}` : '$0.00',
      average_ticket: customer.average_ticket ? `$${customer.average_ticket.toFixed(2)}` : '$0.00',
      customer_segment: customer.customer_segment,
      favorite_products: customer.favorite_products?.join(', ') || 'N/A',
      favorite_ingredients: customer.favorite_ingredients?.join(', ') || 'N/A'
    });
  });

  // Aplicar formato condicional a días sin comprar
  const daysColumn = worksheet.getColumn('days_since_last_purchase');
  daysColumn.eachCell({ includeEmpty: false }, (cell, rowNumber) => {
    if (rowNumber > 1) { // Skip header
      const days = cell.value;
      if (days > 180) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFF6B6B' } // Rojo
        };
      } else if (days > 120) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFD93D' } // Amarillo
        };
      } else if (days > 90) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFEB9C' } // Naranja claro
        };
      }
    }
  });

  // Agregar filtros
  worksheet.autoFilter = {
    from: 'A1',
    to: `O1`
  };

  // Freeze la primera fila
  worksheet.views = [
    { state: 'frozen', xSplit: 0, ySplit: 1 }
  ];

  // Agregar hoja de resumen
  const summarySheet = workbook.addWorksheet('Resumen');
  summarySheet.columns = [
    { header: 'Métrica', key: 'metric', width: 30 },
    { header: 'Valor', key: 'value', width: 20 }
  ];

  summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  summarySheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0070C0' }
  };

  // Calcular métricas
  const totalCustomers = customers.length;
  const avgDaysInactive = customers.reduce((sum, c) => sum + c.days_since_last_purchase, 0) / totalCustomers;
  const totalRevenueLost = customers.reduce((sum, c) => sum + c.total_spent, 0);

  summarySheet.addRow({ metric: 'Total Clientes Inactivos', value: totalCustomers });
  summarySheet.addRow({ metric: 'Promedio Días Sin Comprar', value: Math.round(avgDaysInactive) });
  summarySheet.addRow({ metric: 'Ingresos Potenciales Perdidos', value: `$${totalRevenueLost.toFixed(2)}` });
  summarySheet.addRow({ 
    metric: 'Fecha de Generación', 
    value: new Date().toLocaleString('es-ES') 
  });

  // Generar buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}
