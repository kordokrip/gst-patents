from pathlib import Path
from typing import List, Optional

import sqlite3
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "data" / "gst_patents.db"

app = FastAPI(title="GST Patents API")


class Patent(BaseModel):
    id: str
    patent_number: Optional[str]
    title: Optional[str]
    abstract: Optional[str]
    category: Optional[str]
    technology_field: Optional[str]
    registration_date: Optional[str]
    status: Optional[str]
    assignee: Optional[str]
    priority_score: Optional[int]


class PatentDetail(Patent):
    application_date: Optional[str]
    publication_date: Optional[str]
    main_claims: Optional[str]
    full_text: Optional[str]
    page_count: Optional[int]
    ipc_classification: Optional[str]
    legal_status: Optional[str]
    image_count: Optional[int]
    inventors: List[str] = []
    keywords: List[str] = []


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


@app.get("/patents", response_model=List[Patent])
def list_patents(
    q: Optional[str] = Query(None, description="Full-text search term"),
    category: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(50, le=200)
):
    conn = get_conn()
    cursor = conn.cursor()

    if q:
        query = (
            "SELECT p.* FROM patent_search ps "
            "JOIN patents p ON ps.patent_id = p.id "
            "WHERE ps MATCH ?"
        )
        params: List = [q]
        if category:
            query += " AND p.category = ?"
            params.append(category)
        if status:
            query += " AND p.status = ?"
            params.append(status)
        query += " LIMIT ?"
        params.append(limit)
        cursor.execute(query, params)
    else:
        query = "SELECT * FROM patents WHERE 1=1"
        params: List = []
        if category:
            query += " AND category = ?"
            params.append(category)
        if status:
            query += " AND status = ?"
            params.append(status)
        query += " ORDER BY registration_date DESC LIMIT ?"
        params.append(limit)
        cursor.execute(query, params)

    patents = [Patent(**dict(row)) for row in cursor.fetchall()]
    conn.close()
    return patents


@app.get("/patents/{patent_id}", response_model=PatentDetail)
def get_patent(patent_id: str):
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM patents WHERE id = ?", (patent_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Patent not found")

    detail = PatentDetail(**dict(row))

    cursor.execute("SELECT name FROM patent_inventors WHERE patent_id = ?", (patent_id,))
    detail.inventors = [r[0] for r in cursor.fetchall()]

    cursor.execute("SELECT keyword FROM patent_keywords WHERE patent_id = ?", (patent_id,))
    detail.keywords = [r[0] for r in cursor.fetchall()]

    conn.close()
    return detail


@app.get("/stats")
def stats():
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as count FROM patents")
    total = cursor.fetchone()["count"]
    cursor.execute("SELECT COUNT(*) as count FROM patents WHERE status = 'active'")
    active = cursor.fetchone()["count"]
    cursor.execute("SELECT COUNT(DISTINCT category) as count FROM patents WHERE category IS NOT NULL")
    categories = cursor.fetchone()["count"]
    conn.close()
    return {"total": total, "active": active, "categories": categories}
