/**
 * 차트 및 데이터 시각화 모듈
 * 글로벌 스탠다드 테크놀로지 특허 관리 시스템
 */

class ChartManager {
    constructor() {
        this.charts = {};
        this.initialized = false;
        this.chartColors = [
            '#1e40af', '#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe',
            '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5',
            '#f59e0b', '#fbbf24', '#fcd34d', '#fde68a', '#fef3c7',
            '#ef4444', '#f87171', '#fca5a5', '#fecaca', '#fee2e2',
            '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'
        ];
        
        // 자동 초기화 제거 - main.js에서 명시적으로 호출
        console.log('📊 차트 매니저 생성됨 (초기화 대기 중)');
    }
    
    /**
     * 차트 매니저 초기화
     */
    async init() {
        try {
            // 이미 초기화되었다면 건너뛰기
            if (this.initialized) {
                console.log('📊 차트 매니저 이미 초기화됨');
                return;
            }
            
            // 특허 데이터 로딩 대기
            await this.waitForPatentData();
            
            // 모든 기존 차트 파괴
            this.destroyAllCharts();
            
            // 차트들 초기화
            this.initTechDistributionChart();
            this.initYearlyRegistrationChart();
            this.initStatusDistributionChart();
            this.initPriorityScoreChart();
            this.initInventorChart();
            this.initTopCategories();
            this.initRecentTrend();
            
            this.initialized = true;
            console.log('📊 차트 매니저 초기화 완료 (메인 차트 + 통계 위젯)');
        } catch (error) {
            console.error('❌ 차트 초기화 오류:', error);
        }
    }
    
    /**
     * 모든 차트 파괴
     */
    destroyAllCharts() {
        Object.keys(this.charts).forEach(key => {
            if (this.charts[key] && typeof this.charts[key].destroy === 'function') {
                this.charts[key].destroy();
                delete this.charts[key];
            } else if (this.charts[key] && typeof this.charts[key].dispose === 'function') {
                this.charts[key].dispose();
                delete this.charts[key];
            }
        });
        console.log('🗑️ 기존 차트들 정리 완료');
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
     * 기술 분야별 분포 차트
     */
    initTechDistributionChart() {
        const canvas = document.getElementById('tech-distribution-chart');
        if (!canvas) return;
        
        // 기존 차트가 있으면 파괴
        if (this.charts.techDistribution) {
            this.charts.techDistribution.destroy();
        }
        
        const patents = this.getActiveDataset();
        const categoryData = this.getCategoryDistribution(patents);
        
        const ctx = canvas.getContext('2d');
        this.charts.techDistribution = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categoryData.labels,
                datasets: [{
                    data: categoryData.values,
                    backgroundColor: this.chartColors.slice(0, categoryData.labels.length),
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    hoverBorderWidth: 3,
                    hoverBorderColor: '#374151'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: false
                    },
                    legend: {
                        position: 'right',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            font: {
                                size: 12,
                                family: 'Noto Sans KR'
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed * 100) / total).toFixed(1);
                                return `${context.label}: ${context.parsed}개 (${percentage}%)`;
                            }
                        },
                        titleFont: {
                            family: 'Noto Sans KR'
                        },
                        bodyFont: {
                            family: 'Noto Sans KR'
                        }
                    }
                },
                animation: {
                    animateRotate: true,
                    animateScale: true,
                    duration: 1000
                }
            }
        });
    }
    
    /**
     * 연도별 등록 현황 차트
     */
    initYearlyRegistrationChart() {
        const canvas = document.getElementById('yearly-registration-chart');
        if (!canvas) return;
        
        // 기존 차트가 있으면 파괴
        if (this.charts.yearlyRegistration) {
            this.charts.yearlyRegistration.destroy();
        }
        
        const patents = this.getActiveDataset();
        const yearlyData = this.getYearlyDistribution(patents);
        
        const ctx = canvas.getContext('2d');
        this.charts.yearlyRegistration = new Chart(ctx, {
            type: 'line',
            data: {
                labels: yearlyData.years,
                datasets: [{
                    label: '특허 등록 수',
                    data: yearlyData.counts,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#1e40af',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            font: {
                                family: 'Noto Sans KR'
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            font: {
                                family: 'Noto Sans KR'
                            }
                        },
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            font: {
                                family: 'Noto Sans KR'
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                return `${context[0].label}년`;
                            },
                            label: function(context) {
                                return `등록 특허: ${context.parsed.y}건`;
                            }
                        },
                        titleFont: {
                            family: 'Noto Sans KR'
                        },
                        bodyFont: {
                            family: 'Noto Sans KR'
                        }
                    }
                },
                animation: {
                    duration: 1500,
                    easing: 'easeInOutQuart'
                }
            }
        });
    }
    
    /**
     * 상태별 분포 차트 (추가)
     */
    initStatusDistributionChart() {
        const patents = this.getActiveDataset();
        const statusCounts = {
            'registered': 0,
            'pending': 0,
            'rejected': 0
        };

        patents.forEach(patent => {
            const status = patent.status || '';
            if (status === 'registered' || status === '등록') {
                statusCounts['registered']++;
            } else if (status === 'pending' || status === '출원') {
                statusCounts['pending']++;
            } else if (status === 'rejected' || status === '포기' || status === '거절') {
                statusCounts['rejected']++;
            }
        });

        // DOM 업데이트
        const statRegistered = document.getElementById('stat-registered');
        const statPending = document.getElementById('stat-pending');
        const statRejected = document.getElementById('stat-rejected');

        if (statRegistered) statRegistered.textContent = statusCounts['registered'];
        if (statPending) statPending.textContent = statusCounts['pending'];
        if (statRejected) statRejected.textContent = statusCounts['rejected'];
        
        console.log('✅ 특허 상태 분포 업데이트됨:', statusCounts);
    }
    
    /**
     * 중요도 점수 분포 차트
     */
    initPriorityScoreChart() {
        const patents = this.getActiveDataset();
        const scoreData = this.getPriorityScoreDistribution(patents);
        
        const container = document.getElementById('priority-distribution');
        if (container) {
            const total = Object.values(scoreData).reduce((a, b) => a + b, 0);
            const html = Object.entries(scoreData).map(([range, count]) => {
                const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
                const colors = {
                    '1-3점': 'bg-red-500',
                    '4-6점': 'bg-yellow-500',
                    '7-8점': 'bg-blue-500',
                    '9-10점': 'bg-green-500'
                };
                return `
                    <div class="flex items-center gap-3">
                        <span class="text-sm text-gst-gray min-w-[60px]">${range}</span>
                        <div class="flex-1 bg-gray-200 rounded-full h-4">
                            <div class="${colors[range]} h-4 rounded-full transition-all duration-500" 
                                 style="width: ${percentage}%"></div>
                        </div>
                        <span class="text-sm font-semibold text-gst-dark min-w-[50px] text-right">
                            ${count}건 (${percentage}%)
                        </span>
                    </div>
                `;
            }).join('');
            container.innerHTML = html;
        }
        
        console.log('📊 중요도 점수 분포:', scoreData);
    }
    
    /**
     * 발명자별 특허 수 차트
     */
    initInventorChart() {
        const patents = this.getActiveDataset();
        const inventorData = this.getInventorDistribution(patents);
        
        const container = document.getElementById('inventor-list');
        if (container) {
            const html = Object.entries(inventorData).map(([inventor, count], index) => {
                const medal = index < 3 ? ['🥇', '🥈', '🥉'][index] : ''; 
                return `
                    <div class="flex items-center justify-between py-2 px-3 rounded hover:bg-gray-50 transition-colors">
                        <div class="flex items-center gap-2">
                            <span class="text-lg">${medal}</span>
                            <span class="text-sm font-medium text-gst-dark">${this.escapeHtml(inventor)}</span>
                        </div>
                        <span class="text-sm font-bold text-gst-blue">${count}건</span>
                    </div>
                `;
            }).join('');
            container.innerHTML = html || '<div class="text-sm text-gst-gray text-center py-4">데이터 없음</div>';
        }
        
        console.log('📊 발명자별 특허 분포:', inventorData);
    }

    /**
     * 주요 기술 분야 TOP 3 표시
     */
    initTopCategories() {
        const patents = this.getActiveDataset();
        const categoryData = this.getCategoryDistribution(patents);
        
        const sorted = Object.entries(categoryData.labels.map((label, i) => ({
            label,
            count: categoryData.values[i]
        }))).sort((a, b) => b[1].count - a[1].count).slice(0, 3);

        const container = document.getElementById('top-categories');
        if (container) {
            const colors = [
                'bg-gradient-to-r from-yellow-400 to-orange-500',
                'bg-gradient-to-r from-blue-400 to-indigo-500',
                'bg-gradient-to-r from-green-400 to-teal-500'
            ];

            const html = sorted.map(([idx, {label, count}], i) => {
                const total = categoryData.values.reduce((a, b) => a + b, 0);
                const percentage = ((count / total) * 100).toFixed(1);
                return `
                    <div class="p-3 rounded-lg ${colors[i]} text-white">
                        <div class="flex justify-between items-center mb-1">
                            <span class="font-semibold">${label}</span>
                            <span class="text-sm">${count}건</span>
                        </div>
                        <div class="text-xs opacity-90">${percentage}%</div>
                    </div>
                `;
            }).join('');
            container.innerHTML = html || '<div class="text-sm text-gst-gray text-center py-4">데이터 없음</div>';
        }
    }

    /**
     * 최근 등록 트렌드 표시
     */
    initRecentTrend() {
        const patents = this.getActiveDataset();
        const now = new Date();
        const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        
        const recentPatents = patents.filter(p => {
            const date = this.parseRegistrationDate(p);
            return date && date >= oneYearAgo;
        });

        const container = document.getElementById('recent-trend');
        if (container) {
            const byMonth = {};
            recentPatents.forEach(p => {
                const date = this.parseRegistrationDate(p);
                const month = date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short' });
                byMonth[month] = (byMonth[month] || 0) + 1;
            });

            const sorted = Object.entries(byMonth).sort((a, b) => new Date(b[0]) - new Date(a[0])).slice(0, 5);
            
            const html = sorted.map(([month, count]) => `
                <div class="flex items-center justify-between py-2">
                    <span class="text-sm text-gst-gray">${month}</span>
                    <div class="flex items-center gap-2">
                        <div class="h-2 bg-indigo-200 rounded-full" style="width: ${count * 20}px"></div>
                        <span class="text-sm font-semibold text-indigo-600">${count}건</span>
                    </div>
                </div>
            `).join('');
            
            container.innerHTML = html || '<div class="text-sm text-gst-gray text-center py-4">최근 1년 데이터 없음</div>';
        }
    }

    /**
     * HTML 이스케이프
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = String(text || '');
        return div.innerHTML;
    }
    
    /**
     * 타임라인 차트 (ECharts 사용)
     */
    initTimelineChart() {
        const container = document.getElementById('timeline-container');
        if (!container) return;
        
        const patents = this.getActiveDataset();
        const timelineData = this.getTimelineData(patents);

        if (!timelineData.series.length) {
            if (this.charts.timeline && typeof this.charts.timeline.dispose === 'function') {
                this.charts.timeline.dispose();
                delete this.charts.timeline;
            }
            container.innerHTML = '<div class="text-center text-gst-gray py-12">표시할 타임라인 데이터가 없습니다.</div>';
            return;
        }
        
        // ECharts 인스턴스 생성
        const chart = echarts.init(container);
        
        const option = {
            title: {
                text: '특허 등록 타임라인',
                left: 'center',
                textStyle: {
                    fontFamily: 'Noto Sans KR',
                    fontSize: 18,
                    fontWeight: 'bold'
                }
            },
            tooltip: {
                trigger: 'axis',
                formatter: function(params) {
                    const data = params[0].data;
                    return `
                        <strong>${data.name}</strong><br/>
                        등록일: ${data.value[0]}<br/>
                        특허번호: ${data.patentNumber}<br/>
                        분야: ${data.category}<br/>
                        중요도: ${data.priority}/10
                    `;
                }
            },
            legend: {
                data: timelineData.categories,
                top: 40,
                textStyle: {
                    fontFamily: 'Noto Sans KR'
                }
            },
            grid: {
                left: '10%',
                right: '10%',
                bottom: '15%',
                containLabel: true
            },
            xAxis: {
                type: 'time',
                name: '연도',
                nameTextStyle: {
                    fontFamily: 'Noto Sans KR'
                },
                axisLabel: {
                    formatter: '{yyyy}',
                    fontFamily: 'Noto Sans KR'
                }
            },
            yAxis: {
                type: 'category',
                data: timelineData.categories,
                axisLabel: {
                    fontFamily: 'Noto Sans KR'
                }
            },
            series: timelineData.series
        };
        
        chart.setOption(option);
        this.charts.timeline = chart;
        
        // 반응형 처리
        window.addEventListener('resize', () => {
            chart.resize();
        });
    }
    
    /**
     * 데이터 처리 메소드들
     */
    getActiveDataset() {
        if (!window.patentManager) return [];
        if (Array.isArray(window.patentManager.filteredPatents)) {
            return window.patentManager.filteredPatents;
        }
        return window.patentManager.patents || [];
    }

    /**
     * 등록일자를 Date 객체로 변환
     */
    parseRegistrationDate(patent) {
        // __registrationDate가 이미 있으면 사용
        if (patent.__registrationDate instanceof Date) {
            return patent.__registrationDate;
        }
        
        // registration_date 문자열 파싱
        if (patent.registration_date && typeof patent.registration_date === 'string') {
            const date = new Date(patent.registration_date);
            if (!Number.isNaN(date.getTime())) {
                return date;
            }
        }
        
        // application_date 문자열 파싱
        if (patent.application_date && typeof patent.application_date === 'string') {
            const date = new Date(patent.application_date);
            if (!Number.isNaN(date.getTime())) {
                return date;
            }
        }
        
        return null;
    }

    /**
     * 정규화된 발명자 배열
     */
    getNormalizedInventors(patent) {
        const inventors = patent.inventors || patent.inventor_list || [];
        if (!Array.isArray(inventors)) {
            if (typeof inventors === 'string' && inventors.trim() && inventors !== '정보 없음') {
                return [inventors.trim()];
            }
            return [];
        }
        
        // 발명자명만 추출 (주소 정보 제거)
        const cleaned = inventors
            .map(inv => {
                if (typeof inv !== 'string') return null;
                const trimmed = inv.trim();
                
                // "정보 없음" 제외
                if (trimmed === '정보 없음' || !trimmed) return null;
                
                // 한글 이름만 추출 (2-10자)
                // 정규식: 한글 문자 2-10자
                const nameMatch = trimmed.match(/^([\uAC00-\uD7AF\s]{2,10})/);
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
     * 우선순위 점수 정규화
     */
    getNormalizedPriority(patent) {
        let score = patent.priority_score;
        if (typeof score === 'number' && score >= 1 && score <= 10) {
            return score;
        }
        if (typeof score === 'string') {
            const num = parseInt(score, 10);
            if (num >= 1 && num <= 10) return num;
        }
        return 5; // 기본값
    }

    /**
     * 카테고리 정규화
     */
    getNormalizedCategory(patent) {
        const categoryMap = {
            'scrubber': '스크러버',
            'chiller': '칠러',
            'plasma': '플라즈마',
            'temperature': '온도제어',
            'gas-treatment': '가스처리',
            'other': '기타'
        };
        
        const rawCategory = (patent.category || 'other').toLowerCase();
        return categoryMap[rawCategory] || patent.technology_field || '기타';
    }

    /**
     * 상태값 정규화
     */
    getNormalizedStatus(patent) {
        const statusMap = {
            'registered': '등록',
            '등록': '등록',
            'pending': '출원',
            '출원': '출원',
            'active': '등록',
            'inactive': '출원',
            'rejected': '거절',
            '거절': '거절',
            'withdrawn': '취하',
            '취하': '취하'
        };
        
        const rawStatus = (patent.status || patent.legal_status || 'registered').toLowerCase();
        return statusMap[rawStatus] || '등록';
    }

    getCategoryDistribution(patents) {
        const distribution = {};
        patents.forEach(patent => {
            const category = this.getNormalizedCategory(patent);
            distribution[category] = (distribution[category] || 0) + 1;
        });
        
        return {
            labels: Object.keys(distribution),
            values: Object.values(distribution)
        };
    }
    
    getYearlyDistribution(patents) {
        const yearCounts = {};
        
        patents.forEach(patent => {
            const date = this.parseRegistrationDate(patent);
            if (!date) return;
            const year = date.getFullYear();
            yearCounts[year] = (yearCounts[year] || 0) + 1;
        });
        
        const years = Object.keys(yearCounts)
            .sort((a, b) => Number(a) - Number(b));
        const counts = years.map(year => yearCounts[year]);
        
        return { years, counts };
    }
    
    getStatusDistribution(patents) {
        const distribution = {
            '등록': 0,
            '출원': 0,
            '거절': 0
        };
        
        patents.forEach(patent => {
            const status = this.getNormalizedStatus(patent);
            if (distribution.hasOwnProperty(status)) {
                distribution[status]++;
            } else {
                distribution[status] = 1;
            }
        });
        
        return distribution;
    }
    
    getPriorityScoreDistribution(patents) {
        const scoreRanges = {
            '1-3점': 0,
            '4-6점': 0,
            '7-8점': 0,
            '9-10점': 0
        };
        
        patents.forEach(patent => {
            const score = this.getNormalizedPriority(patent);
            if (score >= 1 && score <= 3) scoreRanges['1-3점']++;
            else if (score >= 4 && score <= 6) scoreRanges['4-6점']++;
            else if (score >= 7 && score <= 8) scoreRanges['7-8점']++;
            else if (score >= 9 && score <= 10) scoreRanges['9-10점']++;
        });
        
        return scoreRanges;
    }
    
    getInventorDistribution(patents) {
        const inventorCounts = {};
        
        patents.forEach(patent => {
            const inventors = this.getNormalizedInventors(patent);
            inventors.forEach(inventor => {
                inventorCounts[inventor] = (inventorCounts[inventor] || 0) + 1;
            });
        });
        
        // 상위 10명만 반환
        const sortedInventors = Object.entries(inventorCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10);
        
        return Object.fromEntries(sortedInventors);
    }
    
    getTimelineData(patents) {
        const categoryMap = {
            'scrubber': '스크러버',
            'chiller': '칠러',
            'plasma': '플라즈마',
            'temperature': '온도제어',
            'gas-treatment': '가스처리'
        };
        
        const categoryColors = {
            '스크러버': '#3b82f6',
            '칠러': '#10b981',
            '플라즈마': '#8b5cf6',
            '온도제어': '#f59e0b',
            '가스처리': '#ef4444',
            '기타': '#64748b'
        };
        
        const seriesData = {};
        const categoriesSet = new Set();
        
        // 카테고리별로 데이터 그룹핑
        patents.forEach(patent => {
            const registrationDate = this.parseRegistrationDate(patent);
            if (!registrationDate) return;

            const category = this.getNormalizedCategory(patent);
            if (!seriesData[category]) {
                seriesData[category] = [];
            }
            categoriesSet.add(category);
            
            seriesData[category].push({
                name: patent.title,
                value: [
                    registrationDate.toISOString().split('T')[0],
                    category,
                    patent.priority_score || 5
                ],
                patentNumber: patent.patent_number,
                category: category,
                priority: patent.priority_score || 5,
                itemStyle: {
                    color: categoryColors[category] || categoryColors['기타']
                }
            });
        });
        
        // ECharts 시리즈 형태로 변환
        const categories = Array.from(categoriesSet);
        const series = categories.map(category => ({
            name: category,
            type: 'scatter',
            data: seriesData[category],
            symbolSize: function(data) {
                return Math.max(data[2] * 2, 8); // 중요도에 따른 크기
            },
            itemStyle: {
                color: categoryColors[category] || categoryColors['기타']
            }
        }));
        
        return { series, categories };
    }
    
    /**
     * 차트 업데이트
     */
    updateCharts() {
        if (!window.patentManager || !window.patentManager.patents.length) return;
        
        // 각 차트별로 데이터 업데이트
        this.updateTechDistributionChart();
        this.updateYearlyRegistrationChart();
    }
    
    updateTechDistributionChart() {
        if (!this.charts.techDistribution) return;
        
        const patents = this.getActiveDataset();
        const categoryData = this.getCategoryDistribution(patents);
        
        this.charts.techDistribution.data.labels = categoryData.labels;
        this.charts.techDistribution.data.datasets[0].data = categoryData.values;
        this.charts.techDistribution.update();
    }
    
    updateYearlyRegistrationChart() {
        if (!this.charts.yearlyRegistration) return;
        
        const patents = this.getActiveDataset();
        const yearlyData = this.getYearlyDistribution(patents);
        
        this.charts.yearlyRegistration.data.labels = yearlyData.years;
        this.charts.yearlyRegistration.data.datasets[0].data = yearlyData.counts;
        this.charts.yearlyRegistration.update();
    }
    
    updateTimelineChart() {
        if (!this.charts.timeline) return;
        
        const patents = this.getActiveDataset();
        const timelineData = this.getTimelineData(patents);

        const container = document.getElementById('timeline-container');
        if (!timelineData.series.length) {
            if (this.charts.timeline && typeof this.charts.timeline.dispose === 'function') {
                this.charts.timeline.dispose();
                delete this.charts.timeline;
            }
            if (container) {
                container.innerHTML = '<div class="text-center text-gst-gray py-12">표시할 타임라인 데이터가 없습니다.</div>';
            }
            return;
        }

        this.charts.timeline.setOption({
            legend: { data: timelineData.categories },
            yAxis: { data: timelineData.categories },
            series: timelineData.series
        }, true);
    }
    
    /**
     * 차트 리사이즈
     */
    resizeCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart && chart.resize) {
                chart.resize();
            }
        });
    }
    
    /**
     * 차트 새로고침
     */
    refreshCharts() {
        if (!this.initialized) {
            this.init();
        } else {
            this.updateCharts();
        }
    }
    
    /**
     * 차트 파괴 (메모리 정리)
     */
    destroy() {
        Object.values(this.charts).forEach(chart => {
            if (chart && chart.destroy) {
                chart.destroy();
            }
        });
        this.charts = {};
    }
}

// 전역 차트 매니저 인스턴스
let chartManager;

// 초기화
function initializeCharts() {
    if (typeof Chart !== 'undefined' && typeof echarts !== 'undefined') {
        // Chart.js 한글 폰트 설정
        Chart.defaults.font.family = 'Noto Sans KR, sans-serif';
        
        if (!chartManager) {
            chartManager = new ChartManager();
            
            // 전역 접근을 위해 window 객체에 추가
            window.chartManager = chartManager;
            
            // 윈도우 리사이즈 이벤트 리스너 (한 번만 바인딩)
            if (!window.__gstChartResizeBound) {
                window.addEventListener('resize', () => {
                    if (chartManager) {
                        chartManager.resizeCharts();
                    }
                });
                window.__gstChartResizeBound = true;
            }
        }
        
        chartManager.init().catch(error => {
            console.error('❌ 차트 초기화에 실패했습니다:', error);
        });
        
        console.log('📊 차트 시스템 초기화 호출 완료');
    } else {
        console.warn('⚠️ 차트 라이브러리가 로드되지 않음');
    }
}

// DOM 로드 완료 후 자동 초기화 제거
// main.js에서 데이터 로딩 후 명시적으로 initializeCharts() 호출
// 전역 접근을 위해 window에 노출
window.initializeChartsFunction = initializeCharts;

// 전역 함수로 노출
window.initializeCharts = initializeCharts;
