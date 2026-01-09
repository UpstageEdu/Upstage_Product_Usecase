// SPDX-License-Identifier: MIT
// Copyright (c) 2024 HmH (Kim Hyun Jin)
import express from 'express';
import multer from 'multer';

const PORT = Number(process.env.PORT || 3000);
const MAX_FILE_MB = 50;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
const RATE_LIMIT_MAX_ATTEMPTS = 3;
const RATE_LIMIT_RETRY_DELAY_MS = 1500;

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES }
});

app.use('/assets', express.static('assets'));

const COMMON_NO_PII_NOTICE =
  'Do not include personal data such as names, phone numbers, resident IDs, or detailed addresses. If present, return an empty string.';

const SCHEMAS = {
  registry: {
    name: 'RegistryMinimalNoPII',
    schema: {
      type: 'object',
      properties: {
        issue_date: {
          type: 'string',
          description: 'Issue date in YYYY-MM-DD. ' + COMMON_NO_PII_NOTICE
        },
        main_usage: {
          type: 'string',
          description: 'Main usage (e.g., apartment, officetel). ' + COMMON_NO_PII_NOTICE
        },
        exclusive_area: {
          type: 'string',
          description: 'Exclusive area in square meters. ' + COMMON_NO_PII_NOTICE
        },
        land_right: {
          type: 'boolean',
          description: 'Whether land right exists.'
        },
        rights_active_count: {
          type: 'number',
          description: 'Count of active rights or encumbrances.'
        }
      },
      required: [
        'issue_date',
        'main_usage',
        'exclusive_area',
        'land_right',
        'rights_active_count'
      ],
      additionalProperties: false
    }
  },
  building_register: {
    name: 'BuildingRegisterMinimalNoPII',
    schema: {
      type: 'object',
      properties: {
        issue_date: {
          type: 'string',
          description: 'Issue date in YYYY-MM-DD. ' + COMMON_NO_PII_NOTICE
        },
        main_usage: {
          type: 'string',
          description: 'Main usage of the building. ' + COMMON_NO_PII_NOTICE
        },
        total_floor_area: {
          type: 'string',
          description: 'Total floor area in square meters. ' + COMMON_NO_PII_NOTICE
        },
        building_structure: {
          type: 'string',
          description: 'Building structure (e.g., RC, steel). ' + COMMON_NO_PII_NOTICE
        },
        number_of_floors: {
          type: 'string',
          description: 'Number of floors (above or below). ' + COMMON_NO_PII_NOTICE
        }
      },
      required: [
        'issue_date',
        'main_usage',
        'total_floor_area',
        'building_structure',
        'number_of_floors'
      ],
      additionalProperties: false
    }
  },
  contract: {
    name: 'ContractMinimalNoPII',
    schema: {
      type: 'object',
      properties: {
        contract_type: {
          type: 'string',
          description: 'Contract type (e.g., lease, sale). ' + COMMON_NO_PII_NOTICE
        },
        lease_term: {
          type: 'string',
          description: 'Lease term (YYYY-MM-DD ~ YYYY-MM-DD or duration). ' + COMMON_NO_PII_NOTICE
        },
        deposit_amount: {
          type: 'string',
          description: 'Deposit amount (numbers only, no party names). ' + COMMON_NO_PII_NOTICE
        },
        monthly_rent: {
          type: 'string',
          description: 'Monthly rent amount (numbers only). ' + COMMON_NO_PII_NOTICE
        },
        maintenance_fee: {
          type: 'string',
          description: 'Maintenance or management fee (numbers only). ' + COMMON_NO_PII_NOTICE
        }
      },
      required: [
        'contract_type',
        'lease_term',
        'deposit_amount',
        'monthly_rent',
        'maintenance_fee'
      ],
      additionalProperties: false
    }
  }
};

const DOCUMENTS = [
  { key: 'registry', label: '등기부등본', schemaKey: 'registry', outputKey: '등기부등본' },
  { key: 'building_register', label: '건축물대장', schemaKey: 'building_register', outputKey: '건축물대장' },
  { key: 'contract', label: '계약서', schemaKey: 'contract', outputKey: '계약서' }
];

const HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>부메랑 문서 추출</title>
    <style>
      :root {
        color-scheme: light;
        --ink: #1c1b2d;
        --muted: #5b5c6a;
        --accent: #4f43ff;
        --accent-2: #8981ff;
        --paper: #e9e9ed;
        --card: #ffffff;
        --shadow: 0 18px 55px rgba(23, 20, 64, 0.12);
        --font: 'SF Pro Display', 'SF Pro Text', 'SF Pro', -apple-system, BlinkMacSystemFont,
          'Apple SD Gothic Neo', 'Segoe UI', sans-serif;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        font-family: var(--font);
        color: var(--ink);
        background: var(--paper);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 32px 18px;
        gap: 16px;
      }

      .shell {
        width: min(960px, 100%);
        display: grid;
        gap: 22px;
        animation: rise 0.6s ease both;
      }

      .hero {
        display: grid;
        gap: 8px;
      }

      .title-row {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .title-icon {
        width: 40px;
        height: 40px;
        object-fit: contain;
        border-radius: 8px;
      }

      h1 {
        margin: 0;
        font-size: clamp(2rem, 3vw, 2.7rem);
        letter-spacing: -0.02em;
      }

      p {
        margin: 0;
        color: var(--muted);
        line-height: 1.6;
      }

      .panel {
        background: var(--card);
        border-radius: 24px;
        padding: clamp(18px, 3vw, 28px);
        box-shadow: var(--shadow);
        display: grid;
        gap: 18px;
        backdrop-filter: blur(6px);
      }

      form {
        display: grid;
        gap: 14px;
      }

      .field {
        display: grid;
        gap: 6px;
        padding: 12px 14px;
        border-radius: 16px;
        border: 1px solid rgba(31, 42, 46, 0.1);
        background: rgba(255, 255, 255, 0.6);
        animation: fade 0.5s ease both;
        animation-delay: calc(var(--i) * 0.08s);
      }

      label {
        font-weight: 600;
        font-size: 0.95rem;
      }

      input[type='file'] {
        font-size: 0.95rem;
        border-radius: 12px;
        padding: 10px;
        background: #fff;
        border: 1px dashed rgba(31, 42, 46, 0.2);
      }

      input[type='password'] {
        font-size: 0.95rem;
        border-radius: 12px;
        padding: 10px 12px;
        background: #fff;
        border: 1px solid rgba(31, 42, 46, 0.15);
      }

      input[type='password']::placeholder {
        color: rgba(91, 107, 115, 0.7);
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
      }

      button {
        border: none;
        border-radius: 999px;
        padding: 12px 22px;
        font-weight: 600;
        font-size: 1rem;
        cursor: pointer;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }

      .primary {
        background: #4f43ff;
        color: #ffffff;
        box-shadow: 0 12px 25px rgba(0, 0, 0, 0.1);
      }

      .primary:hover {
        transform: translateY(-1px);
        box-shadow: 0 14px 30px rgba(0, 0, 0, 0.1);
      }

      .ghost {
        background: #edecff;
        color: #8981ff;
      }

      .status {
        font-family: var(--font);
        font-size: 0.92rem;
        color: var(--accent-2);
      }

      pre {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
        padding: 16px;
        border-radius: 16px;
        background: #131d20;
        color: #f5f2ea;
        font-size: 0.9rem;
        line-height: 1.55;
        font-family: var(--font);
        min-height: 120px;
      }

      .note {
        font-size: 0.85rem;
        color: var(--muted);
      }

      .footer {
        margin-top: 8px;
        font-size: 0.85rem;
        color: var(--muted);
        text-align: center;
        width: min(960px, 100%);
      }

      .footer strong {
        color: var(--ink);
        font-weight: 600;
      }

      @keyframes rise {
        from {
          opacity: 0;
          transform: translateY(18px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes fade {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @media (max-width: 720px) {
        .panel {
          border-radius: 18px;
        }

        .actions {
          flex-direction: column;
          align-items: stretch;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .shell,
        .field {
          animation: none;
        }
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <div class="hero">
        <div class="title-row">
          <img class="title-icon" src="/assets/icon_boomerang.png" alt="Boomerang 아이콘" />
          <h1>부메랑 문서 추출</h1>
        </div>
        <p>등기부등본, 건축물대장, 계약서 PDF를 업로드해 핵심 정보를 추출합니다.</p>
      </div>
      <div class="panel">
        <form id="uploadForm">
          <div class="field" style="--i: 1;">
            <label for="api_key">Upstage API 키</label>
            <input
              id="api_key"
              name="api_key"
              type="password"
              placeholder="UPSTAGE_API_KEY"
              autocomplete="off"
              required
            />
          </div>
          <div class="field" style="--i: 2;">
            <label for="registry">등기부등본 PDF</label>
            <input id="registry" name="registry" type="file" accept=".pdf,application/pdf" />
          </div>
          <div class="field" style="--i: 3;">
            <label for="building_register">건축물대장 PDF</label>
            <input id="building_register" name="building_register" type="file" accept=".pdf,application/pdf" />
          </div>
          <div class="field" style="--i: 4;">
            <label for="contract">계약서 PDF</label>
            <input id="contract" name="contract" type="file" accept=".pdf,application/pdf" />
          </div>
          <div class="actions">
            <button class="primary" type="submit">분석 시작</button>
            <button class="ghost" type="reset">초기화</button>
          </div>
        </form>
        <div class="status" id="status">준비 완료</div>
        <pre id="output">{}</pre>
        <p class="note">
          PDF 전용, 파일당 최대 ${MAX_FILE_MB}MB. API 키는 요청에만 사용되며 저장되지 않습니다.
        </p>
      </div>
    </div>
    <div class="footer">
      License: MIT &copy; 2026 <strong>HmH (김현진, 김채원, 민채영, 김이준, 김현목, 이창건) </strong>
    </div>

    <script>
      const form = document.getElementById('uploadForm');
      const status = document.getElementById('status');
      const output = document.getElementById('output');
      const apiKey = document.getElementById('api_key');

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!apiKey.value.trim()) {
          status.textContent = 'API 키를 입력해 주세요.';
          return;
        }
        status.textContent = '업로드 및 분석 중...';
        output.textContent = '{}';

        const formData = new FormData(form);
        try {
          const response = await fetch('/analyze', {
            method: 'POST',
            body: formData
          });
          const data = await response.json();
          if (!response.ok) {
            status.textContent = data.오류 || data.error || '요청에 실패했습니다.';
            output.textContent = JSON.stringify(data, null, 2);
            return;
          }
          status.textContent = '완료.';
          output.textContent = JSON.stringify(data, null, 2);
        } catch (error) {
          status.textContent = '네트워크 오류.';
          output.textContent = JSON.stringify({ 오류: error.message }, null, 2);
        }
      });
    </script>
  </body>
</html>`;

type UploadedFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

function normalizeFilename(name: string) {
  const hasNonLatin1 = /[^\u0000-\u00ff]/.test(name);
  if (hasNonLatin1) {
    return name;
  }

  const decoded = Buffer.from(name, 'latin1').toString('utf8');
  if (decoded.includes('\uFFFD')) {
    return name;
  }

  return decoded;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function translateExtractedData(schemaKey: keyof typeof SCHEMAS, data: Record<string, unknown>) {
  const registryMap: Record<string, string> = {
    issue_date: '발급일',
    main_usage: '주용도',
    exclusive_area: '전용면적',
    land_right: '토지권리',
    rights_active_count: '권리개수'
  };
  const buildingMap: Record<string, string> = {
    issue_date: '발급일',
    main_usage: '주용도',
    total_floor_area: '연면적',
    building_structure: '구조',
    number_of_floors: '층수'
  };
  const contractMap: Record<string, string> = {
    contract_type: '계약유형',
    lease_term: '임대기간',
    deposit_amount: '보증금',
    monthly_rent: '월세',
    maintenance_fee: '관리비'
  };

  const mapBySchema: Record<string, Record<string, string>> = {
    registry: registryMap,
    building_register: buildingMap,
    contract: contractMap
  };

  const mapping = mapBySchema[schemaKey] || {};
  const translated: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    translated[mapping[key] || key] = value;
  }

  return translated;
}

async function extractWithSchema(
  pdfBuffer: Buffer,
  apiKey: string,
  schemaName: string,
  schema: Record<string, unknown>
) {
  const base64Pdf = pdfBuffer.toString('base64');
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
        name: schemaName,
        schema
      }
    }
  };

  const response = await fetch('https://api.upstage.ai/v1/information-extraction', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('RATE_LIMIT');
    }
    const errorText = await response.text();
    throw new Error(`API 호출 실패 (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('응답에 내용이 없습니다.');
  }

  return JSON.parse(content);
}

async function extractWithSchemaWithRetry(
  pdfBuffer: Buffer,
  apiKey: string,
  schemaName: string,
  schema: Record<string, unknown>
) {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= RATE_LIMIT_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await extractWithSchema(pdfBuffer, apiKey, schemaName, schema);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message === 'RATE_LIMIT' && attempt < RATE_LIMIT_MAX_ATTEMPTS) {
        await sleep(RATE_LIMIT_RETRY_DELAY_MS * attempt);
        continue;
      }
      lastError = error instanceof Error ? error : new Error('알 수 없는 오류입니다.');
      break;
    }
  }

  if (lastError?.message === 'RATE_LIMIT') {
    throw new Error('API 호출 실패 (429): Rate limit exceeded.');
  }

  throw lastError ?? new Error('알 수 없는 오류입니다.');
}

app.get('/', (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(HTML);
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post(
  '/analyze',
  upload.fields([
    { name: 'registry', maxCount: 1 },
    { name: 'building_register', maxCount: 1 },
    { name: 'contract', maxCount: 1 }
  ]),
  async (req, res, next) => {
    try {
      const bodyKey = typeof req.body?.api_key === 'string' ? req.body.api_key.trim() : '';
      const apiKey = bodyKey || process.env.UPSTAGE_API_KEY || '';
      if (!apiKey) {
        res.status(400).json({ 오류: 'API 키가 필요합니다.' });
        return;
      }

      const files = (req.files || {}) as Record<string, UploadedFile[]>;
      const results: Record<string, unknown> = {};
      const errors: Record<string, string> = {};
      const missing: string[] = [];

      const hasAnyFile = DOCUMENTS.some((doc) => files[doc.key]?.length);
      if (!hasAnyFile) {
        res.status(400).json({ 오류: '업로드된 파일이 없습니다.' });
        return;
      }

      for (const doc of DOCUMENTS) {
        const file = files[doc.key]?.[0];
        if (!file) {
          missing.push(doc.outputKey);
          continue;
        }

        const schemaEntry = SCHEMAS[doc.schemaKey as keyof typeof SCHEMAS];
        try {
          const normalizedName = normalizeFilename(file.originalname);
          const extracted = await extractWithSchemaWithRetry(
            file.buffer,
            apiKey,
            schemaEntry.name,
            schemaEntry.schema
          );
          const translated = translateExtractedData(doc.schemaKey, extracted as Record<string, unknown>);
          results[doc.outputKey] = {
            파일명: normalizedName,
            원본_파일명: file.originalname,
            데이터: translated
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : '알 수 없는 오류입니다.';
          errors[doc.outputKey] = message;
          results[doc.outputKey] = {
            파일명: normalizeFilename(file.originalname),
            원본_파일명: file.originalname
          };
        }
      }

      res.json({
        결과: results,
        오류: errors,
        누락: missing
      });
    } catch (error) {
      next(error);
    }
  }
);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({ 오류: `파일이 너무 큽니다. 최대 ${MAX_FILE_MB}MB.` });
    return;
  }

  const message = error instanceof Error ? error.message : '예기치 않은 서버 오류입니다.';
  res.status(500).json({ 오류: message });
});

app.listen(PORT, () => {
  console.log(`웹 서버가 준비되었습니다, 해당 주소로 접속해주세요: http://localhost:${PORT}`);
});
