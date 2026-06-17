import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Usa porta 0 para evitar conflito de porta ao importar server.js em testes
    env: {
      PORT: '0',
      NODE_ENV: 'test',
      WAVESPEED_API_KEY: 'test-key',
      ADMIN_SECRET: 'test-secret',
    },
    // Isola cada arquivo de teste para evitar estado compartilhado entre suites
    pool: 'forks',
  },
});
