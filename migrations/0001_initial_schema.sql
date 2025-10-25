-- Migration: Initial schema for GST Patents Database
-- Created: 2025-01-24

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Main patents table
CREATE TABLE IF NOT EXISTS patents (
    id TEXT PRIMARY KEY,
    patent_number TEXT,
    title TEXT,
    abstract TEXT,
    category TEXT,
    technology_field TEXT,
    registration_date TEXT,
    application_date TEXT,
    publication_date TEXT,
    status TEXT,
    assignee TEXT,
    priority_score INTEGER,
    main_claims TEXT,
    full_text TEXT,
    page_count INTEGER,
    source_path TEXT,
    extraction_date TEXT,
    ipc_classification TEXT,
    legal_status TEXT,
    image_count INTEGER,
    vector_embedding_ready INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Patent inventors (many-to-many)
CREATE TABLE IF NOT EXISTS patent_inventors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patent_id TEXT NOT NULL REFERENCES patents(id) ON DELETE CASCADE,
    name TEXT NOT NULL
);

-- Patent keywords (many-to-many)
CREATE TABLE IF NOT EXISTS patent_keywords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patent_id TEXT NOT NULL REFERENCES patents(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL
);

-- Patent pages (OCR text per page)
CREATE TABLE IF NOT EXISTS patent_pages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patent_id TEXT NOT NULL REFERENCES patents(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    text TEXT
);

-- Patent images metadata
CREATE TABLE IF NOT EXISTS patent_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patent_id TEXT NOT NULL REFERENCES patents(id) ON DELETE CASCADE,
    page_number INTEGER,
    path TEXT,
    width INTEGER,
    height INTEGER,
    md5 TEXT,
    phash TEXT,
    ocr_text TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_patents_category ON patents(category);
CREATE INDEX IF NOT EXISTS idx_patents_status ON patents(status);
CREATE INDEX IF NOT EXISTS idx_patents_registration_date ON patents(registration_date);
CREATE INDEX IF NOT EXISTS idx_patents_technology_field ON patents(technology_field);
CREATE INDEX IF NOT EXISTS idx_patent_inventors_patent_id ON patent_inventors(patent_id);
CREATE INDEX IF NOT EXISTS idx_patent_keywords_patent_id ON patent_keywords(patent_id);

-- Full-text search virtual table
CREATE VIRTUAL TABLE IF NOT EXISTS patent_search USING fts5(
    patent_id UNINDEXED,
    title,
    abstract,
    technology_field,
    full_text,
    content=patents,
    content_rowid=rowid
);

-- Trigger to keep FTS index in sync with patents table
CREATE TRIGGER IF NOT EXISTS patents_ai AFTER INSERT ON patents BEGIN
  INSERT INTO patent_search(rowid, patent_id, title, abstract, technology_field, full_text)
  VALUES (new.rowid, new.id, new.title, new.abstract, new.technology_field, new.full_text);
END;

CREATE TRIGGER IF NOT EXISTS patents_ad AFTER DELETE ON patents BEGIN
  DELETE FROM patent_search WHERE rowid = old.rowid;
END;

CREATE TRIGGER IF NOT EXISTS patents_au AFTER UPDATE ON patents BEGIN
  UPDATE patent_search SET 
    title = new.title,
    abstract = new.abstract,
    technology_field = new.technology_field,
    full_text = new.full_text
  WHERE rowid = new.rowid;
END;
