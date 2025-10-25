"""
Streamlit 기반 GST 특허 RAG 챗봇
----------------------------------
실행 방법:
    streamlit run streamlit_app.py

이 앱은 rag_outputs/ 폴더의 청크를 Pinecone에 업서트하고,
Pinecone + OpenAI LLM을 이용해 특허 질의를 처리합니다.
"""

from __future__ import annotations

import os
from html import escape
from pathlib import Path
from typing import Dict, List, Tuple
import time
import re

import streamlit as st
from dotenv import load_dotenv
from openai import OpenAI
from pinecone import Pinecone
import requests

from scripts.pinecone_ingest import (
    PINECONE_API_KEY,
    PINECONE_INDEX_NAME,
    PINECONE_NAMESPACE,
    EMBEDDING_MODEL,
    sync_rag_outputs,
)

load_dotenv()

CHAT_MODEL = os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini")
PATENT_DOC_BASE_URL = os.getenv("PATENT_DOC_BASE_URL", "http://localhost:8080/data/patents")
WEB_SEARCH_ENABLED = os.getenv("WEB_SEARCH_ENABLED", "true").lower() == "true"

@st.cache_resource(show_spinner=False)
def init_clients():
    if not PINECONE_API_KEY:
        raise RuntimeError("Pinecone API Key가 설정되어 있지 않습니다 (.env 파일을 확인하세요).")
    pinecone_client = Pinecone(api_key=PINECONE_API_KEY)
    pinecone_index = pinecone_client.Index(PINECONE_INDEX_NAME)
    openai_client = OpenAI()
    return pinecone_index, openai_client


def embed_text(client: OpenAI, text: str) -> List[float]:
    response = client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=[text],
    )
    return response.data[0].embedding


def build_prompt(question: str, contexts: List[Dict], web_results: List[Dict]) -> str:
    context_blocks = []
    for ctx in contexts:
        content = ctx.get("content") or ctx.get("text") or ""
        title = ctx.get("title") or ctx.get("doc_id") or "미상 특허"
        page = ctx.get("page")
        tag = ctx.get("tag", "특허")
        header = f"[{tag}] 문서: {title}"
        if page is not None:
            header += f", 페이지 {page}"
        block = f"{header}\n점수: {ctx.get('score', 0):.3f}\n내용:\n{content}"
        context_blocks.append(block.strip())

    combined_context = "\n\n".join(context_blocks)

    web_block = ""
    if web_results:
        entries = []
        for item in web_results:
            title = item.get("title") or "웹 검색 결과"
            snippet = item.get("snippet") or ""
            link = item.get("link") or ""
            tag = item.get("tag", "웹")
            entry = f"[{tag}] 제목: {title}\n요약: {snippet}\n링크: {link}"
            entries.append(entry.strip())
        web_block = "\n\n".join(entries)

    system_prompt = (
        "당신은 GST 특허 데이터에 기반한 전문 분석 어시스턴트입니다. "
        "주어진 문맥만을 사용해 질문에 답변하고, 확신이 없을 경우 사실대로 부족한 점을 말씀하세요. "
        "항상 한국어로 응답하세요."
    )

    prompt = (
        f"{system_prompt}\n\n"
        f"[특허 문맥]\n{combined_context if combined_context else '관련 특허 문맥이 제공되지 않았습니다.'}\n\n"
    )

    if web_block:
        prompt += f"[웹 검색 결과]\n{web_block}\n\n"

    prompt += (
        f"[사용자 질문]\n{question}\n\n"
        "응답 시에는 다음을 포함하세요:\n"
        "- 핵심 요약\n"
        "- 상세 설명\n"
        "- 사용한 모든 근거에 대해 해당 태그를 대괄호로 인용 (예: [특허1], [웹2])\n"
        "- 답변 마지막에 '출처:' 섹션을 만들고 사용한 태그를 제목과 함께 bullet 리스트로 정리\n"
        "- 추론 근거가 부족한 경우, 추가 정보 필요성을 명시"
    )
    return prompt


def web_search(query: str, max_results: int = 4) -> List[Dict]:
    """
    특허 전문 웹 검색 기능 - 한국/일본/미국/기타 특허청 최적화
    
    검색 소스:
    - 한국특허청 (KIPRIS): patents.go.kr
    - 일본특허청 (J-PlatPat): j-platpat.inpit.go.jp
    - 미국특허청 (USPTO): patents.google.com, uspto.gov
    - 유럽특허청 (EPO): espacenet.com
    - 일반 웹 검색 (DuckDuckGo)
    
    주의: 웹 검색은 특허 검색을 보완하는 용도로만 사용됩니다.
    실제 특허 정보는 Pinecone 벡터 DB에서 가져옵니다.
    """
    if not WEB_SEARCH_ENABLED:
        return []
    
    all_results = []
    
    try:
        from duckduckgo_search import DDGS
        
        # 특허 번호 패턴 감지
        patent_number_patterns = {
            'kr': re.compile(r'(KR|10-?\d{7})', re.IGNORECASE),
            'jp': re.compile(r'(JP|特許|特開|特公)\s*[\d-]+', re.IGNORECASE),
            'us': re.compile(r'(US|USD?)\s*[\d,]+', re.IGNORECASE),
        }
        
        detected_regions = []
        for region, pattern in patent_number_patterns.items():
            if pattern.search(query):
                detected_regions.append(region)
        
        # 검색 전략 수립
        search_strategies = []
        
        # 1. 한국 특허 검색 전략
        if not detected_regions or 'kr' in detected_regions or any(
            keyword in query.lower() for keyword in ['스크러버', '칠러', '플라즈마', '반도체']
        ):
            search_strategies.append({
                'query': f'{query} site:patents.go.kr OR site:kipris.or.kr',
                'region': '🇰🇷 한국특허청',
                'priority': 10
            })
            search_strategies.append({
                'query': f'{query} 특허 한국',
                'region': '🇰🇷 한국',
                'priority': 8
            })
        
        # 2. 일본 특허 검색 전략
        if 'jp' in detected_regions or any(
            keyword in query for keyword in ['日本', 'スクラバー', 'チラー']
        ):
            search_strategies.append({
                'query': f'{query} site:j-platpat.inpit.go.jp',
                'region': '🇯🇵 일본특허청',
                'priority': 10
            })
            search_strategies.append({
                'query': f'{query} 特許 日本',
                'region': '🇯🇵 일본',
                'priority': 8
            })
        
        # 3. 미국 특허 검색 전략
        if 'us' in detected_regions or any(
            keyword in query.lower() for keyword in ['scrubber', 'chiller', 'plasma']
        ):
            search_strategies.append({
                'query': f'{query} site:patents.google.com OR site:uspto.gov',
                'region': '🇺🇸 미국특허청',
                'priority': 10
            })
            search_strategies.append({
                'query': f'{query} patent USA',
                'region': '🇺🇸 미국',
                'priority': 8
            })
        
        # 4. 유럽 및 국제 특허 검색
        search_strategies.append({
            'query': f'{query} site:espacenet.com OR site:epo.org',
            'region': '🇪🇺 유럽특허청',
            'priority': 6
        })
        
        # 5. 일반 특허 검색 (폴백)
        search_strategies.append({
            'query': f'{query} patent OR 特許 OR 특허',
            'region': '🌐 글로벌',
            'priority': 5
        })
        
        # 우선순위 정렬
        search_strategies.sort(key=lambda x: x['priority'], reverse=True)
        
        # 검색 실행
        results_per_strategy = max(2, max_results // min(len(search_strategies), 3))
        
        with DDGS() as ddgs:
            for strategy in search_strategies[:3]:  # 상위 3개 전략만 실행
                try:
                    print(f"[웹 검색] {strategy['region']} - 쿼리: {strategy['query'][:50]}...")
                    
                    for idx, result in enumerate(
                        ddgs.text(strategy['query'], max_results=results_per_strategy)
                    ):
                        if idx >= results_per_strategy:
                            break
                        
                        # 중복 제거
                        url = result.get("href", "")
                        if any(r['link'] == url for r in all_results):
                            continue
                        
                        all_results.append({
                            "title": result.get("title", ""),
                            "snippet": result.get("body", "")[:300],
                            "link": url,
                            "region": strategy['region'],
                            "priority": strategy['priority']
                        })
                        
                        if len(all_results) >= max_results:
                            break
                    
                    if len(all_results) >= max_results:
                        break
                        
                except Exception as strategy_error:
                    print(f"[웹 검색] {strategy['region']} 전략 실패: {strategy_error}")
                    continue
        
        # 우선순위 및 관련성 기반 정렬
        all_results.sort(key=lambda x: (
            x.get('priority', 0),
            # 특허청 사이트 우선
            1 if any(domain in x['link'] for domain in [
                'patents.go.kr', 'kipris.or.kr', 
                'j-platpat.inpit.go.jp',
                'patents.google.com', 'uspto.gov',
                'espacenet.com', 'epo.org'
            ]) else 0
        ), reverse=True)
        
        # 결과 제한
        all_results = all_results[:max_results]
        
        # 검색 결과 로깅
        if all_results:
            print(f"[웹 검색] '{query}' - {len(all_results)}개 결과 발견")
            for idx, result in enumerate(all_results, 1):
                print(f"  {idx}. [{result.get('region', '🌐')}] {result['title'][:50]}...")
        else:
            print(f"[웹 검색] '{query}' - 검색 결과 없음")
        
        return all_results
        
    except ImportError:
        print("[웹 검색] duckduckgo_search 라이브러리가 설치되지 않았습니다.")
        print("[웹 검색] pip install duckduckgo-search 실행 필요")
        return []
    except Exception as e:
        print(f"[웹 검색] 오류 발생: {type(e).__name__} - {str(e)}")
        return []


def run_query(
    question: str,
    top_k: int = 5,
    include_web: bool = True,
    web_results_limit: int = 4,
) -> Dict:
    index, client = init_clients()

    query_vector = embed_text(client, question)
    query_response = index.query(
        namespace=PINECONE_NAMESPACE,
        vector=query_vector,
        top_k=top_k,
        include_metadata=True,
        include_values=False,
    )

    matches = []
    for idx, match in enumerate(query_response.matches or [], start=1):
        metadata = match.metadata or {}
        metadata = metadata.copy()
        metadata.setdefault("score", match.score)
        metadata["tag"] = f"특허{idx}"
        matches.append(metadata)

    raw_web_results = web_search(question, web_results_limit) if include_web else []
    web_results = []
    for idx, item in enumerate(raw_web_results, start=1):
        enriched = item.copy()
        enriched["tag"] = f"웹{idx}"
        web_results.append(enriched)

    prompt = build_prompt(question, matches, web_results)
    
    # OpenAI Chat Completion API 호출 (올바른 방식)
    chat_response = client.chat.completions.create(
        model=CHAT_MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    "당신은 GST 특허 데이터에 기반한 전문 분석 어시스턴트입니다. "
                    "주어진 문맥만을 사용해 질문에 답변하고, 확신이 없을 경우 사실대로 부족한 점을 말씀하세요. "
                    "항상 한국어로 응답하세요."
                ),
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
        temperature=0.3,  # 일관된 답변을 위해 낮은 temperature
        max_tokens=1500,
    )

    answer_text = chat_response.choices[0].message.content.strip()
    
    # 토큰 사용량 로깅
    usage = chat_response.usage
    print(f"[OpenAI] 모델: {CHAT_MODEL}, 토큰: {usage.total_tokens} "
          f"(입력: {usage.prompt_tokens}, 출력: {usage.completion_tokens})")
    
    return {
        "answer": answer_text,
        "matches": matches,
        "web_results": web_results,
        "model_used": CHAT_MODEL,
        "tokens_used": usage.total_tokens,
    }


def sidebar_controls() -> Tuple[int, bool, int]:
    st.sidebar.header("⚙️ Control Panel")
    
    # 웹 검색 설정
    st.sidebar.subheader("🌐 웹 검색 설정")
    include_web = st.sidebar.checkbox(
        "웹 검색 결과 포함", 
        value=WEB_SEARCH_ENABLED,
        help="체크하면 특허 DB 검색 외에 웹 검색 결과도 포함됩니다. (duckduckgo-search 라이브러리 필요)"
    )
    web_results_limit = st.sidebar.slider("웹 검색 결과 수", 1, 10, 3)
    
    if not WEB_SEARCH_ENABLED:
        st.sidebar.warning("⚠️ 웹 검색이 비활성화되어 있습니다. (.env의 WEB_SEARCH_ENABLED=true 설정)")
    
    st.sidebar.markdown("---")
    
    # Pinecone 검색 설정
    st.sidebar.subheader("📚 특허 DB 검색")
    top_k = st.sidebar.slider(
        "Pinecone 검색 결과 수", 
        1, 10, 5,
        help="유사도가 높은 상위 N개의 특허 청크를 가져옵니다."
    )
    
    # 모델 정보 표시
    st.sidebar.markdown("---")
    st.sidebar.subheader("🤖 AI 모델 정보")
    st.sidebar.info(f"**사용 모델:** {CHAT_MODEL}\n**임베딩:** {EMBEDDING_MODEL}")

    st.sidebar.markdown("---")
    st.sidebar.subheader("🔧 데이터 동기화")
    if st.sidebar.button("Pinecone 업서트 실행", use_container_width=True):
        with st.spinner("rag_outputs 데이터를 Pinecone에 업서트하는 중입니다..."):
            upserts, chunks, docs = sync_rag_outputs()
        st.sidebar.success(f"업서트 완료: {upserts} 벡터 (청크 {chunks}개, 문서 {docs}건)")
    
    st.sidebar.markdown("---")
    st.sidebar.info(
        "💡 **사용 팁**\n\n"
        "• 특허 번호, 기술명, 발명자명 등으로 질문하세요\n"
        "• 웹 검색은 한/일/미/유럽 특허청 최적화\n"
        "  - 🇰🇷 한국: patents.go.kr, kipris.or.kr\n"
        "  - 🇯🇵 일본: j-platpat.inpit.go.jp\n"
        "  - 🇺🇸 미국: patents.google.com, uspto.gov\n"
        "  - 🇪🇺 유럽: espacenet.com\n"
        "• 특허번호 감지 시 해당 국가 우선 검색\n"
        "• `.env` 파일에 OpenAI/Pinecone 키 설정 필요\n"
        "• rag_outputs 폴더 내용 변경 시 업서트 재실행"
    )
    return top_k, include_web, web_results_limit


def sanitize_text(content: str) -> str:
    lines = content.split("\n")
    html_lines: List[str] = []
    in_list = False
    for raw_line in lines:
        line = raw_line.strip()
        if not line:
            if in_list:
                html_lines.append("</ul>")
                in_list = False
            continue
        if line.startswith("- "):
            if not in_list:
                html_lines.append("<ul>")
                in_list = True
            html_lines.append(f"<li>{escape(line[2:])}</li>")
        else:
            if in_list:
                html_lines.append("</ul>")
                in_list = False
            html_lines.append(f"<p>{escape(line)}</p>")
    if in_list:
        html_lines.append("</ul>")
    return "\n".join(html_lines) or "<p></p>"


def build_reference_block(patent_sources: List[Dict], web_sources: List[Dict]) -> str:
    sections = []
    if patent_sources:
        items = []
        for meta in patent_sources:
            title = escape(meta.get("title") or meta.get("doc_id") or "미상 제목")
            page = escape(str(meta.get("page", "정보 없음")))
            score = meta.get("score", 0.0)
            tag = escape(meta.get("tag", "특허"))
            url = meta.get("url")
            title_part = (
                f"<a href='{escape(url, quote=True)}' target='_blank' rel='noopener'><strong>{title}</strong></a>"
                if url
                else f"<strong>{title}</strong>"
            )
            items.append(f"<li>[{tag}] {title_part} · 페이지 {page} · 점수 {score:.3f}</li>")
        sections.append(
            "<div class='reference-group'><div class='reference-title'>📘 특허 근거</div>"
            f"<ul>{''.join(items)}</ul></div>"
        )
    if web_sources:
        items = []
        for item in web_sources:
            title = escape(item.get("title") or "웹 출처")
            snippet = escape(item.get("snippet") or "")
            link = escape(item.get("link") or "#")
            tag = escape(item.get("tag", "웹"))
            region = escape(item.get("region", "🌐"))
            items.append(
                f"<li>[{tag}] {region} <a href='{link}' target='_blank' rel='noopener'>{title}</a>"
                f"{f' · {snippet}' if snippet else ''}</li>"
            )
        sections.append(
            "<div class='reference-group'><div class='reference-title'>🌐 웹 검색 (특허청 최적화)</div>"
            f"<ul>{''.join(items)}</ul></div>"
        )
    if not sections:
        return ""
    return "<div class='reference-wrapper'>" + "".join(sections) + "</div>"


def build_patent_url(meta: Dict) -> str | None:
    doc_id = meta.get("doc_id")
    if doc_id:
        filename = f"{doc_id}.json"
        return f"{PATENT_DOC_BASE_URL}/{filename}"
    source_path = meta.get("source_path") or meta.get("source")
    if isinstance(source_path, str) and source_path.strip():
        name = Path(source_path).name
        if name:
            return f"{PATENT_DOC_BASE_URL}/{name}"
    return None


def source_cleanup(patent_sources: List[Dict]) -> List[Dict]:
    cleaned = []
    for meta in patent_sources or []:
        url = build_patent_url(meta)
        cleaned.append(
            {
                "title": meta.get("title") or meta.get("doc_id"),
                "doc_id": meta.get("doc_id"),
                "page": meta.get("page"),
                "score": meta.get("score"),
                "tag": meta.get("tag"),
                "content": meta.get("content") or meta.get("text"),
                "url": url,
            }
        )
    return cleaned


def ensure_sources_section(answer: str, patent_sources: List[Dict], web_sources: List[Dict]) -> str:
    answer = answer.strip()
    if not patent_sources and not web_sources:
        return answer

    if "출처" in answer:
        return answer

    lines = [answer, "", "출처:"]
    for meta in patent_sources or []:
        title = meta.get("title") or meta.get("doc_id") or "미상 제목"
        page = meta.get("page", "정보 없음")
        tag = meta.get("tag", "특허")
        url = meta.get("url") or build_patent_url(meta)
        if url:
            lines.append(f"- [{tag}] [{title}]({url}) (페이지 {page})")
        else:
            lines.append(f"- [{tag}] {title} (페이지 {page})")
    for item in web_sources or []:
        title = item.get("title") or "웹 출처"
        link = item.get("link") or ""
        tag = item.get("tag", "웹")
        suffix = f" · {link}" if link else ""
        lines.append(f"- [{tag}] {title}{suffix}")
    return "\n".join(lines)


def build_message_html(role_class: str, label: str, content_html: str, reference_html: str = "") -> str:
    return (
        f"<div class='chat-message {role_class}'>"
        f"<div class='chat-label'>{label}</div>"
        f"<div class='chat-content'>{content_html}</div>"
        f"{reference_html}"
        "</div>"
    )


def typewriter_render(container, raw_text: str, references_html: str):
    placeholder = container.empty()
    tokens = re.split(r"(\s+)", raw_text)
    buffer = ""
    for token in tokens:
        buffer += token
        content_html = sanitize_text(buffer)
        html = build_message_html("assistant", "GST 특허 AI", content_html)
        placeholder.markdown(html, unsafe_allow_html=True)
        time.sleep(0.04)
    final_html = build_message_html("assistant", "GST 특허 AI", sanitize_text(raw_text), references_html)
    placeholder.markdown(final_html, unsafe_allow_html=True)


CUSTOM_CSS = """
<style>
/* Layout */
[data-testid="stAppViewContainer"] {
    background: radial-gradient(circle at top, #111827 0%, #0f172a 45%, #050910 100%);
    color: #e5e7eb;
    min-height: 100vh;
}
[data-testid="stMain"] {
    padding: 0;
}
[data-testid="stHeader"] {
    background: transparent;
}
.chat-wrapper {
    max-width: 980px;
    margin: 0 auto;
    padding: 2.5rem 1.5rem 8rem;
}
.chat-message {
    border-radius: 16px;
    padding: 1.4rem 1.6rem;
    margin-bottom: 1rem;
    line-height: 1.65;
    border: 1px solid rgba(148, 163, 184, 0.2);
    box-shadow: 0 10px 35px rgba(15, 23, 42, 0.25);
    backdrop-filter: blur(6px);
}
.chat-message.user {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.15));
    border-color: rgba(96, 165, 250, 0.35);
}
.chat-message.assistant {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.28), rgba(20, 184, 166, 0.22));
    border-color: rgba(94, 234, 212, 0.35);
}
.chat-label {
    font-size: 0.85rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    margin-bottom: 0.6rem;
}
.chat-message.user .chat-label {
    color: #60a5fa;
    text-align: right;
}
.chat-message.assistant .chat-label {
    color: #5eead4;
}
.chat-content p {
    margin: 0 0 0.8rem;
}
.chat-content ul {
    padding-left: 1.2rem;
    margin: 0.4rem 0 1rem;
}
.chat-content li {
    margin-bottom: 0.35rem;
}
.reference-wrapper {
    margin-top: 1.3rem;
    border-top: 1px solid rgba(148, 163, 184, 0.25);
    padding-top: 1rem;
}
.reference-title {
    font-size: 0.85rem;
    font-weight: 600;
    letter-spacing: 0.03em;
    color: rgba(244, 244, 245, 0.75);
    margin-bottom: 0.35rem;
}
.reference-wrapper ul {
    margin: 0;
    padding-left: 1.1rem;
    font-size: 0.92rem;
}
.reference-wrapper li {
    margin-bottom: 0.4rem;
}
.reference-wrapper a {
    color: #38bdf8;
    text-decoration: none;
}
.reference-wrapper a:hover {
    text-decoration: underline;
}

/* Sidebar */
[data-testid="stSidebar"] {
    background: rgba(15, 23, 42, 0.95);
    backdrop-filter: blur(8px);
    color: #e2e8f0;
}
[data-testid="stSidebar"] h1, [data-testid="stSidebar"] h2, [data-testid="stSidebar"] h3 {
    color: #f8fafc;
}
[data-testid="stSidebar"] .stSlider label, [data-testid="stSidebar"] .stCheckbox label {
    font-weight: 600;
}

/* Chat input */
div[data-testid="stChatInput"] {
    background: rgba(15, 23, 42, 0.85);
    border-top: 1px solid rgba(148, 163, 184, 0.25);
}
div[data-testid="stChatInput"] textarea {
    background: rgba(15, 23, 42, 0.9);
    color: #e5e7eb;
}
</style>
"""


def main():
    st.set_page_config(page_title="GST 특허 AI 질의", page_icon="🤖", layout="wide")
    st.markdown(CUSTOM_CSS, unsafe_allow_html=True)

    st.markdown(
        """
        <div style="text-align:center; padding-top: 2rem;">
            <h1 style="font-size:2.2rem; color:#f8fafc; font-weight:800; letter-spacing:0.03em;">
                GST 특허 AI Copilot
            </h1>
            <p style="color:rgba(226,232,240,0.75); font-size:1.05rem; margin-top:0.5rem;">
                GST 지능형 특허 분석 도우미 🤖💡
            </p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    top_k, include_web, web_results_limit = sidebar_controls()

    if "conversation" not in st.session_state:
        st.session_state.conversation = []

    chat_container = st.container()
    chat_container.markdown("<div class='chat-wrapper'>", unsafe_allow_html=True)

    for message in st.session_state.conversation:
        role_class = "user" if message["role"] == "user" else "assistant"
        label = "사용자" if message["role"] == "user" else "GST 특허 AI"
        message_html = sanitize_text(message["content"])
        reference_html = ""
        if message["role"] == "assistant":
            reference_html = build_reference_block(
                message.get("sources") or [],
                message.get("web_sources") or [],
            )
        msg_container = chat_container.container()
        msg_container.markdown(
            build_message_html(role_class, label, message_html, reference_html),
            unsafe_allow_html=True,
        )

    pending_container = chat_container.container()
    closing_container = chat_container.container()
    closing_container.markdown("</div>", unsafe_allow_html=True)

    prompt = st.chat_input("특허 관련 질문을 입력하세요.")
    if prompt:
        st.session_state.conversation.append({"role": "user", "content": prompt})
        with st.spinner("GST 특허 RAG 챗봇 관련 질문의 정보와 특허를 분석하고 있습니다..."):
            try:
                result = run_query(
                    prompt,
                    top_k=top_k,
                    include_web=include_web,
                    web_results_limit=web_results_limit,
                )
                sources = result["matches"]
                web_sources = result["web_results"]
                answer = ensure_sources_section(result["answer"], sources, web_sources)
                clean_sources = source_cleanup(sources)
                references_html = build_reference_block(clean_sources, web_sources)
                typewriter_render(pending_container, answer, references_html)
                st.session_state.conversation.append(
                    {
                        "role": "assistant",
                        "content": answer,
                        "sources": clean_sources,
                        "web_sources": web_sources,
                    }
                )
            except Exception as exc:
                st.error(f"질의 처리 중 오류가 발생했습니다: {exc}")
                st.session_state.conversation.append(
                    {
                        "role": "assistant",
                        "content": "죄송합니다. 현재 질의를 처리하는 중 오류가 발생했습니다.",
                        "sources": [],
                        "web_sources": [],
                    }
                )
        if hasattr(st, "rerun"):
            st.rerun()
        elif hasattr(st, "experimental_rerun"):
            st.experimental_rerun()


if __name__ == "__main__":
    main()
