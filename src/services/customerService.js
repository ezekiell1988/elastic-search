import client from '../config/elasticsearch.js';

/**
 * Servicio para consultas complejas de clientes inactivos
 */
export class CustomerQueryService {
  
  /**
   * Búsqueda avanzada de clientes inactivos
   * Ejemplo: "mujer, pepperoni, san jose, ya no compra en 3 meses"
   */
  async searchInactiveCustomers(params) {
    const {
      gender,           // 'mujer', 'hombre', 'otro'
      city,             // 'San José', 'Alajuela', etc.
      products = [],    // ['Pizza Pepperoni', ...]
      ingredients = [], // ['pepperoni', 'jamón', ...]
      minDaysSinceLastPurchase = null, // días mínimos sin comprar (opcional)
      maxDaysSinceLastPurchase = null,
      companyId = null,
      customerSegment = null, // 'vip', 'regular', 'ocasional', 'inactivo'
      minTotalSpent = null,
      maxTotalSpent = null,
      from = 0,
      size = 100,
      sortBy = 'days_since_last_purchase', // o 'total_spent', 'last_purchase_date'
      sortOrder = 'desc'
    } = params;

    // Construir query booleano
    const must = [];
    const should = [];
    const filter = [];

    // Filtro por inactividad (opcional)
    if (minDaysSinceLastPurchase !== null && minDaysSinceLastPurchase !== undefined || 
        maxDaysSinceLastPurchase !== null && maxDaysSinceLastPurchase !== undefined) {
      const rangeQuery = {
        range: {
          days_since_last_purchase: {}
        }
      };
      
      if (minDaysSinceLastPurchase !== null && minDaysSinceLastPurchase !== undefined) {
        rangeQuery.range.days_since_last_purchase.gte = minDaysSinceLastPurchase;
      }
      
      if (maxDaysSinceLastPurchase !== null && maxDaysSinceLastPurchase !== undefined) {
        rangeQuery.range.days_since_last_purchase.lte = maxDaysSinceLastPurchase;
      }
      
      filter.push(rangeQuery);
    }

    // Filtros exactos
    if (gender) {
      filter.push({ term: { gender: gender.toLowerCase() } });
    }

    if (city) {
      filter.push({ term: { city } });
    }

    if (companyId) {
      filter.push({ term: { company_id: companyId } });
    }

    if (customerSegment) {
      filter.push({ term: { customer_segment: customerSegment } });
    }

    // Rango de gasto
    if (minTotalSpent !== null || maxTotalSpent !== null) {
      filter.push({
        range: {
          total_spent: {
            ...(minTotalSpent !== null && { gte: minTotalSpent }),
            ...(maxTotalSpent !== null && { lte: maxTotalSpent })
          }
        }
      });
    }

    // Productos favoritos (búsqueda flexible con tolerancia a errores)
    if (products.length > 0) {
      products.forEach(product => {
        should.push({
          match: {
            favorite_products: {
              query: product,
              fuzziness: 'AUTO',
              boost: 2.0
            }
          }
        });
      });
    }

    // Ingredientes favoritos (búsqueda flexible con tolerancia a errores)
    if (ingredients.length > 0) {
      ingredients.forEach(ingredient => {
        should.push({
          match: {
            favorite_ingredients: {
              query: ingredient,
              fuzziness: 'AUTO',
              boost: 1.5
            }
          }
        });
      });
    }

    // Si hay should clauses, al menos una debe coincidir
    const boolQuery = {
      bool: {
        must,
        filter,
        ...(should.length > 0 && { 
          should,
          minimum_should_match: 1 
        })
      }
    };

    // Ejecutar búsqueda
    const response = await client.search({
      index: 'customers',
      body: {
        query: boolQuery,
        sort: [
          { [sortBy]: { order: sortOrder } }
        ],
        from,
        size,
        _source: [
          'customer_id', 'name', 'email', 'phone', 'gender', 'city',
          'last_purchase_date', 'days_since_last_purchase',
          'total_purchases', 'total_spent', 'average_ticket',
          'favorite_products', 'favorite_ingredients',
          'customer_segment', 'company_id'
        ]
      }
    });

    return {
      total: response.hits.total.value,
      customers: response.hits.hits.map(hit => ({
        ...hit._source,
        score: hit._score
      })),
      took: response.took
    };
  }

  /**
   * Búsqueda de texto libre (conversacional)
   * Ejemplo: "mujeres de san jose que compraron pepperoni hace mas de 3 meses"
   */
  async freeTextSearch(searchText, options = {}) {
    const {
      minDaysSinceLastPurchase = 90,
      from = 0,
      size = 100
    } = options;

    const response = await client.search({
      index: 'customers',
      body: {
        query: {
          bool: {
            must: [
              {
                multi_match: {
                  query: searchText,
                  fields: [
                    'search_text^2',
                    'name',
                    'favorite_products^1.5',
                    'favorite_ingredients^1.5',
                    'city',
                    'gender'
                  ],
                  type: 'best_fields',
                  fuzziness: 'AUTO'
                }
              }
            ],
            filter: [
              {
                range: {
                  days_since_last_purchase: { gte: minDaysSinceLastPurchase }
                }
              }
            ]
          }
        },
        sort: [
          { _score: 'desc' },
          { days_since_last_purchase: 'desc' }
        ],
        from,
        size
      }
    });

    return {
      total: response.hits.total.value,
      customers: response.hits.hits.map(hit => ({
        ...hit._source,
        score: hit._score
      })),
      took: response.took
    };
  }

  /**
   * Agregaciones para análisis
   */
  async getInactiveCustomersStats(companyId = null) {
    const filter = [
      { term: { is_inactive: true } }
    ];

    if (companyId) {
      filter.push({ term: { company_id: companyId } });
    }

    const response = await client.search({
      index: 'customers',
      body: {
        query: {
          bool: { filter }
        },
        size: 0,
        aggs: {
          by_gender: {
            terms: { field: 'gender', size: 10 }
          },
          by_city: {
            terms: { field: 'city', size: 20 }
          },
          by_segment: {
            terms: { field: 'customer_segment', size: 10 }
          },
          top_favorite_products: {
            terms: { field: 'favorite_products', size: 20 }
          },
          top_favorite_ingredients: {
            terms: { field: 'favorite_ingredients', size: 20 }
          },
          days_histogram: {
            histogram: {
              field: 'days_since_last_purchase',
              interval: 30,
              min_doc_count: 1
            }
          },
          total_spent_stats: {
            stats: { field: 'total_spent' }
          }
        }
      }
    });

    return {
      total: response.hits.total.value,
      aggregations: response.aggregations
    };
  }

  /**
   * Obtener detalles completos de un cliente
   */
  async getCustomerDetails(customerId) {
    // Cliente
    const customerResponse = await client.search({
      index: 'customers',
      body: {
        query: {
          term: { customer_id: customerId }
        },
        size: 1
      }
    });

    if (customerResponse.hits.total.value === 0) {
      return null;
    }

    const customer = customerResponse.hits.hits[0]._source;

    // Últimas facturas
    const invoicesResponse = await client.search({
      index: 'invoices',
      body: {
        query: {
          term: { customer_id: customerId }
        },
        sort: [{ invoice_date: 'desc' }],
        size: 20
      }
    });

    return {
      customer,
      recent_invoices: invoicesResponse.hits.hits.map(hit => hit._source)
    };
  }

  /**
   * Obtener totales de los índices
   */
  async getIndexTotals() {
    try {
      const [customersCount, invoicesCount, productsCount] = await Promise.all([
        client.count({ index: 'customers' }),
        client.count({ index: 'invoices' }),
        client.count({ index: 'products' })
      ]);

      return {
        customers: customersCount.count,
        invoices: invoicesCount.count,
        products: productsCount.count
      };
    } catch (error) {
      console.error('Error obteniendo totales de índices:', error);
      throw error;
    }
  }
}

export default new CustomerQueryService();
