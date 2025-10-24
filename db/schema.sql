PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS patent_keywords;
DROP TABLE IF EXISTS patent_inventors;
DROP TABLE IF EXISTS patent_pages;
DROP TABLE IF EXISTS patent_images;
DROP TABLE IF EXISTS patents;
DROP TABLE IF EXISTS patent_search;

CREATE TABLE patents (
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
    vector_embedding_ready INTEGER DEFAULT 0
);

CREATE TABLE patent_inventors (
    patent_id TEXT REFERENCES patents(id) ON DELETE CASCADE,
    name TEXT
);

CREATE TABLE patent_keywords (
    patent_id TEXT REFERENCES patents(id) ON DELETE CASCADE,
    keyword TEXT
);

CREATE TABLE patent_pages (
    patent_id TEXT REFERENCES patents(id) ON DELETE CASCADE,
    page_number INTEGER,
    text TEXT
);

CREATE TABLE patent_images (
    patent_id TEXT REFERENCES patents(id) ON DELETE CASCADE,
    page_number INTEGER,
    path TEXT,
    width INTEGER,
    height INTEGER,
    md5 TEXT,
    phash TEXT,
    ocr_text TEXT
);

CREATE INDEX idx_patents_category ON patents(category);
CREATE INDEX idx_patents_status ON patents(status);
CREATE INDEX idx_patents_registration_date ON patents(registration_date);

CREATE VIRTUAL TABLE patent_search USING fts5(
    patent_id UNINDEXED,
    title,
    abstract,
    technology_field,
    full_text
);
