const zapService = require("../services/zap.service");

/**
 * Alerts Controller
 * Handles OWASP ZAP alert operations
 */

/**
 * GET /api/alerts
 * Get all alerts with optional filtering
 * Query: baseurl, start, count, riskId
 */
exports.getAlerts = async (req, res) => {
  const { baseurl, start, count, riskId } = req.query;

  const alerts = await zapService.getAlerts({
    baseurl,
    start: start ? parseInt(start, 10) : undefined,
    count: count ? parseInt(count, 10) : undefined,
    riskId,
  });

  res.json({
    success: true,
    data: {
      alerts,
      count: alerts.length,
    },
  });
};

/**
 * GET /api/alerts/summary
 * Get alert summary grouped by risk level
 */
exports.getAlertsSummary = async (req, res) => {
  const summary = await zapService.getAlertsSummary();
  res.json({
    success: true,
    data: summary,
  });
};

/**
 * GET /api/alerts/by-risk
 * Get alerts grouped by risk level
 */
exports.getAlertsByRisk = async (req, res) => {
  const alerts = await zapService.getAlertsByRisk();
  res.json({
    success: true,
    data: alerts,
  });
};

/**
 * GET /api/alerts/count
 * Get total count of alerts
 */
exports.getAlertsCount = async (req, res) => {
  const count = await zapService.getAlertsCount();
  res.json({
    success: true,
    data: {
      count,
    },
  });
};

/**
 * DELETE /api/alerts
 * Delete all alerts
 */
exports.deleteAlerts = async (req, res) => {
  const result = await zapService.deleteAlerts();
  res.json({
    success: true,
    message: "All alerts deleted",
    data: result,
  });
};
