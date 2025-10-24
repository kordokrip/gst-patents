# 🔒 환경 변수 보안 가이드

## ⚠️ 중요: API 키 보안

이 프로젝트는 민감한 API 키를 사용합니다. **절대로 실제 API 키를 Git에 커밋하지 마세요!**

## 📋 설정 방법

### 1. 환경 변수 파일 생성

```bash
# .env.example을 복사하여 .env 파일 생성
cp .env.example .env
```

### 2. API 키 입력

`.env` 파일을 열어서 실제 API 키로 변경:

```bash
# OpenAI API 키 (https://platform.openai.com/api-keys)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Pinecone API 키 (https://app.pinecone.io/)
PINECONE_API_KEY=pcsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3. 권한 설정 (선택사항)

```bash
# .env 파일 권한을 600으로 설정 (소유자만 읽기/쓰기)
chmod 600 .env
```

## 🔐 보안 체크리스트

- [x] `.gitignore`에 `.env` 추가됨
- [x] `.env.example`만 Git에 커밋
- [ ] 실제 `.env` 파일은 로컬에만 존재
- [ ] API 키는 팀원들과 안전한 방법으로만 공유 (1Password, Bitwarden 등)

## 🚨 API 키가 노출된 경우

만약 실수로 API 키를 Git에 커밋했다면:

1. **즉시 해당 API 키를 폐기하고 재발급**
   - OpenAI: https://platform.openai.com/api-keys
   - Pinecone: https://app.pinecone.io/

2. **Git 히스토리에서 제거**
   ```bash
   # BFG Repo-Cleaner 사용 (권장)
   brew install bfg
   bfg --delete-files .env
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   git push --force
   ```

3. **GitHub Secret Scanning 알림 확인**
   - Repository → Settings → Code security and analysis
   - Secret scanning alerts 확인 및 조치

## 📌 Cloudflare Pages 환경 변수 설정

배포 시 환경 변수는 Cloudflare Pages 대시보드에서 설정:

1. Cloudflare Pages 프로젝트 선택
2. Settings → Environment variables
3. 각 변수 추가:
   - Variable name: `OPENAI_API_KEY`
   - Value: `sk-proj-xxxxx...`
   - Environment: `Production` 또는 `Preview`
4. Save 클릭

## 🔗 관련 문서

- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [OpenAI API 보안 가이드](https://platform.openai.com/docs/guides/safety-best-practices)
- [Cloudflare Pages 환경 변수](https://developers.cloudflare.com/pages/platform/build-configuration/#environment-variables)
