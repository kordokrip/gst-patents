# Cloudflare Workers + D1 배포 가이드

## 🚀 전체 배포 프로세스

### 📋 사전 준비

```bash
# 1. Wrangler CLI 설치 (이미 설치되어 있으면 생략)
npm install -g wrangler

# 2. Cloudflare 로그인
wrangler login

# 3. Node.js 의존성 설치 (데이터 마이그레이션용)
npm install better-sqlite3
```

---

## 1단계: D1 데이터베이스 생성

```bash
# D1 데이터베이스 생성
wrangler d1 create gst_patents_db

# 출력 예시:
# ✅ Successfully created DB 'gst_patents_db' in region APAC
# 
# [[d1_databases]]
# binding = "DB"
# database_name = "gst_patents_db"
# database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### ✏️ wrangler.toml 업데이트

위 출력의 `database_id`를 복사하여 `wrangler.toml` 파일에 붙여넣으세요:

```toml
[[d1_databases]]
binding = "DB"
database_name = "gst_patents_db"
database_id = "여기에_실제_ID_입력"  # ← 위에서 생성된 ID
```

---

## 2단계: 데이터베이스 스키마 적용

```bash
# 마이그레이션 실행 (테이블 생성)
wrangler d1 migrations apply gst_patents_db

# 출력:
# ✅ Applying 0001_initial_schema.sql
# ✅ Migration complete
```

### 스키마 확인

```bash
# 테이블 목록 확인
wrangler d1 execute gst_patents_db --command="SELECT name FROM sqlite_master WHERE type='table'"

# 출력 예시:
# ┌─────────────────────┐
# │ name                │
# ├─────────────────────┤
# │ patents             │
# │ patent_inventors    │
# │ patent_keywords     │
# │ patent_pages        │
# │ patent_images       │
# │ patent_search       │
# └─────────────────────┘
```

---

## 3단계: 데이터 마이그레이션

### 3.1 로컬 DB에서 데이터 추출

```bash
# SQLite → SQL 파일 변환
node scripts/export-to-d1.js

# 출력:
# 📂 로컬 SQLite 데이터베이스 로드 중...
# 📊 특허 데이터 추출 중...
#    ✓ 81개 특허 데이터 추출
# 📝 SQL 파일 생성 중... (X개 배치)
#    ✓ migrations/data/insert_batch_0001.sql 생성
#    ✓ migrations/data/insert_batch_0002.sql 생성
#    ...
# 💾 백업 JSON 생성: migrations/data/patents_backup.json
# ✅ 데이터 추출 완료!
```

### 3.2 D1에 데이터 업로드

```bash
# 방법 1: 모든 배치 파일 순차 실행
for file in migrations/data/insert_batch_*.sql; do
  echo "📤 Uploading $file..."
  wrangler d1 execute gst_patents_db --file="$file"
done

# 방법 2: 개별 실행
wrangler d1 execute gst_patents_db --file=migrations/data/insert_batch_0001.sql
wrangler d1 execute gst_patents_db --file=migrations/data/insert_batch_0002.sql
# ... 반복
```

### 3.3 데이터 확인

```bash
# 특허 수 확인
wrangler d1 execute gst_patents_db --command="SELECT COUNT(*) as total FROM patents"

# 카테고리별 통계
wrangler d1 execute gst_patents_db --command="SELECT category, COUNT(*) as count FROM patents GROUP BY category"

# 샘플 데이터 조회
wrangler d1 execute gst_patents_db --command="SELECT id, title, category FROM patents LIMIT 5"
```

---

## 4단계: Cloudflare Pages 배포

### 4.1 GitHub 연동 (이미 완료됨)

```bash
# 변경사항 커밋 및 푸시
git add .
git commit -m "feat: Cloudflare Workers + D1 데이터베이스 통합"
git push origin main
```

### 4.2 Pages 프로젝트 설정

1. **Cloudflare 대시보드 접속**
   - https://dash.cloudflare.com
   - Workers & Pages 선택

2. **기존 프로젝트 선택 또는 새로 생성**
   - `gst-patents` 프로젝트 선택

3. **Settings → Functions 탭**
   - Compatibility Date: `2025-01-24`
   - Node.js Compatibility: 활성화

4. **Settings → Environment Variables**
   - 환경 변수 추가 (필요시):
     ```
     ENVIRONMENT = production
     ```

5. **D1 바인딩 확인**
   - Settings → Functions → D1 Bindings
   - `DB` → `gst_patents_db` 바인딩 확인

---

## 5단계: 커스텀 도메인 설정

### 5.1 도메인 DNS 설정

1. **Cloudflare 대시보드**
   - Websites 선택
   - `gst-patents.com` 도메인 선택 (이미 구매 완료)

2. **DNS 레코드 추가**
   ```
   Type: CNAME
   Name: @
   Target: gst-patents.pages.dev
   Proxy status: Proxied (주황색 구름)
   
   Type: CNAME
   Name: www
   Target: gst-patents.pages.dev
   Proxy status: Proxied
   ```

### 5.2 Pages 프로젝트에 도메인 연결

1. **Pages 프로젝트 → Custom domains**
   - "Set up a custom domain" 클릭
   - `gst-patents.com` 입력
   - "Activate domain" 클릭

2. **www 서브도메인 추가**
   - "Add a custom domain" 클릭
   - `www.gst-patents.com` 입력
   - "Activate domain" 클릭

3. **SSL/TLS 설정**
   - SSL/TLS → Overview
   - 암호화 모드: "Full (strict)" 선택
   - "Always Use HTTPS" 활성화

### 5.3 리다이렉션 설정

`_redirects` 파일에 추가 (이미 있음):
```
# www → non-www 리다이렉션
https://www.gst-patents.com/* https://gst-patents.com/:splat 301!
```

---

## 6단계: API 테스트

### 배포 완료 후 API 엔드포인트 테스트

```bash
# Health Check
curl https://gst-patents.com/api/health

# 특허 목록 조회 (첫 페이지)
curl "https://gst-patents.com/api/patents?page=1&limit=10"

# 특정 특허 상세 조회
curl "https://gst-patents.com/api/patents?id=특허ID"

# 검색 API
curl "https://gst-patents.com/api/search?q=스크러버&page=1"

# 통계 API
curl "https://gst-patents.com/api/stats"
```

---

## 7단계: 성능 최적화

### 7.1 캐싱 전략

Cloudflare가 자동으로 캐싱하지만, 추가 최적화:

```javascript
// functions/_middleware.js 에서 캐시 헤더 추가
const cacheHeaders = {
  'Cache-Control': 'public, max-age=3600, s-maxage=86400',
  'CDN-Cache-Control': 'max-age=86400',
};
```

### 7.2 KV 캐싱 (선택사항)

자주 조회되는 데이터를 KV에 캐시:

```bash
# KV 네임스페이스 생성
wrangler kv:namespace create CACHE

# wrangler.toml에 추가
[[kv_namespaces]]
binding = "CACHE"
id = "생성된_KV_ID"
```

---

## 8단계: 모니터링 설정

### 8.1 Workers 분석

- Cloudflare 대시보드 → Workers & Pages → gst-patents
- Analytics 탭에서 실시간 요청 추적

### 8.2 알림 설정

- Notifications → Create Notification
- Worker 오류 발생 시 이메일 알림

---

## 🎯 최종 체크리스트

- [ ] D1 데이터베이스 생성 완료
- [ ] 스키마 마이그레이션 완료
- [ ] 데이터 업로드 완료 (81개 특허)
- [ ] Pages 프로젝트 배포 완료
- [ ] gst-patents.com 도메인 연결
- [ ] SSL/TLS 활성화
- [ ] API 엔드포인트 테스트 통과
- [ ] 프론트엔드 → API 연동 확인
- [ ] 성능 최적화 (캐싱) 적용

---

## 🔧 문제 해결

### D1 마이그레이션 오류
```bash
# 마이그레이션 상태 확인
wrangler d1 migrations list gst_patents_db

# 특정 마이그레이션 롤백 (필요시)
wrangler d1 migrations apply gst_patents_db --version=0
```

### API 응답 없음
```bash
# Workers 로그 확인
wrangler tail

# 실시간 로그 스트리밍
wrangler tail --format=pretty
```

### 도메인 연결 안 됨
- DNS 전파 대기 (최대 24시간, 보통 5-10분)
- DNS 전파 확인: https://dnschecker.org/#CNAME/gst-patents.com

---

## 📚 참고 문서

- [Cloudflare D1 문서](https://developers.cloudflare.com/d1/)
- [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/functions/)
- [Workers Pricing](https://developers.cloudflare.com/workers/platform/pricing/)

---

**배포 완료 URL**: 
- 메인: https://gst-patents.com
- API: https://gst-patents.com/api/*
- Streamlit: https://gst-patents.streamlit.app (별도)
