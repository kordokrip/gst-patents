/**
 * 차트 데이터 검증 스크립트
 * 브라우저 콘솔에서 실행: window.debugCharts()
 */

window.debugCharts = function() {
    console.clear();
    console.log('='.repeat(60));
    console.log('🔍 GST 특허 차트 데이터 검증 시작');
    console.log('='.repeat(60));
    
    // 1. 데이터 로드 상태 확인
    if (!window.patentManager) {
        console.error('❌ PatentManager가 초기화되지 않음');
        return;
    }
    
    const patents = window.patentManager.patents;
    if (!patents || patents.length === 0) {
        console.error('❌ 특허 데이터가 로드되지 않음');
        return;
    }
    
    console.log(`✅ 특허 데이터 로드 완료: ${patents.length}건\n`);
    
    // 2. 첫 3개 특허 상세 데이터
    console.log('='.repeat(60));
    console.log('📋 첫 3개 특허 데이터 상세');
    console.log('='.repeat(60));
    patents.slice(0, 3).forEach((p, i) => {
        console.group(`특허 ${i + 1}: ${p.title.substring(0, 30)}...`);
        console.log('ID:', p.id);
        console.log('Inventors:', p.inventors);
        console.log('Category:', p.category);
        console.log('Priority Score:', p.priority_score, '(type:', typeof p.priority_score + ')');
        console.log('Status:', p.status);
        console.log('Registration Date:', p.registration_date);
        console.groupEnd();
    });
    
    // 3. 발명자 데이터 검증
    console.log('\n' + '='.repeat(60));
    console.log('👥 발명자 데이터 검증');
    console.log('='.repeat(60));
    
    if (!window.chartManager) {
        console.error('❌ ChartManager가 초기화되지 않음');
        return;
    }
    
    const inventorDist = window.chartManager.getInventorDistribution(patents);
    console.log('발명자별 특허 수 TOP 10:');
    console.table(inventorDist);
    
    // 4. 상태 분포
    console.log('\n' + '='.repeat(60));
    console.log('📊 상태 분포');
    console.log('='.repeat(60));
    const statusDist = window.chartManager.getStatusDistribution(patents);
    console.table(statusDist);
    
    // 5. 카테고리 분포
    console.log('\n' + '='.repeat(60));
    console.log('🏷️ 카테고리 분포');
    console.log('='.repeat(60));
    const categoryDist = window.chartManager.getCategoryDistribution(patents);
    console.log('Labels:', categoryDist.labels);
    console.log('Values:', categoryDist.values);
    console.table(
        categoryDist.labels.map((label, i) => ({
            '기술분야': label,
            '특허 수': categoryDist.values[i]
        }))
    );
    
    // 6. 우선순위 점수 분포
    console.log('\n' + '='.repeat(60));
    console.log('⭐ 우선순위 점수 분포');
    console.log('='.repeat(60));
    const priorityDist = window.chartManager.getPriorityScoreDistribution(patents);
    console.table(priorityDist);
    
    // 7. DOM 요소 확인
    console.log('\n' + '='.repeat(60));
    console.log('🎨 DOM 요소 확인');
    console.log('='.repeat(60));
    
    const elements = {
        'inventor-list': document.getElementById('inventor-list'),
        'top-categories': document.getElementById('top-categories'),
        'recent-trend': document.getElementById('recent-trend'),
        'priority-distribution': document.getElementById('priority-distribution'),
        'stat-registered': document.getElementById('stat-registered'),
        'stat-pending': document.getElementById('stat-pending'),
        'tech-distribution-chart': document.getElementById('tech-distribution-chart'),
        'yearly-registration-chart': document.getElementById('yearly-registration-chart')
    };
    
    Object.entries(elements).forEach(([name, elem]) => {
        if (elem) {
            console.log(`✅ ${name}: 존재 (${elem.children.length}개 자식요소)`);
        } else {
            console.warn(`⚠️ ${name}: 존재하지 않음`);
        }
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ 검증 완료');
    console.log('='.repeat(60));
};

// 페이지 로드 후 자동 실행
window.addEventListener('load', () => {
    console.log('💡 팁: window.debugCharts() 명령어로 전체 검증을 실행하세요');
});
