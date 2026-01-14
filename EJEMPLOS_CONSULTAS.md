# 🔍 Ejemplos de Consultas

## Usando curl

### 1. Mujeres de San José que compraron pepperoni (inactivas >90 días)

```bash
curl -X POST http://localhost:3000/api/customers/search \
  -H "Content-Type: application/json" \
  -d '{
    "gender": "mujer",
    "city": "San José",
    "ingredients": ["pepperoni"],
    "minDaysSinceLastPurchase": 90,
    "size": 10
  }'
```

### 2. Búsqueda de texto libre

```bash
curl -X POST http://localhost:3000/api/customers/free-text-search \
  -H "Content-Type: application/json" \
  -d '{
    "searchText": "mujer pepperoni san jose",
    "minDaysSinceLastPurchase": 90,
    "size": 10
  }'
```

### 3. Clientes VIP que dejaron de comprar

```bash
curl -X POST http://localhost:3000/api/customers/search \
  -H "Content-Type: application/json" \
  -d '{
    "customerSegment": "vip",
    "minDaysSinceLastPurchase": 60,
    "minTotalSpent": 300,
    "size": 20
  }'
```

### 4. Exportar a Excel

```bash
curl -X POST http://localhost:3000/api/customers/export \
  -H "Content-Type: application/json" \
  -d '{
    "gender": "mujer",
    "city": "San José",
    "ingredients": ["pepperoni"],
    "minDaysSinceLastPurchase": 90
  }' \
  --output clientes_inactivos.xlsx
```

### 5. Estadísticas de clientes inactivos

```bash
curl -X GET http://localhost:3000/api/customers/inactive-stats
```

### 6. Por compañía específica

```bash
curl -X GET "http://localhost:3000/api/customers/inactive-stats?companyId=COMP001"
```

### 7. Clientes que compraban Pizza Hawaiana

```bash
curl -X POST http://localhost:3000/api/customers/search \
  -H "Content-Type: application/json" \
  -d '{
    "products": ["Pizza Hawaiana"],
    "minDaysSinceLastPurchase": 120,
    "size": 15
  }'
```

### 8. Hombres de Cartago, inactivos 6+ meses

```bash
curl -X POST http://localhost:3000/api/customers/search \
  -H "Content-Type: application/json" \
  -d '{
    "gender": "hombre",
    "city": "Cartago",
    "minDaysSinceLastPurchase": 180,
    "size": 10
  }'
```

### 9. Clientes regulares con ingrediente específico

```bash
curl -X POST http://localhost:3000/api/customers/search \
  -H "Content-Type: application/json" \
  -d '{
    "customerSegment": "regular",
    "ingredients": ["jamón", "piña"],
    "minDaysSinceLastPurchase": 90,
    "size": 15
  }'
```

### 10. Búsqueda compleja: múltiples criterios

```bash
curl -X POST http://localhost:3000/api/customers/search \
  -H "Content-Type: application/json" \
  -d '{
    "gender": "mujer",
    "city": "Heredia",
    "products": ["Pizza Vegetariana"],
    "ingredients": ["champiñones", "pimiento"],
    "minDaysSinceLastPurchase": 90,
    "maxDaysSinceLastPurchase": 180,
    "minTotalSpent": 100,
    "customerSegment": "regular",
    "size": 20,
    "sortBy": "total_spent",
    "sortOrder": "desc"
  }'
```

## Usando JavaScript/Node.js

```javascript
// searchCustomers.js
import fetch from 'node-fetch';

async function searchCustomers() {
  const response = await fetch('http://localhost:3000/api/customers/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      gender: 'mujer',
      city: 'San José',
      ingredients: ['pepperoni'],
      minDaysSinceLastPurchase: 90,
      size: 10
    })
  });

  const data = await response.json();
  console.log(`Encontrados: ${data.total} clientes`);
  console.log(JSON.stringify(data.customers, null, 2));
}

searchCustomers();
```

## Usando Python

```python
import requests
import json

def search_customers():
    url = 'http://localhost:3000/api/customers/search'
    
    payload = {
        'gender': 'mujer',
        'city': 'San José',
        'ingredients': ['pepperoni'],
        'minDaysSinceLastPurchase': 90,
        'size': 10
    }
    
    response = requests.post(url, json=payload)
    data = response.json()
    
    print(f"Encontrados: {data['total']} clientes")
    print(json.dumps(data['customers'], indent=2))

if __name__ == '__main__':
    search_customers()
```

## Parámetros Disponibles

### Para `/api/customers/search`:

| Parámetro | Tipo | Descripción | Ejemplo |
|-----------|------|-------------|---------|
| `gender` | string | Género del cliente | `"mujer"`, `"hombre"`, `"otro"` |
| `city` | string | Ciudad | `"San José"`, `"Alajuela"` |
| `products` | array | Productos favoritos | `["Pizza Pepperoni"]` |
| `ingredients` | array | Ingredientes favoritos | `["pepperoni", "jamón"]` |
| `minDaysSinceLastPurchase` | number | Días mínimos sin comprar | `90` |
| `maxDaysSinceLastPurchase` | number | Días máximos sin comprar | `180` |
| `companyId` | string | ID de compañía | `"COMP001"` |
| `customerSegment` | string | Segmento de cliente | `"vip"`, `"regular"`, `"ocasional"`, `"inactivo"` |
| `minTotalSpent` | number | Gasto mínimo total | `100` |
| `maxTotalSpent` | number | Gasto máximo total | `500` |
| `from` | number | Paginación: inicio | `0` |
| `size` | number | Paginación: cantidad | `100` |
| `sortBy` | string | Ordenar por | `"days_since_last_purchase"`, `"total_spent"`, `"last_purchase_date"` |
| `sortOrder` | string | Orden | `"desc"`, `"asc"` |

### Para `/api/customers/free-text-search`:

| Parámetro | Tipo | Descripción | Ejemplo |
|-----------|------|-------------|---------|
| `searchText` | string | Texto de búsqueda | `"mujer pepperoni san jose"` |
| `minDaysSinceLastPurchase` | number | Días mínimos sin comprar | `90` |
| `from` | number | Paginación: inicio | `0` |
| `size` | number | Paginación: cantidad | `100` |

## Ciudades Disponibles

- San José
- Alajuela
- Cartago
- Heredia
- Limón
- Puntarenas
- Guanacaste
- Escazú
- Curridabat
- Desamparados
- San Pedro
- Santa Ana
- Moravia
- Tibás
- Goicoechea

## Productos Comunes

- Pizza Pepperoni
- Pizza Hawaiana
- Pizza Vegetariana
- Pizza Carnes
- Pizza Mexicana
- Pizza Margarita
- Pizza BBQ Chicken
- Pizza Suprema

## Ingredientes Comunes

- pepperoni
- jamón
- piña
- pimiento
- cebolla
- champiñones
- aceitunas
- tomate
- jalapeño
- pollo
- tocino
- carne molida
