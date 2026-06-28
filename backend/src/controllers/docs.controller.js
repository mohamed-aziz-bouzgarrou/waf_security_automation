const fs = require('fs');
const path = require('path');

/**
 * Documentation Controller
 * Serves documentation files via HTTP
 */

const docsDir = path.join(__dirname, '../../');

/**
 * GET /docs
 * List all available documentation
 */
exports.listDocs = (req, res) => {
  const docs = [
    { name: 'README', path: '/docs/readme', description: 'Complete API reference with 100+ examples' },
    { name: 'Quick Start', path: '/docs/quick-start', description: 'Fast setup guide (3 steps)' },
    { name: 'Project Summary', path: '/docs/project-summary', description: 'Project overview and features' },
    { name: 'Deployment', path: '/docs/deployment', description: 'Production deployment guide' },
  ];

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>OWASP ZAP API Documentation</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 900px; margin: 0 auto; padding: 40px 20px; background: #f5f5f5; }
        .container { background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        h1 { color: #333; margin-top: 0; }
        .docs-list { list-style: none; padding: 0; }
        .docs-item { margin: 20px 0; padding: 20px; border: 1px solid #e0e0e0; border-radius: 6px; }
        .docs-item:hover { background: #f9f9f9; border-color: #333; }
        .docs-item a { color: #0066cc; text-decoration: none; font-size: 18px; font-weight: 600; }
        .docs-item a:hover { text-decoration: underline; }
        .docs-description { color: #666; margin-top: 8px; font-size: 14px; }
        .info-box { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .code { background: #f4f4f4; padding: 12px; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 14px; overflow-x: auto; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>📚 OWASP ZAP API Documentation</h1>
        
        <div class="info-box">
          <strong>Server Status:</strong> ✅ Running at http://localhost:3000
        </div>

        <h2>Available Documentation</h2>
        <ul class="docs-list">
          ${docs.map(doc => `
            <li class="docs-item">
              <a href="${doc.path}">${doc.name}</a>
              <div class="docs-description">${doc.description}</div>
            </li>
          `).join('')}
        </ul>

        <h2>Quick Links</h2>
        <div class="code">
          GET /health<br>
          <span style="color: #666;">Check API and ZAP connectivity</span>
        </div>
        <div class="code">
          GET /api/info<br>
          <span style="color: #666;">Get API information</span>
        </div>
        <div class="code">
          POST /api/scan/full<br>
          <span style="color: #666;">Start a complete security scan</span>
        </div>

        <h2>API Endpoints</h2>
        <p>Visit <strong>/api/info</strong> for API information or check the <strong>README</strong> for all 47+ endpoints.</p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e0e0e0;">
        <p style="color: #999; font-size: 12px; margin: 0;">
          OWASP ZAP API Middleware • Version 1.0.0 • February 28, 2026
        </p>
      </div>
    </body>
    </html>
  `;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
};

/**
 * GET /docs/readme
 * Serve README documentation
 */
exports.getReadme = (req, res) => {
  serveMarkdownFile(res, 'README.md', 'API Reference');
};

/**
 * GET /docs/quick-start
 * Serve Quick Start documentation
 */
exports.getQuickStart = (req, res) => {
  serveMarkdownFile(res, 'QUICK_START.md', 'Quick Start Guide');
};

/**
 * GET /docs/project-summary
 * Serve Project Summary documentation
 */
exports.getProjectSummary = (req, res) => {
  serveMarkdownFile(res, 'PROJECT_SUMMARY.md', 'Project Summary');
};

/**
 * GET /docs/deployment
 * Serve Deployment documentation
 */
exports.getDeployment = (req, res) => {
  serveMarkdownFile(res, 'DEPLOYMENT.md', 'Deployment Guide');
};

/**
 * Helper function to serve markdown files as HTML
 */
function serveMarkdownFile(res, filename, title) {
  try {
    const filePath = path.join(docsDir, filename);
    const content = fs.readFileSync(filePath, 'utf8');

    // Escape HTML and preserve line breaks
    const escaped = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title} - OWASP ZAP API</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 900px;
            margin: 0 auto;
            padding: 40px 20px;
            background: #f5f5f5;
          }
          .container { 
            background: white;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          .breadcrumb {
            margin-bottom: 20px;
            font-size: 14px;
          }
          .breadcrumb a {
            color: #0066cc;
            text-decoration: none;
          }
          .breadcrumb a:hover {
            text-decoration: underline;
          }
          h1, h2, h3, h4, h5, h6 {
            color: #222;
            margin-top: 30px;
            margin-bottom: 15px;
          }
          h1 { font-size: 32px; margin-top: 0; }
          h2 { font-size: 24px; border-bottom: 2px solid #0066cc; padding-bottom: 10px; }
          h3 { font-size: 20px; }
          code {
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
          }
          pre {
            background: #f4f4f4;
            padding: 15px;
            border-radius: 6px;
            overflow-x: auto;
            border-left: 4px solid #0066cc;
          }
          pre code {
            background: none;
            padding: 0;
          }
          table {
            border-collapse: collapse;
            width: 100%;
            margin: 20px 0;
          }
          table th, table td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
          }
          table th {
            background: #f4f4f4;
            font-weight: 600;
          }
          table tr:hover {
            background: #f9f9f9;
          }
          ul, ol {
            margin: 15px 0;
            padding-left: 30px;
          }
          li {
            margin: 8px 0;
          }
          blockquote {
            border-left: 4px solid #ddd;
            padding-left: 15px;
            color: #666;
            margin: 15px 0;
          }
          .info-box {
            background: #e3f2fd;
            border-left: 4px solid #2196f3;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .warning-box {
            background: #fff3e0;
            border-left: 4px solid #ff9800;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .success-box {
            background: #e8f5e9;
            border-left: 4px solid #4caf50;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          a {
            color: #0066cc;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
          hr {
            border: none;
            border-top: 1px solid #e0e0e0;
            margin: 30px 0;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            color: #999;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="breadcrumb">
            <a href="/docs">← Back to Documentation</a>
          </div>
          <pre>${escaped}</pre>
          <div class="footer">
            <p>OWASP ZAP API Middleware • Version 1.0.0</p>
          </div>
        </div>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    res.status(404).json({
      error: true,
      message: 'Documentation file not found',
      file: filename,
    });
  }
}
