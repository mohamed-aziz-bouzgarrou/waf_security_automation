const zapService = require("../services/zap.service");

/**
 * Spider Controller
 * Handles OWASP ZAP spider scan operations
 */

/**
 * POST /api/spider/start
 * Start a spider scan on a target URL
 * Body: { url, recurse }
 */
exports.startSpider = async (req, res) => {
  const { url, recurse = true } = req.body;

  const result = await zapService.startSpider(url, recurse);
  res.status(200).json({
    success: true,
    message: "Spider scan started",
    data: result,
  });
};

/**
 * GET /api/spider/status/:scanId
 * Get the status of a spider scan
 */
exports.getSpiderStatus = async (req, res) => {
  const { scanId = 0 } = req.params;

  const status = await zapService.getSpiderStatus(parseInt(scanId, 10));
  res.json({
    success: true,
    data: {
      scanId: parseInt(scanId, 10),
      status,
      percentComplete: status,
    },
  });
};

/**
 * GET /api/spider/results/:scanId
 * Get URLs discovered by the spider
 */
exports.getSpiderResults = async (req, res) => {
  const { scanId = 0 } = req.params;

  const results = await zapService.getSpiderResults(parseInt(scanId, 10));
  res.json({
    success: true,
    data: {
      scanId: parseInt(scanId, 10),
      urls: results,
      count: results.length,
    },
  });
};
