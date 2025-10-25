#!/usr/bin/env python3
import json
from pathlib import Path

def rebuild_clean_patents():
    patents_dir = Path('data/patents')
    output_file = Path('db/patents_data_clean.json')
    
    print(f"📂 특허 디렉토리: {patents_dir}")
    
    patents = []
    seen_ids = set()
    skipped = []
    
    # JSON 파일 목록
    json_files = sorted(patents_dir.glob('*.json'))
    print(f"📋 총 {len(json_files)}개 파일 발견\n")
    
    for json_file in json_files:
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                # JSON 파싱
                data = json.load(f)
            
            # 배열이면 첫 번째 요소 사용
            if isinstance(data, list):
                patent = data[0]
            else:
                patent = data
            
            # ID 추출 (여러 필드 시도)
            patent_id = (
                patent.get('id') or 
                patent.get('patent_number') or 
                patent.get('특허번호') or
                patent.get('doc_id')  # PDF 추출 파일
            )
            
            # ID 없으면 파일명에서 추출
            if not patent_id:
                # 예: "CO_Nox_..._일본_-0cc4ce29.json" → "0cc4ce29"
                name_parts = json_file.stem.split('-')
                if len(name_parts) > 1:
                    patent_id = name_parts[-1]
                else:
                    skipped.append(f"{json_file.name} (ID 추출 실패)")
                    continue
            
            # 중복 체크
            if patent_id in seen_ids:
                skipped.append(f"{json_file.name} (중복 ID: {patent_id})")
                continue
            
            seen_ids.add(patent_id)
            patents.append(patent)
            print(f"  ✓ {json_file.name}: {patent_id}")
            
        except Exception as e:
            skipped.append(f"{json_file.name} (오류: {e})")
    
    print(f"\n📊 결과:")
    print(f"  ✅ 성공: {len(patents)}개")
    print(f"  ⚠️  건너뜀: {len(skipped)}개")
    
    if skipped:
        print(f"\n건너뛴 파일:")
        for s in skipped[:10]:
            print(f"  - {s}")
    
    # 저장
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(patents, f, ensure_ascii=False, indent=2)
    
    print(f"\n💾 저장: {output_file}")
    print(f"✅ 최종 특허 수: {len(patents)}개")
    
    return patents

if __name__ == '__main__':
    rebuild_clean_patents()
