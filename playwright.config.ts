import { defineConfig } from '@playwright/test';
export default defineConfig({
  testMatch: ['tests/browser.spec.ts', 'tests/refresh.spec.ts'], timeout: 180000, workers: 1,
  use: { baseURL: process.env.VECTOR_TEST_URL || 'http://127.0.0.1:3000', headless: true, viewport: { width: 1280, height: 800 },
    launchOptions: { executablePath: process.env.VECTOR_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' } },
});
