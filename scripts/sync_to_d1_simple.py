#!/usr/bin/env python3
import sqlite3
import subprocess
import sys

def sync_to_d1():
    conn = sqlite3.connect('db/patents.db')
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM patents")
    total = cursor.fetchone()[0]
    
    print(f"📊 {total}개 특허를 D1에 동기화합니다...\n")
    
    # 전체 데이터 덤프
    cursor.execute("""
        SELECT id, patent_number, title, abstract, category, 
               technology_field, registration_date, application_date, 
               publication_date, status, assignee, priority_score, 
               main_claims, full_text, page_count, source_path, 
               extraction_date, ipc_classification, legal_status, 
               image_count, vector_embedding_ready
        FROM patents
        ORDER BY patent_number
    """)
    
    rows = cursor.fetchall()
    success = 0
    
    for idx, row in enumerate(rows, 1):
        # NULL 처리 및 SQL 이스케이프
        values = []
        for val in row:
            if val is None:
                values.append('NULL')
            elif isinstance(val, (int, float)):
                values.append(str(val))
            else:
                escaped = str(val).replace("'", "''").replace('\n', ' ')
                values.append(f"'{escaped}'")
        
        sql = f"""INSERT INTO patents VALUES ({', '.join(values)});"""
        
        try:
            result = subprocess.run(
                ['wrangler', 'd1', 'execute', 'gst_patents_db', '--remote', '--command', sql],
                capture_output=True,
                text=True,
                timeout=15
            )
            
            if result.returncode == 0:
                success += 1
                if idx % 10 == 0:
                    print(f"✅ {idx}/{total} 완료 ({success}개 성공)")
            else:
                print(f"❌ [{idx}] {row[1]}: {result.stderr[:100]}")
        
        except Exception as e:
            print(f"⚠️ [{idx}] {row[1]}: {e}")
    
    conn.close()
    print(f"\n🎉 완료: {success}/{total}개 동기화")

if __name__ == '__main__':
    sync_to_d1()
