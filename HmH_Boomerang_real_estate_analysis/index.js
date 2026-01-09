// SPDX-License-Identifier: MIT
// Copyright (c) 2024 HmH (Kim Hyun Jin)
// Upstage information-extract 최소 샘플 코드
import { readFileSync } from 'fs';

/**
 * Upstage information-extract API 호출
 * @param {Buffer} pdfBuffer - PDF 파일 버퍼
 * @param {string} apiKey - Upstage API 키
 * @returns {Promise<Object>} 추출된 데이터
 */
async function extractWithUniversalExtraction(pdfBuffer, apiKey) {
  // PDF를 Base64로 인코딩
  const base64Pdf = pdfBuffer.toString('base64');

  // API 요청 바디 구성
  const requestBody = {
    model: 'information-extract',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:application/pdf;base64,${base64Pdf}`
            }
          }
        ]
      }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'RegistryExtraction',
        schema: {
          type: 'object',
          properties: {
            // 주소
            building_address: {
              type: 'string',
              description: '건물 소재지 (도로명 주소)'
            },
            // 소유자 이름
            owner_name: {
              type: 'string',
              description: '소유자 성명'
            },
            // 발급일
            issue_date: {
              type: 'string',
              description: '발급일자 (YYYY-MM-DD)'
            },
            // 주 용도
            main_usage: {
              type: 'string',
              description: '건물 주 용도 (예: 아파트, 단독주택)'
            },
            // 전유 면적
            exclusive_area: {
              type: 'string',
              description: '전유 면적 (제곱미터)'
            }
          },
          required: ['building_address', 'owner_name', 'issue_date', 'main_usage', 'exclusive_area'],
          additionalProperties: false
        }
      }
    }
  };

  console.log('📤 Upstage API 호출 중...');
  console.log(`   - PDF 크기: ${pdfBuffer.length} bytes`);

  // API 호출
  const response = await fetch('https://api.upstage.ai/v1/information-extraction', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API 호출 실패 (${response.status}): ${errorText}`);
  }

  const result = await response.json();

  // 응답에서 JSON 추출
  const content = result.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('응답에 content가 없습니다');
  }

  console.log('✅ API 호출 성공');
  console.log(`   - 사용 토큰: ${result.usage?.total_tokens || 'N/A'}`);

  return JSON.parse(content);
}

/**
 * 메인 실행 함수
 */
async function main() {
  // 환경변수에서 API 키 가져오기
  const apiKey = process.env.UPSTAGE_API_KEY;
  if (!apiKey) {
    console.error('❌ UPSTAGE_API_KEY 환경변수가 설정되지 않았습니다');
    process.exit(1);
  }

  // PDF 파일 경로 (예시)
  const pdfPath = process.argv[2] || './sample-pdfs/registry.pdf';

  try {
    console.log(`📄 PDF 파일 읽기: ${pdfPath}`);
    const pdfBuffer = readFileSync(pdfPath);

    // API 호출 및 데이터 추출
    const extractedData = await extractWithUniversalExtraction(pdfBuffer, apiKey);

    // 결과 출력
    console.log('\n📊 추출된 정보:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🏠 건물 주소: ${extractedData.building_address}`);
    console.log(`👤 소유자: ${extractedData.owner_name}`);
    console.log(`📅 발급일: ${extractedData.issue_date}`);
    console.log(`🏢 용도: ${extractedData.main_usage}`);
    console.log(`📐 면적: ${extractedData.exclusive_area}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // JSON 전체 출력
    console.log('📋 전체 JSON:');
    console.log(JSON.stringify(extractedData, null, 2));

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    process.exit(1);
  }
}

// 실행
main();
