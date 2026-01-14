import customerService from '../services/customerService.js';

console.log('🧪 Probando consultas de Elasticsearch\n');

// Test 1: Búsqueda estructurada
console.log('📋 Test 1: Mujeres de San José que compraron pepperoni (>90 días inactivas)');
console.log('═══════════════════════════════════════════════════════════════════\n');

try {
  const result1 = await customerService.searchInactiveCustomers({
    gender: 'mujer',
    city: 'San José',
    ingredients: ['pepperoni'],
    minDaysSinceLastPurchase: 90,
    size: 5
  });

  console.log(`✅ Encontrados: ${result1.total} clientes`);
  console.log(`⏱️  Tiempo: ${result1.took}ms\n`);
  
  if (result1.customers.length > 0) {
    console.log('Primeros 5 resultados:\n');
    result1.customers.forEach((c, i) => {
      console.log(`${i + 1}. ${c.name}`);
      console.log(`   📞 ${c.phone} | 📧 ${c.email}`);
      console.log(`   📍 ${c.city} | 🚫 ${c.days_since_last_purchase} días sin comprar`);
      console.log(`   💰 Total gastado: $${c.total_spent.toFixed(2)} | 🛒 ${c.total_purchases} compras`);
      console.log(`   ⭐ Favoritos: ${c.favorite_products.slice(0, 3).join(', ')}`);
      console.log('');
    });
  }
} catch (error) {
  console.error('❌ Error:', error.message);
}

// Test 2: Búsqueda de texto libre
console.log('\n📋 Test 2: Búsqueda de texto libre');
console.log('═══════════════════════════════════════════════════════════════════\n');

try {
  const result2 = await customerService.freeTextSearch(
    'hombre alajuela hawaiana',
    { minDaysSinceLastPurchase: 90, size: 5 }
  );

  console.log(`✅ Encontrados: ${result2.total} clientes`);
  console.log(`⏱️  Tiempo: ${result2.took}ms\n`);
  
  if (result2.customers.length > 0) {
    console.log('Primeros 5 resultados:\n');
    result2.customers.forEach((c, i) => {
      console.log(`${i + 1}. ${c.name} (Score: ${c.score.toFixed(2)})`);
      console.log(`   📞 ${c.phone} | 🚫 ${c.days_since_last_purchase} días sin comprar`);
      console.log(`   ⭐ ${c.favorite_products.slice(0, 3).join(', ')}\n`);
    });
  }
} catch (error) {
  console.error('❌ Error:', error.message);
}

// Test 3: Estadísticas
console.log('\n📋 Test 3: Estadísticas de clientes inactivos');
console.log('═══════════════════════════════════════════════════════════════════\n');

try {
  const stats = await customerService.getInactiveCustomersStats();

  console.log(`✅ Total clientes inactivos: ${stats.total}\n`);
  
  console.log('Por género:');
  stats.aggregations.by_gender.buckets.forEach(b => {
    console.log(`  ${b.key}: ${b.doc_count}`);
  });
  
  console.log('\nTop 5 ciudades:');
  stats.aggregations.by_city.buckets.slice(0, 5).forEach(b => {
    console.log(`  ${b.key}: ${b.doc_count}`);
  });
  
  console.log('\nTop 5 productos favoritos:');
  stats.aggregations.top_favorite_products.buckets.slice(0, 5).forEach(b => {
    console.log(`  ${b.key}: ${b.doc_count}`);
  });
  
  console.log('\nTop 5 ingredientes favoritos:');
  stats.aggregations.top_favorite_ingredients.buckets.slice(0, 5).forEach(b => {
    console.log(`  ${b.key}: ${b.doc_count}`);
  });

  console.log('\nEstadísticas de gasto:');
  const spentStats = stats.aggregations.total_spent_stats;
  console.log(`  Promedio: $${spentStats.avg.toFixed(2)}`);
  console.log(`  Mínimo: $${spentStats.min.toFixed(2)}`);
  console.log(`  Máximo: $${spentStats.max.toFixed(2)}`);
  console.log(`  Total: $${spentStats.sum.toFixed(2)}`);
  
} catch (error) {
  console.error('❌ Error:', error.message);
}

console.log('\n✨ Tests completados');
process.exit(0);
