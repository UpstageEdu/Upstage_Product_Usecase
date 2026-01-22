# 🏠 Boomerang 부동산 문서 정보 추출 데모

Upstage `information-extract` API로 등기부등본/계약서/건축물대장 PDF에서 핵심 정보를 추출하는 실습용 데모입니다.
처음 보는 사람도 바로 실행할 수 있도록 Docker/Node.js 실행 경로를 모두 제공합니다.

## 📌 목차
- [1. 프로젝트 개요](#1-프로젝트-개요)
- [2. 데모 시나리오](#2-데모-시나리오)
- [3. 주요 기능](#3-주요-기능)
- [4. 기술 스택](#4-기술-스택)
- [5. 빠른 시작](#5-빠른-시작)
- [6. 내 문서로 실행하기](#6-내-문서로-실행하기)
- [7. 프로젝트 구조](#7-프로젝트-구조)
- [8. 출력 예시](#8-출력-예시)
- [9. 주의사항 및 제한사항](#9-주의사항-및-제한사항)
- [10. 라이선스](#10-라이선스)
- [11. 참고 문서](#11-참고-문서)

## 1. 프로젝트 개요

> 부동산 계약 전 확인해야 할 문서(등기부등본/건축물대장/계약서)를 빠르게 구조화해
> 핵심 항목만 확인할 수 있도록 돕는 데모입니다.

- **문제**: PDF 문서는 복잡하고 항목 확인에 시간이 오래 걸림
- **해결**: JSON Schema로 필요한 필드만 지정하여 구조화된 결과를 반환
- **대상**: 문서 자동화/리스크 점검/데이터 파이프라인을 빠르게 실험해보고 싶은 실무자

## 2. 데모 시나리오
1. 등기부등본/계약서/건축물대장 PDF를 준비합니다.
2. Upstage API로 문서를 분석합니다.
3. 주소, 발급일, 용도, 면적 등 핵심 정보를 구조화해 출력합니다.

## 3. 주요 기능
- JSON Schema 기반 필드 추출
- 단일 문서 분석 (`index.js`)
- 샘플 문서 3종 일괄 분석 (`sample_documents/analyze-sample-documents.js`)
- 웹 업로드 페이지 (`server.ts`)
- Docker/Node.js 실행 지원
- Docker Hub 이미지 제공
- 개인정보 제외 스키마 예시 제공 (샘플 스크립트 기준)

## 4. 기술 스택
- **Runtime**: Node.js 18+ (fetch 내장)
- **문서 추출**: Upstage `information-extract` API
- **언어/실행**: TypeScript (`server.ts`), JavaScript (`index.js`)
- **컨테이너**: Docker, docker-compose

## 5. 빠른 시작

### 5.1 Upstage API 키 준비
- [Upstage Console](https://console.upstage.ai/)에서 API 키 발급
- 웹 페이지에서는 실행 중 직접 입력 (환경변수 설정 불필요)

### 5.2 Docker로 실행 (권장)
#### 5.2.1 Docker Hub 이미지로 바로 실행
- Docker Hub: https://hub.docker.com/r/koriai/hmh_boomerang_uie_example

```bash
docker pull koriai/hmh_boomerang_uie_example:latest
docker run --rm -p 3000:8080 koriai/hmh_boomerang_uie_example:latest
```

- 실행 후 `http://localhost:3000`에서 PDF 업로드 페이지를 확인합니다.
- API 키는 페이지에서 직접 입력하면 됩니다. (`.env` 불필요)
- 종료는 `Ctrl+C`로 합니다. (백그라운드 실행 시 `docker stop <컨테이너명>`)

#### 5.2.2 소스에서 로컬 빌드 실행 (docker-compose)
```bash
# 프로젝트 루트에서
docker-compose up --build
```

- 실행 후 `http://localhost:3000`에서 PDF 업로드 페이지를 확인합니다.
- API 키는 페이지에서 직접 입력하면 됩니다. (`.env` 불필요)
- 실행이 끝나면 아래 명령으로 종료합니다.
```bash
docker-compose down
```

자동으로 브라우저를 열고 싶다면 (백그라운드 실행 후 오픈):
```bash
docker-compose up --build -d && sleep 1 && open http://localhost:3000
```

### 5.3 Node.js로 실행 (CLI)
요구사항: Node.js 18+ (fetch 내장)

```bash
# 의존성 설치
npm install

export UPSTAGE_API_KEY="YOUR_KEY"

# 샘플 문서 3종 분석
node sample_documents/analyze-sample-documents.js

# 단일 문서 분석 (경로 직접 지정)
node index.js ./sample_documents/등본.pdf
```

`index.js` 기본 경로는 `./sample-pdfs/registry.pdf`로 설정되어 있으므로 실제 파일 경로를 인자로 넘겨주세요.

웹 업로드 페이지를 로컬에서 실행하려면:
```bash
npm install
npm run start:web
```
자동으로 브라우저를 열려면 (macOS):
```bash
npm run start:web:open
```

## 6. 내 문서로 실행하기
- PDF를 원하는 위치에 두고 경로를 인자로 전달합니다.
  - 예: `node index.js /path/to/your.pdf`
- 웹 페이지에서 직접 업로드할 수도 있습니다. (`http://localhost:3000`)
- 샘플 일괄 스크립트를 쓰고 싶다면 `sample_documents/analyze-sample-documents.js`의 `DOCUMENTS` 배열에 파일 경로를 추가합니다.
- 개인정보가 포함된 문서는 커밋하지 마세요. 필요 시 `.gitignore`에 제외 규칙을 추가하는 것을 권장합니다.

## 7. 프로젝트 구조
```
HmH_Boomerang_real_estate_analysis/
├── README.md
├── PIPELINE.md
├── index.js
├── server.ts
├── package.json
├── Dockerfile
├── docker-compose.yml
├── boomerang-sample-flowchart.png
├── sample_documents/
│   ├── README.md
│   ├── analyze-sample-documents.js
│   ├── 건축물대장.pdf
│   ├── 계약서.pdf
│   └── 등본.pdf
└── Boomerang-server/
    ├── README.md
    └── MIGRATION_SPEC.md
```

## 8. 출력 예시
```text
[registry] ./sample_documents/등본.pdf
{
  "issue_date": "2024-12-26",
  "main_usage": "아파트",
  "exclusive_area": "84.50",
  "land_right": true,
  "rights_active_count": 1
}
```

## 9. 주의사항 및 제한사항
- **API 키 필수**: 웹 페이지 입력 또는 CLI 실행 시 환경 변수로 설정해야 합니다.
- **파일 크기**: 50MB 이하 권장 (대용량은 타임아웃 가능)
- **문서 품질**: 스캔 품질이 낮으면 추출 정확도가 떨어질 수 있습니다.
- **.env 자동 로드**: Node.js CLI 실행 시 `.env`는 자동 로드되지 않습니다.
- **개인정보**: 샘플 스크립트는 개인정보를 비워 반환하도록 설계되어 있습니다.

## 10. 라이선스
- CC BY-NC-SA 4.0
- 저작권자: HmH (Kim Hyun Jin)

## 11. 참고 문서
- `PIPELINE.md`: `index.js` 파이프라인 단계별 설명
- `sample_documents/README.md`: 샘플 문서 사용 가이드
- `Boomerang-server/README.md`: API 서버 프로젝트
- `Boomerang-server/MIGRATION_SPEC.md`: 등기부 파싱 마이그레이션 명세
