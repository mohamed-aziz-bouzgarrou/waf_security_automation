# OWASP ZAP API Middleware

A production-ready Express.js REST API backend that acts as a middleware layer between clients and the OWASP ZAP security scanning tool. This API orchestrates full security scan workflows using ZAP's HTTP API.

## 📋 Features

- ✅ Complete REST API for all OWASP ZAP functionality
- ✅ Centralized axios instance with automatic API key injection
- ✅ Full scan orchestration endpoint (`POST /api/scan/full`)
- ✅ Polling utilities for long-running operations
- ✅ Comprehensive error handling with structured responses
- ✅ Input validation middleware for URL parameters
- ✅ Request logging with Morgan
- ✅ CORS support
- ✅ Health check endpoint
- ✅ TypeScript-ready (JSDoc-documented)
- ✅ Environment variable configuration
- ✅ Graceful shutdown handling

## 🚀 Quick Start

### Prerequisites

- Node.js 14+ and npm
- OWASP ZAP running locally (default: `http://localhost:8080`)
- ZAP API key (if API authentication is required)

### Installation

1. **Clone or download the project:**

   ```bash
   cd "owasp zap backend"
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Copy `.env.example` to `.env`:

   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your configuration:

   ```env
   ZAP_BASE_URL=http://localhost:8080
   ZAP_API_KEY=your_zap_api_key_here
   PORT=3000
   NODE_ENV=development
   ```

   > **Note:** ZAP_API_KEY is typically "changeme" by default. Check your ZAP configuration.

4. **Ensure OWASP ZAP is running:**

   ```bash
   # On Windows
   "C:\Program Files\OWASP ZAP\ZAP.exe"

   # Or enable the ZAP API in your running instance
   # Settings → API → Enable API
   ```

5. **Start the server:**

   ```bash
   npm start          # Production mode
   # OR
   npm run dev        # Development mode with auto-reload (requires nodemon)
   ```

   You should see:

   ```
   ╔═══════════════════════════════════════════════════════════╗
   ║   OWASP ZAP API Middleware Server Started               ║
   ╚═══════════════════════════════════════════════════════════╝

   Environment:  development
   Server URL:   http://localhost:3000
   ZAP URL:      http://localhost:8080
   ```

## 🏥 Health Check

Before running scans, verify that both your API and ZAP are running:

```bash
curl -X GET http://localhost:3000/health
```

**Response:**

```json
{
  "success": true,
  "timestamp": "2026-02-28T12:00:00.000Z",
  "healthy": true,
  "version": "2.14.0",
  "zapUrl": "http://localhost:8080"
}
```

If ZAP is not reachable:

```json
{
  "success": false,
  "timestamp": "2026-02-28T12:00:00.000Z",
  "healthy": false,
  "error": "connect ECONNREFUSED 127.0.0.1:8080",
  "zapUrl": "http://localhost:8080"
}
```

## 📡 API Endpoints

### 🌐 General Endpoints

#### Server Information

```bash
GET /
GET /api/info
```

**Example:**

```bash
curl http://localhost:3000/api/info
```

### 🔧 Core API

#### Get ZAP Version

```bash
GET /api/core/version
```

**Example:**

```bash
curl http://localhost:3000/api/core/version
```

**Response:**

```json
{
  "success": true,
  "data": {
    "version": "2.14.0"
  }
}
```

---

#### Get All URLs in Scope

```bash
GET /api/core/urls
```

**Example:**

```bash
curl http://localhost:3000/api/core/urls
```

**Response:**

```json
{
  "success": true,
  "data": [
    "http://example.com",
    "http://example.com/page1",
    "http://example.com/page2"
  ]
}
```

---

#### Seed a URL into ZAP

```bash
POST /api/core/access-url
```

**Body:**

```json
{
  "url": "http://example.com",
  "followRedirects": true
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/core/access-url \
  -H "Content-Type: application/json" \
  -d '{"url":"http://example.com","followRedirects":true}'
```

**Response:**

```json
{
  "success": true,
  "message": "URL accessed successfully",
  "data": {}
}
```

### 📝 Session Management

#### Create New Session

```bash
POST /api/session/new
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/session/new
```

**Response:**

```json
{
  "success": true,
  "message": "New session created",
  "data": {}
}
```

### 🕷 Spider Scan

#### Start Spider Scan

```bash
POST /api/spider/start
```

**Body:**

```json
{
  "url": "http://example.com",
  "recurse": true
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/spider/start \
  -H "Content-Type: application/json" \
  -d '{"url":"http://example.com","recurse":true}'
```

**Response:**

```json
{
  "success": true,
  "message": "Spider scan started",
  "data": {
    "scan": 0
  }
}
```

---

#### Get Spider Status

```bash
GET /api/spider/status/:scanId
```

**Example:**

```bash
curl http://localhost:3000/api/spider/status/0
```

**Response:**

```json
{
  "success": true,
  "data": {
    "scanId": 0,
    "status": 45,
    "percentComplete": 45
  }
}
```

---

#### Get Spider Results

```bash
GET /api/spider/results/:scanId
```

**Example:**

```bash
curl http://localhost:3000/api/spider/results/0
```

**Response:**

```json
{
  "success": true,
  "data": {
    "scanId": 0,
    "urls": [
      "http://example.com/",
      "http://example.com/about",
      "http://example.com/contact"
    ],
    "count": 3
  }
}
```

### 🕸 AJAX Spider

#### Start AJAX Spider

```bash
POST /api/ajax-spider/start
```

**Body:**

```json
{
  "url": "http://example.com"
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/ajax-spider/start \
  -H "Content-Type: application/json" \
  -d '{"url":"http://example.com"}'
```

**Response:**

```json
{
  "success": true,
  "message": "AJAX spider scan started",
  "data": {}
}
```

---

#### Get AJAX Spider Status

```bash
GET /api/ajax-spider/status
```

**Example:**

```bash
curl http://localhost:3000/api/ajax-spider/status
```

**Response:**

```json
{
  "success": true,
  "data": {
    "status": "running",
    "currentlyLoadingPage": "http://example.com/page"
  }
}
```

---

#### Stop AJAX Spider

```bash
POST /api/ajax-spider/stop
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/ajax-spider/stop
```

**Response:**

```json
{
  "success": true,
  "message": "AJAX spider stopped",
  "data": {}
}
```

### ⚔️ Active Scan

#### Start Active Scan

```bash
POST /api/active-scan/start
```

**Body:**

```json
{
  "url": "http://example.com",
  "recurse": true,
  "scanPolicyName": "Default Policy"
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/active-scan/start \
  -H "Content-Type: application/json" \
  -d '{"url":"http://example.com","recurse":true,"scanPolicyName":"Default Policy"}'
```

**Response:**

```json
{
  "success": true,
  "message": "Active scan started",
  "data": {
    "scan": 0
  }
}
```

---

#### Get Active Scan Status

```bash
GET /api/active-scan/status/:scanId
```

**Example:**

```bash
curl http://localhost:3000/api/active-scan/status/0
```

**Response:**

```json
{
  "success": true,
  "data": {
    "scanId": 0,
    "status": 72,
    "percentComplete": 72
  }
}
```

---

#### Get Active Scan Progress (Detailed)

```bash
GET /api/active-scan/progress/:scanId
```

**Example:**

```bash
curl http://localhost:3000/api/active-scan/progress/0
```

**Response:**

```json
{
  "success": true,
  "data": {
    "scanProgress": [
      {
        "id": 1,
        "status": 100,
        "plugin": "Plugin 1",
        "name": "Scan Name"
      }
    ]
  }
}
```

---

#### List All Active Scans

```bash
GET /api/active-scan/list
```

**Example:**

```bash
curl http://localhost:3000/api/active-scan/list
```

**Response:**

```json
{
  "success": true,
  "data": {
    "scans": [
      {
        "id": 0,
        "progress": 100,
        "state": "FINISHED"
      }
    ],
    "count": 1
  }
}
```

---

#### Stop Active Scan

```bash
POST /api/active-scan/stop/:scanId
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/active-scan/stop/0
```

**Response:**

```json
{
  "success": true,
  "message": "Active scan stopped",
  "data": {}
}
```

### 🛡 Passive Scan

#### Get Passive Scan Queue

```bash
GET /api/passive-scan/queue
```

**Example:**

```bash
curl http://localhost:3000/api/passive-scan/queue
```

**Response:**

```json
{
  "success": true,
  "data": {
    "recordsToScan": 42
  }
}
```

---

#### Enable Passive Scanners

```bash
POST /api/passive-scan/enable
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/passive-scan/enable
```

**Response:**

```json
{
  "success": true,
  "message": "Passive scanners enabled",
  "data": {}
}
```

---

#### Disable Passive Scanners

```bash
POST /api/passive-scan/disable
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/passive-scan/disable
```

**Response:**

```json
{
  "success": true,
  "message": "Passive scanners disabled",
  "data": {}
}
```

### 🚨 Alerts

#### Get All Alerts

```bash
GET /api/alerts[?baseurl=&start=0&count=50&riskId=]
```

**Query Parameters:**

- `baseurl` (optional): Filter by base URL
- `start` (optional): Start index (default: 0)
- `count` (optional): Number of alerts to return
- `riskId` (optional): Filter by risk ID

**Example:**

```bash
curl "http://localhost:3000/api/alerts?count=10"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "pluginid": "10001",
        "alertRef": "10001",
        "alert": "SQL Injection",
        "name": "SQL Injection",
        "riskdesc": "High",
        "confidence": "Medium",
        "url": "http://example.com/page?id=1"
      }
    ],
    "count": 1
  }
}
```

---

#### Get Alerts Summary

```bash
GET /api/alerts/summary
```

**Example:**

```bash
curl http://localhost:3000/api/alerts/summary
```

**Response:**

```json
{
  "success": true,
  "data": {
    "high": 2,
    "medium": 5,
    "low": 10,
    "informational": 15
  }
}
```

---

#### Get Alerts Grouped by Risk

```bash
GET /api/alerts/by-risk
```

**Example:**

```bash
curl http://localhost:3000/api/alerts/by-risk
```

**Response:**

```json
{
  "success": true,
  "data": {
    "high": [
      {
        "alert": "SQL Injection",
        "url": "http://example.com/page?id=1"
      }
    ],
    "medium": [],
    "low": [],
    "informational": []
  }
}
```

---

#### Get Alert Count

```bash
GET /api/alerts/count
```

**Example:**

```bash
curl http://localhost:3000/api/alerts/count
```

**Response:**

```json
{
  "success": true,
  "data": {
    "count": 32
  }
}
```

---

#### Delete All Alerts

```bash
DELETE /api/alerts
```

**Example:**

```bash
curl -X DELETE http://localhost:3000/api/alerts
```

**Response:**

```json
{
  "success": true,
  "message": "All alerts deleted",
  "data": {}
}
```

### 📊 Reports

#### Download HTML Report

```bash
GET /api/reports/html[?title=&template=]
```

**Query Parameters:**

- `title` (optional): Report title
- `template` (optional): Template name

**Example:**

```bash
curl -O http://localhost:3000/api/reports/html?title="Security%20Report"
```

The response will be downloaded as an HTML file with appropriate headers:

```
Content-Type: text/html; charset=utf-8
Content-Disposition: attachment; filename="security-report-1234567890.html"
```

---

#### Download XML Report

```bash
GET /api/reports/xml[?title=&template=]
```

**Example:**

```bash
curl -O http://localhost:3000/api/reports/xml
```

---

#### Get JSON Report

```bash
GET /api/reports/json
```

**Example:**

```bash
curl http://localhost:3000/api/reports/json
```

**Response:**

```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "alert": "SQL Injection",
        "riskdesc": "High"
      }
    ]
  }
}
```

---

#### Generate Custom Report

```bash
POST /api/reports/generate
```

**Body:**

```json
{
  "title": "Q1 2026 Security Audit",
  "template": "traditional-html",
  "reportDir": "/tmp",
  "reportFileName": "q1-audit"
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/reports/generate \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Q1 2026 Security Audit",
    "template": "traditional-html",
    "reportDir": "/tmp",
    "reportFileName": "q1-audit"
  }'
```

**Response:**

```json
{
  "success": true,
  "message": "Report generated",
  "data": {
    "title": "Q1 2026 Security Audit",
    "alerts": [],
    "summary": {},
    "generatedAt": "2026-02-28T12:00:00.000Z"
  }
}
```

## 🔄 Full Scan Orchestration

### Complete Security Scan Workflow

This is the primary production-use endpoint. It orchestrates the entire security scanning workflow in sequence.

#### Start Full Scan

```bash
POST /api/scan/full
```

**Body:**

```json
{
  "url": "http://example.com",
  "useAjaxSpider": true,
  "reportTemplate": "traditional-html"
}
```

**Workflow Steps:**

1. Create new ZAP session
2. Access/seed target URL into scope
3. Start Spider scan → polls every 3 seconds until 100%
4. (Optional) Start AJAX Spider → polls every 5 seconds until stopped
5. Start Active Scan → polls every 5 seconds until 100%
6. Poll Passive Scanner queue → polls every 2 seconds until empty
7. Fetch all alerts and generate summary
8. Generate security report
9. Return comprehensive results

**Example:**

```bash
curl -X POST http://localhost:3000/api/scan/full \
  -H "Content-Type: application/json" \
  -d '{
    "url": "http://example.com",
    "useAjaxSpider": false,
    "reportTemplate": "traditional-html"
  }'
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Full security scan completed successfully",
  "data": {
    "scanSummary": {
      "targetUrl": "http://example.com",
      "startTime": "2026-02-28T12:00:00.000Z",
      "endTime": "2026-02-28T12:15:30.456Z",
      "durationMs": 930456,
      "durationMinutes": "15.51"
    },
    "scanDetails": {
      "spiderId": 0,
      "activeScanId": 0,
      "spiderUrlsFound": 42,
      "useAjaxSpider": false
    },
    "alertsInfo": {
      "totalAlerts": 12,
      "summary": {
        "high": 2,
        "medium": 5,
        "low": 5,
        "informational": 0
      },
      "byRisk": {
        "high": [...],
        "medium": [...],
        "low": [...],
        "informational": [...]
      }
    },
    "alerts": [...],
    "report": {
      "title": "Security Scan Report - 2026-02-28T12:00:00.000Z",
      "alerts": [...],
      "summary": {...},
      "generatedAt": "2026-02-28T12:15:30.456Z"
    }
  }
}
```

---

### Quick Scan (Without AJAX Spider)

```bash
POST /api/scan/quick
```

**Body:**

```json
{
  "url": "http://example.com"
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/scan/quick \
  -H "Content-Type: application/json" \
  -d '{"url":"http://example.com"}'
```

Same response format as `/api/scan/full` but skips the AJAX Spider phase.

## 🔐 Authentication

The API currently uses ZAP's API key authentication via query parameter (injected automatically). To enable API authentication:

1. Set `ZAP_API_KEY` in your `.env` file
2. Ensure this key matches your ZAP configuration

## ⚠️ Error Handling

All errors are returned in a structured format:

**4xx Errors (Client Errors):**

```json
{
  "error": true,
  "message": "Validation Error",
  "details": "Invalid URL format. URL must start with http:// or https://",
  "status": 400
}
```

**5xx Errors (Server Errors):**

```json
{
  "error": true,
  "message": "ZAP API Error",
  "zapMessage": "...",
  "status": 500
}
```

**Service Unavailable (ZAP not running):**

```json
{
  "error": true,
  "message": "ZAP Service Unavailable",
  "details": "Cannot connect to OWASP ZAP API. Ensure ZAP is running at the configured URL.",
  "zapUrl": "http://localhost:8080",
  "status": 503
}
```

## 📁 Project Structure

```
owasp-zap-backend/
├── src/
│   ├── controllers/          # Route logic
│   │   ├── session.controller.js
│   │   ├── spider.controller.js
│   │   ├── ajaxSpider.controller.js
│   │   ├── activeScan.controller.js
│   │   ├── passiveScan.controller.js
│   │   ├── alerts.controller.js
│   │   ├── reports.controller.js
│   │   ├── core.controller.js
│   │   └── scan.controller.js
│   ├── services/            # Business logic & ZAP API calls
│   │   └── zap.service.js
│   ├── routes/              # Express route handlers
│   │   ├── session.routes.js
│   │   ├── spider.routes.js
│   │   ├── ajaxSpider.routes.js
│   │   ├── activeScan.routes.js
│   │   ├── passiveScan.routes.js
│   │   ├── alerts.routes.js
│   │   ├── reports.routes.js
│   │   ├── core.routes.js
│   │   └── scan.routes.js
│   ├── middleware/          # Express middleware
│   │   ├── errorHandler.js
│   │   └── validateTarget.js
│   ├── utils/              # Utility functions
│   │   └── polling.js
│   ├── app.js              # Express app setup
│   └── server.js           # Server entry point
├── .env                    # Environment variables (local)
├── .env.example            # Environment variables template
├── package.json            # Node.js dependencies
├── README.md               # This file
└── .gitignore              # Git ignore patterns
```

## 🧪 Testing Endpoints

Use the provided curl examples or these tools:

### Using Postman/Insomnia

Import the following collection:

**Full Scan Example:**

- Method: `POST`
- URL: `http://localhost:3000/api/scan/full`
- Headers: `Content-Type: application/json`
- Body:
  ```json
  {
    "url": "http://example.com",
    "useAjaxSpider": false,
    "reportTemplate": "traditional-html"
  }
  ```

### Using httpie

```bash
http POST http://localhost:3000/api/scan/full \
  url=http://example.com \
  useAjaxSpider:=false \
  reportTemplate=traditional-html
```

### Using Node.js/JavaScript

```javascript
const axios = require("axios");

async function runScan() {
  try {
    const response = await axios.post("http://localhost:3000/api/scan/full", {
      url: "http://example.com",
      useAjaxSpider: false,
      reportTemplate: "traditional-html",
    });
    console.log("Scan Results:", response.data);
  } catch (error) {
    console.error("Scan Error:", error.response?.data || error.message);
  }
}

runScan();
```

## 🐛 Troubleshooting

### "Cannot connect to OWASP ZAP API"

- Ensure ZAP is running at the configured URL (`ZAP_BASE_URL`)
- Check that the API is enabled in ZAP: `Settings → API → Enable API`
- Verify network connectivity: `curl http://localhost:8080/JSON/core/view/version`
- Check your `.env` file has the correct `ZAP_BASE_URL`

### "API Key not working"

- Get your ZAP API key from: `Settings → API`
- The default key is typically `changeme`
- Update `.env` with the correct key
- Restart the API server

### Scans timing out

- Increase polling timeout in `src/utils/polling.js`
- Ensure your target website is responding quickly
- Check ZAP's system resources (CPU/Memory)
- Review ZAP logs for errors

### "URL validation failed"

- Ensure your URL starts with `http://` or `https://`
- URL must be properly formatted: `http://example.com`
- URL with port: `http://example.com:8080`

## 🚀 Production Deployment

For production use:

1. **Use environment-specific `.env` files:**
   - `.env.production`
   - `.env.staging`

2. **Enable HTTPS:**

   ```javascript
   const https = require("https");
   const fs = require("fs");
   const app = require("./app");

   https
     .createServer(
       {
         key: fs.readFileSync("server.key"),
         cert: fs.readFileSync("server.cert"),
       },
       app,
     )
     .listen(3000);
   ```

3. **Use a process manager (PM2):**

   ```bash
   npm install -g pm2
   pm2 start src/server.js --name "zap-api"
   pm2 save
   pm2 startup
   ```

4. **Set up reverse proxy (Nginx):**

   ```nginx
   server {
     listen 80;
     server_name api.example.com;

     location / {
       proxy_pass http://localhost:3000;
       proxy_http_version 1.1;
       proxy_set_header Connection "upgrade";
     }
   }
   ```

5. **Add monitoring:**
   ```bash
   npm install pm2-logrotate
   pm2 install pm2-logrotate
   ```

## 📚 Resources

- [OWASP ZAP API Documentation](https://www.zaproxy.org/docs/api/)
- [Express.js Documentation](https://expressjs.com/)
- [Axios Documentation](https://axios-http.com/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

## 📄 License

MIT

## 👤 Author

Your Organization

---

**Last Updated:** February 28, 2026
**Version:** 1.0.0
