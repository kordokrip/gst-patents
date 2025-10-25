"""
간단한 D1 데이터 업로드 스크립트
================================
patents_data.json을 기반으로 SQL INSERT 문을 생성하여 D1에 업로드합니다.

실행 방법:
    python scripts/simple_d1_upload.py
"""

import json
import subprocess
from pathlib import Path
import time

BASE_DIR = Path(__file__).parent.parent
JSON_PATH = BASE_DIR / 'db' / 'patents_data.json'
D1_DATABASE = 'gst_patents_db'


def load_patents_data():
    """JSON 파일에서 특허 데이터 로드"""
    print("📊 JSON 데이터 로딩 중...")
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
    print(f"✅ {len(data)}개 특허 데이터 로드 완료")
    return data


def escape_sql_string(s):
    """SQL 문자열 이스케이프"""
    if s is None:
        return 'NULL'
    return "'" + str(s).replace("'", "''").replace('\n', ' ').replace('\r', '') + "'"


def generate_patent_insert(patent):
    """특허 데이터를 INSERT 문으로 변환"""
    return f"""INSERT OR REPLACE INTO patents (
        id, patent_number, title, abstract, category, technology_field,
        registration_date, application_date, status, assignee,
        priority_score, page_count, source_path, extraction_date
    ) VALUES (
        {escape_sql_string(patent['id'])},
        {escape_sql_string(patent['patent_number'])},
        {escape_sql_string(patent['title'])},
        {escape_sql_string(patent['abstract'])},
        {escape_sql_string(patent['category'])},
        {escape_sql_string(patent['technology_field'])},
        {escape_sql_string(patent['registration_date'])},
        {escape_sql_string(patent['application_date'])},
        {escape_sql_string(patent['status'])},
        {escape_sql_string(patent['assignee'])},
        {patent['priority_score']},
        {patent['page_count']},
        {escape_sql_string(patent['source_path'])},
        {escape_sql_string(patent.get('extraction_date', '2025-10-25'))}
    );"""


def generate_batch_sql(patents_batch):
    """배치 단위 SQL 생성"""
    sql_lines = []
    
    for patent in patents_batch:
        # 특허 기본 정보
        sql_lines.append(generate_patent_insert(patent))
        
        # 발명자 정보
        for inventor in patent.get('inventors', []):
            if inventor:
                sql_lines.append(
                    f"INSERT OR IGNORE INTO patent_inventors (patent_id, name) "
                    f"VALUES ({escape_sql_string(patent['id'])}, {escape_sql_string(inventor)});"
                )
        
        # 키워드 정보
        for keyword in patent.get('technical_keywords', []):
            if keyword:
                sql_lines.append(
                    f"INSERT OR IGNORE INTO patent_keywords (patent_id, keyword) "
                    f"VALUES ({escape_sql_string(patent['id'])}, {escape_sql_string(keyword)});"
                )
        
        # FTS5 검색 테이블
        sql_lines.append(
            f"INSERT OR REPLACE INTO patent_search (patent_id, title, abstract, technology_field, full_text) "
            f"VALUES ({escape_sql_string(patent['id'])}, {escape_sql_string(patent['title'])}, "
            f"{escape_sql_string(patent['abstract'])}, {escape_sql_string(patent['technology_field'])}, "
            f"{escape_sql_string((patent.get('title', '') + ' ' + patent.get('abstract', ''))[:1000])});"
        )
    
    return '\n'.join(sql_lines)


def upload_to_d1(batch_size=20):
    """D1에 데이터 업로드"""
    patents = load_patents_data()
    total = len(patents)
    
    print(f"\n📤 D1으로 업로드 시작 (총 {total}개, 배치 크기: {batch_size})")
    
    for i in range(0, total, batch_size):
        batch = patents[i:i+batch_size]
        batch_num = i // batch_size + 1
        total_batches = (total + batch_size - 1) // batch_size
        
        print(f"\n배치 {batch_num}/{total_batches} ({len(batch)}개 특허)")
        
        # SQL 생성
        sql_content = generate_batch_sql(batch)
        
        # 임시 파일 저장
        temp_file = BASE_DIR / 'migrations' / f'temp_batch_{i}.sql'
        with open(temp_file, 'w', encoding='utf-8') as f:
            f.write(sql_content)
        
        # D1에 업로드
        try:
            result = subprocess.run([
                'wrangler', 'd1', 'execute', D1_DATABASE,
                '--file', str(temp_file),
                '--remote'
            ], capture_output=True, text=True, check=True, timeout=120)
            
            print(f"  ✅ 업로드 성공")
            
            # 임시 파일 삭제
            temp_file.unlink()
            
            # API 제한 회피를 위한 짧은 대기
            if batch_num < total_batches:
                time.sleep(1)
                
        except subprocess.CalledProcessError as e:
            print(f"  ❌ 오류 발생:")
            print(f"     {e.stderr}")
            print(f"  임시 파일 보존: {temp_file}")
            
            # 오류 발생 시 계속 진행할지 물어보기
            response = input("\n계속 진행하시겠습니까? (y/n): ")
            if response.lower() != 'y':
                break
        except subprocess.TimeoutExpired:
            print(f"  ⏱️ 타임아웃 - 배치 크기를 줄여보세요")
            temp_file.unlink()
            break


def verify_d1_data():
    """D1 데이터 확인"""
    print("\n🔍 D1 데이터 확인 중...")
    
    queries = [
        ("특허 총 개수", "SELECT COUNT(*) as count FROM patents"),
        ("카테고리별 통계", "SELECT category, COUNT(*) as count FROM patents GROUP BY category ORDER BY count DESC LIMIT 5"),
        ("상태별 통계", "SELECT status, COUNT(*) as count FROM patents GROUP BY status ORDER BY count DESC"),
    ]
    
    for title, query in queries:
        print(f"\n{title}:")
        try:
            result = subprocess.run([
                'wrangler', 'd1', 'execute', D1_DATABASE,
                '--command', query,
                '--remote'
            ], capture_output=True, text=True, check=True)
            
            print(result.stdout)
        except subprocess.CalledProcessError as e:
            print(f"  ❌ 오류: {e.stderr}")


def main():
    print("=" * 60)
    print("D1 데이터베이스 업로드 (간소화 버전)")
    print("=" * 60)
    
    # 1. 데이터 업로드
    upload_to_d1(batch_size=15)
    
    # 2. 확인
    verify_d1_data()
    
    print("\n" + "=" * 60)
    print("✅ 완료!")
    print("=" * 60)


if __name__ == '__main__':
    main()
