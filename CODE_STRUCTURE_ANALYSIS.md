# GST 특허 관리 시스템 - 코드 구조 분석 및 리팩토링 전략

## 📊 파일 크기 분석

```
총 라인 수: 7,722줄
├── js/legacy/patents.js          1,789줄 (23.2%) - 레거시 패턴 매니저
├── js/main.js                    1,385줄 (17.9%) - 메인 UI/이벤트 핸들러
├── js/patents-refactored.js      1,236줄 (16.0%) - 특허 데이터 관리 (현재)
├── js/charts.js                    943줄 (12.2%) - 차트/통계 시각화
├── js/enhanced-search.js           780줄 (10.1%) - 고급 검색 기능
├── js/timeline.js                  774줄 (10.0%) - 타임라인 매니저
├── js/legacy/data-parser.js        462줄 (6.0%)  - 레거시 데이터 파서
├── js/legacy/api-client.js         238줄 (3.1%)  - 레거시 API 클라이언트
├── js/debug-charts.js              115줄 (1.5%)  - 디버그 도구
└── js/api-client.js                  0줄 (0.0%)  - 빈 파일
```

## 🔍 파일별 상세 분석

### 1. 핵심 파일 (현재 사용 중)

#### js/patents-refactored.js (1,236줄)
**목적**: 특허 데이터 관리 및 정규화
**주요 클래스**: `PatentManager`
**핵심 메서드**:
- `constructor()`: 초기화
- `loadPatents()`: 데이터 로드
- `normalizePatents()`: 데이터 정규화 ⭐
- `cleanInventors()`: 발명자 필터링 ⭐
- `normalizePriorityScore()`: 점수 정규화 ⭐
- `render()`: UI 렌더링
- `updateStats()`: 통계 업데이트

**문제점**: 길이가 길고, 데이터 정규화 로직이 중앙집중식
**개선 제안**: 데이터 정규화 유틸리티 분리

---

#### js/charts.js (943줄)
**목적**: 차트 및 통계 시각화
**주요 클래스**: `ChartManager`
**핵심 메서드**:
- `init()`: 초기화
- `getNormalizedInventors()`: 발명자 정규화 ⭐
- `getNormalizedStatus()`: 상태값 정규화 ⭐
- `getNormalizedCategory()`: 카테고리 정규화 ⭐
- `getCategoryDistribution()`: 카테고리 분포
- `getInventorDistribution()`: 발명자 분포
- `getStatusDistribution()`: 상태 분포
- `getPriorityScoreDistribution()`: 우선순위 분포

**문제점**: 정규화 로직이 중복 (patents-refactored.js와 비슷)
**개선 제안**: 정규화 유틸리티 공유

---

#### js/main.js (1,385줄)
**목적**: 메인 UI 및 이벤트 핸들링
**주요 기능**:
- DOM 초기화 및 이벤트 바인딩
- 검색 및 필터링
- 페이지네이션
- 팝업 및 모달 관리
- 테마 전환

**문제점**: 너무 많은 책임을 가짐 (단일 책임 원칙 위배)
**개선 제안**: 기능별 모듈로 분리

---

#### js/enhanced-search.js (780줄)
**목적**: 고급 검색 기능
**주요 기능**:
- 검색어 자동완성
- 필터링 로직
- 검색 결과 랭킹

**문제점**: main.js와 기능 겹침
**개선 제안**: 통합 또는 명확한 책임 분리

---

#### js/timeline.js (774줄)
**목적**: 타임라인 및 특허 상세보기
**주요 클래스**: `TimelineManager`
**주요 메서드**:
- `refresh()`: 타임라인 갱신
- `viewPatentDetail()`: 상세보기 모달

**상태**: 잘 구조화됨

---

### 2. 레거시 파일 (사용되지 않거나 중복)

#### js/legacy/patents.js (1,789줄)
**상태**: ⚠️ 레거시 코드 (현재 patents-refactored.js로 대체됨)
**문제점**:
- 시스템에서 직접 사용되지 않음
- patents-refactored.js와 중복
- 약 550줄의 샘플 데이터 포함

**권장사항**: 삭제 가능 (Git 히스토리 남음)

---

#### js/legacy/data-parser.js (462줄)
**상태**: ⚠️ 레거시 코드
**기능**: 특허 문서 파싱
**문제점**:
- patents-refactored.js의 normalizePatents()로 대체됨
- 현재 사용되지 않음

**권장사항**: 필요시 참조용으로 보관, 불필요하면 삭제

---

#### js/legacy/api-client.js (238줄)
**상태**: ⚠️ 레거시 코드
**기능**: API 호출 관리
**문제점**: 미사용 상태

**권장사항**: 삭제

---

#### js/api-client.js (0줄)
**상태**: ❌ 빈 파일
**권장사항**: 삭제

---

#### js/debug-charts.js (115줄)
**상태**: ✅ 유용한 디버그 도구
**기능**: 콘솔 검증 함수
**권장사항**: 유지 (프로덕션에서는 조건부 로드)

---

## 📋 코드 정리 계획

### Phase 1: 레거시 코드 제거
```bash
# 삭제 대상
rm js/legacy/patents.js         # 1,789줄 (중복)
rm js/legacy/data-parser.js     # 462줄 (미사용)
rm js/legacy/api-client.js      # 238줄 (미사용)
rm js/api-client.js             # 0줄 (빈 파일)
rm js/legacy/                   # 레거시 폴더 전체

# 결과: 2,987줄 감소 → 4,735줄 (약 38.7% 감소)
```

### Phase 2: 코드 정규화 유틸리티 분리
**새 파일: `js/utils/data-normalizer.js`**
```javascript
/**
 * 데이터 정규화 유틸리티
 * 중복 로직을 한 곳에서 관리
 */

// PatentManager, ChartManager에서 사용하는 정규화 함수들
export class DataNormalizer {
    static cleanInventors(inventors) { ... }
    static normalizePriorityScore(score) { ... }
    static parseRegistrationDate(dateStr) { ... }
    static normalizeStatus(status) { ... }
    static normalizeCategory(category) { ... }
}
```

**효과**:
- 중복 로직 제거 (약 150줄 감소)
- 일관된 데이터 처리
- 유지보수 용이

### Phase 3: main.js 기능 분리
**새 파일들**:
- `js/modules/search-module.js`: 검색 기능
- `js/modules/ui-module.js`: UI 관리
- `js/modules/event-module.js`: 이벤트 핸들링

**효과**:
- main.js를 600줄 이하로 축소
- 각 모듈 단일 책임
- 테스트 용이

### Phase 4: 최종 구조
```
js/
├── patents-refactored.js    (900줄로 축소)
├── charts.js                (800줄로 축소)
├── main.js                  (600줄로 축소)
├── enhanced-search.js       (유지)
├── timeline.js              (유지)
├── debug-charts.js          (유지)
└── utils/
    ├── data-normalizer.js   (새로 추가)
    ├── validation.js        (새로 추가)
    └── constants.js         (새로 추가)

삭제됨:
├── legacy/
├── api-client.js
```

**최종 라인 수**: ~3,500줄 (약 54% 감소)

---

## 🧪 유닛 테스트 계획

### 테스트 구조
```javascript
// js/tests/data-normalizer.test.js
describe('DataNormalizer', () => {
    describe('cleanInventors()', () => {
        it('should filter out address info', () => { ... })
        it('should remove "정보 없음"', () => { ... })
        it('should extract only names', () => { ... })
    })
    
    describe('normalizePriorityScore()', () => {
        it('should normalize to 1-10 range', () => { ... })
        it('should handle edge cases', () => { ... })
    })
    
    // ... 기타 테스트
})
```

### 테스트 대상 함수
1. **cleanInventors()** ⭐⭐⭐
   - 주소 정보 제거
   - 중복 제거
   - "정보 없음" 필터링

2. **normalizePriorityScore()** ⭐⭐⭐
   - 1-10 범위 정규화
   - 타입 변환 (문자→숫자)
   - 기본값 처리

3. **normalizeStatus()** ⭐⭐
   - 상태값 매핑
   - 다국어 지원

4. **normalizeCategory()** ⭐⭐
   - 카테고리 매핑
   - 미지정값 처리

5. **getStatusDistribution()** ⭐⭐
   - 상태별 카운팅
   - 정규화된 상태값 사용

6. **getCategoryDistribution()** ⭐⭐
   - 카테고리별 카운팅
   - 레이블/값 정렬

---

## 🔗 의존성 분석

```
patents-refactored.js (PatentManager)
├── Depends on: JSON 데이터
├── Used by: main.js, charts.js, timeline.js
└── Exports: window.patentManager

charts.js (ChartManager)
├── Depends on: PatentManager.patents
├── Depends on: Chart.js library
├── Used by: main.js
└── Exports: window.chartManager

main.js
├── Depends on: PatentManager, ChartManager
├── Depends on: HTML DOM
├── Used by: index.html
└── Exports: Global functions

enhanced-search.js
├── Depends on: PatentManager.patents
├── Used by: main.js
└── Exports: Global search functions

timeline.js (TimelineManager)
├── Depends on: PatentManager
├── Used by: main.js (onclick handlers)
└── Exports: window.timelineManager
```

---

## ✅ 리팩토링 체크리스트

- [ ] Phase 1: 레거시 파일 백업 및 삭제
  - [ ] git tag v3.6.0-pre-refactor (현재 상태 백업)
  - [ ] 레거시 파일 삭제
  - [ ] Git 커밋

- [ ] Phase 2: 데이터 정규화 유틸리티 분리
  - [ ] js/utils/data-normalizer.js 생성
  - [ ] patents-refactored.js에서 정규화 로직 이동
  - [ ] charts.js에서 정규화 로직 이동
  - [ ] 임포트 경로 수정
  - [ ] 테스트

- [ ] Phase 3: main.js 기능 분리
  - [ ] 모듈 구조 설계
  - [ ] 개별 모듈 파일 생성
  - [ ] 이벤트 통합
  - [ ] 테스트

- [ ] Phase 4: 유닛 테스트 추가
  - [ ] Jest 또는 Vitest 설치
  - [ ] 테스트 파일 작성
  - [ ] 테스트 실행 및 통과

---

## 🎯 리팩토링 우선순위

| 순위 | 작업 | 영향도 | 난이도 | 예상 시간 |
|------|------|--------|--------|----------|
| 1 | 레거시 파일 삭제 | 높음 | 낮음 | 10분 |
| 2 | 데이터 정규화 유틸리티 분리 | 높음 | 중간 | 1시간 |
| 3 | 유닛 테스트 추가 | 높음 | 중간 | 2시간 |
| 4 | main.js 기능 분리 | 중간 | 높음 | 3시간 |

---

## 📈 기대 효과

### 코드 품질
- 중복 코드 제거 (150줄)
- 단일 책임 원칙 준수
- 테스트 커버리지 증가

### 유지보수성
- 파일 크기 감소 (54%)
- 의존성 명확화
- 모듈식 구조

### 성능
- 번들 크기 감소 (약 20KB)
- 로드 시간 단축

### 개발 생산성
- 버그 찾기 용이
- 새 기능 추가 용이
- 온보딩 시간 단축
