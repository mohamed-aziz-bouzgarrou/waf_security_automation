const zapService = require("../services/zap.service");

/**
 * AJAX Spider Controller
 * Handles OWASP ZAP AJAX spider operations
 */

/**
 * POST /api/ajax-spider/start
 * Start an AJAX spider scan
 * Body: { url }
 */
exports.startAjaxSpider = async (req, res) => {
  const { url } = req.body;

  const result = await zapService.startAjaxSpider(url);
  res.status(200).json({
    success: true,
    message: "AJAX spider scan started",
    data: result,
  });
};

/**
 * GET /api/ajax-spider/status
 * Get the current status of AJAX spider
 */
exports.getAjaxSpiderStatus = async (req, res) => {
  const status = await zapService.getAjaxSpiderStatus();
  res.json({
    success: true,
    data: status,
  });
};

/**
 * POST /api/ajax-spider/stop
 * Stop the currently running AJAX spider
 */
exports.stopAjaxSpider = async (req, res) => {
  const result = await zapService.stopAjaxSpider();
  res.json({
    success: true,
    message: "AJAX spider stopped",
    data: result,
  });
};
