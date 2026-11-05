// 빌드할 때 vite.config.ts가 버전과 파일 목록을 채워 dist/sw.js로 내보낸다.
const CACHE = 'hitokoto-__VERSION__';
const FONT_CACHE = 'hitokoto-fonts';
const FILES = __FILES__;
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(['./', ...FILES])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE && key !== FONT_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

/** 파일 이름에 해시가 있어 내용이 바뀌지 않는다. 받아 둔 게 있으면 그대로 쓴다. */
async function cacheFirst(cacheName, request, fetchRequest = request) {
  const cache = await caches.open(cacheName);
  // 미리 받을 때와 동적 import의 요청 헤더가 달라 Vary를 따지면 저장본을 못 찾는다.
  const hit = await cache.match(request, { ignoreVary: true });
  if (hit) return hit;
  const response = await fetch(fetchRequest);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

/** 첫 화면만은 최신을 먼저 받는다. 그래야 push한 내용이 바로 보이고, 인터넷이 없을 때만 저장본을 연다. */
async function networkFirstPage(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put('./', response.clone());
    return response;
  } catch {
    return (await cache.match('./')) ?? Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(request));
  } else if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(CACHE, request));
  } else if (FONT_HOSTS.includes(url.hostname)) {
    // cors로 받아야 응답 크기가 보이고 저장 공간을 부풀리지 않는다.
    event.respondWith(cacheFirst(FONT_CACHE, request, new Request(request.url, { mode: 'cors', credentials: 'omit' })));
  }
  // 기록 연동과 듀오링고 음성은 항상 네트워크로 보낸다.
});
