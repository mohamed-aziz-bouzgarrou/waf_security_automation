const express = require("express");
const router = express.Router();
const passiveScanController = require("../controllers/passiveScan.controller");

/**
 * Passive Scan Routes
 * GET /api/passive-scan/queue - Get passive scan queue
 * POST /api/passive-scan/enable - Enable passive scanners
 * POST /api/passive-scan/disable - Disable passive scanners
 */

router.get("/queue", passiveScanController.getPassiveScanQueue);

router.post("/enable", passiveScanController.enablePassiveScan);

router.post("/disable", passiveScanController.disablePassiveScan);

module.exports = router;
