# 🚀 Cloudflare Pages - Production 배포 가이드

## 빠른 링크
- **Dashboard**: https://dash.cloudflare.com
- **프로젝트 직접 접속**: https://dash.cloudflare.com/?to=/:account/pages/view/gst-patents

---

## 📋 전체 흐름

```
1. Cloudflare 로그인
   ↓
2. Workers & Pages 클릭
   ↓
3. gst-patents 프로젝트 선택
   ↓
4. Deployments 탭 클릭
   ↓
5. 최신 배포 (eb67d8a) 찾기
   ↓
6. "View deployment details" 클릭
   ↓
7. "Promote to production" 버튼 클릭 ⭐
   ↓
8. 확인 팝업에서 "Promote" 클릭
   ↓
9. ✅ 배포 완료!
```

---

## 🎯 핵심 단계별 스크린샷 위치

### 1단계: Workers & Pages
- 위치: 왼쪽 사이드바
- 찾는 법: "Workers" 검색

### 2단계: gst-patents 선택
- 위치: 프로젝트 목록
- 확인: "Type: Pages", "Production: gst-patents.com"

### 3단계: Deployments 탭
- 위치: 프로젝트 페이지 상단
- 옆에 "Settings" 탭도 있음

### 4단계: 최신 배포 찾기
```
확인 포인트:
✅ 시간: 방금 전 (23:00~23:05)
✅ Commit: eb67d8a
✅ Message: "fix: CRITICAL - JSON first loading..."
✅ Status: Success (초록색 체크)
✅ Environment: Preview (파란색)
```

### 5단계: Promote 버튼
```
버튼 위치:
┌────────────────────────────┐
│ Deployment Details         │
│                            │
│ [🚀 Promote to production] │ ← 이것!
│                            │
│ [Rollback] [Delete]        │
└────────────────────────────┘
```

---

## ⏱️ 예상 소요 시간
- 로그인: 10초
- 프로젝트 찾기: 5초
- 배포 찾기: 10초
- Promote 클릭: 5초
- **총 소요: 약 30초**

---

## ✅ 성공 확인 방법

### Console 메시지 (F12)
```javascript
✅ 🗑️ Service Worker 제거 완료: true
✅ 🗑️ 캐시 삭제: gst-patents-v3.1.0
✅ ⚠️ Service Worker 비활성화됨
✅ 📡 로컬 JSON 호출 중: /db/patents_data.json
✅ ✅ 로컬 JSON 로드 완료: 75개
```

### 메인 화면
- "총 75개 특허" 표시
- 특허 목록 75개 로딩
- 차트 정상 렌더링

---

## 🆘 자주 묻는 질문

### Q: "Promote to production" 버튼이 안 보여요
A: 
1. Preview 배포인지 확인 (파란색 "Preview" 라벨)
2. Status가 "Success"인지 확인
3. 이미 Production이면 버튼 없음 (초록색 "Production" 라벨)

### Q: 최신 배포가 안 보여요
A:
1. 페이지 새로고침 (F5)
2. 시간 정렬 확인 (최신순)
3. Filters에 "All deployments" 선택 확인

### Q: 승격했는데도 변경사항이 안 보여요
A:
1. 브라우저 강제 새로고침 (Ctrl+Shift+R)
2. Service Worker 제거 (F12 → Application)
3. 브라우저 캐시 완전 삭제
4. 시크릿 모드로 테스트

---

## 🔗 유용한 링크
- Cloudflare Pages 문서: https://developers.cloudflare.com/pages
- 배포 가이드: https://developers.cloudflare.com/pages/platform/deployments
- 트러블슈팅: https://developers.cloudflare.com/pages/platform/known-issues

