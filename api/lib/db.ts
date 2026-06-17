import { createPool } from '@vercel/postgres';

// Cria um pool de conexão usando a variável de ambiente POSTGRES_URL
export const db = createPool({
    connectionString: process.env.POSTGRES_URL,
});
