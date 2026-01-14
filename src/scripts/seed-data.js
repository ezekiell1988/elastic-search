import client from '../config/elasticsearch.js';
import { 
  generateCustomer, 
  generateProduct, 
  generateInvoice,
  calculateCustomerStats,
  companies 
} from '../utils/dataGenerator.js';

const BATCH_SIZE = 500;
const NUM_CUSTOMERS_PER_COMPANY = 1000; // Ajusta según necesites
const NUM_PRODUCTS_PER_COMPANY = 50;
const AVG_INVOICES_PER_CUSTOMER = 8;

async function bulkIndex(indexName, documents) {
  const operations = documents.flatMap(doc => [
    { index: { _index: indexName } },
    doc
  ]);

  const response = await client.bulk({ 
    refresh: false, 
    operations 
  });

  if (response.errors) {
    const erroredDocuments = [];
    response.items.forEach((action, i) => {
      const operation = Object.keys(action)[0];
      if (action[operation].error) {
        erroredDocuments.push({
          status: action[operation].status,
          error: action[operation].error,
          document: documents[i]
        });
      }
    });
    console.error('❌ Errores en bulk:', erroredDocuments.length);
  }

  return response;
}

async function seedData() {
  console.log('🌱 Iniciando generación de datos...\n');

  for (const company of companies) {
    console.log(`\n📦 Procesando compañía: ${company.name} (${company.id})`);
    
    // 1. Generar y guardar productos
    console.log('  📝 Generando productos...');
    const products = [];
    for (let i = 0; i < NUM_PRODUCTS_PER_COMPANY; i++) {
      products.push(generateProduct(company.id));
    }
    
    await bulkIndex('products', products);
    console.log(`  ✅ ${products.length} productos indexados`);

    // 2. Generar clientes
    console.log('  👥 Generando clientes...');
    const customers = [];
    for (let i = 0; i < NUM_CUSTOMERS_PER_COMPANY; i++) {
      customers.push(generateCustomer(company.id));
      
      if ((i + 1) % 100 === 0) {
        process.stdout.write(`\r  Progreso: ${i + 1}/${NUM_CUSTOMERS_PER_COMPANY} clientes`);
      }
    }
    console.log(`\n  ✅ ${customers.length} clientes generados`);

    // 3. Generar facturas por lotes
    console.log('  🧾 Generando facturas...');
    let totalInvoices = 0;
    const customerInvoices = {};
    
    for (let i = 0; i < customers.length; i += BATCH_SIZE) {
      const batch = customers.slice(i, i + BATCH_SIZE);
      const invoicesBatch = [];
      
      for (const customer of batch) {
        // Número aleatorio de facturas por cliente
        const numInvoices = Math.floor(Math.random() * AVG_INVOICES_PER_CUSTOMER * 2);
        const customerInvoiceList = [];
        
        for (let j = 0; j < numInvoices; j++) {
          const invoice = generateInvoice(customer, products, company.id);
          invoicesBatch.push(invoice);
          customerInvoiceList.push(invoice);
        }
        
        customerInvoices[customer.customer_id] = customerInvoiceList;
      }
      
      if (invoicesBatch.length > 0) {
        await bulkIndex('invoices', invoicesBatch);
        totalInvoices += invoicesBatch.length;
      }
      
      process.stdout.write(`\r  Progreso: ${Math.min(i + BATCH_SIZE, customers.length)}/${customers.length} clientes procesados`);
    }
    
    console.log(`\n  ✅ ${totalInvoices} facturas indexadas`);

    // 4. Actualizar clientes con estadísticas
    console.log('  📊 Calculando estadísticas de clientes...');
    
    for (let i = 0; i < customers.length; i += BATCH_SIZE) {
      const batch = customers.slice(i, i + BATCH_SIZE);
      const enrichedCustomers = batch.map(customer => {
        const invoices = customerInvoices[customer.customer_id] || [];
        return calculateCustomerStats(customer, invoices);
      });
      
      await bulkIndex('customers', enrichedCustomers);
      
      process.stdout.write(`\r  Progreso: ${Math.min(i + BATCH_SIZE, customers.length)}/${customers.length} clientes enriquecidos`);
    }
    
    console.log(`\n  ✅ ${customers.length} clientes indexados con estadísticas`);
  }

  // Refrescar índices
  console.log('\n🔄 Refrescando índices...');
  await client.indices.refresh({ index: ['customers', 'invoices', 'products'] });

  // Mostrar estadísticas finales
  console.log('\n📈 Estadísticas finales:');
  
  const customerCount = await client.count({ index: 'customers' });
  const invoiceCount = await client.count({ index: 'invoices' });
  const productCount = await client.count({ index: 'products' });
  
  console.log(`  Clientes: ${customerCount.count.toLocaleString()}`);
  console.log(`  Facturas: ${invoiceCount.count.toLocaleString()}`);
  console.log(`  Productos: ${productCount.count.toLocaleString()}`);

  // Consulta de ejemplo: clientes inactivos
  const inactiveCustomers = await client.search({
    index: 'customers',
    body: {
      query: {
        bool: {
          must: [
            { term: { is_inactive: true } }
          ]
        }
      },
      size: 0
    }
  });
  
  console.log(`  Clientes inactivos (>90 días): ${inactiveCustomers.hits.total.value.toLocaleString()}`);

  console.log('\n✨ Datos generados exitosamente!');
  process.exit(0);
}

seedData().catch(error => {
  console.error('❌ Error generando datos:', error);
  process.exit(1);
});
