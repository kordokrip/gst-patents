# Streamlit 앱 웹 검색 개선 가이드

## 📋 변경 사항 요약

### 1. **치명적 버그 수정**

#### OpenAI API 호출 방식 수정
```python
# ❌ 이전 (잘못된 방식)
llm_response = client.responses.create(
    model=CHAT_MODEL,
    input=[{"role": "user", "content": prompt}]
)
answer_text = llm_response.output_text.strip()

# ✅ 수정 (올바른 방식)
chat_response = client.chat.completions.create(
    model=CHAT_MODEL,
    messages=[
        {"role": "system", "content": "시스템 프롬프트"},
        {"role": "user", "content": prompt}
    ],
    temperature=0.3,
    max_tokens=1500
)
answer_text = chat_response.choices[0].message.content.strip()
```

**문제점:**
- `client.responses.create()` 메서드는 OpenAI API에 존재하지 않음
- `output_text` 속성도 존재하지 않음
- 올바른 메서드: `client.chat.completions.create()`

### 2. **모델명 수정**

#### .env 파일
```bash
# ❌ 이전 (존재하지 않는 모델)
OPENAI_CHAT_MODEL=gpt-5-mini-2025-08-07

# ✅ 수정 (실제 존재하는 모델)
OPENAI_CHAT_MODEL=gpt-4o-mini
```

**사용 가능한 모델:**
- `gpt-4o` - GPT-4 Omni (최신, 가장 강력)
- `gpt-4o-mini` - GPT-4 Omni Mini (빠르고 저렴, 권장)
- `gpt-4-turbo` - GPT-4 Turbo
- `gpt-3.5-turbo` - GPT-3.5 (가장 저렴)

### 3. **웹 검색 개선**

#### 기존 문제
```python
# ❌ 이전 (작동하지 않는 API)
resp = requests.get(
    "https://ddg-api.herokuapp.com/search",  # Heroku 무료 플랜 종료로 서비스 중단
    params={"q": query, "max_results": max_results},
    timeout=8,
)
```

#### 개선된 방식
```python
# ✅ 수정 (duckduckgo-search 라이브러리 사용)
from duckduckgo_search import DDGS

with DDGS() as ddgs:
    results = []
    search_query = f"{query} 특허 OR patent"  # 특허 관련 키워드 추가
    
    for idx, result in enumerate(ddgs.text(search_query, max_results=max_results)):
        if idx >= max_results:
            break
        results.append({
            "title": result.get("title", ""),
            "snippet": result.get("body", "")[:300],
            "link": result.get("href", ""),
        })
    
    print(f"[웹 검색] '{query}' - {len(results)}개 결과 발견")
    return results
```

**개선 사항:**
- ✅ 신뢰할 수 있는 `duckduckgo-search` 라이브러리 사용
- ✅ 특허 관련 키워드 자동 추가 (`특허 OR patent`)
- ✅ 검색 결과 로깅으로 디버깅 용이
- ✅ 에러 핸들링 강화
- ✅ .env 설정으로 웹 검색 활성화/비활성화 가능

### 4. **환경 변수 추가**

#### .env 파일
```bash
# 웹 검색 활성화/비활성화
WEB_SEARCH_ENABLED=true
```

#### streamlit_app.py
```python
WEB_SEARCH_ENABLED = os.getenv("WEB_SEARCH_ENABLED", "true").lower() == "true"
```

### 5. **UI 개선**

#### Sidebar 정보 강화
- ✅ 웹 검색 상태 표시
- ✅ 사용 중인 AI 모델 표시
- ✅ 토큰 사용량 로깅
- ✅ 사용 팁 추가

---

## 🚀 사용 방법

### 1. 라이브러리 설치

```bash
pip install -r requirements.txt
```

**주요 업데이트:**
- `duckduckgo-search>=6.0.0` 추가

### 2. 환경 변수 설정

`.env` 파일 확인:
```bash
OPENAI_CHAT_MODEL=gpt-4o-mini
WEB_SEARCH_ENABLED=true
```

### 3. Streamlit 앱 실행

```bash
streamlit run streamlit_app.py
```

---

## 🔍 웹 검색 작동 확인 방법

### 1. **터미널 로그 확인**

앱 실행 후 질문을 입력하면 다음과 같은 로그가 출력됩니다:

```
[웹 검색] '스크러버 기술' - 4개 결과 발견
[OpenAI] 모델: gpt-4o-mini, 토큰: 1234 (입력: 890, 출력: 344)
```

### 2. **응답 내용 확인**

AI 응답의 **출처** 섹션에서 웹 검색 결과를 확인할 수 있습니다:

```
출처:
- [특허1] 스크러버 기술 문서 (페이지 3)
- [특허2] 냉각 시스템 특허 (페이지 5)
- [웹1] DuckDuckGo 검색: "스크러버 특허 기술"
- [웹2] DuckDuckGo 검색: "반도체 정화 장치"
```

### 3. **Sidebar에서 웹 검색 비활성화 테스트**

1. 왼쪽 사이드바에서 "웹 검색 결과 포함" 체크박스 해제
2. 동일한 질문 입력
3. 응답에서 `[웹]` 태그가 사라지는지 확인

---

## 🐛 트러블슈팅

### 문제 1: `ImportError: No module named 'duckduckgo_search'`

**해결:**
```bash
pip install duckduckgo-search
```

### 문제 2: 웹 검색 결과가 나오지 않음

**원인:**
- DuckDuckGo API 제한 또는 네트워크 문제

**해결:**
1. 터미널 로그 확인: `[웹 검색] 오류 발생: ...`
2. `.env`에서 `WEB_SEARCH_ENABLED=false` 설정 (임시)
3. VPN 사용 시 비활성화 후 재시도

### 문제 3: OpenAI API 오류

**원인:**
- 잘못된 모델명 또는 API 키

**해결:**
1. `.env` 파일 확인:
   ```bash
   OPENAI_API_KEY=sk-proj-...  # 유효한 키
   OPENAI_CHAT_MODEL=gpt-4o-mini  # 올바른 모델명
   ```
2. OpenAI 계정에서 API 키 잔액 확인
3. 모델 접근 권한 확인

### 문제 4: Pinecone 연결 오류

**해결:**
```bash
# .env 파일 확인
PINECONE_API_KEY=pcsk_...
PINECONE_INDEX=gstllm
PINECONE_NAMESPACE=gst-patents
```

---

## 📊 성능 최적화 팁

### 1. **모델 선택**

| 모델 | 속도 | 비용 | 품질 | 권장 |
|------|------|------|------|------|
| gpt-4o | 느림 | 높음 | 최상 | 프로덕션 |
| gpt-4o-mini | 빠름 | 낮음 | 우수 | ✅ 권장 |
| gpt-3.5-turbo | 매우 빠름 | 매우 낮음 | 양호 | 개발/테스트 |

### 2. **검색 결과 수 조절**

```python
# Sidebar에서 조절 가능
top_k = 5              # Pinecone 검색 결과 (권장: 3-7)
web_results_limit = 3  # 웹 검색 결과 (권장: 2-4)
```

### 3. **토큰 사용량 모니터링**

터미널 로그에서 확인:
```
[OpenAI] 모델: gpt-4o-mini, 토큰: 1234 (입력: 890, 출력: 344)
```

---

## ✅ 체크리스트

배포 전 확인 사항:

- [ ] `.env` 파일의 `OPENAI_CHAT_MODEL=gpt-4o-mini` 설정
- [ ] `pip install duckduckgo-search` 실행
- [ ] OpenAI API 키 잔액 확인
- [ ] Pinecone 인덱스 연결 테스트
- [ ] 웹 검색 기능 테스트 (로그 확인)
- [ ] 터미널에서 토큰 사용량 모니터링
- [ ] Streamlit Cloud 배포 시 `requirements.txt` 업데이트 확인

---

## 📝 주요 변경 파일

1. **streamlit_app.py**
   - OpenAI API 호출 방식 수정 (`chat.completions.create`)
   - 웹 검색 함수 개선 (`duckduckgo-search` 사용)
   - 토큰 사용량 로깅 추가
   - Sidebar UI 개선

2. **.env**
   - `OPENAI_CHAT_MODEL=gpt-4o-mini`
   - `WEB_SEARCH_ENABLED=true` 추가

3. **requirements.txt**
   - `duckduckgo-search>=6.0.0` 추가

4. **.env.example**
   - 최신 모델명 및 설정 업데이트

---

## 🎯 다음 단계

1. **로컬 테스트**
   ```bash
   streamlit run streamlit_app.py
   ```

2. **웹 검색 확인**
   - 질문 입력 후 터미널 로그에서 `[웹 검색]` 메시지 확인
   - 응답의 출처 섹션에서 `[웹1]`, `[웹2]` 태그 확인

3. **Streamlit Cloud 재배포**
   - GitHub에 푸시
   - Streamlit Cloud에서 자동 재배포
   - `requirements.txt` 업데이트 반영 확인

---

## 💡 추가 개선 제안

### 1. **웹 검색 품질 향상**

특허 전문 검색 엔진 통합:
- Google Patents API
- USPTO (미국 특허청) API
- KIPRIS (한국 특허정보원) API

### 2. **응답 품질 개선**

```python
# temperature 조절로 응답 스타일 변경
temperature=0.3  # 일관되고 사실적 (현재)
temperature=0.7  # 창의적이고 다양한
```

### 3. **캐싱 추가**

```python
@st.cache_data(ttl=3600)  # 1시간 캐시
def web_search_cached(query: str, max_results: int = 4):
    return web_search(query, max_results)
```

---

**작성일:** 2025-01-25  
**버전:** 2.0  
**작성자:** GitHub Copilot
