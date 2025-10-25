# 차트 데이터 정합성 수정 검증 가이드

## 수정 사항 요약

### 1. 발명자 데이터 정규화 ✅
**문제점**: `patents-index.json`의 `inventors` 배열에 주소 정보가 섞여 있음
```json
"inventors": [
  "김종철",
  "경기 용인시 수지구 진산로 90",  // ← 주소 정보
  "덕천동",                        // ← 주소 정보
  "진산마을삼성5차아파트)"          // ← 주소 정보
]
```

**해결책**:
- `patents-refactored.js`에 `cleanInventors()` 함수 추가
  - 2-10자 한글 이름만 추출
  - "정보 없음" 제외
  - 주소 정보 제거 (로직: 한글 이름만 유지)
  - 중복 제거

- `charts.js`의 `getNormalizedInventors()` 동일 로직 적용

### 2. 데이터 소스 통일 ✅
**문제점**: 
- `patents-index.json`: `status: "active"`, 발명자 원본
- `patents_data.json`: `status: "registered"/"pending"`, 발명자 정규화됨
- `charts.js`에서 혼재된 데이터 사용

**해결책**:
- `patents-index.json`을 기준으로 통일
- `normalizePatents()` 함수에서:
  - `cleanInventors()` 적용
  - `normalizePriorityScore()` 적용 (1-10 범위)
  - `parseRegistrationDate()` 적용 (Date 객체 생성)
  - `getNormalizedStatus()` 적용 ("등록"/"출원" 매핑)
  - `getNormalizedCategory()` 적용 (기술분야 매핑)

### 3. 이벤트 통합 ✅
**문제점**: `gst:patents-ready` 이벤트가 발생되지 않음
- `patents-refactored.js`에서 `patents-data-ready` 발생
- `main.js`에서 `gst:patents-ready` 리스닝

**해결책**:
- `notifyDataReady()`에서 양쪽 이벤트 모두 발생:
  ```javascript
  document.dispatchEvent(new CustomEvent('gst:patents-ready', ...))
  window.dispatchEvent(new CustomEvent('patents-data-ready', ...))
  ```

### 4. 차트 함수 정규화 ✅
**수정된 함수**:
- `parseRegistrationDate()`: 등록일자 파싱
- `getNormalizedInventors()`: 발명자 정규화
- `getNormalizedPriority()`: 우선순위 점수 정규화 (1-10)
- `getNormalizedCategory()`: 카테고리 정규화
- `getNormalizedStatus()`: 상태값 정규화
- `getCategoryDistribution()`: 카테고리별 분포
- `getInventorDistribution()`: 발명자별 분포
- `getStatusDistribution()`: 상태별 분포
- `getPriorityScoreDistribution()`: 우선순위 분포

## 검증 방법

### 브라우저 콘솔에서 실행:

```javascript
// 1. 전체 검증 (권장)
window.debugCharts()

// 2. 개별 확인
// 데이터 확인
window.patentManager.patents.slice(0, 3).forEach(p => {
    console.log('Title:', p.title);
    console.log('Inventors:', p.inventors);  // 이름만 출력되어야 함
    console.log('Priority:', p.priority_score);  // 1-10 숫자
    console.log('Status:', p.status);  // "registered"/"pending"/"active"
});

// 3. 차트 데이터 확인
console.log('발명자:', chartManager.getInventorDistribution(window.patentManager.patents));
console.log('상태:', chartManager.getStatusDistribution(window.patentManager.patents));
console.log('카테고리:', chartManager.getCategoryDistribution(window.patentManager.patents));
console.log('우선순위:', chartManager.getPriorityScoreDistribution(window.patentManager.patents));
```

## 예상 결과

### 발명자 데이터
✅ **Good**: `["김철수", "이영희", "박민수"]`
❌ **Bad**: `["김철수", "경기 용인시", "덕천동"]`

### 우선순위 점수
✅ **Good**: 숫자 1-10 (예: 5, 7, 10)
❌ **Bad**: 0, 11, NaN, undefined

### 상태값
✅ **Good**: `"registered"`, `"pending"`, `"active"`, `"등록"`, `"출원"`
❌ **Bad**: `"심사중"`, `"만료"` (매핑 오류)

### 위젯 렌더링
✅ **Good**: 
- `inventor-list`: 발명자 TOP 10이 메달(🥇🥈🥉)과 함께 표시
- `top-categories`: 기술분야 TOP 3이 그라디언트 카드로 표시
- `recent-trend`: 월별 트렌드 막대 차트 표시
- `priority-distribution`: 점수별 진행률 막대 표시
- `stat-registered/pending`: 상태별 개수 표시

❌ **Bad**: 데이터 없음, "NaN", 0건 표시

## 차트 데이터 흐름

```
1. 페이지 로드
   ↓
2. PatentManager.loadPatents()
   ↓
3. normalizePatents() - 발명자/점수/날짜 정규화
   ↓
4. notifyDataReady() - 이벤트 발생
   ↓
5. main.js 리스너 감지 (gst:patents-ready)
   ↓
6. chartManager.init() 호출
   ↓
7. initStatusDistributionChart()
   initPriorityScoreChart()
   initInventorChart()
   initTopCategories()
   initRecentTrend()
   ↓
8. DOM 위젯 업데이트 ✅
```

## 파일 변경 내역

### 수정된 파일
1. **js/patents-refactored.js**
   - `cleanInventors()` 추가
   - `normalizePriorityScore()` 추가
   - `normalizePatents()` 개선
   - `notifyDataReady()` 이벤트 통합

2. **js/charts.js**
   - `parseRegistrationDate()` 추가
   - `getNormalizedInventors()` 개선
   - `getNormalizedPriority()` 추가
   - `getNormalizedStatus()` 추가
   - `getNormalizedCategory()` 추가
   - `getCategoryDistribution()` 개선
   - `getInventorDistribution()` 개선
   - `getStatusDistribution()` 개선
   - `getPriorityScoreDistribution()` 개선
   - `initRecentTrend()` 개선

3. **js/debug-charts.js** (새로 추가)
   - `window.debugCharts()` 함수
   - 콘솔 검증 도구

4. **index.html**
   - `js/debug-charts.js` 스크립트 로드 추가

### 커밋
```
e3b0afe fix: 차트 데이터 정합성 개선 - 발명자 필터링, 데이터 정규화, 이벤트 통합
```

## 배포 체크리스트

- [x] 발명자 필터링 함수 구현
- [x] 데이터 정규화 함수 구현
- [x] 이벤트 통합
- [x] 디버그 도구 추가
- [x] Git 커밋
- [ ] 로컬 테스트 (브라우저 F12 → `window.debugCharts()`)
- [ ] 모든 위젯 렌더링 확인
- [ ] 상세보기 모달 작동 확인
- [ ] PDF 링크 작동 확인
- [ ] Cloudflare 배포
- [ ] Production 환경 테스트

## 주의사항

1. **캐시 정리**: 브라우저 캐시를 정리 후 테스트 (Ctrl+Shift+Delete)
2. **콘솔 확인**: F12 콘솔에서 에러 메시지 확인
3. **네트워크**: Network 탭에서 patents-index.json 로드 확인
4. **DateFormat**: 등록일자가 "2025-10-26" 형식이어야 함
5. **점수 범위**: 우선순위 점수는 반드시 1-10 범위

## 문제 해결

### 발명자가 여전히 표시되지 않는 경우
```javascript
// 원본 데이터 확인
window.patentManager.patents[0].inventors
// → 원본 데이터 확인

// 정규화된 데이터 확인
chartManager.getNormalizedInventors(window.patentManager.patents[0])
// → 정규화된 결과 확인
```

### 상태값 분포가 0인 경우
```javascript
// 상태값 확인
window.patentManager.patents.map(p => p.status).filter((v, i, a) => a.indexOf(v) === i)
// → 실제 상태값 확인

// 매핑 확인
chartManager.getNormalizedStatus(window.patentManager.patents[0])
// → 매핑된 상태값 확인
```

### 우선순위 점수가 NaN인 경우
```javascript
// 원본 점수 확인
window.patentManager.patents[0].priority_score
// → 원본 값의 타입 확인

// 정규화 확인
chartManager.getNormalizedPriority(window.patentManager.patents[0])
// → 정규화된 값 확인
```
