# GST 특허관리시스템 AI 에이전트 개발 지침

## 🏗️ 아키텍처 개요
- **프론트엔드**: HTML5/CSS3/JavaScript ES6+, Chart.js, PWA, Service Worker
- **데이터 관리**: `data/patents-index.json` 인덱스, 81개 특허 JSON, SQLite 스키마
- **자동 임포트**: `/pages/auto-import.html` 및 `scripts/auto-import-patents.js`에서 81개 JSON을 fetch/파싱
- **RAG/LLM 통합**: RAG 준비 UI, `GST_CONFIG.RAG_CONFIG`(기본값 비활성화), 향후 ChromaDB/Pinecone/LLM API 연동 예정
- **배포**: Cloudflare Pages, PWA, SPA 라우팅(`_redirects`), 보안 헤더(`_headers`)

## ⚡ 주요 개발 워크플로우
- **로컬 개발**: VS Code Live Server, 또는 `python -m http.server 8080`/`npx serve .`
- **데이터 인덱스 빌드**: `node scripts/build-local-db.js` 실행 → `data/patents-index.json` 생성
- **자동 임포트**: `/pages/auto-import.html`에서 "임포트 시작" → 진행률/통계 UI, `/tables/patents` 저장 API(미구현 시 오류 로그)
- **배포**: GitHub 푸시 후 Cloudflare Pages 연결

## 📦 프로젝트별 관례 및 패턴
- **특허 데이터**: 모든 특허는 `data/patents/`에 JSON, 인덱스는 `data/patents-index.json`에 집계
- **검색/필터**: 실시간 검색(300ms 디바운싱), 퍼지 매칭(Levenshtein), 키보드 단축키(Ctrl/Cmd+K, ESC)
- **에러 처리**: 임포트/저장 실패 시 오류 로그 남기고 계속 진행
- **RAG/AI**: `GST_CONFIG.RAG_CONFIG`에서 활성화, 벡터 DB/LLM 연동은 향후 구현
- **PWA/오프라인**: Service Worker(`sw.js`)에서 프리캐싱, 오프라인 페이지 제공

## 🔗 주요 파일/디렉터리
- `index.html` : 메인 대시보드
- `js/main.js` : 핵심 로직
- `js/enhanced-search.js` : 고급 검색/RAG 인터페이스
- `js/data-parser.js` : 특허 JSON 파싱
- `js/patents.js` : 데이터 관리
- `js/charts.js` : 통계 시각화
- `js/timeline.js` : 타임라인 뷰
- `pages/auto-import.html` : 자동 임포트 UI
- `scripts/auto-import-patents.js` : 임포트 스크립트
- `data/patents/` : 원본 특허 JSON
- `data/patents-index.json` : 인덱스
- `sw.js` : Service Worker
- `manifest.json` : PWA 매니페스트
- `COMPLETE_SETUP_GUIDE.md` : 개발환경 가이드
- `LANGCHAIN_PATENT_ANALYSIS_GUIDE.md` : RAG 구축 가이드
- `CLOUDFLARE_DEPLOYMENT_GUIDE.md` : 배포 가이드

## 🧩 통합/확장 포인트
- **RAG/LLM**: `GST_CONFIG.RAG_CONFIG` 활성화 후 백엔드 API, 벡터 DB, LLM 연동 필요
- **자동 임포트 저장 API**: `/tables/patents` POST 엔드포인트 구현 필요
- **검색 기능 확장**: 날짜 필터, 고급 검색 모달, 검색 히스토리 추가 예정

## 📝 예시 코드 패턴
```js
// 특허 데이터 로드
fetch('data/patents-index.json').then(res => res.json())

// 실시간 검색
input.addEventListener('input', debounce(search, 300))

// 자동 임포트 진행률 표시
updateProgressBar(current, total)
```

## 🚨 주의사항
- IE11 미지원, 최신 브라우저 대상
- Cloudflare Pages 배포 시 SPA 라우팅(`_redirects`)과 보안 헤더(`_headers`) 필수
- RAG/AI 기능은 UI만 준비, 실제 백엔드 연동은 미구현

---

질문/피드백은 README 및 가이드 문서 참고 후 추가 요청 바랍니다.
