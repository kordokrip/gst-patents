/**
 * 타임라인 및 기술 발전 히스토리 모듈
 * 글로벌 스탠다드 테크놀로지 특허 관리 시스템
 */

class TimelineManager {
    constructor() {
        this.timelineData = [];
        this.milestones = [];
        this.currentView = 'timeline'; // 'timeline' | 'gantt' | 'roadmap'
        this.initialized = false;
        
        // 자동 초기화 제거 - main.js에서 명시적으로 호출
        console.log('🕐 타임라인 매니저 생성됨 (초기화 대기 중)');
    }
    
    /**
     * 타임라인 매니저 초기화
     */
    async init() {
        try {
            // 이미 초기화되었다면 건너뛰기
            if (this.initialized) {
                console.log('🕐 타임라인 매니저 이미 초기화됨');
                return;
            }
            
            // 특허 데이터 로딩 대기
            await this.waitForPatentData();
            
            this.refresh();
            
            this.initialized = true;
            console.log('🕐 타임라인 매니저 초기화 완료');
        } catch (error) {
            console.error('❌ 타임라인 초기화 오류:', error);
        }
    }
    
    /**
     * 특허 데이터 로딩 대기
     */
    async waitForPatentData() {
        return new Promise((resolve) => {
            const checkData = () => {
                if (window.patentManager && window.patentManager.patents.length > 0) {
                    resolve();
                } else {
                    setTimeout(checkData, 100);
                }
            };
            checkData();
        });
    }
    
    /**
     * 타임라인 데이터 생성
     */
    generateTimelineData() {
        const manager = window.patentManager;
        if (!manager) {
            this.timelineData = [];
            return;
        }

        const source = Array.isArray(manager.filteredPatents)
            ? manager.filteredPatents
            : manager.patents;

        const patents = (source || []).filter(patent => 
            patent.__registrationDate instanceof Date && !Number.isNaN(patent.__registrationDate.getTime())
        );
        
        // 특허를 날짜순으로 정렬
        const sortedPatents = patents.slice().sort((a, b) => 
            a.__registrationDate - b.__registrationDate
        );
        
        this.timelineData = sortedPatents.map(patent => ({
            id: patent.id,
            date: patent.__registrationDate.toISOString().split('T')[0],
            applicationDate: patent.application_date,
            title: patent.title,
            category: patent.category,
            technologyField: patent.technology_field,
            patentNumber: patent.patent_number,
            priority: patent.priority_score || 5,
            abstract: patent.abstract,
            inventors: patent.inventors || [],
            status: patent.status,
            technicalKeywords: patent.technical_keywords || [],
            relatedPatents: patent.related_patents || [],
            __registrationDate: patent.__registrationDate
        }));
    }
    
    /**
     * 주요 마일스톤 생성
     */
    generateMilestones() {
        this.milestones = [
            {
                id: 'milestone-1',
                date: '2005-01-01',
                title: '특허 출원 시작',
                description: '글로벌 스탠다드 테크놀로지의 첫 특허 출원 시작',
                type: 'company',
                icon: 'fas fa-flag',
                color: '#10b981'
            },
            {
                id: 'milestone-2',
                date: '2007-05-18',
                title: '첫 번째 특허 등록',
                description: '반도체 제조 공정용 온도조절 시스템 특허 등록 (10-0719225)',
                type: 'patent',
                icon: 'fas fa-certificate',
                color: '#3b82f6'
            },
            {
                id: 'milestone-3',
                date: '2010-01-01',
                title: '스크러버 기술 집중 개발',
                description: '습식 스크러버 관련 특허 집중 개발 시기',
                type: 'technology',
                icon: 'fas fa-cogs',
                color: '#8b5cf6'
            },
            {
                id: 'milestone-4',
                date: '2015-01-01',
                title: '통합 시스템 개발',
                description: '다단계 가스 정화 시스템 등 통합 솔루션 개발',
                type: 'innovation',
                icon: 'fas fa-lightbulb',
                color: '#f59e0b'
            },
            {
                id: 'milestone-5',
                date: '2020-01-01',
                title: '환경 친화적 기술 전환',
                description: '친환경 및 에너지 효율 기술 개발 집중',
                type: 'environment',
                icon: 'fas fa-leaf',
                color: '#10b981'
            },
            {
                id: 'milestone-6',
                date: '2024-01-01',
                title: '스마트 팩토리 대응',
                description: 'IoT, AI 기반 스마트 제조 시스템 관련 기술 개발',
                type: 'digital',
                icon: 'fas fa-microchip',
                color: '#ef4444'
            }
        ];
    }
    
    /**
     * 타임라인 렌더링
     */
    renderTimeline() {
        const container = document.getElementById('timeline-container');
        if (!container) return;
        if (!this.timelineData.length) {
            container.innerHTML = '<div class="text-center text-gst-gray py-12">표시할 타임라인 데이터가 없습니다.</div>';
            return;
        }
        
        // 타임라인 헤더 생성
        const header = this.createTimelineHeader();
        
        // 타임라인 컨텐츠 생성
        const content = this.createTimelineContent();
        
        container.innerHTML = `
            ${header}
            <div class="timeline-content-wrapper">
                ${content}
            </div>
        `;
        
        // 이벤트 바인딩
        this.bindTimelineEvents();
        
        // 애니메이션 적용
        this.animateTimeline();
    }
    
    /**
     * 타임라인 헤더 생성
     */
    createTimelineHeader() {
        return `
            <div class="timeline-header mb-6">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h3 class="text-2xl font-bold text-gray-900">기술 발전 타임라인</h3>
                        <p class="text-gray-600 mt-1">글로벌 스탠다드 테크놀로지의 특허 및 기술 발전 히스토리</p>
                    </div>
                    
                    <div class="flex space-x-2">
                        <button class="timeline-view-btn active" data-view="timeline" 
                                title="타임라인 뷰">
                            <i class="fas fa-timeline mr-2"></i>타임라인
                        </button>
                        <button class="timeline-view-btn" data-view="yearly" 
                                title="연도별 뷰">
                            <i class="fas fa-calendar-alt mr-2"></i>연도별
                        </button>
                        <button class="timeline-view-btn" data-view="category" 
                                title="분야별 뷰">
                            <i class="fas fa-tags mr-2"></i>분야별
                        </button>
                    </div>
                </div>
                
                <div class="mt-4 flex flex-wrap gap-2">
                    <div class="timeline-stats">
                        <span class="stat-item">
                            <i class="fas fa-file-alt text-blue-600"></i>
                            총 특허: <strong>${this.timelineData.length}</strong>
                        </span>
                        <span class="stat-item">
                            <i class="fas fa-calendar text-green-600"></i>
                            기간: <strong>${this.getTimelineRange()}</strong>
                        </span>
                        <span class="stat-item">
                            <i class="fas fa-trophy text-yellow-600"></i>
                            주요 마일스톤: <strong>${this.milestones.length}</strong>
                        </span>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * 타임라인 컨텐츠 생성
     */
    createTimelineContent() {
        switch (this.currentView) {
            case 'yearly':
                return this.createYearlyView();
            case 'category':
                return this.createCategoryView();
            default:
                return this.createTimelineView();
        }
    }
    
    /**
     * 기본 타임라인 뷰
     */
    createTimelineView() {
        // 연도별로 데이터 그룹핑
        const yearGroups = this.groupByYear();
        
        let timelineHTML = '<div class="timeline-wrapper">';
        
        // 마일스톤과 특허를 통합하여 시간순으로 정렬
        const allEvents = this.mergeTimelineEvents(yearGroups);
        
        allEvents.forEach((event, index) => {
            if (event.type === 'milestone') {
                timelineHTML += this.createMilestoneItem(event, index);
            } else if (event.type === 'year-group') {
                timelineHTML += this.createYearGroupItem(event, index);
            }
        });
        
        timelineHTML += '</div>';
        
        return timelineHTML;
    }
    
    /**
     * 연도별 뷰
     */
    createYearlyView() {
        const yearGroups = this.groupByYear();
        
        let yearlyHTML = '<div class="yearly-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">';
        
        Object.keys(yearGroups).sort().forEach(year => {
            const patents = yearGroups[year];
            const categoryStats = this.getCategoryStats(patents);
            
            yearlyHTML += `
                <div class="yearly-card bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                    <div class="yearly-header mb-4">
                        <h4 class="text-xl font-bold text-gray-900">${year}년</h4>
                        <p class="text-sm text-gray-600">등록 특허: ${patents.length}건</p>
                    </div>
                    
                    <div class="category-stats mb-4">
                        ${Object.entries(categoryStats).map(([category, count]) => `
                            <div class="stat-row flex justify-between items-center py-1">
                                <span class="category-name text-sm">${category}</span>
                                <span class="category-count bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">${count}</span>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="patent-list">
                        <h5 class="text-sm font-medium text-gray-700 mb-2">주요 특허:</h5>
                        ${patents.slice(0, 3).map(patent => `
                            <div class="patent-item text-xs text-gray-600 mb-1 cursor-pointer hover:text-blue-600" 
                                 onclick="timelineManager.viewPatentDetail('${patent.id}')">
                                <i class="fas fa-file-text mr-1"></i>
                                ${patent.title.length > 30 ? patent.title.substring(0, 30) + '...' : patent.title}
                            </div>
                        `).join('')}
                        ${patents.length > 3 ? `
                            <div class="text-xs text-blue-600 cursor-pointer" 
                                 onclick="timelineManager.showAllPatentsForYear('${year}')">
                                +${patents.length - 3}개 더보기
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        });
        
        yearlyHTML += '</div>';
        
        return yearlyHTML;
    }
    
    /**
     * 분야별 뷰
     */
    createCategoryView() {
        const categoryGroups = this.groupByCategory();
        
        let categoryHTML = '<div class="category-timeline">';
        
        Object.entries(categoryGroups).forEach(([category, patents]) => {
            const categoryName = this.getCategoryName(category);
            const color = this.getCategoryColor(category);
            
            categoryHTML += `
                <div class="category-section mb-8">
                    <div class="category-header flex items-center mb-4">
                        <div class="category-icon w-4 h-4 rounded-full mr-3" style="background-color: ${color}"></div>
                        <h4 class="text-lg font-bold text-gray-900">${categoryName}</h4>
                        <span class="ml-2 bg-gray-100 text-gray-600 px-2 py-1 rounded text-sm">${patents.length}건</span>
                    </div>
                    
                    <div class="category-patents">
                        ${patents.map((patent, index) => `
                            <div class="patent-timeline-item flex items-start mb-4 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors"
                                 onclick="timelineManager.viewPatentDetail('${patent.id}')">
                                <div class="timeline-dot w-3 h-3 rounded-full mt-2 mr-4 flex-shrink-0" 
                                     style="background-color: ${color}"></div>
                                <div class="patent-content flex-1">
                                    <div class="patent-header flex justify-between items-start">
                                        <h5 class="font-medium text-gray-900">${patent.title}</h5>
                                        <span class="text-sm text-gray-500 flex-shrink-0 ml-4">${this.formatDate(patent.date)}</span>
                                    </div>
                                    <p class="text-sm text-gray-600 mt-1">${patent.patentNumber}</p>
                                    <p class="text-xs text-gray-500 mt-1">${patent.abstract.substring(0, 100)}...</p>
                                    
                                    ${patent.technicalKeywords.length > 0 ? `
                                        <div class="keywords mt-2">
                                            ${patent.technicalKeywords.slice(0, 3).map(keyword => `
                                                <span class="keyword-tag bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs mr-1">${keyword}</span>
                                            `).join('')}
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        });
        
        categoryHTML += '</div>';
        
        return categoryHTML;
    }
    
    /**
     * 마일스톤 아이템 생성
     */
    createMilestoneItem(milestone, index) {
        return `
            <div class="timeline-item milestone-item" data-index="${index}">
                <div class="timeline-marker milestone-marker" style="background-color: ${milestone.color}">
                    <i class="${milestone.icon}"></i>
                </div>
                <div class="timeline-content milestone-content" style="border-left-color: ${milestone.color}">
                    <div class="timeline-date text-sm font-medium" style="color: ${milestone.color}">
                        ${this.formatDate(milestone.date)}
                    </div>
                    <div class="timeline-title text-lg font-bold text-gray-900 mb-2">
                        ${milestone.title}
                    </div>
                    <div class="timeline-description text-gray-600">
                        ${milestone.description}
                    </div>
                    <div class="milestone-type mt-2">
                        <span class="type-badge" style="background-color: ${milestone.color}20; color: ${milestone.color}">
                            ${this.getMilestoneTypeText(milestone.type)}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * 연도 그룹 아이템 생성
     */
    createYearGroupItem(yearGroup, index) {
        const year = yearGroup.year;
        const patents = yearGroup.patents;
        
        return `
            <div class="timeline-item year-group-item" data-index="${index}">
                <div class="timeline-marker year-marker">
                    <i class="fas fa-calendar-alt"></i>
                </div>
                <div class="timeline-content year-content">
                    <div class="year-header mb-4">
                        <div class="timeline-date text-sm font-medium text-blue-600">
                            ${year}년
                        </div>
                        <div class="timeline-title text-lg font-bold text-gray-900">
                            ${patents.length}건의 특허 등록
                        </div>
                    </div>
                    
                    <div class="patents-grid grid gap-3">
                        ${patents.map(patent => `
                            <div class="patent-card bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors cursor-pointer"
                                 onclick="timelineManager.viewPatentDetail('${patent.id}')">
                                <div class="flex justify-between items-start mb-2">
                                    <span class="category-badge ${this.getCategoryBadgeClass(patent.category)}">
                                        ${patent.technologyField}
                                    </span>
                                    <span class="priority-score text-xs text-gray-500">
                                        ${patent.priority}/10
                                    </span>
                                </div>
                                <h6 class="font-medium text-gray-900 text-sm mb-1">${patent.title}</h6>
                                <p class="text-xs text-gray-600">${patent.patentNumber}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * 이벤트 바인딩
     */
    bindTimelineEvents() {
        // 뷰 전환 버튼
        document.querySelectorAll('.timeline-view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.closest('button').dataset.view;
                this.switchView(view);
            });
        });
        
        // 스크롤 애니메이션
        this.observeTimelineItems();
    }
    
    /**
     * 뷰 전환
     */
    switchView(view) {
        this.currentView = view;
        
        // 버튼 상태 업데이트
        document.querySelectorAll('.timeline-view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${view}"]`).classList.add('active');
        
        // 컨텐츠 다시 렌더링
        this.renderTimeline();
    }
    
    /**
     * 애니메이션 적용
     */
    animateTimeline() {
        // CSS 애니메이션 클래스 추가
        setTimeout(() => {
            document.querySelectorAll('.timeline-item').forEach((item, index) => {
                setTimeout(() => {
                    item.classList.add('fade-in');
                }, index * 100);
            });
        }, 100);
    }
    
    /**
     * 스크롤 관찰자 설정
     */
    observeTimelineItems() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '50px'
        });
        
        document.querySelectorAll('.timeline-item').forEach(item => {
            observer.observe(item);
        });
    }
    
    /**
     * 특허 상세보기
     */
    viewPatentDetail(patentId) {
        if (window.patentManager) {
            window.patentManager.viewDetail(patentId);
        }
    }
    
    /**
     * 연도별 모든 특허 보기
     */
    showAllPatentsForYear(year) {
        const patents = this.timelineData.filter(patent => 
            new Date(patent.date).getFullYear().toString() === year
        );
        
        // 모달로 표시
        this.showPatentListModal(`${year}년 등록 특허`, patents);
    }
    
    /**
     * 특허 목록 모달 표시
     */
    showPatentListModal(title, patents) {
        const modalContent = `
            <div class="max-w-4xl mx-auto bg-white rounded-lg shadow-xl">
                <div class="px-6 py-4 border-b border-gray-200">
                    <h2 class="text-2xl font-bold text-gray-900">${title}</h2>
                    <p class="text-sm text-gray-600">총 ${patents.length}건의 특허</p>
                </div>
                
                <div class="px-6 py-4 max-h-96 overflow-y-auto">
                    <div class="space-y-3">
                        ${patents.map(patent => `
                            <div class="patent-item border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                                 onclick="timelineManager.viewPatentDetail('${patent.id}'); timelineManager.closeModal();">
                                <div class="flex justify-between items-start">
                                    <div class="flex-1">
                                        <h4 class="font-medium text-gray-900">${patent.title}</h4>
                                        <p class="text-sm text-gray-600 mt-1">${patent.patentNumber} | ${patent.technologyField}</p>
                                        <p class="text-xs text-gray-500 mt-1">${patent.abstract.substring(0, 100)}...</p>
                                    </div>
                                    <div class="flex flex-col items-end ml-4">
                                        <span class="text-sm text-gray-500">${this.formatDate(patent.date)}</span>
                                        <span class="text-xs text-blue-600">${patent.priority}/10</span>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="px-6 py-4 border-t border-gray-200 flex justify-end">
                    <button onclick="timelineManager.closeModal()" 
                            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">
                        닫기
                    </button>
                </div>
            </div>
        `;
        
        this.showModal(modalContent);
    }
    
    /**
     * 유틸리티 메소드들
     */
    
    groupByYear() {
        const yearGroups = {};
        this.timelineData.forEach(patent => {
            const year = new Date(patent.date).getFullYear();
            if (!yearGroups[year]) {
                yearGroups[year] = [];
            }
            yearGroups[year].push(patent);
        });
        return yearGroups;
    }
    
    groupByCategory() {
        const categoryGroups = {};
        this.timelineData.forEach(patent => {
            if (!categoryGroups[patent.category]) {
                categoryGroups[patent.category] = [];
            }
            categoryGroups[patent.category].push(patent);
        });
        
        // 각 카테고리 내에서 날짜순 정렬
        Object.keys(categoryGroups).forEach(category => {
            categoryGroups[category].sort((a, b) => new Date(a.date) - new Date(b.date));
        });
        
        return categoryGroups;
    }
    
    mergeTimelineEvents(yearGroups) {
        const events = [];
        
        // 마일스톤 추가
        this.milestones.forEach(milestone => {
            events.push({
                ...milestone,
                type: 'milestone',
                sortDate: new Date(milestone.date)
            });
        });
        
        // 연도 그룹 추가
        Object.entries(yearGroups).forEach(([year, patents]) => {
            events.push({
                type: 'year-group',
                year: year,
                patents: patents,
                sortDate: new Date(`${year}-01-01`)
            });
        });
        
        // 날짜순 정렬
        return events.sort((a, b) => a.sortDate - b.sortDate);
    }
    
    getCategoryStats(patents) {
        const stats = {};
        patents.forEach(patent => {
            const category = patent.technologyField;
            stats[category] = (stats[category] || 0) + 1;
        });
        return stats;
    }
    
    getCategoryName(category) {
        const names = {
            'scrubber': '스크러버',
            'chiller': '칠러', 
            'plasma': '플라즈마',
            'temperature': '온도제어',
            'gas-treatment': '가스처리'
        };
        return names[category] || category;
    }
    
    getCategoryColor(category) {
        const colors = {
            'scrubber': '#3b82f6',
            'chiller': '#10b981',
            'plasma': '#8b5cf6',
            'temperature': '#f59e0b',
            'gas-treatment': '#ef4444'
        };
        return colors[category] || '#6b7280';
    }
    
    getCategoryBadgeClass(category) {
        const classes = {
            'scrubber': 'bg-blue-100 text-blue-800',
            'chiller': 'bg-green-100 text-green-800',
            'plasma': 'bg-purple-100 text-purple-800',
            'temperature': 'bg-yellow-100 text-yellow-800',
            'gas-treatment': 'bg-red-100 text-red-800'
        };
        return classes[category] || 'bg-gray-100 text-gray-800';
    }
    
    getMilestoneTypeText(type) {
        const types = {
            'company': '회사',
            'patent': '특허',
            'technology': '기술',
            'innovation': '혁신',
            'environment': '환경',
            'digital': '디지털'
        };
        return types[type] || type;
    }
    
    getTimelineRange() {
        if (!this.timelineData.length) return '없음';
        
        const dates = this.timelineData.map(item => new Date(item.date));
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        
        return `${minDate.getFullYear()}년 - ${maxDate.getFullYear()}년`;
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    
    showModal(content) {
        const modalBackdrop = document.createElement('div');
        modalBackdrop.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
        modalBackdrop.id = 'timeline-modal';
        
        modalBackdrop.innerHTML = content;
        
        modalBackdrop.addEventListener('click', (e) => {
            if (e.target === modalBackdrop) {
                this.closeModal();
            }
        });
        
        document.body.appendChild(modalBackdrop);
        document.body.style.overflow = 'hidden';
    }
    
    closeModal() {
        const modal = document.getElementById('timeline-modal');
        if (modal) {
            document.body.removeChild(modal);
            document.body.style.overflow = '';
        }
    }

    refresh() {
        if (!window.patentManager || !Array.isArray(window.patentManager.patents)) return;
        this.generateTimelineData();
        this.generateMilestones();
        this.renderTimeline();
    }
}

// 전역 타임라인 매니저 인스턴스
let timelineManager;

// 초기화 함수
async function initializeTimeline() {
    if (!timelineManager) {
        timelineManager = new TimelineManager();
        window.timelineManager = timelineManager;
    }
    
    try {
        await timelineManager.init();
        console.log('🕐 타임라인 시스템 초기화 완료');
    } catch (error) {
        console.error('❌ 타임라인 시스템 초기화 실패:', error);
    }
}

// DOM 로드 완료 후 자동 초기화 제거
// main.js에서 데이터 로딩 후 명시적으로 initializeTimeline() 호출
// 전역 함수로 노출
window.initializeTimelineFunction = initializeTimeline;
