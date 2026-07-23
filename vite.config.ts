import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/StudyLanguage/',
  test: {
    environment: 'jsdom',
    // The streak counts *local* calendar days, so its tests are only meaningful in a
    // fixed zone. Pin to the app's audience (Korea): without this, the regression test
    // for the UTC-day double-increment silently passes on the UTC CI runner, and the
    // tests that build dates from UTC literals break for anyone at a negative offset.
    env: { TZ: 'Asia/Seoul' },
  },
});
