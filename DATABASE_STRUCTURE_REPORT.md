# 📊 GST 특허 데이터베이스 구조 상세 보고서

**생성일**: 2025년 10월 25일  
**데이터베이스**: 로컬 SQLite + Cloudflare D1

---

## 🗄️ 데이터베이스 개요

### 데이터 소스 비교

| 구분 | 로컬 SQLite | Cloudflare D1 |
|------|-------------|---------------|
| **파일 위치** | `db/patents.db` | Remote (gst_patents_db) |
| **총 특허 수** | 190개 | 271개 |
| **파일 크기** | ~500KB | 2.65MB |
| **용도** | 로컬 개발, JSON 소스 | 프로덕션, 웹 서비스 |

---

## 📋 테이블 구조

### 1. `patents` (메인 특허 테이블)

#### 기본 필드 (21개)

| # | 컬럼명 | 타입 | 설명 | 예시 |
|---|--------|------|------|------|
| 0 | `id` | TEXT | **PRIMARY KEY**, 고유 식별자 | `KR100711940` |
| 1 | `patent_number` | TEXT | 특허번호 | `10-0711940` |
| 2 | `title` | TEXT | 특허 명칭 | `폐가스 정화처리장치용 습식 유닛` |
| 3 | `abstract` | TEXT | 요약 | (상세 설명) |
| 4 | `category` | TEXT | 카테고리 | `scrubber`, `chiller`, `plasma` |
| 5 | `technology_field` | TEXT | 기술 분야 | (분류) |
| 6 | `registration_date` | TEXT | 등록일 | `2007-04-20` |
| 7 | `application_date` | TEXT | 출원일 | `2006-01-15` |
| 8 | `publication_date` | TEXT | 공개일 | `2007-06-01` |
| 9 | `status` | TEXT | 상태 | `등록`, `포기`, `출원`, `거절` |
| 10 | `assignee` | TEXT | 출원인/양수인 | `GST (Global Standard Technology)` |
| 11 | `priority_score` | INTEGER | 우선순위 점수 | `5` (1-10) |
| 12 | `main_claims` | TEXT | 주요 청구항 | (텍스트) |
| 13 | `full_text` | TEXT | 전문 | (전체 내용) |
| 14 | `page_count` | INTEGER | 페이지 수 | `0` |
| 15 | `source_path` | TEXT | 소스 파일 경로 | (PDF 경로) |
| 16 | `extraction_date` | TEXT | 추출일 | `2025-10-25 18:52:07` |
| 17 | `ipc_classification` | TEXT | IPC 분류 | (국제 특허 분류) |
| 18 | `legal_status` | TEXT | 법적 상태 | (상세 상태) |
| 19 | `image_count` | INTEGER | 이미지 수 | `0` |
| 20 | `vector_embedding_ready` | INTEGER | 벡터 임베딩 준비 여부 | `0` (FALSE) |

#### D1 전용 추가 필드 (2개)

| # | 컬럼명 | 타입 | 기본값 | 설명 |
|---|--------|------|--------|------|
| 21 | `created_at` | TEXT | `datetime('now')` | 생성 시각 |
| 22 | `updated_at` | TEXT | `datetime('now')` | 수정 시각 |

#### 엑셀 통합 신규 필드 (12개) - D1에만 존재

| # | 컬럼명 | 타입 | 기본값 | 설명 |
|---|--------|------|--------|------|
| 23 | `right_type` | TEXT | NULL | 권리 구분 (특허/실용신안) |
| 24 | `country` | TEXT | `'국내'` | 국가 (한국/일본/미국/기타) |
| 25 | `interim_status` | TEXT | NULL | 중간 상태 |
| 26 | `has_original_certificate` | INTEGER | `0` | 원본 증서 보유 여부 |
| 27 | `maintenance_status` | TEXT | NULL | 존속 여부 (존속/소멸/포기 등) |
| 28 | `maintenance_reason` | TEXT | NULL | 존속 사유 |
| 29 | `evaluation_date` | TEXT | NULL | 평가일 |
| 30 | `right_duration_end` | TEXT | NULL | 권리 존속 기간 종료일 |
| 31 | `company_name` | TEXT | NULL | 출원인/양수인 상세 |
| 32 | `product_category` | TEXT | NULL | 제품군 |
| 33 | `remarks` | TEXT | NULL | 비고 |
| 34 | `application_number` | TEXT | NULL | 출원번호 |

**총 컬럼 수**: 
- 로컬 SQLite: **21개**
- Cloudflare D1: **35개** (기본 21 + 타임스탬프 2 + 엑셀 12)

---

### 2. `patent_inventors` (발명자 테이블)

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `id` | INTEGER | PRIMARY KEY (D1만 해당) |
| `patent_id` | TEXT | 외래키 → `patents(id)` |
| `name` | TEXT | 발명자 이름 |

**데이터 현황** (로컬 SQLite):
- 총 발명자 레코드: **467개**
- 고유 발명자 수: ~200명

#### 발명자별 특허 수 TOP 10

| 순위 | 발명자 | 특허 수 |
|------|--------|---------|
| 1 | 정종국 | 22개 |
| 2 | 전동근 | 19개 |
| 3 | 이기용 | 16개 |
| 4 | 김덕준 | 13개 |
| 5 | 신현욱 | 12개 |
| 6 | 최운선 | 11개 |
| 7 | 모선희 | 10개 |
| 7 | 김기범 | 10개 |
| 9 | 이현진 | 9개 |
| 9 | 박상준 | 9개 |

---

### 3. `patent_keywords` (키워드 테이블)

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `id` | INTEGER | PRIMARY KEY (D1만 해당) |
| `patent_id` | TEXT | 외래키 → `patents(id)` |
| `keyword` | TEXT | 기술 키워드 |

---

### 4. `patent_pages` (페이지별 텍스트)

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `id` | INTEGER | PRIMARY KEY (D1만 해당) |
| `patent_id` | TEXT | 외래키 → `patents(id)` |
| `page_number` | INTEGER | 페이지 번호 |
| `text` | TEXT | 페이지 내용 |

---

### 5. `patent_images` (이미지 정보)

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `id` | INTEGER | PRIMARY KEY (D1만 해당) |
| `patent_id` | TEXT | 외래키 → `patents(id)` |
| `page_number` | INTEGER | 페이지 번호 |
| `path` | TEXT | 이미지 경로 |
| `width` | INTEGER | 이미지 너비 |
| `height` | INTEGER | 이미지 높이 |
| `md5` | TEXT | MD5 해시 |
| `phash` | TEXT | Perceptual 해시 |
| `ocr_text` | TEXT | OCR 텍스트 |

---

### 6. `patent_search` (FTS5 전문 검색)

**가상 테이블** (Full-Text Search)

| 컬럼명 | 인덱싱 | 설명 |
|--------|--------|------|
| `patent_id` | UNINDEXED | 특허 ID (검색 제외) |
| `title` | INDEXED | 제목 |
| `abstract` | INDEXED | 요약 |
| `technology_field` | INDEXED | 기술 분야 |
| `full_text` | INDEXED | 전문 |

**내부 테이블**:
- `patent_search_data` - FTS5 블록 데이터
- `patent_search_idx` - FTS5 인덱스
- `patent_search_docsize` - 문서 크기
- `patent_search_config` - FTS5 설정

---

### 7. `users` (사용자 관리) - D1만 존재

| 컬럼명 | 타입 | 기본값 | 설명 |
|--------|------|--------|------|
| `id` | INTEGER | AUTO_INCREMENT | PRIMARY KEY |
| `email` | TEXT | UNIQUE | 이메일 (로그인 ID) |
| `password_hash` | TEXT | NOT NULL | 비밀번호 해시 |
| `name` | TEXT | NOT NULL | 사용자 이름 |
| `company` | TEXT | NULL | 소속 회사 |
| `role` | TEXT | `'user'` | 역할 (`admin` / `user`) |
| `status` | TEXT | `'active'` | 상태 (`active` / `inactive` / `suspended`) |
| `created_at` | TEXT | `datetime('now')` | 생성 시각 |
| `updated_at` | TEXT | `datetime('now')` | 수정 시각 |
| `last_login_at` | TEXT | NULL | 마지막 로그인 |

---

### 8. `pending_registrations` (가입 승인 대기) - D1만 존재

| 컬럼명 | 타입 | 기본값 | 설명 |
|--------|------|--------|------|
| `id` | INTEGER | AUTO_INCREMENT | PRIMARY KEY |
| `email` | TEXT | UNIQUE | 이메일 |
| `password_hash` | TEXT | NOT NULL | 비밀번호 해시 |
| `name` | TEXT | NOT NULL | 이름 |
| `company` | TEXT | NULL | 회사 |
| `reason` | TEXT | NULL | 가입 사유 |
| `status` | TEXT | `'pending'` | 상태 (`pending` / `approved` / `rejected`) |
| `created_at` | TEXT | `datetime('now')` | 신청 시각 |
| `processed_at` | TEXT | NULL | 처리 시각 |
| `processed_by` | TEXT | NULL | 처리자 (관리자 이메일) |
| `reject_reason` | TEXT | NULL | 거부 사유 |

---

## 📊 데이터 분포 통계

### 카테고리별 분포 (로컬 SQLite - 190개)

| 카테고리 | 개수 | 비율 |
|----------|------|------|
| 🌀 **scrubber** | 107개 | 56.3% |
| 📋 **other** | 38개 | 20.0% |
| ❄️ **chiller** | 32개 | 16.8% |
| ⚡ **plasma** | 5개 | 2.6% |
| 💨 **gas-treatment** | 4개 | 2.1% |
| 🌡️ **temperature** | 4개 | 2.1% |

### 카테고리별 분포 (Cloudflare D1 - 271개)

| 카테고리 | 개수 | 비율 |
|----------|------|------|
| 🌀 **scrubber** | 107개 | 39.5% |
| (NULL - 미분류) | 81개 | 29.9% |
| 📋 **other** | 38개 | 14.0% |
| ❄️ **chiller** | 32개 | 11.8% |
| ⚡ **plasma** | 5개 | 1.8% |
| 💨 **gas-treatment** | 4개 | 1.5% |
| 🌡️ **temperature** | 4개 | 1.5% |

### 상태별 분포 (로컬 SQLite - 190개)

| 상태 | 개수 | 비율 |
|------|------|------|
| ✅ **등록** | 68개 | 35.8% |
| ❌ **포기** | 47개 | 24.7% |
| 📝 **출원** | 36개 | 18.9% |
| 🚫 **거절** | 28개 | 14.7% |
| ⚠️ **취소** | 8개 | 4.2% |
| ❓ **unknown** | 3개 | 1.6% |

---

## 🔍 인덱스 구조

### 로컬 SQLite

```sql
CREATE INDEX idx_patents_category ON patents(category);
CREATE INDEX idx_patents_status ON patents(status);
CREATE INDEX idx_patents_registration_date ON patents(registration_date);
```

### D1 추가 인덱스 (예상)

- PRIMARY KEY 인덱스: `patents(id)`
- UNIQUE 인덱스: `users(email)`, `pending_registrations(email)`
- 외래키 인덱스: 각 관계 테이블의 `patent_id`

---

## 📦 샘플 데이터

### 특허 데이터 예시 (로컬 SQLite)

```
┌─────────────┬───────────────┬────────────────────────────┬─────────────┬────────┬───────────────────┐
│ id          │ patent_number │ title                      │ category    │ status │ registration_date │
├─────────────┼───────────────┼────────────────────────────┼─────────────┼────────┼───────────────────┤
│ KR100479935 │ 10-0479935    │ 이중 진공배관 및 그 제조방법 │ other       │ 포기   │ 2005-03-22        │
│ KR200341827 │ 20-0341827    │ 반도체 제조 설비의 온도 제어 │ temperature │ 포기   │ 2004-02-03        │
│ KR100711940 │ 10-0711940    │ 폐가스 정화처리장치용 습식   │ scrubber    │ 등록   │ 2007-04-20        │
│ KR100711941 │ 10-0711941    │ 폐가스 정화처리장치         │ scrubber    │ 취소   │ 2007-04-20        │
└─────────────┴───────────────┴────────────────────────────┴─────────────┴────────┴───────────────────┘
```

---

## 🔗 관계도 (ERD)

```
patents (1) ──── (N) patent_inventors
   │
   ├──── (N) patent_keywords
   │
   ├──── (N) patent_pages
   │
   └──── (N) patent_images

users (관리자) ──── (N) pending_registrations (처리자)
```

---

## 📝 주요 쿼리 예시

### 1. 카테고리별 특허 수 조회

```sql
SELECT 
    category,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM patents), 1) as percentage
FROM patents 
GROUP BY category 
ORDER BY count DESC;
```

### 2. 발명자별 특허 수 TOP 10

```sql
SELECT 
    name, 
    COUNT(*) as patent_count 
FROM patent_inventors 
GROUP BY name 
ORDER BY patent_count DESC 
LIMIT 10;
```

### 3. 전문 검색 (FTS5)

```sql
SELECT 
    p.id,
    p.patent_number,
    p.title,
    p.category
FROM patent_search ps
JOIN patents p ON p.id = ps.patent_id
WHERE patent_search MATCH '스크러버 AND 정화'
ORDER BY rank
LIMIT 10;
```

### 4. 최근 등록 특허 조회

```sql
SELECT 
    patent_number,
    title,
    category,
    registration_date
FROM patents
WHERE status = '등록'
ORDER BY registration_date DESC
LIMIT 20;
```

### 5. 특정 발명자의 특허 목록

```sql
SELECT 
    p.patent_number,
    p.title,
    p.category,
    p.status,
    pi.name as inventor
FROM patents p
JOIN patent_inventors pi ON p.id = pi.patent_id
WHERE pi.name = '정종국'
ORDER BY p.registration_date DESC;
```

### 6. 신규 필드 활용 (D1만 가능)

```sql
-- 권리 구분별 통계
SELECT 
    right_type,
    COUNT(*) as count
FROM patents
WHERE right_type IS NOT NULL
GROUP BY right_type;

-- 존속 여부별 통계
SELECT 
    maintenance_status,
    COUNT(*) as count
FROM patents
WHERE maintenance_status IS NOT NULL
GROUP BY maintenance_status;

-- 제품군별 통계
SELECT 
    product_category,
    COUNT(*) as count
FROM patents
WHERE product_category IS NOT NULL
GROUP BY product_category;
```

---

## 🎯 마이그레이션 히스토리

### 적용된 마이그레이션

1. **0001_initial_schema.sql**
   - 기본 테이블 생성 (patents, inventors, keywords, pages, images)
   - FTS5 전문 검색 테이블
   - 기본 인덱스

2. **0002_user_management.sql**
   - 사용자 관리 테이블 (`users`)
   - 가입 승인 테이블 (`pending_registrations`)

3. **0003_update_passwords.sql**
   - 기본 사용자 비밀번호 업데이트

4. **0004_import_excel_data.sql** ⭐
   - 엑셀 통합 신규 필드 **12개** 추가
   - `right_type`, `country`, `maintenance_status`, `product_category` 등

---

## 📈 데이터 품질 분석

### 완성도

| 항목 | 로컬 | D1 | 상태 |
|------|------|-----|------|
| 특허 기본 정보 | ✅ 100% | ✅ 100% | 완료 |
| 발명자 정보 | ✅ 467개 | ✅ 있음 | 완료 |
| 카테고리 분류 | ✅ 100% | ⚠️ 29.9% NULL | 개선 필요 |
| PDF 원문 연동 | ⚠️ 86.7% | - | 개선 필요 |
| 신규 필드 (엑셀) | ❌ 없음 | ⚠️ 부분적 | 데이터 입력 필요 |

### 개선 사항

1. **카테고리 분류**: D1의 81개 NULL 값 처리 필요
2. **PDF 매칭**: 10개 미매칭 파일 처리
3. **신규 필드 데이터**: 권리 구분, 존속 여부, 제품군 데이터 입력
4. **전문 검색**: FTS5 인덱스 최적화

---

## 🔧 데이터베이스 유지보수

### 백업

**로컬 SQLite**:
```bash
# 백업
cp db/patents.db db/patents.db.backup

# 복원
cp db/patents.db.backup db/patents.db
```

**Cloudflare D1**:
```bash
# 내보내기
wrangler d1 export gst_patents_db --remote > backup.sql

# 복원
wrangler d1 execute gst_patents_db --file backup.sql --remote
```

### 데이터 동기화

```bash
# 로컬 → D1
python3 scripts/simple_d1_upload.py

# 엑셀 → 로컬 SQLite
python3 scripts/update_patent_database.py
```

---

## 📞 문의

**프로젝트**: GST 특허관리시스템  
**데이터베이스 버전**: v3.0 (2025-10-25)  
**GitHub**: kordokrip/gst-patents

---

**생성일**: 2025-10-25  
**문서 버전**: 1.0  
**마지막 업데이트**: 2025-10-25 19:40
