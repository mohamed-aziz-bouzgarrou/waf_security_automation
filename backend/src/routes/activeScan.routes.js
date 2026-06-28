const express = require("express");
const router = express.Router();
const activeScanController = require("../controllers/activeScan.controller");
const {
  validateTarget,
  validateScanId,
} = require("../middleware/validateTarget");

/**
 * Active Scan Routes
 * POST /api/active-scan/start - Start active scan
 * GET /api/active-scan/status/:scanId - Get active scan status
 * GET /api/active-scan/progress/:scanId - Get active scan progress
 * GET /api/active-scan/list - List all active scans
 * POST /api/active-scan/stop/:scanId - Stop active scan
 */

router.post("/start", validateTarget, activeScanController.startActiveScan);

router.get(
  "/status/:scanId",
  validateScanId,
  activeScanController.getActiveScanStatus,
);

router.get(
  "/progress/:scanId",
  validateScanId,
  activeScanController.getActiveScanProgress,
);

router.get("/list", activeScanController.listActiveScans);

router.post(
  "/stop/:scanId",
  validateScanId,
  activeScanController.stopActiveScan,
);

module.exports = router;
