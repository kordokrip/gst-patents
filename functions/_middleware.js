/**
 * Cloudflare Workers API for GST Patents
 * D1 데이터베이스를 활용한 특허 검색 및 관리
 */

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // JavaScript 파일 직접 서빙 (Content-Type 강제)
  if (path.endsWith('.js') || path.startsWith('/js/')) {
    try {
      const response = await next();
      
      // 새로운 응답 생성 (Content-Type 강제)
      const newResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          ...Object.fromEntries(response.headers),
          'Content-Type': 'application/javascript; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Content-Type-Options': 'nosniff',
        },
      });
      
      return newResponse;
    } catch (error) {
      console.error('JS file serving error:', error);
      return next();
    }
  }

  // 정적 파일 요청은 middleware 건너뛰기
  const staticExtensions = ['.css', '.json', '.html', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.pdf'];
  const staticPaths = ['/css/', '/images/', '/assets/', '/fonts/', '/data/', '/db/', '/pdf/', '/pages/'];
  
  const isStaticFile = staticExtensions.some(ext => path.endsWith(ext)) || 
                       staticPaths.some(prefix => path.startsWith(prefix)) ||
                       path === '/sw.js' || 
                       path === '/manifest.json' ||
                       path === '/favicon.ico' ||
                       path === '/robots.txt';
  
  if (isStaticFile) {
    // 정적 파일은 middleware를 우회하고 직접 서빙
    return next();
  }

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
      console.log('📡 API 요청:', path, request.method);
      return handlePatentsAPI(request, env, corsHeaders);
    } else if (path.startsWith('/api/search')) {
      console.log('🔍 검색 API 요청:', path);
      return handleSearchAPI(request, env, corsHeaders);
    } else if (path.startsWith('/api/stats')) {
      console.log('📊 통계 API 요청:', path);
      return handleStatsAPI(request, env, corsHeaders);
    } else if (path.startsWith('/api/auth')) {
      return handleAuthAPI(request, env, corsHeaders);
    } else if (path.startsWith('/api/health')) {
      return new Response(JSON.stringify({ status: 'ok', timestamp: Date.now() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 다른 요청은 다음 핸들러로 전달
    return next();
  } catch (error) {
    console.error('❌ Middleware 에러:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }), {
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

/**
 * 인증 API 핸들러
 */
async function handleAuthAPI(request, env, corsHeaders) {
  const url = new URL(request.url);
  const path = url.pathname;

  try {
    // 회원가입 신청
    if (path === '/api/auth/register' && request.method === 'POST') {
      const { email, password, name, company, reason } = await request.json();

      // 이메일 도메인 검증
      if (!email.endsWith('@gst-in.com')) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: '@gst-in.com 이메일만 가입할 수 있습니다.' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 비밀번호 강도 검증 (8자 이상, 영문/숫자/특수문자 포함)
      const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
      if (!passwordRegex.test(password)) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: '비밀번호는 8자 이상이며 영문, 숫자, 특수문자를 모두 포함해야 합니다.' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 간단한 해시 생성 (실제 배포 시 bcrypt 사용 권장)
      const passwordHash = await simpleHash(password);

      // 중복 확인
      const existingUser = await env.DB.prepare(
        'SELECT email FROM users WHERE email = ?'
      ).bind(email).first();

      const existingPending = await env.DB.prepare(
        'SELECT email FROM pending_registrations WHERE email = ? AND status = "pending"'
      ).bind(email).first();

      if (existingUser || existingPending) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: '이미 등록된 이메일이거나 승인 대기 중입니다.' 
        }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 가입 신청 저장
      await env.DB.prepare(`
        INSERT INTO pending_registrations (email, password_hash, name, company, reason)
        VALUES (?, ?, ?, ?, ?)
      `).bind(email, passwordHash, name, company || '', reason || '').run();

      return new Response(JSON.stringify({ 
        success: true, 
        message: '가입 신청이 완료되었습니다. 관리자 승인을 기다려주세요.' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 로그인
    if (path === '/api/auth/login' && request.method === 'POST') {
      const { email, password } = await request.json();

      const user = await env.DB.prepare(
        'SELECT * FROM users WHERE email = ? AND status = "active"'
      ).bind(email).first();

      if (!user) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: '이메일 또는 비밀번호가 올바르지 않습니다.' 
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 비밀번호 검증
      const passwordHash = await simpleHash(password);
      if (passwordHash !== user.password_hash) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: '이메일 또는 비밀번호가 올바르지 않습니다.' 
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 마지막 로그인 시간 업데이트
      await env.DB.prepare(
        'UPDATE users SET last_login_at = datetime("now") WHERE id = ?'
      ).bind(user.id).run();

      return new Response(JSON.stringify({ 
        success: true, 
        user: {
          email: user.email,
          name: user.name,
          company: user.company,
          role: user.role
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 승인 대기 목록 조회 (관리자 전용)
    if (path === '/api/auth/pending' && request.method === 'GET') {
      const authHeader = request.headers.get('Authorization');
      const adminEmail = authHeader?.replace('Bearer ', '');

      // 관리자 권한 확인
      const admin = await env.DB.prepare(
        'SELECT role FROM users WHERE email = ? AND role = "admin" AND status = "active"'
      ).bind(adminEmail).first();

      if (!admin) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: '관리자 권한이 필요합니다.' 
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const pending = await env.DB.prepare(`
        SELECT id, email, name, company, reason, created_at 
        FROM pending_registrations 
        WHERE status = 'pending'
        ORDER BY created_at DESC
      `).all();

      return new Response(JSON.stringify({ 
        success: true, 
        pending: pending.results 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 가입 승인/거부 (관리자 전용)
    if (path === '/api/auth/approve' && request.method === 'POST') {
      const authHeader = request.headers.get('Authorization');
      const adminEmail = authHeader?.replace('Bearer ', '');
      const { id, action, rejectReason } = await request.json();

      // 관리자 권한 확인
      const admin = await env.DB.prepare(
        'SELECT email FROM users WHERE email = ? AND role = "admin" AND status = "active"'
      ).bind(adminEmail).first();

      if (!admin) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: '관리자 권한이 필요합니다.' 
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 신청 정보 조회
      const registration = await env.DB.prepare(
        'SELECT * FROM pending_registrations WHERE id = ? AND status = "pending"'
      ).bind(id).first();

      if (!registration) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: '해당 신청을 찾을 수 없습니다.' 
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (action === 'approve') {
        // 사용자 계정 생성
        await env.DB.prepare(`
          INSERT INTO users (email, password_hash, name, company, role, status)
          VALUES (?, ?, ?, ?, 'user', 'active')
        `).bind(
          registration.email, 
          registration.password_hash, 
          registration.name, 
          registration.company
        ).run();

        // 신청 상태 업데이트
        await env.DB.prepare(`
          UPDATE pending_registrations 
          SET status = 'approved', processed_at = datetime('now'), processed_by = ?
          WHERE id = ?
        `).bind(adminEmail, id).run();

        return new Response(JSON.stringify({ 
          success: true, 
          message: '가입이 승인되었습니다.' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else if (action === 'reject') {
        // 신청 거부
        await env.DB.prepare(`
          UPDATE pending_registrations 
          SET status = 'rejected', processed_at = datetime('now'), processed_by = ?, reject_reason = ?
          WHERE id = ?
        `).bind(adminEmail, rejectReason || '관리자에 의해 거부됨', id).run();

        return new Response(JSON.stringify({ 
          success: true, 
          message: '가입이 거부되었습니다.' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
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
 * 간단한 비밀번호 해싱 (SHA-256)
 * 실제 프로덕션에서는 bcrypt 사용 권장
 */
async function simpleHash(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}
