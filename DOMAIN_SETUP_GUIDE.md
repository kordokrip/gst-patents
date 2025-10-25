# GST-PATENTS.COM 커스텀 도메인 연결 가이드

## 📋 개요
Cloudflare Pages 프로젝트 `gst-patents`에 커스텀 도메인 `gst-patents.com`을 연결하는 방법입니다.

---

## 🌐 1단계: Cloudflare Dashboard 접속

1. **Cloudflare Dashboard 로그인**
   - URL: https://dash.cloudflare.com
   - GST 계정으로 로그인

2. **Pages 프로젝트 선택**
   - 좌측 메뉴에서 **Workers & Pages** 클릭
   - `gst-patents` 프로젝트 선택

---

## 🔗 2단계: 커스텀 도메인 추가

### 방법 A: Cloudflare에서 도메인을 관리하는 경우

1. **Custom domains 탭으로 이동**
   - 프로젝트 상단 메뉴에서 **Custom domains** 클릭

2. **도메인 추가**
   - **Set up a custom domain** 버튼 클릭
   - 도메인 입력: `gst-patents.com`
   - **Continue** 클릭

3. **자동 DNS 설정**
   - Cloudflare가 자동으로 DNS 레코드를 추가합니다
   - CNAME 레코드: `gst-patents.com` → `gst-patents.pages.dev`
   - **Activate domain** 클릭

4. **www 서브도메인 추가 (선택)**
   - 같은 방법으로 `www.gst-patents.com` 추가
   - 또는 _redirects 파일에서 리다이렉트 설정

### 방법 B: 외부 DNS 공급자를 사용하는 경우

1. **DNS 레코드 확인**
   - Cloudflare Pages에서 제공하는 CNAME 값 확인

2. **외부 DNS 설정**
   - DNS 공급자 대시보드 접속
   - CNAME 레코드 추가:
     ```
     Type: CNAME
     Name: @ (또는 gst-patents.com)
     Value: gst-patents.pages.dev
     TTL: Auto 또는 3600
     ```

3. **www 서브도메인**
   - CNAME 레코드 추가:
     ```
     Type: CNAME
     Name: www
     Value: gst-patents.pages.dev
     TTL: Auto 또는 3600
     ```

---

## 🔐 3단계: SSL/TLS 설정

1. **자동 SSL 인증서**
   - Cloudflare가 자동으로 Let's Encrypt SSL 인증서 발급
   - 보통 1-5분 소요

2. **SSL/TLS 모드 확인**
   - Cloudflare Dashboard → **SSL/TLS** 탭
   - 암호화 모드: **Full (strict)** 권장

3. **HTTPS 리다이렉트 활성화**
   - **SSL/TLS** → **Edge Certificates**
   - **Always Use HTTPS** 활성화

---

## ✅ 4단계: DNS 전파 확인

### DNS 레코드 확인
```bash
# 터미널에서 실행
dig gst-patents.com
dig www.gst-patents.com

# 또는 nslookup
nslookup gst-patents.com
```

### 온라인 도구로 확인
- https://www.whatsmydns.net/
- 도메인 입력: `gst-patents.com`
- 레코드 타입: CNAME 또는 A
- 전 세계 DNS 전파 상태 확인

### 예상 전파 시간
- **Cloudflare 관리 도메인**: 즉시 ~ 5분
- **외부 DNS**: 최대 24-48시간

---

## 🚀 5단계: 배포 확인

### 도메인 접속 테스트
1. **메인 도메인**: https://gst-patents.com
2. **www 서브도메인**: https://www.gst-patents.com
3. **Pages 기본 URL**: https://gst-patents.pages.dev

### 리다이렉트 설정 (_redirects 파일)

현재 `_redirects` 파일에 다음 규칙 추가 필요:

```plaintext
# Custom Domain Redirects
http://gst-patents.com/* https://gst-patents.com/:splat 301!
http://www.gst-patents.com/* https://gst-patents.com/:splat 301!
https://www.gst-patents.com/* https://gst-patents.com/:splat 301!
```

---

## 🛠️ Wrangler CLI로 도메인 설정

### 명령어로 도메인 추가
```bash
# 프로젝트 디렉토리에서 실행
cd /Users/sungho-kang/GST_patent

# 커스텀 도메인 추가
wrangler pages domain add gst-patents.com --project-name=gst-patents

# 도메인 목록 확인
wrangler pages domain list --project-name=gst-patents
```

---

## 📊 6단계: D1 바인딩 설정 (중요!)

도메인 연결 후 D1 데이터베이스 바인딩도 확인해야 합니다.

### Cloudflare Dashboard에서 설정

1. **Pages 프로젝트** → **Settings** → **Functions**
2. **D1 database bindings** 섹션:
   - Variable name: `DB`
   - D1 database: `gst_patents_db` 선택
3. **Save** 클릭

### wrangler.toml 파일 확인

현재 설정:
```toml
[[d1_databases]]
binding = "DB"
database_name = "gst_patents_db"
database_id = "3497fe7d-998f-4f1c-8bc4-912eb4b05028"
```

---

## 🔍 트러블슈팅

### 문제 1: 도메인이 연결되지 않음
**원인**: DNS 전파 대기 중
**해결**: 
- DNS 전파 확인: https://www.whatsmydns.net/
- 최대 48시간 대기

### 문제 2: SSL 인증서 오류
**원인**: SSL 인증서 발급 대기
**해결**:
- Cloudflare Dashboard → SSL/TLS → Edge Certificates
- **Universal SSL** 활성화 확인
- 5-10분 대기

### 문제 3: 404 오류
**원인**: 배포가 아직 활성화되지 않음
**해결**:
- 최신 배포 확인: `wrangler pages deployment list --project-name=gst-patents`
- 재배포: `wrangler pages deploy . --project-name=gst-patents`

### 문제 4: API 엔드포인트 작동 안 함
**원인**: D1 바인딩 미설정
**해결**:
- Cloudflare Dashboard → Functions → D1 database bindings 설정
- 또는 `wrangler.toml` 환경 변수 수정

---

## 📞 지원

문제가 지속되면 다음으로 문의:
- **Cloudflare 지원**: https://support.cloudflare.com
- **GST 관리자**: shkang@gst-in.com

---

## ✨ 완료 체크리스트

- [ ] Cloudflare Pages 프로젝트에 `gst-patents.com` 추가
- [ ] DNS 레코드 설정 (CNAME)
- [ ] SSL/TLS 인증서 발급 확인
- [ ] HTTPS 리다이렉트 활성화
- [ ] DNS 전파 확인
- [ ] D1 데이터베이스 바인딩 설정
- [ ] https://gst-patents.com 접속 테스트
- [ ] API 엔드포인트 테스트 (/api/patents)

---

**마지막 업데이트**: 2025년 10월 25일
**작성자**: GitHub Copilot
**프로젝트**: GST 특허관리시스템
