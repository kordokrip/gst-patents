/**
 * GST Patent Data Parser
 * JSON 파일에서 특허 데이터를 추출하고 정규화하는 유틸리티
 * 
 * @version 1.0.0
 * @author GST Development Team
 */

class PatentDataParser {
    constructor() {
        this.categories = {
            'scrubber': ['스크러버', 'scrubber', '세정', '정화'],
            'chiller': ['칠러', 'chiller', '냉각', '냉동'],
            'plasma': ['플라즈마', 'plasma', '방전'],
            'temperature': ['온도', 'temperature', '히팅', '가열', '냉각'],
            'gas-treatment': ['가스', 'gas', '배기', '처리', '분해']
        };

        this.technologyFields = {
            '가스처리': ['가스', '배기', '처리', '분해', '산화질'],
            '온도제어': ['온도', '히팅', '냉각', '칠러'],
            '플라즈마': ['플라즈마', '방전', '전극'],
            '세정장치': ['스크러버', '세정', '정화'],
            '제조공정': ['반도체', '제조', '공정']
        };
    }

    /**
     * JSON 파일에서 특허 번호 추출
     * 한국 특허번호 패턴: 10-YYYYNNNNNNN
     */
    extractPatentNumber(text) {
        if (!text) return null;
        
        // 한국 특허번호 패턴 매칭
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

    /**
     * 특허 등록일자 추출
     */
    extractRegistrationDate(text) {
        if (!text) return null;

        const patterns = [
            /\(45\)\s*공고일자\s*(\d{4})년(\d{2})월(\d{2})일/,
            /공고일자\s*(\d{4})년(\d{2})월(\d{2})일/,
            /등록일자\s*(\d{4})년(\d{2})월(\d{2})일/
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                return `${match[1]}-${match[2]}-${match[3]}`;
            }
        }

        return null;
    }

    /**
     * 특허 출원일자 추출
     */
    extractApplicationDate(text) {
        if (!text) return null;

        const patterns = [
            /\(22\)\s*출원일자\s*(\d{4})년(\d{2})월(\d{2})일/,
            /출원일자\s*(\d{4})년(\d{2})월(\d{2})일/
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                return `${match[1]}-${match[2]}-${match[3]}`;
            }
        }

        return null;
    }

    /**
     * 발명자 목록 추출
     */
    extractInventors(text) {
        if (!text) return [];

        const patterns = [
            /\(72\)\s*발명자\s*([^\(]+?)(?=\(|$)/s,
            /발명자\s*([^\(]+?)(?=\(|출원인|$)/s
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                const inventorText = match[1].trim();
                // 이름만 추출 (주소 제거)
                const inventors = inventorText
                    .split(/\n/)
                    .map(line => {
                        // 이름 패턴: 한글 이름 (공백 포함)
                        const nameMatch = line.match(/^([가-힣\s]{2,10})/);
                        return nameMatch ? nameMatch[1].trim() : null;
                    })
                    .filter(name => name && name.length >= 2);
                
                return [...new Set(inventors)]; // 중복 제거
            }
        }

        return [];
    }

    /**
     * 출원인/권리자 추출
     */
    extractAssignee(text) {
        if (!text) return '글로벌 스탠다드 테크놀로지 주식회사';

        const patterns = [
            /\(73\)\s*특허권자\s*([^\(]+?)(?=\(|$)/,
            /특허권자\s*([^\(]+?)(?=\(|$)/,
            /\(71\)\s*출원인\s*([^\(]+?)(?=\(|$)/,
            /출원인\s*([^\(]+?)(?=\(|$)/
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                const assignee = match[1].trim().split(/\n/)[0].trim();
                return assignee || '글로벌 스탠다드 테크놀로지 주식회사';
            }
        }

        return '글로벌 스탠다드 테크놀로지 주식회사';
    }

    /**
     * 국제특허분류(IPC) 추출
     */
    extractIPCClassification(text) {
        if (!text) return null;

        const patterns = [
            /\(51\)\s*국제특허분류\(Int\.\s*Cl\.\)\s*([A-H]\d{2}[A-Z]\s*\d+\/\d+)/,
            /국제특허분류\s*([A-H]\d{2}[A-Z]\s*\d+\/\d+)/
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                return match[1].trim();
            }
        }

        return null;
    }

    /**
     * 카테고리 자동 분류
     */
    categorizePatent(title, text) {
        const combinedText = (title + ' ' + text).toLowerCase();

        for (const [category, keywords] of Object.entries(this.categories)) {
            for (const keyword of keywords) {
                if (combinedText.includes(keyword.toLowerCase())) {
                    return category;
                }
            }
        }

        return 'other';
    }

    /**
     * 기술 분야 자동 분류
     */
    identifyTechnologyField(title, text) {
        const combinedText = (title + ' ' + text).toLowerCase();

        for (const [field, keywords] of Object.entries(this.technologyFields)) {
            for (const keyword of keywords) {
                if (combinedText.includes(keyword.toLowerCase())) {
                    return field;
                }
            }
        }

        return '기타';
    }

    /**
     * 기술 키워드 추출
     */
    extractTechnicalKeywords(title, text) {
        const keywords = new Set();
        const combinedText = title + ' ' + text;

        // 기술 관련 명사 추출 (간단한 패턴 매칭)
        const technicalTerms = [
            '반도체', '공정', '가스', '처리', '분해', '산화질',
            '플라즈마', '온도', '제어', '칠러', '냉각', '가열',
            '스크러버', '세정', '배기', '시스템', '장치', '방법',
            '촉매', '반응', '열교환', '파이프', '배관', '펌프',
            '제조', '설비', '모듈', '챔버', '전극', '방전'
        ];

        technicalTerms.forEach(term => {
            if (combinedText.includes(term)) {
                keywords.add(term);
            }
        });

        return Array.from(keywords).slice(0, 10); // 최대 10개
    }

    /**
     * 우선순위 점수 계산
     */
    calculatePriorityScore(patent) {
        let score = 5; // 기본 점수

        // 등록일자가 최근일수록 높은 점수
        if (patent.registration_date) {
            const regDate = new Date(patent.registration_date);
            const now = new Date();
            const yearsDiff = (now - regDate) / (1000 * 60 * 60 * 24 * 365);
            
            if (yearsDiff < 1) score += 3;
            else if (yearsDiff < 3) score += 2;
            else if (yearsDiff < 5) score += 1;
        }

        // 주요 카테고리에 속하면 가산점
        const priorityCategories = ['plasma', 'gas-treatment', 'scrubber'];
        if (priorityCategories.includes(patent.category)) {
            score += 1;
        }

        // 키워드가 많을수록 가산점
        if (patent.technical_keywords && patent.technical_keywords.length > 5) {
            score += 1;
        }

        return Math.min(10, Math.max(1, score)); // 1-10 범위로 제한
    }

    /**
     * JSON 데이터를 특허 객체로 변환
     */
    parsePatentFromJSON(jsonData) {
        try {
            // 모든 페이지의 텍스트 결합
            const fullText = jsonData.pages
                .map(page => page.text || '')
                .join('\n');

            // 첫 페이지 텍스트 (메타데이터 추출용)
            const firstPageText = jsonData.pages[0]?.text || '';

            // 기본 정보 추출
            const patentNumber = this.extractPatentNumber(firstPageText);
            const registrationDate = this.extractRegistrationDate(firstPageText);
            const applicationDate = this.extractApplicationDate(firstPageText);
            const inventors = this.extractInventors(firstPageText);
            const assignee = this.extractAssignee(firstPageText);
            const ipcClassification = this.extractIPCClassification(firstPageText);

            // 카테고리 및 기술 분야 분류
            const category = this.categorizePatent(jsonData.title, fullText);
            const technologyField = this.identifyTechnologyField(jsonData.title, fullText);
            const technicalKeywords = this.extractTechnicalKeywords(jsonData.title, fullText);

            // 요약 추출 (첫 500자)
            const abstract = fullText.substring(0, 500).trim() + (fullText.length > 500 ? '...' : '');

            // 이미지 개수 계산
            const imageCount = jsonData.pages.reduce((count, page) => {
                return count + (page.images ? page.images.length : 0);
            }, 0);

            // 특허 객체 생성
            const patent = {
                id: this.generatePatentId(jsonData.doc_id, patentNumber),
                doc_id: jsonData.doc_id,
                patent_number: patentNumber || 'Unknown',
                title: jsonData.title,
                abstract: abstract,
                category: category,
                technology_field: technologyField,
                registration_date: registrationDate,
                application_date: applicationDate,
                publication_date: registrationDate, // 공고일자를 등록일자로 사용
                status: this.determineStatus(registrationDate),
                inventors: inventors,
                assignee: assignee,
                priority_score: 5, // 임시 값, 나중에 계산
                technical_keywords: technicalKeywords,
                related_patents: [],
                main_claims: this.extractMainClaims(fullText),
                full_text: fullText,
                page_count: jsonData.pages.length,
                source_path: jsonData.source_path || '',
                extraction_date: jsonData.created_at || new Date().toISOString(),
                ipc_classification: ipcClassification,
                legal_status: 'registered',
                image_count: imageCount,
                vector_embedding_ready: false
            };

            // 우선순위 점수 계산
            patent.priority_score = this.calculatePriorityScore(patent);

            return patent;
        } catch (error) {
            console.error('특허 데이터 파싱 오류:', error);
            return null;
        }
    }

    /**
     * 특허 ID 생성
     */
    generatePatentId(docId, patentNumber) {
        if (patentNumber && patentNumber !== 'Unknown') {
            return `patent-${patentNumber.replace(/[^\d]/g, '')}`;
        }
        return `patent-${docId}`;
    }

    /**
     * 특허 상태 결정
     */
    determineStatus(registrationDate) {
        if (!registrationDate) return 'pending';

        const regDate = new Date(registrationDate);
        const now = new Date();
        const yearsDiff = (now - regDate) / (1000 * 60 * 60 * 24 * 365);

        // 한국 특허는 등록 후 20년간 유효
        if (yearsDiff > 20) return 'expired';
        return 'active';
    }

    /**
     * 주요 청구항 추출
     */
    extractMainClaims(fullText) {
        if (!fullText) return '';

        // 청구항 섹션 찾기
        const claimsPatterns = [
            /특허청구범위\s*【청구항\s*\d+】\s*([^【]+)/s,
            /청구항\s*\d+\s*】\s*([^【]+)/s,
            /【청구항\s*\d+】\s*([^【]+)/s
        ];

        for (const pattern of claimsPatterns) {
            const match = fullText.match(pattern);
            if (match && match[1]) {
                return match[1].trim().substring(0, 1000); // 첫 1000자
            }
        }

        return '';
    }

    /**
     * 여러 JSON 파일을 일괄 파싱
     */
    async parseMultiplePatents(jsonDataArray) {
        const patents = [];

        for (const jsonData of jsonDataArray) {
            const patent = this.parsePatentFromJSON(jsonData);
            if (patent) {
                patents.push(patent);
            }
        }

        console.log(`✅ ${patents.length}개 특허 데이터 파싱 완료`);
        return patents;
    }

    /**
     * 파싱 결과 검증
     */
    validatePatent(patent) {
        const errors = [];

        if (!patent.id) errors.push('ID 누락');
        if (!patent.title) errors.push('제목 누락');
        if (!patent.patent_number) errors.push('특허번호 누락');
        if (!patent.category) errors.push('카테고리 누락');

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * 통계 정보 생성
     */
    generateStatistics(patents) {
        const stats = {
            total: patents.length,
            byCategory: {},
            byStatus: {},
            byYear: {},
            avgPriorityScore: 0,
            totalPages: 0,
            totalImages: 0
        };

        patents.forEach(patent => {
            // 카테고리별 통계
            stats.byCategory[patent.category] = (stats.byCategory[patent.category] || 0) + 1;

            // 상태별 통계
            stats.byStatus[patent.status] = (stats.byStatus[patent.status] || 0) + 1;

            // 연도별 통계
            if (patent.registration_date) {
                const year = patent.registration_date.substring(0, 4);
                stats.byYear[year] = (stats.byYear[year] || 0) + 1;
            }

            // 우선순위 평균
            stats.avgPriorityScore += patent.priority_score;

            // 페이지 및 이미지 통계
            stats.totalPages += patent.page_count || 0;
            stats.totalImages += patent.image_count || 0;
        });

        stats.avgPriorityScore = (stats.avgPriorityScore / patents.length).toFixed(2);

        return stats;
    }
}

// 전역 인스턴스 생성
window.patentDataParser = new PatentDataParser();

console.log('✅ Patent Data Parser 로드 완료');
