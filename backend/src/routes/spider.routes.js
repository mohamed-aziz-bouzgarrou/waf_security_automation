const express = require("express");
const router = express.Router();
const spiderController = require("../controllers/spider.controller");
const {
  validateTarget,
  validateScanId,
} = require("../middleware/validateTarget");

/**
 * Spider Routes
 * POST /api/spider/start - Start a spider scan
 * GET /api/spider/status/:scanId - Get spider scan status
 * GET /api/spider/results/:scanId - Get spider results
 */

router.post("/start", validateTarget, spiderController.startSpider);

router.get("/status/:scanId", validateScanId, spiderController.getSpiderStatus);

router.get(
  "/results/:scanId",
  validateScanId,
  spiderController.getSpiderResults,
);

module.exports = router;
