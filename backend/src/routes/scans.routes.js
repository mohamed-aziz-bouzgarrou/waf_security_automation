const express = require("express");
const router = express.Router();
const validateApiKey = require("../middleware/validateApiKey");
const scansController = require("../controllers/scans.controller");
const scansV2Controller = require("../controllers/scansV2.controller");

/**
 * POST /api/scans
 * Create a new scan
 * Required: x-api-key header
 */
router.post("/", scansController.createScan);

/**
 * GET /api/scans
 * Get all scans
 * Required: x-api-key header
 */
router.get("/", scansController.getAllScans);

/**
 * GET /api/scans/:id
 * Get a single scan
 * Required: x-api-key header
 */
router.get("/:id", scansController.getScanById);

/**
 * POST /api/scans/:id/approve
 * Approve a scan and send FortiWeb commands (dual-payload)
 * Required: x-api-key header
 */
router.post("/:id/approve", scansV2Controller.approveScan);

/**
 * POST /api/scans/:id/approve-partial
 * Approve selected CLI command sets (dual-payload)
 * Body: { approvedIndices: [0, 2, 4] }
 * Required: x-api-key header
 */
router.post("/:id/approve-partial", scansV2Controller.approveScanPartial);

/**
 * POST /api/scans/:id/approve-ssh
 * Approve selected or all CLI commands and send to SSH webhook
 * Body: { groupIndices: [0, 2], approveAll: false }
 * Required: x-api-key header
 */
router.post("/:id/approve-ssh", scansV2Controller.approveScanSSH);

/**
 * POST /api/scans/:id/send-command-to-n8n
 * Send a single command set to n8n webhook for execution
 * Body: { commandSetIndex: 0, commandSet: {...} }
 * Required: x-api-key header
 */
router.post("/:id/send-command-to-n8n", scansV2Controller.sendCommandSetToN8n);

/**
 * POST /api/scans/:id/reject
 * Reject a scan (dual-payload)
 * Required: x-api-key header
 */
router.post("/:id/reject", scansV2Controller.rejectScan);

/**
 * GET /api/scans/:id/download-report
 * Download scan report as text file
 * Required: x-api-key header
 */
router.get(
  "/:id/download-report",
  scansController.downloadReport,
);

module.exports = router;
