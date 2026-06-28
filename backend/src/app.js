require("dotenv").config();
require("express-async-errors");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const mongoose = require("mongoose");

const zapService = require("./services/zap.service");
const errorHandler = require("./middleware/errorHandler");

// Import routes
const sessionRoutes = require("./routes/session.routes");
const spiderRoutes = require("./routes/spider.routes");
const ajaxSpiderRoutes = require("./routes/ajaxSpider.routes");
const activeScanRoutes = require("./routes/activeScan.routes");
const passiveScanRoutes = require("./routes/passiveScan.routes");
const alertsRoutes = require("./routes/alerts.routes");
const reportsRoutes = require("./routes/reports.routes");
const coreRoutes = require("./routes/core.routes");
const scanRoutes = require("./routes/scan.routes");
const docsRoutes = require("./routes/docs.routes");
const scansRoutes = require("./routes/scans.routes");
const chatbotRoutes = require("./routes/chatbot.routes");

const app = express();

/**
 * ==================== DATABASE SETUP ====================
 */
const connectMongoDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/owasp-zap";
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✓ MongoDB connected successfully");
  } catch (error) {
    console.error("✗ MongoDB connection failed:", error.message);
    // Don't exit process, allow app to run without MongoDB if not needed
  }
};

// Connect to MongoDB on startup
connectMongoDB();

/**
 * ==================== MIDDLEWARE ====================
 */

// CORS
app.use(cors());

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging with morgan
app.use(morgan("combined"));

/**
 * ==================== ROUTES ====================
 */

/**
 * Health check endpoint
 * GET /health
 * Returns ZAP API connectivity status and version
 */
app.get("/health", async (req, res) => {
  const health = await zapService.healthCheck();
  const statusCode = health.healthy ? 200 : 503;

  res.status(statusCode).json({
    success: health.healthy,
    timestamp: new Date().toISOString(),
    ...health,
  });
});

/**
 * API version and info endpoint
 * GET /api/info
 */
app.get("/api/info", (req, res) => {
  res.json({
    name: "OWASP ZAP API Middleware",
    version: "1.0.0",
    description:
      "Production-ready Express.js REST API for OWASP ZAP security scanning",
    zapBaseUrl: process.env.ZAP_BASE_URL || "http://localhost:8080",
    documentation: "See README.md for full API documentation",
  });
});

/**
 * Mount route handlers
 * Each route group is prefixed with its namespace
 */
app.use("/docs", docsRoutes);
app.use("/api/session", sessionRoutes);
app.use("/api/spider", spiderRoutes);
app.use("/api/ajax-spider", ajaxSpiderRoutes);
app.use("/api/active-scan", activeScanRoutes);
app.use("/api/passive-scan", passiveScanRoutes);
app.use("/api/alerts", alertsRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/core", coreRoutes);
app.use("/api/scan", scanRoutes);
app.use("/api/scans", scansRoutes);
app.use("/api/chatbot", chatbotRoutes);

/**
 * Root endpoint
 * GET /
 */
app.get("/", (req, res) => {
  res.json({
    message: "OWASP ZAP API Middleware",
    version: "1.0.0",
    endpoints: {
      health: "GET /health",
      info: "GET /api/info",
      documentation: "GET /docs",
      readme: "GET /docs/readme",
      quickStart: "GET /docs/quick-start",
      projectSummary: "GET /docs/project-summary",
      deployment: "GET /docs/deployment",
    },
  });
});

/**
 * 404 Not Found
 */
app.use((req, res) => {
  res.status(404).json({
    error: true,
    message: "Endpoint not found",
    path: req.path,
    method: req.method,
  });
});

/**
 * ==================== ERROR HANDLER ====================
 * MUST be registered last
 */
app.use(errorHandler);

module.exports = app;
