-- 엑셀 데이터 통합 마이그레이션
-- 생성일: 2025-01-XX
-- 설명: GST 지식재산권 관리현황_20250924.xlsx 데이터 반영

-- 1. patents 테이블에 새 컬럼 추가
ALTER TABLE patents ADD COLUMN right_type TEXT; -- 권리 구분 (특허/실용신안)
ALTER TABLE patents ADD COLUMN country TEXT DEFAULT '국내'; -- 출원국
ALTER TABLE patents ADD COLUMN interim_status TEXT; -- 중간사항/최종결과
ALTER TABLE patents ADD COLUMN has_original_certificate INTEGER DEFAULT 0; -- 특허등록증 원본 보유
ALTER TABLE patents ADD COLUMN maintenance_status TEXT; -- 존속여부
ALTER TABLE patents ADD COLUMN maintenance_reason TEXT; -- 존속여부판단근거
ALTER TABLE patents ADD COLUMN evaluation_date TEXT; -- 기술 평가일
ALTER TABLE patents ADD COLUMN right_duration_end TEXT; -- 권리존속기간
ALTER TABLE patents ADD COLUMN company_name TEXT; -- 업체명
ALTER TABLE patents ADD COLUMN product_category TEXT; -- 적용 제품군
ALTER TABLE patents ADD COLUMN remarks TEXT; -- 비고
ALTER TABLE patents ADD COLUMN application_number TEXT; -- 출원번호 (기존에 없었다면)

-- 2. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_patents_right_type ON patents(right_type);
CREATE INDEX IF NOT EXISTS idx_patents_status ON patents(status);
CREATE INDEX IF NOT EXISTS idx_patents_maintenance_status ON patents(maintenance_status);
CREATE INDEX IF NOT EXISTS idx_patents_category ON patents(category);

-- 3. 통계용 뷰 생성
CREATE VIEW IF NOT EXISTS v_patent_statistics AS
SELECT 
    COUNT(*) as total_patents,
    SUM(CASE WHEN status = '등록' THEN 1 ELSE 0 END) as registered,
    SUM(CASE WHEN status = '출원' THEN 1 ELSE 0 END) as applied,
    SUM(CASE WHEN status = '포기' THEN 1 ELSE 0 END) as abandoned,
    SUM(CASE WHEN status = '거절' THEN 1 ELSE 0 END) as rejected,
    SUM(CASE WHEN status = '취소' THEN 1 ELSE 0 END) as cancelled,
    SUM(CASE WHEN right_type = '특허' THEN 1 ELSE 0 END) as patents,
    SUM(CASE WHEN right_type = '실용신안' THEN 1 ELSE 0 END) as utility_models,
    SUM(CASE WHEN category = 'scrubber' THEN 1 ELSE 0 END) as scrubber_tech,
    SUM(CASE WHEN category = 'chiller' THEN 1 ELSE 0 END) as chiller_tech,
    SUM(CASE WHEN source_path != '' THEN 1 ELSE 0 END) as with_pdf
FROM patents;

-- 4. 카테고리별 통계 뷰
CREATE VIEW IF NOT EXISTS v_category_stats AS
SELECT 
    category,
    COUNT(*) as count,
    SUM(CASE WHEN status = '등록' THEN 1 ELSE 0 END) as registered,
    SUM(CASE WHEN source_path != '' THEN 1 ELSE 0 END) as with_pdf
FROM patents
GROUP BY category
ORDER BY count DESC;

-- 5. 연도별 통계 뷰
CREATE VIEW IF NOT EXISTS v_yearly_stats AS
SELECT 
    strftime('%Y', application_date) as year,
    COUNT(*) as application_count,
    SUM(CASE WHEN status = '등록' THEN 1 ELSE 0 END) as registered_count
FROM patents
WHERE application_date IS NOT NULL
GROUP BY year
ORDER BY year DESC;
