# Node.js 공식 이미지 (최소 크기)
FROM node:20-alpine

# 작업 디렉토리 설정
WORKDIR /app

# package.json 및 package-lock.json 복사 (캐시 활용)
COPY package*.json ./

# 의존성 설치
RUN npm install --omit=dev

# 소스 코드 및 기타 파일 복사
COPY . .

# 서버 포트
ENV PORT=3000
EXPOSE 3000

# 웹 서버 실행
CMD ["npm", "run", "start:web"]
