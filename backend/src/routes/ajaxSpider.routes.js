const express = require("express");
const router = express.Router();
const ajaxSpiderController = require("../controllers/ajaxSpider.controller");
const { validateTarget } = require("../middleware/validateTarget");

/**
 * AJAX Spider Routes
 * POST /api/ajax-spider/start - Start AJAX spider
 * GET /api/ajax-spider/status - Get AJAX spider status
 * POST /api/ajax-spider/stop - Stop AJAX spider
 */

router.post("/start", validateTarget, ajaxSpiderController.startAjaxSpider);

router.get("/status", ajaxSpiderController.getAjaxSpiderStatus);

router.post("/stop", ajaxSpiderController.stopAjaxSpider);

module.exports = router;
