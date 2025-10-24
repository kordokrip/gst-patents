# 🤝 RAG 시스템 구축을 위한 협업 가이드

> 성호님이 직접 수행해야 할 서버사이드 작업들에 대한 상세한 단계별 안내

## 🎯 협업 개요

현재 완성된 **정적 웹사이트 기반 특허 관리 시스템**을 **완전한 RAG 시스템**으로 확장하기 위해서는 서버사이드 개발이 필요합니다. 이 가이드는 성호님께서 직접 수행하셔야 할 작업들을 단계별로 안내합니다.

## 📋 협업 분담

### 🟢 이미 완성된 부분 (정적 웹사이트)
- ✅ 프론트엔드 UI/UX (HTML, CSS, JavaScript)
- ✅ 데이터 시각화 (Chart.js, ECharts)
- ✅ 특허 데이터 스키마 및 샘플 데이터
- ✅ 반응형 디자인 및 모바일 최적화
- ✅ 검색/필터링 로직 (프론트엔드)
- ✅ 프로젝트 문서 및 아키텍처 설계

### 🔴 성호님께서 구현하셔야 할 부분 (서버사이드)
1. **백엔드 서버 개발** (FastAPI, Streamlit)
2. **LLM API 통합** (OpenAI, Claude, LLaMA)
3. **벡터 데이터베이스 구축** (Chroma, Pinecone)
4. **PDF 처리 파이프라인** (문서 전처리)
5. **AI 모델 파인튜닝** (QLoRA, SFT/DPO)
6. **인증 및 보안 시스템**

---

## 1. 백엔드 서버 개발 가이드

### 1.1 FastAPI 서버 구축

#### Step 1: 개발 환경 준비

```bash
# 가상환경 생성 (이미 완료된 경우 생략)
cd gst-patent-management
python -m venv venv

# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

# 필요한 패키지 설치
pip install fastapi uvicorn python-multipart python-dotenv
```

#### Step 2: 기본 FastAPI 서버 생성

**파일: `backend/app/main.py`**
```python
from fastapi import FastAPI, HTTPException, UploadFile, File, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional
import os
import json
from datetime import datetime

# FastAPI 앱 초기화
app = FastAPI(
    title="GST Patent RAG API",
    description="글로벌 스탠다드 테크놀로지 RAG 시스템 API",
    version="1.0.0"
)

# CORS 미들웨어 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8000"],  # 프론트엔드 URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 보안 설정
security = HTTPBearer()

# 데이터 모델 정의
class PatentQuery(BaseModel):
    query: str
    max_results: int = 5
    similarity_threshold: float = 0.7

class ChatMessage(BaseModel):
    message: str
    conversation_id: Optional[str] = None

class PatentCreate(BaseModel):
    title: str
    abstract: str
    patent_number: str
    category: str
    inventors: List[str]

# 기본 라우트
@app.get("/")
async def root():
    return {
        "service": "GST Patent RAG API",
        "version": "1.0.0",
        "status": "running",
        "timestamp": datetime.now().isoformat()
    }

# 헬스 체크
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# 인증 의존성
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    # 실제 구현에서는 JWT 토큰 검증
    token = credentials.credentials
    if token != "your-secret-token":  # 실제로는 JWT 검증
        raise HTTPException(status_code=401, detail="Invalid token")
    return {"user_id": "user123"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
```

#### Step 3: 서버 실행 및 테스트

```bash
# 서버 실행
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 다른 터미널에서 테스트
curl http://localhost:8000/
curl http://localhost:8000/health
```

### 1.2 Streamlit 채팅 인터페이스

#### Step 1: Streamlit 앱 생성

**파일: `streamlit_app/chat_interface.py`**
```python
import streamlit as st
import requests
import json
from datetime import datetime
import uuid

# 페이지 설정
st.set_page_config(
    page_title="GST Patent RAG Chat",
    page_icon="🔍",
    layout="wide"
)

# 세션 상태 초기화
if "conversation_id" not in st.session_state:
    st.session_state.conversation_id = str(uuid.uuid4())
if "messages" not in st.session_state:
    st.session_state.messages = []

# 사이드바 설정
with st.sidebar:
    st.title("🔍 GST Patent RAG")
    st.write("반도체 유해가스 정화장비 특허 질의응답 시스템")
    
    # API 설정
    api_endpoint = st.text_input(
        "API Endpoint", 
        value="http://localhost:8000",
        help="FastAPI 서버 주소"
    )
    
    api_key = st.text_input(
        "API Key", 
        type="password",
        help="인증용 API 키"
    )
    
    if st.button("새 대화 시작"):
        st.session_state.messages = []
        st.session_state.conversation_id = str(uuid.uuid4())
        st.rerun()

# 메인 채팅 인터페이스
st.title("💬 특허 질의응답")

# 대화 히스토리 표시
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])
        
        # 소스 문서 표시 (AI 응답인 경우)
        if message["role"] == "assistant" and "sources" in message:
            with st.expander("참조 특허 문서"):
                for source in message["sources"]:
                    st.write(f"**{source['patent_number']}**: {source['title']}")

# 사용자 입력
if prompt := st.chat_input("특허에 대해 궁금한 것을 물어보세요..."):
    # 사용자 메시지 추가
    st.session_state.messages.append({"role": "user", "content": prompt})
    
    # 사용자 메시지 표시
    with st.chat_message("user"):
        st.markdown(prompt)
    
    # AI 응답 생성
    with st.chat_message("assistant"):
        message_placeholder = st.empty()
        
        try:
            # FastAPI 서버로 요청 전송
            response = requests.post(
                f"{api_endpoint}/api/v1/chat",
                json={
                    "message": prompt,
                    "conversation_id": st.session_state.conversation_id
                },
                headers={"Authorization": f"Bearer {api_key}"}
            )
            
            if response.status_code == 200:
                result = response.json()
                answer = result["response"]["message"]
                sources = result.get("sources", [])
                
                message_placeholder.markdown(answer)
                
                # 응답을 세션에 저장
                st.session_state.messages.append({
                    "role": "assistant", 
                    "content": answer,
                    "sources": sources
                })
                
                # 소스 문서 표시
                if sources:
                    with st.expander("참조 특허 문서"):
                        for source in sources:
                            st.write(f"**{source['patent_number']}**: {source['title']}")
                            st.write(f"관련도: {source['relevance_score']:.2f}")
                            st.write("---")
            else:
                st.error(f"API 오류: {response.status_code}")
                
        except Exception as e:
            st.error(f"오류가 발생했습니다: {str(e)}")
```

#### Step 2: Streamlit 앱 실행

```bash
# Streamlit 설치 (아직 안 했다면)
pip install streamlit

# 앱 실행
cd streamlit_app
streamlit run chat_interface.py
```

---

## 2. LLM API 통합 가이드

### 2.1 OpenAI ChatGPT API 연동

#### Step 1: API 키 설정

```bash
# .env 파일 생성
cat > backend/.env << EOF
OPENAI_API_KEY=your-openai-api-key-here
ANTHROPIC_API_KEY=your-claude-api-key-here
UPSTAGE_API_KEY=your-upstage-api-key-here
EOF
```

#### Step 2: LLM 서비스 구현

**파일: `backend/app/services/llm_service.py`**
```python
import openai
import anthropic
from typing import List, Dict, Any, Optional
import os
from dotenv import load_dotenv
import logging

load_dotenv()
logger = logging.getLogger(__name__)

class LLMService:
    """
    다중 LLM 제공자를 지원하는 서비스
    """
    
    def __init__(self):
        self.openai_client = None
        self.anthropic_client = None
        self.initialize_clients()
    
    def initialize_clients(self):
        """LLM 클라이언트 초기화"""
        try:
            # OpenAI 클라이언트
            if os.getenv("OPENAI_API_KEY"):
                openai.api_key = os.getenv("OPENAI_API_KEY")
                self.openai_client = openai
                logger.info("✅ OpenAI 클라이언트 초기화 완료")
            
            # Anthropic 클라이언트
            if os.getenv("ANTHROPIC_API_KEY"):
                self.anthropic_client = anthropic.Anthropic(
                    api_key=os.getenv("ANTHROPIC_API_KEY")
                )
                logger.info("✅ Anthropic 클라이언트 초기화 완료")
                
        except Exception as e:
            logger.error(f"❌ LLM 클라이언트 초기화 실패: {e}")
    
    async def generate_response(
        self,
        prompt: str,
        context: str,
        model: str = "gpt-4",
        max_tokens: int = 1000,
        temperature: float = 0.7
    ) -> Dict[str, Any]:
        """
        컨텍스트 기반 응답 생성
        """
        try:
            # 프롬프트 템플릿 구성
            system_prompt = """
당신은 글로벌 스탠다드 테크놀로지의 특허 전문 AI 어시스턴트입니다.
반도체 유해가스 정화장비 분야의 전문 지식을 가지고 있으며, 
제공된 특허 문서를 바탕으로 정확하고 유용한 답변을 제공합니다.

답변 시 다음 사항을 준수하세요:
1. 제공된 컨텍스트만을 기반으로 답변
2. 특허 번호와 함께 구체적인 근거 제시  
3. 기술적 내용을 이해하기 쉽게 설명
4. 불확실한 내용은 명시적으로 표현
"""

            user_prompt = f"""
컨텍스트:
{context}

질문: {prompt}

위 컨텍스트를 바탕으로 질문에 답변해주세요.
"""
            
            if model.startswith("gpt") and self.openai_client:
                response = await self._call_openai(
                    system_prompt, user_prompt, model, max_tokens, temperature
                )
            elif model.startswith("claude") and self.anthropic_client:
                response = await self._call_anthropic(
                    system_prompt, user_prompt, model, max_tokens, temperature
                )
            else:
                raise ValueError(f"지원되지 않는 모델: {model}")
            
            return response
            
        except Exception as e:
            logger.error(f"❌ 응답 생성 실패: {e}")
            raise
    
    async def _call_openai(
        self, 
        system_prompt: str, 
        user_prompt: str, 
        model: str, 
        max_tokens: int, 
        temperature: float
    ) -> Dict[str, Any]:
        """OpenAI API 호출"""
        try:
            response = await self.openai_client.ChatCompletion.acreate(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=max_tokens,
                temperature=temperature,
                stream=False
            )
            
            return {
                "content": response.choices[0].message.content,
                "model": model,
                "usage": response.usage._asdict(),
                "finish_reason": response.choices[0].finish_reason
            }
            
        except Exception as e:
            logger.error(f"❌ OpenAI API 호출 실패: {e}")
            raise
    
    async def _call_anthropic(
        self, 
        system_prompt: str, 
        user_prompt: str, 
        model: str, 
        max_tokens: int, 
        temperature: float
    ) -> Dict[str, Any]:
        """Anthropic API 호출"""
        try:
            response = await self.anthropic_client.messages.create(
                model="claude-3-haiku-20240307",  # 또는 다른 Claude 모델
                max_tokens=max_tokens,
                temperature=temperature,
                system=system_prompt,
                messages=[
                    {"role": "user", "content": user_prompt}
                ]
            )
            
            return {
                "content": response.content[0].text,
                "model": model,
                "usage": response.usage._asdict(),
                "finish_reason": response.stop_reason
            }
            
        except Exception as e:
            logger.error(f"❌ Anthropic API 호출 실패: {e}")
            raise

# 전역 인스턴스
llm_service = LLMService()
```

#### Step 3: FastAPI 엔드포인트 추가

**파일: `backend/app/api/chat.py`**
```python
from fastapi import APIRouter, HTTPException, Depends
from app.services.llm_service import llm_service
from app.services.rag_service import rag_service  # 다음 섹션에서 구현
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    model: str = "gpt-4"
    max_tokens: int = 1000
    temperature: float = 0.7

class ChatResponse(BaseModel):
    response: Dict[str, Any]
    sources: List[Dict[str, Any]]
    metadata: Dict[str, Any]

@router.post("/chat", response_model=ChatResponse)
async def chat_with_patents(
    request: ChatRequest,
    current_user=Depends(get_current_user)  # 인증 필요
):
    """
    특허 문서 기반 RAG 채팅
    """
    try:
        # 1. 관련 특허 문서 검색
        search_results = await rag_service.search_patents(
            query=request.message,
            k=5
        )
        
        # 2. 컨텍스트 구성
        context = "\n".join([
            f"특허번호: {doc['patent_number']}\n"
            f"제목: {doc['title']}\n"
            f"내용: {doc['content']}\n"
            f"---"
            for doc in search_results
        ])
        
        # 3. LLM 응답 생성
        llm_response = await llm_service.generate_response(
            prompt=request.message,
            context=context,
            model=request.model,
            max_tokens=request.max_tokens,
            temperature=request.temperature
        )
        
        # 4. 응답 구성
        return ChatResponse(
            response={
                "message": llm_response["content"],
                "conversation_id": request.conversation_id,
                "message_id": f"msg_{datetime.now().timestamp()}"
            },
            sources=[
                {
                    "patent_number": doc["patent_number"],
                    "title": doc["title"],
                    "relevance_score": doc.get("score", 0.0),
                    "chunk": doc["content"][:200] + "..."
                }
                for doc in search_results
            ],
            metadata={
                "model_used": request.model,
                "tokens_used": llm_response.get("usage", {}),
                "processing_time": 0.0,  # 실제 측정 필요
                "confidence": 0.85
            }
        )
        
    except Exception as e:
        logger.error(f"❌ 채팅 처리 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# 메인 app에 라우터 추가
# backend/app/main.py에 추가:
# from app.api.chat import router as chat_router
# app.include_router(chat_router, prefix="/api/v1", tags=["chat"])
```

---

## 3. 벡터 데이터베이스 구축 가이드

### 3.1 Chroma DB 설정

#### Step 1: Chroma 설치 및 설정

```bash
# Chroma 설치
pip install chromadb

# 임베딩 모델 설치
pip install sentence-transformers
```

#### Step 2: 벡터 서비스 구현

**파일: `backend/app/services/vector_service.py`**
```python
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Any, Optional
import numpy as np
import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)

class VectorService:
    """
    Chroma 기반 벡터 데이터베이스 서비스
    """
    
    def __init__(self):
        self.client = None
        self.collection = None
        self.embedding_model = None
        self.initialize()
    
    def initialize(self):
        """벡터 서비스 초기화"""
        try:
            # Chroma 클라이언트 설정
            persist_directory = Path("./data/chroma_db")
            persist_directory.mkdir(parents=True, exist_ok=True)
            
            self.client = chromadb.PersistentClient(
                path=str(persist_directory),
                settings=Settings(
                    anonymized_telemetry=False,
                    allow_reset=True
                )
            )
            
            # 임베딩 모델 로드 (한국어 특화)
            self.embedding_model = SentenceTransformer(
                'jhgan/ko-sroberta-multitask',  # 한국어 특화 모델
                device='cpu'  # GPU 사용 시 'cuda'로 변경
            )
            
            # 컬렉션 생성 또는 로드
            try:
                self.collection = self.client.create_collection(
                    name="gst_patents",
                    metadata={"description": "GST 특허 문서 벡터 컬렉션"}
                )
                logger.info("✅ 새 Chroma 컬렉션 생성")
            except Exception:
                self.collection = self.client.get_collection("gst_patents")
                logger.info("✅ 기존 Chroma 컬렉션 로드")
            
            logger.info("✅ 벡터 서비스 초기화 완료")
            
        except Exception as e:
            logger.error(f"❌ 벡터 서비스 초기화 실패: {e}")
            raise
    
    def add_documents(
        self, 
        documents: List[str], 
        metadatas: List[Dict[str, Any]], 
        ids: List[str]
    ):
        """문서를 벡터 DB에 추가"""
        try:
            # 임베딩 생성
            embeddings = self.embedding_model.encode(
                documents, 
                convert_to_numpy=True,
                show_progress_bar=True
            )
            
            # Chroma에 추가
            self.collection.add(
                documents=documents,
                embeddings=embeddings.tolist(),
                metadatas=metadatas,
                ids=ids
            )
            
            logger.info(f"✅ {len(documents)}개 문서 벡터 DB 추가 완료")
            
        except Exception as e:
            logger.error(f"❌ 문서 추가 실패: {e}")
            raise
    
    def search_similar_documents(
        self,
        query: str,
        n_results: int = 5,
        where: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """유사 문서 검색"""
        try:
            # 쿼리 임베딩 생성
            query_embedding = self.embedding_model.encode([query])
            
            # 벡터 검색
            results = self.collection.query(
                query_embeddings=query_embedding.tolist(),
                n_results=n_results,
                where=where,
                include=['documents', 'metadatas', 'distances']
            )
            
            # 결과 포맷팅
            formatted_results = []
            for i in range(len(results['ids'][0])):
                formatted_results.append({
                    'id': results['ids'][0][i],
                    'content': results['documents'][0][i],
                    'metadata': results['metadatas'][0][i],
                    'similarity_score': 1 - results['distances'][0][i],  # 거리를 유사도로 변환
                    'patent_number': results['metadatas'][0][i].get('patent_number'),
                    'title': results['metadatas'][0][i].get('title')
                })
            
            logger.info(f"✅ 벡터 검색 완료: {len(formatted_results)}개 결과")
            return formatted_results
            
        except Exception as e:
            logger.error(f"❌ 벡터 검색 실패: {e}")
            raise
    
    def update_document(self, id: str, document: str, metadata: Dict[str, Any]):
        """문서 업데이트"""
        try:
            embedding = self.embedding_model.encode([document])
            
            self.collection.update(
                ids=[id],
                documents=[document],
                embeddings=embedding.tolist(),
                metadatas=[metadata]
            )
            
            logger.info(f"✅ 문서 업데이트 완료: {id}")
            
        except Exception as e:
            logger.error(f"❌ 문서 업데이트 실패: {e}")
            raise
    
    def delete_document(self, id: str):
        """문서 삭제"""
        try:
            self.collection.delete(ids=[id])
            logger.info(f"✅ 문서 삭제 완료: {id}")
            
        except Exception as e:
            logger.error(f"❌ 문서 삭제 실패: {e}")
            raise
    
    def get_collection_info(self) -> Dict[str, Any]:
        """컬렉션 정보 조회"""
        try:
            count = self.collection.count()
            return {
                "total_documents": count,
                "collection_name": "gst_patents",
                "embedding_model": "jhgan/ko-sroberta-multitask",
                "status": "active"
            }
        except Exception as e:
            logger.error(f"❌ 컬렉션 정보 조회 실패: {e}")
            return {"status": "error", "message": str(e)}

# 전역 인스턴스
vector_service = VectorService()
```

### 3.2 특허 문서 벡터화

#### Step 1: 문서 처리 파이프라인

**파일: `backend/app/services/document_processor.py`**
```python
import PyPDF2
import re
from typing import List, Dict, Any, Tuple
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

class DocumentProcessor:
    """
    특허 문서 전처리 및 청킹 서비스
    """
    
    def __init__(self):
        self.chunk_size = 1000
        self.chunk_overlap = 200
    
    def process_patent_pdf(self, pdf_path: str) -> Dict[str, Any]:
        """
        특허 PDF 파일 처리
        """
        try:
            # PDF 텍스트 추출
            text = self.extract_text_from_pdf(pdf_path)
            
            # 특허 섹션 분리
            sections = self.parse_patent_sections(text)
            
            # 텍스트 청킹
            chunks = self.create_chunks(text)
            
            # 메타데이터 추출
            metadata = self.extract_metadata(text)
            
            return {
                "full_text": text,
                "sections": sections,
                "chunks": chunks,
                "metadata": metadata,
                "total_chunks": len(chunks)
            }
            
        except Exception as e:
            logger.error(f"❌ PDF 처리 실패 {pdf_path}: {e}")
            raise
    
    def extract_text_from_pdf(self, pdf_path: str) -> str:
        """PDF에서 텍스트 추출"""
        try:
            with open(pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                text = ""
                
                for page_num in range(len(pdf_reader.pages)):
                    page = pdf_reader.pages[page_num]
                    text += page.extract_text() + "\n"
                
                return text.strip()
                
        except Exception as e:
            logger.error(f"❌ PDF 텍스트 추출 실패: {e}")
            raise
    
    def parse_patent_sections(self, text: str) -> Dict[str, str]:
        """
        특허 문서의 주요 섹션 분리
        """
        sections = {
            "abstract": "",
            "claims": "",
            "description": "",
            "background": ""
        }
        
        try:
            # 요약 섹션 추출
            abstract_match = re.search(r'요\s*약\s*[:：]\s*(.*?)(?=청구범위|발명의\s*상세한\s*설명)', text, re.DOTALL)
            if abstract_match:
                sections["abstract"] = abstract_match.group(1).strip()
            
            # 청구범위 섹션 추출
            claims_match = re.search(r'청구범위\s*[:：]\s*(.*?)(?=발명의\s*상세한\s*설명|도면의\s*간단한\s*설명)', text, re.DOTALL)
            if claims_match:
                sections["claims"] = claims_match.group(1).strip()
            
            # 발명의 상세한 설명 추출
            description_match = re.search(r'발명의\s*상세한\s*설명\s*[:：]\s*(.*?)(?=청구범위|도면의\s*간단한\s*설명)', text, re.DOTALL)
            if description_match:
                sections["description"] = description_match.group(1).strip()
            
            return sections
            
        except Exception as e:
            logger.error(f"❌ 섹션 파싱 실패: {e}")
            return sections
    
    def create_chunks(self, text: str) -> List[Dict[str, Any]]:
        """
        텍스트를 청크 단위로 분할
        """
        try:
            # 문장 단위 분할
            sentences = re.split(r'[.!?。！？]\s*', text)
            
            chunks = []
            current_chunk = ""
            chunk_id = 0
            
            for sentence in sentences:
                sentence = sentence.strip()
                if not sentence:
                    continue
                
                # 청크 크기 확인
                if len(current_chunk + sentence) > self.chunk_size:
                    if current_chunk:
                        chunks.append({
                            "chunk_id": chunk_id,
                            "content": current_chunk.strip(),
                            "start_pos": len(text) - len(' '.join(sentences[chunk_id:])),
                            "length": len(current_chunk)
                        })
                        chunk_id += 1
                    
                    # 오버랩을 위해 마지막 문장들 보존
                    overlap_text = ' '.join(current_chunk.split()[-self.chunk_overlap//10:])
                    current_chunk = overlap_text + " " + sentence
                else:
                    current_chunk += " " + sentence
            
            # 마지막 청크 추가
            if current_chunk.strip():
                chunks.append({
                    "chunk_id": chunk_id,
                    "content": current_chunk.strip(),
                    "start_pos": len(text) - len(current_chunk),
                    "length": len(current_chunk)
                })
            
            return chunks
            
        except Exception as e:
            logger.error(f"❌ 텍스트 청킹 실패: {e}")
            raise
    
    def extract_metadata(self, text: str) -> Dict[str, Any]:
        """
        특허 메타데이터 추출
        """
        metadata = {}
        
        try:
            # 특허번호 추출
            patent_num_match = re.search(r'특허번호\s*[:：]?\s*(\d+-\d+)', text)
            if patent_num_match:
                metadata["patent_number"] = patent_num_match.group(1)
            
            # 발명의 명칭 추출
            title_match = re.search(r'발명의\s*명칭\s*[:：]?\s*(.*?)(?:\n|$)', text)
            if title_match:
                metadata["title"] = title_match.group(1).strip()
            
            # 발명자 추출
            inventor_match = re.search(r'발명자\s*[:：]?\s*(.*?)(?:\n|출원인)', text, re.DOTALL)
            if inventor_match:
                inventors = [name.strip() for name in inventor_match.group(1).split(',')]
                metadata["inventors"] = inventors
            
            # 등록일 추출  
            reg_date_match = re.search(r'등록일\s*[:：]?\s*(\d{4}[-./]\d{2}[-./]\d{2})', text)
            if reg_date_match:
                metadata["registration_date"] = reg_date_match.group(1)
            
            return metadata
            
        except Exception as e:
            logger.error(f"❌ 메타데이터 추출 실패: {e}")
            return metadata

# 전역 인스턴스
document_processor = DocumentProcessor()
```

#### Step 2: 벡터화 API 엔드포인트

**파일: `backend/app/api/vector.py`**
```python
from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from app.services.vector_service import vector_service
from app.services.document_processor import document_processor
from typing import List, Dict, Any
import tempfile
import os
from pathlib import Path

router = APIRouter()

@router.post("/upload-patents")
async def upload_patent_documents(
    files: List[UploadFile] = File(...),
    current_user=Depends(get_current_user)
):
    """
    특허 PDF 파일들을 업로드하고 벡터화
    """
    results = []
    
    for file in files:
        try:
            # 임시 파일로 저장
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
                content = await file.read()
                tmp_file.write(content)
                tmp_file_path = tmp_file.name
            
            # 문서 처리
            processed_doc = document_processor.process_patent_pdf(tmp_file_path)
            
            # 청크별로 벡터 DB에 추가
            documents = []
            metadatas = []
            ids = []
            
            patent_number = processed_doc["metadata"].get("patent_number", file.filename)
            
            for i, chunk in enumerate(processed_doc["chunks"]):
                chunk_id = f"{patent_number}_chunk_{i}"
                
                documents.append(chunk["content"])
                metadatas.append({
                    **processed_doc["metadata"],
                    "chunk_id": chunk["chunk_id"],
                    "chunk_type": "content",
                    "source_file": file.filename
                })
                ids.append(chunk_id)
            
            # 벡터 DB에 추가
            vector_service.add_documents(documents, metadatas, ids)
            
            # 임시 파일 삭제
            os.unlink(tmp_file_path)
            
            results.append({
                "filename": file.filename,
                "patent_number": patent_number,
                "chunks_created": len(documents),
                "status": "success"
            })
            
        except Exception as e:
            results.append({
                "filename": file.filename,
                "status": "error",
                "error": str(e)
            })
    
    return {"results": results}

@router.get("/search")
async def search_patents(
    query: str,
    limit: int = 5,
    similarity_threshold: float = 0.7,
    current_user=Depends(get_current_user)
):
    """
    벡터 유사도 기반 특허 검색
    """
    try:
        results = vector_service.search_similar_documents(
            query=query,
            n_results=limit
        )
        
        # 유사도 임계값 적용
        filtered_results = [
            result for result in results 
            if result["similarity_score"] >= similarity_threshold
        ]
        
        return {
            "query": query,
            "results": filtered_results,
            "total_found": len(filtered_results),
            "search_time": 0.0  # 실제 측정 필요
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/collection-info")
async def get_collection_info(current_user=Depends(get_current_user)):
    """
    벡터 DB 컬렉션 정보 조회
    """
    return vector_service.get_collection_info()

# 메인 앱에 라우터 추가
# backend/app/main.py에 추가:
# from app.api.vector import router as vector_router  
# app.include_router(vector_router, prefix="/api/v1/vector", tags=["vector"])
```

---

## 4. PDF 처리 파이프라인 구축

### 4.1 고급 PDF 처리

#### Step 1: 추가 패키지 설치

```bash
# PDF 처리 라이브러리
pip install PyPDF2 pdfplumber pdfminer.six

# 한국어 자연어 처리
pip install konlpy soynlp

# 이미지 처리 (OCR)
pip install pytesseract pillow

# 테이블 추출
pip install tabula-py camelot-py
```

#### Step 2: 고급 문서 처리기

**파일: `backend/app/services/advanced_processor.py`**
```python
import pdfplumber
import pytesseract
from PIL import Image
import re
from typing import List, Dict, Any, Optional
import logging
from konlpy.tag import Okt
import json

logger = logging.getLogger(__name__)

class AdvancedDocumentProcessor:
    """
    고급 특허 문서 처리기
    """
    
    def __init__(self):
        self.okt = Okt()  # 한국어 형태소 분석기
        self.patent_sections = [
            "요약", "청구범위", "발명의 상세한 설명", 
            "도면의 간단한 설명", "발명의 배경"
        ]
    
    def extract_comprehensive_data(self, pdf_path: str) -> Dict[str, Any]:
        """
        포괄적인 특허 데이터 추출
        """
        try:
            with pdfplumber.open(pdf_path) as pdf:
                # 기본 텍스트 추출
                full_text = self.extract_text_with_structure(pdf)
                
                # 테이블 추출
                tables = self.extract_tables(pdf)
                
                # 이미지 및 도면 정보
                images = self.extract_image_info(pdf)
                
                # 구조화된 섹션 파싱
                structured_sections = self.parse_structured_sections(full_text)
                
                # 기술 키워드 추출
                technical_keywords = self.extract_technical_keywords(full_text)
                
                # 청구항 분석
                claims_analysis = self.analyze_claims(structured_sections.get("청구범위", ""))
                
                return {
                    "full_text": full_text,
                    "structured_sections": structured_sections,
                    "tables": tables,
                    "images": images,
                    "technical_keywords": technical_keywords,
                    "claims_analysis": claims_analysis,
                    "metadata": self.extract_enhanced_metadata(full_text)
                }
                
        except Exception as e:
            logger.error(f"❌ 포괄적 데이터 추출 실패: {e}")
            raise
    
    def extract_text_with_structure(self, pdf) -> str:
        """구조 정보를 유지한 텍스트 추출"""
        full_text = ""
        
        for page_num, page in enumerate(pdf.pages):
            # 페이지 텍스트 추출
            text = page.extract_text()
            if text:
                full_text += f"\n--- 페이지 {page_num + 1} ---\n{text}\n"
        
        return full_text
    
    def extract_tables(self, pdf) -> List[Dict[str, Any]]:
        """테이블 데이터 추출"""
        tables = []
        
        for page_num, page in enumerate(pdf.pages):
            page_tables = page.extract_tables()
            
            for table_num, table in enumerate(page_tables):
                if table:
                    tables.append({
                        "page": page_num + 1,
                        "table_id": f"table_{page_num}_{table_num}",
                        "data": table,
                        "rows": len(table),
                        "cols": len(table[0]) if table else 0
                    })
        
        return tables
    
    def extract_image_info(self, pdf) -> List[Dict[str, Any]]:
        """이미지 및 도면 정보 추출"""
        images = []
        
        for page_num, page in enumerate(pdf.pages):
            if hasattr(page, 'images'):
                for img_num, image in enumerate(page.images):
                    images.append({
                        "page": page_num + 1,
                        "image_id": f"img_{page_num}_{img_num}",
                        "bbox": image.get('bbox', []),
                        "width": image.get('width', 0),
                        "height": image.get('height', 0)
                    })
        
        return images
    
    def parse_structured_sections(self, text: str) -> Dict[str, str]:
        """구조화된 섹션 파싱"""
        sections = {}
        
        for section_name in self.patent_sections:
            # 각 섹션별 정규표현식 패턴
            patterns = [
                f"{section_name}\\s*[:：]\\s*(.*?)(?={'|'.join(self.patent_sections)}|$)",
                f"{section_name}\\s*(.*?)(?={'|'.join(self.patent_sections)}|$)"
            ]
            
            for pattern in patterns:
                match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
                if match:
                    sections[section_name] = match.group(1).strip()
                    break
        
        return sections
    
    def extract_technical_keywords(self, text: str) -> List[Dict[str, Any]]:
        """기술 키워드 추출 및 빈도 분석"""
        try:
            # 명사 추출
            nouns = self.okt.nouns(text)
            
            # 기술 관련 키워드 필터링
            tech_keywords = [
                noun for noun in nouns 
                if len(noun) >= 2 and self.is_technical_term(noun)
            ]
            
            # 빈도 계산
            from collections import Counter
            keyword_counts = Counter(tech_keywords)
            
            # 상위 키워드 반환
            top_keywords = [
                {
                    "keyword": keyword,
                    "frequency": count,
                    "category": self.classify_keyword(keyword)
                }
                for keyword, count in keyword_counts.most_common(50)
            ]
            
            return top_keywords
            
        except Exception as e:
            logger.error(f"❌ 키워드 추출 실패: {e}")
            return []
    
    def is_technical_term(self, term: str) -> bool:
        """기술 용어 여부 판단"""
        technical_indicators = [
            "시스템", "장치", "방법", "공정", "기술", "제어", 
            "처리", "분석", "측정", "센서", "모니터", "알고리즘",
            "스크러버", "칠러", "플라즈마", "온도", "가스", "정화",
            "반도체", "제조", "설비", "효율", "최적화"
        ]
        
        return any(indicator in term for indicator in technical_indicators)
    
    def classify_keyword(self, keyword: str) -> str:
        """키워드 분류"""
        categories = {
            "장비": ["스크러버", "칠러", "장치", "설비", "시스템"],
            "공정": ["제조", "공정", "처리", "가공", "생산"],
            "기술": ["기술", "방법", "알고리즘", "제어", "최적화"],
            "물질": ["가스", "화학", "물질", "재료"],
            "측정": ["센서", "측정", "모니터", "분석", "검사"]
        }
        
        for category, terms in categories.items():
            if any(term in keyword for term in terms):
                return category
        
        return "기타"
    
    def analyze_claims(self, claims_text: str) -> Dict[str, Any]:
        """청구항 분석"""
        if not claims_text:
            return {}
        
        try:
            # 독립 청구항과 종속 청구항 분리
            claim_pattern = r'청구항\s*(\d+)\s*[.．]\s*(.*?)(?=청구항\s*\d+|$)'
            claims = re.findall(claim_pattern, claims_text, re.DOTALL)
            
            independent_claims = []
            dependent_claims = []
            
            for claim_num, claim_text in claims:
                claim_text = claim_text.strip()
                
                # 종속 청구항 여부 확인
                if re.search(r'청구항\s*\d+에\s*있어서|청구항\s*\d+에\s*의하면', claim_text):
                    dependent_claims.append({
                        "number": int(claim_num),
                        "text": claim_text,
                        "parent_claim": self.find_parent_claim(claim_text)
                    })
                else:
                    independent_claims.append({
                        "number": int(claim_num),
                        "text": claim_text,
                        "components": self.extract_claim_components(claim_text)
                    })
            
            return {
                "total_claims": len(claims),
                "independent_claims": independent_claims,
                "dependent_claims": dependent_claims,
                "claim_structure": self.analyze_claim_structure(claims)
            }
            
        except Exception as e:
            logger.error(f"❌ 청구항 분석 실패: {e}")
            return {}
    
    def find_parent_claim(self, claim_text: str) -> Optional[int]:
        """종속 청구항의 부모 청구항 찾기"""
        match = re.search(r'청구항\s*(\d+)', claim_text)
        return int(match.group(1)) if match else None
    
    def extract_claim_components(self, claim_text: str) -> List[str]:
        """청구항 구성요소 추출"""
        # 세미콜론이나 번호로 구분된 구성요소들 추출
        components = re.split(r'[;；]\s*(?=\d+\.|\w+\.)', claim_text)
        return [comp.strip() for comp in components if comp.strip()]
    
    def analyze_claim_structure(self, claims: List[tuple]) -> Dict[str, Any]:
        """청구항 구조 분석"""
        return {
            "claim_dependency_tree": self.build_dependency_tree(claims),
            "avg_claim_length": sum(len(claim[1]) for claim in claims) / len(claims) if claims else 0,
            "technical_complexity": self.assess_technical_complexity(claims)
        }
    
    def build_dependency_tree(self, claims: List[tuple]) -> Dict[str, List[int]]:
        """청구항 의존성 트리 구축"""
        # 실제 구현에서는 더 정교한 의존성 분석 필요
        return {}
    
    def assess_technical_complexity(self, claims: List[tuple]) -> str:
        """기술적 복잡도 평가"""
        total_length = sum(len(claim[1]) for claim in claims)
        avg_length = total_length / len(claims) if claims else 0
        
        if avg_length > 500:
            return "high"
        elif avg_length > 200:
            return "medium"
        else:
            return "low"
    
    def extract_enhanced_metadata(self, text: str) -> Dict[str, Any]:
        """향상된 메타데이터 추출"""
        metadata = {}
        
        patterns = {
            "patent_number": r"특허번호\s*[:：]?\s*(\d+-\d+)",
            "application_number": r"출원번호\s*[:：]?\s*(\d+-\d+)", 
            "title": r"발명의\s*명칭\s*[:：]?\s*(.*?)(?:\n|$)",
            "applicant": r"출원인\s*[:：]?\s*(.*?)(?:\n|발명자)",
            "inventor": r"발명자\s*[:：]?\s*(.*?)(?:\n|출원인)",
            "registration_date": r"등록일\s*[:：]?\s*(\d{4}[-./]\d{2}[-./]\d{2})",
            "application_date": r"출원일\s*[:：]?\s*(\d{4}[-./]\d{2}[-./]\d{2})",
            "ipc_classification": r"국제특허분류\s*[:：]?\s*([A-H]\d{2}[A-Z]\s*\d+/\d+)"
        }
        
        for key, pattern in patterns.items():
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                value = match.group(1).strip()
                
                # 발명자나 출원인인 경우 리스트로 변환
                if key in ["inventor", "applicant"]:
                    value = [name.strip() for name in value.split(',')]
                
                metadata[key] = value
        
        return metadata

# 전역 인스턴스
advanced_processor = AdvancedDocumentProcessor()
```

---

## 5. AI 모델 파인튜닝 가이드

### 5.1 QLoRA 파인튜닝 환경 설정

#### Step 1: GPU 환경 및 패키지 설치

```bash
# GPU 확인 (CUDA 필요)
nvidia-smi

# PyTorch GPU 버전 설치
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# 파인튜닝 관련 패키지
pip install transformers==4.35.0
pip install peft==0.6.0
pip install bitsandbytes==0.41.1
pip install accelerate==0.24.1
pip install datasets==2.14.6
pip install trl==0.7.4

# 추가 유틸리티
pip install wandb  # 실험 추적
pip install tensorboard  # 모니터링
```

#### Step 2: 파인튜닝 데이터 준비

**파일: `backend/training/data_preparation.py`**
```python
import json
from typing import List, Dict, Any
from datasets import Dataset
import pandas as pd
from pathlib import Path

class PatentTrainingDataProcessor:
    """
    특허 데이터를 LLM 파인튜닝용으로 변환
    """
    
    def __init__(self):
        self.instruction_template = """다음은 특허 문서와 관련된 질문과 답변입니다.

### 특허 정보:
{patent_info}

### 질문:
{question}

### 답변:
{answer}"""
    
    def create_training_dataset(
        self, 
        patents_data: List[Dict[str, Any]], 
        output_path: str = "training_data.json"
    ) -> Dataset:
        """
        특허 데이터로부터 학습용 데이터셋 생성
        """
        training_examples = []
        
        for patent in patents_data:
            # 각 특허에 대해 다양한 질문-답변 쌍 생성
            examples = self.generate_qa_pairs(patent)
            training_examples.extend(examples)
        
        # Alpaca 형식으로 변환
        alpaca_format = []
        for example in training_examples:
            alpaca_format.append({
                "instruction": example["instruction"],
                "input": example["input"],
                "output": example["output"]
            })
        
        # JSON 파일로 저장
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(alpaca_format, f, ensure_ascii=False, indent=2)
        
        # Dataset 객체로 변환
        dataset = Dataset.from_pandas(pd.DataFrame(alpaca_format))
        return dataset
    
    def generate_qa_pairs(self, patent: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        단일 특허로부터 질문-답변 쌍 생성
        """
        qa_pairs = []
        
        # 기본 정보 질문들
        basic_questions = [
            {
                "question": f"특허번호 {patent['patent_number']}에 대해 설명해주세요.",
                "answer": f"특허번호 {patent['patent_number']}은 '{patent['title']}'라는 발명에 관한 특허입니다. {patent['abstract']}"
            },
            {
                "question": f"이 특허의 주요 기술 분야는 무엇인가요?",
                "answer": f"이 특허는 {patent['technology_field']} 분야의 기술로, {patent['category']} 카테고리에 속합니다."
            },
            {
                "question": f"발명자는 누구인가요?",
                "answer": f"이 특허의 발명자는 {', '.join(patent.get('inventors', []))}입니다."
            }
        ]
        
        # 기술적 질문들 
        if patent.get('main_claims'):
            basic_questions.append({
                "question": "이 특허의 주요 청구항은 무엇인가요?",
                "answer": patent['main_claims']
            })
        
        if patent.get('technical_keywords'):
            basic_questions.append({
                "question": "이 특허와 관련된 주요 기술 키워드는 무엇인가요?",
                "answer": f"주요 기술 키워드는 {', '.join(patent['technical_keywords'])}입니다."
            })
        
        # 관련 특허 질문
        if patent.get('related_patents'):
            basic_questions.append({
                "question": "관련된 다른 특허가 있나요?",
                "answer": f"관련 특허로는 {', '.join(patent['related_patents'])}이 있습니다."
            })
        
        # Alpaca 형식으로 변환
        for qa in basic_questions:
            patent_info = self.format_patent_info(patent)
            
            qa_pairs.append({
                "instruction": "특허 문서를 바탕으로 질문에 답변하세요.",
                "input": f"특허 정보: {patent_info}\n\n질문: {qa['question']}",
                "output": qa['answer']
            })
        
        return qa_pairs
    
    def format_patent_info(self, patent: Dict[str, Any]) -> str:
        """특허 정보를 텍스트로 포매팅"""
        info = f"특허번호: {patent['patent_number']}\n"
        info += f"발명명칭: {patent['title']}\n"
        info += f"기술분야: {patent['technology_field']}\n"
        info += f"요약: {patent['abstract']}"
        
        if patent.get('inventors'):
            info += f"\n발명자: {', '.join(patent['inventors'])}"
        
        return info

# 사용 예시
def prepare_training_data():
    """성호님이 실행할 데이터 준비 함수"""
    
    # 1. 기존 특허 데이터 로드 (프론트엔드에서 사용하던 데이터)
    # 이 부분은 실제 특허 데이터로 교체
    patents_data = [
        # 여기에 실제 78개 특허 데이터 입력
        # 또는 API/파일에서 로드
    ]
    
    # 2. 훈련 데이터 프로세서 초기화
    processor = PatentTrainingDataProcessor()
    
    # 3. 훈련 데이터셋 생성
    dataset = processor.create_training_dataset(patents_data)
    
    # 4. 훈련/검증 데이터 분할
    train_test_split = dataset.train_test_split(test_size=0.1)
    train_dataset = train_test_split['train']
    eval_dataset = train_test_split['test']
    
    print(f"✅ 훈련 데이터: {len(train_dataset)}개")
    print(f"✅ 검증 데이터: {len(eval_dataset)}개")
    
    return train_dataset, eval_dataset

if __name__ == "__main__":
    train_dataset, eval_dataset = prepare_training_data()
```

#### Step 3: QLoRA 파인튜닝 스크립트

**파일: `backend/training/finetune_llama.py`**
```python
import torch
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    TrainingArguments,
    pipeline
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from trl import SFTTrainer
import wandb
from datetime import datetime
import os

class PatentLLMTrainer:
    """
    특허 도메인 LLM 파인튜닝 트레이너
    """
    
    def __init__(self, model_name: str = "meta-llama/Llama-2-7b-chat-hf"):
        self.model_name = model_name
        self.model = None
        self.tokenizer = None
        self.trainer = None
        
    def setup_model_and_tokenizer(self):
        """모델과 토크나이저 설정"""
        
        # BitsAndBytesConfig for 4-bit quantization
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_use_double_quant=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.bfloat16
        )
        
        # 모델 로드
        self.model = AutoModelForCausalLM.from_pretrained(
            self.model_name,
            quantization_config=bnb_config,
            device_map="auto",
            trust_remote_code=True,
            token="your-huggingface-token"  # Llama 모델 사용을 위한 토큰
        )
        
        # 토크나이저 로드  
        self.tokenizer = AutoTokenizer.from_pretrained(
            self.model_name,
            trust_remote_code=True,
            token="your-huggingface-token"
        )
        self.tokenizer.pad_token = self.tokenizer.eos_token
        self.tokenizer.padding_side = "right"
        
        # 모델을 k-bit 훈련용으로 준비
        self.model = prepare_model_for_kbit_training(self.model)
        
        print("✅ 모델 및 토크나이저 로드 완료")
    
    def setup_lora_config(self):
        """LoRA 설정"""
        peft_config = LoraConfig(
            r=16,  # LoRA rank
            lora_alpha=32,  # LoRA scaling parameter
            target_modules=[
                "q_proj",
                "k_proj", 
                "v_proj",
                "o_proj",
                "gate_proj",
                "up_proj",
                "down_proj",
                "lm_head",
            ],
            bias="none",
            lora_dropout=0.05,
            task_type="CAUSAL_LM",
        )
        
        # LoRA 어댑터 적용
        self.model = get_peft_model(self.model, peft_config)
        self.model.print_trainable_parameters()
        
        print("✅ LoRA 설정 완료")
    
    def train(
        self, 
        train_dataset, 
        eval_dataset=None,
        output_dir: str = "./results",
        num_train_epochs: int = 3,
        per_device_train_batch_size: int = 4,
        gradient_accumulation_steps: int = 4,
        learning_rate: float = 2e-4,
        max_seq_length: int = 1024
    ):
        """모델 훈련"""
        
        # Weights & Biases 초기화 (선택사항)
        wandb.init(
            project="gst-patent-llm",
            name=f"llama-finetune-{datetime.now().strftime('%Y%m%d-%H%M%S')}",
            config={
                "model_name": self.model_name,
                "num_epochs": num_train_epochs,
                "batch_size": per_device_train_batch_size,
                "learning_rate": learning_rate,
                "max_seq_length": max_seq_length
            }
        )
        
        # 훈련 인자 설정
        training_args = TrainingArguments(
            output_dir=output_dir,
            num_train_epochs=num_train_epochs,
            per_device_train_batch_size=per_device_train_batch_size,
            per_device_eval_batch_size=per_device_train_batch_size,
            gradient_accumulation_steps=gradient_accumulation_steps,
            optim="adamw_torch",
            save_steps=500,
            logging_steps=100,
            learning_rate=learning_rate,
            weight_decay=0.001,
            fp16=False,
            bf16=True,
            max_grad_norm=0.3,
            max_steps=-1,
            warmup_ratio=0.03,
            group_by_length=True,
            lr_scheduler_type="cosine",
            report_to="wandb",
            save_strategy="steps",
            evaluation_strategy="steps" if eval_dataset else "no",
            eval_steps=500 if eval_dataset else None,
            load_best_model_at_end=True if eval_dataset else False,
            metric_for_best_model="eval_loss" if eval_dataset else None,
        )
        
        # SFT 트레이너 초기화
        self.trainer = SFTTrainer(
            model=self.model,
            train_dataset=train_dataset,
            eval_dataset=eval_dataset,
            peft_config=None,  # 이미 모델에 적용됨
            dataset_text_field="text",  # 데이터셋의 텍스트 필드명
            max_seq_length=max_seq_length,
            tokenizer=self.tokenizer,
            args=training_args,
            packing=False,
        )
        
        print("🚀 훈련 시작...")
        
        # 훈련 실행
        self.trainer.train()
        
        # 모델 저장
        self.trainer.save_model()
        
        print("✅ 훈련 완료 및 모델 저장")
    
    def format_training_data(self, dataset):
        """훈련 데이터를 올바른 형식으로 변환"""
        def format_instruction(example):
            # Alpaca 템플릿 사용
            if example.get("input"):
                text = f"""Below is an instruction that describes a task, paired with an input that provides further context. Write a response that appropriately completes the request.

### Instruction:
{example['instruction']}

### Input:
{example['input']}

### Response:
{example['output']}"""
            else:
                text = f"""Below is an instruction that describes a task. Write a response that appropriately completes the request.

### Instruction:
{example['instruction']}

### Response:
{example['output']}"""
            
            return {"text": text}
        
        return dataset.map(format_instruction)

# 실행 스크립트
def run_finetuning():
    """성호님이 실행할 파인튜닝 함수"""
    
    # 1. 훈련 데이터 준비 (이전 단계에서 생성된 데이터)
    from data_preparation import prepare_training_data
    train_dataset, eval_dataset = prepare_training_data()
    
    # 2. 트레이너 초기화
    trainer = PatentLLMTrainer()
    
    # 3. 모델 설정
    trainer.setup_model_and_tokenizer()
    trainer.setup_lora_config()
    
    # 4. 데이터 형식 변환
    train_dataset = trainer.format_training_data(train_dataset)
    eval_dataset = trainer.format_training_data(eval_dataset)
    
    # 5. 훈련 실행
    trainer.train(
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        output_dir="./gst_patent_model",
        num_train_epochs=3,
        per_device_train_batch_size=2,  # GPU 메모리에 맞게 조정
        gradient_accumulation_steps=8,
        learning_rate=2e-4
    )
    
    print("🎉 파인튜닝 완료!")

if __name__ == "__main__":
    run_finetuning()
```

### 5.2 훈련 실행 가이드

#### Step 1: GPU 환경 확인

```bash
# GPU 메모리 확인
nvidia-smi

# CUDA 설치 확인
python -c "import torch; print(torch.cuda.is_available())"
python -c "import torch; print(torch.cuda.get_device_name(0))"
```

#### Step 2: 훈련 실행

```bash
# 훈련 디렉토리로 이동
cd backend/training

# 훈련 실행 (화면 세션 사용 권장)
screen -S patent_training
python finetune_llama.py

# 화면 세션에서 나가기 (Ctrl+A, D)
# 다시 접속: screen -r patent_training
```

---

## 6. 인증 시스템 구축

### 6.1 JWT 기반 인증

#### Step 1: 인증 관련 패키지 설치

```bash
pip install python-jose[cryptography]
pip install passlib[bcrypt]
pip install python-multipart
```

#### Step 2: 인증 서비스 구현

**파일: `backend/app/services/auth_service.py`**
```python
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
import os
from dotenv import load_dotenv

load_dotenv()

# 보안 설정
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# 비밀번호 해싱
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class Token(BaseModel):
    access_token: str
    token_type: str
    expires_in: int

class UserInDB(BaseModel):
    username: str
    email: str
    hashed_password: str
    is_active: bool = True
    role: str = "user"

class AuthService:
    """인증 서비스"""
    
    def __init__(self):
        # 실제로는 데이터베이스에서 관리
        self.users_db = {
            "admin": {
                "username": "admin",
                "email": "admin@gst.com", 
                "hashed_password": self.get_password_hash("gst_admin_2024"),
                "is_active": True,
                "role": "admin"
            },
            "user": {
                "username": "user",
                "email": "user@gst.com",
                "hashed_password": self.get_password_hash("gst_user_2024"),
                "is_active": True,
                "role": "user"
            }
        }
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """비밀번호 검증"""
        return pwd_context.verify(plain_password, hashed_password)
    
    def get_password_hash(self, password: str) -> str:
        """비밀번호 해싱"""
        return pwd_context.hash(password)
    
    def authenticate_user(self, username: str, password: str) -> Optional[UserInDB]:
        """사용자 인증"""
        user_data = self.users_db.get(username)
        if not user_data:
            return None
        
        user = UserInDB(**user_data)
        if not self.verify_password(password, user.hashed_password):
            return None
        
        return user
    
    def create_access_token(
        self, 
        data: Dict[str, Any], 
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """액세스 토큰 생성"""
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        
        return encoded_jwt
    
    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """토큰 검증"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username: str = payload.get("sub")
            
            if username is None:
                return None
            
            # 사용자 존재 확인
            user_data = self.users_db.get(username)
            if user_data is None:
                return None
            
            return {
                "username": username,
                "role": user_data["role"],
                "email": user_data["email"]
            }
            
        except JWTError:
            return None
    
    def create_user(
        self, 
        username: str, 
        email: str, 
        password: str, 
        role: str = "user"
    ) -> UserInDB:
        """새 사용자 생성"""
        if username in self.users_db:
            raise ValueError("사용자명이 이미 존재합니다")
        
        hashed_password = self.get_password_hash(password)
        user_data = {
            "username": username,
            "email": email,
            "hashed_password": hashed_password,
            "is_active": True,
            "role": role
        }
        
        self.users_db[username] = user_data
        return UserInDB(**user_data)

# 전역 인스턴스
auth_service = AuthService()
```

#### Step 3: 인증 API 엔드포인트

**파일: `backend/app/api/auth.py`**
```python
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, OAuth2PasswordRequestForm
from app.services.auth_service import auth_service, Token, UserInDB
from pydantic import BaseModel
from datetime import timedelta

router = APIRouter()
security = HTTPBearer()

class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserResponse(BaseModel):
    username: str
    email: str
    role: str
    is_active: bool

@router.post("/login", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """로그인 및 토큰 발급"""
    user = auth_service.authenticate_user(form_data.username, form_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="아이디 또는 비밀번호가 잘못되었습니다",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=30)
    access_token = auth_service.create_access_token(
        data={"sub": user.username, "role": user.role},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": 1800  # 30분
    }

@router.post("/register", response_model=UserResponse)
async def register_user(user_data: UserCreate):
    """사용자 등록"""
    try:
        user = auth_service.create_user(
            username=user_data.username,
            email=user_data.email,
            password=user_data.password
        )
        
        return UserResponse(
            username=user.username,
            email=user.email,
            role=user.role,
            is_active=user.is_active
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: dict = Depends(get_current_user)):
    """현재 사용자 정보 조회"""
    return UserResponse(**current_user)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """현재 사용자 가져오기 (의존성)"""
    token = credentials.credentials
    user_data = auth_service.verify_token(token)
    
    if user_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않은 토큰입니다",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user_data

async def get_admin_user(current_user: dict = Depends(get_current_user)):
    """관리자 권한 확인"""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="관리자 권한이 필요합니다"
        )
    return current_user

# 메인 앱에 라우터 추가
# backend/app/main.py에 추가:
# from app.api.auth import router as auth_router, get_current_user, get_admin_user
# app.include_router(auth_router, prefix="/api/v1/auth", tags=["authentication"])
```

---

## 📋 성호님 실행 체크리스트

### 단계 1: 기본 환경 설정 ✅

```bash
# 1. 기본 디렉토리 구조 생성
mkdir -p backend/{app/{api,core,models,services},training,data}
mkdir -p streamlit_app

# 2. 가상환경 설정
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. 기본 패키지 설치
pip install fastapi uvicorn streamlit python-dotenv
```

### 단계 2: FastAPI 백엔드 구축 🔧

- [ ] **main.py 작성** - 기본 FastAPI 서버
- [ ] **서버 실행 테스트** - `uvicorn app.main:app --reload`
- [ ] **CORS 설정 확인** - 프론트엔드 연동 테스트
- [ ] **API 문서 확인** - `http://localhost:8000/docs`

### 단계 3: LLM API 통합 🧠

- [ ] **API 키 설정** - `.env` 파일 생성
- [ ] **OpenAI/Claude API 연동** - llm_service.py 구현
- [ ] **채팅 엔드포인트 구현** - /api/v1/chat
- [ ] **Streamlit 채팅 UI** - chat_interface.py

### 단계 4: 벡터 데이터베이스 📚

- [ ] **Chroma 설치 및 설정** - `pip install chromadb`
- [ ] **벡터 서비스 구현** - vector_service.py
- [ ] **문서 업로드 API** - /api/v1/vector/upload-patents
- [ ] **벡터 검색 테스트** - /api/v1/vector/search

### 단계 5: PDF 처리 파이프라인 📄

- [ ] **PDF 라이브러리 설치** - PyPDF2, pdfplumber
- [ ] **문서 처리기 구현** - document_processor.py
- [ ] **특허 PDF 업로드 테스트** - 실제 PDF 파일로 테스트
- [ ] **텍스트 추출 및 청킹 확인**

### 단계 6: 모델 파인튜닝 (고급) 🎯

- [ ] **GPU 환경 확인** - `nvidia-smi`
- [ ] **훈련 데이터 준비** - data_preparation.py
- [ ] **QLoRA 설정** - finetune_llama.py
- [ ] **훈련 실행** - 장시간 소요 (수시간~수일)

### 단계 7: 인증 시스템 🔐

- [ ] **JWT 라이브러리 설치** - python-jose, passlib
- [ ] **인증 서비스 구현** - auth_service.py
- [ ] **로그인/회원가입 API** - /api/v1/auth/login
- [ ] **토큰 기반 보안 적용**

---

## 🚀 우선순위 가이드

### 🥇 1순위 (즉시 시작 가능)
1. **FastAPI 백엔드 구축** - 30분~1시간
2. **Streamlit 채팅 UI** - 1~2시간
3. **기본 인증 시스템** - 2~3시간

### 🥈 2순위 (API 키 필요)
4. **LLM API 통합** - OpenAI/Claude API 키 필요
5. **벡터 데이터베이스** - 1~2일
6. **PDF 처리 파이프라인** - 2~3일

### 🥉 3순위 (고급 기능)
7. **모델 파인튜닝** - GPU 환경 + 1~2주
8. **고급 보안 기능** - 추가 1주

---

## 💡 성공을 위한 팁

### 🎯 단계별 접근
1. **작은 것부터 시작**: FastAPI "Hello World"부터
2. **점진적 확장**: 한 번에 하나의 기능씩 추가
3. **테스트 우선**: 각 단계마다 동작 확인

### 🔧 개발 환경 최적화
- **VS Code 확장**: Python, FastAPI, REST Client
- **터미널 분할**: 서버/클라이언트 동시 실행
- **Git 버전관리**: 각 단계마다 커밋

### 📚 학습 리소스
- **FastAPI 공식 문서**: https://fastapi.tiangolo.com/
- **Streamlit 튜토리얼**: https://docs.streamlit.io/
- **LangChain 가이드**: https://python.langchain.com/

---

> ## 🤝 **성호님, 이제 완전한 RAG 시스템 구축을 위한 로드맵이 준비되었습니다!**
>
> **현재 정적 시스템** → **백엔드 API** → **LLM 통합** → **벡터 검색** → **완전한 RAG 시스템**
>
> 각 단계마다 막히는 부분이 있으시면 언제든 문의해 주세요. 함께 성공적인 시스템을 구축해나가겠습니다! 🚀