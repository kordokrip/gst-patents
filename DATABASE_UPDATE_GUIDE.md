# 데이터베이스 업데이트 가이드

## 📊 개요

GST 특허 데이터베이스를 엑셀 파일과 PDF 원문을 기반으로 업데이트하는 전체 프로세스입니다.

## 🎯 업데이트 완료 내역

### 1. 데이터 소스
- **엑셀 파일**: `db/GST 지식재산권 관리현황_20250924.xlsx`
  - 총 **190개** 특허 데이터
  - 시트: "GST 지식재산권 현황_최신"
  - 컬럼: NO, 권리, 상태, 출원국, 출원일, 출원번호, 등록일, 등록번호, 명칭, 존속여부 등

- **PDF 파일**: `db/pdf/*.pdf`
  - 총 **75개** PDF 원문
  - **65개** 자동 매칭 성공 (86.7%)

### 2. 데이터베이스 통계

```
총 특허 수: 190개

카테고리별:
  - scrubber: 107개 (56.3%)
  - other: 38개 (20.0%)
  - chiller: 32개 (16.8%)
  - plasma: 5개 (2.6%)
  - gas-treatment: 4개 (2.1%)
  - temperature: 4개 (2.1%)

상태별:
  - 등록: 68개 (35.8%)
  - 포기: 47개 (24.7%)
  - 출원: 36개 (18.9%)
  - 거절: 28개 (14.7%)
  - 취소: 8개 (4.2%)
  - unknown: 3개 (1.6%)

PDF 매칭: 65개 (34.2%)
```

## 🚀 실행 단계

### Step 1: 로컬 SQLite 데이터베이스 생성

```bash
python scripts/update_patent_database.py
```

**작업 내용:**
1. 엑셀 파일에서 190개 특허 데이터 추출
2. PDF 파일과 특허번호 자동 매칭 (65개 성공)
3. 카테고리 자동 분류 (키워드 기반)
4. SQLite 데이터베이스 생성 (`db/patents.db`)
5. JSON 파일 생성 (`db/patents_data.json`)

**생성 파일:**
- `db/patents.db` - SQLite 데이터베이스
- `db/patents_data.json` - JSON 형식 데이터 (웹 앱용)
- `db/patents.db.backup` - 기존 DB 백업

### Step 2: D1 스키마 마이그레이션

```bash
wrangler d1 execute gst_patents_db \
  --file migrations/0004_import_excel_data.sql \
  --remote
```

**작업 내용:**
1. `patents` 테이블에 새 컬럼 추가:
   - `right_type` - 권리 구분 (특허/실용신안)
   - `country` - 출원국
   - `interim_status` - 중간사항/최종결과
   - `maintenance_status` - 존속여부
   - 기타 관리 필드

2. 통계용 뷰 생성:
   - `v_patent_statistics` - 전체 통계
   - `v_category_stats` - 카테고리별 통계
   - `v_yearly_stats` - 연도별 통계

### Step 3: D1 데이터 업로드

```bash
python scripts/simple_d1_upload.py
```

**작업 내용:**
1. `patents_data.json`에서 데이터 로드
2. 배치 단위 (15개씩) SQL INSERT 문 생성
3. Cloudflare D1에 업로드
4. 발명자, 키워드, 검색 인덱스 함께 업로드

**진행 상황:**
- 총 13개 배치 (190개 특허 ÷ 15)
- 각 배치마다 1초 대기 (API 제한 회피)
- 예상 소요 시간: 약 3-5분

## 📁 파일 구조

### 생성된 파일
```
db/
├── patents.db              # 로컬 SQLite DB
├── patents.db.backup       # 백업 파일
└── patents_data.json       # JSON 데이터 (웹용)

migrations/
└── 0004_import_excel_data.sql  # D1 스키마 마이그레이션

scripts/
├── update_patent_database.py   # 로컬 DB 생성 스크립트
├── simple_d1_upload.py         # D1 업로드 스크립트
└── upload_to_d1.py            # 고급 업로드 스크립트 (미사용)
```

## 🔍 데이터 검증

### 로컬 SQLite 확인

```bash
sqlite3 db/patents.db "SELECT COUNT(*) FROM patents"
sqlite3 db/patents.db "SELECT category, COUNT(*) FROM patents GROUP BY category"
```

### D1 확인

```bash
# 총 특허 수
wrangler d1 execute gst_patents_db \
  --command "SELECT COUNT(*) FROM patents" \
  --remote

# 카테고리별 통계
wrangler d1 execute gst_patents_db \
  --command "SELECT * FROM v_category_stats" \
  --remote

# 상태별 통계
wrangler d1 execute gst_patents_db \
  --command "SELECT status, COUNT(*) FROM patents GROUP BY status" \
  --remote
```

## 🎨 프론트엔드 연동

### API 엔드포인트

기존 API는 그대로 사용 가능합니다:

```
GET /api/patents?page=1&limit=20&category=scrubber
GET /api/patents?id=KR102795314
GET /api/search?q=스크러버&page=1&limit=20
GET /api/stats
```

### JavaScript 업데이트 필요 사항

1. **`js/api-client.js`** - 이미 D1 지원 완료
2. **`js/patents.js`** - 새 필드 표시 추가:
   - 권리 구분 (특허/실용신안)
   - 존속 여부
   - 적용 제품군

3. **`js/charts.js`** - 새 차트 추가:
   - 권리별 통계 (특허 vs 실용신안)
   - 존속 여부별 통계

## 📊 데이터 품질

### 완성도
- ✅ 특허 번호: 100% (190/190)
- ✅ 특허 명칭: 99.5% (189/190)
- ✅ 등록일: 95%
- ✅ 출원일: 98%
- ✅ PDF 원문: 34% (65/190)

### 매칭 실패 PDF
- 10개의 PDF가 특허번호 없이 명칭으로만 저장됨
- 수동 매칭 필요:
  - "능동형 에너지 세이빙 스크러버.pdf"
  - "스크러버 고착 파우더의 자동 세정 방법 및 자동 세정장치.pdf"
  - "복수의 버닝챔버를 구비한 스크러버.pdf"
  - 등 10개

## 🔄 향후 업데이트 방법

### 엑셀 파일 업데이트 시

1. 엑셀 파일을 `db/` 폴더에 저장
2. 스크립트 실행:
   ```bash
   python scripts/update_patent_database.py
   python scripts/simple_d1_upload.py
   ```

### PDF 파일 추가 시

1. PDF를 `db/pdf/` 폴더에 저장
2. 파일명에 특허번호 포함 (예: `10-1234567_제목.pdf`)
3. 스크립트 재실행하면 자동 매칭

## 🐛 문제 해결

### 업로드 타임아웃
```python
# simple_d1_upload.py에서 배치 크기 조정
upload_to_d1(batch_size=10)  # 기본값: 15
```

### PDF 매칭 실패
```python
# update_patent_database.py의 match_pdf_to_patent 함수 확인
# PDF 파일명 형식: {특허번호}_{제목}.pdf 권장
```

### D1 용량 확인
```bash
wrangler d1 info gst_patents_db
```

## 📈 성능 최적화

### 인덱스
자동 생성된 인덱스:
- `idx_patents_right_type`
- `idx_patents_status`
- `idx_patents_maintenance_status`
- `idx_patents_category`

### FTS5 검색
- `patent_search` 테이블에 전체 텍스트 검색 인덱스 생성됨
- 제목, 초록, 기술분류, 원문 텍스트 검색 가능

## ✅ 체크리스트

- [x] 엑셀 데이터 파싱 (190개)
- [x] PDF 자동 매칭 (65개)
- [x] SQLite DB 생성
- [x] JSON 파일 생성
- [x] D1 스키마 마이그레이션
- [ ] D1 데이터 업로드 (진행 중)
- [ ] 프론트엔드 업데이트
- [ ] 배포 및 테스트

## 📞 지원

문제 발생 시:
1. 로그 확인: 스크립트 실행 출력
2. D1 상태 확인: `wrangler d1 info gst_patents_db`
3. 백업 복원: `db/patents.db.backup` 사용
