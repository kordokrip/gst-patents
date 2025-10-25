# GST 특허 시스템 - 유닛 테스트 가이드

## 🧪 테스트 목표

각 데이터 정규화 함수의 정확성을 검증하고, 데이터베이스 연동이 올바르게 작동하는지 확인합니다.

## 📋 테스트 구성

### TEST 1: cleanInventors() - 발명자 필터링 (10가지 케이스)
```
✅ 정상 발명자 배열 → ['김철수', '이영희', '박민수']
✅ 주소 정보가 섞인 배열 → ['김종철'] (주소 제거)
✅ "정보 없음" 필터링 → []
✅ 빈 배열 → []
✅ null 처리 → []
✅ 문자열 입력 → ['김철수']
✅ 중복 이름 제거 → ['김철수', '이영희', '박민수']
✅ 짧은 이름 (1자) 필터링 → ['이영희']
✅ 공백이 포함된 이름 → ['김철수', '이영희']
⚠️ 혼합 데이터 → ['이영춘', '박준성']
```

**검증 항목**:
- ✓ 주소 정보(도시, 동, 번지) 제거
- ✓ 중복 제거
- ✓ "정보 없음" 필터링
- ✓ 2자 이상 한글 이름만 추출

---

### TEST 2: normalizePriorityScore() - 우선순위 점수 (11가지 케이스)
```
✅ 정상 범위 (5) → 5
✅ 최소값 (1) → 1
✅ 최대값 (10) → 10
✅ 음수 → 1
✅ 범위 초과 (15) → 10
✅ 문자열 숫자 변환 ('7') → 7
✅ null 처리 → 5 (기본값)
✅ undefined 처리 → 5 (기본값)
✅ 빈 문자열 처리 → 5 (기본값)
✅ 실수 반올림 (5.7) → 6
⚠️ 잘못된 문자열 ('abc') → 5 (기본값)
```

**검증 항목**:
- ✓ 1-10 범위 정규화
- ✓ 타입 변환 (문자→숫자)
- ✓ 기본값 처리 (null, undefined → 5)
- ✓ 반올림 처리

---

### TEST 3: getStatusDistribution() - 상태별 분포 (3가지 케이스)
```
✅ 정상 특허 데이터 → {'등록': 2, '출원': 1}
✅ 빈 배열 → {}
✅ 혼합 상태값 → {'등록': 2, '출원': 2}
```

**검증 항목**:
- ✓ 상태별 개수 집계
- ✓ 영문/한글 혼합 처리
- ✓ 빈 배열 처리

---

### TEST 4: getCategoryDistribution() - 카테고리 분포 (3가지 케이스)
```
✅ 정상 카테고리 데이터 → {labels: [...], values: [...]}
✅ 빈 배열 → {labels: [], values: []}
✅ 라벨과 값 일치 → labels.length === values.length
```

**검증 항목**:
- ✓ 카테고리별 개수 집계
- ✓ labels와 values 배열 일치
- ✓ 데이터 구조 정확성

---

### TEST 5: 실제 데이터베이스 연동 (4가지 항목)
```
✅ 데이터 로드 여부 → N건 로드됨
✅ 발명자 정규화 → 이름만 표시 (주소 제거)
✅ 우선순위 점수 범위 → 모두 1-10 범위
✅ 상태값 정규화 → registered, pending, active 등 유효한 값
```

**검증 항목**:
- ✓ patents-index.json 로드 완료
- ✓ 모든 발명자가 정규화됨
- ✓ 모든 점수가 1-10 범위
- ✓ 모든 상태값이 유효함

---

## 🚀 테스트 실행 방법

### 1. 페이지 로드 후 자동 실행
```
1. http://localhost:8000 접속
2. F12 콘솔 열기
3. 약 2-3초 후 자동으로 테스트 실행
4. 콘솔에서 결과 확인
```

### 2. 수동 실행
```javascript
// 콘솔에서 다시 테스트 실행
// (필요시 페이지 새로고침 후)
```

### 3. 개별 함수 테스트
```javascript
// 개별 함수 테스트
window.patentManager.cleanInventors(['김철수', '경기도']);
// → ['김철수']

window.patentManager.normalizePriorityScore(15);
// → 10

window.chartManager.getStatusDistribution(window.patentManager.patents);
// → {등록: 75, 출원: 5, 거절: 1}
```

---

## 📊 테스트 결과 해석

### 성공 (✅)
```
✅ 전체 통과: 31/31
성공률: 100.0%
🎉 모든 테스트 통과! 배포 준비 완료.
```

→ **결론**: 모든 함수가 정상 작동하며, 데이터베이스 연동도 완벽합니다. **배포 가능** ✅

---

### 경고 (⚠️)
```
⚠️ 전체 통과: 26/31
성공률: 83.9%
⚠️ 80% 이상 통과. 몇 가지 문제를 확인해주세요.
```

→ **대응**: 실패한 5가지 테스트를 확인하고 수정 필요

**확인 항목**:
```javascript
// 실패한 테스트 상세 확인
console.log(window.testResults);
// → 각 테스트별 상세 결과 출력
```

---

### 실패 (❌)
```
❌ 전체 통과: 15/31
성공률: 48.4%
❌ 통과율이 80% 미만입니다. 주의가 필요합니다.
```

→ **대응**: 즉시 코드 검토 및 수정 필요. 배포 금지

---

## 🔍 테스트 결과 상세 확인

### 콘솔 출력 구조
```
🧪 TEST 1: cleanInventors() - 발명자 필터링
├─ ✅ 정상 발명자 배열
├─ ✅ 주소 정보가 섞인 배열 (실제 데이터)
├─ ... (총 10개 케이스)
└─ 결과: 10/10 통과

🧪 TEST 2: normalizePriorityScore() - 우선순위 점수 정규화
├─ ✅ 정상 범위 (5)
├─ ... (총 11개 케이스)
└─ 결과: 11/11 통과

... (TEST 3, 4, 5)

📊 최종 테스트 결과
├─ TEST 1: 10/10
├─ TEST 2: 11/11
├─ TEST 3: 3/3
├─ TEST 4: 3/3
├─ TEST 5: 4/4
└─ ✅ 전체 통과: 31/31
```

---

## 💾 테스트 결과 저장

테스트 결과는 `window.testResults`에 자동 저장됩니다:

```javascript
window.testResults = {
    test1Result: { passed: 10, failed: 0, total: 10 },
    test2Result: { passed: 11, failed: 0, total: 11 },
    test3Result: { passed: 3, failed: 0, total: 3 },
    test4Result: { passed: 3, failed: 0, total: 3 },
    test5Result: { passed: 4, failed: 0, total: 4 },
    totalPassed: 31,
    totalTests: 31,
    successRate: "100.0"
}
```

**결과 내보내기**:
```javascript
// 결과를 JSON으로 내보내기
const resultJson = JSON.stringify(window.testResults, null, 2);
console.log(resultJson);
// → 파일로 저장 가능
```

---

## 🐛 문제 해결 가이드

### Q1: cleanInventors() 테스트 실패
```
❌ 주소 정보가 섞인 배열 (실제 데이터)
  ✗ 입력: [...주소 포함...]
  ✗ 예상: ['김종철']
  ✗ 실제: ['김종철', '경기도', ...]
```

**해결**:
```javascript
// patents-refactored.js의 cleanInventors() 확인
// 2-10자 한글 정규식이 정상 작동하는지 확인
// 주소 패턴 제거 로직 재검토
```

---

### Q2: normalizePriorityScore() 테스트 실패
```
❌ 범위 초과 (15)
  ✗ 입력: 15
  ✗ 예상: 10
  ✗ 실제: 15
```

**해결**:
```javascript
// Math.max/Math.min 함수 확인
normalizePriorityScore(score) {
    if (typeof score === 'number') {
        return Math.max(1, Math.min(10, Math.round(score))); // 이 부분 확인
    }
    ...
}
```

---

### Q3: 데이터베이스 연동 테스트 실패
```
❌ 데이터 로드 성공
  ✗ 로드된 특허: 0건
```

**해결**:
1. 데이터 로드 완료 대기 (2-3초)
2. 브라우저 콘솔에서 `window.patentManager.patents` 확인
3. 네트워크 탭에서 `patents-index.json` 로드 여부 확인

---

## 📝 테스트 체크리스트

배포 전 최종 검증:

- [ ] 모든 유닛 테스트 100% 통과
- [ ] 발명자 정보가 정규화됨 (주소 제거)
- [ ] 우선순위 점수가 1-10 범위
- [ ] 상태값이 유효함
- [ ] 카테고리 분포가 정확함
- [ ] 콘솔 에러 없음
- [ ] 모든 차트 렌더링 정상
- [ ] 상세보기 모달 작동 정상
- [ ] PDF 링크 작동 정상

---

## 🎯 다음 단계

### 테스트 통과 후
```bash
# 1. Git 커밋
git add js/unit-tests.js CODE_STRUCTURE_ANALYSIS.md index.html
git commit -m "test: 유닛 테스트 추가 및 코드 구조 분석 문서"

# 2. 배포
npx wrangler pages deploy

# 3. Production 승격
# Cloudflare 대시보드에서 수동 승격
```

### 테스트 실패 시
```bash
# 1. 실패 원인 파악
# 콘솔 출력 및 window.testResults 확인

# 2. 코드 수정
# 해당 함수 수정 후 다시 테스트

# 3. 반복
# 100% 통과될 때까지 반복
```

---

## 📚 참고

- [CODE_STRUCTURE_ANALYSIS.md](CODE_STRUCTURE_ANALYSIS.md) - 코드 구조 분석
- [CHART_FIX_VERIFICATION.md](CHART_FIX_VERIFICATION.md) - 차트 수정 검증 가이드
- [window.debugCharts()](js/debug-charts.js) - 차트 디버그 도구
