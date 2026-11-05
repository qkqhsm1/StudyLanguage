import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

// 해시가 붙는 빌드 파일 이름은 빌드해야 알 수 있어, 그 목록을 넣어 sw.js를 만든다.
function serviceWorker(): Plugin {
  return {
    name: 'hitokoto-service-worker',
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundle) {
      const built = Object.keys(bundle).filter((file) => file !== 'index.html');
      const icons = ['manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png'];
      const version = createHash('sha256').update(built.sort().join()).digest('hex').slice(0, 12);
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: readFileSync('src/sw-template.js', 'utf8')
          .replace('__VERSION__', version)
          .replace('__FILES__', JSON.stringify([...built, ...icons])),
      });
    },
  };
}

export default defineConfig({
  base: '/StudyLanguage/',
  plugins: [serviceWorker()],
  test: {
    environment: 'jsdom',
    // The streak counts *local* calendar days, so its tests are only meaningful in a
    // fixed zone. Pin to the app's audience (Korea): without this, the regression test
    // for the UTC-day double-increment silently passes on the UTC CI runner, and the
    // tests that build dates from UTC literals break for anyone at a negative offset.
    env: { TZ: 'Asia/Seoul' },
  },
});
