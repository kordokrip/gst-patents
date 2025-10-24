"""
Pinecone 업서트 스크립트
-----------------------
`rag_outputs/` 폴더에 저장된 JSONL 청크를 읽어 Pinecone 서버리스 인덱스에 업서트합니다.

실행 예시:
    python scripts/pinecone_ingest.py

환경 변수는 프로젝트 루트의 .env 파일(OpenAI/Pinecone 설정)을 사용합니다.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple, Union

from dotenv import load_dotenv
from openai import OpenAI
from pinecone import Pinecone, ServerlessSpec
from pinecone.exceptions import ForbiddenException

load_dotenv()

ROOT_DIR = Path(__file__).resolve().parent.parent
RAG_OUTPUT_DIR = ROOT_DIR / "rag_outputs"

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_ENVIRONMENT = os.getenv("PINECONE_ENVIRONMENT", "us-east-1")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX", "gstllm")
PINECONE_NAMESPACE = os.getenv("PINECONE_NAMESPACE", "gst-patents")

EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-3-large")

MODEL_DIMENSIONS = {
    "text-embedding-3-large": 3072,
    "text-embedding-3-small": 1536,
    "text-embedding-ada-002": 1536,
}

_dim_env = os.getenv("EMBEDDING_DIMENSION")
if _dim_env:
    EMBEDDING_DIMENSION = int(_dim_env)
else:
    EMBEDDING_DIMENSION = MODEL_DIMENSIONS.get(EMBEDDING_MODEL)
    if EMBEDDING_DIMENSION is None:
        raise ValueError(
            f"임베딩 모델 '{EMBEDDING_MODEL}'의 차원을 알 수 없습니다. "
            "EMBEDDING_DIMENSION 환경변수를 직접 설정하거나 지원되는 모델을 사용하세요."
        )

AUTO_RECREATE_INDEX = os.getenv("PINECONE_AUTO_RECREATE", "true").lower() in {"1", "true", "yes"}


@dataclass
class ChunkRecord:
    chunk_id: str
    text: str
    metadata: Dict[str, Union[str, int, float, bool]]


def ensure_index(pc: Pinecone) -> None:
    """필요 시 Pinecone 서버리스 인덱스를 생성하고 차원을 검증한다."""
    if pc.has_index(PINECONE_INDEX_NAME):
        info = pc.describe_index(PINECONE_INDEX_NAME)
        current_dimension: Optional[int] = getattr(info, "dimension", None)
        if current_dimension is None and isinstance(info, dict):
            current_dimension = info.get("dimension")
        if current_dimension is None:
            raise RuntimeError("Pinecone 인덱스 정보를 확인할 수 없습니다. SDK 버전을 확인하세요.")

        if current_dimension != EMBEDDING_DIMENSION:
            if AUTO_RECREATE_INDEX:
                print(
                    f"⚠️  Pinecone 인덱스 '{PINECONE_INDEX_NAME}'의 차원({current_dimension})이 "
                    f"임베딩 차원({EMBEDDING_DIMENSION})과 일치하지 않습니다. "
                    "인덱스를 삭제 후 재생성합니다."
                )
                try:
                    pc.delete_index(PINECONE_INDEX_NAME)
                except ForbiddenException as exc:
                    raise RuntimeError(
                        "Pinecone 인덱스 삭제가 거부되었습니다. 삭제 보호(Deletion protection)를 비활성화하거나 "
                        "새 인덱스 이름을 사용해 주세요. 원본 오류: " + str(exc)
                    ) from exc
            else:
                raise RuntimeError(
                    f"Pinecone 인덱스 '{PINECONE_INDEX_NAME}'의 차원({current_dimension})이 "
                    f"임베딩 차원({EMBEDDING_DIMENSION})과 일치하지 않습니다. "
                    "인덱스를 삭제 후 재생성하거나 EMBEDDING_MODEL/EMBEDDING_DIMENSION 설정을 "
                    "기존 인덱스에 맞춰 조정하세요. 자동 재생성을 허용하려면 "
                    "PINECONE_AUTO_RECREATE=true 환경변수를 설정하십시오."
                )
        else:
            return

    # 인덱스가 없거나 삭제된 경우 새로 생성
    spec = ServerlessSpec(cloud="aws", region=PINECONE_ENVIRONMENT)
    pc.create_index(
        name=PINECONE_INDEX_NAME,
        dimension=EMBEDDING_DIMENSION,
        metric="cosine",
        spec=spec,
    )


def load_jsonl_chunks(target_dir: Path) -> Iterable[ChunkRecord]:
    """rag_outputs 디렉터리에서 *_pinecone_text.jsonl 파일을 순회하며 ChunkRecord 생성."""
    jsonl_files = sorted(target_dir.rglob("*_pinecone_text.jsonl"))
    for path in jsonl_files:
        with path.open("r", encoding="utf-8") as f:
            for line in f:
                record = json.loads(line)
                text = (record.get("text") or "").strip()
                if not text:
                    continue

                metadata = record.get("metadata") or {}
                metadata = _sanitize_metadata(metadata)
                metadata["content"] = text
                metadata["chunk_id"] = record.get("id")

                yield ChunkRecord(
                    chunk_id=record.get("id"),
                    text=text,
                    metadata=metadata,
                )


def _sanitize_metadata(metadata: Dict) -> Dict[str, Union[str, int, float, bool]]:
    """Pinecone 메타데이터에서 허용되지 않는 값(NaN, None, dict 등)을 문자열로 정규화."""
    sanitized: Dict[str, Union[str, int, float, bool]] = {}
    for key, value in metadata.items():
        if value is None:
            continue
        if isinstance(value, (str, int, float, bool)):
            sanitized[key] = value
        else:
            sanitized[key] = str(value)
    return sanitized


def batch_iterable(iterable: Iterable[ChunkRecord], batch_size: int = 64) -> Iterable[List[ChunkRecord]]:
    """Iterable을 batch size 만큼 묶어 반환."""
    batch: List[ChunkRecord] = []
    for item in iterable:
        batch.append(item)
        if len(batch) >= batch_size:
            yield batch
            batch = []
    if batch:
        yield batch


def upsert_chunks_to_pinecone(chunks: Iterable[ChunkRecord]) -> Tuple[int, int]:
    """청크를 임베딩 후 Pinecone에 업서트한다. (업서트 개수, 청크 개수) 반환."""
    if not PINECONE_API_KEY:
        raise RuntimeError("PINECONE_API_KEY가 설정되어 있지 않습니다.")

    pc = Pinecone(api_key=PINECONE_API_KEY)
    ensure_index(pc)
    index = pc.Index(PINECONE_INDEX_NAME)

    client = OpenAI()

    total_upserts = 0
    total_chunks = 0
    doc_ids = set()

    for batch in batch_iterable(chunks, batch_size=64):
        inputs = [record.text for record in batch]
        embeddings_response = client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=inputs,
        )

        vectors = []
        for record, embed in zip(batch, embeddings_response.data):
            doc_id = record.metadata.get("doc_id")
            if doc_id:
                doc_ids.add(str(doc_id))
            vectors.append(
                {
                    "id": _to_pinecone_id(record.chunk_id),
                    "values": embed.embedding,
                    "metadata": record.metadata,
                }
            )

        index.upsert(vectors=vectors, namespace=PINECONE_NAMESPACE)
        total_upserts += len(vectors)
        total_chunks += len(batch)

    return total_upserts, total_chunks, len(doc_ids)


def sync_rag_outputs() -> Tuple[int, int]:
    """rag_outputs 폴더 전체를 Pinecone과 동기화한다."""
    if not RAG_OUTPUT_DIR.exists():
        raise FileNotFoundError(f"RAG 출력 디렉터리를 찾을 수 없습니다: {RAG_OUTPUT_DIR}")

    chunks = load_jsonl_chunks(RAG_OUTPUT_DIR)
    return upsert_chunks_to_pinecone(chunks)


def main():
    upserts, chunks, docs = sync_rag_outputs()
    print(f"✅ Pinecone 업서트 완료 - 총 {upserts} 벡터 (청크 {chunks}개, 문서 {docs}건)")


def _to_pinecone_id(chunk_id: str) -> str:
    """Pinecone의 ID 제약(ASCII, 길이 제한 등)을 만족하도록 변환."""
    if not chunk_id:
        raise ValueError("청크 ID가 비어 있습니다.")

    try:
        chunk_id.encode("ascii")
        ascii_id = chunk_id
    except UnicodeEncodeError:
        ascii_id = _hash_id(chunk_id)

    if len(ascii_id) > 92:
        ascii_id = _hash_id(ascii_id)

    return ascii_id


def _hash_id(value: str) -> str:
    import hashlib

    digest = hashlib.sha1(value.encode("utf-8")).hexdigest()
    return f"id_{digest}"


if __name__ == "__main__":
    main()
