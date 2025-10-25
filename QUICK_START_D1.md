# 🚀 Cloudflare Workers + D1 빠른 시작 가이드

## ✅ 사전 준비 완료 사항
- ✓ Cloudflare Workers Paid 계정
- ✓ gst-patents.com 도메인 소유
- ✓ GitHub 리포지토리: kordokrip/gst-patents
- ✓ 로컬 SQLite DB: data/gst_patents.db (6.9MB, 81개 특허)

---

## 📋 5단계 배포 프로세스

### 1단계: Wrangler CLI 설치 및 로그인 (5분)

```bash
# Wrangler CLI 설치
npm install -g wrangler

# Cloudflare 로그인
wrangler login
# 브라우저가 열리면 승인 클릭

# 로그인 확인
wrangler whoami
```

---

### 2단계: D1 데이터베이스 생성 (2분)

```bash
# D1 데이터베이스 생성
wrangler d1 create gst_patents_db

# 출력 예시:
# ✅ Successfully created DB 'gst_patents_db'
# 
# [[d1_databases]]
# binding = "DB"
# database_name = "gst_patents_db"
# database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  ← 이 ID 복사!
```

**중요**: 출력된 `database_id`를 복사하세요!

#### wrangler.toml 파일 수정

`wrangler.toml` 파일을 열고 17번째 줄 수정:

```toml
[[d1_databases]]
binding = "DB"
database_name = "gst_patents_db"
database_id = "여기에_복사한_ID_붙여넣기"  # ← 실제 ID로 변경
```

변경사항 저장 후:

```bash
git add wrangler.toml
git commit -m "config: D1 database_id 설정"
git push origin main
```

---

### 3단계: 데이터베이스 스키마 및 데이터 마이그레이션 (10-15분)

#### 3.1 스키마 생성

```bash
# 테이블 생성
wrangler d1 migrations apply gst_patents_db

# 출력:
# ✅ Applying 0001_initial_schema.sql
# ✅ Migration complete

# 테이블 확인
wrangler d1 execute gst_patents_db --command="SELECT name FROM sqlite_master WHERE type='table'"
```

#### 3.2 데이터 추출 (로컬 DB → SQL 파일)

```bash
# Node.js 의존성 설치 (최초 1회)
npm install better-sqlite3

# 데이터 추출 실행
node scripts/export-to-d1.js

# 출력:
# 📂 로컬 SQLite 데이터베이스 로드 중...
# 📊 특허 데이터 추출 중...
#    ✓ 81개 특허 데이터 추출
# 📝 SQL 파일 생성 중... (N개 배치)
# ✅ 데이터 추출 완료!
```

#### 3.3 D1에 데이터 업로드

```bash
# 모든 배치 파일 자동 업로드 (권장)
for file in migrations/data/insert_batch_*.sql; do
  echo "📤 Uploading $(basename $file)..."
  wrangler d1 execute gst_patents_db --file="$file"
  sleep 1  # API 레이트 리밋 방지
done

# 또는 개별 파일 수동 업로드
wrangler d1 execute gst_patents_db --file=migrations/data/insert_batch_0001.sql
wrangler d1 execute gst_patents_db --file=migrations/data/insert_batch_0002.sql
# ...계속
```

#### 3.4 데이터 업로드 확인

```bash
# 총 특허 수 확인
wrangler d1 execute gst_patents_db --command="SELECT COUNT(*) as total FROM patents"

# 예상 출력: total = 81

# 카테고리별 통계
wrangler d1 execute gst_patents_db --command="SELECT category, COUNT(*) as count FROM patents GROUP BY category"

# 샘플 데이터 조회
wrangler d1 execute gst_patents_db --command="SELECT id, title FROM patents LIMIT 3"
```

---

### 4단계: 커스텀 도메인 설정 (5-10분)

#### 4.1 Cloudflare 대시보드에서 DNS 설정

1. **Cloudflare 대시보드 접속**
   - https://dash.cloudflare.com
   - Websites → gst-patents.com 선택

2. **DNS 레코드 추가**
   
   DNS 탭에서 다음 레코드 추가:

   ```
   Type: CNAME
   Name: @
   Target: gst-patents.pages.dev
   Proxy: ON (주황색 구름)
   TTL: Auto
   
   [Add Record] 클릭
   ```

   ```
   Type: CNAME
   Name: www
   Target: gst-patents.pages.dev
   Proxy: ON (주황색 구름)
   TTL: Auto
   
   [Add Record] 클릭
   ```

#### 4.2 Pages 프로젝트에 도메인 연결

1. **Workers & Pages 선택**
   - gst-patents 프로젝트 클릭

2. **Custom domains 탭**
   - "Set up a custom domain" 클릭
   - 도메인 입력: `gst-patents.com`
   - "Continue" → "Activate domain" 클릭

3. **www 서브도메인 추가**
   - "Add a custom domain" 클릭
   - 도메인 입력: `www.gst-patents.com`
   - "Continue" → "Activate domain" 클릭

#### 4.3 SSL/TLS 설정

1. **SSL/TLS 탭**
   - Overview → 암호화 모드: **Full (strict)** 선택
   - Edge Certificates → **Always Use HTTPS**: ON
   - **Automatic HTTPS Rewrites**: ON

---

### 5단계: 배포 및 테스트 (자동, 1-2분)

GitHub에 푸시하면 Cloudflare Pages가 자동 배포:

```bash
# 이미 완료됨 (3단계에서 push 완료)
# 추가 변경사항이 있다면:
git add .
git commit -m "final: 배포 준비 완료"
git push origin main
```

#### 배포 상태 확인

1. **Cloudflare Pages 대시보드**
   - Workers & Pages → gst-patents
   - "Latest deployments" 섹션에서 진행 상황 확인
   - "View build" 클릭하여 로그 확인

2. **배포 완료 대기**
   - 보통 1-2분 소요
   - Status: "Success" 확인

---

## 🧪 배포 후 API 테스트

### Health Check

```bash
curl https://gst-patents.com/api/health

# 예상 출력:
# {"status":"ok","timestamp":1706140800000}
```

### 특허 목록 조회

```bash
curl "https://gst-patents.com/api/patents?page=1&limit=5"

# 예상 출력:
# {
#   "data": [ ... 5개 특허 ... ],
#   "pagination": {
#     "page": 1,
#     "limit": 5,
#     "total": 81,
#     "totalPages": 17
#   }
# }
```

### 검색 테스트

```bash
curl "https://gst-patents.com/api/search?q=스크러버"

# 예상 출력:
# {
#   "query": "스크러버",
#   "data": [ ... 검색 결과 ... ],
#   "pagination": { ... }
# }
```

### 통계 조회

```bash
curl https://gst-patents.com/api/stats

# 예상 출력:
# {
#   "total": 81,
#   "byCategory": [ ... ],
#   "byStatus": [ ... ],
#   "byYear": [ ... ]
# }
```

### 브라우저에서 확인

1. **메인 페이지**
   - https://gst-patents.com
   - 특허 목록이 정상적으로 표시되는지 확인

2. **검색 기능**
   - 검색창에 "스크러버" 입력
   - 실시간 검색 결과 확인

3. **개발자 도구 확인**
   - F12 → Console 탭
   - `🚀 Patent API initialized: D1 Mode` 메시지 확인

---

## ✅ 최종 체크리스트

- [ ] Wrangler CLI 설치 및 로그인 완료
- [ ] D1 데이터베이스 생성 (`database_id` 확인)
- [ ] `wrangler.toml`에 `database_id` 입력 완료
- [ ] 스키마 마이그레이션 완료 (`wrangler d1 migrations apply`)
- [ ] 데이터 추출 완료 (`node scripts/export-to-d1.js`)
- [ ] D1에 데이터 업로드 완료 (81개 특허 확인)
- [ ] DNS 레코드 추가 (@ 및 www CNAME)
- [ ] Pages 프로젝트에 도메인 연결
- [ ] SSL/TLS 설정 (Full strict, Always HTTPS)
- [ ] 배포 완료 (Cloudflare Pages)
- [ ] API 테스트 통과 (health, patents, search, stats)
- [ ] 브라우저에서 정상 작동 확인

---

## 🎯 예상 소요 시간

| 단계 | 소요 시간 |
|------|----------|
| 1. Wrangler 설치 및 로그인 | 5분 |
| 2. D1 데이터베이스 생성 | 2분 |
| 3. 스키마 및 데이터 마이그레이션 | 10-15분 |
| 4. 커스텀 도메인 설정 | 5-10분 |
| 5. 배포 및 테스트 | 1-2분 |
| **총 소요 시간** | **약 25-35분** |

---

## 🚨 문제 해결

### D1 업로드 중 오류

```bash
# 오류: Rate limit exceeded
# 해결: 배치 파일 사이에 sleep 추가
for file in migrations/data/insert_batch_*.sql; do
  wrangler d1 execute gst_patents_db --file="$file"
  sleep 2  # 대기 시간 증가
done
```

### API 응답 없음

```bash
# 실시간 로그 확인
wrangler tail

# D1 바인딩 확인
wrangler d1 list
```

### 도메인 연결 안 됨

- DNS 전파 대기: 최대 24시간 (보통 5-10분)
- DNS 전파 확인: https://dnschecker.org

---

## 📚 다음 단계

배포 완료 후:

1. **성능 모니터링**
   - Cloudflare 대시보드 → Analytics
   - Workers 요청 수, 응답 시간 추적

2. **캐싱 최적화**
   - KV 네임스페이스 추가로 자주 조회되는 데이터 캐싱

3. **RAG/LLM 통합**
   - Streamlit 앱과 연동
   - Pinecone 벡터 검색 추가

---

**배포 완료 URL**: https://gst-patents.com 🎉
**API 문서**: https://gst-patents.com/pages/api-docs.html
**Streamlit 앱**: https://gst-patents.streamlit.app
