"""
GST 특허 데이터베이스 업데이트 스크립트
======================================
엑셀 파일과 PDF 파일을 분석하여 SQLite 데이터베이스를 업데이트합니다.

실행 방법:
    python scripts/update_patent_database.py
"""

import pandas as pd
import sqlite3
import json
import os
from pathlib import Path
from datetime import datetime
import PyPDF2
import re
from typing import Dict, List, Optional

# 경로 설정
BASE_DIR = Path(__file__).parent.parent
EXCEL_PATH = BASE_DIR / 'db' / 'GST 지식재산권 관리현황_20250924.xlsx'
PDF_DIR = BASE_DIR / 'db' / 'pdf'
DB_PATH = BASE_DIR / 'db' / 'patents.db'
SCHEMA_PATH = BASE_DIR / 'db' / 'schema.sql'


def create_database():
    """데이터베이스 초기화 및 스키마 적용"""
    print("📁 데이터베이스 초기화 중...")
    
    # 기존 DB 백업
    if DB_PATH.exists():
        backup_path = DB_PATH.with_suffix('.db.backup')
        import shutil
        shutil.copy2(DB_PATH, backup_path)
        print(f"✅ 기존 DB 백업: {backup_path}")
    
    # 새 DB 생성
    conn = sqlite3.connect(DB_PATH)
    
    # 스키마 적용
    with open(SCHEMA_PATH, 'r', encoding='utf-8') as f:
        schema_sql = f.read()
    
    conn.executescript(schema_sql)
    conn.commit()
    
    print("✅ 데이터베이스 초기화 완료")
    return conn


def extract_excel_data() -> pd.DataFrame:
    """엑셀 파일에서 특허 데이터 추출"""
    print("\n📊 엑셀 파일 분석 중...")
    
    # 엑셀 파일 읽기 (Row 3이 헤더)
    df = pd.read_excel(
        EXCEL_PATH,
        sheet_name='GST 지식재산권 현황_최신',
        header=3  # 0-based index이므로 Row 3
    )
    
    # 컬럼명 정리 (모든 공백 제거)
    df.columns = [re.sub(r'\s+', '', str(col)) for col in df.columns]
    
    # NO 컬럼이 있는 행만 필터링
    df_clean = df[df['NO'].notna()].copy()
    
    # 날짜 형식 통일
    for date_col in ['출원일', '등록일']:
        if date_col in df_clean.columns:
            df_clean[date_col] = pd.to_datetime(df_clean[date_col], errors='coerce')
            df_clean[date_col] = df_clean[date_col].dt.strftime('%Y-%m-%d')
    
    print(f"✅ 엑셀에서 {len(df_clean)}개 특허 데이터 추출")
    print(f"   컬럼: {', '.join(df_clean.columns[:10].tolist())}")
    
    return df_clean


def extract_pdf_metadata(pdf_path: Path) -> Dict:
    """PDF 파일에서 메타데이터 추출"""
    try:
        with open(pdf_path, 'rb') as f:
            pdf = PyPDF2.PdfReader(f)
            
            metadata = {
                'page_count': len(pdf.pages),
                'title': pdf.metadata.get('/Title', '') if pdf.metadata else '',
                'author': pdf.metadata.get('/Author', '') if pdf.metadata else '',
                'full_text': '',
            }
            
            # 첫 3페이지 텍스트 추출 (특허번호 찾기용)
            for i in range(min(3, len(pdf.pages))):
                try:
                    text = pdf.pages[i].extract_text()
                    metadata['full_text'] += text + '\n'
                except:
                    pass
            
            return metadata
    except Exception as e:
        print(f"  ⚠️ PDF 읽기 오류 ({pdf_path.name}): {e}")
        return {'page_count': 0, 'title': '', 'author': '', 'full_text': ''}


def match_pdf_to_patent(patent_number: str, pdf_files: List[Path]) -> Optional[Path]:
    """특허 번호와 PDF 파일 매칭"""
    if not patent_number or pd.isna(patent_number):
        return None
    
    # 특허번호 정규화 (하이픈 제거)
    clean_patent_num = str(patent_number).replace('-', '').strip()
    
    # PDF 파일명에서 매칭 시도
    for pdf_path in pdf_files:
        pdf_name = pdf_path.stem  # 확장자 제외
        
        # 파일명에 특허번호가 포함되어 있는지 확인
        if clean_patent_num in pdf_name.replace('-', ''):
            return pdf_path
        
        # PDF 내용에서 특허번호 검색
        metadata = extract_pdf_metadata(pdf_path)
        if clean_patent_num in metadata['full_text'].replace('-', ''):
            return pdf_path
    
    return None


def normalize_patent_id(row_index: int, patent_number: str) -> str:
    """특허 ID 생성 (고유 식별자)"""
    if patent_number and not pd.isna(patent_number):
        clean_num = str(patent_number).replace('-', '').strip()
        return f"KR{clean_num}"
    else:
        return f"GST{row_index:04d}"


def categorize_technology(title: str, tech_field: str) -> str:
    """기술 분야 자동 분류"""
    title_lower = str(title).lower() if title else ''
    tech_lower = str(tech_field).lower() if tech_field else ''
    combined = title_lower + ' ' + tech_lower
    
    # 카테고리 키워드 매칭
    categories = {
        'scrubber': ['스크러버', 'scrubber', '정화', '처리장치', '배가스'],
        'chiller': ['칠러', 'chiller', '냉각', '온도제어', '냉매'],
        'plasma': ['플라즈마', 'plasma', '버너', '연소'],
        'temperature': ['온도', 'temperature', '히터', '가열'],
        'gas-treatment': ['가스', '집진', '흡착', '필터'],
    }
    
    for category, keywords in categories.items():
        if any(kw in combined for kw in keywords):
            return category
    
    return 'other'


def insert_patent_data(conn: sqlite3.Connection, df: pd.DataFrame, pdf_files: List[Path]):
    """엑셀 데이터와 PDF를 매칭하여 DB에 삽입"""
    print("\n💾 데이터베이스 업데이트 중...")
    
    cursor = conn.cursor()
    inserted_count = 0
    pdf_matched_count = 0
    
    for idx, row in df.iterrows():
        try:
            # 기본 정보
            patent_id = normalize_patent_id(idx, row.get('등록번호'))
            patent_number = str(row.get('등록번호', '')).strip() if pd.notna(row.get('등록번호')) else ''
            application_number = str(row.get('출원번호', '')).strip() if pd.notna(row.get('출원번호')) else ''
            title = str(row.get('명칭', '')).strip() if pd.notna(row.get('명칭')) else ''
            
            # PDF 매칭
            pdf_path = match_pdf_to_patent(patent_number or application_number, pdf_files)
            pdf_metadata = {}
            
            if pdf_path:
                pdf_metadata = extract_pdf_metadata(pdf_path)
                pdf_matched_count += 1
                print(f"  ✓ PDF 매칭: {patent_number} → {pdf_path.name}")
            
            # 카테고리 분류
            tech_field = str(row.get('기술분류', '')).strip() if pd.notna(row.get('기술분류')) else ''
            product_group = str(row.get('적용 제품군', '')).strip() if pd.notna(row.get('적용 제품군')) else ''
            category = categorize_technology(title, tech_field)
            
            # 특허 기본 정보 삽입
            cursor.execute("""
                INSERT INTO patents (
                    id, patent_number, title, abstract, category, technology_field,
                    registration_date, application_date, status, assignee,
                    priority_score, page_count, source_path, extraction_date,
                    ipc_classification, legal_status, full_text
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                patent_id,
                patent_number,
                title,
                '',  # abstract (PDF에서 추출 가능)
                category,
                tech_field,
                row.get('등록일'),
                row.get('출원일'),
                str(row.get('상태', '')).strip() if pd.notna(row.get('상태')) else 'unknown',
                'GST (Global Standard Technology)',
                5,  # 기본 우선순위
                pdf_metadata.get('page_count', 0),
                pdf_path.name if pdf_path else '',
                datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                '',  # IPC 분류
                str(row.get('존속여부', '')).strip() if pd.notna(row.get('존속여부')) else '',
                pdf_metadata.get('full_text', '')[:5000]  # 처음 5000자만
            ))
            
            # 발명자 정보 삽입
            inventor = str(row.get('고안자', '')).strip() if pd.notna(row.get('고안자')) else ''
            if inventor:
                for name in inventor.split(','):
                    name = name.strip()
                    if name and name not in ['㈜글로벌스탠다드테크놀로지', 'GST']:
                        cursor.execute(
                            "INSERT INTO patent_inventors (patent_id, name) VALUES (?, ?)",
                            (patent_id, name)
                        )
            
            # 키워드 추출 및 삽입 (제목에서)
            if title:
                keywords = extract_keywords(title)
                for keyword in keywords[:10]:  # 최대 10개
                    cursor.execute(
                        "INSERT INTO patent_keywords (patent_id, keyword) VALUES (?, ?)",
                        (patent_id, keyword)
                    )
            
            # FTS5 테이블에 검색 데이터 삽입
            cursor.execute("""
                INSERT INTO patent_search (patent_id, title, abstract, technology_field, full_text)
                VALUES (?, ?, ?, ?, ?)
            """, (
                patent_id,
                title,
                '',
                tech_field,
                pdf_metadata.get('full_text', '')[:10000]
            ))
            
            inserted_count += 1
            
            if inserted_count % 10 == 0:
                print(f"  📝 {inserted_count}개 처리 완료...")
        
        except Exception as e:
            print(f"  ❌ 오류 (Row {idx}): {e}")
            continue
    
    conn.commit()
    print(f"\n✅ 총 {inserted_count}개 특허 데이터 삽입 완료")
    print(f"✅ PDF 매칭: {pdf_matched_count}개")


def extract_keywords(text: str) -> List[str]:
    """텍스트에서 키워드 추출"""
    # 한글 명사 추출 (간단한 방식)
    words = re.findall(r'[가-힣]{2,}', text)
    
    # 불용어 제거
    stopwords = {'이를', '위한', '구비한', '포함한', '갖는', '있는', '하는', '되는', '및', '또는'}
    keywords = [w for w in words if w not in stopwords]
    
    # 중복 제거 및 빈도순 정렬
    from collections import Counter
    word_counts = Counter(keywords)
    return [word for word, count in word_counts.most_common(20)]


def generate_statistics(conn: sqlite3.Connection):
    """데이터베이스 통계 생성"""
    print("\n📊 데이터베이스 통계:")
    
    cursor = conn.cursor()
    
    # 총 특허 수
    total = cursor.execute("SELECT COUNT(*) FROM patents").fetchone()[0]
    print(f"  • 총 특허 수: {total}")
    
    # 카테고리별
    categories = cursor.execute("""
        SELECT category, COUNT(*) as cnt 
        FROM patents 
        GROUP BY category 
        ORDER BY cnt DESC
    """).fetchall()
    print(f"  • 카테고리별:")
    for cat, cnt in categories:
        print(f"    - {cat}: {cnt}개")
    
    # 상태별
    statuses = cursor.execute("""
        SELECT status, COUNT(*) as cnt 
        FROM patents 
        GROUP BY status 
        ORDER BY cnt DESC
    """).fetchall()
    print(f"  • 상태별:")
    for status, cnt in statuses:
        print(f"    - {status}: {cnt}개")
    
    # PDF 매칭 수
    pdf_count = cursor.execute("""
        SELECT COUNT(*) FROM patents WHERE source_path != ''
    """).fetchone()[0]
    print(f"  • PDF 매칭: {pdf_count}개")


def export_to_json(conn: sqlite3.Connection):
    """JSON 파일로 내보내기 (웹 앱용)"""
    print("\n📤 JSON 파일 생성 중...")
    
    cursor = conn.cursor()
    
    patents = cursor.execute("""
        SELECT 
            id, patent_number, title, abstract, category, technology_field,
            registration_date, application_date, status, assignee,
            priority_score, page_count, source_path
        FROM patents
        ORDER BY registration_date DESC
    """).fetchall()
    
    patents_data = []
    for patent in patents:
        # 발명자 조회
        inventors = cursor.execute(
            "SELECT name FROM patent_inventors WHERE patent_id = ?",
            (patent[0],)
        ).fetchall()
        
        # 키워드 조회
        keywords = cursor.execute(
            "SELECT keyword FROM patent_keywords WHERE patent_id = ?",
            (patent[0],)
        ).fetchall()
        
        patents_data.append({
            'id': patent[0],
            'patent_number': patent[1],
            'title': patent[2],
            'abstract': patent[3],
            'category': patent[4],
            'technology_field': patent[5],
            'registration_date': patent[6],
            'application_date': patent[7],
            'status': patent[8],
            'assignee': patent[9],
            'priority_score': patent[10],
            'page_count': patent[11],
            'source_path': patent[12],
            'inventors': [inv[0] for inv in inventors],
            'technical_keywords': [kw[0] for kw in keywords],
        })
    
    # JSON 저장
    json_path = BASE_DIR / 'db' / 'patents_data.json'
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(patents_data, f, ensure_ascii=False, indent=2)
    
    print(f"✅ JSON 파일 생성: {json_path}")
    print(f"   {len(patents_data)}개 특허 데이터")


def main():
    """메인 실행 함수"""
    print("=" * 60)
    print("GST 특허 데이터베이스 업데이트")
    print("=" * 60)
    
    # 1. 데이터베이스 초기화
    conn = create_database()
    
    # 2. 엑셀 데이터 추출
    df = extract_excel_data()
    
    # 3. PDF 파일 목록
    pdf_files = list(PDF_DIR.glob('*.pdf'))
    print(f"\n📁 PDF 파일: {len(pdf_files)}개 발견")
    
    # 4. 데이터 삽입
    insert_patent_data(conn, df, pdf_files)
    
    # 5. 통계 생성
    generate_statistics(conn)
    
    # 6. JSON 내보내기
    export_to_json(conn)
    
    # 7. 정리
    conn.close()
    
    print("\n" + "=" * 60)
    print("✅ 데이터베이스 업데이트 완료!")
    print("=" * 60)
    print(f"\n다음 파일이 생성/업데이트되었습니다:")
    print(f"  • {DB_PATH}")
    print(f"  • {BASE_DIR / 'db' / 'patents_data.json'}")
    print(f"\n프론트엔드 연동을 위해 js 파일들을 업데이트하세요.")


if __name__ == '__main__':
    main()
