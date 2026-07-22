import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/StudyLanguage/',
  test: {
    environment: 'jsdom',
  },
});
