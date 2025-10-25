-- 관리자 및 데모 사용자 비밀번호 업데이트
-- 관리자: GST2025!@Admin
-- 데모: Demo1234!@

UPDATE users 
SET password_hash = '4fc03d426a56c2a9e857eaa9a5b3f3e1ef49e887c21981748635ab073a143212'
WHERE email = 'shkang@gst-in.com';

UPDATE users 
SET password_hash = '572b81540a039633413f7e96225c81f0d725b136cfa90bf2d8ff9db11faf77ee'
WHERE email = 'demo@gst-in.com';
