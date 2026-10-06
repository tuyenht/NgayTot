/**
 * NgayTot — Service Worker: chạy được ngoại tuyến sau lần tải đầu.
 *
 * Chiến lược: mạng trước, bộ nhớ đệm khi không có mạng. Ứng dụng không có bước build nên tên tệp
 * không mang mã phiên bản; nếu lấy từ bộ nhớ đệm trước thì người dùng cũ kẹt ở bản cũ sau mỗi lần cập nhật.
 * Đổi CACHE_NAME khi thay danh sách tệp để dọn bộ nhớ đệm cũ.
 */
const CACHE_NAME = 'ngaytot-pwa-v4';
const NETWORK_TIMEOUT_MS = 4000;
const FONT_FILES = [
  '400-0', '400-1', '400-2', '500-3', '500-4', '500-5', '600-6', '600-7', '600-8',
  '700-9', '700-10', '700-11', '800-12', '800-13', '800-14',
].map((n) => `./assets/fonts/be-vietnam-pro-${n}.woff2`);
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/fonts.css',
  './css/styles.css',
  './assets/hero.jpg',
  './assets/fonts/noto-serif-sc-han-600-0.woff2',
  ...FONT_FILES,
  './vendor/lunar.js',
  './js/core/data.js',
  './js/core/i18n-vi.js',
  './js/core/calendar-vn.js',
  './js/core/bazi.js',
  './js/core/name-element.js',
  './js/core/activities.js',
  './js/core/legal.js',
  './js/core/scoring.js',
  './js/core/wedding-plan.js',
  './js/core/canh-clock.js',
  './js/core/anniversary-calc.js',
  './js/core/prayers-data.js',
  './js/storage/idb-manager.js',
  './js/ui/month-calendar-ui.js',
  './js/ui/compass-ui.js',
  './js/ui/anniversary-ui.js',
  './js/ui/prayers-ui.js',
  './js/ui/app.js'
];

self.addEventListener('install', (event) => {
  // Thiếu một tệp thì cài đặt thất bại và bản cũ tiếp tục phục vụ: không để lại bộ nhớ đệm thiếu
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  // Mạng chập chờn: quá NETWORK_TIMEOUT_MS chưa có phản hồi thì dùng bản đệm (nếu có) thay vì treo trang
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), NETWORK_TIMEOUT_MS);
  const fromCache = () =>
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined));
  event.respondWith(
    // Truyền nguyên req (không phải req.url) để yêu cầu điều hướng giữ chế độ chuyển hướng của trình duyệt
    fetch(req, { cache: 'no-cache', signal: ctrl.signal }).then(async (res) => {
      clearTimeout(timer);
      if (res && res.status === 200 && res.type === 'basic') {
        const copy = res.clone();
        event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)));
      }
      // Máy chủ lỗi tạm thời (5xx) mà đang có bản đệm tốt thì dùng bản đệm
      if (res && res.status >= 500) return (await fromCache()) || res;
      return res;
    }).catch(async () => {
      clearTimeout(timer);
      // Không có bản đệm thì thử mạng lần nữa, không giới hạn thời gian (lần tải đầu trên mạng chậm)
      return (await fromCache()) || fetch(req).catch(() => Response.error());
    })
  );
});
