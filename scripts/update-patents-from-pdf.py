"""
PDF → JSON 변환 스크립트
-----------------------
data/pdf 폴더에 위치한 원본 PDF를 읽어
data/patents 아래 JSON 파일들의 페이지 텍스트를 갱신합니다.

Usage:
    python3 scripts/update-patents-from-pdf.py
"""

import json
from datetime import datetime, timezone
from io import StringIO
from pathlib import Path
import unicodedata

from typing import Optional

from pdfminer.high_level import extract_text_to_fp
from pdfminer.layout import LAParams
from pdfminer.pdfpage import PDFPage

ROOT_DIR = Path(__file__).resolve().parent.parent
PDF_DIR = ROOT_DIR / "data" / "pdf"
JSON_DIR = ROOT_DIR / "data" / "patents"


def normalize(name: str) -> str:
    """공백/특수문자를 제거한 소문자 키 생성."""
    composed = unicodedata.normalize("NFC", name)
    return "".join(ch.lower() for ch in composed if ch.isalnum())


def build_pdf_index():
    index = {}
    for pdf_path in PDF_DIR.glob("**/*.pdf"):
        key = normalize(pdf_path.stem)
        index.setdefault(key, []).append(pdf_path)
    return index


def find_pdf_for(json_path: Path, data: dict, pdf_index: dict) -> Optional[Path]:
    doc_id = data.get("doc_id", "")
    title = data.get("title", "")
    stem = json_path.stem

    candidates = [doc_id, title, stem]

    if doc_id and "-" in doc_id:
        candidates.append("-".join(doc_id.split("-")[:-1]))

    if "-" in stem:
        candidates.append("-".join(stem.split("-")[:-1]))

    for cand in candidates:
        key = normalize(cand)
        if key and key in pdf_index:
            paths = pdf_index[key]
            return paths[0]

    # source_path 기반 보조 매칭
    source_path = data.get("source_path", "")
    if source_path:
        source_key = normalize(Path(source_path).stem)
        if source_key and source_key in pdf_index:
            return pdf_index[source_key][0]

    # fallback: 부분 일치 검색
    target_key = normalize(doc_id or stem)
    for key, paths in pdf_index.items():
        if target_key and (target_key in key or key in target_key):
            return paths[0]

    return None


def extract_pages(pdf_path: Path) -> list[dict]:
    pages = []
    laparams = LAParams()
    with open(pdf_path, "rb") as fh:
        total_pages = sum(1 for _ in PDFPage.get_pages(fh))

    for idx in range(total_pages):
        buffer = StringIO()
        with open(pdf_path, "rb") as fh:
            extract_text_to_fp(
                fh,
                buffer,
                laparams=laparams,
                page_numbers=[idx],
                output_type="text",
            )
        text = buffer.getvalue()
        pages.append(
            {
                "page_number": idx + 1,
                "text": text,
                "images": [],
            }
        )
    return pages


def update_json(json_path: Path, pdf_path: Path):
    with json_path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    pages = extract_pages(pdf_path)
    full_text = "\n".join(page["text"] for page in pages)
    extraction_ts = datetime.now(timezone.utc).isoformat()

    data["pages"] = pages
    data["page_count"] = len(pages)
    data["full_text"] = full_text[:10000]
    data["image_count"] = sum(len(p["images"]) for p in pages)
    data["extraction_date"] = extraction_ts
    data["source_path"] = str(pdf_path)

    with json_path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"✅ {json_path.name} ← {pdf_path.name} (페이지 {len(pages)}장)")


def main():
    pdf_index = build_pdf_index()
    if not pdf_index:
        raise SystemExit("⚠️ data/pdf 폴더에 PDF가 없습니다.")

    updated = 0
    missing = []

    for json_path in sorted(JSON_DIR.glob("*.json")):
        with json_path.open("r", encoding="utf-8") as f:
            data = json.load(f)

        if not isinstance(data, dict):
            missing.append(json_path.name)
            print(f"❌ JSON 구조 지원 불가: {json_path.name}")
            continue

        pdf_path = find_pdf_for(json_path, data, pdf_index)
        if not pdf_path or not pdf_path.exists():
            missing.append(json_path.name)
            print(f"❌ PDF 미매칭: {json_path.name}")
            continue

        update_json(json_path, pdf_path)
        updated += 1

    print("\n작업 완료")
    print(f" - 갱신 성공: {updated}개")
    if missing:
        print(f" - PDF 없음/매칭 실패: {len(missing)}개")
        for name in missing:
            print(f"   • {name}")


if __name__ == "__main__":
    main()
