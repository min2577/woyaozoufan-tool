const CACHE_NAME = 'woyaozoufan-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html'
];

// 紧急修复：废弃旧的 SW，并清理所有缓存，防止 dev 模式下被缓存污染
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          console.log('[SW] Deleting cache:', name);
          return caches.delete(name);
        })
      );
    }).then(() => {
      self.registration.unregister().then(() => {
        console.log('[SW] Unregistered successfully');
      });
    })
  );
});

self.addEventListener('fetch', (event) => {
  // 不做任何拦截，直接走网络
  return;
});

// 消息处理
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Skipping waiting');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('[SW] Clearing cache');
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => caches.delete(name))
        );
      })
    );
  }
});
