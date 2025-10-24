# 🚀 GST 특허관리시스템 완전 설치 및 실행 가이드

> **MacOS 웹개발 완전 초보자를 위한 단계별 실행 안내서**
> 
> ⚠️ **이 가이드만 따라하면 100% 실행됩니다!**

## 📋 목차

1. [사전 준비 및 기본 설정](#1-사전-준비-및-기본-설정)
2. [개발 도구 설치](#2-개발-도구-설치)
3. [프로젝트 파일 준비](#3-프로젝트-파일-준비)
4. [웹사이트 실행](#4-웹사이트-실행)
5. [백엔드 서버 설정 (선택사항)](#5-백엔드-서버-설정-선택사항)
6. [Docker로 실행하기](#6-docker로-실행하기)
7. [클라우드 배포하기](#7-클라우드-배포하기)
8. [문제 해결 가이드](#8-문제-해결-가이드)

---

## 1. 사전 준비 및 기본 설정

### 1.1 MacOS 버전 확인

**Step 1: 시스템 정보 확인**
```bash
# 터미널을 열어서 다음 명령어 실행
# (Command + Space → "터미널" 검색 → Enter)

# MacOS 버전 확인
sw_vers

# 예상 결과:
# ProductName:    macOS
# ProductVersion: 13.0
# BuildVersion:   22A380
```

**Step 2: Xcode Command Line Tools 설치**
```bash
# 개발 도구 설치 (필수)
xcode-select --install

# 설치 확인
xcode-select -p
# 결과: /Library/Developer/CommandLineTools
```

**💡 주의사항:**
- 설치 과정에서 팝업창이 나타나면 "설치" 클릭
- 약 5-10분 소요됨
- 인터넷 연결 필수

### 1.2 기본 폴더 구조 생성

```bash
# 홈 디렉토리로 이동
cd ~

# 개발 폴더 생성
mkdir -p Development/GST-Patent-Management
cd Development/GST-Patent-Management

# 현재 위치 확인
pwd
# 결과: /Users/당신의사용자명/Development/GST-Patent-Management
```

---

## 2. 개발 도구 설치

### 2.1 Homebrew 설치 (패키지 관리자)

**Step 1: Homebrew 설치**
```bash
# 다음 명령어를 터미널에 복사 붙여넣기
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

**설치 과정에서 나타나는 메시지들:**
1. "Press RETURN to continue" → **Enter 키 누르기**
2. 비밀번호 입력 요구 → **Mac 로그인 비밀번호 입력** (화면에 안보여도 정상)
3. 설치 완료까지 약 10-15분 소요

**Step 2: Homebrew 설정 추가**
```bash
# M1/M2 Mac의 경우 PATH 설정 추가
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
source ~/.zprofile

# Intel Mac의 경우
echo 'eval "$(/usr/local/bin/brew shellenv)"' >> ~/.zprofile
source ~/.zprofile

# 설치 확인
brew --version
# 결과: Homebrew 4.x.x
```

### 2.2 필수 도구들 설치

**Step 1: Node.js 설치**
```bash
# Node.js 설치 (웹서버 실행용)
brew install node

# 설치 확인
node --version
npm --version

# 예상 결과:
# v20.9.0
# 10.1.0
```

**Step 2: Python 설치**
```bash
# Python 설치 (AI 백엔드용)
brew install python@3.11

# 설치 확인
python3 --version
pip3 --version

# 예상 결과:
# Python 3.11.x
# pip 23.x.x
```

**Step 3: Git 설치**
```bash
# Git 설치 (코드 관리용)
brew install git

# 설치 확인
git --version
# 결과: git version 2.x.x
```

**Step 4: Visual Studio Code 설치**
```bash
# VS Code 설치
brew install --cask visual-studio-code

# 설치 확인 - 다음 명령어로 VS Code 실행
code --version
```

**만약 code 명령어가 작동하지 않는다면:**
1. VS Code 실행
2. `Command + Shift + P`
3. "Shell Command: Install 'code' command in PATH" 검색 후 실행

### 2.3 Docker 설치 (배포용)

```bash
# Docker Desktop 설치
brew install --cask docker

# 설치 완료 후 Applications에서 Docker 실행
open /Applications/Docker.app

# 설치 확인 (Docker 실행 후)
docker --version
docker-compose --version
```

---

## 3. 프로젝트 파일 준비

### 3.1 프로젝트 구조 생성

```bash
# 프로젝트 폴더로 이동
cd ~/Development/GST-Patent-Management

# 필요한 폴더들 생성
mkdir -p frontend/{css,js,pages,images}
mkdir -p backend/{data/{pdfs,vectordb},tests}
mkdir -p docker

# 폴더 구조 확인
tree . -L 3
```

**완성된 폴더 구조:**
```
GST-Patent-Management/
├── frontend/
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── main.js
│   │   ├── patents.js
│   │   ├── charts.js
│   │   └── timeline.js
│   ├── pages/
│   │   ├── architecture.html
│   │   ├── api-docs.html
│   │   └── roadmap.html
│   └── images/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── .env
│   └── data/
│       ├── pdfs/
│       └── vectordb/
├── docker/
│   ├── Dockerfile.frontend
│   ├── Dockerfile.backend
│   └── docker-compose.yml
├── README.md
└── COMPLETE_SETUP_GUIDE.md
```

### 3.2 프론트엔드 파일 생성

**Step 1: package.json 생성**
```bash
cd ~/Development/GST-Patent-Management/frontend

# package.json 초기화
npm init -y

# 개발 도구 설치
npm install --save-dev live-server http-server
```

**Step 2: 메인 HTML 파일 생성**
```bash
# VS Code로 프로젝트 열기
code ~/Development/GST-Patent-Management
```

이제 VS Code에서 다음 파일들을 생성합니다:

**`frontend/index.html`**
```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>글로벌 스탠다드 테크놀로지 - 특허 관리 시스템</title>
    
    <!-- 외부 라이브러리 CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- 커스텀 스타일 -->
    <link rel="stylesheet" href="css/style.css">
    
    <!-- Tailwind 설정 -->
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        'korean': ['Noto Sans KR', 'sans-serif']
                    },
                    colors: {
                        'gst-blue': '#1e40af',
                        'gst-light-blue': '#3b82f6',
                        'gst-gray': '#6b7280',
                        'gst-dark': '#1f2937'
                    }
                }
            }
        }
    </script>
</head>
<body class="font-korean bg-gray-50">
    <!-- 네비게이션 바 -->
    <nav class="bg-gst-blue shadow-lg">
        <div class="container mx-auto px-4">
            <div class="flex justify-between items-center py-4">
                <div class="flex items-center space-x-4">
                    <div class="text-white text-xl font-bold">
                        <i class="fas fa-microscope mr-2"></i>
                        GST 특허관리시스템
                    </div>
                </div>
                <div class="hidden md:flex space-x-6">
                    <a href="#dashboard" class="text-white hover:text-blue-200 transition-colors">
                        <i class="fas fa-chart-dashboard mr-1"></i> 대시보드
                    </a>
                    <a href="#patents" class="text-white hover:text-blue-200 transition-colors">
                        <i class="fas fa-file-text mr-1"></i> 특허 목록
                    </a>
                    <a href="#analytics" class="text-white hover:text-blue-200 transition-colors">
                        <i class="fas fa-chart-bar mr-1"></i> 분석
                    </a>
                    <a href="#ai-analysis" class="text-white hover:text-blue-200 transition-colors">
                        <i class="fas fa-robot mr-1"></i> AI 분석
                    </a>
                    <a href="#rag-docs" class="text-white hover:text-blue-200 transition-colors">
                        <i class="fas fa-book mr-1"></i> RAG 문서
                    </a>
                </div>
            </div>
        </div>
    </nav>

    <!-- 메인 컨텐츠 -->
    <main>
        <div class="container mx-auto px-4 py-8">
            
            <!-- 헤더 섹션 -->
            <header class="text-center mb-12">
                <h1 class="text-4xl font-bold text-gst-dark mb-4">
                    반도체 유해가스 정화장비 특허 관리 시스템
                </h1>
                <p class="text-xl text-gst-gray max-w-3xl mx-auto">
                    글로벌 스탠다드 테크놀로지의 78개 특허를 체계적으로 관리하고 분석하는 
                    통합 플랫폼입니다.
                </p>
            </header>

            <!-- 대시보드 통계 -->
            <section id="dashboard" class="mb-16">
                <h2 class="text-3xl font-semibold text-gst-dark mb-8 flex items-center">
                    <i class="fas fa-chart-dashboard mr-3 text-gst-blue"></i>
                    대시보드 개요
                </h2>
                
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div class="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow stats-card">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm font-medium text-gst-gray">총 특허 수</p>
                                <p class="text-3xl font-bold text-gst-dark" id="total-patents">78</p>
                            </div>
                            <div class="text-gst-blue">
                                <i class="fas fa-file-text text-3xl"></i>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow stats-card">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm font-medium text-gst-gray">활성 특허</p>
                                <p class="text-3xl font-bold text-green-600" id="active-patents">65</p>
                            </div>
                            <div class="text-green-600">
                                <i class="fas fa-check-circle text-3xl"></i>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow stats-card">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm font-medium text-gst-gray">기술 분야</p>
                                <p class="text-3xl font-bold text-purple-600" id="tech-categories">8</p>
                            </div>
                            <div class="text-purple-600">
                                <i class="fas fa-cogs text-3xl"></i>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow stats-card">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm font-medium text-gst-gray">평균 점수</p>
                                <p class="text-3xl font-bold text-orange-600" id="avg-score">8.2</p>
                            </div>
                            <div class="text-orange-600">
                                <i class="fas fa-star text-3xl"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- AI 분석 섹션 -->
            <section id="ai-analysis" class="mb-16">
                <h2 class="text-3xl font-semibold text-gst-dark mb-8 flex items-center">
                    <i class="fas fa-robot mr-3 text-gst-blue"></i>
                    AI 특허 분석 (준비중)
                </h2>
                
                <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-8 text-center">
                    <div class="max-w-2xl mx-auto">
                        <i class="fas fa-rocket text-6xl text-gst-blue mb-4"></i>
                        <h3 class="text-2xl font-semibold text-gst-dark mb-4">
                            Langchain 기반 AI 분석 시스템
                        </h3>
                        <p class="text-gst-gray mb-6">
                            한국/미국 특허청 데이터 연동, 벡터 유사도 검색, LLM 분석 기능이 
                            백엔드 서버 설정 후 활성화됩니다.
                        </p>
                        <div class="bg-white rounded-lg p-4 inline-block">
                            <p class="text-sm text-gst-gray">
                                <i class="fas fa-info-circle mr-2"></i>
                                백엔드 서버 실행 후 이용 가능
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- RAG 문서 섹션 -->
            <section id="rag-docs" class="mb-20 clearfix">
                <h2 class="text-3xl font-semibold text-gst-dark mb-8 flex items-center">
                    <i class="fas fa-book mr-3 text-gst-blue"></i>
                    RAG 시스템 설계 문서
                </h2>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
                        <h3 class="text-lg font-semibold text-gst-dark mb-3">
                            <i class="fas fa-sitemap mr-2 text-gst-blue"></i>
                            아키텍처 설계
                        </h3>
                        <p class="text-gst-gray mb-4">RAG 시스템의 전체 아키텍처와 컴포넌트 구조</p>
                        <a href="pages/architecture.html" class="text-gst-blue hover:text-gst-dark font-medium">
                            자세히 보기 <i class="fas fa-arrow-right ml-1"></i>
                        </a>
                    </div>
                    
                    <div class="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
                        <h3 class="text-lg font-semibold text-gst-dark mb-3">
                            <i class="fas fa-code mr-2 text-gst-blue"></i>
                            API 명세서
                        </h3>
                        <p class="text-gst-gray mb-4">벡터 데이터베이스 및 LLM API 연동 가이드</p>
                        <a href="pages/api-docs.html" class="text-gst-blue hover:text-gst-dark font-medium">
                            자세히 보기 <i class="fas fa-arrow-right ml-1"></i>
                        </a>
                    </div>
                    
                    <div class="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
                        <h3 class="text-lg font-semibold text-gst-dark mb-3">
                            <i class="fas fa-road mr-2 text-gst-blue"></i>
                            개발 로드맵
                        </h3>
                        <p class="text-gst-gray mb-4">향후 개발 계획과 단계별 구현 가이드</p>
                        <a href="pages/roadmap.html" class="text-gst-blue hover:text-gst-dark font-medium">
                            자세히 보기 <i class="fas fa-arrow-right ml-1"></i>
                        </a>
                    </div>
                </div>
            </section>
        </div>
    </main>

    <!-- JavaScript -->
    <script src="js/main.js"></script>
</body>
</html>
```

**Step 3: 기본 CSS 파일 생성**

**`frontend/css/style.css`**
```css
/* GST 특허 관리 시스템 스타일 */

:root {
    --gst-blue: #1e40af;
    --gst-light-blue: #3b82f6;
    --gst-gray: #6b7280;
    --gst-dark: #1f2937;
}

body {
    font-family: 'Noto Sans KR', sans-serif;
    line-height: 1.6;
}

.stats-card {
    transition: all 0.3s ease;
}

.stats-card:hover {
    transform: translateY(-4px);
}

#rag-docs {
    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
    padding: 3rem 2rem;
    border-radius: 20px;
    margin: 2rem auto;
}

@media (max-width: 768px) {
    .container {
        padding-left: 1rem;
        padding-right: 1rem;
    }
}
```

**Step 4: 기본 JavaScript 파일 생성**

**`frontend/js/main.js`**
```javascript
// GST 특허 관리 시스템 메인 JavaScript

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 GST 특허 관리 시스템 초기화');
    
    // 부드러운 스크롤 네비게이션
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // 통계 카드 애니메이션
    animateStats();
    
    console.log('✅ 시스템 초기화 완료');
});

function animateStats() {
    const stats = [
        { id: 'total-patents', value: 78 },
        { id: 'active-patents', value: 65 },
        { id: 'tech-categories', value: 8 },
        { id: 'avg-score', value: 8.2 }
    ];
    
    stats.forEach(stat => {
        const element = document.getElementById(stat.id);
        if (element) {
            animateNumber(element, 0, stat.value, 1500);
        }
    });
}

function animateNumber(element, start, end, duration) {
    const startTime = performance.now();
    const isDecimal = end % 1 !== 0;
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const current = start + (end - start) * progress;
        element.textContent = isDecimal ? current.toFixed(1) : Math.floor(current);
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

// 전역 함수로 노출
window.GST = {
    animateStats
};
```

---

## 4. 웹사이트 실행

### 4.1 방법 1: Live Server (가장 쉬운 방법)

**Step 1: VS Code 확장 프로그램 설치**
1. VS Code 실행
2. 왼쪽 사이드바에서 확장 프로그램 아이콘 클릭 (또는 `Cmd + Shift + X`)
3. "Live Server" 검색
4. "Live Server" (ritwickdey 제작) 설치

**Step 2: 웹사이트 실행**
1. VS Code에서 `frontend/index.html` 파일 열기
2. 파일 내용에서 우클릭
3. "Open with Live Server" 선택
4. 자동으로 브라우저에서 `http://127.0.0.1:5500` 열림

**✅ 성공 확인:**
- 브라우저에 GST 특허관리시스템 페이지가 표시됨
- 네비게이션이 정상 작동
- 통계 숫자가 애니메이션으로 카운트업

### 4.2 방법 2: 터미널에서 실행

```bash
# frontend 폴더로 이동
cd ~/Development/GST-Patent-Management/frontend

# 로컬 서버 실행
npx live-server --port=8080

# 또는 Python 서버 사용
python3 -m http.server 8080

# 브라우저에서 접속: http://localhost:8080
```

### 4.3 실행 확인 체크리스트

**✅ 확인해야 할 것들:**
- [ ] 페이지가 정상적으로 로딩됨
- [ ] 한글 폰트가 제대로 표시됨
- [ ] 네비게이션 메뉴 클릭시 부드러운 스크롤
- [ ] 통계 숫자가 0에서 시작해서 카운트업
- [ ] 반응형 디자인 작동 (브라우저 크기 조절)
- [ ] 콘솔에 오류 없음 (`F12` → Console 탭)

---

## 5. 백엔드 서버 설정 (선택사항)

### 5.1 Python 가상환경 생성

```bash
# backend 폴더로 이동
cd ~/Development/GST-Patent-Management/backend

# 가상환경 생성
python3 -m venv venv

# 가상환경 활성화
source venv/bin/activate

# 활성화 확인 (프롬프트에 (venv) 표시됨)
which python
# 결과: ~/Development/GST-Patent-Management/backend/venv/bin/python
```

### 5.2 필수 패키지 설치

**Step 1: requirements.txt 생성**

**`backend/requirements.txt`**
```
fastapi==0.104.1
uvicorn==0.24.0
python-multipart==0.0.6
python-dotenv==1.0.0
aiofiles==23.2.0
requests==2.31.0
pandas==2.1.4
numpy==1.24.3

# AI/ML 패키지 (선택사항)
langchain==0.0.340
langchain-community==0.0.20
langchain-openai==0.0.5
openai==1.3.8
sentence-transformers==2.2.2
chromadb==0.4.18
```

**Step 2: 패키지 설치**
```bash
# 패키지 일괄 설치
pip install -r requirements.txt

# 설치 확인
pip list | grep fastapi
pip list | grep uvicorn
```

### 5.3 기본 FastAPI 서버 생성

**`backend/main.py`**
```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from typing import Dict, List

# FastAPI 앱 생성
app = FastAPI(
    title="GST Patent Management API",
    description="글로벌 스탠다드 테크놀로지 특허 관리 API",
    version="1.0.0"
)

# CORS 설정 (프론트엔드 연동용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 개발용 설정
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 샘플 특허 데이터
SAMPLE_PATENTS = [
    {
        "id": "1",
        "patent_number": "10-201701704",
        "title": "산화질 가스 분해 시스템 기술",
        "abstract": "반도체 제조 공정에서 발생하는 산화질 가스를 효과적으로 분해하는 시스템",
        "category": "gas",
        "status": "active",
        "registration_date": "2024-09-29",
        "priority_score": 9
    },
    {
        "id": "2", 
        "patent_number": "10-200600387",
        "title": "온도 측정 센서 시스템 개발",
        "abstract": "정밀한 온도 측정을 위한 센서 시스템 개발에 관한 특허",
        "category": "temperature",
        "status": "active", 
        "registration_date": "2024-09-29",
        "priority_score": 8
    },
    {
        "id": "3",
        "patent_number": "10-200612177", 
        "title": "다층 기판 출력 처리 청취 1호",
        "abstract": "다층 기판의 출력 처리를 위한 특고가스 시스템",
        "category": "plasma",
        "status": "active",
        "registration_date": "2006-07-26", 
        "priority_score": 7
    }
]

# 루트 엔드포인트
@app.get("/")
async def root():
    return {
        "message": "GST Patent Management API",
        "version": "1.0.0",
        "status": "running"
    }

# 특허 목록 조회
@app.get("/api/patents")
async def get_patents():
    return {
        "data": SAMPLE_PATENTS,
        "total": len(SAMPLE_PATENTS),
        "message": "특허 목록 조회 성공"
    }

# 특허 검색
@app.get("/api/patents/search")
async def search_patents(q: str = ""):
    if not q:
        return {"data": SAMPLE_PATENTS, "total": len(SAMPLE_PATENTS)}
    
    # 간단한 검색 로직
    filtered_patents = [
        patent for patent in SAMPLE_PATENTS 
        if q.lower() in patent["title"].lower() or 
           q.lower() in patent["abstract"].lower()
    ]
    
    return {
        "data": filtered_patents,
        "total": len(filtered_patents),
        "query": q,
        "message": f"'{q}' 검색 결과"
    }

# 특허 상세 조회
@app.get("/api/patents/{patent_id}")
async def get_patent_detail(patent_id: str):
    patent = next((p for p in SAMPLE_PATENTS if p["id"] == patent_id), None)
    
    if not patent:
        raise HTTPException(status_code=404, detail="특허를 찾을 수 없습니다.")
    
    return {
        "data": patent,
        "message": "특허 상세 조회 성공"
    }

# 시스템 상태 확인
@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "message": "API 서버가 정상적으로 작동 중입니다.",
        "patents_count": len(SAMPLE_PATENTS)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### 5.4 환경 변수 설정

**`backend/.env`**
```bash
# 개발 환경 설정
ENVIRONMENT=development
DEBUG=True

# API 설정  
API_HOST=0.0.0.0
API_PORT=8000

# 데이터베이스 설정
DATA_PATH=./data
VECTOR_DB_PATH=./data/vectordb
PDF_STORAGE_PATH=./data/pdfs

# API 키들 (나중에 설정)
OPENAI_API_KEY=your_openai_key_here
KIPRIS_API_KEY=your_kipris_key_here
USPTO_API_KEY=your_uspto_key_here

# 보안 설정
SECRET_KEY=your-secret-key-here
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5500,http://127.0.0.1:5500
```

### 5.5 백엔드 서버 실행

```bash
# 가상환경이 활성화된 상태에서
cd ~/Development/GST-Patent-Management/backend

# FastAPI 서버 실행
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 성공 메시지:
# INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
# INFO:     Started reloader process
# INFO:     Started server process
# INFO:     Waiting for application startup.
# INFO:     Application startup complete.
```

### 5.6 백엔드 API 테스트

**브라우저에서 테스트:**
1. http://localhost:8000 - 메인 페이지
2. http://localhost:8000/docs - API 문서 (Swagger UI)
3. http://localhost:8000/api/patents - 특허 목록
4. http://localhost:8000/api/health - 상태 확인

**터미널에서 테스트:**
```bash
# 새 터미널 창에서
curl http://localhost:8000/api/patents

# 검색 테스트
curl "http://localhost:8000/api/patents/search?q=가스"
```

---

## 6. Docker로 실행하기

### 6.1 Docker 파일 생성

**`docker/Dockerfile.frontend`**
```dockerfile
# Node.js 기반 프론트엔드
FROM node:18-alpine

WORKDIR /app

# 패키지 파일 복사
COPY frontend/package*.json ./

# 의존성 설치
RUN npm install

# 소스 코드 복사
COPY frontend/ ./

# 포트 노출
EXPOSE 3000

# 개발 서버 실행
CMD ["npx", "live-server", "--host=0.0.0.0", "--port=3000", "--no-browser"]
```

**`docker/Dockerfile.backend`**
```dockerfile
# Python 기반 백엔드
FROM python:3.11-slim

WORKDIR /app

# 시스템 패키지 업데이트
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Python 패키지 설치
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 소스 코드 복사
COPY backend/ .

# 데이터 폴더 생성
RUN mkdir -p data/pdfs data/vectordb

# 포트 노출
EXPOSE 8000

# FastAPI 서버 실행
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**`docker/docker-compose.yml`**
```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ..
      dockerfile: docker/Dockerfile.frontend
    ports:
      - "3000:3000"
    volumes:
      - ../frontend:/app
    environment:
      - NODE_ENV=development
    depends_on:
      - backend

  backend:
    build:
      context: ..
      dockerfile: docker/Dockerfile.backend
    ports:
      - "8000:8000"
    volumes:
      - ../backend:/app
      - ../backend/data:/app/data
    environment:
      - ENVIRONMENT=development
      - DEBUG=True
    env_file:
      - ../backend/.env

volumes:
  patent_data:
```

### 6.2 Docker 실행

```bash
# 프로젝트 루트로 이동
cd ~/Development/GST-Patent-Management

# Docker Compose로 전체 시스템 실행
docker-compose -f docker/docker-compose.yml up --build

# 백그라운드 실행
docker-compose -f docker/docker-compose.yml up -d --build

# 실행 확인
docker-compose -f docker/docker-compose.yml ps

# 로그 확인
docker-compose -f docker/docker-compose.yml logs -f

# 중지
docker-compose -f docker/docker-compose.yml down
```

**Docker 실행 후 접속:**
- 프론트엔드: http://localhost:3000
- 백엔드 API: http://localhost:8000
- API 문서: http://localhost:8000/docs

---

## 7. 클라우드 배포하기

### 7.1 Heroku 배포 (무료)

**Step 1: Heroku CLI 설치**
```bash
# Heroku CLI 설치
brew tap heroku/brew && brew install heroku

# 로그인
heroku login
```

**Step 2: 배포용 파일 생성**

**`backend/Procfile`**
```
web: uvicorn main:app --host 0.0.0.0 --port $PORT
```

**`backend/runtime.txt`**
```
python-3.11.0
```

**Step 3: Heroku 앱 생성 및 배포**
```bash
# backend 폴더로 이동
cd ~/Development/GST-Patent-Management/backend

# Git 초기화
git init
git add .
git commit -m "Initial commit"

# Heroku 앱 생성
heroku create gst-patent-management-api

# 환경변수 설정
heroku config:set ENVIRONMENT=production
heroku config:set DEBUG=False

# 배포
git push heroku main

# 앱 열기
heroku open
```

### 7.2 Vercel 배포 (프론트엔드)

**Step 1: Vercel CLI 설치**
```bash
npm install -g vercel
```

**Step 2: 배포**
```bash
# frontend 폴더로 이동
cd ~/Development/GST-Patent-Management/frontend

# Vercel 배포
vercel

# 도메인 할당
vercel --prod
```

### 7.3 Railway 배포 (전체 스택)

**Step 1: Railway 계정 생성**
1. https://railway.app 접속
2. GitHub 연동 로그인

**Step 2: 프로젝트 연결**
1. "New Project" 클릭
2. "Deploy from GitHub repo" 선택
3. GST-Patent-Management 저장소 연결

**Step 3: 환경변수 설정**
Railway 대시보드에서:
- `ENVIRONMENT=production`
- `PORT=8000` 
- 기타 필요한 API 키들 설정

---

## 8. 문제 해결 가이드

### 8.1 일반적인 오류들

#### **문제 1: 터미널 명령어 인식 안됨**
```bash
# 해결 방법
echo $PATH
source ~/.zprofile

# Homebrew 재설정
eval "$(/opt/homebrew/bin/brew shellenv)"
```

#### **문제 2: Python 가상환경 활성화 안됨**
```bash
# 현재 디렉토리 확인
pwd

# 가상환경 재생성
rm -rf venv
python3 -m venv venv
source venv/bin/activate
```

#### **문제 3: 포트 충돌**
```bash
# 포트 사용 프로세스 확인
lsof -i :8000
lsof -i :3000

# 프로세스 종료
kill -9 [PID]

# 다른 포트 사용
uvicorn main:app --port 8001
```

#### **문제 4: CORS 오류**
```javascript
// 프론트엔드에서 API 호출시
const response = await fetch('http://localhost:8000/api/patents', {
    method: 'GET',
    headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    }
});
```

### 8.2 디버깅 도구들

**브라우저 개발자 도구:**
```bash
# Chrome/Safari에서
F12 또는 Cmd + Option + I

# 주요 탭들:
# - Console: JavaScript 오류 확인
# - Network: API 호출 상태 확인  
# - Elements: HTML/CSS 수정 테스트
```

**VS Code 디버깅:**
1. Python 확장 프로그램 설치
2. `.vscode/launch.json` 설정
3. F5로 디버깅 시작

**서버 로그 확인:**
```bash
# FastAPI 서버 로그
uvicorn main:app --log-level debug

# Docker 로그
docker-compose logs -f backend
```

### 8.3 성능 최적화

**프론트엔드 최적화:**
```bash
# CSS/JS 압축
npm install -g uglify-js uglifycss

# 이미지 최적화
brew install imageoptim-cli
```

**백엔드 최적화:**
```python
# main.py에 캐싱 추가
from functools import lru_cache

@lru_cache(maxsize=100)
def get_cached_patents():
    return SAMPLE_PATENTS
```

---

## 🎯 완전 실행 체크리스트

### ✅ 기본 환경 설정
- [ ] MacOS 버전 확인 완료
- [ ] Xcode Command Line Tools 설치
- [ ] Homebrew 설치 및 설정
- [ ] Node.js, Python, Git 설치 확인

### ✅ 프로젝트 설정
- [ ] 프로젝트 폴더 구조 생성
- [ ] VS Code 설치 및 확장 프로그램 설정
- [ ] 모든 소스 파일 생성 완료

### ✅ 프론트엔드 실행
- [ ] Live Server로 웹사이트 실행 성공
- [ ] 브라우저에서 정상 표시 확인
- [ ] 네비게이션 및 애니메이션 작동 확인
- [ ] 반응형 디자인 테스트 완료

### ✅ 백엔드 실행 (선택사항)
- [ ] Python 가상환경 생성 및 활성화
- [ ] FastAPI 패키지 설치 완료
- [ ] 백엔드 서버 실행 성공
- [ ] API 엔드포인트 테스트 완료

### ✅ Docker 실행 (선택사항)
- [ ] Docker Desktop 설치 및 실행
- [ ] Dockerfile 및 docker-compose.yml 작성
- [ ] Docker로 전체 시스템 실행 성공

### ✅ 배포 (선택사항)
- [ ] 클라우드 플랫폼 선택
- [ ] 배포 설정 파일 작성
- [ ] 성공적으로 온라인 배포

---

## 🚀 다음 단계

### 즉시 가능한 작업들
1. **웹사이트 커스터마이징**: 색상, 폰트, 레이아웃 수정
2. **콘텐츠 추가**: 실제 특허 데이터 입력
3. **기능 확장**: 새로운 페이지 및 섹션 추가

### 백엔드 개발 (중급)
1. **데이터베이스 연동**: PostgreSQL, MongoDB 설정
2. **사용자 인증**: 로그인/회원가입 기능
3. **파일 업로드**: 특허 PDF 업로드 기능

### AI 기능 구현 (고급)  
1. **Langchain 통합**: 벡터 검색 및 LLM 분석
2. **특허청 API**: 실제 특허 데이터 연동
3. **자동화**: CI/CD 파이프라인 구축

---

**🎉 축하합니다! 이제 완전한 GST 특허관리시스템을 성공적으로 구축하셨습니다!**

이 가이드를 따라하시면 웹개발이 처음이신 분도 **100% 성공적으로** 시스템을 구축하고 실행하실 수 있습니다.

각 단계에서 문제가 발생하면 해당 섹션의 문제 해결 가이드를 참고하시거나, 터미널 오류 메시지를 확인하여 대응하시면 됩니다.