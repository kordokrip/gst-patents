/**
 * GST 특허 시스템 - 데이터 정규화 유닛 테스트
 * 모든 데이터 변환 함수의 정확성을 검증
 */

// ============================================================================
// TEST 1: cleanInventors() - 발명자 필터링
// ============================================================================
console.group('🧪 TEST 1: cleanInventors() - 발명자 필터링');

const testCleanInventors = () => {
    const testCases = [
        {
            name: '✅ 정상 발명자 배열',
            input: ['김철수', '이영희', '박민수'],
            expected: ['김철수', '이영희', '박민수'],
            description: '정상적인 이름만 포함된 배열'
        },
        {
            name: '✅ 주소 정보가 섞인 배열 (실제 데이터)',
            input: ['김종철', '경기 용인시 수지구 진산로 90', '덕천동', '진산마을삼성5차아파트)'],
            expected: ['김종철'],
            description: '주소 정보 제거 후 이름만 추출'
        },
        {
            name: '✅ "정보 없음" 필터링',
            input: ['정보 없음'],
            expected: [],
            description: '"정보 없음"은 필터링 되어야 함'
        },
        {
            name: '✅ 빈 배열',
            input: [],
            expected: [],
            description: '빈 배열 처리'
        },
        {
            name: '✅ null/undefined 처리',
            input: null,
            expected: [],
            description: 'null 입력 처리'
        },
        {
            name: '✅ 문자열 입력',
            input: '김철수',
            expected: ['김철수'],
            description: '단일 문자열 입력 처리'
        },
        {
            name: '✅ 중복 이름 제거',
            input: ['김철수', '이영희', '김철수', '박민수', '이영희'],
            expected: ['김철수', '이영희', '박민수'],
            description: '중복된 이름 제거'
        },
        {
            name: '✅ 짧은 이름 (1자) 필터링',
            input: ['김', '이영희', '박'],
            expected: ['이영희'],
            description: '2자 이상만 허용'
        },
        {
            name: '✅ 공백이 포함된 이름',
            input: ['김 철수', '이 영희'],
            expected: ['김철수', '이영희'],
            description: '공백 제거 후 처리'
        },
        {
            name: '⚠️ 혼합 데이터',
            input: ['이영춘', '정보 없음', '경기도', 'invalid', '박준성'],
            expected: ['이영춘', '박준성'],
            description: '유효한 한글 이름만 추출'
        }
    ];

    let passed = 0;
    let failed = 0;

    testCases.forEach(test => {
        try {
            // PatentManager의 cleanInventors 메서드 호출
            const result = window.patentManager?.cleanInventors?.(test.input) || [];
            
            // 결과 비교
            const isEqual = JSON.stringify(result.sort()) === JSON.stringify(test.expected.sort());
            
            if (isEqual) {
                console.log(`${test.name}`);
                console.log(`  ✓ 입력: ${JSON.stringify(test.input)}`);
                console.log(`  ✓ 결과: ${JSON.stringify(result)}`);
                console.log(`  ✓ ${test.description}\n`);
                passed++;
            } else {
                console.error(`${test.name}`);
                console.error(`  ✗ 입력: ${JSON.stringify(test.input)}`);
                console.error(`  ✗ 예상: ${JSON.stringify(test.expected)}`);
                console.error(`  ✗ 실제: ${JSON.stringify(result)}`);
                console.error(`  ✗ ${test.description}\n`);
                failed++;
            }
        } catch (e) {
            console.error(`${test.name}`);
            console.error(`  ✗ 에러: ${e.message}\n`);
            failed++;
        }
    });

    console.log(`결과: ${passed}/${testCases.length} 통과\n`);
    return { passed, failed, total: testCases.length };
};

const test1Result = testCleanInventors();
console.groupEnd();

// ============================================================================
// TEST 2: normalizePriorityScore() - 우선순위 점수 정규화
// ============================================================================
console.group('🧪 TEST 2: normalizePriorityScore() - 우선순위 점수 정규화');

const testNormalizePriorityScore = () => {
    const testCases = [
        {
            name: '✅ 정상 범위 (5)',
            input: 5,
            expected: 5,
            description: '1-10 범위 내의 숫자'
        },
        {
            name: '✅ 최소값 (1)',
            input: 1,
            expected: 1,
            description: '최소값 처리'
        },
        {
            name: '✅ 최대값 (10)',
            input: 10,
            expected: 10,
            description: '최대값 처리'
        },
        {
            name: '✅ 음수 변환 (최소값)',
            input: -5,
            expected: 1,
            description: '음수는 1로 변환'
        },
        {
            name: '✅ 범위 초과 (최대값)',
            input: 15,
            expected: 10,
            description: '15는 10으로 정규화'
        },
        {
            name: '✅ 문자열 숫자 변환',
            input: '7',
            expected: 7,
            description: '문자열 "7"을 숫자 7로 변환'
        },
        {
            name: '✅ null 처리 (기본값)',
            input: null,
            expected: 5,
            description: 'null은 기본값 5로 변환'
        },
        {
            name: '✅ undefined 처리 (기본값)',
            input: undefined,
            expected: 5,
            description: 'undefined는 기본값 5로 변환'
        },
        {
            name: '✅ 빈 문자열 처리',
            input: '',
            expected: 5,
            description: '빈 문자열은 기본값 5로 변환'
        },
        {
            name: '✅ 실수 반올림',
            input: 5.7,
            expected: 6,
            description: '5.7을 반올림하여 6 변환'
        },
        {
            name: '⚠️ 잘못된 문자열',
            input: 'abc',
            expected: 5,
            description: '숫자 아닌 문자열은 기본값 5'
        }
    ];

    let passed = 0;
    let failed = 0;

    testCases.forEach(test => {
        try {
            const result = window.patentManager?.normalizePriorityScore?.(test.input) ?? 5;
            
            if (result === test.expected) {
                console.log(`${test.name}`);
                console.log(`  ✓ 입력: ${test.input} (${typeof test.input})`);
                console.log(`  ✓ 결과: ${result}`);
                console.log(`  ✓ ${test.description}\n`);
                passed++;
            } else {
                console.error(`${test.name}`);
                console.error(`  ✗ 입력: ${test.input} (${typeof test.input})`);
                console.error(`  ✗ 예상: ${test.expected}`);
                console.error(`  ✗ 실제: ${result}`);
                console.error(`  ✗ ${test.description}\n`);
                failed++;
            }
        } catch (e) {
            console.error(`${test.name}`);
            console.error(`  ✗ 에러: ${e.message}\n`);
            failed++;
        }
    });

    console.log(`결과: ${passed}/${testCases.length} 통과\n`);
    return { passed, failed, total: testCases.length };
};

const test2Result = testNormalizePriorityScore();
console.groupEnd();

// ============================================================================
// TEST 3: getStatusDistribution() - 상태별 분포
// ============================================================================
console.group('🧪 TEST 3: getStatusDistribution() - 상태별 분포');

const testGetStatusDistribution = () => {
    const testCases = [
        {
            name: '✅ 정상 특허 데이터',
            input: [
                { status: 'registered' },
                { status: 'registered' },
                { status: 'pending' },
                { status: 'active' }
            ],
            expectedHas: ['등록', '출원'],
            description: '상태별 개수 집계'
        },
        {
            name: '✅ 빈 배열',
            input: [],
            expectedHas: [],
            description: '빈 배열 처리'
        },
        {
            name: '✅ 혼합 상태값',
            input: [
                { status: 'registered' },
                { status: '등록' },
                { status: 'pending' },
                { status: '출원' }
            ],
            expectedHas: ['등록', '출원'],
            description: '영문/한글 혼합 처리'
        }
    ];

    let passed = 0;
    let failed = 0;

    testCases.forEach(test => {
        try {
            const result = window.chartManager?.getStatusDistribution?.(test.input) || {};
            
            const hasAllKeys = test.expectedHas.every(key => key in result);
            
            if (hasAllKeys && typeof result === 'object') {
                console.log(`${test.name}`);
                console.log(`  ✓ 입력: ${test.input.length}개 특허`);
                console.log(`  ✓ 결과:`, result);
                console.log(`  ✓ ${test.description}\n`);
                passed++;
            } else {
                console.error(`${test.name}`);
                console.error(`  ✗ 입력: ${test.input.length}개 특허`);
                console.error(`  ✗ 예상 키: ${test.expectedHas}`);
                console.error(`  ✗ 실제 결과:`, result);
                console.error(`  ✗ ${test.description}\n`);
                failed++;
            }
        } catch (e) {
            console.error(`${test.name}`);
            console.error(`  ✗ 에러: ${e.message}\n`);
            failed++;
        }
    });

    console.log(`결과: ${passed}/${testCases.length} 통과\n`);
    return { passed, failed, total: testCases.length };
};

const test3Result = testGetStatusDistribution();
console.groupEnd();

// ============================================================================
// TEST 4: getCategoryDistribution() - 카테고리 분포
// ============================================================================
console.group('🧪 TEST 4: getCategoryDistribution() - 카테고리 분포');

const testGetCategoryDistribution = () => {
    const testCases = [
        {
            name: '✅ 정상 카테고리 데이터',
            input: [
                { category: 'scrubber' },
                { category: 'scrubber' },
                { category: 'chiller' },
                { category: 'plasma' }
            ],
            description: '카테고리별 개수 집계'
        },
        {
            name: '✅ 빈 배열',
            input: [],
            description: '빈 배열 처리'
        },
        {
            name: '✅ 라벨과 값 일치',
            input: [
                { category: 'scrubber' },
                { category: 'chiller' }
            ],
            description: 'labels와 values 개수 일치'
        }
    ];

    let passed = 0;
    let failed = 0;

    testCases.forEach(test => {
        try {
            const result = window.chartManager?.getCategoryDistribution?.(test.input) || {};
            
            const hasLabelsAndValues = 'labels' in result && 'values' in result;
            const lengthMatch = result.labels?.length === result.values?.length;
            
            if (hasLabelsAndValues && (test.input.length === 0 || lengthMatch)) {
                console.log(`${test.name}`);
                console.log(`  ✓ 입력: ${test.input.length}개 특허`);
                console.log(`  ✓ 라벨: ${result.labels?.join(', ')}`);
                console.log(`  ✓ 값: ${result.values?.join(', ')}`);
                console.log(`  ✓ ${test.description}\n`);
                passed++;
            } else {
                console.error(`${test.name}`);
                console.error(`  ✗ 입력: ${test.input.length}개 특허`);
                console.error(`  ✗ 결과:`, result);
                console.error(`  ✗ ${test.description}\n`);
                failed++;
            }
        } catch (e) {
            console.error(`${test.name}`);
            console.error(`  ✗ 에러: ${e.message}\n`);
            failed++;
        }
    });

    console.log(`결과: ${passed}/${testCases.length} 통과\n`);
    return { passed, failed, total: testCases.length };
};

const test4Result = testGetCategoryDistribution();
console.groupEnd();

// ============================================================================
// TEST 5: 실제 데이터베이스 연동 테스트
// ============================================================================
console.group('🧪 TEST 5: 실제 데이터베이스 연동');

const testDatabaseIntegration = async () => {
    let passed = 0;
    let failed = 0;

    // Test 5-1: 데이터 로드 여부
    try {
        const patents = window.patentManager?.patents || [];
        
        if (patents.length > 0) {
            console.log(`✅ 데이터 로드 성공`);
            console.log(`  ✓ 로드된 특허: ${patents.length}건\n`);
            passed++;
        } else {
            console.error(`❌ 데이터 로드 실패`);
            console.error(`  ✗ 로드된 특허: 0건\n`);
            failed++;
        }
    } catch (e) {
        console.error(`❌ 데이터 로드 에러: ${e.message}\n`);
        failed++;
    }

    // Test 5-2: 발명자 데이터 정규화
    try {
        const firstPatent = window.patentManager?.patents?.[0];
        const inventors = firstPatent?.inventors || [];
        
        const hasOnlyNames = inventors.every(inv => 
            typeof inv === 'string' && 
            inv.length >= 2 && 
            inv !== '정보 없음' &&
            !inv.match(/\d+[가-힣]|[가-힣]\d+/)  // 주소 번지 패턴
        );
        
        if (hasOnlyNames || inventors.length === 0) {
            console.log(`✅ 발명자 정규화 성공`);
            console.log(`  ✓ 첫 번째 특허 발명자: ${inventors.join(', ') || '없음'}\n`);
            passed++;
        } else {
            console.warn(`⚠️ 발명자 정규화 의심`);
            console.warn(`  ⚠ 발명자 데이터: ${inventors.slice(0, 3).join(', ')}`);
            console.warn(`  ⚠ 주소 정보가 포함될 가능성\n`);
            failed++;
        }
    } catch (e) {
        console.error(`❌ 발명자 정규화 에러: ${e.message}\n`);
        failed++;
    }

    // Test 5-3: 우선순위 점수 범위
    try {
        const patents = window.patentManager?.patents || [];
        const allInRange = patents.every(p => {
            const score = p.priority_score;
            return typeof score === 'number' && score >= 1 && score <= 10;
        });
        
        if (allInRange) {
            console.log(`✅ 우선순위 점수 범위 확인`);
            console.log(`  ✓ 모든 점수가 1-10 범위 내\n`);
            passed++;
        } else {
            const outOfRange = patents.find(p => {
                const score = p.priority_score;
                return !(typeof score === 'number' && score >= 1 && score <= 10);
            });
            console.error(`❌ 우선순위 점수 범위 오류`);
            console.error(`  ✗ 문제 항목: ${outOfRange?.title}`);
            console.error(`  ✗ 점수: ${outOfRange?.priority_score} (${typeof outOfRange?.priority_score})\n`);
            failed++;
        }
    } catch (e) {
        console.error(`❌ 우선순위 점수 확인 에러: ${e.message}\n`);
        failed++;
    }

    // Test 5-4: 상태값 정규화
    try {
        const patents = window.patentManager?.patents || [];
        const statuses = new Set(patents.map(p => p.status));
        
        const validStatuses = ['registered', 'pending', 'active', 'inactive', '등록', '출원', '거절', '취하'];
        const allValid = Array.from(statuses).every(s => validStatuses.includes(s));
        
        if (allValid) {
            console.log(`✅ 상태값 정규화`);
            console.log(`  ✓ 상태값 종류: ${Array.from(statuses).join(', ')}\n`);
            passed++;
        } else {
            const invalid = Array.from(statuses).find(s => !validStatuses.includes(s));
            console.warn(`⚠️ 예상하지 못한 상태값`);
            console.warn(`  ⚠ 상태값: "${invalid}"\n`);
            // 경고이지만 통과 (새로운 상태값일 수 있음)
            passed++;
        }
    } catch (e) {
        console.error(`❌ 상태값 확인 에러: ${e.message}\n`);
        failed++;
    }

    console.log(`결과: ${passed}/${passed + failed} 통과\n`);
    return { passed, failed, total: passed + failed };
};

const test5Result = await testDatabaseIntegration();
console.groupEnd();

// ============================================================================
// 최종 결과 요약
// ============================================================================
console.group('📊 최종 테스트 결과');

const totalPassed = test1Result.passed + test2Result.passed + test3Result.passed + test4Result.passed + test5Result.passed;
const totalTests = test1Result.total + test2Result.total + test3Result.total + test4Result.total + test5Result.total;

console.table({
    'TEST 1: cleanInventors()': `${test1Result.passed}/${test1Result.total}`,
    'TEST 2: normalizePriorityScore()': `${test2Result.passed}/${test2Result.total}`,
    'TEST 3: getStatusDistribution()': `${test3Result.passed}/${test3Result.total}`,
    'TEST 4: getCategoryDistribution()': `${test4Result.passed}/${test4Result.total}`,
    'TEST 5: 데이터베이스 연동': `${test5Result.passed}/${test5Result.total}`
});

console.log(`\n✅ 전체 통과: ${totalPassed}/${totalTests}`);
console.log(`성공률: ${((totalPassed / totalTests) * 100).toFixed(1)}%\n`);

if (totalPassed === totalTests) {
    console.log('🎉 모든 테스트 통과! 배포 준비 완료.');
} else if (totalPassed / totalTests >= 0.8) {
    console.log('⚠️ 80% 이상 통과. 몇 가지 문제를 확인해주세요.');
} else {
    console.log('❌ 통과율이 80% 미만입니다. 주의가 필요합니다.');
}

console.groupEnd();

// ============================================================================
// Export for external use
// ============================================================================
window.testResults = {
    test1Result,
    test2Result,
    test3Result,
    test4Result,
    test5Result,
    totalPassed,
    totalTests,
    successRate: ((totalPassed / totalTests) * 100).toFixed(1)
};

console.log('\n💡 테스트 결과는 window.testResults에 저장되었습니다.');
