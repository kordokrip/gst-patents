#!/usr/bin/env python3
"""
로컬 SQLite 데이터를 Cloudflare D1으로 동기화하는 스크립트
"""
import sqlite3
import json
import subprocess
import sys

def export_from_sqlite(db_path):
    """SQLite에서 데이터 추출"""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM patents ORDER BY patent_number")
    rows = cursor.fetchall()
    
    patents = []
    for row in rows:
        patent = dict(row)
        patents.append(patent)
    
    conn.close()
    return patents

def import_to_d1_batch(patents, batch_size=50):
    """D1에 배치로 임포트"""
    total = len(patents)
    success_count = 0
    
    print(f"📊 총 {total}개 특허를 D1에 임포트합니다...")
    
    for i in range(0, total, batch_size):
        batch = patents[i:i+batch_size]
        batch_num = (i // batch_size) + 1
        total_batches = (total + batch_size - 1) // batch_size
        
        # SQL INSERT 문 생성
        values_list = []
        for p in batch:
            # NULL 값 처리
            def quote(v):
                if v is None:
                    return 'NULL'
                elif isinstance(v, (int, float)):
                    return str(v)
                else:
                    # SQL 문자열 이스케이프
                    escaped = str(v).replace("'", "''")
                    return f"'{escaped}'"
            
            values = f"""(
                {quote(p['id'])},
                {quote(p['patent_number'])},
                {quote(p['title'])},
                {quote(p['abstract'])},
                {quote(p['category'])},
                {quote(p['technology_field'])},
                {quote(p['registration_date'])},
                {quote(p['application_date'])},
                {quote(p['publication_date'])},
                {quote(p['status'])},
                {quote(p['assignee'])},
                {quote(p['priority_score'])},
                {quote(p['main_claims'])},
                {quote(p['full_text'])},
                {quote(p['page_count'])},
                {quote(p['source_path'])},
                {quote(p['extraction_date'])},
                {quote(p['ipc_classification'])},
                {quote(p['legal_status'])},
                {quote(p['image_count'])},
                {quote(p.get('vector_embedding_ready', 0))}
            )"""
            values_list.append(values)
        
        sql = f"""
        INSERT INTO patents (
            id, patent_number, title, abstract, category, technology_field,
            registration_date, application_date, publication_date, status,
            assignee, priority_score, main_claims, full_text, page_count,
            source_path, extraction_date, ipc_classification, legal_status,
            image_count, vector_embedding_ready
        ) VALUES {','.join(values_list)};
        """
        
        # wrangler 명령 실행
        print(f"🔄 배치 {batch_num}/{total_batches} 임포트 중... ({len(batch)}개)")
        
        try:
            result = subprocess.run(
                ['wrangler', 'd1', 'execute', 'gst_patents_db', '--remote', '--command', sql],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                success_count += len(batch)
                print(f"✅ 배치 {batch_num} 성공 (누적: {success_count}/{total})")
            else:
                print(f"❌ 배치 {batch_num} 실패:")
                print(result.stderr)
                # 개별 INSERT로 재시도
                print("⚠️ 개별 INSERT로 재시도...")
                for p in batch:
                    try:
                        single_sql = f"""
                        INSERT INTO patents (
                            id, patent_number, title, abstract, category, technology_field,
                            registration_date, application_date, publication_date, status,
                            assignee, priority_score, main_claims, full_text, page_count,
                            source_path, extraction_date, ipc_classification, legal_status,
                            image_count, vector_embedding_ready
                        ) VALUES ({','.join([quote(p[k]) for k in ['id', 'patent_number', 'title', 'abstract', 'category', 'technology_field', 'registration_date', 'application_date', 'publication_date', 'status', 'assignee', 'priority_score', 'main_claims', 'full_text', 'page_count', 'source_path', 'extraction_date', 'ipc_classification', 'legal_status', 'image_count']] + [str(p.get('vector_embedding_ready', 0))]])});
                        """
                        subprocess.run(['wrangler', 'd1', 'execute', 'gst_patents_db', '--remote', '--command', single_sql], timeout=10)
                        success_count += 1
                    except Exception as e:
                        print(f"  ⚠️ 특허 {p['patent_number']} 스킵: {e}")
        
        except subprocess.TimeoutExpired:
            print(f"⏱️ 배치 {batch_num} 타임아웃")
        except Exception as e:
            print(f"❌ 배치 {batch_num} 오류: {e}")
    
    print(f"\n✅ 임포트 완료: {success_count}/{total}개 성공")
    return success_count

if __name__ == '__main__':
    db_path = 'db/patents.db'
    
    print("📚 로컬 SQLite에서 데이터 추출 중...")
    patents = export_from_sqlite(db_path)
    print(f"✅ {len(patents)}개 특허 추출 완료\n")
    
    success = import_to_d1_batch(patents, batch_size=10)
    
    if success == len(patents):
        print("\n🎉 모든 데이터가 성공적으로 동기화되었습니다!")
        sys.exit(0)
    else:
        print(f"\n⚠️ 일부 데이터만 동기화되었습니다 ({success}/{len(patents)})")
        sys.exit(1)
