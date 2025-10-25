/**
 * Cloudflare Workers API for GST Patents
 * D1 데이터베이스를 활용한 특허 검색 및 관리
 */

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // CORS 헤더
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // OPTIONS 요청 처리
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // API 라우팅
    if (path.startsWith('/api/patents')) {
      return handlePatentsAPI(request, env, corsHeaders);
    } else if (path.startsWith('/api/search')) {
      return handleSearchAPI(request, env, corsHeaders);
    } else if (path.startsWith('/api/stats')) {
      return handleStatsAPI(request, env, corsHeaders);
    } else if (path.startsWith('/api/health')) {
      return new Response(JSON.stringify({ status: 'ok', timestamp: Date.now() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // API 경로가 아니면 정적 파일로 처리
    return env.ASSETS.fetch(request);
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

/**
 * 특허 목록 및 상세 조회 API
 */
async function handlePatentsAPI(request, env, corsHeaders) {
  const url = new URL(request.url);
  const patentId = url.searchParams.get('id');
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const category = url.searchParams.get('category');
  const status = url.searchParams.get('status');

  const { DB } = env;

  try {
    // 특정 특허 상세 조회
    if (patentId) {
      const patent = await DB.prepare(
        'SELECT * FROM patents WHERE id = ?'
      ).bind(patentId).first();

      if (!patent) {
        return new Response(JSON.stringify({ error: 'Patent not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 발명자 정보 조회
      const inventors = await DB.prepare(
        'SELECT name FROM patent_inventors WHERE patent_id = ?'
      ).bind(patentId).all();

      // 키워드 정보 조회
      const keywords = await DB.prepare(
        'SELECT keyword FROM patent_keywords WHERE patent_id = ?'
      ).bind(patentId).all();

      const result = {
        ...patent,
        inventors: inventors.results.map(i => i.name),
        keywords: keywords.results.map(k => k.keyword),
      };

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 특허 목록 조회 (페이지네이션, 필터링)
    let query = 'SELECT id, patent_number, title, abstract, category, technology_field, registration_date, status, assignee, priority_score FROM patents WHERE 1=1';
    const params = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY registration_date DESC LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);

    const { results } = await DB.prepare(query).bind(...params).all();

    // 전체 카운트 조회
    let countQuery = 'SELECT COUNT(*) as total FROM patents WHERE 1=1';
    const countParams = [];

    if (category) {
      countQuery += ' AND category = ?';
      countParams.push(category);
    }

    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }

    const { total } = await DB.prepare(countQuery).bind(...countParams).first();

    return new Response(JSON.stringify({
      data: results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

/**
 * 특허 검색 API (전체 텍스트 검색)
 */
async function handleSearchAPI(request, env, corsHeaders) {
  const url = new URL(request.url);
  const query = url.searchParams.get('q') || '';
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');

  if (!query.trim()) {
    return new Response(JSON.stringify({ error: 'Search query is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { DB } = env;

  try {
    // FTS5 전체 텍스트 검색
    const searchQuery = `
      SELECT 
        p.id, p.patent_number, p.title, p.abstract, 
        p.category, p.technology_field, p.registration_date, 
        p.status, p.assignee, p.priority_score
      FROM patent_search ps
      JOIN patents p ON ps.rowid = p.rowid
      WHERE patent_search MATCH ?
      ORDER BY rank
      LIMIT ? OFFSET ?
    `;

    const { results } = await DB.prepare(searchQuery)
      .bind(query, limit, (page - 1) * limit)
      .all();

    // 검색 결과 카운트
    const countQuery = `
      SELECT COUNT(*) as total
      FROM patent_search
      WHERE patent_search MATCH ?
    `;
    const { total } = await DB.prepare(countQuery).bind(query).first();

    return new Response(JSON.stringify({
      query,
      data: results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

/**
 * 통계 API
 */
async function handleStatsAPI(request, env, corsHeaders) {
  const { DB } = env;

  try {
    // 전체 통계
    const totalPatents = await DB.prepare('SELECT COUNT(*) as count FROM patents').first();
    
    // 카테고리별 통계
    const categoryStats = await DB.prepare(`
      SELECT category, COUNT(*) as count 
      FROM patents 
      GROUP BY category
      ORDER BY count DESC
    `).all();

    // 상태별 통계
    const statusStats = await DB.prepare(`
      SELECT status, COUNT(*) as count 
      FROM patents 
      GROUP BY status
      ORDER BY count DESC
    `).all();

    // 연도별 등록 통계
    const yearStats = await DB.prepare(`
      SELECT 
        substr(registration_date, 1, 4) as year,
        COUNT(*) as count
      FROM patents
      WHERE registration_date IS NOT NULL
      GROUP BY year
      ORDER BY year DESC
      LIMIT 10
    `).all();

    return new Response(JSON.stringify({
      total: totalPatents.count,
      byCategory: categoryStats.results,
      byStatus: statusStats.results,
      byYear: yearStats.results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
