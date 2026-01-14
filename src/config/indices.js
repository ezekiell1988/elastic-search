// Índice optimizado para búsqueda de clientes inactivos
export const customerIndex = {
  index: 'customers',
  mappings: {
    properties: {
      // Identificadores únicos
      customer_id: { type: 'keyword' },
      company_id: { type: 'keyword' },
      phone: { type: 'keyword' },
      
      // Información personal
      name: { 
        type: 'text',
        fields: {
          keyword: { type: 'keyword' }
        }
      },
      email: { type: 'keyword' },
      gender: { type: 'keyword' }, // hombre, mujer, otro
      
      // Ubicación
      city: { type: 'keyword' },
      state: { type: 'keyword' },
      country: { type: 'keyword' },
      
      // Metadatos temporales
      created_at: { type: 'date' },
      last_purchase_date: { type: 'date' },
      days_since_last_purchase: { type: 'integer' },
      
      // Estadísticas agregadas
      total_purchases: { type: 'integer' },
      total_spent: { type: 'float' },
      average_ticket: { type: 'float' },
      
      // Productos e ingredientes favoritos
      favorite_products: { type: 'keyword' },
      favorite_ingredients: { type: 'keyword' },
      product_categories: { type: 'keyword' },
      
      // Segmentación
      customer_segment: { type: 'keyword' }, // vip, regular, ocasional, inactivo
      is_inactive: { type: 'boolean' },
      
      // Texto completo para búsquedas complejas
      search_text: { type: 'text' }
    }
  },
  settings: {
    // Elasticsearch Serverless no permite configurar shards/replicas manualmente
    analysis: {
      analyzer: {
        spanish_analyzer: {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['lowercase', 'spanish_stop', 'spanish_stemmer']
        }
      },
      filter: {
        spanish_stop: {
          type: 'stop',
          stopwords: '_spanish_'
        },
        spanish_stemmer: {
          type: 'stemmer',
          language: 'spanish'
        }
      }
    }
  }
};

// Índice para facturas (encabezado)
export const invoiceIndex = {
  index: 'invoices',
  mappings: {
    properties: {
      invoice_id: { type: 'keyword' },
      company_id: { type: 'keyword' },
      customer_phone: { type: 'keyword' },
      customer_id: { type: 'keyword' },
      
      // Información de la factura
      invoice_number: { type: 'keyword' },
      invoice_date: { type: 'date' },
      total_amount: { type: 'float' },
      tax_amount: { type: 'float' },
      subtotal: { type: 'float' },
      
      // Ubicación de compra
      store_location: { type: 'keyword' },
      city: { type: 'keyword' },
      
      // Estado
      status: { type: 'keyword' }, // completed, cancelled, pending
      
      // Productos comprados (desnormalizado para búsquedas rápidas)
      product_names: { type: 'keyword' },
      product_ids: { type: 'keyword' },
      ingredient_names: { type: 'keyword' },
      categories: { type: 'keyword' }
    }
  }
};

// Índice para productos
export const productIndex = {
  index: 'products',
  mappings: {
    properties: {
      product_id: { type: 'keyword' },
      company_id: { type: 'keyword' },
      name: { 
        type: 'text',
        fields: {
          keyword: { type: 'keyword' }
        }
      },
      category: { type: 'keyword' },
      price: { type: 'float' },
      ingredients: { type: 'keyword' },
      description: { type: 'text' },
      is_active: { type: 'boolean' }
    }
  }
};
