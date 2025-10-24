# 🚀 Streamlit Cloud 배포 가이드

## 📋 사전 준비사항

- [x] GitHub 리포지토리: `kordokrip/gst-patents`
- [x] `requirements.txt` 파일 생성 완료
- [ ] Streamlit Cloud 계정 (https://share.streamlit.io)
- [ ] OpenAI API 키
- [ ] Pinecone API 키

---

## 1️⃣ Streamlit Cloud 배포

### 1.1 Streamlit Cloud 접속 및 로그인

1. https://share.streamlit.io 접속
2. GitHub 계정으로 로그인
3. "New app" 버튼 클릭

### 1.2 앱 설정

**Repository 설정:**
```
Repository: kordokrip/gst-patents
Branch: main
Main file path: streamlit_app.py
```

**App URL (선택사항):**
```
Custom subdomain: gst-patents (또는 원하는 이름)
```

### 1.3 환경 변수 설정 (중요!)

**Advanced settings** 클릭 후 **Secrets** 섹션에 다음 내용 입력:

```toml
# OpenAI 설정
OPENAI_API_KEY = "sk-proj-your-actual-openai-key-here"
OPENAI_CHAT_MODEL = "gpt-4-1106-preview"

# Pinecone 설정
PINECONE_API_KEY = "pcsk_your-actual-pinecone-key-here"
PINECONE_INDEX_NAME = "gstllm"
PINECONE_NAMESPACE = "gst-patents"

# 기타 설정
EMBEDDING_MODEL = "text-embedding-3-large"
PATENT_DOC_BASE_URL = "http://localhost:8080/data/patents"
```

⚠️ **주의**: 위의 키 값들을 실제 API 키로 교체하세요!

### 1.4 배포 실행

1. "Deploy!" 버튼 클릭
2. 빌드 로그 확인 (1-3분 소요)
3. 배포 완료 후 URL 접속: `https://gst-patents.streamlit.app`

---

## 2️⃣ 환경 변수 관리

### Streamlit Cloud Secrets 형식

Streamlit Cloud는 `.env` 파일 대신 **TOML 형식**으로 환경 변수를 관리합니다.

**로컬 (.env)**:
```bash
OPENAI_API_KEY=sk-proj-xxx
```

**Streamlit Cloud (Secrets)**:
```toml
OPENAI_API_KEY = "sk-proj-xxx"
```

### Secrets 수정 방법

1. Streamlit Cloud 대시보드에서 앱 선택
2. 우측 상단 "⚙️ Settings" 클릭
3. "Secrets" 탭 선택
4. 내용 수정 후 "Save" 클릭
5. 앱 자동 재시작

---

## 3️⃣ 배포 후 확인사항

### ✅ 체크리스트

- [ ] 앱이 정상적으로 로드되는가?
- [ ] API 키 오류가 없는가?
- [ ] Pinecone 연결이 정상인가?
- [ ] 채팅 기능이 작동하는가?
- [ ] 웹 검색 기능이 작동하는가?

### 🔍 로그 확인

**오류 발생 시**:
1. 앱 화면 우측 하단 "Manage app" 클릭
2. "Logs" 탭에서 상세 오류 확인
3. "Reboot app"으로 재시작 시도

**일반적인 오류 해결**:
```bash
# ModuleNotFoundError
→ requirements.txt에 패키지 추가 후 커밋

# API Key Error
→ Secrets 설정 확인 및 키 값 검증

# Pinecone Connection Error
→ PINECONE_INDEX_NAME, PINECONE_NAMESPACE 확인
```

---

## 4️⃣ 자동 재배포 설정

Streamlit Cloud는 GitHub와 자동 연동됩니다:

```yaml
자동 배포 트리거:
  ✓ main 브랜치에 push → 자동 재배포
  ✓ 코드 변경 감지 → 자동 빌드
  ✓ Secrets 변경 → 자동 재시작
```

**수동 재배포**:
1. Streamlit Cloud 대시보드
2. 앱 선택 → "Reboot app"

---

## 5️⃣ 커스텀 도메인 설정 (선택사항)

### 무료 Streamlit URL
```
https://gst-patents.streamlit.app
또는
https://share.streamlit.io/kordokrip/gst-patents/main/streamlit_app.py
```

### 커스텀 도메인 (유료 플랜)
1. Streamlit Cloud 대시보드 → Settings
2. "Custom domain" 섹션
3. 도메인 입력 및 DNS 설정
4. CNAME 레코드 추가:
   ```
   Type: CNAME
   Name: patents (또는 원하는 서브도메인)
   Target: share.streamlit.io
   ```

---

## 6️⃣ 성능 최적화

### 리소스 제한 (무료 플랜)
- CPU: 1 vCPU
- 메모리: 1GB RAM
- 스토리지: 제한적

### 최적화 팁
1. **캐싱 활용**:
   ```python
   @st.cache_resource
   def init_clients():
       # 비용이 큰 초기화
   ```

2. **세션 상태 관리**:
   ```python
   if "conversation" not in st.session_state:
       st.session_state.conversation = []
   ```

3. **대용량 데이터 처리**:
   - Pinecone에 데이터 저장 (로컬 파일 최소화)
   - 필요시 Streamlit Community Cloud에서 AWS S3 연동

---

## 7️⃣ 모니터링 및 분석

### Streamlit Cloud Analytics
- 방문자 수
- 앱 사용 시간
- 오류 발생 빈도
- 리소스 사용량

### 로그 분석
```bash
# 로그 파일 위치 (Streamlit Cloud)
Manage app → Logs 탭

# 실시간 로그 스트리밍
앱 실행 중 자동 업데이트
```

---

## 8️⃣ 보안 권장사항

### ✅ 해야 할 것
- [x] Secrets에 API 키 저장 (코드에 하드코딩 금지)
- [x] `.env` 파일을 `.gitignore`에 추가
- [x] 정기적으로 API 키 갱신
- [x] HTTPS 사용 (Streamlit Cloud 기본 제공)

### ❌ 하지 말아야 할 것
- [ ] API 키를 코드에 직접 입력
- [ ] `.env` 파일을 Git에 커밋
- [ ] Secrets를 공개 문서에 기록
- [ ] 만료된 API 키 방치

---

## 🔗 참고 문서

- [Streamlit Cloud 공식 문서](https://docs.streamlit.io/streamlit-community-cloud)
- [Secrets 관리 가이드](https://docs.streamlit.io/streamlit-community-cloud/deploy-your-app/secrets-management)
- [배포 문제 해결](https://docs.streamlit.io/knowledge-base/deploy)

---

## 📞 문제 발생 시

1. **Streamlit Community Forum**: https://discuss.streamlit.io
2. **GitHub Issues**: 프로젝트 리포지토리 Issues 탭
3. **로그 확인**: Streamlit Cloud → Manage app → Logs

---

**배포 완료 후 URL**: `https://gst-patents.streamlit.app`

앱이 정상 작동하면 README.md에 라이브 데모 링크를 추가하세요! 🚀
