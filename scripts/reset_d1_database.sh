#!/bin/bash
# D1 데이터베이스 완전 초기화 스크립트

echo "🗑️  D1 데이터베이스 완전 초기화 시작..."

# 1. 모든 테이블 DROP
echo "📋 Step 1: 모든 테이블 삭제 중..."
npx wrangler d1 execute gst_patents_db --remote --command="
DROP TABLE IF EXISTS patents;
DROP TABLE IF EXISTS patent_inventors;
DROP TABLE IF EXISTS patent_keywords;
"

echo "✅ 테이블 삭제 완료"

# 2. 새로운 스키마 생성
echo "📋 Step 2: 새로운 스키마 생성 중..."
npx wrangler d1 execute gst_patents_db --remote --file=db/schema.sql

echo "✅ 스키마 생성 완료"

# 3. 특허 수 확인
echo "📊 Step 3: 현재 특허 수 확인..."
npx wrangler d1 execute gst_patents_db --remote --command="SELECT COUNT(*) as count FROM patents;"

echo "🎉 D1 데이터베이스 초기화 완료!"
