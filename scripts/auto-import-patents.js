/**
 * 자동 특허 데이터 임포트 스크립트
 * 81개 JSON 파일을 blob URL에서 읽어 파싱하고 데이터베이스에 저장
 */

// 81개 JSON 파일의 blob URL 목록
const JSON_FILES = [
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/cb75cb7b-c656-46cf-a845-697726d5bb5c',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/2e66c59f-6e95-4d79-8dca-1f19a7f79ae6',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/6e4d6cdb-1e12-4e12-963b-f044f30e1b22',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/2c24fcca-ea01-4cc6-a4a1-2ed7ea0c96d2',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/45b0dc15-d9d1-47df-b41e-f47b6af08c6c',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/88a86a53-9e03-4574-96d0-4982b73d0b6c',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/07f14d8d-e3ee-4ffd-b8ef-89cf46cf1002',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/5f23f9eb-5c7e-4c28-a89f-08ac8e3a5ba9',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/9e7b3a5b-6de0-4ac2-ac3e-a2ceb7c9e23b',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/19dc54f7-0e90-42bc-9e95-d7f52a804cf1',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/5b5d8dd0-2ede-4734-a8b7-ddca3e0beaa7',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/ad6d0844-cd34-4b3d-8734-a7ff9ead92da',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/1e29bd4b-3c4e-4f4f-b38c-0ae9c65f0dd7',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/e5d5bfcb-4f9d-4a01-aac7-58c8dc8a32a0',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/65f0ffdf-aa7d-469d-95e1-ac08b4b8c25c',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/c64a7805-19ed-43c2-b82e-2eeba1b2cae8',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/a7aadc53-c71a-46eb-bc4b-c21f44a44fdd',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/2dee6afc-fa07-4fba-bc15-6c2c3d27bb58',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/df36a9db-e2c3-41b6-a3ca-53c1b37e2f50',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/b52b1fab-e887-4c86-80b9-f4b9ebc9f9f5',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/1e7e54f2-ad5c-4a51-9d55-51d3eac93b3b',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/5a5ad0f1-7b9b-4e62-81ca-4a0a2e7f4c13',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/42f23a5a-ca4d-4a98-84fd-c5d84f8c20f6',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/a89cce09-82dd-4d6c-b756-40dcab8303f6',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/5e2d5bb5-f8f3-4d72-b07d-2f3333d9f2e7',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/e0c3bc75-d4ec-4aa5-9e46-51f3ef2fb34a',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/faac3a99-82f9-4a00-b62b-bb1c82c6cd1c',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/e48a5a67-d044-47e4-ba25-eee3d8cea38d',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/bd1bb71c-8c44-4e9d-84f4-6c6e50dd86d9',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/17bb3f7c-2f42-4e1c-803c-e4c3ea193d5b',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/2e3f8e51-d8f3-4aa3-870d-dd4b92a71e3f',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/0cb02844-12ef-4d5a-a24e-85bb8f42a823',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/5c99fb7e-b1a8-4d86-b5d6-f61a5bf03eb7',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/a6f81d9d-b0f8-437d-bd1d-a72f9b80d5ba',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/d5aee1e0-08e6-4f24-bbb6-81cd4a9f3577',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/fe7cbf5c-08f4-456a-8962-12abb2a7a1eb',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/53aac9b0-ea9a-400e-b77a-d4ee12f9db33',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/8a827ac7-4eaa-45e1-95bf-6bbdad6af9ba',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/3a0fc0db-9c69-4ff4-8801-4ad4e30f0e92',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/db6f8e50-8f19-4c71-be6b-64f7c03e77cd',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/e5764ae2-1dc5-4879-a8c9-6ea2a43a5b3d',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/05e17b5a-e3ea-49f5-9c78-f3b6deb6ec5e',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/14cf1bcb-d00d-449c-a2ef-9b58c2e5bed1',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/42b9e506-1c27-4e2c-8bcc-82cfce7dfa7b',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/28e9f0be-93b5-4e65-86eb-72fb1bbde6be',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/e6a2ef5a-38cc-414e-bbe5-0c0edc6eef1f',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/3fffd5ff-5a32-4f22-96c2-0e50b4d6d0ff',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/42c7e44f-c4c9-43a3-8e25-2e50e1f48dd2',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/d7e73ed1-d1bd-4e1e-819d-ca5cb9deeb0f',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/cc8a4fb4-3de8-4046-9b87-cf12e81bb74c',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/c653ab31-acde-493b-8ea1-2a6fd0db9ede',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/a36c5bac-0cf5-4e6b-a4b8-5f1da60595b7',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/66bcddbd-b868-4f6b-a091-bd5ad6fb6d0f',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/3f21e2b9-e5a6-4ac7-9e4b-5d0f8e9dc1f9',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/ba04c9f6-c831-4835-938e-a20fd8f5cc89',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/8f8c5c10-3e83-4e12-ba1e-7ba19dd0e5ba',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/f24d906f-87b8-47b5-b2b6-25e3c37af6a1',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/fb5f17cc-e5a5-4009-8eb2-1e5e5e55c844',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/b2ef2c9f-f4bd-4ed8-85b6-7e7c77eb8fcc',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/f44bb5b6-9f68-4e79-874a-bd3d2e55e8a4',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/82ce4906-6d81-4f9c-8b5a-21d6e72e1e5f',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/17e02cb3-62a9-47ba-a5f3-7cfdfcca9d35',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/9f3e1862-5d74-4cd2-b9be-6aa83e67aa59',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/79a68e36-fc3e-492c-947a-c8f82bc2db49',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/d5e79d7e-8c5e-4f50-9e0c-aab03b0c5e76',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/a7e06c93-4eb0-47fa-83c1-98f7e90d7f4e',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/6f9b01da-a9fa-4e0f-ba55-56ca1a8de7e3',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/e4e6c1b0-f4d6-473a-9ba1-f84e4f90b9e9',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/7e9a9fc2-4c22-443c-927d-3eb6df8fbfa0',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/c8e4ab81-0cbb-42a0-acc7-42e43c57e78f',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/e31c6c98-4e93-48f0-bbf4-3cfd39dcc7ac',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/3ee7ab78-e2e4-4c19-8f95-4dd3b4ed6e87',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/e8fdee04-7a9b-4dbb-a3c9-18a7eb46c18f',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/fbfa46e4-c914-4e6e-99c1-5bbe8c9e8b23',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/c91c5fdc-9adb-4394-89e5-1e2a4e78e2d8',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/97f9a5cb-f6ef-4e59-8d08-5fe7ec9dc1fb',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/79cdcf33-a21f-4076-bb28-3c1a4b07bc41',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/c8c91d5b-b74e-4d6e-8cef-2e1f2a9db1e3',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/fe3fffc2-b5f9-4d50-b3c0-f5c5dcc5e5e9',
    'https://gensparkstorageprodwest.blob.core.windows.net/web-drive/83d35741-5847-48e7-a7ce-5f573ee31fd2/4c5b4c2e-3e33-4e4e-87f7-5f2e1f6e5e9b'
];

// 통계 객체
const stats = {
    total: JSON_FILES.length,
    fetched: 0,
    parsed: 0,
    saved: 0,
    errors: 0,
    byCategory: {},
    byStatus: {},
    startTime: null,
    endTime: null
};

// 로그 함수
function log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString('ko-KR');
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`[${timestamp}] ${prefix} ${message}`);
}

// 특허 번호 추출
function extractPatentNumber(text) {
    const patterns = [
        /\(11\)\s*등록번호\s*[:\s]*(\d{2}-\d{7,10})/i,
        /등록번호\s*[:\s]*(\d{2}-\d{7,10})/i,
        /특허번호\s*[:\s]*(\d{2}-\d{7,10})/i,
        /(\d{2}-\d{7,10})/
    ];
    
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            return match[1].trim();
        }
    }
    return null;
}

// 날짜 추출
function extractDate(text, label) {
    const patterns = [
        new RegExp(`${label}\\s*[:\\s]*(\\d{4})년\\s*(\\d{1,2})월\\s*(\\d{1,2})일`, 'i'),
        new RegExp(`${label}\\s*[:\\s]*(\\d{4})\\.(\\d{1,2})\\.(\\d{1,2})`, 'i'),
        new RegExp(`${label}\\s*[:\\s]*(\\d{4})-(\\d{1,2})-(\\d{1,2})`, 'i')
    ];
    
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            const year = match[1];
            const month = match[2].padStart(2, '0');
            const day = match[3].padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
    }
    return null;
}

// 발명자 추출
function extractInventors(text) {
    const patterns = [
        /\(72\)\s*발명자\s*[:\s]*([\s\S]*?)(?=\(\d+\)|$)/i,
        /발명자\s*[:\s]*([\s\S]*?)(?=\(\d+\)|$)/i
    ];
    
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            const inventorText = match[1].trim();
            const inventors = inventorText
                .split(/\n|;|,/)
                .map(inv => inv.trim())
                .filter(inv => inv.length > 0 && /[가-힣]{2,}/.test(inv))
                .slice(0, 10);
            return inventors.length > 0 ? inventors : ['정보 없음'];
        }
    }
    return ['정보 없음'];
}

// 특허권자 추출
function extractAssignee(text) {
    const patterns = [
        /\(73\)\s*특허권자\s*[:\s]*(.*?)(?:\n|$)/i,
        /특허권자\s*[:\s]*(.*?)(?:\n|$)/i
    ];
    
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            return match[1].trim() || '글로벌 스탠다드 테크놀로지';
        }
    }
    return '글로벌 스탠다드 테크놀로지';
}

// IPC 분류 추출
function extractIPCClassification(text) {
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

// 카테고리 분류
function categorizePatent(title, fullText) {
    const combinedText = `${title} ${fullText}`.toLowerCase();
    
    const categories = {
        scrubber: ['스크러버', 'scrubber', '세정', '배기가스', '처리장치'],
        chiller: ['칠러', 'chiller', '냉각', '온도제어', '열교환'],
        plasma: ['플라즈마', 'plasma', '방전', '이온화'],
        temperature: ['온도', 'temperature', '가열', '냉각', '열'],
        'gas-treatment': ['가스', 'gas', '배기', '배출', '흡착']
    };
    
    for (const [category, keywords] of Object.entries(categories)) {
        for (const keyword of keywords) {
            if (combinedText.includes(keyword)) {
                return category;
            }
        }
    }
    
    return 'other';
}

// 기술 분야 추출
function extractTechnologyField(text) {
    const patterns = [
        /\(57\)\s*요약\s*[:\s]*([\s\S]*?)(?=\(|$)/i,
        /기술분야\s*[:\s]*([\s\S]*?)(?=\[|$)/i
    ];
    
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            const field = match[1].trim().substring(0, 200);
            return field || '반도체 제조 장비';
        }
    }
    return '반도체 제조 장비';
}

// 기술 키워드 추출
function extractTechnicalKeywords(title, fullText) {
    const commonKeywords = [
        '스크러버', '칠러', '플라즈마', '온도', '제어', '가스', '처리',
        '세정', '냉각', '배기', '시스템', '장치', '방법', '공정',
        '반도체', '진공', '압력', '유량', '센서', '밸브'
    ];
    
    const combinedText = `${title} ${fullText}`.toLowerCase();
    const foundKeywords = [];
    
    for (const keyword of commonKeywords) {
        if (combinedText.includes(keyword.toLowerCase())) {
            foundKeywords.push(keyword);
            if (foundKeywords.length >= 10) break;
        }
    }
    
    return foundKeywords.length > 0 ? foundKeywords : ['반도체', '제조', '장비'];
}

// 우선순위 점수 계산
function calculatePriorityScore(registrationDate, category) {
    let score = 5;
    
    if (registrationDate) {
        const regDate = new Date(registrationDate);
        const now = new Date();
        const yearsDiff = (now - regDate) / (1000 * 60 * 60 * 24 * 365);
        
        if (yearsDiff < 3) score += 3;
        else if (yearsDiff < 5) score += 2;
        else if (yearsDiff < 10) score += 1;
    }
    
    if (['scrubber', 'chiller', 'plasma'].includes(category)) {
        score += 2;
    }
    
    return Math.min(10, Math.max(1, score));
}

// 주요 청구항 추출
function extractMainClaims(fullText) {
    const patterns = [
        /\[청구항.*?\]([\s\S]*?)(?=\[|$)/i,
        /청구의\s*범위([\s\S]*?)(?=\[|$)/i
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

// JSON 파일을 특허 객체로 파싱
function parsePatentFromJSON(jsonData) {
    try {
        const fullText = jsonData.pages.map(page => page.text || '').join('\n');
        const firstPageText = jsonData.pages[0]?.text || '';
        
        const patentNumber = extractPatentNumber(firstPageText);
        const registrationDate = extractDate(firstPageText, '등록일자?');
        const applicationDate = extractDate(firstPageText, '출원일자?');
        const publicationDate = extractDate(firstPageText, '공개일자?');
        const category = categorizePatent(jsonData.title, fullText);
        const technologyField = extractTechnologyField(firstPageText);
        const inventors = extractInventors(firstPageText);
        const assignee = extractAssignee(firstPageText);
        const ipcClassification = extractIPCClassification(firstPageText);
        const technicalKeywords = extractTechnicalKeywords(jsonData.title, fullText);
        const priorityScore = calculatePriorityScore(registrationDate, category);
        const mainClaims = extractMainClaims(fullText);
        
        const imageCount = jsonData.pages.reduce((count, page) => {
            return count + (page.images ? page.images.length : 0);
        }, 0);
        
        return {
            id: jsonData.doc_id,
            doc_id: jsonData.doc_id,
            patent_number: patentNumber || '정보 없음',
            title: jsonData.title || '제목 없음',
            abstract: technologyField,
            category: category,
            technology_field: technologyField,
            registration_date: registrationDate,
            application_date: applicationDate,
            publication_date: publicationDate,
            status: 'active',
            inventors: inventors,
            assignee: assignee,
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
    } catch (error) {
        log(`파싱 오류: ${error.message}`, 'error');
        throw error;
    }
}

// 단일 JSON 파일 처리
async function processJSONFile(url, index) {
    try {
        log(`[${index + 1}/${stats.total}] JSON 파일 가져오는 중...`);
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        stats.fetched++;
        const jsonData = await response.json();
        
        log(`[${index + 1}/${stats.total}] 파싱 중: ${jsonData.title || 'Unknown'}`);
        const patentData = parsePatentFromJSON(jsonData);
        
        stats.parsed++;
        
        // 카테고리별 통계
        stats.byCategory[patentData.category] = (stats.byCategory[patentData.category] || 0) + 1;
        stats.byStatus[patentData.status] = (stats.byStatus[patentData.status] || 0) + 1;
        
        return patentData;
        
    } catch (error) {
        stats.errors++;
        log(`[${index + 1}/${stats.total}] 오류 발생: ${error.message}`, 'error');
        return null;
    }
}

// 배치로 데이터베이스에 저장
async function saveBatchToDatabase(batch, batchIndex, totalBatches) {
    try {
        log(`배치 ${batchIndex + 1}/${totalBatches} 저장 중 (${batch.length}개 레코드)...`);
        
        const response = await fetch('tables/patents', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(batch)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        stats.saved += batch.length;
        log(`배치 ${batchIndex + 1}/${totalBatches} 저장 완료 ✅`, 'success');
        
        return true;
    } catch (error) {
        log(`배치 저장 실패: ${error.message}`, 'error');
        return false;
    }
}

// 메인 실행 함수
async function main() {
    stats.startTime = new Date();
    log('='.repeat(60));
    log('🚀 특허 데이터 자동 임포트 시작');
    log(`📊 총 ${stats.total}개 JSON 파일 처리 예정`);
    log('='.repeat(60));
    
    // 모든 JSON 파일 처리
    const allPatents = [];
    for (let i = 0; i < JSON_FILES.length; i++) {
        const patentData = await processJSONFile(JSON_FILES[i], i);
        if (patentData) {
            allPatents.push(patentData);
        }
        
        // 진행률 표시 (10개마다)
        if ((i + 1) % 10 === 0) {
            const progress = ((i + 1) / stats.total * 100).toFixed(1);
            log(`📈 진행률: ${progress}% (${i + 1}/${stats.total})`);
        }
    }
    
    log('\n' + '='.repeat(60));
    log('💾 데이터베이스 저장 시작');
    log('='.repeat(60));
    
    // 배치 단위로 저장 (10개씩)
    const batchSize = 10;
    const batches = [];
    for (let i = 0; i < allPatents.length; i += batchSize) {
        batches.push(allPatents.slice(i, i + batchSize));
    }
    
    for (let i = 0; i < batches.length; i++) {
        await saveBatchToDatabase(batches[i], i, batches.length);
    }
    
    stats.endTime = new Date();
    const duration = ((stats.endTime - stats.startTime) / 1000).toFixed(2);
    
    // 최종 통계 출력
    log('\n' + '='.repeat(60));
    log('✨ 특허 데이터 임포트 완료!');
    log('='.repeat(60));
    log(`⏱️  소요 시간: ${duration}초`);
    log(`📄 총 파일: ${stats.total}개`);
    log(`✅ 가져옴: ${stats.fetched}개`);
    log(`✅ 파싱됨: ${stats.parsed}개`);
    log(`✅ 저장됨: ${stats.saved}개`);
    log(`❌ 오류: ${stats.errors}개`);
    log('\n📊 카테고리별 통계:');
    Object.entries(stats.byCategory).forEach(([category, count]) => {
        log(`   ${category}: ${count}개`);
    });
    log('\n📊 상태별 통계:');
    Object.entries(stats.byStatus).forEach(([status, count]) => {
        log(`   ${status}: ${count}개`);
    });
    log('='.repeat(60));
    
    return {
        success: stats.errors === 0,
        stats: stats
    };
}

// 스크립트 실행
if (typeof window !== 'undefined') {
    // 브라우저 환경
    window.importPatents = main;
    log('📌 사용법: 브라우저 콘솔에서 importPatents()를 호출하세요');
} else {
    // Node.js 환경
    main().then(result => {
        if (result.success) {
            process.exit(0);
        } else {
            process.exit(1);
        }
    });
}
