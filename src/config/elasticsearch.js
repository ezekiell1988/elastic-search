import { Client } from '@elastic/elasticsearch';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  node: process.env.ELASTIC_SEARCH_ENDPOINT,
  auth: {
    apiKey: process.env.ELASTIC_SEARCH_API_KEY
  },
  tls: {
    rejectUnauthorized: true
  }
});

// Verificar conexión (compatible con serverless)
export async function verifyConnection() {
  try {
    // En serverless, usamos una búsqueda simple para verificar la conexión
    await client.ping();
    console.log('✅ Conectado a Elasticsearch Serverless');
    return true;
  } catch (error) {
    console.error('❌ Error conectando a Elasticsearch:', error.message);
    return false;
  }
}

export default client;
