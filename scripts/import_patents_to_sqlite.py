#!/usr/bin/env python3
import json
import sqlite3
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).resolve().parent.parent
JSON_DIR = ROOT / "data" / "patents"
DB_PATH = ROOT / "data" / "gst_patents.db"
SCHEMA_PATH = ROOT / "db" / "schema.sql"

def load_schema(conn):
    with open(SCHEMA_PATH, encoding="utf-8") as f:
        conn.executescript(f.read())

def insert_patent(conn, data):
    if not isinstance(data, dict):
        return
    if "doc_id" not in data:
        return

    patent = {
        "id": data["doc_id"],
        "patent_number": data.get("patent_number"),
        "title": data.get("title"),
        "abstract": data.get("abstract"),
        "category": data.get("category"),
        "technology_field": data.get("technology_field"),
        "registration_date": data.get("registration_date"),
        "application_date": data.get("application_date"),
        "publication_date": data.get("publication_date"),
        "status": data.get("status"),
        "assignee": data.get("assignee"),
        "priority_score": data.get("priority_score"),
        "main_claims": data.get("main_claims"),
        "full_text": data.get("full_text"),
        "page_count": data.get("page_count"),
        "source_path": data.get("source_path"),
        "extraction_date": data.get("extraction_date"),
        "ipc_classification": data.get("ipc_classification"),
        "legal_status": data.get("legal_status"),
        "image_count": data.get("image_count"),
        "vector_embedding_ready": int(bool(data.get("vector_embedding_ready")))
    }
    conn.execute("""
        INSERT INTO patents (
            id, patent_number, title, abstract, category, technology_field,
            registration_date, application_date, publication_date, status,
            assignee, priority_score, main_claims, full_text, page_count,
            source_path, extraction_date, ipc_classification, legal_status,
            image_count, vector_embedding_ready
        ) VALUES (
            :id, :patent_number, :title, :abstract, :category, :technology_field,
            :registration_date, :application_date, :publication_date, :status,
            :assignee, :priority_score, :main_claims, :full_text, :page_count,
            :source_path, :extraction_date, :ipc_classification, :legal_status,
            :image_count, :vector_embedding_ready
        )
    """, patent)

    for inventor in data.get("inventors") or []:
        conn.execute("INSERT INTO patent_inventors (patent_id, name) VALUES (?, ?)", (patent["id"], inventor))

    for keyword in data.get("technical_keywords") or []:
        conn.execute("INSERT INTO patent_keywords (patent_id, keyword) VALUES (?, ?)", (patent["id"], keyword))

    for page in data.get("pages") or []:
        conn.execute(
            "INSERT INTO patent_pages (patent_id, page_number, text) VALUES (?, ?, ?)",
            (patent["id"], page.get("page_number"), page.get("text"))
        )
        for image in page.get("images") or []:
            conn.execute(
                """INSERT INTO patent_images
                   (patent_id, page_number, path, width, height, md5, phash, ocr_text)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    patent["id"],
                    page.get("page_number"),
                    image.get("path"),
                    image.get("width"),
                    image.get("height"),
                    image.get("md5"),
                    image.get("phash"),
                    image.get("ocr_text")
                )
            )

    conn.execute(
        "INSERT INTO patent_search (patent_id, title, abstract, technology_field, full_text) VALUES (?, ?, ?, ?, ?)",
        (patent["id"], patent["title"], patent["abstract"], patent["technology_field"], patent["full_text"])
    )


def iter_patent_records(payload):
    if isinstance(payload, dict):
        if "doc_id" in payload:
            yield payload
        else:
            for key in ("data", "items", "records"):
                if key in payload and isinstance(payload[key], list):
                    for item in payload[key]:
                        yield from iter_patent_records(item)
    elif isinstance(payload, list):
        for item in payload:
            yield from iter_patent_records(item)

def main():
    if DB_PATH.exists():
        DB_PATH.unlink()

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    load_schema(conn)

    json_files = sorted(JSON_DIR.glob("*.json"))
    skipped = 0
    total_inserted = 0
    for path in json_files:
        with path.open(encoding="utf-8") as f:
            payload = json.load(f)
        inserted_here = 0
        for record in iter_patent_records(payload):
            insert_patent(conn, record)
            inserted_here += 1
        total_inserted += inserted_here
        if inserted_here == 0:
            skipped += 1
            print(f"⚠️ 스킵: {path.name} (유효한 doc_id 없음)")

    conn.commit()
    conn.close()
    print(f"✅ SQLite DB 생성 완료: {DB_PATH}")
    print(f"   • 총 특허 입력: {total_inserted}")
    if skipped:
        print(f"   • 스킵된 파일: {skipped}")

if __name__ == "__main__":
    main()
