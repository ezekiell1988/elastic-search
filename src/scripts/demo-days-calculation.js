const hoy = new Date('2026-01-13');
const ultimaCompra = new Date('2025-07-20');
const dias = Math.floor((hoy - ultimaCompra) / (1000 * 60 * 60 * 24));

console.log('═════════════════════════════════════════════════════════');
console.log('  EJEMPLO PRÁCTICO: CÁLCULO DINÁMICO DE DÍAS SIN COMPRA');
console.log('═════════════════════════════════════════════════════════\n');

console.log('📦 DATO ALMACENADO EN ELASTICSEARCH:');
console.log('   {');
console.log('     "id_cliente": 12345,');
console.log('     "nombre_cliente": "Juan Pérez",');
console.log('     "fecha_facturado": "2025-07-20T10:30:00Z",  👈 FIJO');
console.log('     "monto_total": 15000');
console.log('   }\n');

console.log('🧮 CÁLCULO EN TIEMPO REAL (JavaScript):');
console.log(`   const hoy = new Date();  // ${hoy.toISOString().split('T')[0]}`);
console.log(`   const ultimaCompra = new Date("2025-07-20");`);
console.log(`   const dias = (hoy - ultimaCompra) / (1000*60*60*24);`);
console.log(`   // Resultado: ${dias} días sin compra\n`);

console.log('📊 SIMULACIÓN MULTI-DÍA:');
console.log('┌─────────────┬──────────────────┬─────────────┐');
console.log('│ Fecha Hoy   │ Última Compra    │ Días Sin    │');
console.log('├─────────────┼──────────────────┼─────────────┤');

for (let i = 0; i <= 5; i++) {
  const fecha = new Date('2026-01-13');
  fecha.setDate(fecha.getDate() + i);
  const dias = Math.floor((fecha - ultimaCompra) / (1000 * 60 * 60 * 24));
  const fechaStr = fecha.toISOString().split('T')[0];
  const marca = i === 0 ? '👈 HOY' : '';
  console.log(`│ ${fechaStr} │ 2025-07-20       │ ${dias} días ${marca.padEnd(7)} │`);
}
console.log('└─────────────┴──────────────────┴─────────────┘\n');

console.log('✅ VENTAJAS:');
console.log('   • El campo "dias_sin_compra" NO existe en Elasticsearch');
console.log('   • Se calcula dinámicamente en cada consulta');
console.log('   • Siempre actualizado sin procesos adicionales');
console.log('   • Cero mantenimiento\n');

console.log('📝 NOTA IMPORTANTE:');
console.log('   Solo almacenas la fecha_facturado (dato fijo)');
console.log('   Los días se calculan comparando vs new Date() (hoy)');
console.log('   Mañana automáticamente será +1 día más\n');
