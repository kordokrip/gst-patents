/**
 * Service Worker for GST Patent Management System
 * Cloudflare 배포 최적화 및 오프라인 지원
 */

const CACHE_NAME = 'gst-patents-v1.3.0';
const STATIC_CACHE = 'gst-static-v1.3.0';
const DYNAMIC_CACHE = 'gst-dynamic-v1.3.0';

// 캐시할 정적 리소스
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/main.js',
    '/js/patents.js',
    '/js/charts.js',
    '/js/timeline.js',
    '/js/enhanced-search.js',
    '/pages/architecture.html',
    '/pages/api-docs.html',
    '/pages/roadmap.html'
];

// CDN 리소스 (캐시할 외부 리소스)
const CDN_ASSETS = [
    'https://cdn.tailwindcss.com',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
    'https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js',
    'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.1/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700&display=swap'
];

// API 경로 (동적 캐싱)
const API_PATTERNS = [
    '/tables/',
    '/api/'
];

// 설치 이벤트 - 정적 자산 사전 캐시
self.addEventListener('install', event => {
    console.log('🔧 Service Worker installing...');
    
    event.waitUntil(
        Promise.all([
            // 정적 파일 캐시
            caches.open(STATIC_CACHE).then(cache => {
                console.log('📦 Pre-caching static assets...');
                return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { 
                    cache: 'reload' 
                })));
            }),
            
            // CDN 리소스 캐시 (에러 무시)
            caches.open(STATIC_CACHE).then(cache => {
                console.log('🌐 Pre-caching CDN assets...');
                return Promise.allSettled(
                    CDN_ASSETS.map(url => 
                        cache.add(new Request(url, { 
                            mode: 'cors',
                            cache: 'reload'
                        })).catch(err => {
                            console.warn(`Failed to cache ${url}:`, err);
                        })
                    )
                );
            })
        ]).then(() => {
            console.log('✅ Service Worker installation complete');
            // 즉시 활성화
            return self.skipWaiting();
        })
    );
});

// 활성화 이벤트 - 이전 캐시 정리
self.addEventListener('activate', event => {
    console.log('🚀 Service Worker activating...');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // 현재 버전이 아닌 캐시 삭제
                    if (cacheName !== STATIC_CACHE && 
                        cacheName !== DYNAMIC_CACHE && 
                        cacheName !== CACHE_NAME) {
                        console.log(`🗑️ Deleting old cache: ${cacheName}`);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('✅ Service Worker activated');
            // 모든 클라이언트 제어
            return self.clients.claim();
        })
    );
});

// Fetch 이벤트 - 네트워크 요청 인터셉트
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // HTTPS만 처리 (개발 환경 제외)
    if (url.protocol !== 'https:' && !url.hostname.includes('localhost')) {
        return;
    }
    
    // GET 요청만 캐시
    if (request.method !== 'GET') {
        return;
    }
    
    // Chrome extension 요청 무시
    if (url.protocol === 'chrome-extension:') {
        return;
    }
    
    event.respondWith(handleFetch(request));
});

/**
 * Fetch 요청 처리 전략
 */
async function handleFetch(request) {
    const url = new URL(request.url);
    
    try {
        // 1. 정적 자산: Cache First 전략
        if (isStaticAsset(url)) {
            return await cacheFirst(request);
        }
        
        // 2. API 요청: Network First 전략
        if (isAPIRequest(url)) {
            return await networkFirst(request);
        }
        
        // 3. CDN 자산: Stale While Revalidate 전략
        if (isCDNAsset(url)) {
            return await staleWhileRevalidate(request);
        }
        
        // 4. HTML 페이지: Network First with fallback
        if (request.destination === 'document' || 
            request.headers.get('accept')?.includes('text/html')) {
            return await networkFirstWithFallback(request);
        }
        
        // 5. 기타: Network Only
        return await fetch(request);
        
    } catch (error) {
        console.error('Fetch error:', error);
        return await handleFetchError(request, error);
    }
}

/**
 * Cache First 전략 - 정적 자산용
 */
async function cacheFirst(request) {
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
        // 백그라운드에서 업데이트 확인
        updateCache(request, cache);
        return cachedResponse;
    }
    
    // 캐시에 없으면 네트워크에서 가져와서 캐시
    const networkResponse = await fetch(request);
    if (networkResponse.status === 200) {
        cache.put(request, networkResponse.clone());
    }
    return networkResponse;
}

/**
 * Network First 전략 - API 요청용
 */
async function networkFirst(request) {
    const cache = await caches.open(DYNAMIC_CACHE);
    
    try {
        // 네트워크 우선 시도
        const networkResponse = await fetch(request, {
            // API 요청 타임아웃 설정
            signal: AbortSignal.timeout(5000)
        });
        
        if (networkResponse.status === 200) {
            // 성공한 응답 캐시
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
        
    } catch (error) {
        console.warn('Network request failed, trying cache:', error);
        
        // 네트워크 실패 시 캐시에서 가져오기
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // 캐시에도 없으면 오프라인 응답
        return createOfflineResponse(request);
    }
}

/**
 * Stale While Revalidate 전략 - CDN 자산용
 */
async function staleWhileRevalidate(request) {
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    // 캐시된 버전 즉시 반환
    const fetchPromise = fetch(request).then(networkResponse => {
        if (networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    }).catch(() => cachedResponse); // 네트워크 실패 시 캐시 버전 유지
    
    return cachedResponse || await fetchPromise;
}

/**
 * Network First with Fallback - HTML 페이지용
 */
async function networkFirstWithFallback(request) {
    try {
        const networkResponse = await fetch(request, {
            signal: AbortSignal.timeout(3000)
        });
        
        if (networkResponse.status === 200) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
        
    } catch (error) {
        // 네트워크 실패 시 캐시 확인
        const cache = await caches.open(DYNAMIC_CACHE);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // 메인 페이지로 폴백 (SPA 지원)
        const mainPage = await cache.match('/index.html');
        if (mainPage) {
            return mainPage;
        }
        
        // 오프라인 페이지
        return createOfflinePage();
    }
}

/**
 * 백그라운드 캐시 업데이트
 */
async function updateCache(request, cache) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
        }
    } catch (error) {
        console.log('Background update failed:', error);
    }
}

/**
 * 요청 타입 확인 함수들
 */
function isStaticAsset(url) {
    const pathname = url.pathname;
    return pathname.match(/\.(css|js|ico|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/) ||
           STATIC_ASSETS.includes(pathname);
}

function isAPIRequest(url) {
    return API_PATTERNS.some(pattern => url.pathname.startsWith(pattern));
}

function isCDNAsset(url) {
    return url.hostname !== self.location.hostname &&
           (url.hostname.includes('cdn.') || 
            url.hostname.includes('fonts.') ||
            CDN_ASSETS.some(asset => asset.includes(url.hostname)));
}

/**
 * 오프라인 응답 생성
 */
function createOfflineResponse(request) {
    const url = new URL(request.url);
    
    if (isAPIRequest(url)) {
        // API 요청에 대한 오프라인 응답
        return new Response(JSON.stringify({
            error: 'Offline',
            message: '현재 오프라인 상태입니다. 네트워크 연결을 확인해 주세요.',
            cached_at: new Date().toISOString()
        }), {
            status: 503,
            statusText: 'Service Unavailable',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
    }
    
    // 기본 오프라인 응답
    return new Response('오프라인 상태입니다.', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
}

/**
 * 오프라인 페이지 생성
 */
function createOfflinePage() {
    const offlineHTML = `
        <!DOCTYPE html>
        <html lang="ko">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>오프라인 - GST 특허관리시스템</title>
            <style>
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    min-height: 100vh; 
                    margin: 0; 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    text-align: center;
                    padding: 20px;
                }
                .container { max-width: 500px; }
                h1 { font-size: 3rem; margin-bottom: 1rem; }
                p { font-size: 1.2rem; margin-bottom: 2rem; }
                .btn {
                    background: rgba(255,255,255,0.2);
                    color: white;
                    padding: 12px 24px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 1rem;
                    transition: all 0.3s;
                    text-decoration: none;
                    display: inline-block;
                }
                .btn:hover {
                    background: rgba(255,255,255,0.3);
                    border-color: rgba(255,255,255,0.5);
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>📡</h1>
                <h2>오프라인 상태</h2>
                <p>현재 인터넷 연결이 없습니다.<br>연결을 확인한 후 다시 시도해 주세요.</p>
                <button class="btn" onclick="window.location.reload()">다시 시도</button>
                <br><br>
                <small>GST 특허관리시스템 - 오프라인 모드</small>
            </div>
        </body>
        </html>
    `;
    
    return new Response(offlineHTML, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
}

/**
 * Fetch 에러 처리
 */
async function handleFetchError(request, error) {
    console.error('Service Worker fetch error:', error);
    
    // 타임아웃 에러
    if (error.name === 'AbortError') {
        return createOfflineResponse(request);
    }
    
    // 네트워크 에러
    if (error instanceof TypeError) {
        return createOfflineResponse(request);
    }
    
    // 기타 에러
    return new Response('요청 처리 중 오류가 발생했습니다.', {
        status: 500,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
}

/**
 * 백그라운드 동기화 (향후 확장 가능)
 */
self.addEventListener('sync', event => {
    if (event.tag === 'background-sync') {
        console.log('🔄 Background sync triggered');
        event.waitUntil(doBackgroundSync());
    }
});

async function doBackgroundSync() {
    try {
        // 백그라운드에서 중요한 데이터 동기화
        const cache = await caches.open(DYNAMIC_CACHE);
        
        // API 데이터 새로고침
        const apiRequests = [
            '/tables/patents',
            '/api/stats'
        ];
        
        await Promise.allSettled(
            apiRequests.map(async url => {
                try {
                    const response = await fetch(url);
                    if (response.ok) {
                        cache.put(url, response.clone());
                    }
                } catch (error) {
                    console.log(`Background sync failed for ${url}:`, error);
                }
            })
        );
        
        console.log('✅ Background sync completed');
    } catch (error) {
        console.error('Background sync error:', error);
    }
}

/**
 * 푸시 알림 처리 (향후 확장 가능)
 */
self.addEventListener('push', event => {
    if (!event.data) return;
    
    const data = event.data.json();
    const options = {
        body: data.body || '새로운 특허 정보가 있습니다.',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        vibrate: [100, 50, 100],
        data: data.url || '/',
        actions: [
            {
                action: 'explore',
                title: '보기',
                icon: '/icon-check.png'
            },
            {
                action: 'close',
                title: '닫기',
                icon: '/icon-x.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title || 'GST 특허관리시스템', options)
    );
});

/**
 * 알림 클릭 처리
 */
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    if (event.action === 'explore') {
        const url = event.notification.data || '/';
        event.waitUntil(
            clients.openWindow(url)
        );
    }
});

/**
 * 메시지 처리 (클라이언트와 통신)
 */
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({
            version: CACHE_NAME,
            caches: [STATIC_CACHE, DYNAMIC_CACHE]
        });
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => caches.delete(cacheName))
                );
            })
        );
    }
});

console.log(`🚀 GST Patents Service Worker ${CACHE_NAME} loaded`);
