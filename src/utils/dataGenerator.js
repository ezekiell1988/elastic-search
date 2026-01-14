import { fakerES } from '@faker-js/faker';

// Usar fakerES para datos en español (locale es-MX)

// Datos de Costa Rica (ajusta según tu país)
const cities = [
  'San José', 'Alajuela', 'Cartago', 'Heredia', 'Limón', 
  'Puntarenas', 'Guanacaste', 'Escazú', 'Curridabat', 'Desamparados',
  'San Pedro', 'Santa Ana', 'Moravia', 'Tibás', 'Goicoechea'
];

const companies = [
  { id: 'COMP001', name: "PizzaHut CR" },
  { id: 'COMP002', name: "Domino's Pizza CR" },
  { id: 'COMP003', name: "Domino's Pizza SV" }
];

// Ingredientes de pizza
const ingredients = [
  'pepperoni', 'jamón', 'salchicha', 'tocino', 'carne molida',
  'pollo', 'pimiento', 'cebolla', 'champiñones', 'aceitunas',
  'tomate', 'piña', 'jalapeño', 'queso mozzarella', 'queso cheddar',
  'albahaca', 'orégano', 'ajo', 'maíz', 'espinaca'
];

// Productos por categoría
const productsByCategory = {
  pizzas: [
    { name: 'Pizza Pepperoni', ingredients: ['pepperoni', 'queso mozzarella', 'salsa tomate'] },
    { name: 'Pizza Hawaiana', ingredients: ['jamón', 'piña', 'queso mozzarella'] },
    { name: 'Pizza Vegetariana', ingredients: ['pimiento', 'cebolla', 'champiñones', 'aceitunas', 'tomate'] },
    { name: 'Pizza Carnes', ingredients: ['pepperoni', 'salchicha', 'tocino', 'carne molida'] },
    { name: 'Pizza Mexicana', ingredients: ['carne molida', 'jalapeño', 'cebolla', 'tomate'] },
    { name: 'Pizza Margarita', ingredients: ['tomate', 'queso mozzarella', 'albahaca'] },
    { name: 'Pizza BBQ Chicken', ingredients: ['pollo', 'cebolla', 'queso cheddar'] },
    { name: 'Pizza Suprema', ingredients: ['pepperoni', 'salchicha', 'pimiento', 'cebolla', 'champiñones'] }
  ],
  bebidas: [
    { name: 'Coca Cola', ingredients: [] },
    { name: 'Sprite', ingredients: [] },
    { name: 'Fanta', ingredients: [] },
    { name: 'Agua', ingredients: [] }
  ],
  acompañamientos: [
    { name: 'Papas Fritas', ingredients: ['papa', 'sal'] },
    { name: 'Aros de Cebolla', ingredients: ['cebolla'] },
    { name: 'Alitas', ingredients: ['pollo'] },
    { name: 'Pan de Ajo', ingredients: ['ajo', 'pan'] }
  ]
};

export function generatePhoneNumber() {
  return `+506${fakerES.string.numeric(8)}`;
}

export function generateCustomer(companyId) {
  const gender = fakerES.helpers.arrayElement(['mujer', 'hombre', 'otro']);
  const firstName = gender === 'mujer' 
    ? fakerES.person.firstName('female')
    : fakerES.person.firstName('male');
  
  const phone = generatePhoneNumber();
  
  return {
    customer_id: `${companyId}-${phone}`,
    company_id: companyId,
    phone: phone,
    name: `${firstName} ${fakerES.person.lastName()}`,
    email: fakerES.internet.email().toLowerCase(),
    gender: gender,
    city: fakerES.helpers.arrayElement(cities),
    state: 'Costa Rica',
    country: 'CR',
    created_at: fakerES.date.between({ 
      from: '2020-01-01', 
      to: '2023-01-01' 
    })
  };
}

export function generateProduct(companyId) {
  const category = fakerES.helpers.arrayElement(Object.keys(productsByCategory));
  const product = fakerES.helpers.arrayElement(productsByCategory[category]);
  
  return {
    product_id: `PROD-${fakerES.string.alphanumeric(8).toUpperCase()}`,
    company_id: companyId,
    name: product.name,
    category: category,
    price: fakerES.number.float({ min: 5, max: 50, precision: 0.01 }),
    ingredients: product.ingredients,
    description: fakerES.commerce.productDescription(),
    is_active: true
  };
}

export function generateInvoice(customer, products, companyId) {
  const numProducts = fakerES.number.int({ min: 1, max: 5 });
  const selectedProducts = fakerES.helpers.arrayElements(products, numProducts);
  
  const subtotal = selectedProducts.reduce((sum, p) => sum + p.price, 0);
  const taxAmount = subtotal * 0.13; // IVA Costa Rica
  const totalAmount = subtotal + taxAmount;
  
  // Generar fecha de compra
  // Para simular clientes inactivos, algunas facturas serán antiguas
  const isRecent = Math.random() > 0.3; // 70% facturas recientes
  const invoiceDate = isRecent
    ? fakerES.date.recent({ days: 90 })
    : fakerES.date.between({ from: '2020-01-01', to: '2023-06-01' });
  
  const allIngredients = selectedProducts
    .flatMap(p => p.ingredients)
    .filter((v, i, a) => a.indexOf(v) === i); // unique
  
  return {
    invoice_id: `INV-${fakerES.string.alphanumeric(10).toUpperCase()}`,
    company_id: companyId,
    customer_phone: customer.phone,
    customer_id: customer.customer_id,
    invoice_number: fakerES.string.numeric(8),
    invoice_date: invoiceDate,
    total_amount: totalAmount,
    tax_amount: taxAmount,
    subtotal: subtotal,
    store_location: fakerES.helpers.arrayElement(cities),
    city: customer.city,
    status: 'completed',
    product_names: selectedProducts.map(p => p.name),
    product_ids: selectedProducts.map(p => p.product_id),
    ingredient_names: allIngredients,
    categories: [...new Set(selectedProducts.map(p => p.category))]
  };
}

export function calculateCustomerStats(customer, invoices) {
  if (invoices.length === 0) {
    return {
      ...customer,
      last_purchase_date: customer.created_at,
      days_since_last_purchase: Math.floor((new Date() - new Date(customer.created_at)) / (1000 * 60 * 60 * 24)),
      total_purchases: 0,
      total_spent: 0,
      average_ticket: 0,
      favorite_products: [],
      favorite_ingredients: [],
      product_categories: [],
      customer_segment: 'inactivo',
      is_inactive: true,
      search_text: `${customer.name} ${customer.gender} ${customer.city} ${customer.phone}`
    };
  }

  // Última compra
  const sortedInvoices = invoices.sort((a, b) => 
    new Date(b.invoice_date) - new Date(a.invoice_date)
  );
  const lastPurchase = sortedInvoices[0];
  const daysSinceLastPurchase = Math.floor(
    (new Date() - new Date(lastPurchase.invoice_date)) / (1000 * 60 * 60 * 24)
  );

  // Estadísticas
  const totalSpent = invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
  const averageTicket = totalSpent / invoices.length;

  // Productos e ingredientes favoritos
  const allProducts = invoices.flatMap(inv => inv.product_names);
  const allIngredients = invoices.flatMap(inv => inv.ingredient_names);
  const allCategories = invoices.flatMap(inv => inv.categories);

  const productCounts = {};
  allProducts.forEach(p => productCounts[p] = (productCounts[p] || 0) + 1);
  const favoriteProducts = Object.entries(productCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);

  const ingredientCounts = {};
  allIngredients.forEach(i => ingredientCounts[i] = (ingredientCounts[i] || 0) + 1);
  const favoriteIngredients = Object.entries(ingredientCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);

  // Segmentación
  let segment = 'ocasional';
  if (daysSinceLastPurchase > 90) segment = 'inactivo';
  else if (totalSpent > 500) segment = 'vip';
  else if (invoices.length > 10) segment = 'regular';

  const searchText = [
    customer.name,
    customer.gender,
    customer.city,
    ...favoriteProducts,
    ...favoriteIngredients
  ].join(' ');

  return {
    ...customer,
    last_purchase_date: lastPurchase.invoice_date,
    days_since_last_purchase: daysSinceLastPurchase,
    total_purchases: invoices.length,
    total_spent: totalSpent,
    average_ticket: averageTicket,
    favorite_products: favoriteProducts,
    favorite_ingredients: favoriteIngredients,
    product_categories: [...new Set(allCategories)],
    customer_segment: segment,
    is_inactive: daysSinceLastPurchase > 90,
    search_text: searchText
  };
}

export { cities, companies, productsByCategory };
