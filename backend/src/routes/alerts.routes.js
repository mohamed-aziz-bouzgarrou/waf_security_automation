const express = require("express");
const router = express.Router();
const alertsController = require("../controllers/alerts.controller");

/**
 * Alerts Routes
 * GET /api/alerts - Get all alerts
 * GET /api/alerts/summary - Get alerts summary
 * GET /api/alerts/by-risk - Get alerts grouped by risk
 * GET /api/alerts/count - Get total alert count
 * DELETE /api/alerts - Delete all alerts
 */

router.get("/", alertsController.getAlerts);

router.get("/summary", alertsController.getAlertsSummary);

router.get("/by-risk", alertsController.getAlertsByRisk);

router.get("/count", alertsController.getAlertsCount);

router.delete("/", alertsController.deleteAlerts);

module.exports = router;
