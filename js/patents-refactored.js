/**
 * 🚀 통합 특허 데이터 매니저 (Refactored v3.6)
 * 로컬 JSON + Cloudflare D1 통합 지원 + 레거시 디자인 완전 복구
 * 
 * 특징:
 * - 75개 특허 데이터 완벽 지원
 * - 카테고리별 분류 (scrubber, chiller, plasma, temperature, gas-treatment)
 * - 상태별 필터링 (등록, 포기, 출원, 거절)
 * - PDF 원문 연동
 * - 고급 검색 및 정렬
 * - Tailwind CSS 기반 아름다운 카드 UI
 * - 연도별 그룹핑 및 애니메이션
 */

class PatentManager {
    constructor() {
        this.patents = [];
        this.filteredPatents = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.totalPages = 0;
        this.dataSource = 'local'; // 'local' | 'd1'
        this.searchIndex = null;
        this.stats = {};
        this.searchSuggestionIndex = -1;
        this.activeSuggestions = [];

        // DOM 요소
        this.dom = {
            listContainer: document.getElementById('patents-list-container'),
            loading: document.getElementById('patents-loading'),
            emptyState: document.getElementById('patents-empty-state'),
            yearGroups: document.getElementById('patent-year-groups'),
            dataSourceIndicator: document.getElementById('data-source-indicator'),
            searchInput: document.getElementById('search-input'),
            searchButton: document.getElementById('search-button'),
            resetButton: document.getElementById('reset-button'),
            categoryFilter: document.getElementById('category-filter'),
            statusFilter: document.getElementById('status-filter'),
            prevPage: document.getElementById('prev-page'),
            nextPage: document.getElementById('next-page'),
            pageSize: document.getElementById('page-size'),
            totalCount: document.getElementById('total-count'),
            startCount: document.getElementById('start-count'),
            endCount: document.getElementById('end-count'),
            totalPatents: document.getElementById('total-patents'),
            techCategories: document.getElementById('tech-categories'),
            registrationRange: document.getElementById('registration-range'),
            activePatents: document.getElementById('active-patents'),
            avgPriorityScore: document.getElementById('avg-priority-score')
        };

        // 필터 및 정렬 상태
        this.filters = {
            search: '',
            category: '',
            status: ''
        };

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
            this.showLoading(true);
            await this.loadPatents();
            this.buildSearchIndex();
            this.calculateStats();
            this.updateDashboardStats();
            this.bindEvents();
            this.loadStateFromURL();
            this.applyFilters();
            this.renderYearGroups();
            this.showLoading(false);
            console.log('✅ 특허 매니저 초기화 완료:', this.patents.length, '개');
            this.notifyDataReady();
        } catch (error) {
            console.error('❌ 초기화 실패:', error);
            this.showError('데이터를 불러올 수 없습니다.');
            this.showLoading(false);
        }
    }

    /**
     * 특허 데이터 로딩 (D1 우선, JSON 폴백)
     */
    async loadPatents() {
        console.log('🔄 특허 데이터 로딩 시작...');
        
        try {
            // 🚀 1️⃣ 로컬 JSON 우선 (빠른 로딩)
            console.log('📡 로컬 JSON 호출 중: /db/patents_data.json');
            const jsonResponse = await fetch('/db/patents_data.json');
            
            if (jsonResponse.ok) {
                const data = await jsonResponse.json();
                this.patents = this.normalizePatents(data);
                this.dataSource = 'local';
                console.log('✅ 로컬 JSON 로드 완료:', this.patents.length, '개');
                this.updateDataSourceIndicator('local', this.patents.length);
                
                // 백그라운드에서 D1 동기화 시도
                this.syncWithD1InBackground();
                return;
            }
            
        } catch (jsonError) {
            console.warn('⚠️ 로컬 JSON 실패, D1 시도:', jsonError);
        }
        
        try {
            // 2️⃣ D1 API 폴백
            console.log('📡 D1 API 호출 중: /api/patents?limit=1000');
            const d1Response = await fetch('/api/patents?limit=1000');
            
            if (!d1Response.ok) {
                throw new Error(`D1 API 실패: ${d1Response.status}`);
            }
            
            const data = await d1Response.json();
            this.patents = this.normalizePatents(data.data || data);
            this.dataSource = 'd1';
            console.log('✅ D1 로드 완료:', this.patents.length, '개');
            this.updateDataSourceIndicator('d1', this.patents.length);
            
        } catch (d1Error) {
            console.error('❌ 모든 데이터 소스 실패:', d1Error);
            throw new Error('데이터를 불러올 수 없습니다');
        }
    }
    
    /**
     * 백그라운드 D1 동기화 (선택적)
     */
    async syncWithD1InBackground() {
        try {
            console.log('🔄 백그라운드 D1 동기화 시도...');
            const response = await fetch('/api/patents?limit=1000');
            if (response.ok) {
                const data = await response.json();
                console.log('✅ D1 동기화 완료:', (data.data || data).length, '개');
            }
        } catch (error) {
            console.log('⚠️ D1 동기화 실패 (무시):', error.message);
        }
    }

    /**
     * 데이터 소스 표시 업데이트
     */
    updateDataSourceIndicator(source, count) {
        const indicator = document.getElementById('data-source-indicator');
        if (indicator) {
            const sourceLabels = {
                'd1': '☁️ Cloudflare D1',
                'local': '💾 로컬 JSON'
            };
            indicator.textContent = `${sourceLabels[source]} (${count}개)`;
            indicator.className = source === 'd1' ? 'text-green-600 font-semibold' : 'text-blue-600';
        }
    }

    /**
     * 특허 데이터 정규화
     */
    normalizePatents(rawData) {
        return (Array.isArray(rawData) ? rawData : []).map(patent => {
            // 날짜 파싱
            const registrationDate = this.parseDate(patent.registration_date);
            const applicationDate = this.parseDate(patent.application_date);
            
            // 발명자 필터링 (주소 정보 제거)
            const inventors = this.cleanInventors(patent.inventors);

            return {
                ...patent,
                // 정규화된 필드
                id: patent.id || `PATENT-${Date.now()}-${Math.random()}`,
                patent_number: patent.patent_number || '',
                title: patent.title || '제목 없음',
                abstract: patent.abstract || '',
                category: patent.category || 'other',
                technology_field: patent.technology_field || '',
                registration_date: patent.registration_date || null,
                application_date: patent.application_date || null,
                status: patent.status || 'unknown',
                assignee: patent.assignee || 'GST',
                priority_score: this.normalizePriorityScore(patent.priority_score),
                page_count: patent.page_count || 0,
                source_path: patent.source_path || '',
                
                // 배열 필드
                inventors: inventors,
                technical_keywords: Array.isArray(patent.technical_keywords) ? patent.technical_keywords : [],
                
                // 계산된 필드
                __registrationDate: registrationDate,
                __applicationDate: applicationDate,
                __year: registrationDate ? registrationDate.getFullYear() : null,
                __hasPDF: Boolean(patent.source_path),
                __categoryLabel: this.getCategoryLabel(patent.category),
                __statusLabel: this.getStatusLabel(patent.status),
                __statusColor: this.getStatusColor(patent.status)
            };
        });
    }

    /**
     * 발명자 목록에서 주소 정보 제거
     * 한글 이름만 추출 (2-10자)
     */
    cleanInventors(inventors) {
        if (!Array.isArray(inventors)) {
            if (typeof inventors === 'string' && inventors.trim() && inventors !== '정보 없음') {
                return [inventors.trim()];
            }
            return [];
        }
        
        // 발명자명만 추출 (주소 제거)
        const cleaned = inventors
            .map(inv => {
                if (typeof inv !== 'string') return null;
                const trimmed = inv.trim();
                
                // "정보 없음" 제외
                if (trimmed === '정보 없음' || !trimmed) return null;
                
                // 한글 이름만 추출 (2-10자)
                // 정규식: 한글 문자 2-10자
                const nameMatch = trimmed.match(/^([\u AC00-\uD7AF\s]{2,10})/);
                if (nameMatch) {
                    return nameMatch[1].trim();
                }
                
                // 영문/숫자 포함한 이름도 허용 (주소 아닌 경우)
                if (/^\w{2,20}$/.test(trimmed) && !trimmed.match(/\d+[가-힣]|[가-힣]\d+/)) {
                    return trimmed;
                }
                
                return null;
            })
            .filter(name => name && name.length >= 2);
        
        // 중복 제거
        return [...new Set(cleaned)];
    }

    /**
     * 우선순위 점수 정규화 (1-10)
     */
    normalizePriorityScore(score) {
        if (typeof score === 'number') {
            return Math.max(1, Math.min(10, Math.round(score)));
        }
        if (typeof score === 'string') {
            const num = parseInt(score, 10);
            if (!isNaN(num)) {
                return Math.max(1, Math.min(10, num));
            }
        }
        return 5; // 기본값
    }

    /**
     * 날짜 파싱
     */
    parseDate(dateStr) {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? null : date;
    }

    /**
     * 카테고리 라벨
     */
    getCategoryLabel(category) {
        const labels = {
            'scrubber': '🌀 스크러버',
            'chiller': '❄️ 칠러',
            'plasma': '⚡ 플라즈마',
            'temperature': '🌡️ 온도제어',
            'gas-treatment': '💨 가스처리',
            'other': '📋 기타'
        };
        return labels[category] || '📋 기타';
    }

    /**
     * 상태 라벨
     */
    getStatusLabel(status) {
        const labels = {
            '등록': '등록',
            '포기': '포기',
            '출원': '출원',
            '거절': '거절',
            '취소': '취소',
            'unknown': '미상'
        };
        return labels[status] || status;
    }

    /**
     * 상태 색상
     */
    getStatusColor(status) {
        const colors = {
            '등록': 'success',
            '포기': 'secondary',
            '출원': 'primary',
            '거절': 'danger',
            '취소': 'warning',
            'unknown': 'light'
        };
        return colors[status] || 'light';
    }

    /**
     * 검색 인덱스 구축
     */
    buildSearchIndex() {
        this.searchIndex = this.patents.map(patent => ({
            id: patent.id,
            searchText: [
                patent.title,
                patent.patent_number,
                patent.abstract,
                patent.technology_field,
                patent.inventors.join(' '),
                patent.technical_keywords.join(' ')
            ].filter(Boolean).join(' ').toLowerCase()
        }));
    }

    /**
     * 통계 계산
     */
    calculateStats() {
        const categories = {};
        const statuses = {};
        const years = {};
        let activeCount = 0;
        let totalPriority = 0;
        let minYear = Infinity;
        let maxYear = -Infinity;

        this.patents.forEach(patent => {
            // 카테고리 집계
            const cat = patent.category || 'other';
            categories[cat] = (categories[cat] || 0) + 1;

            // 상태 집계
            const status = patent.status || 'unknown';
            statuses[status] = (statuses[status] || 0) + 1;
            if (status === '등록') activeCount++;

            // 연도 집계
            if (patent.__year) {
                years[patent.__year] = (years[patent.__year] || 0) + 1;
                if (patent.__year < minYear) minYear = patent.__year;
                if (patent.__year > maxYear) maxYear = patent.__year;
            }

            // 우선순위 점수
            totalPriority += (patent.priority_score || 0);
        });

        this.stats = {
            total: this.patents.length,
            byCategory: categories,
            byStatus: statuses,
            byYear: years,
            activeCount: activeCount,
            avgPriority: this.patents.length > 0 ? (totalPriority / this.patents.length).toFixed(1) : 0,
            yearRange: minYear !== Infinity && maxYear !== -Infinity ? `${minYear}~${maxYear}` : '—',
            categoryCount: Object.keys(categories).length
        };

        console.log('📊 통계 계산 완료:', this.stats);
    }

    /**
     * 대시보드 통계 업데이트
     */
    updateDashboardStats() {
        if (this.dom.totalPatents) {
            this.dom.totalPatents.textContent = this.stats.total;
        }
        if (this.dom.techCategories) {
            this.dom.techCategories.textContent = this.stats.categoryCount;
        }
        if (this.dom.registrationRange) {
            this.dom.registrationRange.textContent = this.stats.yearRange;
        }
        if (this.dom.activePatents) {
            this.dom.activePatents.textContent = this.stats.activeCount;
        }
        if (this.dom.avgPriorityScore) {
            this.dom.avgPriorityScore.textContent = this.stats.avgPriority;
        }
    }

    /**
     * 필터 적용
     */
    applyFilters() {
        let results = [...this.patents];

        // 검색
        if (this.filters.search) {
            const query = this.filters.search.toLowerCase();
            results = results.filter(patent => {
                const searchText = [
                    patent.title,
                    patent.patent_number,
                    patent.abstract,
                    patent.technology_field,
                    patent.inventors.join(' '),
                    patent.technical_keywords.join(' ')
                ].filter(Boolean).join(' ').toLowerCase();
                return searchText.includes(query);
            });
        }

        // 카테고리
        if (this.filters.category) {
            results = results.filter(p => p.category === this.filters.category);
        }

        // 상태
        if (this.filters.status) {
            results = results.filter(p => p.status === this.filters.status);
        }

        // 정렬
        results.sort((a, b) => {
            let aVal = a[this.sorting.field];
            let bVal = b[this.sorting.field];

            // 날짜 필드 처리
            if (this.sorting.field.includes('date')) {
                aVal = a.__registrationDate || new Date(0);
                bVal = b.__registrationDate || new Date(0);
            }

            // 숫자/날짜 비교
            if (typeof aVal === 'number' || aVal instanceof Date) {
                return this.sorting.order === 'asc' ? aVal - bVal : bVal - aVal;
            }

            // 문자열 비교
            const strA = String(aVal || '');
            const strB = String(bVal || '');
            return this.sorting.order === 'asc' ? 
                strA.localeCompare(strB, 'ko') : 
                strB.localeCompare(strA, 'ko');
        });

        this.filteredPatents = results;
        this.currentPage = 1;
        this.calculatePagination();
        this.renderPatentCards();
        this.renderYearGroups();
        this.updatePaginationUI();
        this.saveStateToURL();
    }

    /**
     * 페이지네이션 계산
     */
    calculatePagination() {
        this.totalPages = Math.ceil(this.filteredPatents.length / this.itemsPerPage);
        if (this.currentPage > this.totalPages) {
            this.currentPage = Math.max(1, this.totalPages);
        }
    }

    /**
     * 특허 카드 렌더링 (Tailwind UI)
     */
    renderPatentCards() {
        if (!this.dom.listContainer) return;

        if (this.filteredPatents.length === 0) {
            this.showEmpty();
            this.updateResultCount();
            return;
        }

        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const pagePatents = this.filteredPatents.slice(start, end);

        const cardsHTML = pagePatents.map((patent, index) => 
            this.createPatentCard(patent, index)
        ).join('');

        this.dom.listContainer.innerHTML = cardsHTML;
        this.dom.listContainer.classList.remove('hidden');
        if (this.dom.emptyState) {
            this.dom.emptyState.classList.add('hidden');
        }
        
        this.updateResultCount();
    }

    /**
     * 개별 특허 카드 생성
     */
    createPatentCard(patent, index) {
        const categoryClass = this.getCategoryClass(patent.category);
        const badgeClass = this.getCategoryBadgeClass(patent.category);
        const statusClass = this.getStatusBadgeClass(patent.status);
        const statusText = patent.status || '미상';
        
        const registrationDate = patent.__registrationDate;
        const formattedDate = registrationDate ? 
            registrationDate.toLocaleDateString('ko-KR', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            }) : '정보 없음';
        
        const relativeTime = this.getTimeAgo(registrationDate);
        
        const inventors = patent.inventors && patent.inventors.length > 0 ?
            this.escapeHtml(patent.inventors.join(', ')) : '정보 없음';
        
        const technologyField = this.escapeHtml(patent.technology_field || '기술분야 미정');
        const patentNumber = this.escapeHtml(patent.patent_number || '미상');
        const title = this.escapeHtml(patent.title || '제목 정보 없음');
        const abstract = this.escapeHtml(patent.abstract || '요약 정보가 등록되지 않았습니다.');
        const categoryLabel = this.getCategoryLabel(patent.category);
        
        const animationDelay = `${Math.min(index * 0.05, 0.4)}s`;

        // PDF 버튼 생성
        let pdfButton = '';
        const pdfPath = this.getPdfPath(patent);
        if (pdfPath) {
            pdfButton = `
                <a href="${this.escapeHtml(pdfPath)}" 
                   class="text-sm px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors inline-flex items-center" 
                   target="_blank" 
                   rel="noopener"
                   aria-label="${title} 명세서 새 창에서 열기">
                    <i class="fas fa-file-pdf mr-2" aria-hidden="true"></i>명세서 보기
                </a>
            `;
        }

        return `
            <article class="patent-item ${categoryClass} border-l-4 bg-white p-4 rounded-lg shadow-sm hover:shadow-lg transition-all duration-300" 
                     role="listitem" 
                     data-patent-id="${this.escapeHtml(patent.id)}" 
                     style="animation-delay: ${animationDelay};">
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div class="flex-1">
                        <div class="flex flex-wrap items-center gap-2 text-sm mb-2">
                            <span class="patent-category ${badgeClass}">${categoryLabel}</span>
                            <span class="status-badge ${statusClass}">${statusText}</span>
                            <span class="patent-number">${patentNumber}</span>
                        </div>
                        <h4 class="mt-2 text-lg font-semibold text-gst-dark hover:text-gst-blue transition-colors cursor-pointer" 
                            onclick="window.patentManager?.viewPatentDetail('${this.escapeHtml(patent.id)}')">
                            ${title}
                        </h4>
                        <p class="text-sm text-gst-gray mt-2 line-clamp-2">${abstract}</p>
                        <div class="mt-3 flex flex-wrap gap-4 text-xs text-gst-gray">
                            <span><i class="fas fa-calendar-alt mr-1" aria-hidden="true"></i>${formattedDate}</span>
                            <span><i class="fas fa-microchip mr-1" aria-hidden="true"></i>${technologyField}</span>
                            <span><i class="fas fa-user mr-1" aria-hidden="true"></i>${inventors}</span>
                        </div>
                    </div>
                    <div class="flex flex-col items-end gap-2 min-w-[140px]">
                        <button type="button"
                                class="text-sm px-4 py-2 bg-gst-blue text-white rounded-lg hover:bg-gst-dark transition-colors shadow-sm inline-flex items-center"
                                onclick="window.patentManager?.viewPatentDetail('${this.escapeHtml(patent.id)}')"
                                aria-label="${title} 상세보기">
                            <i class="fas fa-eye mr-2" aria-hidden="true"></i>상세보기
                        </button>
                        ${pdfButton}
                        <span class="time-indicator text-xs text-gst-gray mt-2" aria-label="등록 후 경과 시간">
                            ${relativeTime}
                        </span>
                    </div>
                </div>
            </article>
        `;
    }

    /**
     * 카테고리 CSS 클래스
     */
    getCategoryClass(category) {
        const classes = {
            'scrubber': 'border-red-500',
            'chiller': 'border-blue-500',
            'plasma': 'border-purple-500',
            'temperature': 'border-orange-500',
            'gas-treatment': 'border-green-500'
        };
        return classes[category] || 'border-gray-400';
    }

    /**
     * 카테고리 배지 클래스
     */
    getCategoryBadgeClass(category) {
        const classes = {
            'scrubber': 'bg-red-50 text-red-700',
            'chiller': 'bg-blue-50 text-blue-700',
            'plasma': 'bg-purple-50 text-purple-700',
            'temperature': 'bg-orange-50 text-orange-700',
            'gas-treatment': 'bg-green-50 text-green-700'
        };
        return classes[category] || 'bg-gray-50 text-gray-700';
    }

    /**
     * 상태 배지 클래스
     */
    getStatusBadgeClass(status) {
        const classes = {
            '등록': 'bg-green-100 text-green-800',
            '포기': 'bg-gray-100 text-gray-800',
            '출원': 'bg-blue-100 text-blue-800',
            '거절': 'bg-red-100 text-red-800',
            '취소': 'bg-yellow-100 text-yellow-800'
        };
        return classes[status] || 'bg-gray-100 text-gray-800';
    }

    /**
     * 상대 시간 표시
     */
    getTimeAgo(date) {
        if (!date || !(date instanceof Date)) return '';

        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffYears = Math.floor(diffDays / 365);
        const diffMonths = Math.floor(diffDays / 30);

        if (diffYears > 0) return `${diffYears}년 전`;
        if (diffMonths > 0) return `${diffMonths}개월 전`;
        if (diffDays > 0) return `${diffDays}일 전`;
        return '오늘';
    }

    /**
     * 연도별 그룹 렌더링
     */
    renderYearGroups() {
        if (!this.dom.yearGroups) return;

        if (this.filteredPatents.length === 0) {
            this.dom.yearGroups.innerHTML = `
                <div class="px-6 py-6 text-sm text-gst-gray text-center">
                    조건에 맞는 연도별 데이터가 없습니다.
                </div>
            `;
            return;
        }

        // 연도별 그룹핑
        const yearGroups = {};
        this.filteredPatents.forEach(patent => {
            const year = patent.__year;
            if (year) {
                if (!yearGroups[year]) yearGroups[year] = [];
                yearGroups[year].push(patent);
            }
        });

        // 최근 5년만 표시
        const sortedYears = Object.keys(yearGroups)
            .sort((a, b) => Number(b) - Number(a))
            .slice(0, 5);

        const groupsHTML = sortedYears.map(year => {
            const patents = yearGroups[year]
                .sort((a, b) => {
                    const dateA = a.__registrationDate || new Date(0);
                    const dateB = b.__registrationDate || new Date(0);
                    return dateB - dateA;
                })
                .slice(0, 3); // 각 연도별 최대 3개

            const itemsHTML = patents.map(patent => `
                <li class="flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors cursor-pointer"
                    onclick="window.patentManager?.viewPatentDetail('${this.escapeHtml(patent.id)}')">
                    <span class="text-sm text-gst-dark font-medium truncate mr-2">
                        ${this.escapeHtml(patent.title || '제목 정보 없음')}
                    </span>
                    <span class="text-xs text-gst-gray whitespace-nowrap">
                        ${this.escapeHtml(patent.patent_number || '')}
                    </span>
                </li>
            `).join('');

            return `
                <section class="border-t border-gray-200">
                    <header class="bg-gst-dark text-white px-6 py-3 flex items-center justify-between">
                        <span class="font-semibold">${year}년</span>
                        <span class="text-sm">${yearGroups[year].length}건</span>
                    </header>
                    <div class="px-6 py-4">
                        <ul>${itemsHTML}</ul>
                    </div>
                </section>
            `;
        }).join('');

        this.dom.yearGroups.innerHTML = groupsHTML;
    }

    /**
     * HTML 이스케이프
     */
    escapeHtml(text) {
        if (text === undefined || text === null) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    /**
     * PDF 경로 추출 및 변환
     */
    getPdfPath(patent) {
        const sourcePath = patent.source_path || patent.file_path || '';
        if (!sourcePath) return null;
        
        // 절대 경로에서 파일명만 추출
        // /Users/sungho-kang/GST_patent/data/pdf/파일명.pdf → /data/pdf/파일명.pdf
        const match = sourcePath.match(/\/data\/pdf\/(.+\.pdf)$/i);
        if (match) {
            return `/data/pdf/${match[1]}`;
        }
        
        // 이미 상대 경로면 그대로 반환
        if (sourcePath.startsWith('/')) {
            return sourcePath;
        }
        
        return sourcePath;
    }

    /**
     * 특허 상세보기 (모달 방식)
     */
    viewPatentDetail(patentId) {
        const patent = this.patents.find(p => p.id === patentId);
        if (!patent) {
            alert('특허 정보를 찾을 수 없습니다.');
            return;
        }

        // 기존 모달 제거
        const existingModal = document.getElementById('patent-detail-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // 모달 생성
        const pdfPath = this.getPdfPath(patent);
        const pdfButtonHTML = pdfPath ? `
            <a href="${pdfPath}" 
               target="_blank" 
               rel="noopener" 
               class="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm">
                <i class="fas fa-file-pdf mr-2"></i>
                PDF 명세서 (새 창)
            </a>
        ` : '<span class="text-sm text-gst-gray">PDF 파일 없음</span>';

        const modalHTML = `
            <div id="patent-detail-modal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    <!-- 헤더 -->
                    <div class="sticky top-0 bg-gradient-to-r from-gst-blue to-gst-light-blue text-white p-6 flex justify-between items-center border-b">
                        <div>
                            <h2 class="text-2xl font-bold mb-1">${this.escapeHtml(patent.title || '제목 없음')}</h2>
                            <p class="text-sm opacity-90">특허번호: ${this.escapeHtml(patent.patent_number || '미상')}</p>
                        </div>
                        <button onclick="document.getElementById('patent-detail-modal').remove()" 
                                class="text-white hover:text-gray-200 text-2xl leading-none"
                                aria-label="모달 닫기">&times;</button>
                    </div>

                    <!-- 본문 -->
                    <div class="p-6">
                        <!-- 기본 정보 -->
                        <div class="mb-6">
                            <h3 class="text-lg font-semibold text-gst-dark mb-3 pb-2 border-b-2 border-gst-blue">기본 정보</h3>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <p class="text-sm text-gst-gray mb-1">특허번호</p>
                                    <p class="font-mono text-gst-dark">${this.escapeHtml(patent.patent_number || '미상')}</p>
                                </div>
                                <div>
                                    <p class="text-sm text-gst-gray mb-1">상태</p>
                                    <span class="inline-block px-3 py-1 rounded-full text-sm font-semibold ${this.getStatusBadgeClass(patent.status)}">${patent.status || '미상'}</span>
                                </div>
                                <div>
                                    <p class="text-sm text-gst-gray mb-1">기술분야</p>
                                    <p class="text-gst-dark">${this.escapeHtml(patent.technology_field || '정보 없음')}</p>
                                </div>
                                <div>
                                    <p class="text-sm text-gst-gray mb-1">카테고리</p>
                                    <p class="text-gst-dark">${this.getCategoryLabel(patent.category)}</p>
                                </div>
                                <div>
                                    <p class="text-sm text-gst-gray mb-1">등록일</p>
                                    <p class="text-gst-dark">${patent.registration_date ? new Date(patent.registration_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) : '정보 없음'}</p>
                                </div>
                                <div>
                                    <p class="text-sm text-gst-gray mb-1">출원일</p>
                                    <p class="text-gst-dark">${patent.application_date ? new Date(patent.application_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) : '정보 없음'}</p>
                                </div>
                            </div>
                        </div>

                        <!-- 요약 -->
                        ${patent.abstract ? `
                            <div class="mb-6">
                                <h3 class="text-lg font-semibold text-gst-dark mb-3 pb-2 border-b-2 border-gst-blue">요약</h3>
                                <div class="bg-gray-50 p-4 rounded-lg max-h-40 overflow-y-auto">
                                    <p class="text-sm text-gst-gray whitespace-pre-line">${this.escapeHtml(patent.abstract)}</p>
                                </div>
                            </div>
                        ` : ''}

                        <!-- 발명자 -->
                        ${patent.inventors && patent.inventors.length > 0 ? `
                            <div class="mb-6">
                                <h3 class="text-lg font-semibold text-gst-dark mb-3 pb-2 border-b-2 border-gst-blue">발명자</h3>
                                <div class="flex flex-wrap gap-2">
                                    ${patent.inventors.map(inv => `
                                        <span class="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                                            ${this.escapeHtml(inv)}
                                        </span>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}

                        <!-- 기술 키워드 -->
                        ${patent.technical_keywords && patent.technical_keywords.length > 0 ? `
                            <div class="mb-6">
                                <h3 class="text-lg font-semibold text-gst-dark mb-3 pb-2 border-b-2 border-gst-blue">기술 키워드</h3>
                                <div class="flex flex-wrap gap-2">
                                    ${patent.technical_keywords.map(kw => `
                                        <span class="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                                            ${this.escapeHtml(kw)}
                                        </span>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}

                        <!-- 통계 -->
                        <div class="mb-6">
                            <h3 class="text-lg font-semibold text-gst-dark mb-3 pb-2 border-b-2 border-gst-blue">통계 정보</h3>
                            <div class="grid grid-cols-3 gap-4">
                                <div class="bg-blue-50 p-3 rounded-lg">
                                    <p class="text-xs text-gst-gray mb-1">우선순위 점수</p>
                                    <p class="text-xl font-bold text-blue-600">${patent.priority_score || 0}/10</p>
                                </div>
                                <div class="bg-green-50 p-3 rounded-lg">
                                    <p class="text-xs text-gst-gray mb-1">페이지 수</p>
                                    <p class="text-xl font-bold text-green-600">${patent.page_count || 0} 페이지</p>
                                </div>
                                <div class="bg-purple-50 p-3 rounded-lg">
                                    <p class="text-xs text-gst-gray mb-1">등록기간</p>
                                    <p class="text-sm font-bold text-purple-600">
                                        ${patent.application_date && patent.registration_date ? 
                                            Math.floor((new Date(patent.registration_date) - new Date(patent.application_date)) / (1000 * 60 * 60 * 24)) + '일' : 
                                            '정보 없음'
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 푸터 -->
                    <div class="sticky bottom-0 bg-gray-50 p-6 border-t flex justify-between items-center">
                        <div>
                            ${pdfButtonHTML}
                        </div>
                        <button onclick="document.getElementById('patent-detail-modal').remove()" 
                                class="px-4 py-2 bg-gst-gray text-white rounded-lg hover:bg-gst-dark transition-colors">
                            닫기
                        </button>
                    </div>
                </div>
            </div>
        `;

        // 모달 추가
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // 모달 외부 클릭 시 닫기
        const modal = document.getElementById('patent-detail-modal');
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        // ESC 키로 닫기
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    }

    /**
     * 페이지네이션 UI 업데이트
     */
    updatePaginationUI() {
        const start = this.filteredPatents.length > 0 ? 
            (this.currentPage - 1) * this.itemsPerPage + 1 : 0;
        const end = Math.min(start + this.itemsPerPage - 1, this.filteredPatents.length);

        if (this.dom.totalCount) {
            this.dom.totalCount.textContent = this.filteredPatents.length;
        }
        if (this.dom.startCount) {
            this.dom.startCount.textContent = start;
        }
        if (this.dom.endCount) {
            this.dom.endCount.textContent = end;
        }

        if (this.dom.prevPage) {
            this.dom.prevPage.disabled = this.currentPage <= 1;
            this.dom.prevPage.setAttribute('aria-disabled', this.currentPage <= 1 ? 'true' : 'false');
        }
        
        if (this.dom.nextPage) {
            this.dom.nextPage.disabled = this.currentPage >= this.totalPages;
            this.dom.nextPage.setAttribute('aria-disabled', this.currentPage >= this.totalPages ? 'true' : 'false');
        }

        if (this.dom.pageSize && String(this.itemsPerPage) !== this.dom.pageSize.value) {
            this.dom.pageSize.value = String(this.itemsPerPage);
        }
    }

    /**
     * 결과 카운트 업데이트
     */
    updateResultCount() {
        const total = this.filteredPatents.length;
        const start = total > 0 ? (this.currentPage - 1) * this.itemsPerPage + 1 : 0;
        const end = Math.min(this.currentPage * this.itemsPerPage, total);

        if (this.dom.totalCount) this.dom.totalCount.textContent = total;
        if (this.dom.startCount) this.dom.startCount.textContent = start;
        if (this.dom.endCount) this.dom.endCount.textContent = end;
    }

    /**
     * 이벤트 바인딩
     */
    bindEvents() {
        // 검색 버튼
        if (this.dom.searchButton) {
            this.dom.searchButton.addEventListener('click', () => {
                this.filters.search = this.dom.searchInput?.value.trim() || '';
                this.applyFilters();
            });
        }

        // 검색 입력 (Enter 키)
        if (this.dom.searchInput) {
            this.dom.searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.filters.search = e.target.value.trim();
                    this.applyFilters();
                }
            });

            // 실시간 검색 (선택사항)
            this.dom.searchInput.addEventListener('input', (e) => {
                if (e.target.value.trim().length === 0) {
                    this.filters.search = '';
                    this.applyFilters();
                }
            });
        }

        // 리셋 버튼
        if (this.dom.resetButton) {
            this.dom.resetButton.addEventListener('click', () => {
                this.resetFilters();
            });
        }

        // 카테고리 필터
        if (this.dom.categoryFilter) {
            this.dom.categoryFilter.addEventListener('change', (e) => {
                this.filters.category = e.target.value;
                this.applyFilters();
            });
        }

        // 상태 필터
        if (this.dom.statusFilter) {
            this.dom.statusFilter.addEventListener('change', (e) => {
                this.filters.status = e.target.value;
                this.applyFilters();
            });
        }

        // 이전 페이지
        if (this.dom.prevPage) {
            this.dom.prevPage.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.renderPatentCards();
                    this.updatePaginationUI();
                    this.saveStateToURL();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        }

        // 다음 페이지
        if (this.dom.nextPage) {
            this.dom.nextPage.addEventListener('click', () => {
                if (this.currentPage < this.totalPages) {
                    this.currentPage++;
                    this.renderPatentCards();
                    this.updatePaginationUI();
                    this.saveStateToURL();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        }

        // 페이지 크기 변경
        if (this.dom.pageSize) {
            this.dom.pageSize.addEventListener('change', (e) => {
                this.itemsPerPage = parseInt(e.target.value) || 10;
                this.currentPage = 1;
                this.calculatePagination();
                this.renderPatentCards();
                this.updatePaginationUI();
                this.saveStateToURL();
            });
        }
    }

    /**
     * 필터 초기화
     */
    resetFilters() {
        this.filters = {
            search: '',
            category: '',
            status: ''
        };

        if (this.dom.searchInput) this.dom.searchInput.value = '';
        if (this.dom.categoryFilter) this.dom.categoryFilter.value = '';
        if (this.dom.statusFilter) this.dom.statusFilter.value = '';

        this.currentPage = 1;
        this.applyFilters();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /**
     * URL 상태 저장
     */
    saveStateToURL() {
        const params = new URLSearchParams();
        if (this.filters.search) params.set('q', this.filters.search);
        if (this.filters.category) params.set('category', this.filters.category);
        if (this.filters.status) params.set('status', this.filters.status);
        if (this.currentPage > 1) params.set('page', this.currentPage);

        const newURL = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState({}, '', newURL);
    }

    /**
     * URL에서 상태 로드
     */
    loadStateFromURL() {
        const params = new URLSearchParams(window.location.search);
        
        const search = params.get('q');
        if (search) {
            this.filters.search = search;
            if (this.dom.searchInput) this.dom.searchInput.value = search;
        }

        const category = params.get('category');
        if (category) {
            this.filters.category = category;
            if (this.dom.categoryFilter) this.dom.categoryFilter.value = category;
        }

        const status = params.get('status');
        if (status) {
            this.filters.status = status;
            if (this.dom.statusFilter) this.dom.statusFilter.value = status;
        }

        const page = parseInt(params.get('page'));
        if (page > 0) {
            this.currentPage = page;
        }
    }

    /**
     * 로딩 표시
     */
    showLoading(show) {
        if (this.dom.loading) {
            this.dom.loading.classList.toggle('hidden', !show);
            this.dom.loading.setAttribute('aria-hidden', show ? 'false' : 'true');
        }
        if (this.dom.listContainer && show) {
            this.dom.listContainer.classList.add('hidden');
        }
        if (this.dom.emptyState && show) {
            this.dom.emptyState.classList.add('hidden');
        }
    }

    /**
     * 빈 상태 표시
     */
    showEmpty() {
        if (this.dom.listContainer) {
            this.dom.listContainer.classList.add('hidden');
        }
        if (this.dom.emptyState) {
            this.dom.emptyState.classList.remove('hidden');
        }
    }

    /**
     * 에러 표시
     */
    showError(message) {
        if (this.dom.listContainer) {
            this.dom.listContainer.innerHTML = `
                <div class="bg-red-50 border-l-4 border-red-500 text-red-900 px-4 py-3 rounded" role="alert">
                    <div class="flex">
                        <div class="flex-shrink-0">
                            <i class="fas fa-exclamation-triangle text-red-500" aria-hidden="true"></i>
                        </div>
                        <div class="ml-3">
                            <p class="text-sm font-medium">${message}</p>
                        </div>
                    </div>
                </div>
            `;
            this.dom.listContainer.classList.remove('hidden');
        }
    }

    /**
     * 데이터 준비 완료 이벤트
     */
    notifyDataReady() {
        // 레거시 이벤트 (main.js에서 사용)
        document.dispatchEvent(new CustomEvent('gst:patents-ready', {
            detail: {
                patents: this.patents,
                stats: this.stats,
                manager: this
            }
        }));
        
        // 새로운 이벤트
        window.dispatchEvent(new CustomEvent('patents-data-ready', {
            detail: {
                patents: this.patents,
                stats: this.stats,
                manager: this
            }
        }));
        console.log('📢 gst:patents-ready & patents-data-ready 이벤트 발생');
    }

    /**
     * 통계 조회
     */
    getStats() {
        return this.stats;
    }

    /**
     * 전체 특허 데이터 조회
     */
    getAllPatents() {
        return this.patents;
    }

    /**
     * 필터링된 특허 데이터 조회
     */
    getFilteredPatents() {
        return this.filteredPatents;
    }
}

// 전역 인스턴스
window.patentManager = null;

// DOM 로드 후 초기화
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 PatentManager 초기화 시작...');
    window.patentManager = new PatentManager();
});
