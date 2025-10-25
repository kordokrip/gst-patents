# 🚀 v3.4.0 배포 체크리스트

## ✅ 1. 파일 연동 확인

### **index.html → JS 파일**
```html
✅ <script src="js/enhanced-search.js?v=3.4.0" defer></script>
✅ <script src="js/main.js?v=3.4.0" defer></script>
✅ <script src="js/patents-refactored.js?v=3.4.0" defer></script>
✅ <script src="js/charts.js?v=3.4.0" defer></script>
✅ <script src="js/timeline.js?v=3.4.0" defer></script>
```

### **JS 파일 존재 확인**
```bash
✅ js/enhanced-search.js (28.4 KB)
✅ js/main.js (44.0 KB)
✅ js/patents-refactored.js (29.0 KB)
✅ js/charts.js (22.5 KB)
✅ js/timeline.js (29.3 KB)
```

## ✅ 2. 데이터 소스 확인

### **Cloudflare D1 (우선순위 1)**
- API: `/api/patents`
- Function: `functions/api/patents.js` ✅ 생성 완료
- 바인딩: `DB` → `gst_patents_db` ✅ wrangler.toml 설정 완료
- 데이터: **75개 특허** ✅ 임포트 완료

### **로컬 JSON (폴백)**
- 파일: `/db/patents_data.json`
- 데이터: **75개 특허** ✅ 업데이트 완료

## ✅ 3. API 로직 흐름

### **patents-refactored.js → loadPatents()**
```javascript
1️⃣ fetch('/api/patents?limit=1000')  // D1 API 호출
   ↓ 성공
   ✅ this.patents = data (75개)
   ✅ this.dataSource = 'd1'
   
   ↓ 실패 (네트워크 오류 등)
   
2️⃣ fetch('/db/patents_data.json')  // 로컬 JSON 폴백
   ↓ 성공
   ✅ this.patents = data (75개)
   ✅ this.dataSource = 'local'
```

### **Cloudflare Functions → /api/patents**
```javascript
✅ env.DB (D1 바인딩)
✅ SELECT * FROM patents LIMIT 1000
✅ CORS 헤더 설정
✅ JSON 응답: { success: true, data: [...], count: 75 }
```

## ✅ 4. 버전 확인

### **파일별 버전**
```
✅ index.html:    v3.4.0 (JS 로딩)
✅ manifest.json: v3.4.0
✅ sw.js:         v3.4.0
```

### **Git 커밋**
```
✅ Commit: efe2503
✅ Message: "feat: Clean data rebuild and D1 API - v3.4.0"
✅ Push: origin/main
```

## ✅ 5. D1 데이터 검증

### **데이터 상태**
```sql
SELECT COUNT(*) FROM patents;
-- 결과: 75

SELECT id, title, patent_number FROM patents LIMIT 5;
-- 75개 전부 정상 임포트 확인 ✅
```

### **데이터 구조**
```
✅ id: doc_id 사용 (유니크 보장)
✅ patent_number: 66개 추출 완료
✅ title: 75개 전부
✅ abstract: PDF에서 추출
✅ technology_field: 자동 분류
```

## 🔍 6. 배포 후 확인사항

### **웹사이트 테스트**
1. https://gst-patents.com 접속
2. **F12 → Console** 열기
3. 다음 메시지 확인:
   ```
   📡 D1 API 호출 중: /api/patents?limit=1000
   📥 D1 응답 상태: 200 OK
   ✅ D1 로드 완료: 75개
   ```

4. **메인 화면 확인**:
   - "총 75개 특허" 표시 확인
   - 특허 목록 75개 로딩 확인
   - 차트 데이터 75개 반영 확인

### **Service Worker 확인**
```
F12 → Application → Service Workers
- Status: activated
- Version: v3.4.0
- Scope: https://gst-patents.com/
```

### **API 직접 테스트**
```bash
curl https://gst-patents.com/api/patents?limit=5
# 응답: { "success": true, "data": [...], "count": 5 }
```

## ❗ 7. 트러블슈팅

### **문제: "78개 특허" 또는 오래된 버전 표시**
**원인**: 브라우저 캐시
**해결**:
1. `Ctrl+Shift+R` (강제 새로고침)
2. F12 → Application → Service Workers → **Unregister**
3. F12 → Application → Storage → **Clear site data**
4. 페이지 새로고침

### **문제: "D1 로드 실패, 로컬 JSON 폴백"**
**원인**: Cloudflare Functions 배포 지연 또는 D1 바인딩 오류
**확인**:
1. Cloudflare Pages 배포 상태 확인
2. `/api/patents` 직접 호출 테스트
3. wrangler.toml의 D1 바인딩 확인

### **문제: JS 파일 404 오류**
**원인**: 캐시된 HTML이 잘못된 경로 참조
**해결**:
1. F12 → Network 탭에서 실제 요청 URL 확인
2. 캐시 완전 삭제 후 재시도

## ✅ 8. 최종 체크리스트

- [x] D1 데이터베이스: 75개 특허 임포트
- [x] Cloudflare Functions API 생성
- [x] 로컬 JSON 폴백 업데이트
- [x] index.html JS 연동 (v3.4.0)
- [x] Service Worker 버전 업데이트
- [x] Git 커밋 및 푸시
- [ ] 웹사이트 "75개 특허" 표시 확인 (배포 후)
- [ ] F12 콘솔 "D1 로드 완료: 75개" 확인 (배포 후)
- [ ] API 응답 테스트 (배포 후)

---

## 🎯 배포 완료 기준

**성공 조건**:
1. ✅ 웹사이트에서 "총 75개 특허" 표시
2. ✅ F12 콘솔에서 "D1 로드 완료: 75개"
3. ✅ Service Worker v3.4.0 활성화
4. ✅ API `/api/patents` 정상 응답

**배포 URL**: https://gst-patents.com
**배포 시각**: 2025-10-25 22:52 (자동 배포 중)
**예상 완료**: 1-2분 이내

