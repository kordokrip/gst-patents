/**
 * Build Local Patent Database
 * ----------------------------
 * Aggregates the raw JSON files under data/patents into a normalized
 * dataset compatible with the front-end search UI.
 *
 * Usage:
 *   node scripts/build-local-db.js
 */

const fs = require('fs/promises');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const PATENT_SOURCE_DIR = path.join(ROOT_DIR, 'data', 'patents');
const OUTPUT_PATH = path.join(ROOT_DIR, 'data', 'patents-index.json');

async function main() {
    console.log('🛠️  GST 특허 로컬 DB 생성 시작');

    const files = (await fs.readdir(PATENT_SOURCE_DIR))
        .filter(file => file.endsWith('.json'))
        .sort();

    if (files.length === 0) {
        console.warn('⚠️  data/patents 디렉터리에 JSON 파일이 없습니다.');
        return;
    }

    const patents = [];
    const stats = {
        totalFiles: files.length,
        success: 0,
        failed: 0,
        categories: {},
        missingNumbers: 0
    };

    for (const file of files) {
        const filePath = path.join(PATENT_SOURCE_DIR, file);

        try {
            const raw = await fs.readFile(filePath, 'utf-8');
            const jsonData = JSON.parse(raw);

            const patent = transformPatent(jsonData);
            patents.push(patent);

            stats.success += 1;
            stats.categories[patent.category] = (stats.categories[patent.category] || 0) + 1;
            if (!patent.patent_number || patent.patent_number === '정보 없음') {
                stats.missingNumbers += 1;
            }
        } catch (error) {
            stats.failed += 1;
            console.error(`❌ ${file} 처리 실패: ${error.message}`);
        }
    }

    const payload = {
        generated_at: new Date().toISOString(),
        total: patents.length,
        data: patents
    };

    await fs.writeFile(OUTPUT_PATH, JSON.stringify(payload, null, 2), 'utf-8');

    console.log('✅ 로컬 DB 생성 완료');
    console.log(`   • 총 파일: ${stats.totalFiles}`);
    console.log(`   • 성공: ${stats.success}`);
    console.log(`   • 실패: ${stats.failed}`);
    console.log(`   • 특허번호 누락: ${stats.missingNumbers}`);
    console.log(`   • 출력 파일: ${path.relative(ROOT_DIR, OUTPUT_PATH)}`);
    console.log('   • 카테고리 분포:');
    for (const [category, count] of Object.entries(stats.categories).sort((a, b) => b[1] - a[1])) {
        console.log(`     - ${category}: ${count}`);
    }
}

function transformPatent(jsonData) {
    if (!jsonData || !Array.isArray(jsonData.pages)) {
        throw new Error('pages 필드가 존재하지 않거나 형식이 올바르지 않습니다.');
    }

    const fullText = jsonData.pages.map(page => (page.text || '').trim()).join('\n\n');
    const firstPageText = jsonData.pages[0]?.text || '';

    const patentNumber = extractPatentNumber(firstPageText);
    const registrationDate = extractAnyDate(firstPageText, ['등록일자', '(24)', '(45)']);
    const applicationDate = extractAnyDate(firstPageText, ['출원일자', '(22)']);
    const publicationDate = extractAnyDate(firstPageText, ['공개일자', '(43)']);

    const category = categorizePatent(jsonData.title, fullText);
    const technologyField = extractTechnologyField(fullText);
    const inventors = extractInventors(firstPageText);
    const assignee = extractAssignee(firstPageText);
    const ipcClassification = extractIPCClassification(firstPageText);
    const technicalKeywords = extractTechnicalKeywords(jsonData.title, fullText);
    const priorityScore = calculatePriorityScore(registrationDate, category);
    const mainClaims = extractMainClaims(fullText);

    const imageCount = jsonData.pages.reduce((count, page) => {
        return count + (Array.isArray(page.images) ? page.images.length : 0);
    }, 0);

    return {
        id: jsonData.doc_id || createFallbackId(jsonData.title),
        doc_id: jsonData.doc_id || createFallbackId(jsonData.title),
        patent_number: patentNumber || '정보 없음',
        title: jsonData.title || '제목 없음',
        abstract: buildAbstract(fullText),
        category,
        technology_field: technologyField,
        registration_date: registrationDate,
        application_date: applicationDate,
        publication_date: publicationDate,
        status: 'active',
        inventors,
        assignee,
        priority_score: priorityScore,
        technical_keywords: technicalKeywords,
        related_patents: [],
        main_claims: mainClaims,
        full_text: fullText.substring(0, 10000),
        page_count: jsonData.pages.length,
        source_path: jsonData.source_path || '',
        extraction_date: jsonData.created_at || new Date().toISOString(),
        ipc_classification: ipcClassification,
        legal_status: 'active',
        image_count: imageCount,
        vector_embedding_ready: true
    };
}

function createFallbackId(title = '') {
    const base = title.trim().replace(/\s+/g, '_').slice(0, 40) || 'patent';
    return `${base}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildAbstract(fullText) {
    if (!fullText) return '요약 정보 없음';
    return fullText.split('\n').map(line => line.trim()).filter(Boolean).slice(0, 4).join(' ').slice(0, 400) || '요약 정보 없음';
}

function extractPatentNumber(text) {
    if (!text) return null;
    const patterns = [
        /\(11\)\s*등록번호\s*[:\s]*(\d{2}-\d{7,10})/i,
        /등록번호\s*[:\s]*(\d{2}-\d{7,10})/i,
        /특허번호\s*[:\s]*(\d{2}-\d{7,10})/i,
        /Patent No\.\s*(\d{2}-\d{7,10})/i,
        /(\d{2}-\d{7,10})/
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) return match[1].trim();
    }
    return null;
}

function extractAnyDate(text, labels) {
    if (!text) return null;

    const normalizedText = text.replace(/\s+/g, ' ');
    for (const label of labels) {
        const patterns = [
            new RegExp(`${label}\\s*[:\\s]*(\\d{4})년\\s*(\\d{1,2})월\\s*(\\d{1,2})일`, 'i'),
            new RegExp(`${label}\\s*[:\\s]*(\\d{4})\\.(\\d{1,2})\\.(\\d{1,2})`, 'i'),
            new RegExp(`${label}\\s*[:\\s]*(\\d{4})-(\\d{1,2})-(\\d{1,2})`, 'i'),
            new RegExp(`${label}\\s*(\\d{4})/(\\d{1,2})/(\\d{1,2})`, 'i')
        ];

        for (const pattern of patterns) {
            const match = normalizedText.match(pattern);
            if (match) {
                const year = match[1];
                const month = match[2].padStart(2, '0');
                const day = match[3].padStart(2, '0');
                return `${year}-${month}-${day}`;
            }
        }
    }

    return null;
}

function extractInventors(text) {
    if (!text) return ['정보 없음'];
    const patterns = [
        /\(72\)\s*발명자\s*[:\s]*([\s\S]*?)(?=\(\d+\)|\(73\)|$)/i,
        /발명자\s*[:\s]*([\s\S]*?)(?=\(\d+\)|\(73\)|$)/i
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            const inventors = match[1]
                .split(/\n|;|,|\/|\s{2,}/)
                .map(inv => inv.trim())
                .filter(inv => inv.length > 0 && /[가-힣]{2,}|[A-Za-z]{3,}/.test(inv))
                .slice(0, 10);
            if (inventors.length > 0) return inventors;
        }
    }
    return ['정보 없음'];
}

function extractAssignee(text) {
    if (!text) return '글로벌 스탠다드 테크놀로지';
    const patterns = [
        /\(73\)\s*특허권자\s*[:\s]*(.*?)(?:\n|$)/i,
        /특허권자\s*[:\s]*(.*?)(?:\n|$)/i,
        /\(71\)\s*출원인\s*[:\s]*(.*?)(?:\n|$)/i
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            return match[1].trim() || '글로벌 스탠다드 테크놀로지';
        }
    }
    return '글로벌 스탠다드 테크놀로지';
}

function extractIPCClassification(text) {
    if (!text) return '정보 없음';
    const patterns = [
        /\(51\)\s*국제특허분류\(Int\.\s*Cl\.\)\s*[:\s]*(.*?)(?:\n|$)/i,
        /국제특허분류\s*[:\s]*(.*?)(?:\n|$)/i,
        /Int\.\s*Cl\.\s*[:\s]*(.*?)(?:\n|$)/i
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            return match[1].trim();
        }
    }
    return '정보 없음';
}

function categorizePatent(title = '', fullText = '') {
    const combined = `${title} ${fullText}`.toLowerCase();
    const categories = {
        scrubber: ['스크러버', 'scrubber', '세정', '배기가스', '처리장치'],
        chiller: ['칠러', 'chiller', '냉각', '온도제어', '열교환'],
        plasma: ['플라즈마', 'plasma', '방전', '이온화'],
        temperature: ['온도', 'temperature', '가열', '냉각', '열'],
        'gas-treatment': ['가스', 'gas', '배기', '배출', '흡착']
    };

    for (const [category, keywords] of Object.entries(categories)) {
        for (const keyword of keywords) {
            if (combined.includes(keyword.toLowerCase())) {
                return category;
            }
        }
    }
    return 'other';
}

function extractTechnologyField(fullText = '') {
    if (!fullText) return '반도체 제조 장비';
    const patterns = [
        /\(57\)\s*요\s*약\s*[:\s]*([\s\S]*?)(?=\(\d+\)|\[|$)/i,
        /기술\s*분야\s*[:\s]*([\s\S]*?)(?=\[|$)/i
    ];

    for (const pattern of patterns) {
        const match = fullText.match(pattern);
        if (match && match[1]) {
            const field = match[1].trim().substring(0, 200);
            return field || '반도체 제조 장비';
        }
    }
    return '반도체 제조 장비';
}

function extractTechnicalKeywords(title = '', fullText = '') {
    const commonKeywords = [
        '스크러버', '칠러', '플라즈마', '온도', '제어', '가스', '처리',
        '세정', '냉각', '배기', '시스템', '장치', '방법', '공정',
        '반도체', '진공', '압력', '유량', '센서', '밸브'
    ];

    const combined = `${title} ${fullText}`.toLowerCase();
    const found = [];

    for (const keyword of commonKeywords) {
        if (combined.includes(keyword.toLowerCase())) {
            found.push(keyword);
            if (found.length >= 10) break;
        }
    }

    return found.length > 0 ? found : ['반도체', '제조', '장비'];
}

function calculatePriorityScore(registrationDate, category) {
    let score = 5;

    if (registrationDate) {
        const regDate = new Date(registrationDate);
        if (!Number.isNaN(regDate.getTime())) {
            const now = new Date();
            const yearsDiff = (now - regDate) / (1000 * 60 * 60 * 24 * 365);

            if (yearsDiff < 3) score += 3;
            else if (yearsDiff < 5) score += 2;
            else if (yearsDiff < 10) score += 1;
        }
    }

    if (['scrubber', 'chiller', 'plasma'].includes(category)) {
        score += 2;
    }

    return Math.min(10, Math.max(1, score));
}

function extractMainClaims(fullText = '') {
    if (!fullText) return '청구항 정보 없음';
    const patterns = [
        /\[청구항.*?\]([\s\S]*?)(?=\[|$)/i,
        /청구의\s*범위([\s\S]*?)(?=\[|$)/i,
        /청구항\s*1([\s\S]*?)(?=\n{2,}|$)/i
    ];

    for (const pattern of patterns) {
        const match = fullText.match(pattern);
        if (match && match[1]) {
            const claims = match[1].trim().substring(0, 2000);
            return claims || '청구항 정보 없음';
        }
    }
    return '청구항 정보 없음';
}

main().catch(error => {
    console.error('❌ 로컬 DB 생성 중 치명적인 오류가 발생했습니다.', error);
    process.exitCode = 1;
});
