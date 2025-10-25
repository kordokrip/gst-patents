#!/usr/bin/env node
/**
 * SQLite DB to D1 Data Migration Script
 * 로컬 gst_patents.db의 데이터를 Cloudflare D1으로 마이그레이션
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/gst_patents.db');
const OUTPUT_DIR = path.join(__dirname, '../migrations/data');

// 출력 디렉터리 생성
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function exportToSQL() {
  console.log('📂 로컬 SQLite 데이터베이스 로드 중...');
  const db = new Database(DB_PATH, { readonly: true });

  // Patents 테이블 데이터 추출
  console.log('\n📊 특허 데이터 추출 중...');
  const patents = db.prepare('SELECT * FROM patents').all();
  console.log(`   ✓ ${patents.length}개 특허 데이터 추출`);

  // SQL INSERT 문 생성
  const sqlStatements = [];
  
  for (const patent of patents) {
    const values = Object.values(patent).map(v => {
      if (v === null) return 'NULL';
      if (typeof v === 'number') return v;
      return `'${String(v).replace(/'/g, "''")}'`;
    });
    
    sqlStatements.push(
      `INSERT INTO patents (${Object.keys(patent).join(', ')}) VALUES (${values.join(', ')});`
    );

    // 발명자 데이터
    const inventors = db.prepare('SELECT * FROM patent_inventors WHERE patent_id = ?').all(patent.id);
    for (const inv of inventors) {
      sqlStatements.push(
        `INSERT INTO patent_inventors (patent_id, name) VALUES ('${patent.id}', '${inv.name.replace(/'/g, "''")}');`
      );
    }

    // 키워드 데이터
    const keywords = db.prepare('SELECT * FROM patent_keywords WHERE patent_id = ?').all(patent.id);
    for (const kw of keywords) {
      sqlStatements.push(
        `INSERT INTO patent_keywords (patent_id, keyword) VALUES ('${patent.id}', '${kw.keyword.replace(/'/g, "''")}');`
      );
    }
  }

  // SQL 파일로 저장 (배치 처리)
  const BATCH_SIZE = 100;
  const batches = [];
  
  for (let i = 0; i < sqlStatements.length; i += BATCH_SIZE) {
    batches.push(sqlStatements.slice(i, i + BATCH_SIZE));
  }

  console.log(`\n📝 SQL 파일 생성 중... (${batches.length}개 배치)`);
  
  batches.forEach((batch, index) => {
    const filename = path.join(OUTPUT_DIR, `insert_batch_${String(index + 1).padStart(4, '0')}.sql`);
    fs.writeFileSync(filename, batch.join('\n'));
    console.log(`   ✓ ${filename} 생성 (${batch.length} statements)`);
  });

  // JSON 형식으로도 저장 (백업용)
  const jsonData = {
    patents: patents.map(p => ({
      ...p,
      inventors: db.prepare('SELECT name FROM patent_inventors WHERE patent_id = ?').all(p.id).map(i => i.name),
      keywords: db.prepare('SELECT keyword FROM patent_keywords WHERE patent_id = ?').all(p.id).map(k => k.keyword),
    })),
  };

  const jsonPath = path.join(OUTPUT_DIR, 'patents_backup.json');
  fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
  console.log(`\n💾 백업 JSON 생성: ${jsonPath}`);
  console.log(`   총 ${jsonData.patents.length}개 특허`);

  db.close();
  
  console.log('\n✅ 데이터 추출 완료!');
  console.log('\n📤 다음 단계:');
  console.log('   1. wrangler d1 create gst_patents_db');
  console.log('   2. wrangler d1 migrations apply gst_patents_db');
  console.log('   3. wrangler d1 execute gst_patents_db --file=migrations/data/insert_batch_0001.sql');
  console.log('   4. 모든 배치 파일 반복 실행');
}

exportToSQL().catch(console.error);
