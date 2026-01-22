# 데모 구현 방식 요약

이 문서는 Upstage Document AI와 Solar LLM, RAG를 조합한 지능형 문서 처리 데모의 구현 방식을 요약합니다.
프로젝트 설계/구현을 빠르게 파악하기 위한 참고 문서이며, 세부 코드는 실제 레포 구성에 맞게 조정합니다.

## 1. 개요
본 데모는 복합 PDF 문서를 신속하게 분석하고, RAG 기반 질의응답을 제공하는 문서 처리 플랫폼입니다.
사용자는 문서 업로드, 자연어 질문, 실시간 대화를 통해 문서 컨텍스트를 탐색할 수 있습니다.

## 2. 시스템 아키텍처
시스템은 3개의 핵심 파이프라인으로 구성됩니다.

### 2.1 문서 처리 파이프라인
- PDF 업로드
- Document Parse API로 텍스트 추출
- Solar LLM 요약
- 한국어 번역(필요 시)
- 세션별 텍스트 저장 및 대화 맥락 유지

이미지 기반 PDF는 OCR 자동 감지 및 처리를 수행합니다.

### 2.2 RAG 검색 파이프라인
- 데이터 로드
- Solar LLM 요약
- LangChain 청킹
- 해시 기반 캐싱
- Solar Embedding 생성
- FAISS 벡터 저장
- 사용자 질문 시 유사 문서 Top-3 추출
- 검색 결과 한국어 번역

### 2.3 통합 응답 생성
- LLM이 RAG 필요성을 자동 판단
- 검색 결과 + 업로드된 PDF 내용을 결합
- 스트리밍 응답으로 실시간 피드백 제공

## 3. 주요 기능
### 3.1 3가지 사용 케이스
- PDF만 업로드: PDF 요약 + 유사 보고서 검색
- 텍스트만 입력: 질문에 대한 답변 제공
- PDF + 텍스트: 문서 기반 맞춤 답변

### 3.2 사용자 인터페이스
- PDF 드래그 앤 드롭 업로드
- 자연어 질문 입력창
- 옵션 체크박스: Force OCR, Streaming Response, Use RAG
- 사이드바 세션 관리 및 대화 히스토리
- 처리 상태 표시 및 단계별 진행률

## 4. 시스템 요구사항
- Python 3.8 이상
- Windows, macOS, Linux 지원
- 메모리 4GB 이상 (대용량 문서 처리 시 8GB 권장)
- 저장공간 2GB 이상

## 5. 설치 및 실행
### 5.1 환경 설정
```bash
git clone [repository_url]
cd Upstage_Product_UseCase2
pip install -r requirements.txt
```

### 5.2 환경 변수 설정
`.env` 파일을 생성하고 다음 내용을 추가합니다.
```bash
UPSTAGE_API_KEY=your_upstage_api_key_here
UPSTAGE_API_URL=https://api.upstage.ai/v1
RAG_ENDPOINT=http://localhost:8000/query
```

### 5.3 애플리케이션 실행
```bash
streamlit run main.py
```

### 5.4 브라우저 접속
자동으로 열리는 로컬 URL(일반적으로 `http://localhost:8501`)에서 접속합니다.

## 6. 사용 방법
### 6.1 메인 인터페이스
- PDF 업로드 (10MB 제한)
- 메시지 입력창에 질문 입력
- 옵션 체크박스로 OCR/스트리밍/RAG 사용 여부 선택
- 사이드바에서 세션 관리 및 대화 히스토리 확인

### 6.2 처리 상태 표시
- PDF 분석 진행률 표시
- RAG 검색 단계별 상태 업데이트
- 실시간 응답 스트리밍

## 7. 파일 구조 예시(시나리오 기준)
### 케이스 1: PDF만 업로드
- PDF 텍스트 추출 및 요약 생성
- 유사 보고서/문서 검색 (RAG API 활용)
- 문서 분석 결과 표시

### 케이스 2: 텍스트만 입력
- 질문에 대한 답변 생성
- RAG API를 통한 관련 정보 검색
- 참고 자료 제공

### 케이스 3: PDF + 텍스트
- 업로드된 문서 내용 분석
- 문서 기반 맞춤 답변 생성
- 추가 참고 자료 제공

## 8. 기술 스택
- Frontend: Streamlit
- PDF 처리: Upstage Document AI
- LLM: Upstage Solar LLM
- 임베딩: Solar Embedding
- 텍스트 처리: LangChain
- 벡터 검색: FAISS
- RAG: 커스텀 RAG 시스템

## 9. 주의사항
1. API 키 설정
   - Upstage API 키를 `.env` 파일에 정확히 설정
   - 사용량 제한(Document Parse, Solar LLM, Solar Embedding) 확인
2. 문서 처리 제한사항
   - PDF 파일 크기: 최대 10MB
   - 이미지 기반 PDF의 경우 OCR 처리 시간 증가 (1-5분)
   - 한 번에 하나의 PDF만 처리 가능
3. 성능 최적화
   - 임베딩 캐시 활용으로 재처리 시간 단축
   - 벡터 DB는 세션별 관리
   - 대화 히스토리는 5개 이상 누적 시 자동 저장
4. 메모리 관리
   - 대용량 문서 처리 시 충분한 메모리 확보
   - 세션 변경 시 이전 데이터 자동 정리
   - 캐시 파일 정기적 관리 권장
5. 언어 지원
   - 한국어-영어 자동 번역 지원
   - 다국어 문서 처리 시 시간 증가 가능
   - 번역 품질은 Solar LLM 성능에 의존
