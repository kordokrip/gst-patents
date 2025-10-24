# 🍎 MacOS 웹개발 초보자를 위한 완전 가이드

> GST 특허 관리 시스템을 MacOS 환경에서 개발하고 실행하는 방법

## 📋 목차

1. [개발 환경 준비](#1-개발-환경-준비)
2. [프로젝트 다운로드 및 설정](#2-프로젝트-다운로드-및-설정)
3. [로컬 서버 실행](#3-로컬-서버-실행)
4. [개발 도구 활용](#4-개발-도구-활용)
5. [코드 수정 및 테스트](#5-코드-수정-및-테스트)
6. [문제 해결 가이드](#6-문제-해결-가이드)

---

## 1. 개발 환경 준비

### 1.1 필수 프로그램 설치

#### **Step 1: Homebrew 설치 (패키지 관리자)**

MacOS용 패키지 관리자인 Homebrew를 설치합니다.

```bash
# 터미널 열기 (Command + Space, "터미널" 검색)
# 다음 명령어 복사 후 붙여넣기
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

**실행 방법:**
1. `Command + Space` 누르고 "터미널" 입력
2. 터미널 앱 실행
3. 위 명령어 붙여넣고 `Enter`
4. 비밀번호 입력 요청시 Mac 비밀번호 입력

#### **Step 2: Node.js 설치**

웹 서버를 실행하기 위해 Node.js를 설치합니다.

```bash
# Homebrew로 Node.js 설치
brew install node

# 설치 확인
node --version
npm --version
```

**예상 결과:**
```
node --version
v20.9.0

npm --version
10.1.0
```

#### **Step 3: Git 설치**

코드 버전 관리를 위해 Git을 설치합니다.

```bash
# Git 설치
brew install git

# 설치 확인
git --version
```

#### **Step 4: 코드 에디터 설치**

**VS Code (권장)**
- [Visual Studio Code 다운로드](https://code.visualstudio.com/)
- `.dmg` 파일 다운로드 후 Applications 폴더로 드래그

**유용한 VS Code 확장 프로그램:**
1. Live Server
2. HTML CSS Support
3. JavaScript (ES6) code snippets
4. Prettier - Code formatter

---

## 2. 프로젝트 다운로드 및 설정

### 2.1 프로젝트 폴더 생성

```bash
# 홈 디렉토리로 이동
cd ~

# 개발 폴더 생성
mkdir Development
cd Development

# 프로젝트 폴더 생성
mkdir gst-patent-management
cd gst-patent-management
```

### 2.2 프로젝트 파일 복사

현재 개발된 파일들을 다음과 같이 구성합니다:

```
gst-patent-management/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── main.js
│   ├── patents.js
│   ├── charts.js
│   └── timeline.js
├── pages/
│   ├── architecture.html
│   ├── api-docs.html
│   └── roadmap.html
├── README.md
├── DEVELOPMENT_GUIDE.md
└── COLLABORATION_GUIDE.md
```

**파일 생성 방법:**

1. **VS Code로 폴더 열기**
   ```bash
   # 현재 폴더를 VS Code로 열기
   code .
   ```

2. **각 파일을 하나씩 생성하고 내용 복사**
   - VS Code에서 `Command + N` (새 파일)
   - 파일 내용 붙여넣기
   - `Command + S` (저장), 파일명 입력

### 2.3 패키지 초기화

```bash
# package.json 파일 생성
npm init -y

# 로컬 서버 패키지 설치
npm install --save-dev live-server
npm install --save-dev http-server
```

---

## 3. 로컬 서버 실행

### 3.1 방법 1: Live Server 사용 (VS Code)

**VS Code 확장 프로그램 활용:**

1. VS Code에서 `index.html` 파일 열기
2. 파일에서 우클릭 → "Open with Live Server" 선택
3. 자동으로 브라우저에서 `http://127.0.0.1:5500` 열림

**장점:** 코드 수정시 자동으로 브라우저 새로고침

### 3.2 방법 2: http-server 사용 (터미널)

```bash
# 프로젝트 폴더에서 실행
npx http-server . -p 8000

# 또는 전역 설치 후 사용
npm install -g http-server
http-server . -p 8000
```

**접속:** 브라우저에서 `http://localhost:8000`

### 3.3 방법 3: Python 내장 서버 (간단한 방법)

```bash
# Python 3 사용
python3 -m http.server 8000

# Python 2 사용 (구버전)
python -m SimpleHTTPServer 8000
```

**접속:** 브라우저에서 `http://localhost:8000`

---

## 4. 개발 도구 활용

### 4.1 브라우저 개발자 도구

**Chrome DevTools 열기:**
- `Command + Option + I`
- 우클릭 → "검사"

**주요 탭:**
1. **Elements**: HTML/CSS 구조 확인 및 수정
2. **Console**: JavaScript 오류 확인
3. **Network**: API 호출 상태 확인
4. **Application**: 로컬 스토리지 확인

### 4.2 실시간 디버깅

**Console 활용:**
```javascript
// 콘솔에서 직접 테스트
console.log("테스트 메시지");
console.log(window.patentManager);
```

**Elements 탭에서 CSS 수정:**
- 스타일을 실시간으로 수정하여 테스트
- 확인된 스타일을 `style.css`에 반영

---

## 5. 코드 수정 및 테스트

### 5.1 기본 수정 워크플로우

1. **VS Code에서 파일 수정**
2. **저장 (Command + S)**
3. **브라우저에서 새로고침 (Command + R)**
4. **결과 확인**

### 5.2 HTML 수정 예시

**특허 데이터 추가:**
```html
<!-- js/patents.js에서 샘플 데이터 수정 -->
{
    id: "새로운ID",
    patent_number: "10-2024001234",
    title: "새로운 특허 제목",
    category: "gas",
    registration_date: "2024-01-15",
    status: "active"
}
```

### 5.3 CSS 스타일 수정

**색상 변경:**
```css
/* css/style.css */
:root {
    --gst-blue: #your-new-color;
    --gst-light-blue: #your-new-light-color;
}
```

### 5.4 JavaScript 기능 추가

**새로운 기능 추가:**
```javascript
// js/main.js에 새로운 함수 추가
function newFeature() {
    console.log("새로운 기능 실행");
    // 기능 구현
}
```

---

## 6. 문제 해결 가이드

### 6.1 일반적인 문제들

#### **문제 1: 서버 실행 안됨**
```bash
# 포트가 이미 사용중인 경우
lsof -i :8000  # 포트 사용 프로세스 확인
kill -9 [PID]  # 프로세스 종료

# 다른 포트 사용
python3 -m http.server 8080
```

#### **문제 2: 파일 로딩 오류**
- CORS 오류 발생시 반드시 로컬 서버 사용
- 파일 경로 확인 (대소문자 구분)
- 브라우저 캐시 삭제 (`Command + Shift + R`)

#### **문제 3: JavaScript 오류**
```javascript
// 콘솔에서 오류 확인
// 오타 및 구문 오류 수정
// 변수명 확인
```

### 6.2 디버깅 팁

**Console 활용:**
```javascript
// 변수 상태 확인
console.log("patentManager:", window.patentManager);
console.log("현재 특허 수:", window.patentManager?.patents?.length);

// 함수 실행 확인
console.log("함수 시작");
// 코드 실행
console.log("함수 완료");
```

**Network 탭 활용:**
- API 호출 실패시 상태 코드 확인
- 404 오류 = 파일 경로 문제
- CORS 오류 = 로컬 서버 필요

---

## 7. 다음 단계

### 7.1 개발 환경 고도화

**추가 도구들:**
1. **Webpack**: 모듈 번들러
2. **Babel**: ES6+ 코드 변환
3. **ESLint**: 코드 품질 검사
4. **Prettier**: 코드 포맷팅

### 7.2 백엔드 개발 준비

**Python 환경:**
```bash
# Python 가상환경 생성
python3 -m venv venv
source venv/bin/activate

# FastAPI 설치 (다음 가이드에서 사용)
pip install fastapi uvicorn
```

---

## 🚀 실행 체크리스트

### ✅ 설치 확인
- [ ] Homebrew 설치 완료
- [ ] Node.js 설치 완료 (`node --version`)
- [ ] Git 설치 완료 (`git --version`)
- [ ] VS Code 설치 완료

### ✅ 프로젝트 설정
- [ ] 프로젝트 폴더 생성
- [ ] 모든 파일 복사 완료
- [ ] package.json 생성 완료

### ✅ 서버 실행
- [ ] 로컬 서버 실행 성공
- [ ] 브라우저에서 접속 확인
- [ ] 모든 섹션 표시 확인

### ✅ 개발 환경
- [ ] VS Code 확장 프로그램 설치
- [ ] 브라우저 개발자 도구 활용 가능
- [ ] 코드 수정 및 테스트 가능

---

## 📞 도움이 필요할 때

### 터미널 명령어 모음

```bash
# 현재 위치 확인
pwd

# 폴더 내용 보기
ls -la

# 폴더 이동
cd 폴더명

# 파일/폴더 삭제
rm -rf 폴더명

# 프로세스 확인
ps aux | grep node

# 포트 사용 확인
lsof -i :8000
```

### 유용한 단축키

**VS Code:**
- `Command + P`: 빠른 파일 열기
- `Command + Shift + P`: 명령 팔레트
- `Command + /`: 주석 토글
- `Command + D`: 같은 단어 선택

**브라우저:**
- `Command + Option + I`: 개발자 도구
- `Command + Shift + R`: 강력 새로고침
- `Command + 0`: 확대/축소 초기화

이 가이드를 따라하시면 MacOS에서 GST 특허 관리 시스템을 성공적으로 실행하고 개발할 수 있습니다! 🎉