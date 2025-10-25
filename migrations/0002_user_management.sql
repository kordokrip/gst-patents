-- 사용자 관리 테이블 생성
-- 2025-01-25: AI 질의 서비스 사용자 인증 및 관리자 승인 시스템

-- 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    company TEXT,
    role TEXT NOT NULL DEFAULT 'user', -- 'admin' 또는 'user'
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'inactive', 'suspended'
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_login_at TEXT
);

-- 가입 신청 대기 테이블
CREATE TABLE IF NOT EXISTS pending_registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    company TEXT,
    reason TEXT, -- 가입 사유
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    processed_at TEXT,
    processed_by TEXT, -- 처리한 관리자 이메일
    reject_reason TEXT -- 거부 사유
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_pending_email ON pending_registrations(email);
CREATE INDEX IF NOT EXISTS idx_pending_status ON pending_registrations(status);

-- 초기 관리자 계정 생성 (비밀번호: GST2025!@Admin)
-- bcrypt 해시는 서버에서 생성하므로, 임시로 평문 표시 (실제론 해시 사용)
INSERT INTO users (email, password_hash, name, company, role, status) 
VALUES (
    'shkang@gst-in.com',
    '$2a$10$dummyhashforinitialization', -- 실제 배포 시 bcrypt 해시로 교체
    '강성호',
    'GST (Global Standard Technology)',
    'admin',
    'active'
);

-- 테스트 사용자 계정 (개발용)
INSERT INTO users (email, password_hash, name, company, role, status) 
VALUES (
    'demo@gst-in.com',
    '$2a$10$dummyhashforinitialization', -- 비밀번호: Demo1234!@
    '데모 사용자',
    'GST',
    'user',
    'active'
);
