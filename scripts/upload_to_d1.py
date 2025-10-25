"""
D1 데이터베이스 업로드 스크립트
===============================
로컬 SQLite 데이터베이스를 Cloudflare D1으로 업로드합니다.

실행 방법:
    python scripts/upload_to_d1.py
"""

import sqlite3
import json
import subprocess
from pathlib import Path
from typing import List, Dict

# 경로 설정
BASE_DIR = Path(__file__).parent.parent
DB_PATH = BASE_DIR / 'db' / 'patents.db'
MIGRATION_DIR = BASE_DIR / 'migrations'
D1_DATABASE = 'gst_patents_db'

def check_wrangler():
    """Wrangler CLI 설치 확인"""
    try:
        result = subprocess.run(['wrangler', '--version'], 
                              capture_output=True, text=True, check=True)
        print(f"✅ Wrangler 설치 확인: {result.stdout.strip()}")
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ Wrangler가 설치되어 있지 않습니다.")
        print("   설치 명령어: npm install -g wrangler")
        return False


def apply_migration(migration_file: Path):
    """D1에 마이그레이션 파일 적용"""
    print(f"\n📝 마이그레이션 적용: {migration_file.name}")
    
    try:
        # D1에 SQL 파일 실행
        result = subprocess.run([
            'wrangler', 'd1', 'execute', D1_DATABASE,
            '--file', str(migration_file),
            '--remote'
        ], capture_output=True, text=True, check=True)
        
        print(f"✅ 성공: {migration_file.name}")
        if result.stdout:
            print(f"   {result.stdout.strip()}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ 오류: {e}")
        if e.stderr:
            print(f"   {e.stderr}")
        return False


def generate_insert_sql(limit: int = None) -> str:
    """SQLite 데이터를 INSERT 문으로 변환"""
    print("\n💾 INSERT 문 생성 중...")
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    sql_statements = []
    
    # 1. patents 테이블 데이터
    query = "SELECT * FROM patents"
    if limit:
        query += f" LIMIT {limit}"
    
    patents = cursor.execute(query).fetchall()
    print(f"  📊 특허 데이터: {len(patents)}개")
    
    for patent in patents:
        values = []
        for col in patent.keys():
            val = patent[col]
            if val is None:
                values.append('NULL')
            elif isinstance(val, (int, float)):
                values.append(str(val))
            else:
                # SQL 문자열 이스케이프
                val_str = str(val).replace("'", "''")
                values.append(f"'{val_str}'")
        
        columns = ', '.join(patent.keys())
        values_str = ', '.join(values)
        sql_statements.append(
            f"INSERT OR IGNORE INTO patents ({columns}) VALUES ({values_str});"
        )
    
    # 2. patent_inventors 테이블
    inventors = cursor.execute("SELECT * FROM patent_inventors").fetchall()
    print(f"  👤 발명자 데이터: {len(inventors)}개")
    
    for inv in inventors:
        name_escaped = inv['name'].replace("'", "''")
        sql_statements.append(
            f"INSERT OR IGNORE INTO patent_inventors (patent_id, name) "
            f"VALUES ('{inv['patent_id']}', '{name_escaped}');"
        )
    
    # 3. patent_keywords 테이블
    keywords = cursor.execute("SELECT * FROM patent_keywords").fetchall()
    print(f"  🔑 키워드 데이터: {len(keywords)}개")
    
    for kw in keywords:
        keyword_escaped = kw['keyword'].replace("'", "''")
        sql_statements.append(
            f"INSERT OR IGNORE INTO patent_keywords (patent_id, keyword) "
            f"VALUES ('{kw['patent_id']}', '{keyword_escaped}');"
        )
    
    # 4. patent_search FTS5 테이블
    searches = cursor.execute("SELECT patent_id, title, abstract, technology_field, full_text FROM patent_search").fetchall()
    print(f"  🔍 검색 인덱스: {len(searches)}개")
    
    for search in searches:
        title = search['title'].replace("'", "''") if search['title'] else ''
        abstract = search['abstract'].replace("'", "''") if search['abstract'] else ''
        tech_field = search['technology_field'].replace("'", "''") if search['technology_field'] else ''
        full_text = (search['full_text'][:1000].replace("'", "''") if search['full_text'] else '')
        
        sql_statements.append(
            f"INSERT OR IGNORE INTO patent_search (patent_id, title, abstract, technology_field, full_text) "
            f"VALUES ('{search['patent_id']}', '{title}', '{abstract}', '{tech_field}', '{full_text}');"
        )
    
    conn.close()
    
    return '\n'.join(sql_statements)


def upload_in_batches(batch_size: int = 50):
    """배치 단위로 데이터 업로드"""
    print(f"\n📤 D1으로 데이터 업로드 중 (배치 크기: {batch_size})...")
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 총 특허 수 확인
    total_patents = cursor.execute("SELECT COUNT(*) FROM patents").fetchone()[0]
    print(f"  총 {total_patents}개 특허")
    
    # 배치 처리
    for offset in range(0, total_patents, batch_size):
        print(f"\n  배치 {offset//batch_size + 1}/{(total_patents + batch_size - 1)//batch_size}")
        
        # 임시 SQL 파일 생성
        temp_sql_file = BASE_DIR / 'migrations' / f'temp_batch_{offset}.sql'
        
        # 이 배치의 특허 ID들 가져오기
        patent_ids = cursor.execute(
            f"SELECT id FROM patents LIMIT {batch_size} OFFSET {offset}"
        ).fetchall()
        
        patent_ids_list = [p[0] for p in patent_ids]
        ids_str = ','.join([f"'{pid}'" for pid in patent_ids_list])
        
        # SQL 생성
        sql_lines = []
        
        # 특허 데이터
        patents = cursor.execute(
            f"SELECT * FROM patents WHERE id IN ({ids_str})"
        ).fetchall()
        
        for patent in patents:
            cols = [desc[0] for desc in cursor.description]
            values = []
            for val in patent:
                if val is None:
                    values.append('NULL')
                elif isinstance(val, (int, float)):
                    values.append(str(val))
                else:
                    val_str = str(val).replace("'", "''")
                    values.append(f"'{val_str}'")
            
            sql_lines.append(
                f"INSERT OR REPLACE INTO patents ({', '.join(cols)}) "
                f"VALUES ({', '.join(values)});"
            )
        
        # 발명자 데이터
        inventors = cursor.execute(
            f"SELECT * FROM patent_inventors WHERE patent_id IN ({ids_str})"
        ).fetchall()
        
        for inv in inventors:
            name = str(inv[1]).replace("'", "''")
            sql_lines.append(
                f"INSERT OR IGNORE INTO patent_inventors (patent_id, name) "
                f"VALUES ('{inv[0]}', '{name}');"
            )
        
        # 키워드 데이터
        keywords = cursor.execute(
            f"SELECT * FROM patent_keywords WHERE patent_id IN ({ids_str})"
        ).fetchall()
        
        for kw in keywords:
            keyword = str(kw[1]).replace("'", "''")
            sql_lines.append(
                f"INSERT OR IGNORE INTO patent_keywords (patent_id, keyword) "
                f"VALUES ('{kw[0]}', '{keyword}');"
            )
        
        # FTS5 검색 데이터
        searches = cursor.execute(
            f"SELECT * FROM patent_search WHERE patent_id IN ({ids_str})"
        ).fetchall()
        
        for search in searches:
            patent_id = search[0]
            title = (str(search[1]).replace("'", "''") if search[1] else '')
            abstract = (str(search[2]).replace("'", "''") if search[2] else '')
            tech_field = (str(search[3]).replace("'", "''") if search[3] else '')
            full_text = (str(search[4])[:1000].replace("'", "''") if search[4] else '')
            
            sql_lines.append(
                f"INSERT OR REPLACE INTO patent_search (patent_id, title, abstract, technology_field, full_text) "
                f"VALUES ('{patent_id}', '{title}', '{abstract}', '{tech_field}', '{full_text}');"
            )
        
        # 파일 저장
        with open(temp_sql_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(sql_lines))
        
        # D1에 업로드
        try:
            result = subprocess.run([
                'wrangler', 'd1', 'execute', D1_DATABASE,
                '--file', str(temp_sql_file),
                '--remote'
            ], capture_output=True, text=True, check=True, timeout=60)
            
            print(f"    ✅ 업로드 완료: {len(patent_ids_list)}개 특허")
            
            # 임시 파일 삭제
            temp_sql_file.unlink()
            
        except subprocess.CalledProcessError as e:
            print(f"    ❌ 오류: {e}")
            if e.stderr:
                print(f"    {e.stderr}")
            # 오류 발생 시 임시 파일 보존
            print(f"    임시 파일 보존: {temp_sql_file}")
            break
        except subprocess.TimeoutExpired:
            print(f"    ⏱️ 타임아웃 - 배치 크기를 줄이세요")
            break
    
    conn.close()


def verify_upload():
    """D1 업로드 확인"""
    print("\n🔍 D1 데이터 확인 중...")
    
    try:
        # D1에서 카운트 확인
        result = subprocess.run([
            'wrangler', 'd1', 'execute', D1_DATABASE,
            '--command', 'SELECT COUNT(*) as count FROM patents',
            '--remote', '--json'
        ], capture_output=True, text=True, check=True)
        
        # JSON 파싱
        output = result.stdout.strip()
        # wrangler의 출력 형식에 맞게 파싱
        if output:
            print(f"✅ D1 업로드 확인:")
            print(f"   {output}")
    except Exception as e:
        print(f"❌ 확인 중 오류: {e}")


def main():
    """메인 실행 함수"""
    print("=" * 60)
    print("D1 데이터베이스 업로드")
    print("=" * 60)
    
    # 1. Wrangler 확인
    if not check_wrangler():
        return
    
    # 2. 마이그레이션 적용
    migration_file = MIGRATION_DIR / '0004_import_excel_data.sql'
    if migration_file.exists():
        apply_migration(migration_file)
    
    # 3. 데이터 업로드
    upload_in_batches(batch_size=30)
    
    # 4. 확인
    verify_upload()
    
    print("\n" + "=" * 60)
    print("✅ D1 업로드 완료!")
    print("=" * 60)
    print("\n다음 단계:")
    print("  1. Cloudflare Pages 재배포")
    print("  2. 웹사이트에서 데이터 확인")
    print("  3. 검색 기능 테스트")


if __name__ == '__main__':
    main()
