#!/bin/bash
set -e

echo "🚀 D1 특허 데이터 임포트 시작..."
echo ""

# D1 현재 상태 확인
echo "🔍 D1 현재 상태:"
npx wrangler d1 execute gst_patents_db --remote --command "SELECT COUNT(*) as count FROM patents;"
echo ""

# Python으로 JSON → SQL 변환
echo "📝 SQL 생성 중..."
python3 << 'PYTHON_SCRIPT'
import json
from pathlib import Path

# JSON 로드
with open('db/patents_data_clean.json', 'r', encoding='utf-8') as f:
    patents = json.load(f)

print(f"총 {len(patents)}개 특허 로드")

# SQL 파일 생성
sql_lines = []
for i, patent in enumerate(patents, 1):
    # SQL 이스케이프
    def escape_sql(text):
        if not text:
            return ''
        return str(text).replace("'", "''").replace('\n', ' ').replace('\r', '')
    
    patent_id = escape_sql(patent.get('id', ''))
    patent_number = escape_sql(patent.get('patent_number', ''))
    title = escape_sql(patent.get('title', ''))
    abstract = escape_sql(patent.get('abstract', ''))[:1000]  # 1000자 제한
    category = escape_sql(patent.get('category', ''))
    technology_field = escape_sql(patent.get('technology_field', ''))
    registration_date = escape_sql(patent.get('registration_date', ''))
    application_date = escape_sql(patent.get('application_date', ''))
    status = escape_sql(patent.get('status', 'registered'))
    assignee = escape_sql(patent.get('assignee', ''))
    priority_score = patent.get('priority_score', 0)
    page_count = patent.get('page_count', 0)
    source_path = escape_sql(patent.get('source_path', ''))
    
    sql = f"""INSERT OR REPLACE INTO patents (
  id, patent_number, title, abstract, category, technology_field,
  registration_date, application_date, status, assignee,
  priority_score, page_count, source_path
) VALUES (
  '{patent_id}', '{patent_number}', '{title}', '{abstract}',
  '{category}', '{technology_field}', '{registration_date}',
  '{application_date}', '{status}', '{assignee}',
  {priority_score}, {page_count}, '{source_path}'
);"""
    
    sql_lines.append(sql)
    
    if (i % 10) == 0:
        print(f"  처리 중... {i}/{len(patents)}")

# SQL 파일 저장
sql_file = Path('db/import_patents.sql')
with open(sql_file, 'w', encoding='utf-8') as f:
    f.write('\n'.join(sql_lines))

print(f"\n✅ SQL 파일 생성 완료: {sql_file}")
print(f"   {len(sql_lines)}개 INSERT 문")
PYTHON_SCRIPT

echo ""
echo "📤 D1에 업로드 중..."
npx wrangler d1 execute gst_patents_db --remote --file=db/import_patents.sql

echo ""
echo "🔍 D1 최종 상태:"
npx wrangler d1 execute gst_patents_db --remote --command "SELECT COUNT(*) as count FROM patents;"

echo ""
echo "📋 샘플 데이터 확인:"
npx wrangler d1 execute gst_patents_db --remote --command "SELECT id, title, patent_number FROM patents LIMIT 5;"

echo ""
echo "✅ 임포트 완료!"
