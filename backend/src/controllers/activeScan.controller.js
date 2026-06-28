const zapService = require("../services/zap.service");
const ScanV2 = require("../models/ScanV2");

/**
 * Active Scan Controller
 * Handles OWASP ZAP active scan operations
 */

/**
 * POST /api/active-scan/start
 * Start an active scan on a target URL
 * Body: { url, recurse, scanPolicyName }
 */
exports.startActiveScan = async (req, res) => {
  const { url, recurse = true, scanPolicyName = "Default Policy" } = req.body;

  try {
    // Start ZAP scan
    const zapResult = await zapService.startActiveScan(
      url,
      recurse,
      scanPolicyName,
    );
    const zapScanId = zapResult.scan; // ZAP returns { scan: <id> }

    // Generate frontend scan ID
    const scanId = Date.now().toString();

    // Save to MongoDB with both IDs
    try {
      const newScan = new ScanV2({
        scanId,
        zapScanId, // Save ZAP ID as-is
        target: url,
        status: "SCAN_STARTED",
        statusMessage: "🔄 ZAP is scanning...",
      });
      await newScan.save();
      console.log(
        `[Active Scan] Created scan ${scanId} with ZAP ID ${zapScanId}`,
      );
    } catch (dbError) {
      console.error("[Active Scan] DB Error:", dbError.message);
      // Continue anyway - don't fail the scan if DB save fails
    }

    res.status(200).json({
      success: true,
      message: "Active scan started",
      data: {
        ...zapResult,
        scanId, // Frontend ID for polling
        zapScanId, // ZAP scanner ID (as-is)
      },
    });
  } catch (error) {
    console.error("[Active Scan] Error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * GET /api/active-scan/status/:scanId
 * Get the status of an active scan (0-100%)
 */
exports.getActiveScanStatus = async (req, res) => {
  const { scanId = 0 } = req.params;

  const status = await zapService.getActiveScanStatus(parseInt(scanId, 10));
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
 * GET /api/active-scan/progress/:scanId
 * Get detailed progress information of an active scan
 */
exports.getActiveScanProgress = async (req, res) => {
  const { scanId = 0 } = req.params;

  const progress = await zapService.getActiveScanProgress(parseInt(scanId, 10));
  res.json({
    success: true,
    data: progress,
  });
};

/**
 * GET /api/active-scan/list
 * List all active scans
 */
exports.listActiveScans = async (req, res) => {
  const scans = await zapService.listActiveScans();
  res.json({
    success: true,
    data: {
      scans,
      count: scans.length,
    },
  });
};

/**
 * POST /api/active-scan/stop/:scanId
 * Stop an active scan
 */
exports.stopActiveScan = async (req, res) => {
  const { scanId = 0 } = req.params;

  const result = await zapService.stopActiveScan(parseInt(scanId, 10));
  res.json({
    success: true,
    message: "Active scan stopped",
    data: result,
  });
};
