/**
 * 특허 데이터 관리 및 처리 모듈
 * 글로벌 스탠다드 테크놀로지 특허 관리 시스템
 */

// 특허 데이터 관리 클래스
class PatentManager {
    constructor() {
        this.patents = [];
        this.filteredPatents = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.totalPages = 0;
        this.dataSource = 'unknown';
        this.searchSuggestionIndex = -1;
        this.suggestionHideTimeout = null;
        this.pendingStateFromURL = null;
        this.activeSuggestions = [];
        this.lastUpdatedAt = null;
        this.initialPageFromURL = 1;

        // DOM 참조 모음
        this.dom = {
            listContainer: document.getElementById('patents-list-container'),
            loading: document.getElementById('patents-loading'),
            emptyState: document.getElementById('patents-empty-state'),
            yearGroups: document.getElementById('patent-year-groups'),
            dataSourceIndicator: document.getElementById('data-source-indicator'),
            totalCount: document.getElementById('total-count'),
            startCount: document.getElementById('start-count'),
            endCount: document.getElementById('end-count'),
            prevPage: document.getElementById('prev-page'),
            nextPage: document.getElementById('next-page'),
            pageSize: document.getElementById('page-size'),
            searchInput: document.getElementById('search-input'),
            searchSuggestions: document.getElementById('search-suggestions'),
            searchButton: document.getElementById('search-button'),
            resetButton: document.getElementById('reset-button'),
            categoryFilter: document.getElementById('category-filter'),
            statusFilter: document.getElementById('status-filter')
        };
        
        // 필터 상태
        this.filters = {
            search: '',
            category: '',
            status: '',
            dateFrom: '',
            dateTo: ''
        };
        
        // 정렬 상태
        this.sorting = {
            field: 'registration_date',
            order: 'desc'
        };
        
        this.init();
    }
    
    /**
     * 초기화
     */
    async init() {
        try {
            this.toggleLoading(true);
            this.loadStateFromURL();
            await this.loadPatents();
            this.bindEvents();

            const hasFilters = Boolean(this.filters.search || this.filters.category || this.filters.status);
            const shouldPreservePage = this.initialPageFromURL > 1;

            if (hasFilters || shouldPreservePage) {
                this.currentPage = Math.max(1, this.initialPageFromURL);
                this.applyFilters({ skipUrlUpdate: true, preservePage: true });
            } else {
                this.filteredPatents = [...this.patents];
                this.calculatePagination();
                this.renderTable();
                this.updateResultCount();
                this.updatePaginationUI();
            }

            this.updateStats();
            this.updateDataSourceIndicator();
            this.toggleLoading(false);
            this.notifyDataReady();
            this.notifyDataChanged('initial');
        } catch (error) {
            console.error('특허 매니저 초기화 오류:', error);
            this.toggleLoading(false);
            this.showInlineAlert('특허 데이터를 불러오지 못했습니다. 페이지를 새로고침하거나 관리자에게 문의하세요.', 'error');
        }
    }
    
    /**
     * 특허 데이터 로딩
     */
    async loadPatents() {
        if (await this.loadLocalDatabase()) {
            this.filteredPatents = [...this.patents];
            this.calculatePagination();
            return;
        }

        if (await this.loadFromApi()) {
            this.filteredPatents = [...this.patents];
            this.calculatePagination();
            return;
        }

        console.warn('⚠️ API와 로컬 DB 모두 로딩 실패, 샘플 데이터 사용');
        this.patents = this.preparePatents(this.generateExtendedSampleData());
        this.dataSource = 'sample';
        this.lastUpdatedAt = Date.now();
        this.filteredPatents = [...this.patents];
        this.calculatePagination();
    }

    /**
     * 로컬 정적 DB 로딩 (data/patents-index.json)
     */
    async loadLocalDatabase() {
        try {
            const response = await fetch('/data/patents-index.json', { cache: 'no-store' });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const payload = await response.json();
            const records = Array.isArray(payload?.data) ? payload.data
                : Array.isArray(payload) ? payload : [];

            if (!records.length) {
                throw new Error('로컬 DB 데이터가 비어 있습니다.');
            }

            this.patents = this.preparePatents(records);
            this.dataSource = 'local';
            this.lastUpdatedAt = payload.generated_at || Date.now();
            console.log(`✅ 로컬 DB에서 ${this.patents.length}개 특허 로딩 완료`);
            return true;
        } catch (error) {
            console.warn('⚠️ 로컬 DB 로딩 실패:', error.message);
            return false;
        }
    }

    /**
     * API 로딩
     */
    async loadFromApi() {
        try {
            const response = await fetch('/tables/patents?limit=200', { cache: 'no-store' });
            
            if (!response.ok) {
                throw new Error(`API 응답 오류 (${response.status})`);
            }

            const data = await response.json();
            const records = Array.isArray(data?.data) ? data.data : [];

            if (!records.length) {
                throw new Error('API에서 반환된 특허 데이터가 없습니다.');
            }
            
            this.patents = this.preparePatents(records);
            this.dataSource = 'api';
            this.lastUpdatedAt = Date.now();
            console.log(`✅ API에서 ${this.patents.length}개 특허 로딩 완료`);
            return true;
        } catch (error) {
            console.warn('⚠️ API 로딩 실패:', error.message);
            return false;
        }
    }
    
    preparePatents(records) {
        if (!Array.isArray(records)) return [];

        return records.map((record) => {
            const id = record.id || record.doc_id;

            const normalizedDate = this.normalizeDate(record.registration_date)
                || this.normalizeDate(record.publication_date)
                || this.normalizeDate(record.application_date);

            const registrationISO = normalizedDate ? normalizedDate.iso : null;
            const registrationDate = normalizedDate ? normalizedDate.date : null;

            const inventors = this.normalizeArray(record.inventors);
            const keywords = this.normalizeArray(record.technical_keywords);
            const related = this.normalizeArray(record.related_patents);

            const title = this.normalizeText(record.title);
            const abstract = this.normalizeText(record.abstract);
            const technologyField = this.normalizeText(record.technology_field) || '기술분야 미정';
            const patentNumber = this.normalizeText(record.patent_number);
            const assignee = this.normalizeText(record.assignee) || '정보 없음';
            const category = record.category || 'other';
            const status = record.status || 'active';
            const priorityScore = this.normalizeNumber(record.priority_score);

            const corpus = [
                title,
                patentNumber,
                abstract,
                technologyField,
                inventors.join(' '),
                keywords.join(' '),
                related.join(' ')
            ].filter(Boolean).join(' ').toLowerCase();

            return {
                ...record,
                id,
                doc_id: record.doc_id || id,
                title: title || record.title,
                abstract: abstract || record.abstract,
                technology_field: technologyField,
                patent_number: patentNumber || record.patent_number,
                assignee,
                category,
                status,
                inventors,
                technical_keywords: keywords,
                related_patents: related,
                priority_score: priorityScore,
                registration_date: registrationISO,
                __registrationDate: registrationDate,
                __searchCorpus: corpus
            };
        });
    }

    normalizeText(value) {
        if (value === undefined || value === null) return null;
        const text = String(value).trim();
        return text.length ? text : null;
    }

    normalizeArray(value) {
        if (Array.isArray(value)) {
            return value
                .map(item => this.normalizeText(item))
                .filter(Boolean);
        }

        if (typeof value === 'string') {
            return value
                .split(/[;,|\n\r]+/)
                .map(item => this.normalizeText(item))
                .filter(Boolean);
        }

        return [];
    }

    normalizeNumber(value) {
        if (value === undefined || value === null || value === '') return null;
        const num = Number(value);
        return Number.isFinite(num) ? num : null;
    }

    normalizeDate(value) {
        if (!value) return null;

        let text = String(value).trim();
        if (!text) return null;

        text = text
            .replace(/년/g, '-')
            .replace(/월/g, '-')
            .replace(/일/g, '')
            .replace(/[\.\/]/g, '-')
            .replace(/\s+/g, '');

        const isoPattern = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
        const altPattern = /^(\d{1,2})-(\d{4})-(\d{1,2})$/;
        let year, month, day;

        if (isoPattern.test(text)) {
            const match = text.match(isoPattern);
            year = parseInt(match[1], 10);
            month = parseInt(match[2], 10);
            day = parseInt(match[3], 10);
        } else if (altPattern.test(text)) {
            const match = text.match(altPattern);
            day = parseInt(match[1], 10);
            year = parseInt(match[2], 10);
            month = parseInt(match[3], 10);
        } else {
            return null;
        }

        if (!Number.isFinite(year) || year < 1900 || year > 2100) return null;
        if (!Number.isFinite(month) || month < 1 || month > 12) return null;
        if (!Number.isFinite(day) || day < 1 || day > 31) return null;

        const date = new Date(Date.UTC(year, month - 1, day));
        if (Number.isNaN(date.getTime())) return null;

        const iso = `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        return {
            date: new Date(date.getTime()),
            iso
        };
    }

    /**
     * 확장된 샘플 데이터 생성 (78개)
     */
    generateExtendedSampleData() {
        const basePatents = [
            {
                id: "sample-001",
                patent_number: "10-201701704",
                title: "산화질 가스 분해 시스템 기술",
                abstract: "반도체 제조 공정에서 발생하는 산화질 가스를 효과적으로 분해하는 시스템에 관한 발명입니다.",
                category: "gas-treatment",
                technology_field: "가스처리",
                registration_date: "2024-09-29",
                application_date: "2017-01-15",
                status: "active",
                inventors: ["김철수", "이영희", "박준성"],
                assignee: "글로벌 스탠다드 테크놀로지 주식회사",
                priority_score: 9,
                technical_keywords: ["가스분해", "산화질", "반도체공정", "유해가스"],
                related_patents: ["10-200600387", "10-1123456"],
                main_claims: "산화질 가스를 효과적으로 분해하는 처리 시스템"
            },
            {
                id: "sample-002",
                patent_number: "10-200600387",
                title: "온도 측정 센서 시스템 개발",
                abstract: "정밀한 온도 측정을 위한 센서 시스템 개발에 관한 특허입니다.",
                category: "temperature",
                technology_field: "온도제어",
                registration_date: "2024-09-29",
                application_date: "2006-03-20",
                status: "active",
                inventors: ["박민수", "최영숙"],
                assignee: "글로벌 스탠다드 테크놀로지 주식회사",
                priority_score: 8,
                technical_keywords: ["온도센서", "정밀측정", "시스템개발"],
                related_patents: ["10-201701704"],
                main_claims: "온도 측정 센서 시스템"
            },
            {
                id: "sample-003",
                patent_number: "10-200600387",
                title: "온도 제어 센서 시스템 64로",
                abstract: "64채널 온도 제어 센서 시스템에 관한 발명입니다.",
                category: "temperature",
                technology_field: "온도제어",
                registration_date: "2024-09-29",
                application_date: "2006-03-20",
                status: "active",
                inventors: ["이준호", "김미영"],
                assignee: "글로벌 스탠다드 테크놀로지 주식회사",
                priority_score: 8,
                technical_keywords: ["64채널", "온도제어", "센서시스템"],
                related_patents: ["10-201701704"],
                main_claims: "64채널 온도 제어 센서 시스템"
            },
            {
                id: "sample-004",
                patent_number: "10-200612177",
                title: "다층 기판 출력 처리 청취 1호",
                abstract: "다층 기판의 출력 처리를 위한 특고가스 시스템에 관한 발명입니다.",
                category: "plasma",
                technology_field: "특고가스",
                registration_date: "2006-07-26",
                application_date: "2006-01-15",
                status: "active",
                inventors: ["정우성", "한지민"],
                assignee: "글로벌 스탠다드 테크놀로지 주식회사",
                priority_score: 7,
                technical_keywords: ["다층기판", "출력처리", "특고가스"],
                related_patents: [],
                main_claims: "다층 기판 출력 처리 시스템"
            },
            {
                id: "sample-005",
                patent_number: "10-0822048",
                title: "플라즈마 토치를 이용한 폐가스 처리장치",
                abstract: "고온 플라즈마를 이용하여 반도체 제조 공정에서 발생하는 유해가스를 효과적으로 분해 처리하는 장치입니다.",
                category: "plasma",
                technology_field: "플라즈마",
                registration_date: "2008-04-14",
                application_date: "2006-10-12",
                status: "active",
                inventors: ["박민수", "정수진", "최영호"],
                assignee: "글로벌 스탠다드 테크놀로지 주식회사",
                priority_score: 10,
                technical_keywords: ["플라즈마", "가스분해", "유해가스처리", "토치", "고온분해"],
                related_patents: ["10-0719225", "10-0965234"],
                main_claims: "1. 플라즈마를 생성하는 토치부; 2. 폐가스를 플라즈마 영역으로 공급하는 가스 공급부; 3. 분해된 가스를 냉각 및 중화하는 후처리부;를 포함하는 폐가스 처리장치"
            },
            {
                id: "sample-006",
                patent_number: "10-0965234",
                title: "습식 스크러버 시스템의 효율 개선 방법",
                abstract: "습식 스크러버에서 가스와 세정액의 접촉 효율을 향상시켜 오염물질 제거 성능을 극대화하는 방법입니다.",
                category: "scrubber",
                technology_field: "스크러버",
                registration_date: "2010-06-22",
                application_date: "2008-12-15",
                status: "active",
                inventors: ["장동훈", "최미영", "김태준"],
                assignee: "글로벌 스탠다드 테크놀로지 주식회사",
                priority_score: 8,
                technical_keywords: ["습식스크러버", "가스흡수", "충진재", "세정액", "접촉효율"],
                related_patents: ["10-0822048", "10-1234567"],
                main_claims: "1. 다층 구조의 충진재를 포함하는 흡수탑; 2. 세정액의 유량과 분포를 제어하는 분배 시스템; 3. 가스-액 접촉면적을 최대화하는 난류 생성 구조;를 특징으로 하는 습식 스크러버"
            },
            {
                id: "sample-007",
                patent_number: "10-1123456",
                title: "반도체 공정용 냉각 시스템",
                abstract: "반도체 제조 장비의 안정적인 운영을 위한 고효율 냉각 시스템입니다.",
                category: "chiller",
                technology_field: "칠러",
                registration_date: "2012-03-15",
                application_date: "2010-08-20",
                status: "active",
                inventors: ["오승민", "한지원", "류성철"],
                assignee: "글로벌 스탠다드 테크놀로지 주식회사",
                priority_score: 7,
                technical_keywords: ["냉각시스템", "칠러", "정밀온도제어", "에너지효율", "인버터제어"],
                related_patents: ["10-0719225", "10-1345678"],
                main_claims: "1. 압축기, 응축기, 증발기로 구성된 냉동 사이클; 2. 냉각수 온도를 ±0.1℃ 정밀도로 제어하는 제어부; 3. 에너지 효율을 최적화하는 인버터 시스템;을 포함하는 냉각 시스템"
            },
            {
                id: "sample-008",
                patent_number: "10-1234567",
                title: "다단계 가스 정화 시스템",
                abstract: "복수의 정화 단계를 순차적으로 거쳐 다양한 종류의 오염물질을 효과적으로 제거하는 통합 가스 처리 시스템입니다.",
                category: "gas-treatment",
                technology_field: "가스처리",
                registration_date: "2015-08-10",
                application_date: "2013-11-25",
                status: "active",
                inventors: ["윤성호", "신유리", "조민혁"],
                assignee: "글로벌 스탠다드 테크놀로지 주식회사",
                priority_score: 9,
                technical_keywords: ["다단계처리", "가스정화", "통합시스템", "오염물질제거", "환경보호"],
                related_patents: ["10-0965234", "10-0822048"],
                main_claims: "1. 1차 물리적 분리부; 2. 2차 화학적 중화부; 3. 3차 흡착 정화부; 4. 최종 모니터링 및 배출부;로 구성되는 다단계 가스 정화 시스템"
            }
        ];
        
        // 78개까지 확장
        const extendedPatents = [...basePatents];
        const categories = ['scrubber', 'chiller', 'plasma', 'temperature', 'gas-treatment'];
        const techFields = ['스크러버', '칠러', '플라즈마', '온도제어', '가스처리'];
        const statuses = ['active', 'active', 'active', 'expired', 'pending']; // 80%는 active
        
        const titles = {
            'scrubber': [
                '고효율 습식 스크러버 시스템',
                '다층 충진재 스크러버 설계',
                '자동 세정액 순환 시스템',
                '스크러버 성능 모니터링 장치',
                '에너지 절약형 스크러버',
                '산성가스 제거용 스크러버',
                '알칼리성 폐수 처리 스크러버',
                '다중 오염물질 동시 제거 스크러버'
            ],
            'chiller': [
                '저소음 산업용 칠러',
                '변속 제어 냉각 시스템',
                '친환경 냉매 사용 칠러',
                '모듈형 확장 냉각 시스템',
                '지능형 온도 제어 칠러',
                '에너지 회수형 냉각기',
                '정밀 온도 유지 시스템',
                '다채널 온도 제어 장치'
            ],
            'plasma': [
                '저전력 플라즈마 발생기',
                '대기압 플라즈마 처리 장치',
                '연속 운전 플라즈마 시스템',
                '다중 가스 동시 분해 장치',
                '플라즈마 온도 제어 시스템',
                '안전성 강화 플라즈마 토치',
                '자동화 플라즈마 처리 라인',
                '플라즈마 부산물 처리 장치'
            ],
            'temperature': [
                '다점 온도 모니터링 시스템',
                '무선 온도 센서 네트워크',
                '예측 제어 온도 시스템',
                '구역별 온도 제어 장치',
                '온도 이력 관리 시스템',
                '실시간 온도 알람 시스템',
                '자가 진단 온도 제어기',
                '에너지 최적화 온도 관리'
            ],
            'gas-treatment': [
                '선택적 가스 분리 시스템',
                '연속 가스 모니터링 장치',
                '가스 농도 자동 제어 시스템',
                '유해가스 누출 감지기',
                '가스 품질 실시간 분석기',
                '다성분 가스 분석 장치',
                '가스 배출 제어 시스템',
                '청정 가스 생성 장치'
            ]
        };
        
        for (let i = 6; i <= 78; i++) {
            const categoryIndex = Math.floor(Math.random() * categories.length);
            const category = categories[categoryIndex];
            const techField = techFields[categoryIndex];
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            const titleOptions = titles[category];
            const title = titleOptions[Math.floor(Math.random() * titleOptions.length)];
            
            const year = 2005 + Math.floor(Math.random() * 20); // 2005-2024
            const month = Math.floor(Math.random() * 12) + 1;
            const day = Math.floor(Math.random() * 28) + 1;
            
            const regDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const appYear = year - Math.floor(Math.random() * 3) - 1; // 출원일은 등록일보다 1-3년 전
            const appDate = `${appYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            
            extendedPatents.push({
                id: String(i),
                patent_number: `10-${String(Math.floor(Math.random() * 9000000) + 1000000)}`,
                title: `${title} ${i}호`,
                abstract: `${techField} 분야의 혁신적인 기술을 다룬 특허로, 기존 기술의 한계를 극복하고 성능을 향상시킨 새로운 접근법을 제시합니다.`,
                category: category,
                technology_field: techField,
                registration_date: regDate,
                application_date: appDate,
                status: status,
                inventors: [`발명자${i}A`, `발명자${i}B`],
                assignee: "글로벌 스탠다드 테크놀로지 주식회사",
                priority_score: Math.floor(Math.random() * 6) + 5, // 5-10점
                technical_keywords: [techField, "혁신기술", "성능향상", "효율개선"],
                related_patents: [],
                main_claims: `${techField} 관련 핵심 기술 구성요소들을 포함하는 시스템`,
                file_path: `/patents/10-${String(Math.floor(Math.random() * 9000000) + 1000000)}.pdf`
            });
        }
        
        return extendedPatents;
    }
    
    /**
     * 이벤트 바인딩
     */
    bindEvents() {
        const {
            listContainer,
            searchInput,
            searchButton,
            resetButton,
            searchSuggestions,
            categoryFilter,
            statusFilter,
            prevPage,
            nextPage,
            pageSize
        } = this.dom;

        if (searchInput) {
            const debouncedSearch = this.debounce((event) => this.onSearchInput(event), 200);
            searchInput.addEventListener('input', debouncedSearch);
            searchInput.addEventListener('focus', () => this.showSearchSuggestions());
            searchInput.addEventListener('blur', () => this.deferHideSuggestions());
            searchInput.addEventListener('keydown', (event) => this.handleSearchKeydown(event));
        }

        if (searchButton) {
            searchButton.addEventListener('click', () => this.executeSearch());
        }

        if (resetButton) {
            resetButton.addEventListener('click', () => this.resetFilters());
        }

        if (searchSuggestions) {
            searchSuggestions.addEventListener('mousedown', (event) => {
                const item = event.target.closest('[data-suggestion-value]');
                if (item) {
                    event.preventDefault();
                    this.applySuggestion(item.getAttribute('data-suggestion-value'));
                }
            });
        }

        if (listContainer) {
            listContainer.addEventListener('click', (event) => {
                const actionButton = event.target.closest('[data-action="view-detail"]');
                if (actionButton) {
                    event.preventDefault();
                    const patentId = actionButton.getAttribute('data-patent-id');
                    if (patentId) {
                        this.viewDetail(patentId);
                    }
                    return;
                }

                const card = event.target.closest('.patent-item[data-patent-id]');
                if (card && card.dataset.patentId) {
                    this.viewDetail(card.dataset.patentId);
                }
            });
        }
        
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (event) => {
                this.filters.category = event.target.value;
                this.currentPage = 1;
                this.applyFilters();
            });
        }
        
        if (statusFilter) {
            statusFilter.addEventListener('change', (event) => {
                this.filters.status = event.target.value;
                this.currentPage = 1;
                this.applyFilters();
            });
        }

        if (prevPage) {
            prevPage.addEventListener('click', () => this.goToPage(this.currentPage - 1));
        }

        if (nextPage) {
            nextPage.addEventListener('click', () => this.goToPage(this.currentPage + 1));
        }

        if (pageSize) {
            pageSize.addEventListener('change', (event) => {
                const newSize = parseInt(event.target.value, 10);
                this.itemsPerPage = Number.isFinite(newSize) && newSize > 0 ? newSize : 10;
                this.currentPage = 1;
                this.calculatePagination();
                this.renderTable();
                this.updateResultCount();
                this.updatePaginationUI();
                this.updateURLParameters();
            });
        }
    }
    
    /**
     * 필터 적용
     */
    applyFilters(options = {}) {
        const { skipUrlUpdate = false, preservePage = false } = options;
        let filtered = Array.isArray(this.patents) ? [...this.patents] : [];
        
        if (this.filters.search) {
            const terms = this.filters.search.toLowerCase().split(/\s+/).filter(Boolean);
            filtered = filtered.filter(patent => {
                const corpus = patent.__searchCorpus || '';
                return terms.every(term => corpus.includes(term));
            });
        }
        
        if (this.filters.category) {
            filtered = filtered.filter(patent => patent.category === this.filters.category);
        }
        
        if (this.filters.status) {
            filtered = filtered.filter(patent => patent.status === this.filters.status);
        }
        
        this.filteredPatents = filtered;
        
        if (!preservePage) {
            this.currentPage = 1;
        } else {
            const maxPage = Math.max(1, Math.ceil(filtered.length / this.itemsPerPage));
            this.currentPage = Math.min(this.currentPage, maxPage);
        }
        
        this.calculatePagination();
        this.renderTable();
        this.updateResultCount();
        this.updatePaginationUI();
        this.updateStats();
        
        if (!skipUrlUpdate) {
            this.updateURLParameters();
        }

        this.notifyDataChanged('filters');
    }
    
    /**
     * 정렬
     */
    sort(field) {
        if (this.sorting.field === field) {
            this.sorting.order = this.sorting.order === 'asc' ? 'desc' : 'asc';
        } else {
            this.sorting.field = field;
            this.sorting.order = 'asc';
        }
        
        this.filteredPatents.sort((a, b) => {
            let valueA = a[field];
            let valueB = b[field];

            if (field.includes('date')) {
                valueA = a.__registrationDate || new Date(valueA || 0);
                valueB = b.__registrationDate || new Date(valueB || 0);
            }

            if (typeof valueA === 'number' && typeof valueB === 'number') {
                return this.sorting.order === 'asc' ? valueA - valueB : valueB - valueA;
            }

            if (valueA instanceof Date && valueB instanceof Date) {
                return this.sorting.order === 'asc' ? valueA - valueB : valueB - valueA;
            }

            valueA = valueA ?? '';
            valueB = valueB ?? '';
            return this.sorting.order === 'asc'
                ? String(valueA).localeCompare(String(valueB), 'ko')
                : String(valueB).localeCompare(String(valueA), 'ko');
        });
        
        this.renderTable();
        this.updateSortIndicators();
    }

    onSearchInput(event) {
        const value = event.target.value.trim();
        this.filters.search = value;
        this.searchSuggestionIndex = -1;

        if (value.length >= 2) {
            const suggestions = this.getSearchSuggestions(value);
            this.updateSearchSuggestions(suggestions);
            if (suggestions.length) {
                this.showSearchSuggestions();
            } else {
                this.hideSearchSuggestions();
            }
        } else {
            this.updateSearchSuggestions([]);
            this.hideSearchSuggestions();
        }

        this.currentPage = 1;
        this.applyFilters({ skipUrlUpdate: true });
    }

    executeSearch() {
        if (this.dom.searchInput) {
            this.filters.search = this.dom.searchInput.value.trim();
        }
        this.currentPage = 1;
        this.applyFilters();
        this.hideSearchSuggestions();
    }

    resetFilters() {
        this.filters = {
            search: '',
            category: '',
            status: '',
            dateFrom: '',
            dateTo: ''
        };

        if (this.dom.searchInput) {
            this.dom.searchInput.value = '';
        }
        if (this.dom.categoryFilter) {
            this.dom.categoryFilter.value = '';
        }
        if (this.dom.statusFilter) {
            this.dom.statusFilter.value = '';
        }

        this.currentPage = 1;
        this.filteredPatents = [...this.patents];
        this.calculatePagination();
        this.renderTable();
        this.updateResultCount();
        this.updatePaginationUI();
        this.updateURLParameters();
        this.updateSearchSuggestions([]);
        this.hideSearchSuggestions();
        this.updateStats();
        this.notifyDataChanged('reset');
    }

    showSearchSuggestions() {
        if (this.activeSuggestions.length === 0) return;
        if (this.dom.searchSuggestions) {
            this.dom.searchSuggestions.classList.remove('hidden');
        }
        if (this.dom.searchInput) {
            this.dom.searchInput.setAttribute('aria-expanded', 'true');
        }
    }

    hideSearchSuggestions() {
        if (this.dom.searchSuggestions) {
            this.dom.searchSuggestions.classList.add('hidden');
        }
        if (this.dom.searchInput) {
            this.dom.searchInput.setAttribute('aria-expanded', 'false');
        }
        this.searchSuggestionIndex = -1;
    }

    deferHideSuggestions() {
        if (this.suggestionHideTimeout) {
            clearTimeout(this.suggestionHideTimeout);
        }
        this.suggestionHideTimeout = setTimeout(() => this.hideSearchSuggestions(), 150);
    }

    handleSearchKeydown(event) {
        if (event.key === 'Escape') {
            this.hideSearchSuggestions();
            return;
        }

        if (!this.activeSuggestions.length) {
            if (event.key === 'Enter') {
                this.executeSearch();
            }
            return;
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            const nextIndex = (this.searchSuggestionIndex + 1) % this.activeSuggestions.length;
            this.highlightSuggestion(nextIndex);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            const prevIndex = (this.searchSuggestionIndex - 1 + this.activeSuggestions.length) % this.activeSuggestions.length;
            this.highlightSuggestion(prevIndex);
        } else if (event.key === 'Enter') {
            if (this.searchSuggestionIndex >= 0 && this.activeSuggestions[this.searchSuggestionIndex]) {
                event.preventDefault();
                this.applySuggestion(this.activeSuggestions[this.searchSuggestionIndex].value);
            } else {
                this.executeSearch();
            }
        }
    }

    highlightSuggestion(index) {
        const items = this.dom.searchSuggestions ? Array.from(this.dom.searchSuggestions.querySelectorAll('[data-suggestion-value]')) : [];
        if (!items.length) return;

        items.forEach((item, idx) => {
            if (idx === index) {
                item.classList.add('bg-gray-100');
                item.setAttribute('aria-selected', 'true');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('bg-gray-100');
                item.removeAttribute('aria-selected');
            }
        });

        this.searchSuggestionIndex = index;
    }

    applySuggestion(value) {
        if (this.dom.searchInput) {
            this.dom.searchInput.value = value;
        }
        this.filters.search = value;
        this.currentPage = 1;
        this.applyFilters();
        this.hideSearchSuggestions();
    }

    getSearchSuggestions(query) {
        const normalized = query.toLowerCase();
        const seen = new Set();
        const suggestions = [];

        this.patents.forEach((patent) => {
            if (suggestions.length >= 8) return;
            const patentNumber = (patent.patent_number || '').toLowerCase();
            const title = (patent.title || '').toLowerCase();
            const techField = (patent.technology_field || '').toLowerCase();

            if (patentNumber.includes(normalized) && !seen.has(patent.patent_number)) {
                suggestions.push({
                    value: patent.patent_number,
                    label: patent.patent_number,
                    meta: patent.title || patent.technology_field || ''
                });
                seen.add(patent.patent_number);
            } else if ((title.includes(normalized) || techField.includes(normalized)) && !seen.has(patent.title)) {
                suggestions.push({
                    value: patent.title,
                    label: patent.title,
                    meta: patent.patent_number
                });
                seen.add(patent.title);
            }
        });

        return suggestions.slice(0, 8);
    }

    updateSearchSuggestions(suggestions) {
        this.activeSuggestions = suggestions;
        const { searchSuggestions, searchInput } = this.dom;

        if (!searchSuggestions) return;

        if (!suggestions.length) {
            searchSuggestions.innerHTML = '';
            searchSuggestions.classList.add('hidden');
            if (searchInput) {
                searchInput.setAttribute('aria-expanded', 'false');
            }
            return;
        }

        const suggestionMarkup = suggestions.map((item, index) => `
            <button type="button" class="w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none transition-colors" data-suggestion-value="${item.value}" data-index="${index}">
                <span class="block font-medium text-gst-dark">${item.label}</span>
                ${item.meta ? `<span class="block text-xs text-gst-gray">${item.meta}</span>` : ''}
            </button>
        `).join('');

        searchSuggestions.innerHTML = suggestionMarkup;
        searchSuggestions.classList.remove('hidden');
        if (searchInput) {
            searchInput.setAttribute('aria-expanded', 'true');
        }
        this.searchSuggestionIndex = -1;
    }
    
    /**
     * 페이지 이동
     */
    goToPage(page) {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            this.renderTable();
            this.updatePaginationUI();
            this.updateResultCount();
            this.notifyDataChanged('pagination');
        }
    }
    
    /**
     * 페이지네이션 계산
     */
    calculatePagination() {
        this.totalPages = Math.ceil(this.filteredPatents.length / this.itemsPerPage);
    }
    
    /**
     * 리스트 렌더링 (새로운 형태)
     */
    renderTable() {
        const listContainer = this.dom.listContainer;
        if (!listContainer) return;

        this.toggleLoading(false);

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        let pagePatents = this.filteredPatents.slice(startIndex, endIndex);

        if (!pagePatents.length && this.filteredPatents.length > 0 && this.currentPage > 1) {
            this.currentPage = Math.max(1, Math.ceil(this.filteredPatents.length / this.itemsPerPage));
            return this.renderTable();
        }

        if (!this.filteredPatents.length) {
            listContainer.innerHTML = '';
            this.updateEmptyState(true);
            this.renderYearGroups([]);
            return;
        }

        this.updateEmptyState(false);
        listContainer.classList.remove('hidden');

        const cardsMarkup = pagePatents.map((patent, index) => this.createPatentCardMarkup(patent, index)).join('');
        listContainer.innerHTML = cardsMarkup;

        this.renderYearGroups(this.filteredPatents);
    }

    createPatentCardMarkup(patent, index = 0) {
        const categoryClass = this.getCategoryClass(patent.category);
        const badgeClass = this.getCategoryBadgeClass(patent.category);
        const statusClass = this.getStatusClass(patent.status);
        const statusText = this.getStatusText(patent.status);
        const registrationDate = patent.__registrationDate || this.normalizeDate(patent.registration_date)?.date || null;
        const relativeTime = this.getTimeAgo(registrationDate);
        const formattedDate = this.formatDate(registrationDate || patent.registration_date);
        const inventors = Array.isArray(patent.inventors) && patent.inventors.length
            ? this.escapeHtml(patent.inventors.join(', '))
            : '정보 없음';
        const technologyField = this.escapeHtml(patent.technology_field || '기술분야 미정');
        const patentNumber = this.escapeHtml(patent.patent_number || '미상');
        const title = this.escapeHtml(patent.title || '제목 정보 없음');
        const abstract = this.escapeHtml(patent.abstract || '요약 정보가 등록되지 않았습니다.');
        const categoryLabel = this.escapeHtml(this.getCategoryDisplayName(patent.category));
        const animationDelay = `${Math.min(index * 0.05, 0.4)}s`;

        let linkMarkup = '';
        if (patent.file_path) {
            const escapedPath = this.escapeHtml(patent.file_path);
            linkMarkup = `
                <a href="${escapedPath}" class="btn btn-secondary text-sm" target="_blank" rel="noopener" aria-label="${title} 명세서 새 창에서 열기">
                    <i class="fas fa-file-pdf mr-2" aria-hidden="true"></i>명세서 보기
                </a>
            `;
        }

        return `
            <article class="patent-item ${categoryClass} border-l-4 bg-white p-4 rounded-lg shadow-sm hover:shadow-lg transition-all" role="listitem" data-patent-id="${this.escapeHtml(patent.id)}" style="animation-delay: ${animationDelay};">
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div class="flex-1">
                        <div class="flex flex-wrap items-center gap-2 text-sm">
                            <span class="patent-category ${badgeClass}">${categoryLabel}</span>
                            <span class="status-badge ${statusClass}">${statusText}</span>
                            <span class="patent-number">${patentNumber}</span>
                        </div>
                        <h4 class="mt-2 text-lg font-semibold text-gst-dark">${title}</h4>
                        <p class="text-sm text-gst-gray mt-1">${abstract}</p>
                        <div class="mt-2 flex flex-wrap gap-4 text-xs text-gst-gray">
                            <span><i class="fas fa-calendar-alt mr-1" aria-hidden="true"></i>${formattedDate}</span>
                            <span><i class="fas fa-microchip mr-1" aria-hidden="true"></i>${technologyField}</span>
                            <span><i class="fas fa-user mr-1" aria-hidden="true"></i>${inventors}</span>
                        </div>
                    </div>
                    <div class="flex flex-col items-end gap-2 min-w-[140px]">
                        <button type="button"
                                class="btn btn-primary text-sm"
                                data-action="view-detail"
                                data-patent-id="${this.escapeHtml(patent.id)}"
                                onclick="return window.GST && typeof GST.viewPatentDetail === 'function' ? (GST.viewPatentDetail(this.dataset.patentId), false) : false;">
                            <i class="fas fa-eye mr-2" aria-hidden="true"></i>상세보기
                        </button>
                        ${linkMarkup}
                        <span class="time-indicator mt-2" aria-label="등록 후 경과 시간">${relativeTime}</span>
                    </div>
                </div>
            </article>
        `;
    }

    escapeHtml(value) {
        if (value === undefined || value === null) {
            return '';
        }
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    toggleLoading(isLoading) {
        if (this.dom.loading) {
            this.dom.loading.classList.toggle('hidden', !isLoading);
            this.dom.loading.setAttribute('aria-hidden', isLoading ? 'false' : 'true');
        }
        if (this.dom.listContainer && isLoading) {
            this.dom.listContainer.classList.add('hidden');
        }
        if (this.dom.emptyState && isLoading) {
            this.dom.emptyState.classList.add('hidden');
        }
    }

    updateEmptyState(isEmpty) {
        if (this.dom.emptyState) {
            this.dom.emptyState.classList.toggle('hidden', !isEmpty);
        }
        if (this.dom.listContainer) {
            this.dom.listContainer.classList.toggle('hidden', isEmpty);
        }
    }

    renderYearGroups(patents) {
        const container = this.dom.yearGroups;
        if (!container) return;

        if (!Array.isArray(patents) || patents.length === 0) {
            container.innerHTML = '<div class="px-6 py-6 text-sm text-gst-gray">조건에 맞는 연도별 데이터가 없습니다.</div>';
            return;
        }

        const groups = patents.reduce((acc, patent) => {
            const year = this.getPatentYear(patent);
            if (!year) return acc;
            if (!acc[year]) acc[year] = [];
            acc[year].push(patent);
            return acc;
        }, {});

        const sortedYears = Object.keys(groups).sort((a, b) => Number(b) - Number(a)).slice(0, 5);
        const markup = sortedYears.map((year) => {
            const items = groups[year]
                .slice()
                .sort((a, b) => {
                    const dateA = a.__registrationDate || this.normalizeDate(a.registration_date)?.date || new Date(0);
                    const dateB = b.__registrationDate || this.normalizeDate(b.registration_date)?.date || new Date(0);
                    return dateB - dateA;
                });

            const itemMarkup = items.slice(0, 3).map((patent) => `
                <li class="flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0">
                    <span class="text-sm text-gst-dark font-medium">${this.escapeHtml(patent.title || '제목 정보 없음')}</span>
                    <span class="text-xs text-gst-gray">${this.escapeHtml(patent.patent_number || '')}</span>
                </li>
            `).join('');

            return `
                <section class="border-t border-gray-200">
                    <header class="bg-gst-dark text-white px-6 py-3 flex items-center justify-between">
                        <span class="font-semibold">${year}년</span>
                        <span class="text-sm">${items.length}건</span>
                    </header>
                    <div class="px-6 py-4">
                        <ul>${itemMarkup || '<li class="text-sm text-gst-gray">요약 정보가 없습니다.</li>'}</ul>
                    </div>
                </section>
            `;
        }).join('');

        container.innerHTML = markup;
    }

    getPatentYear(patent) {
        if (!patent) return null;
        const date = patent.__registrationDate || (patent instanceof Date ? patent : null);
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
        return date.getFullYear();
    }

    updatePaginationUI() {
        const totalPages = Math.max(1, this.totalPages || 1);

        if (this.dom.prevPage) {
            const disabled = this.currentPage <= 1;
            this.dom.prevPage.disabled = disabled;
            this.dom.prevPage.setAttribute('aria-disabled', disabled ? 'true' : 'false');
        }

        if (this.dom.nextPage) {
            const disabled = this.currentPage >= totalPages;
            this.dom.nextPage.disabled = disabled;
            this.dom.nextPage.setAttribute('aria-disabled', disabled ? 'true' : 'false');
        }

        if (this.dom.pageSize && String(this.itemsPerPage) !== this.dom.pageSize.value) {
            this.dom.pageSize.value = String(this.itemsPerPage);
        }
    }

    updateResultCount() {
        const total = this.filteredPatents.length;
        const start = total > 0 ? (this.currentPage - 1) * this.itemsPerPage + 1 : 0;
        const end = total > 0 ? Math.min(this.currentPage * this.itemsPerPage, total) : 0;

        if (this.dom.totalCount) {
            this.dom.totalCount.textContent = String(total);
        }
        if (this.dom.startCount) {
            this.dom.startCount.textContent = String(start);
        }
        if (this.dom.endCount) {
            this.dom.endCount.textContent = String(end);
        }
    }

    updateDataSourceIndicator() {
        const indicator = this.dom.dataSourceIndicator;
        if (!indicator) return;

        const timestamp = this.lastUpdatedAt ? new Date(this.lastUpdatedAt) : null;
        const formattedTime = timestamp && !Number.isNaN(timestamp.getTime())
            ? timestamp.toLocaleString('ko-KR')
            : '';

        let label = '데이터 소스';
        let timePrefix = '갱신';

        switch (this.dataSource) {
            case 'api':
                label = '실시간 API 데이터';
                timePrefix = '마지막 갱신';
                break;
            case 'local':
                label = '로컬 특허 DB';
                timePrefix = '생성';
                break;
            case 'sample':
                label = '샘플 데이터 모드';
                timePrefix = '생성';
                break;
            default:
                label = '데이터 소스';
                timePrefix = '갱신';
        }

        indicator.textContent = formattedTime
            ? `${label} · ${timePrefix} ${formattedTime}`
            : label;
    }

    notifyDataReady() {
        const detail = {
            total: this.patents.length,
            filtered: this.filteredPatents.length,
            active: this.patents.filter(p => p.status === 'active').length,
            dataSource: this.dataSource,
            lastUpdatedAt: this.lastUpdatedAt
        };
        document.dispatchEvent(new CustomEvent('gst:patents-ready', { detail }));
    }

    notifyDataChanged(reason = 'update') {
        const detail = {
            reason,
            total: this.patents.length,
            filtered: this.filteredPatents.length,
            currentPage: this.currentPage,
            itemsPerPage: this.itemsPerPage,
            filters: { ...this.filters },
            dataSource: this.dataSource
        };
        document.dispatchEvent(new CustomEvent('gst:patents-changed', { detail }));
    }

    showInlineAlert(message, type = 'info') {
        const container = document.getElementById('patents');
        if (!container) return;

        const alert = document.createElement('div');
        const typeClassMap = {
            info: 'alert-info',
            success: 'alert-success',
            warning: 'alert-warning',
            error: 'alert-error'
        };
        const alertClass = typeClassMap[type] || typeClassMap.info;

        alert.className = `alert ${alertClass}`;
        alert.setAttribute('role', 'alert');
        alert.textContent = message;

        container.prepend(alert);
        setTimeout(() => {
            if (alert && alert.parentNode) {
                alert.parentNode.removeChild(alert);
            }
        }, 5000);
    }

    loadStateFromURL() {
        try {
            const params = new URLSearchParams(window.location.search);
            const search = params.get('q');
            const category = params.get('category');
            const status = params.get('status');
            const page = parseInt(params.get('page'), 10);
            const pageSize = parseInt(params.get('pageSize'), 10);

            if (search) {
                this.filters.search = search;
                if (this.dom.searchInput) {
                    this.dom.searchInput.value = search;
                }
            }

            if (category) {
                this.filters.category = category;
                if (this.dom.categoryFilter) {
                    this.dom.categoryFilter.value = category;
                }
            }

            if (status) {
                this.filters.status = status;
                if (this.dom.statusFilter) {
                    this.dom.statusFilter.value = status;
                }
            }

            if (Number.isFinite(pageSize) && pageSize > 0) {
                this.itemsPerPage = pageSize;
                if (this.dom.pageSize) {
                    this.dom.pageSize.value = String(pageSize);
                }
            }

            if (Number.isFinite(page) && page > 0) {
                this.initialPageFromURL = page;
            }
        } catch (error) {
            console.warn('URL 상태를 불러오는 중 오류:', error);
        }
    }

    updateURLParameters() {
        const params = new URLSearchParams();

        if (this.filters.search) {
            params.set('q', this.filters.search);
        }
        if (this.filters.category) {
            params.set('category', this.filters.category);
        }
        if (this.filters.status) {
            params.set('status', this.filters.status);
        }
        if (this.currentPage > 1) {
            params.set('page', String(this.currentPage));
        }
        if (this.itemsPerPage !== 10) {
            params.set('pageSize', String(this.itemsPerPage));
        }

        const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
        window.history.replaceState({}, '', newUrl);
    }
    
    /**
     * 특허 카테고리 클래스 반환
     */
    getCategoryClass(category) {
        const classMap = {
            'gas': 'gas-carrier',
            'temperature': 'temperature-gauge',  
            'plasma': 'special-gas',
            'sensor': 'temperature-gauge',
            'purification': 'gas-carrier',
            'monitoring': 'temperature-gauge'
        };
        return classMap[category] || 'temperature-gauge';
    }
    
    /**
     * 특허 카테고리 표시명 반환
     */
    getCategoryDisplayName(category) {
        const nameMap = {
            'gas': '가스캐리',
            'temperature': '온도게이',
            'plasma': '특고가스',
            'sensor': '온도게이',
            'purification': '가스캐리',
            'monitoring': '온도게이'
        };
        return nameMap[category] || '온도게이';
    }
    
    /**
     * 시간 경과 표시
     */
    getTimeAgo(value) {
        const date = value instanceof Date ? value : this.normalizeDate(value)?.date;
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
            return '정보 없음';
        }

        const now = new Date();
        const diffTime = now - date;
        if (diffTime < 0) {
            return '방금 전';
        }

        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
        
        if (diffDays === 0) {
            if (diffHours < 1) return '방금 전';
            return `${diffHours}시간 전`;
        } else if (diffDays < 30) {
            return `${diffDays}일 전`;
        } else if (diffDays < 365) {
            const months = Math.floor(diffDays / 30);
            return `${months}개월 전`;
        } else {
            const years = Math.floor(diffDays / 365);
            return `${years}년 전`;
        }
    }
    
    /**
     * 통계 업데이트
     */
    updateStats(dataset = null) {
        const data = Array.isArray(dataset)
            ? dataset
            : (Array.isArray(this.filteredPatents)
                ? this.filteredPatents
                : this.patents);

        const total = data.length;
        const active = data.filter(p => p.status === 'active').length;
        const categories = [...new Set(data.map(p => p.category).filter(Boolean))].length;
        const avgScore = total
            ? (data.reduce((sum, p) => sum + (p.priority_score || 0), 0) / total).toFixed(1)
            : '0.0';

        let rangeText = '정보 없음';
        const validDates = data
            .map(p => p.__registrationDate)
            .filter(date => date instanceof Date && !Number.isNaN(date.getTime()));

        if (validDates.length > 0) {
            const years = validDates.map(date => date.getFullYear());
            const minYear = Math.min(...years);
            const maxYear = Math.max(...years);
            rangeText = minYear === maxYear ? `${minYear}` : `${minYear} - ${maxYear}`;
        }
        
        this.updateElement('total-patents', total);
        this.updateElement('active-patents', active);
        this.updateElement('tech-categories', categories);
        this.updateElement('avg-priority-score', avgScore);
        this.updateElement('registration-range', rangeText);
    }
    
    /**
     * 특허 상세보기
     */
    viewDetail(patentId) {
        const targetId = String(patentId);
        const patent = (this.filteredPatents || []).find(p => String(p.id) === targetId)
            || this.patents.find(p => String(p.id) === targetId);
        if (!patent) return;

        const title = this.escapeHtml(patent.title || '제목 정보 없음');
        const patentNumber = this.escapeHtml(patent.patent_number || '정보 없음');
        const technologyField = this.escapeHtml(patent.technology_field || '기술분야 미정');
        const abstract = this.escapeHtml(patent.abstract || '요약 정보가 등록되지 않았습니다.');
        const inventors = patent.inventors && patent.inventors.length
            ? this.escapeHtml(patent.inventors.join(', '))
            : '정보 없음';
        const assignee = this.escapeHtml(patent.assignee || '정보 없음');
        const registrationDate = this.formatDate(patent.__registrationDate || patent.registration_date);
        const applicationDate = this.formatDate(patent.application_date);
        const statusBadge = `<span class="status-badge ${this.getStatusClass(patent.status)}">${this.getStatusText(patent.status)}</span>`;
        const priorityScore = this.normalizeNumber(patent.priority_score);
        const priorityDisplay = priorityScore !== null ? `${priorityScore}/10` : '정보 없음';
        const priorityPercent = priorityScore !== null ? priorityScore * 10 : 0;

        const modalContent = `
            <div class="max-w-4xl mx-auto bg-white rounded-lg shadow-xl">
                <div class="px-6 py-4 border-b border-gray-200">
                    <h2 class="text-2xl font-bold text-gray-900">특허 상세정보</h2>
                    <p class="text-sm text-gray-600">Patent No: ${patentNumber}</p>
                </div>
                
                <div class="px-6 py-4 space-y-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 class="text-lg font-semibold text-gray-900 mb-3">기본 정보</h3>
                            <div class="space-y-3">
                                <div>
                                    <dt class="text-sm font-medium text-gray-500">발명명칭</dt>
                                    <dd class="text-sm text-gray-900">${title}</dd>
                                </div>
                                <div>
                                    <dt class="text-sm font-medium text-gray-500">기술분야</dt>
                                    <dd class="text-sm text-gray-900">${technologyField}</dd>
                                </div>
                                <div>
                                    <dt class="text-sm font-medium text-gray-500">등록일</dt>
                                    <dd class="text-sm text-gray-900">${registrationDate}</dd>
                                </div>
                                <div>
                                    <dt class="text-sm font-medium text-gray-500">출원일</dt>
                                    <dd class="text-sm text-gray-900">${applicationDate}</dd>
                                </div>
                                <div>
                                    <dt class="text-sm font-medium text-gray-500">상태</dt>
                                    <dd>${statusBadge}</dd>
                                </div>
                            </div>
                        </div>
                        
                        <div>
                            <h3 class="text-lg font-semibold text-gray-900 mb-3">발명자 정보</h3>
                            <div class="space-y-3">
                                <div>
                                    <dt class="text-sm font-medium text-gray-500">발명자</dt>
                                    <dd class="text-sm text-gray-900">${inventors}</dd>
                                </div>
                                <div>
                                    <dt class="text-sm font-medium text-gray-500">출원인/권리자</dt>
                                    <dd class="text-sm text-gray-900">${assignee}</dd>
                                </div>
                                <div>
                                    <dt class="text-sm font-medium text-gray-500">중요도</dt>
                                    <dd class="text-sm text-gray-900">
                                        <div class="flex items-center">
                                            <span class="mr-2">${priorityDisplay}</span>
                                            <div class="w-20 bg-gray-200 rounded-full h-2">
                                                <div class="bg-blue-600 h-2 rounded-full" style="width: ${priorityPercent}%"></div>
                                            </div>
                                        </div>
                                    </dd>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <h3 class="text-lg font-semibold text-gray-900 mb-3">기술 내용</h3>
                        <div class="space-y-4">
                            <div>
                                <dt class="text-sm font-medium text-gray-500">요약</dt>
                                <dd class="text-sm text-gray-900 mt-1">${abstract}</dd>
                            </div>
                             
                            ${patent.main_claims ? `
                            <div>
                                <dt class="text-sm font-medium text-gray-500">주요 청구항</dt>
                                <dd class="text-sm text-gray-900 mt-1 bg-gray-50 p-3 rounded">${patent.main_claims}</dd>
                            </div>
                            ` : ''}
                            
                            <div>
                                <dt class="text-sm font-medium text-gray-500">기술 키워드</dt>
                                <dd class="mt-1">
                                    ${patent.technical_keywords?.map(keyword => 
                                        `<span class="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-1 mb-1">${keyword}</span>`
                                    ).join('') || '정보 없음'}
                                </dd>
                            </div>
                            
                            ${patent.related_patents?.length ? `
                            <div>
                                <dt class="text-sm font-medium text-gray-500">관련 특허</dt>
                                <dd class="text-sm text-gray-900 mt-1">
                                    ${patent.related_patents.map(relatedId => 
                                        `<span class="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded mr-1 mb-1 cursor-pointer" onclick="patentManager.viewPatentByNumber('${relatedId}')">${relatedId}</span>`
                                    ).join('')}
                                </dd>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
                
                <div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                    <button onclick="patentManager.closeModal()" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">
                        닫기
                    </button>
                    <button onclick="patentManager.editPatent('${patent.id}')" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors">
                        편집
                    </button>
                </div>
            </div>
        `;
        
        this.showModal(modalContent);
    }
    
    /**
     * 특허 편집 (미구현)
     */
    editPatent(patentId) {
        console.log('ℹ️ 특허 편집 기능은 향후 구현 예정입니다.');
    }
    
    /**
     * 관련 특허 표시
     */
    showRelatedPatents(patentId) {
        const patent = this.patents.find(p => p.id === patentId);
        if (!patent || !patent.related_patents?.length) {
            console.log('ℹ️ 관련 특허 정보가 없습니다.');
            return;
        }
        
        const relatedPatents = patent.related_patents.map(patentNumber => {
            return this.patents.find(p => p.patent_number === patentNumber);
        }).filter(p => p);
        
        const modalContent = `
            <div class="max-w-4xl mx-auto bg-white rounded-lg shadow-xl">
                <div class="px-6 py-4 border-b border-gray-200">
                    <h2 class="text-2xl font-bold text-gray-900">관련 특허</h2>
                    <p class="text-sm text-gray-600">${patent.title}와 관련된 특허들</p>
                </div>
                
                <div class="px-6 py-4">
                    <div class="space-y-4">
                        ${relatedPatents.map(rp => `
                            <div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer" onclick="patentManager.viewDetail('${rp.id}')">
                                <div class="flex justify-between items-start">
                                    <div class="flex-1">
                                        <h4 class="font-medium text-gray-900">${rp.title}</h4>
                                        <p class="text-sm text-gray-600 mt-1">${rp.patent_number}</p>
                                        <p class="text-sm text-gray-500 mt-1">${(rp.abstract || '').substring(0, 100)}...</p>
                                    </div>
                                    <span class="status-badge ${this.getStatusClass(rp.status)} ml-4">
                                        ${this.getStatusText(rp.status)}
                                    </span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="px-6 py-4 border-t border-gray-200 flex justify-end">
                    <button onclick="patentManager.closeModal()" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">
                        닫기
                    </button>
                </div>
            </div>
        `;
        
        this.showModal(modalContent);
    }
    
    /**
     * 특허 번호로 특허 찾기
     */
    viewPatentByNumber(patentNumber) {
        const patent = this.patents.find(p => p.patent_number === patentNumber);
        if (patent) {
            this.closeModal();
            setTimeout(() => this.viewDetail(patent.id), 100);
        }
    }
    
    /**
     * 유틸리티 메소드들
     */
    
    formatDate(value) {
        if (value instanceof Date) {
            return value.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        }

        const normalized = this.normalizeDate(value);
        if (!normalized) return '정보 없음';

        return normalized.date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }
    
    getStatusClass(status) {
        switch (status) {
            case 'active': return 'status-active';
            case 'expired': return 'status-expired';
            case 'pending': return 'status-pending';
            default: return 'status-pending';
        }
    }
    
    getStatusText(status) {
        switch (status) {
            case 'active': return '활성';
            case 'expired': return '만료';
            case 'pending': return '심사중';
            case 'withdrawn': return '취하';
            default: return '알 수 없음';
        }
    }
    
    getCategoryBadgeClass(category) {
        switch (category) {
            case 'gas':
            case 'purification':
            case 'gas-treatment':
                return 'bg-red-100 text-red-800'; // 가스캐리 - 빨간색
            case 'temperature':
            case 'sensor':
            case 'monitoring':
                return 'bg-gray-100 text-gray-800'; // 온도게이 - 회색
            case 'plasma':
            case 'special-gas':
                return 'bg-purple-100 text-purple-800'; // 특고가스 - 보라색
            case 'scrubber': 
                return 'bg-blue-100 text-blue-800';
            case 'chiller': 
                return 'bg-green-100 text-green-800';
            default: 
                return 'bg-gray-100 text-gray-800';
        }
    }
    
    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }
    
    updateResultCount() {
        const total = this.filteredPatents.length;
        const start = total > 0 ? (this.currentPage - 1) * this.itemsPerPage + 1 : 0;
        const end = Math.min(this.currentPage * this.itemsPerPage, total);
        
        this.updateElement('total-count', total);
        this.updateElement('start-count', start);
        this.updateElement('end-count', end);
    }
    
    updatePaginationUI() {
        // 페이지네이션 UI 업데이트 (간단 구현)
        console.log(`현재 페이지: ${this.currentPage}/${this.totalPages}`);
    }
    
    updateSortIndicators() {
        // 정렬 표시기 업데이트
        document.querySelectorAll('th[data-sort]').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
            if (th.getAttribute('data-sort') === this.sorting.field) {
                th.classList.add(`sort-${this.sorting.order}`);
            }
        });
    }
    
    showModal(content) {
        // 모달 배경
        const modalBackdrop = document.createElement('div');
        modalBackdrop.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
        modalBackdrop.id = 'patent-modal';
        
        modalBackdrop.innerHTML = content;
        
        // 배경 클릭시 모달 닫기
        modalBackdrop.addEventListener('click', (e) => {
            if (e.target === modalBackdrop) {
                this.closeModal();
            }
        });
        
        document.body.appendChild(modalBackdrop);
        document.body.style.overflow = 'hidden';
    }
    
    closeModal() {
        const modal = document.getElementById('patent-modal');
        if (modal) {
            document.body.removeChild(modal);
            document.body.style.overflow = '';
        }
    }
    
    debounce(func, wait) {
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
}

// 전역 인스턴스 생성
let patentManager;

// DOM 로드 완료 후 초기화
document.addEventListener('DOMContentLoaded', () => {
    patentManager = new PatentManager();
    
    // 전역 함수로 노출
    window.patentManager = patentManager;
});
