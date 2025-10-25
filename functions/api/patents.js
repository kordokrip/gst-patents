/**
 * Cloudflare Pages Function - D1 특허 API
 * GET /api/patents - 특허 목록 조회
 */

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    
    // CORS 헤더
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
    };
    
    // OPTIONS 요청 처리 (CORS preflight)
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }
    
    try {
        // 쿼리 파라미터
        const limit = parseInt(url.searchParams.get('limit') || '100');
        const offset = parseInt(url.searchParams.get('offset') || '0');
        const category = url.searchParams.get('category');
        const status = url.searchParams.get('status');
        const search = url.searchParams.get('q');
        
        // D1 데이터베이스 접근
        const db = env.DB || env.gst_patents_db;
        
        if (!db) {
            console.error('❌ D1 database binding not found');
            return new Response(JSON.stringify({
                success: false,
                error: 'Database not configured',
                data: []
            }), {
                status: 500,
                headers: corsHeaders
            });
        }
        
        // SQL 쿼리 빌드
        let query = 'SELECT * FROM patents WHERE 1=1';
        const params = [];
        
        if (category) {
            query += ' AND category = ?';
            params.push(category);
        }
        
        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }
        
        if (search) {
            query += ' AND (title LIKE ? OR abstract LIKE ? OR patent_number LIKE ?)';
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }
        
        // 정렬 및 페이징
        query += ' ORDER BY id LIMIT ? OFFSET ?';
        params.push(limit, offset);
        
        console.log('🔍 D1 쿼리:', query);
        console.log('📋 파라미터:', params);
        
        // D1 쿼리 실행
        const { results } = await db.prepare(query).bind(...params).all();
        
        console.log(`✅ ${results.length}개 특허 조회 완료`);
        
        // 응답 반환
        return new Response(JSON.stringify({
            success: true,
            data: results,
            count: results.length,
            params: {
                limit,
                offset,
                category,
                status,
                search
            }
        }), {
            headers: corsHeaders
        });
        
    } catch (error) {
        console.error('❌ D1 쿼리 실패:', error);
        
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
            stack: error.stack,
            data: []
        }), {
            status: 500,
            headers: corsHeaders
        });
    }
}
