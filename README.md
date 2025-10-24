# 🚀 GST 특허관리시스템 (Enhanced & RAG-Ready)

> **글로벌 스탠다드 테크놀로지의 반도체 유해가스 정화장비 특허 관리 및 분석 시스템**
> 
> ⚡ Cloudflare 최적화 | 🤖 RAG/LLM 통합 준비 | 📱 PWA 지원 | 🌍 크로스브라우저 호환

## 📊 **프로젝트 현황**

### 🧭 **현재 구현 상태**

#### 🔧 **Core System**
- ✅ **특허 데이터 관리**: `data/patents-index.json`을 로드하고 검색/페이지네이션/카테고리·상태 필터를 제공합니다.
- ⚠️ **자동 데이터 임포트**: 81개 JSON 파일을 fetch·파싱하고 진행률/통계를 표시하는 UI는 동작하지만, `/tables/patents` 저장 API가 없어 실제 DB 저장은 수행되지 않습니다.
- ✅ **반응형 대시보드**: 주요 카드·표·섹션이 모바일과 데스크톱에서 정상적으로 렌더링됩니다.
- ⚠️ **고급 검색 기능**: 실시간 검색, 퍼지 매칭, 키보드 단축키는 구현되었으나 고급 검색 모달·검색 히스토리·날짜 필터는 아직 제공되지 않습니다.

#### 📊 **데이터 시각화**
- ✅ **Chart.js 기반 통계**: 기술 분야, 연도, 특허 상태 분포를 동적으로 갱신합니다.
- ✅ **타임라인 뷰**: 커스텀 타임라인/마일스톤 컴포넌트가 등록 흐름을 시각화합니다.

#### 🌐 **Web Performance & PWA**
- ✅ **Service Worker**: 정적 자산 프리캐싱과 오프라인 페이지가 동작합니다.
- ✅ **PWA 구성**: `manifest.json`과 앱 설치 UI가 포함되어 있습니다.
- ⚠️ **보안/호환성**: `_headers`에 CSP 등은 설정되어 있으나 HSTS는 미적용이며, 코드는 최신 브라우저를 대상으로 작성되어 IE11에서는 동작하지 않습니다.
- ⚠️ **백그라운드 기능**: Background Sync/Push 이벤트 핸들러는 자리만 마련되어 있고 실 구현은 아직 없습니다.

#### 🤖 **AI/RAG 인터페이스**
- ✅ **채팅 사이드바 UI**: RAG 준비 상태를 알리고 향후 기능을 안내합니다.
- ⚠️ **백엔드 연동**: `GST_CONFIG.RAG_CONFIG` 기본값이 비활성화 상태이며 벡터 검색·LLM 호출·스트리밍 응답 로직은 미구현입니다.

#### ☁️ **Cloudflare/배포**
- ✅ **정적 호스팅 준비**: `_headers`, `_redirects`, PWA 자산이 Cloudflare Pages 배포를 고려해 구성되었습니다.
- ⚠️ **운영 검증**: 실제 Cloudflare Pages 배포 결과나 Lighthouse 측정치는 저장소에 포함되어 있지 않습니다.

## 🔮 **RAG/LLM 통합 준비 상태**

- 🗂️ `pages/architecture.html`과 `LANGCHAIN_PATENT_ANALYSIS_GUIDE.md`에 RAG 통합 아키텍처와 구축 가이드가 문서화되어 있습니다.
- ⚠️ 벡터 DB 연동(ChromaDB/Pinecone), 임베딩 생성, LLM API 호출, 스트리밍 응답 로직은 아직 구현되지 않았습니다.
- 🧩 `GST_CONFIG.RAG_CONFIG`에 엔드포인트 플레이스홀더가 정의되어 있으나 기본값은 `ENABLED: false`입니다.
- 🧪 향후 연동 시 `ai-chat-panel` UI를 통해 응답을 표시하도록 설계되어 있습니다.

## 📁 **프로젝트 구조**

```
📁 GST-특허관리시스템/
├── 📄 index.html                     # 메인 대시보드 (21KB)
├── 📁 css/
│   └── style.css                     # 반응형 스타일시트 (enhanced)
├── 📁 js/
│   ├── main.js                       # 핵심 애플리케이션 로직
│   ├── enhanced-search.js            # 고급 검색 & RAG 인터페이스 (26KB)
│   ├── data-parser.js                # 특허 JSON 파싱 유틸리티 (13KB)
│   ├── patents.js                    # 특허 데이터 관리
│   ├── charts.js                     # 차트 시각화
│   └── timeline.js                   # 타임라인 뷰
├── 📁 pages/
│   ├── auto-import.html              # 자동 데이터 임포트 (37KB)
│   ├── data-import.html              # 수동 데이터 임포트
│   ├── architecture.html             # RAG 시스템 아키텍처
│   ├── api-docs.html                 # API 문서
│   └── roadmap.html                  # 개발 로드맵
├── 📁 scripts/
│   ├── auto-import-patents.js        # 자동 임포트 스크립트 (24KB)
│   └── import-patents.js             # 81개 JSON URL 목록
├── 🔧 _headers                       # Cloudflare 헤더 설정
├── 🔧 _redirects                     # SPA 라우팅 설정
├── 🔧 sw.js                          # Service Worker (14KB)
├── 🔧 manifest.json                  # PWA 매니페스트
├── 🔧 robots.txt                     # SEO 설정
├── 📋 CLOUDFLARE_DEPLOYMENT_GUIDE.md # 배포 가이드 (7KB)
├── 📋 COMPLETE_SETUP_GUIDE.md        # MacOS 개발환경 가이드 (34KB)
├── 📋 LANGCHAIN_PATENT_ANALYSIS_GUIDE.md # RAG 시스템 구축 가이드 (52KB)
└── 📋 README.md                      # 프로젝트 문서
```

## 🌟 **주요 기능 & 기술 스택**

### 💻 **Frontend Technology**
- **HTML5/CSS3 + Tailwind**: 시맨틱 마크업과 반응형 스타일 구성
- **JavaScript ES6+**: 모듈화, async/await, Fetch API 활용
- **Chart.js**: 주요 통계 차트 렌더링
- **Custom Timeline Components**: DOM 기반 타임라인/마일스톤 구현

### 🚀 **Performance & Compatibility**
- **Progressive Web App**: 오프라인 페이지 및 앱 설치 지원
- **Service Worker**: 캐싱 전략과 기본 오프라인 대응
- **Responsive Design**: 모바일 퍼스트 레이아웃
- **Modern Browsers**: Chrome/Firefox/Edge/Safari 최신 버전 대응 (IE11 미지원)

### 🔍 **Advanced Search Features (현재)**
- ✅ **Real-time Search**: 300ms 디바운싱
- ✅ **Fuzzy Matching**: Levenshtein 기반 유사 매칭
- ✅ **Smart Suggestions**: 특허번호·기술분야·발명자 제안
- ⚠️ **Multi-filter**: 카테고리/상태 필터 제공, 날짜 필터는 미구현
- ✅ **Keyboard Navigation**: Ctrl/Cmd+K, ESC, 방향키 탐색

### 🤖 **AI/RAG Integration (준비 중)**
- ✅ **UI Shell**: 채팅 패널, 상태 표시, 예시 질문
- ⚠️ **Vector Search & LLM**: 백엔드 연동 미구현
- ⚠️ **Context Management**: 향후 구현 예정
- ⚠️ **Streaming Response**: UI만 준비되어 있으며 실 응답 스트림은 없음

## 🎯 **현재 기능 상세**

### 📊 **Dashboard Features**
1. **통계 카드**: 총 특허 수, 기술 분야 수, 등록 기간 등의 요약 지표를 표시합니다.
2. **특허 목록**: 페이지네이션, 정렬, 카테고리/상태 필터, 상세 보기 트리거를 제공합니다.
3. **검색 시스템**: 전체 텍스트 검색, 실시간 제안, 퍼지 매칭, URL 파라미터와 연동된 상태 복원을 지원합니다.
4. **데이터 시각화**: Chart.js를 이용해 기술 분야 분포, 연도별 등록 현황, 상태별 구성 등을 시각화합니다.
5. **타임라인**: 커스텀 타임라인이 등록 연혁과 주요 마일스톤을 보여줍니다.

### 🚀 **Auto Import Features**
1. **일괄 데이터 처리**: 81개 JSON 파일을 자동으로 fetch하고 파싱하며 진행률/로그/통계를 실시간 갱신합니다.
2. **지능형 파싱**: 특허번호, 날짜, 발명자, 권리자, IPC, 키워드, 카테고리를 추출하고 정규화합니다.
3. **배치 저장**: 10개 단위로 `/tables/patents`에 저장을 시도하나, 서버 측 엔드포인트가 미구현인 경우 오류 로그를 남기고 계속 진행합니다.
4. **통계 생성**: 카테고리별·상태별 특허 수, 처리 시간, 성공/오류 건수를 요약합니다.

### 🔗 **Navigation & UX**
- **부드러운 스크롤링**: 앵커 이동 시 자연스러운 전환
- **모바일 메뉴**: 토글 가능한 햄버거 내비게이션
- **키보드 단축키**: `Ctrl/Cmd + K`, `Esc`, 방향키 제안 탐색
- **URL 상태 관리**: 검색어와 필터를 URL 파라미터에 동기화해 뒤로가기/공유가 가능합니다.

## 🚀 **배포 및 실행**

### ⚡ **Cloudflare Pages 배포**

```bash
# 1. GitHub 리포지토리 생성 및 푸시
git init
git add .
git commit -m "GST 특허관리시스템 배포 준비"
git remote add origin https://github.com/YOUR_USERNAME/gst-patents.git
git push -u origin main

# 2. Cloudflare Pages 연결
# - dash.cloudflare.com에서 Pages 선택
# - GitHub 리포지토리 연결
# - 자동 배포 완료
```

**배포 URL**: `https://gst-patents.pages.dev`

### 🔧 **로컬 개발환경**

```bash
# 1. 프로젝트 클론
git clone https://github.com/YOUR_USERNAME/gst-patents.git
cd gst-patents

# 2. Live Server 실행 (VS Code 추천)
# VS Code Live Server 확장 설치 후 Go Live 클릭

# 또는 Python 간단 서버
python -m http.server 8080
# http://localhost:8080 접속

# 또는 Node.js serve
npx serve .
# http://localhost:3000 접속
```

## 🤖 **RAG/LLM 시스템 확장 계획**

### 📋 **Phase 1: Vector Database 구축**
```yaml
- 특허 문서 벡터화 (Embedding)
- ChromaDB/Pinecone 연동
- 유사도 검색 API 구축
- 벡터 인덱싱 최적화
```

### 📋 **Phase 2: LLM 통합**
```yaml  
- OpenAI GPT-4 API 연동
- 프롬프트 엔지니어링 최적화
- 스트리밍 응답 구현
- 토큰 사용량 최적화
```

### 📋 **Phase 3: Advanced AI Features**
```yaml
- 특허 요약 생성
- 유사 특허 추천
- 특허 동향 분석
- 자동 카테고라이징
```

## 📈 **성능 메트릭**

- 현재 저장소에는 공식 Core Web Vitals 또는 Lighthouse 측정 결과가 포함되어 있지 않습니다.
- 실제 배포 환경에서 성능/접근성 점수를 측정해 문서화하는 것을 권장합니다.
- 지원 브라우저 대상은 최신 Chrome/Firefox/Edge/Safari이며, IE11은 지원하지 않습니다.

## 🔧 **개발 환경 설정**

상세한 개발환경 구축 가이드는 다음 문서를 참조하세요:
- **MacOS 개발환경**: [`COMPLETE_SETUP_GUIDE.md`](./COMPLETE_SETUP_GUIDE.md)
- **RAG 시스템 구축**: [`LANGCHAIN_PATENT_ANALYSIS_GUIDE.md`](./LANGCHAIN_PATENT_ANALYSIS_GUIDE.md)
- **Cloudflare 배포**: [`CLOUDFLARE_DEPLOYMENT_GUIDE.md`](./CLOUDFLARE_DEPLOYMENT_GUIDE.md)

## 📝 **데이터 임포트 사용 가이드**

### 🚀 **자동 임포트 방법**

1. **메인 페이지에서 "자동 임포트" 버튼 클릭**
   - 네비게이션 바의 녹색 "자동 임포트" 버튼 클릭
   - 또는 직접 `/pages/auto-import.html` 접속

2. **"임포트 시작" 버튼 클릭**
   - 81개 JSON 파일을 순차적으로 fetch·파싱하고 실시간 진행률/로그를 표시합니다.
   - 저장 단계에서 `/tables/patents`에 POST 요청을 보내므로, 해당 API가 구현되지 않은 환경에서는 오류 로그가 남습니다.

3. **완료 후 결과 확인**
   - 처리 요약(소요 시간, 성공/실패 건수)이 출력되고, 메인 페이지로 이동할지 묻는 확인 창이 표시됩니다.

### 💽 **로컬 DB 생성 및 갱신**

1. **81개 JSON 파일 확인**
   - 모든 특허 원본은 `data/patents/` 폴더에 JSON 형태로 저장됩니다.
   - 파일을 추가/수정한 후에는 아래 빌드 스크립트를 다시 실행합니다.

2. **로컬 DB 빌드 실행**
   ```bash
   node scripts/build-local-db.js
   ```
   - `data/patents-index.json`이 생성되며 총 건수, 카테고리 통계가 콘솔에 출력됩니다.
   - 빌드가 성공하면 메인 대시보드는 자동으로 해당 로컬 DB를 우선 사용합니다.

3. **검색/필터 즉시 반영**
   - 페이지를 새로고침하면 최신 인덱스로 검색, 필터, 통계가 즉시 갱신됩니다.
   - 로컬 DB 로딩 실패 시 기존 API → 샘플 데이터 순으로 자동 폴백합니다.

### 📊 **데이터베이스 스키마**

**patents 테이블 (25개 필드)**:
- `id`: 고유 식별자 (doc_id와 동일)
- `doc_id`: 문서 ID
- `patent_number`: 특허번호 (예: 10-2023123456)
- `title`: 특허 제목
- `abstract`: 요약
- `category`: 카테고리 (scrubber, chiller, plasma, temperature, gas-treatment, other)
- `technology_field`: 기술 분야
- `registration_date`: 등록일자
- `application_date`: 출원일자
- `publication_date`: 공개일자
- `status`: 상태 (active, expired, pending, abandoned)
- `inventors`: 발명자 목록 (배열)
- `assignee`: 특허권자
- `priority_score`: 우선순위 점수 (1-10)
- `technical_keywords`: 기술 키워드 (배열)
- `related_patents`: 관련 특허 (배열)
- `main_claims`: 주요 청구항
- `full_text`: 전체 텍스트 (10,000자 제한)
- `page_count`: 페이지 수
- `source_path`: 원본 경로
- `extraction_date`: 추출 날짜
- `ipc_classification`: 국제특허분류
- `legal_status`: 법적 상태
- `image_count`: 이미지 개수
- `vector_embedding_ready`: RAG 준비 여부 (boolean)

## 📝 **다음 단계 개발 권장사항**

### 🎯 **우선순위 높음**
1. **자동 임포트 저장 API 구현**
   - `/tables/patents` POST 엔드포인트와 검증/에러 처리를 추가합니다.
   - 프런트엔드와의 응답 규약을 정의해 저장 성공 여부를 명확히 표시합니다.
2. **검색 기능 고도화**
   - 날짜 범위 필터, 고급 검색 모달, 검색 히스토리를 구현합니다.
   - 검색 결과 정확도를 검증하고 테스트 케이스를 추가합니다.
3. **RAG 벡터 데이터베이스 구축**
   - 특허 문서 임베딩을 생성하고 ChromaDB/Pinecone 등의 벡터 스토어를 연동합니다.
   - 메타데이터 스키마와 쿼리 인터페이스를 정의합니다.
4. **LLM API 및 AI 채팅 연동**
   - OpenAI/Claude 등 LLM API를 연계하고 프롬프트 전략을 수립합니다.
   - 스트리밍 응답, 오류 처리, 특허 요약/추천 기능을 채팅 UI에 연결합니다.

### 🔄 **우선순위 중간**
1. **Cloudflare Pages 실 배포 및 성능 모니터링**
2. **사용자 인증/권한 체계 도입**
3. **고급 분석 리포트 및 대시보드 확장**
4. **API 문서 자동화 및 e2e 테스트 스크립트 추가**

## 🏆 **프로젝트 현황 요약**

### ✅ **현재 구현된 요소**
- 📱 반응형 대시보드, 특허 목록, 실시간 검색/퍼지 매칭, 제안 UI
- 📊 Chart.js 기반 통계 차트와 커스텀 타임라인 뷰
- 🗂️ `data/patents-index.json` 인덱스 빌더 및 SQLite 스키마/임포트 스크립트
- 📘 개발/배포/언어 모델 통합 가이드 문서

### ⚠️ **추가 구현이 필요한 부분**
- ☁️ `/tables/patents` 저장 API와 운영 환경 검증
- 🤖 RAG 벡터 DB·LLM 연동 및 채팅 응답 처리
- 🔍 고급 검색 모달, 날짜 필터, 검색 히스토리
- 🔒 Cloudflare Pages 실 배포, 성능 측정, HSTS 등 보안 헤더 보강

---

## 👨‍💻 **프로젝트 정보**

- **회사**: 글로벌 스탠다드 테크놀로지 (Global Standard Technology Co. Ltd.)
- **프로젝트 유형**: 특허 관리 및 분석 시스템
- **기술 스택**: HTML5, CSS3, JavaScript ES6+, PWA
- **배포**: Cloudflare Pages (예정) / 로컬 정적 호스팅
- **라이선스**: Proprietary
- **버전**: 0.9.0 (UI 베타)
- **최종 업데이트**: 2025-01-17 (README 정리)

---

**배포 URL 예시**: `https://gst-patents.pages.dev` (실제 배포 시 업데이트 필요)
