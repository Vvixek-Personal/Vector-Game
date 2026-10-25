import { defineConfig } from '@playwright/test';
import base from './playwright.config';
export default defineConfig({ ...base, testMatch: 'tests/production.spec.ts', timeout: 60000, use: { ...base.use, baseURL: process.env.VECTOR_TEST_URL || 'http://127.0.0.1:4173' } });
