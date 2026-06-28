const express = require("express");
const router = express.Router();
const coreController = require("../controllers/core.controller");
const { validateTarget } = require("../middleware/validateTarget");

/**
 * Core Routes
 * GET /api/core/version - Get ZAP version
 * GET /api/core/urls - Get all URLs in scope
 * POST /api/core/access-url - Seed a URL into ZAP
 */

router.get("/version", coreController.getVersion);

router.get("/urls", coreController.getUrls);

router.post("/access-url", validateTarget, coreController.accessUrl);

module.exports = router;
