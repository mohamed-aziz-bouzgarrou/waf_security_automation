const zapService = require("../services/zap.service");

/**
 * Core Controller
 * Handles core ZAP API operations
 */

/**
 * GET /api/core/version
 * Get OWASP ZAP version
 */
exports.getVersion = async (req, res) => {
  const version = await zapService.getVersion();
  res.json({
    success: true,
    data: version,
  });
};

/**
 * GET /api/core/urls
 * Get all URLs currently in scope
 */
exports.getUrls = async (req, res) => {
  const urls = await zapService.getUrls();
  res.json({
    success: true,
    data: urls,
  });
};

/**
 * POST /api/core/access-url
 * Seed a URL into ZAP to include it in scope
 */
exports.accessUrl = async (req, res) => {
  const { url, followRedirects = true } = req.body;

  const result = await zapService.accessUrl(url, followRedirects);
  res.json({
    success: true,
    message: "URL accessed successfully",
    data: result,
  });
};
