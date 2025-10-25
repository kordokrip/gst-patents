#!/usr/bin/env python3
import json
import re
from pathlib import Path
from datetime import datetime

def extract_patent_info(pdf_data):
    """PDF 추출 데이터에서 특허 정보 추출"""
    full_text = pdf_data.get('full_text', '')
    title = pdf_data.get('title', '')
    doc_id = pdf_data.get('doc_id', '')
    
    # 등록번호 추출
    patent_number = None
    patterns = [
        r'등록번호\s+(\d{2}-\d{7})',  # 10-1314723
        r'출원번호\s+(\d{2}-\d{4}-\d{7})',  # 10-2010-0123456
        r'공개번호\s+(\d{2}-\d{4}-\d{7})',
        r'공고번호\s+(\d{2}-\d{7})'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, full_text)
        if match:
            patent_number = match.group(1)
            break
    
    # 등록일/출원일 추출
    registration_date = None
    application_date = None
    
    reg_match = re.search(r'등록일자\s+(\d{4})년(\d{2})월(\d{2})일', full_text)
    if reg_match:
        registration_date = f"{reg_match.group(1)}-{reg_match.group(2)}-{reg_match.group(3)}"
    
    app_match = re.search(r'출원일자\s+(\d{4})년(\d{2})월(\d{2})일', full_text)
    if app_match:
        application_date = f"{app_match.group(1)}-{app_match.group(2)}-{app_match.group(3)}"
    
    # 발명자 추출
    inventors = []
    inventor_section = re.search(r'\(72\)\s*발명자\s+(.*?)(?=\(|\n\n|$)', full_text, re.DOTALL)
    if inventor_section:
        inventor_text = inventor_section.group(1)
        # 이름 패턴 추출 (한글 2-4자)
        names = re.findall(r'([가-힣]{2,4})\s*\n', inventor_text)
        inventors = list(set(names))[:5]  # 중복 제거, 최대 5명
    
    # 요약 추출 (첫 200자)
    abstract = ''
    abstract_match = re.search(r'요약.*?\n\n(.*?)(?=\n\n|$)', full_text, re.DOTALL)
    if abstract_match:
        abstract = abstract_match.group(1).strip()[:500]
    elif full_text:
        # 요약이 없으면 본문 첫 부분
        abstract = full_text[:500]
    
    return {
        'id': doc_id,  # doc_id를 ID로 사용 (유니크 보장)
        'patent_number': patent_number or '',
        'title': title,
        'abstract': abstract,
        'category': '환경/에너지',  # 기본값
        'technology_field': extract_technology_field(title),
        'registration_date': registration_date or '',
        'application_date': application_date or '',
        'status': 'registered' if registration_date else 'pending',
        'assignee': '주식회사 글로벌스탠다드테크놀로지',
        'priority_score': 0,
        'page_count': pdf_data.get('page_count', 0),
        'source_path': pdf_data.get('source_path', ''),
        'inventors': inventors,
        'technical_keywords': extract_keywords(title, abstract)
    }

def extract_technology_field(title):
    """제목에서 기술 분야 추출"""
    fields = {
        '온도': '온도제어',
        '열': '온도제어',
        '냉각': '온도제어',
        '칠러': '온도제어',
        '히팅': '온도제어',
        '스크러버': '가스처리',
        '폐가스': '가스처리',
        '배가스': '가스처리',
        '흡착': '가스처리',
        '촉매': '가스처리',
        '플라즈마': '가스처리',
        '전기집진기': '가스처리',
        'PFC': '전력제어',
        '컨버터': '전력제어',
        '전원': '전력제어',
        '릴레이': '전력제어'
    }
    
    for keyword, field in fields.items():
        if keyword in title:
            return field
    
    return '기타'

def extract_keywords(title, abstract):
    """키워드 추출"""
    text = f"{title} {abstract}"
    
    keywords = []
    keyword_patterns = [
        r'(반도체|LCD|OLED)',
        r'(스크러버|버너|집진기|필터)',
        r'(온도제어|냉각|가열|열교환)',
        r'(전원|컨버터|PFC|릴레이)',
        r'(폐가스|배가스|유해가스)',
        r'(촉매|흡착|플라즈마)',
        r'(NOx|VOCs|CO)',
    ]
    
    for pattern in keyword_patterns:
        matches = re.findall(pattern, text)
        keywords.extend(matches)
    
    return list(set(keywords))[:10]

def main():
    patents_dir = Path('data/patents')
    output_file = Path('db/patents_data_clean.json')
    
    print(f"📂 특허 디렉토리: {patents_dir}")
    
    json_files = sorted(patents_dir.glob('*.json'))
    print(f"📋 총 {len(json_files)}개 파일 발견\n")
    
    patents = []
    failed = []
    
    for json_file in json_files:
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                pdf_data = json.load(f)
            
            patent_info = extract_patent_info(pdf_data)
            patents.append(patent_info)
            
            print(f"  ✓ {json_file.name}")
            print(f"    - ID: {patent_info['id']}")
            print(f"    - 제목: {patent_info['title'][:50]}")
            print(f"    - 등록번호: {patent_info['patent_number']}")
            print(f"    - 발명자: {', '.join(patent_info['inventors'][:3])}")
            
        except Exception as e:
            failed.append(f"{json_file.name}: {e}")
    
    print(f"\n📊 결과:")
    print(f"  ✅ 성공: {len(patents)}개")
    print(f"  ❌ 실패: {len(failed)}개")
    
    if failed:
        print(f"\n실패 목록:")
        for fail in failed[:10]:
            print(f"  - {fail}")
    
    # 저장
    print(f"\n💾 저장: {output_file}")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(patents, f, ensure_ascii=False, indent=2)
    
    print(f"✅ 최종 특허 수: {len(patents)}개")
    
    # 샘플 출력
    if patents:
        print(f"\n📋 샘플 특허:")
        sample = patents[0]
        print(json.dumps(sample, ensure_ascii=False, indent=2)[:800])

if __name__ == '__main__':
    main()
