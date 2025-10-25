#!/usr/bin/env python3
import json
import subprocess
from pathlib import Path

def import_patents_to_d1():
    clean_data = Path('db/patents_data_clean.json')
    
    print(f"📂 로딩: {clean_data}")
    with open(clean_data, 'r', encoding='utf-8') as f:
        patents = json.load(f)
    
    print(f"📊 특허 수: {len(patents)}개\n")
    
    # D1 현재 상태 확인
    print("🔍 D1 현재 상태 확인...")
    result = subprocess.run(
        ['npx', 'wrangler', 'd1', 'execute', 'gst_patents_db', 
         '--remote', '--command', 'SELECT COUNT(*) as count FROM patents;'],
        capture_output=True, text=True
    )
    print(result.stdout)
    
    # 각 특허 임포트
    success = 0
    failed = []
    
    for i, patent in enumerate(patents, 1):
        try:
            # PDF 파일 구조 (doc_id, title, pages)
            patent_id = patent.get('doc_id', '')
            title = patent.get('title', '')
            
            if not patent_id:
                failed.append(f"특허 #{i}: ID 없음")
                continue
            
            # SQL 이스케이프
            title_escaped = title.replace("'", "''")
            patent_id_escaped = patent_id.replace("'", "''")
            
            sql = f"""
            INSERT OR REPLACE INTO patents (id, title, created_at)
            VALUES ('{patent_id_escaped}', '{title_escaped}', datetime('now'));
            """
            
            result = subprocess.run(
                ['npx', 'wrangler', 'd1', 'execute', 'gst_patents_db',
                 '--remote', '--command', sql],
                capture_output=True, text=True
            )
            
            if result.returncode == 0:
                success += 1
                print(f"  ✓ [{i}/{len(patents)}] {patent_id[:50]}...")
            else:
                failed.append(f"특허 #{i} ({patent_id}): {result.stderr}")
        
        except Exception as e:
            failed.append(f"특허 #{i}: {e}")
    
    print(f"\n📊 결과:")
    print(f"  ✅ 성공: {success}개")
    print(f"  ❌ 실패: {len(failed)}개")
    
    if failed:
        print(f"\n실패 목록:")
        for fail in failed[:10]:
            print(f"  - {fail}")
    
    # 최종 확인
    print(f"\n🔍 D1 최종 상태 확인...")
    result = subprocess.run(
        ['npx', 'wrangler', 'd1', 'execute', 'gst_patents_db',
         '--remote', '--command', 'SELECT COUNT(*) as count FROM patents;'],
        capture_output=True, text=True
    )
    print(result.stdout)

if __name__ == '__main__':
    import_patents_to_d1()
