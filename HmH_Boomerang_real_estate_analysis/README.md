# 🏠 Boomerang Real Estate Document Information Extraction Demo

A hands-on demo for extracting key information from real estate documents (registry certificates, contracts, building ledgers) in PDF format using the Upstage `information-extract` API.
Provides both Docker and Node.js execution paths so anyone can run it immediately.

## 📌 Table of Contents
- [1. Project Overview](#1-project-overview)
- [2. Demo Scenario](#2-demo-scenario)
- [3. Key Features](#3-key-features)
- [4. Tech Stack](#4-tech-stack)
- [5. Quick Start](#5-quick-start)
- [6. Running with Your Own Documents](#6-running-with-your-own-documents)
- [7. Project Structure](#7-project-structure)
- [8. Output Example](#8-output-example)
- [9. Cautions and Limitations](#9-cautions-and-limitations)
- [10. License](#10-license)
- [11. Reference Documents](#11-reference-documents)

## 1. Project Overview

> A demo that helps you quickly structure and review essential items from documents
> that need to be verified before real estate transactions (registry certificates, building ledgers, contracts).

- **Problem**: PDF documents are complex and time-consuming to review
- **Solution**: Returns structured results by specifying only the required fields with JSON Schema
- **Target Audience**: Practitioners who want to quickly experiment with document automation, risk assessment, and data pipelines

## 2. Demo Scenario
1. Prepare PDFs of registry certificates, contracts, and building ledgers.
2. Analyze documents using the Upstage API.
3. Extract and output structured key information such as address, issue date, usage, area, etc.

## 3. Key Features
- JSON Schema-based field extraction
- Single document analysis (`index.js`)
- Batch analysis of 3 sample documents (`sample_documents/analyze-sample-documents.js`)
- Web upload page (`server.ts`)
- Docker/Node.js execution support
- Docker Hub image provided
- Example schema excluding personal information (based on sample scripts)

## 4. Tech Stack
- **Runtime**: Node.js 18+ (with built-in fetch)
- **Document Extraction**: Upstage `information-extract` API
- **Languages/Execution**: TypeScript (`server.ts`), JavaScript (`index.js`)
- **Container**: Docker, docker-compose

## 5. Quick Start

### 5.1 Prepare Upstage API Key
- Issue an API key from [Upstage Console](https://console.upstage.ai/)
- For the web page, enter directly during execution (no environment variable setup required)

### 5.2 Run with Docker (Recommended)
#### 5.2.1 Run Directly with Docker Hub Image
- Docker Hub: https://hub.docker.com/r/koriai/hmh_boomerang_uie_example

```bash
docker pull koriai/hmh_boomerang_uie_example:latest
docker run --rm -p 3000:8080 koriai/hmh_boomerang_uie_example:latest
```

- After running, check the PDF upload page at `http://localhost:3000`.
- Enter the API key directly on the page. (`.env` not required)
- Exit with `Ctrl+C`. (For background execution, use `docker stop <container_name>`)

#### 5.2.2 Local Build Execution from Source (docker-compose)
```bash
# From project root
docker-compose up --build
```

- After running, check the PDF upload page at `http://localhost:3000`.
- Enter the API key directly on the page. (`.env` not required)
- When finished, shut down with the following command:
```bash
docker-compose down
```

To automatically open a browser (background execution then open):
```bash
docker-compose up --build -d && sleep 1 && open http://localhost:3000
```

### 5.3 Run with Node.js (CLI)
Requirements: Node.js 18+ (with built-in fetch)

```bash
# Install dependencies
npm install

export UPSTAGE_API_KEY="YOUR_KEY"

# Analyze 3 sample documents
node sample_documents/analyze-sample-documents.js

# Analyze single document (specify path directly)
node index.js ./sample_documents/등본.pdf
```

The default path in `index.js` is set to `./sample-pdfs/registry.pdf`, so pass the actual file path as an argument.

To run the web upload page locally:
```bash
npm install
npm run start:web
```
To automatically open a browser (macOS):
```bash
npm run start:web:open
```

## 6. Running with Your Own Documents
- Place the PDF in the desired location and pass the path as an argument.
  - Example: `node index.js /path/to/your.pdf`
- You can also upload directly from the web page. (`http://localhost:3000`)
- To use the sample batch script, add file paths to the `DOCUMENTS` array in `sample_documents/analyze-sample-documents.js`.
- Do not commit documents containing personal information. It's recommended to add exclusion rules to `.gitignore` if necessary.

## 7. Project Structure
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

## 8. Output Example
```text
[registry] ./sample_documents/등본.pdf
{
  "issue_date": "2024-12-26",
  "main_usage": "Apartment",
  "exclusive_area": "84.50",
  "land_right": true,
  "rights_active_count": 1
}
```

## 9. Cautions and Limitations
- **API Key Required**: Must be set via web page input or as an environment variable for CLI execution.
- **File Size**: 50MB or less recommended (large files may timeout)
- **Document Quality**: Low scan quality may reduce extraction accuracy.
- **.env Auto-load**: `.env` is not automatically loaded when running Node.js CLI.
- **Personal Information**: Sample scripts are designed to return personal information as empty.

## 10. License
- CC BY-NC-SA 4.0
- Copyright: HmH (Kim Hyun Jin)

## 11. Reference Documents
- `PIPELINE.md`: Step-by-step explanation of the `index.js` pipeline
- `sample_documents/README.md`: Sample document usage guide
- `Boomerang-server/README.md`: API server project
- `Boomerang-server/MIGRATION_SPEC.md`: Registry parsing migration specification
