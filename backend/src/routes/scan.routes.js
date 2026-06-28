const express = require("express");
const router = express.Router();
const scanController = require("../controllers/scan.controller");
const webhookV2Controller = require("../controllers/webhookV2.controller");
const { validateTarget } = require("../middleware/validateTarget");

/**
 * Scan Orchestration Routes
 * POST /api/scan/full - Execute full security scan workflow
 * POST /api/scan/quick - Execute quick scan without AJAX spider
 * POST /api/scan/webhook - Webhook for n8n to update scan results (uses V2 handler)
 * POST /api/scan/webhook-v2 - Dual-payload webhook (report + CLI commands) (same handler)
 * GET /api/scan/status/:scanId - Get scan status
 * GET /api/scan/status-v2/:scanId - Get scan status with dual-payload data
 * GET /api/scan/test-webhook - Test webhook notification
 */

router.post("/full", validateTarget, scanController.fullScan);

router.post("/quick", validateTarget, scanController.quickScan);

router.post("/quick-test", scanController.quickTestScan);

// Both /webhook and /webhook-v2 use the same handler for consistency
router.post("/webhook", webhookV2Controller.handleWebhookV2);

router.post("/webhook-v2", webhookV2Controller.handleWebhookV2);

// SSH execution results webhook from n8n
router.post("/webhook/ssh-execution", webhookV2Controller.handleSshExecutionWebhook);

router.get("/status/:scanId", scanController.getScanStatus);

// V2 endpoint - uses ScanV2 model with both report and CLI commands
router.get("/status-v2/:scanId", webhookV2Controller.getScanStatusV2);

router.post("/test-complete", scanController.testCompleteScan);

router.post("/test-cli-webhook", scanController.testCliWebhook);

router.get("/test-retrieve/:scanId", scanController.testRetrieveScan);

router.get("/test-webhook", scanController.testWebhook);

module.exports = router;
