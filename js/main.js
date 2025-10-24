/**
 * 글로벌 스탠다드 테크놀로지 특허 관리 시스템
 * Enhanced Main JavaScript with RAG/LLM Integration Ready
 * 최적화된 이벤트 핸들링 및 Cloudflare 배포 지원
 */

// Enhanced 전역 설정
const GST_CONFIG = {
    API_BASE_URL: '/tables',
    ITEMS_PER_PAGE: 10,
    ANIMATION_DURATION: 300,
    DEBOUNCE_DELAY: 300,
    SEARCH_MIN_LENGTH: 2,
    MAX_SEARCH_RESULTS: 100,
    CHART_COLORS: [
        '#1e40af', '#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe',
        '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5'
    ],
    // RAG/LLM 설정 (미래 사용)
    RAG_CONFIG: {
        ENABLED: false, // 현재 비활성화
        API_ENDPOINT: '/api/rag',
        VECTOR_DB_ENDPOINT: '/api/vector-search',
        CHAT_ENDPOINT: '/api/chat',
        MAX_CONTEXT_LENGTH: 4000,
        SIMILARITY_THRESHOLD: 0.7
    },
    // 성능 설정
    PERFORMANCE: {
        LAZY_LOAD_THRESHOLD: 50,
        VIRTUAL_SCROLL_ENABLED: false,
        CACHE_ENABLED: true,
        PRELOAD_NEXT_PAGE: true
    }
};

// 전역 상태 관리
const AppState = {
    currentPage: 1,
    currentFilters: {},
    searchQuery: '',
    isLoading: false,
    cache: new Map(),
    lastSearchTime: 0,
    searchAbortController: null
};

// 특허 데이터 준비 이벤트 핸들러
document.addEventListener('gst:patents-ready', () => {
    syncPatentDatasetFromManager();
    updateDashboardStats();
    refreshAnalyticsVisuals();
});

document.addEventListener('gst:patents-changed', () => {
    syncPatentDatasetFromManager();
    updateDashboardStats();
    refreshAnalyticsVisuals();
});

// Enhanced DOM ready with error handling
document.addEventListener('DOMContentLoaded', function() {
    try {
        console.log('🚀 DOM Content Loaded - 초기화 시작');
        initializeApp();
        
        // Load state from URL on initial load
        loadStateFromURL();
        
        // Apply initial search if URL has parameters
        if (AppState.searchQuery) {
            setTimeout(() => {
                performSearch(AppState.searchQuery, new AbortController().signal);
            }, 100);
        }
        
    } catch (error) {
        console.error('❌ 애플리케이션 초기화 오류:', error);
        // 콘솔에만 로그하고 사용자에게는 alert 표시 안함
        console.warn('⚠️ 일부 기능이 정상적으로 로드되지 않았을 수 있습니다.');
    }
});

// Handle page visibility changes for performance
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        // Pause intensive operations when tab is hidden
        if (AppState.searchAbortController) {
            AppState.searchAbortController.abort();
        }
    }
});

// Handle browser back/forward buttons
window.addEventListener('popstate', function() {
    loadStateFromURL();
    const filteredData = getFilteredData();
    renderPatentsTable(filteredData);
});

/**
 * 애플리케이션 초기화
 */
async function initializeApp() {
    console.log('🚀 GST 특허 관리 시스템 초기화 시작');
    
    try {
        // 1단계: 기본 UI 이벤트 바인딩
        bindUIEvents();
        console.log('✅ UI 이벤트 바인딩 완료');
        
        // 2단계: 네비게이션 초기화
        initializeNavigation();
        console.log('✅ 네비게이션 초기화 완료');
        
        // 3단계: 데이터 로딩 (비동기)
        await loadInitialData();
        console.log('✅ 데이터 로딩 완료');
        
        // 4단계: 차트 초기화 (데이터 로딩 후)
        if (typeof initializeCharts === 'function') {
            await initializeCharts();
            console.log('✅ 차트 초기화 완료');
        }
        
        // 5단계: 타임라인 초기화 (데이터 로딩 후)
        if (typeof initializeTimeline === 'function') {
            await initializeTimeline();
            console.log('✅ 타임라인 초기화 완료');
        }
        
        console.log('✅ GST 특허 관리 시스템 초기화 완료');
    } catch (error) {
        console.error('❌ 초기화 중 오류:', error);
        throw error;
    }
}

/**
 * Enhanced UI 이벤트 바인딩 with performance optimizations
 */
function bindUIEvents() {
    // Enhanced 모바일 메뉴 토글 with accessibility
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', function() {
            const isExpanded = mobileMenu.classList.contains('hidden');
            mobileMenu.classList.toggle('hidden');
            
            // Accessibility attributes
            mobileMenuButton.setAttribute('aria-expanded', !isExpanded);
            mobileMenuButton.setAttribute('aria-label', 
                isExpanded ? '메뉴 닫기' : '메뉴 열기'
            );
        });
        
        // Close mobile menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!mobileMenuButton.contains(e.target) && !mobileMenu.contains(e.target)) {
                mobileMenu.classList.add('hidden');
                mobileMenuButton.setAttribute('aria-expanded', 'false');
            }
        });
        
        // ESC key to close mobile menu
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && !mobileMenu.classList.contains('hidden')) {
                mobileMenu.classList.add('hidden');
                mobileMenuButton.setAttribute('aria-expanded', 'false');
                mobileMenuButton.focus();
            }
        });
    }
    
    // Enhanced 검색 with real-time suggestions
    const searchInput = document.getElementById('search-input');
    const searchSuggestions = document.getElementById('search-suggestions');
    
    if (searchInput) {
        // Real-time search with debouncing
        searchInput.addEventListener('input', debounce(handleSearchInput, GST_CONFIG.DEBOUNCE_DELAY));
        
        // Search suggestions
        searchInput.addEventListener('focus', showSearchSuggestions);
        searchInput.addEventListener('blur', function(e) {
            // Delay hiding to allow clicking suggestions
            setTimeout(() => hideSearchSuggestions(), 150);
        });
        
        // Keyboard navigation for suggestions
        searchInput.addEventListener('keydown', handleSearchKeydown);
    }
    
    // Enhanced button events
    bindButtonEvents();
    
    // Filter change events with validation
    bindFilterEvents();
    
    // Optimized smooth scrolling with intersection observer
    bindSmoothScrolling();
    
    // AI Chat Interface events (준비)
    bindAIChatEvents();
    
    // Pagination events
    bindPaginationEvents();
    
    // Keyboard shortcuts
    bindKeyboardShortcuts();
    
    // Performance monitoring
    bindPerformanceMonitoring();
}

/**
 * 네비게이션 초기화
 */
function initializeNavigation() {
    const navLinks = document.querySelectorAll('nav a[href^="#"]');
    
    // 현재 섹션 하이라이팅
    function highlightCurrentSection() {
        const sections = document.querySelectorAll('section[id]');
        const scrollTop = window.pageYOffset;
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            const sectionBottom = sectionTop + section.offsetHeight;
            const sectionId = section.getAttribute('id');
            const navLink = document.querySelector(`nav a[href="#${sectionId}"]`);
            
            if (scrollTop >= sectionTop && scrollTop < sectionBottom) {
                navLinks.forEach(link => link.classList.remove('text-blue-200'));
                if (navLink) {
                    navLink.classList.add('text-blue-200');
                }
            }
        });
    }
    
    // 스크롤 이벤트 리스너
    window.addEventListener('scroll', debounce(highlightCurrentSection, 100));
    
    // 초기 하이라이팅
    highlightCurrentSection();
}

/**
 * 초기 데이터 로딩
 */
async function loadInitialData() {
    try {
        showLoading('데이터를 불러오는 중...');
        const patents = await waitForPatentDataset();
        window.patentsData = patents;
        updateDashboardStats();
        hideLoading();
    } catch (error) {
        console.error('❌ 데이터 로딩 오류:', error);
        // alert 대신 콘솔 경고만 표시
        console.warn('⚠️ 데이터를 불러올 수 없습니다. 샘플 데이터를 사용합니다.');
        window.patentsData = generateSamplePatents();
        updateDashboardStats();
        hideLoading();
    }
}

async function waitForPatentDataset(timeoutMs = 15000) {
    // 이미 로딩된 경우 즉시 반환
    if (window.patentManager && Array.isArray(window.patentManager.patents) && window.patentManager.patents.length > 0) {
        return [...window.patentManager.patents];
    }

    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            document.removeEventListener('gst:patents-ready', onReady);
            reject(new Error('Patent dataset load timed out'));
        }, timeoutMs);

        const onReady = () => {
            clearTimeout(timeoutId);
            document.removeEventListener('gst:patents-ready', onReady);
            if (window.patentManager && Array.isArray(window.patentManager.patents)) {
                resolve([...window.patentManager.patents]);
            } else {
                resolve([]);
            }
        };

        document.addEventListener('gst:patents-ready', onReady);
    });
}

function syncPatentDatasetFromManager() {
    if (window.patentManager && Array.isArray(window.patentManager.patents)) {
        window.patentsData = [...window.patentManager.patents];
    }
}

function refreshAnalyticsVisuals() {
    if (window.chartManager && typeof window.chartManager.refreshCharts === 'function') {
        window.chartManager.refreshCharts();
    } else if (typeof initializeCharts === 'function') {
        initializeCharts();
    }

    if (window.timelineManager && typeof window.timelineManager.refresh === 'function') {
        window.timelineManager.refresh();
    } else if (typeof initializeTimeline === 'function') {
        initializeTimeline();
    }
}

/**
 * 샘플 특허 데이터 생성
 */
function generateSamplePatents() {
    const samplePatents = [
        {
            id: 1,
            patent_number: '10-0719225',
            title: '반도체 제조 공정용 온도조절 시스템',
            category: 'temperature',
            registration_date: '2007-05-18',
            status: 'active',
            abstract: '반도체 제조 공정에서 정밀한 온도 제어를 위한 시스템',
            inventors: ['김철수', '이영희'],
            technology_field: '온도제어'
        },
        {
            id: 2,
            patent_number: '10-0822048',
            title: '플라즈마 토치를 이용한 폐가스 처리장치',
            category: 'plasma',
            registration_date: '2008-04-14',
            status: 'active',
            abstract: '고온 플라즈마를 이용한 유해가스 분해 처리 장치',
            inventors: ['박민수', '정수진'],
            technology_field: '플라즈마'
        },
        {
            id: 3,
            patent_number: '10-0965234',
            title: '습식 스크러버 시스템의 효율 개선 방법',
            category: 'scrubber',
            registration_date: '2010-06-22',
            status: 'active',
            abstract: '습식 스크러버의 가스 제거 효율을 향상시키는 방법',
            inventors: ['장동훈', '최미영'],
            technology_field: '스크러버'
        },
        {
            id: 4,
            patent_number: '10-1123456',
            title: '반도체 공정용 냉각 시스템',
            category: 'chiller',
            registration_date: '2012-03-15',
            status: 'active',
            abstract: '반도체 제조 장비의 효율적인 냉각을 위한 시스템',
            inventors: ['오승민', '한지원'],
            technology_field: '칠러'
        },
        {
            id: 5,
            patent_number: '10-1234567',
            title: '다단계 가스 정화 시스템',
            category: 'gas-treatment',
            registration_date: '2015-08-10',
            status: 'active',
            abstract: '복수의 정화 단계를 통한 효과적인 가스 처리 시스템',
            inventors: ['윤성호', '신유리'],
            technology_field: '가스처리'
        }
    ];
    
    // 81개까지 확장 (실제로는 더 많은 샘플 데이터가 필요)
    const extendedPatents = [...samplePatents];
    
    // 추가 샘플 생성 (간략화)
    for (let i = 6; i <= 81; i++) {
        const categories = ['scrubber', 'chiller', 'plasma', 'temperature', 'gas-treatment'];
        const techFields = ['스크러버', '칠러', '플라즈마', '온도제어', '가스처리'];
        const randomCategory = categories[Math.floor(Math.random() * categories.length)];
        const randomTechField = techFields[categories.indexOf(randomCategory)];
        
        extendedPatents.push({
            id: i,
            patent_number: `10-${String(Math.floor(Math.random() * 9000000) + 1000000)}`,
            title: `${randomTechField} 관련 특허 기술 ${i}`,
            category: randomCategory,
            registration_date: generateRandomDate(2005, 2024),
            status: Math.random() > 0.2 ? 'active' : (Math.random() > 0.5 ? 'expired' : 'pending'),
            abstract: `${randomTechField} 분야의 혁신적인 기술을 다룬 특허입니다.`,
            inventors: [`발명자${i}A`, `발명자${i}B`],
            technology_field: randomTechField
        });
    }
    
    return extendedPatents;
}

/**
 * 랜덤 날짜 생성
 */
function generateRandomDate(startYear, endYear) {
    const start = new Date(startYear, 0, 1);
    const end = new Date(endYear, 11, 31);
    const randomDate = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return randomDate.toISOString().split('T')[0];
}

/**
 * 특허 테이블 렌더링
 */
function renderPatentsTable(patents, page = 1) {
    if (window.patentManager && typeof window.patentManager.renderTable === 'function') {
        if (typeof window.patentManager.goToPage === 'function' && page !== window.patentManager.currentPage) {
            window.patentManager.goToPage(page);
        } else {
            window.patentManager.renderTable();
        }
        return;
    }

    const tableBody = document.getElementById('patents-table-body');
    if (!tableBody) return;
    
    const startIndex = (page - 1) * GST_CONFIG.ITEMS_PER_PAGE;
    const endIndex = startIndex + GST_CONFIG.ITEMS_PER_PAGE;
    const pagePatents = patents.slice(startIndex, endIndex);
    
    tableBody.innerHTML = '';
    
    pagePatents.forEach(patent => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 transition-colors fade-in';
        
        row.innerHTML = `
            <td class="px-6 py-4" data-label="특허번호">
                <span class="font-mono text-sm">${patent.patent_number}</span>
            </td>
            <td class="px-6 py-4" data-label="발명명칭">
                <div class="max-w-xs">
                    <p class="font-medium text-gray-900 truncate">${patent.title}</p>
                    <p class="text-sm text-gray-500 truncate">${patent.abstract}</p>
                </div>
            </td>
            <td class="px-6 py-4" data-label="기술분야">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    ${patent.technology_field}
                </span>
            </td>
            <td class="px-6 py-4" data-label="등록일">
                <span class="text-sm text-gray-900">${formatDate(patent.registration_date)}</span>
            </td>
            <td class="px-6 py-4" data-label="상태">
                <span class="status-badge ${getStatusClass(patent.status)}">
                    ${getStatusText(patent.status)}
                </span>
            </td>
            <td class="px-6 py-4" data-label="액션">
                <div class="flex space-x-2">
                    <button class="text-blue-600 hover:text-blue-900 transition-colors" 
                            onclick="viewPatentDetail(${patent.id})" 
                            title="상세보기">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="text-green-600 hover:text-green-900 transition-colors" 
                            onclick="editPatent(${patent.id})" 
                            title="편집">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // 페이지네이션 업데이트
    updatePagination(patents.length, page);
    
    // 결과 카운트 업데이트
    updateResultCount(patents.length, startIndex + 1, Math.min(endIndex, patents.length));
}

/**
 * 날짜 포맷팅
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

/**
 * 상태 클래스 반환
 */
function getStatusClass(status) {
    switch (status) {
        case 'active': return 'status-active';
        case 'expired': return 'status-expired';
        case 'pending': return 'status-pending';
        default: return 'status-pending';
    }
}

/**
 * 상태 텍스트 반환
 */
function getStatusText(status) {
    switch (status) {
        case 'active': return '활성';
        case 'expired': return '만료';
        case 'pending': return '심사중';
        default: return '알 수 없음';
    }
}

/**
 * 페이지네이션 업데이트
 */
function updatePagination(totalItems, currentPage) {
    const totalPages = Math.ceil(totalItems / GST_CONFIG.ITEMS_PER_PAGE);
    // 페이지네이션 로직 구현 (생략 - 필요시 확장)
}

/**
 * 결과 카운트 업데이트
 */
function updateResultCount(total, start, end) {
    if (window.patentManager && typeof window.patentManager.updateResultCount === 'function') {
        window.patentManager.updateResultCount();
        return;
    }

    const totalCountEl = document.getElementById('total-count');
    const startCountEl = document.getElementById('start-count');
    const endCountEl = document.getElementById('end-count');
    
    if (totalCountEl) totalCountEl.textContent = total;
    if (startCountEl) startCountEl.textContent = start;
    if (endCountEl) endCountEl.textContent = end;
}

/**
 * 대시보드 통계 업데이트
 */
function updateDashboardStats() {
    if (window.patentManager && typeof window.patentManager.updateStats === 'function') {
        window.patentManager.updateStats();
        return;
    }
    
    const dataset = window.patentsData || [];
    if (!Array.isArray(dataset)) return;
    
    const totalPatents = dataset.length;
    const activePatents = dataset.filter(p => p.status === 'active').length;
    const categories = [...new Set(dataset.map(p => p.category))].filter(Boolean).length;
    
    const totalEl = document.getElementById('total-patents');
    const activeEl = document.getElementById('active-patents');
    const categoriesEl = document.getElementById('tech-categories');
    
    if (totalEl) totalEl.textContent = totalPatents;
    if (activeEl) activeEl.textContent = activePatents;
    if (categoriesEl) categoriesEl.textContent = categories;
}

/**
 * Enhanced 검색 처리 with caching and performance optimization
 */
function handleSearchInput(event) {
    if (window.patentManager && typeof window.patentManager.onSearchInput === 'function') {
        window.patentManager.onSearchInput(event);
        return;
    }

    const query = event.target.value.trim();
    AppState.searchQuery = query;
    
    // Cancel previous search if still running
    if (AppState.searchAbortController) {
        AppState.searchAbortController.abort();
    }
    
    if (query.length === 0) {
        // Show all data when search is empty
        const filteredData = applyFilters(window.patentsData || []);
        renderPatentsTable(filteredData);
        hideSearchSuggestions();
        return;
    }
    
    if (query.length < GST_CONFIG.SEARCH_MIN_LENGTH) {
        return; // Don't search for very short queries
    }
    
    // Check cache first
    const cacheKey = `search_${query}_${JSON.stringify(AppState.currentFilters)}`;
    if (GST_CONFIG.PERFORMANCE.CACHE_ENABLED && AppState.cache.has(cacheKey)) {
        const cachedResults = AppState.cache.get(cacheKey);
        renderPatentsTable(cachedResults);
        updateSearchSuggestions(query, cachedResults);
        return;
    }
    
    // Create new abort controller for this search
    AppState.searchAbortController = new AbortController();
    
    performSearch(query, AppState.searchAbortController.signal);
}

/**
 * Perform actual search with fuzzy matching
 */
function performSearch(query, signal) {
    if (window.patentManager) {
        window.patentManager.filters = window.patentManager.filters || {};
        window.patentManager.filters.search = query;
        if (typeof window.patentManager.applyFilters === 'function') {
            window.patentManager.applyFilters();
        }
        return;
    }

    if (!window.patentsData) return;
    
    const startTime = performance.now();
    
    try {
        let filteredData = window.patentsData;
        
        if (query) {
            const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);
            
            filteredData = window.patentsData.filter(patent => {
                const searchableText = [
                    patent.title,
                    patent.patent_number,
                    patent.abstract,
                    patent.technology_field,
                    ...(patent.inventors || [])
                ].join(' ').toLowerCase();
                
                // Check if all search terms are found
                return searchTerms.every(term => 
                    searchableText.includes(term) || 
                    fuzzyMatch(searchableText, term)
                );
            });
            
            // Sort by relevance
            filteredData.sort((a, b) => {
                const aRelevance = calculateRelevance(a, query);
                const bRelevance = calculateRelevance(b, query);
                return bRelevance - aRelevance;
            });
        }
        
        // Check if search was aborted
        if (signal.aborted) return;
        
        // Apply filters
        filteredData = applyFilters(filteredData);
        
        // Cache results
        if (GST_CONFIG.PERFORMANCE.CACHE_ENABLED) {
            const cacheKey = `search_${query}_${JSON.stringify(AppState.currentFilters)}`;
            AppState.cache.set(cacheKey, filteredData);
            
            // Limit cache size
            if (AppState.cache.size > 50) {
                const firstKey = AppState.cache.keys().next().value;
                AppState.cache.delete(firstKey);
            }
        }
        
        // Render results
        renderPatentsTable(filteredData);
        updateSearchSuggestions(query, filteredData);
        
        // Performance logging
        const searchTime = performance.now() - startTime;
        console.log(`🔍 Search completed in ${searchTime.toFixed(2)}ms for "${query}" - ${filteredData.length} results`);
        
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('Search error:', error);
            console.error('❌ 검색 중 오류가 발생했습니다.');
        }
    }
}

/**
 * Simple fuzzy matching
 */
function fuzzyMatch(text, term) {
    if (term.length < 3) return false;
    
    const threshold = 0.8;
    const maxDistance = Math.floor(term.length * (1 - threshold));
    
    for (let i = 0; i <= text.length - term.length + maxDistance; i++) {
        const substring = text.substring(i, i + term.length + maxDistance);
        if (levenshteinDistance(substring, term) <= maxDistance) {
            return true;
        }
    }
    return false;
}

/**
 * Calculate Levenshtein distance
 */
function levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }
    
    return matrix[str2.length][str1.length];
}

/**
 * Calculate search relevance score
 */
function calculateRelevance(patent, query) {
    let score = 0;
    const queryLower = query.toLowerCase();
    
    // Title match (highest weight)
    if (patent.title.toLowerCase().includes(queryLower)) {
        score += 10;
    }
    
    // Patent number exact match
    if (patent.patent_number.toLowerCase().includes(queryLower)) {
        score += 8;
    }
    
    // Technology field match
    if (patent.technology_field.toLowerCase().includes(queryLower)) {
        score += 6;
    }
    
    // Abstract match
    if (patent.abstract.toLowerCase().includes(queryLower)) {
        score += 4;
    }
    
    // Inventor match
    if (patent.inventors && patent.inventors.some(inventor => 
        inventor.toLowerCase().includes(queryLower))) {
        score += 3;
    }
    
    return score;
}

/**
 * Enhanced 필터 변경 처리 with validation and state management
 */
function handleFilterChange(event) {
    if (window.patentManager) {
        const filterElement = event.target;
        if (filterElement.id === 'category-filter') {
            window.patentManager.filters.category = filterElement.value;
        } else if (filterElement.id === 'status-filter') {
            window.patentManager.filters.status = filterElement.value;
        }
        if (typeof window.patentManager.applyFilters === 'function') {
            window.patentManager.applyFilters();
        }
        return;
    }

    const filterElement = event.target;
    const filterType = filterElement.id;
    const filterValue = filterElement.value;
    
    // Update current filters state
    AppState.currentFilters[filterType] = filterValue;
    
    // Clear cache when filters change
    if (GST_CONFIG.PERFORMANCE.CACHE_ENABLED) {
        AppState.cache.clear();
    }
    
    // Re-run search with new filters
    if (AppState.searchQuery) {
        performSearch(AppState.searchQuery, new AbortController().signal);
    } else {
        // Apply filters to all data
        const filteredData = applyFilters(window.patentsData || []);
        renderPatentsTable(filteredData);
    }
    
    // Update URL parameters for bookmarking
    updateURLParameters();
    
    // Analytics tracking (if needed)
    trackFilterUsage(filterType, filterValue);
}

/**
 * Update URL parameters for state persistence
 */
function updateURLParameters() {
    if (window.patentManager && typeof window.patentManager.updateURLParameters === 'function') {
        window.patentManager.updateURLParameters();
        return;
    }

    const params = new URLSearchParams();
    
    if (AppState.searchQuery) {
        params.set('q', AppState.searchQuery);
    }
    
    Object.entries(AppState.currentFilters).forEach(([key, value]) => {
        if (value) {
            params.set(key.replace('-filter', ''), value);
        }
    });
    
    if (AppState.currentPage > 1) {
        params.set('page', AppState.currentPage.toString());
    }
    
    const newURL = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
    window.history.replaceState({}, '', newURL);
}

/**
 * Load state from URL parameters
 */
function loadStateFromURL() {
    if (window.patentManager && typeof window.patentManager.loadStateFromURL === 'function') {
        window.patentManager.loadStateFromURL();
        return;
    }

    const params = new URLSearchParams(window.location.search);
    
    // Load search query
    const searchQuery = params.get('q');
    if (searchQuery) {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = searchQuery;
            AppState.searchQuery = searchQuery;
        }
    }
    
    // Load filters
    const categoryValue = params.get('category');
    if (categoryValue) {
        const categoryFilter = document.getElementById('category-filter');
        if (categoryFilter) {
            categoryFilter.value = categoryValue;
            AppState.currentFilters['category-filter'] = categoryValue;
        }
    }
    
    const statusValue = params.get('status');
    if (statusValue) {
        const statusFilter = document.getElementById('status-filter');
        if (statusFilter) {
            statusFilter.value = statusValue;
            AppState.currentFilters['status-filter'] = statusValue;
        }
    }
    
    // Load page
    const page = parseInt(params.get('page')) || 1;
    AppState.currentPage = page;
}

/**
 * Track filter usage for analytics
 */
function trackFilterUsage(filterType, filterValue) {
    // Simple analytics tracking (can be enhanced)
    if (typeof gtag !== 'undefined') {
        gtag('event', 'filter_used', {
            'filter_type': filterType,
            'filter_value': filterValue
        });
    }
}

/**
 * 필터 적용
 */
function applyFilters(data) {
    if (window.patentManager) {
        if (typeof window.patentManager.applyFilters === 'function') {
            window.patentManager.applyFilters();
        }
        return window.patentManager.filteredPatents || [];
    }

    const categoryFilter = document.getElementById('category-filter')?.value;
    const statusFilter = document.getElementById('status-filter')?.value;
    
    let filtered = data;
    
    if (categoryFilter) {
        filtered = filtered.filter(patent => patent.category === categoryFilter);
    }
    
    if (statusFilter) {
        filtered = filtered.filter(patent => patent.status === statusFilter);
    }
    
    return filtered;
}

/**
 * 특허 상세보기
 */
function viewPatentDetail(patentId) {
    if (window.patentManager && typeof window.patentManager.viewDetail === 'function') {
        window.patentManager.viewDetail(patentId);
        return false;
    }

    const patent = window.patentsData?.find(p => p.id === patentId);
    if (!patent) return false;
    
    showModal('특허 상세정보', `
        <div class="space-y-4">
            <div>
                <h4 class="font-semibold text-gray-900">특허번호</h4>
                <p class="text-gray-600">${patent.patent_number}</p>
            </div>
            <div>
                <h4 class="font-semibold text-gray-900">발명명칭</h4>
                <p class="text-gray-600">${patent.title}</p>
            </div>
            <div>
                <h4 class="font-semibold text-gray-900">요약</h4>
                <p class="text-gray-600">${patent.abstract}</p>
            </div>
            <div>
                <h4 class="font-semibold text-gray-900">발명자</h4>
                <p class="text-gray-600">${patent.inventors?.join(', ') || '정보 없음'}</p>
            </div>
            <div>
                <h4 class="font-semibold text-gray-900">등록일</h4>
                <p class="text-gray-600">${formatDate(patent.registration_date)}</p>
            </div>
            <div>
                <h4 class="font-semibold text-gray-900">상태</h4>
                <span class="status-badge ${getStatusClass(patent.status)}">
                    ${getStatusText(patent.status)}
                </span>
            </div>
        </div>
    `);
    return false;
}

/**
 * 특허 편집
 */
function editPatent(patentId) {
    console.log('ℹ️ 편집 기능은 향후 구현 예정입니다.');

    return false;
}

/**
 * 유틸리티 함수들
 */

// 디바운스 함수
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 로딩 표시
function showLoading(message = '로딩 중...') {
    // 로딩 UI 구현
    console.log('🔄', message);
}

// 로딩 숨기기
function hideLoading() {
    // 로딩 UI 숨기기
    console.log('✅ 로딩 완료');
}

// 알림 표시
function showAlert(message, type = 'info') {
    // 콘솔에만 로그 출력 (alert 팝업 제거)
    const icon = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${icon} ${message}`);
    
    // TODO: 향후 토스트 메시지 UI로 교체
}

// 모달 표시
function showModal(title, content) {
    // 콘솔에만 로그 출력 (alert 제거)
    console.log(`📋 ${title}:`, content.replace(/<[^>]*>/g, ''));
    
    // TODO: 향후 실제 모달 UI로 교체
}



/**
 * 차트 시스템 초기화
 */
async function initializeCharts() {
    console.log('📊 차트 시스템 초기화 시작');
    
    // 차트 라이브러리 로딩 대기
    const waitForLibraries = () => {
        return new Promise((resolve) => {
            const checkLibraries = () => {
                if (typeof Chart !== 'undefined' && typeof echarts !== 'undefined') {
                    resolve();
                } else {
                    setTimeout(checkLibraries, 100);
                }
            };
            checkLibraries();
        });
    };
    
    await waitForLibraries();
    
    // charts.js에서 정의한 초기화 함수 호출
    if (typeof window.initializeChartsFunction === 'function') {
        window.initializeChartsFunction();
    } else {
        console.warn('⚠️ 차트 초기화 함수를 찾을 수 없습니다.');
    }
}

/**
 * 타임라인 시스템 초기화  
 */
async function initializeTimeline() {
    console.log('🕐 타임라인 시스템 초기화 시작');
    
    // timeline.js에서 정의한 초기화 함수 호출
    if (typeof window.initializeTimelineFunction === 'function') {
        window.initializeTimelineFunction();
    } else {
        console.warn('⚠️ 타임라인 초기화 함수를 찾을 수 없습니다.');
    }
}

/**
 * Enhanced button events binding
 */
function bindButtonEvents() {
    // Search button
    const searchButton = document.getElementById('search-button');
    if (searchButton) {
        searchButton.addEventListener('click', function() {
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                handleSearchInput({ target: searchInput });
            }
        });
    }
    
    // Reset button
    const resetButton = document.getElementById('reset-button');
    if (resetButton) {
        resetButton.addEventListener('click', resetFilters);
    }
    
    // AI Chat links
    ['ai-chat-toggle', 'ai-chat-toggle-mobile'].forEach((id) => {
        const link = document.getElementById(id);
        if (link) {
            link.addEventListener('click', (event) => {
                event.preventDefault();
                openExternalChat();
            });
        }
    });
    
    // Advanced search button
    const advancedSearchButton = document.getElementById('advanced-search');
    if (advancedSearchButton) {
        advancedSearchButton.addEventListener('click', showAdvancedSearch);
    }
}

/**
 * Bind filter events with validation
 */
function bindFilterEvents() {
    const categoryFilter = document.getElementById('category-filter');
    const statusFilter = document.getElementById('status-filter');
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', handleFilterChange);
    }
    
    if (statusFilter) {
        statusFilter.addEventListener('change', handleFilterChange);
    }
}

/**
 * Enhanced smooth scrolling with intersection observer
 */
function bindSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                // Update active navigation
                document.querySelectorAll('nav a').forEach(link => 
                    link.classList.remove('text-blue-200')
                );
                this.classList.add('text-blue-200');
                
                // Smooth scroll
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                
                // Update URL without page reload
                window.history.pushState({}, '', this.getAttribute('href'));
            }
        });
    });
}

/**
 * AI Chat events (준비 중)
 */
function bindAIChatEvents() {
    // AI Chat interface will be implemented when RAG is ready
    console.log('🤖 AI Chat events ready for RAG integration');
}

/**
 * Pagination events
 */
function bindPaginationEvents() {
    // Previous page
    const prevButton = document.getElementById('prev-page');
    if (prevButton) {
        prevButton.addEventListener('click', () => changePage(AppState.currentPage - 1));
    }
    
    // Next page
    const nextButton = document.getElementById('next-page');
    if (nextButton) {
        nextButton.addEventListener('click', () => changePage(AppState.currentPage + 1));
    }
    
    // Page size change
    const pageSizeSelect = document.getElementById('page-size');
    if (pageSizeSelect) {
        pageSizeSelect.addEventListener('change', function() {
            GST_CONFIG.ITEMS_PER_PAGE = parseInt(this.value);
            AppState.currentPage = 1;
            const filteredData = getFilteredData();
            renderPatentsTable(filteredData);
        });
    }
}

/**
 * Keyboard shortcuts
 */
function bindKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + K for search focus
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        }
        
        // Escape to clear search
        if (e.key === 'Escape') {
            const searchInput = document.getElementById('search-input');
            if (searchInput && document.activeElement === searchInput) {
                resetFilters();
            }
        }
    });
}

/**
 * Performance monitoring
 */
function bindPerformanceMonitoring() {
    // Monitor long tasks
    if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.duration > 50) {
                    console.warn(`장시간 작업 감지: ${entry.duration.toFixed(2)}ms`);
                }
            }
        });
        observer.observe({ entryTypes: ['longtask'] });
    }
    
    // Monitor memory usage
    if ('memory' in performance) {
        setInterval(() => {
            const memInfo = performance.memory;
            if (memInfo.usedJSHeapSize > memInfo.jsHeapSizeLimit * 0.9) {
                console.warn('메모리 사용량이 높습니다.');
                // Clear cache to free memory
                AppState.cache.clear();
            }
        }, 30000); // Check every 30 seconds
    }
}

/**
 * Reset all filters and search
 */
function resetFilters() {
    if (window.patentManager && typeof window.patentManager.resetFilters === 'function') {
        window.patentManager.resetFilters();
        return;
    }

    // Clear search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = '';
    }
    
    // Clear filters
    const categoryFilter = document.getElementById('category-filter');
    const statusFilter = document.getElementById('status-filter');
    
    if (categoryFilter) categoryFilter.value = '';
    if (statusFilter) statusFilter.value = '';
    
    // Reset state
    AppState.searchQuery = '';
    AppState.currentFilters = {};
    AppState.currentPage = 1;
    AppState.cache.clear();
    
    // Update URL
    window.history.replaceState({}, '', window.location.pathname);
    
    // Show all data
    renderPatentsTable(window.patentsData || []);
    
    // Hide suggestions
    hideSearchSuggestions();
}

/**
 * Get currently filtered data
 */
function getFilteredData() {
    if (window.patentManager) {
        return window.patentManager.filteredPatents || window.patentManager.patents || [];
    }

    let data = window.patentsData || [];
    
    if (AppState.searchQuery) {
        // Apply search
        const searchTerms = AppState.searchQuery.toLowerCase().split(/\s+/);
        data = data.filter(patent => {
            const searchableText = [
                patent.title,
                patent.patent_number,
                patent.abstract,
                patent.technology_field
            ].join(' ').toLowerCase();
            
            return searchTerms.every(term => searchableText.includes(term));
        });
    }
    
    return applyFilters(data);
}

/**
 * Change page
 */
function changePage(newPage) {
    if (window.patentManager && typeof window.patentManager.goToPage === 'function') {
        window.patentManager.goToPage(newPage);
        if (typeof window.patentManager.updateURLParameters === 'function') {
            window.patentManager.updateURLParameters();
        }
        return;
    }

    const filteredData = getFilteredData();
    const totalPages = Math.ceil(filteredData.length / GST_CONFIG.ITEMS_PER_PAGE);
    
    if (newPage < 1 || newPage > totalPages) return;
    
    AppState.currentPage = newPage;
    renderPatentsTable(filteredData, newPage);
    updateURLParameters();
}

// Enhanced global object
window.GST = {
    // Core functions
    viewPatentDetail,
    editPatent,
    
    // Search and filter
    handleSearchInput,
    handleFilterChange,
    resetFilters,
    performSearch,
    
    // State management
    AppState,
    GST_CONFIG,
    
    // Utility functions
    changePage,
    getFilteredData,
    updateURLParameters,
    loadStateFromURL,
    
    // Performance
    clearCache: () => AppState.cache.clear(),
    getPerformanceInfo: () => ({
        cacheSize: AppState.cache.size,
        memoryUsage: performance.memory ? {
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize,
            limit: performance.memory.jsHeapSizeLimit
        } : null
    })
};
