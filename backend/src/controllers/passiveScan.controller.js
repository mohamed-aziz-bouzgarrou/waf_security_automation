const zapService = require("../services/zap.service");

/**
 * Passive Scan Controller
 * Handles OWASP ZAP passive scan operations
 */

/**
 * GET /api/passive-scan/queue
 * Get the number of records waiting in the passive scan queue
 */
exports.getPassiveScanQueue = async (req, res) => {
  const queue = await zapService.getPassiveScanQueue();
  res.json({
    success: true,
    data: {
      recordsToScan: queue,
    },
  });
};

/**
 * POST /api/passive-scan/enable
 * Enable all passive scanners
 */
exports.enablePassiveScan = async (req, res) => {
  const result = await zapService.enablePassiveScan();
  res.status(201).json({
    success: true,
    message: "Passive scanners enabled",
    data: result,
  });
};

/**
 * POST /api/passive-scan/disable
 * Disable all passive scanners
 */
exports.disablePassiveScan = async (req, res) => {
  const result = await zapService.disablePassiveScan();
  res.status(201).json({
    success: true,
    message: "Passive scanners disabled",
    data: result,
  });
};
