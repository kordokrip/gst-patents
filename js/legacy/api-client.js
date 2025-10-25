/**
 * API Configuration for GST Patents
 * Cloudflare D1 연동 설정
 */

const API_CONFIG = {
    // 프로덕션 환경 (Cloudflare Pages + D1)
    production: {
        baseURL: 'https://gst-patents.com',
        endpoints: {
            patents: '/api/patents',
            search: '/api/search',
            stats: '/api/stats',
            health: '/api/health',
        },
        useD1: true,
    },
    
    // 개발 환경 (로컬 JSON)
    development: {
        baseURL: '',
        endpoints: {
            localDB: '/data/patents-index.json',
        },
        useD1: false,
    },
    
    // 현재 환경 감지
    get current() {
        // 도메인이 gst-patents.com이면 프로덕션
        if (window.location.hostname === 'gst-patents.com' || 
            window.location.hostname.endsWith('.pages.dev')) {
            return this.production;
        }
        return this.development;
    },
};

// API 클라이언트
class PatentAPI {
    constructor() {
        this.config = API_CONFIG.current;
        this.baseURL = this.config.baseURL;
    }

    /**
     * 특허 목록 조회
     */
    async getPatents({ page = 1, limit = 20, category = '', status = '' } = {}) {
        if (!this.config.useD1) {
            // 로컬 JSON 폴백
            return this._loadLocalDB();
        }

        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
        });

        if (category) params.append('category', category);
        if (status) params.append('status', status);

        const response = await fetch(
            `${this.baseURL}${this.config.endpoints.patents}?${params}`
        );

        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * 특허 상세 조회
     */
    async getPatentById(id) {
        if (!this.config.useD1) {
            const data = await this._loadLocalDB();
            return data.patents?.find(p => p.id === id) || null;
        }

        const response = await fetch(
            `${this.baseURL}${this.config.endpoints.patents}?id=${encodeURIComponent(id)}`
        );

        if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error(`API Error: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * 특허 검색
     */
    async search(query, { page = 1, limit = 20 } = {}) {
        if (!this.config.useD1) {
            // 로컬 JSON에서 간단한 검색
            const data = await this._loadLocalDB();
            const filtered = data.patents?.filter(p =>
                p.title?.toLowerCase().includes(query.toLowerCase()) ||
                p.abstract?.toLowerCase().includes(query.toLowerCase()) ||
                p.patent_number?.includes(query)
            ) || [];

            const start = (page - 1) * limit;
            const paginatedResults = filtered.slice(start, start + limit);

            return {
                query,
                data: paginatedResults,
                pagination: {
                    page,
                    limit,
                    total: filtered.length,
                    totalPages: Math.ceil(filtered.length / limit),
                },
            };
        }

        const params = new URLSearchParams({
            q: query,
            page: page.toString(),
            limit: limit.toString(),
        });

        const response = await fetch(
            `${this.baseURL}${this.config.endpoints.search}?${params}`
        );

        if (!response.ok) {
            throw new Error(`Search API Error: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * 통계 조회
     */
    async getStats() {
        if (!this.config.useD1) {
            const data = await this._loadLocalDB();
            return this._calculateLocalStats(data.patents || []);
        }

        const response = await fetch(
            `${this.baseURL}${this.config.endpoints.stats}`
        );

        if (!response.ok) {
            throw new Error(`Stats API Error: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Health Check
     */
    async checkHealth() {
        if (!this.config.useD1) {
            return { status: 'ok', mode: 'local' };
        }

        const response = await fetch(
            `${this.baseURL}${this.config.endpoints.health}`
        );

        return response.json();
    }

    /**
     * 로컬 JSON DB 로드 (폴백)
     */
    async _loadLocalDB() {
        try {
            const response = await fetch('/data/patents-index.json', {
                cache: 'no-store',
            });
            
            if (!response.ok) {
                throw new Error('Local DB not found');
            }

            return response.json();
        } catch (error) {
            console.error('Failed to load local DB:', error);
            return { patents: [] };
        }
    }

    /**
     * 로컬 데이터 통계 계산
     */
    _calculateLocalStats(patents) {
        const byCategory = {};
        const byStatus = {};
        const byYear = {};

        patents.forEach(p => {
            // 카테고리별
            byCategory[p.category] = (byCategory[p.category] || 0) + 1;

            // 상태별
            byStatus[p.status] = (byStatus[p.status] || 0) + 1;

            // 연도별
            if (p.registration_date) {
                const year = p.registration_date.substring(0, 4);
                byYear[year] = (byYear[year] || 0) + 1;
            }
        });

        return {
            total: patents.length,
            byCategory: Object.entries(byCategory).map(([category, count]) => ({
                category,
                count,
            })),
            byStatus: Object.entries(byStatus).map(([status, count]) => ({
                status,
                count,
            })),
            byYear: Object.entries(byYear)
                .map(([year, count]) => ({ year, count }))
                .sort((a, b) => b.year - a.year)
                .slice(0, 10),
        };
    }
}

// 전역 API 인스턴스
window.patentAPI = new PatentAPI();

console.log('🚀 Patent API initialized:', window.patentAPI.config.useD1 ? 'D1 Mode' : 'Local Mode');
