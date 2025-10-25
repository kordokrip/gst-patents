/**
 * 🚀 통합 특허 데이터 매니저 (Refactored v3.0)
 * 로컬 JSON + Cloudflare D1 통합 지원
 * 
 * 특징:
 * - 270개 특허 데이터 완벽 지원
 * - 카테고리별 분류 (scrubber, chiller, plasma 등)
 * - 상태별 필터링 (등록, 포기, 출원, 거절)
 * - PDF 원문 연동
 * - 고급 검색 및 정렬
 */

class PatentManager {
    constructor() {
        this.patents = [];
        this.filteredPatents = [];
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.totalPages = 0;
        this.dataSource = 'local'; // 'local' | 'd1'
        this.searchIndex = null;
        this.stats = {};

        // DOM 요소
        this.dom = {
            listContainer: document.getElementById('patents-list-container'),
            loading: document.getElementById('patents-loading'),
            emptyState: document.getElementById('patents-empty-state'),
            searchInput: document.getElementById('search-input'),
            searchButton: document.getElementById('search-button'),
            resetButton: document.getElementById('reset-button'),
            categoryFilter: document.getElementById('category-filter'),
            statusFilter: document.getElementById('status-filter'),
            sortSelect: document.getElementById('sort-select'),
            prevPage: document.getElementById('prev-page'),
            nextPage: document.getElementById('next-page'),
            pageSize: document.getElementById('page-size'),
            totalCount: document.getElementById('total-count'),
            startCount: document.getElementById('start-count'),
            endCount: document.getElementById('end-count')
        };

        // 필터 및 정렬 상태
        this.filters = {
            search: '',
            category: '',
            status: '',
            hasPDF: false
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
            this.bindEvents();
            this.loadStateFromURL();
            this.applyFilters();
            this.showLoading(false);
            console.log('✅ 특허 매니저 초기화 완료:', this.patents.length, '개');
        } catch (error) {
            console.error('❌ 초기화 실패:', error);
            this.showError('데이터를 불러올 수 없습니다.');
        }
    }

    /**
     * 특허 데이터 로딩 (JSON 우선, D1 폴백)
     */
    async loadPatents() {
        try {
            // 로컬 JSON 시도
            const response = await fetch('/db/patents_data.json');
            if (!response.ok) throw new Error('JSON 로드 실패');
            
            const data = await response.json();
            this.patents = this.normalizePatents(data);
            this.dataSource = 'local';
            console.log('📊 로컬 JSON 로드 완료:', this.patents.length, '개');
        } catch (error) {
            console.warn('⚠️ 로컬 JSON 실패, D1 시도:', error);
            
            try {
                // D1 API 폴백
                const response = await fetch('/api/patents?limit=1000');
                const data = await response.json();
                this.patents = this.normalizePatents(data.data || data);
                this.dataSource = 'd1';
                console.log('📊 D1 로드 완료:', this.patents.length, '개');
            } catch (d1Error) {
                console.error('❌ D1도 실패:', d1Error);
                throw new Error('모든 데이터 소스 실패');
            }
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
                priority_score: patent.priority_score || 0,
                page_count: patent.page_count || 0,
                source_path: patent.source_path || '',
                
                // 배열 필드
                inventors: Array.isArray(patent.inventors) ? patent.inventors : [],
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
        this.stats = {
            total: this.patents.length,
            byCategory: this.groupBy(this.patents, 'category'),
            byStatus: this.groupBy(this.patents, 'status'),
            byYear: this.groupBy(this.patents.filter(p => p.__year), '__year'),
            withPDF: this.patents.filter(p => p.__hasPDF).length,
            avgPriority: this.average(this.patents, 'priority_score')
        };
    }

    /**
     * 그룹핑 헬퍼
     */
    groupBy(array, key) {
        return array.reduce((acc, item) => {
            const value = item[key];
            acc[value] = (acc[value] || 0) + 1;
            return acc;
        }, {});
    }

    /**
     * 평균 계산
     */
    average(array, key) {
        if (!array.length) return 0;
        const sum = array.reduce((acc, item) => acc + (item[key] || 0), 0);
        return Math.round(sum / array.length * 10) / 10;
    }

    /**
     * 필터 적용
     */
    applyFilters() {
        let results = [...this.patents];

        // 검색
        if (this.filters.search) {
            const query = this.filters.search.toLowerCase();
            const matchedIds = this.searchIndex
                .filter(item => item.searchText.includes(query))
                .map(item => item.id);
            results = results.filter(p => matchedIds.includes(p.id));
        }

        // 카테고리
        if (this.filters.category) {
            results = results.filter(p => p.category === this.filters.category);
        }

        // 상태
        if (this.filters.status) {
            results = results.filter(p => p.status === this.filters.status);
        }

        // PDF 있는 것만
        if (this.filters.hasP) {
            results = results.filter(p => p.__hasPDF);
        }

        // 정렬
        results.sort((a, b) => {
            const aVal = a[this.sorting.field];
            const bVal = b[this.sorting.field];
            
            if (aVal === bVal) return 0;
            
            const comparison = aVal > bVal ? 1 : -1;
            return this.sorting.order === 'asc' ? comparison : -comparison;
        });

        this.filteredPatents = results;
        this.currentPage = 1;
        this.calculatePagination();
        this.renderTable();
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
     * 테이블 렌더링
     */
    renderTable() {
        if (!this.dom.listContainer) return;

        if (this.filteredPatents.length === 0) {
            this.showEmpty();
            return;
        }

        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const pagePatents = this.filteredPatents.slice(start, end);

        const html = `
            <div class="table-responsive">
                <table class="table table-hover table-striped align-middle">
                    <thead class="table-dark">
                        <tr>
                            <th style="width: 5%">#</th>
                            <th style="width: 12%">특허번호</th>
                            <th style="width: 35%">명칭</th>
                            <th style="width: 12%">카테고리</th>
                            <th style="width: 10%">상태</th>
                            <th style="width: 12%">등록일</th>
                            <th style="width: 8%">PDF</th>
                            <th style="width: 6%">상세</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${pagePatents.map((patent, idx) => this.renderPatentRow(patent, start + idx + 1)).join('')}
                    </tbody>
                </table>
            </div>
        `;

        this.dom.listContainer.innerHTML = html;
        this.dom.listContainer.style.display = 'block';
        if (this.dom.emptyState) this.dom.emptyState.style.display = 'none';
    }

    /**
     * 특허 행 렌더링
     */
    renderPatentRow(patent, index) {
        const dateStr = patent.registration_date ? 
            new Date(patent.registration_date).toLocaleDateString('ko-KR') : '-';

        return `
            <tr>
                <td class="text-center text-muted">${index}</td>
                <td>
                    <code class="small">${this.escapeHtml(patent.patent_number)}</code>
                </td>
                <td>
                    <div class="patent-title">
                        ${this.highlightSearch(patent.title)}
                    </div>
                    ${patent.inventors.length > 0 ? `
                        <small class="text-muted">
                            <i class="fas fa-user me-1"></i>
                            ${patent.inventors.slice(0, 2).join(', ')}
                            ${patent.inventors.length > 2 ? ` 외 ${patent.inventors.length - 2}명` : ''}
                        </small>
                    ` : ''}
                </td>
                <td>
                    <span class="badge bg-info">${patent.__categoryLabel}</span>
                    ${patent.technology_field ? `
                        <br><small class="text-muted">${this.escapeHtml(patent.technology_field)}</small>
                    ` : ''}
                </td>
                <td>
                    <span class="badge bg-${patent.__statusColor}">${patent.__statusLabel}</span>
                </td>
                <td class="text-muted small">${dateStr}</td>
                <td class="text-center">
                    ${patent.__hasPDF ? `
                        <i class="fas fa-file-pdf text-danger" title="PDF 있음"></i>
                    ` : `
                        <i class="fas fa-file-pdf text-muted" title="PDF 없음"></i>
                    `}
                </td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-primary" 
                            onclick="patentManager.showDetail('${patent.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    }

    /**
     * 검색어 하이라이트
     */
    highlightSearch(text) {
        if (!this.filters.search || !text) return this.escapeHtml(text);
        
        const query = this.escapeHtml(this.filters.search);
        const escaped = this.escapeHtml(text);
        const regex = new RegExp(`(${query})`, 'gi');
        
        return escaped.replace(regex, '<mark>$1</mark>');
    }

    /**
     * HTML 이스케이프
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    /**
     * 상세보기 모달
     */
    showDetail(patentId) {
        const patent = this.patents.find(p => p.id === patentId);
        if (!patent) return;

        const modal = new bootstrap.Modal(document.getElementById('patent-detail-modal') || this.createDetailModal());
        this.renderDetailContent(patent);
        modal.show();
    }

    /**
     * 상세 모달 생성
     */
    createDetailModal() {
        const modalHtml = `
            <div class="modal fade" id="patent-detail-modal" tabindex="-1">
                <div class="modal-dialog modal-xl modal-dialog-scrollable">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">특허 상세정보</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body" id="patent-detail-content"></div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">닫기</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        return document.getElementById('patent-detail-modal');
    }

    /**
     * 상세 내용 렌더링
     */
    renderDetailContent(patent) {
        const content = document.getElementById('patent-detail-content');
        if (!content) return;

        content.innerHTML = `
            <div class="row g-4">
                <div class="col-md-8">
                    <h4 class="border-bottom pb-2 mb-3">
                        ${this.escapeHtml(patent.title)}
                    </h4>
                    
                    <div class="mb-4">
                        <h6 class="text-muted mb-2">기본 정보</h6>
                        <table class="table table-sm">
                            <tr>
                                <th style="width: 150px">특허번호</th>
                                <td><code>${this.escapeHtml(patent.patent_number)}</code></td>
                            </tr>
                            <tr>
                                <th>카테고리</th>
                                <td>${patent.__categoryLabel}</td>
                            </tr>
                            <tr>
                                <th>기술분류</th>
                                <td>${this.escapeHtml(patent.technology_field)}</td>
                            </tr>
                            <tr>
                                <th>상태</th>
                                <td><span class="badge bg-${patent.__statusColor}">${patent.__statusLabel}</span></td>
                            </tr>
                            <tr>
                                <th>등록일</th>
                                <td>${patent.registration_date ? new Date(patent.registration_date).toLocaleDateString('ko-KR') : '-'}</td>
                            </tr>
                            <tr>
                                <th>출원일</th>
                                <td>${patent.application_date ? new Date(patent.application_date).toLocaleDateString('ko-KR') : '-'}</td>
                            </tr>
                        </table>
                    </div>

                    ${patent.abstract ? `
                        <div class="mb-4">
                            <h6 class="text-muted mb-2">요약</h6>
                            <p class="text-justify">${this.escapeHtml(patent.abstract)}</p>
                        </div>
                    ` : ''}

                    ${patent.inventors.length > 0 ? `
                        <div class="mb-4">
                            <h6 class="text-muted mb-2">발명자</h6>
                            <div class="d-flex flex-wrap gap-2">
                                ${patent.inventors.map(inv => `
                                    <span class="badge bg-secondary">${this.escapeHtml(inv)}</span>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    ${patent.technical_keywords.length > 0 ? `
                        <div class="mb-4">
                            <h6 class="text-muted mb-2">기술 키워드</h6>
                            <div class="d-flex flex-wrap gap-2">
                                ${patent.technical_keywords.map(kw => `
                                    <span class="badge bg-info">${this.escapeHtml(kw)}</span>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>

                <div class="col-md-4">
                    <div class="card">
                        <div class="card-header">
                            <h6 class="mb-0">통계</h6>
                        </div>
                        <div class="card-body">
                            <div class="mb-3">
                                <small class="text-muted d-block">우선순위 점수</small>
                                <div class="progress" style="height: 20px">
                                    <div class="progress-bar" style="width: ${patent.priority_score * 10}%">
                                        ${patent.priority_score}/10
                                    </div>
                                </div>
                            </div>
                            <div class="mb-3">
                                <small class="text-muted d-block">페이지 수</small>
                                <h5>${patent.page_count || 0} 페이지</h5>
                            </div>
                            ${patent.__hasPDF ? `
                                <div class="mb-3">
                                    <small class="text-muted d-block">PDF 원문</small>
                                    <button class="btn btn-sm btn-danger w-100">
                                        <i class="fas fa-file-pdf me-1"></i>
                                        PDF 보기
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 페이지네이션 UI 업데이트
     */
    updatePaginationUI() {
        const start = (this.currentPage - 1) * this.itemsPerPage + 1;
        const end = Math.min(start + this.itemsPerPage - 1, this.filteredPatents.length);

        if (this.dom.totalCount) this.dom.totalCount.textContent = this.filteredPatents.length;
        if (this.dom.startCount) this.dom.startCount.textContent = start;
        if (this.dom.endCount) this.dom.endCount.textContent = end;

        if (this.dom.prevPage) {
            this.dom.prevPage.disabled = this.currentPage <= 1;
        }
        if (this.dom.nextPage) {
            this.dom.nextPage.disabled = this.currentPage >= this.totalPages;
        }
    }

    /**
     * 이벤트 바인딩
     */
    bindEvents() {
        // 검색
        if (this.dom.searchButton) {
            this.dom.searchButton.addEventListener('click', () => {
                this.filters.search = this.dom.searchInput?.value || '';
                this.applyFilters();
            });
        }

        if (this.dom.searchInput) {
            this.dom.searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.filters.search = e.target.value;
                    this.applyFilters();
                }
            });
        }

        // 리셋
        if (this.dom.resetButton) {
            this.dom.resetButton.addEventListener('click', () => {
                this.resetFilters();
            });
        }

        // 필터
        if (this.dom.categoryFilter) {
            this.dom.categoryFilter.addEventListener('change', (e) => {
                this.filters.category = e.target.value;
                this.applyFilters();
            });
        }

        if (this.dom.statusFilter) {
            this.dom.statusFilter.addEventListener('change', (e) => {
                this.filters.status = e.target.value;
                this.applyFilters();
            });
        }

        // 페이지네이션
        if (this.dom.prevPage) {
            this.dom.prevPage.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.renderTable();
                    this.updatePaginationUI();
                }
            });
        }

        if (this.dom.nextPage) {
            this.dom.nextPage.addEventListener('click', () => {
                if (this.currentPage < this.totalPages) {
                    this.currentPage++;
                    this.renderTable();
                    this.updatePaginationUI();
                }
            });
        }

        if (this.dom.pageSize) {
            this.dom.pageSize.addEventListener('change', (e) => {
                this.itemsPerPage = parseInt(e.target.value) || 20;
                this.applyFilters();
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
            status: '',
            hasDF: false
        };

        if (this.dom.searchInput) this.dom.searchInput.value = '';
        if (this.dom.categoryFilter) this.dom.categoryFilter.value = '';
        if (this.dom.statusFilter) this.dom.statusFilter.value = '';

        this.applyFilters();
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
            this.dom.loading.style.display = show ? 'block' : 'none';
        }
        if (this.dom.listContainer) {
            this.dom.listContainer.style.display = show ? 'none' : 'block';
        }
    }

    /**
     * 빈 상태 표시
     */
    showEmpty() {
        if (this.dom.listContainer) this.dom.listContainer.style.display = 'none';
        if (this.dom.emptyState) this.dom.emptyState.style.display = 'block';
    }

    /**
     * 에러 표시
     */
    showError(message) {
        if (this.dom.listContainer) {
            this.dom.listContainer.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    ${message}
                </div>
            `;
        }
    }

    /**
     * 통계 조회
     */
    getStats() {
        return this.stats;
    }

    /**
     * 데이터 변경 알림
     */
    notifyDataReady() {
        window.dispatchEvent(new CustomEvent('patents-data-ready', {
            detail: {
                patents: this.patents,
                stats: this.stats
            }
        }));
    }
}

// 전역 인스턴스
window.patentManager = null;

// DOM 로드 후 초기화
document.addEventListener('DOMContentLoaded', () => {
    window.patentManager = new PatentManager();
});
