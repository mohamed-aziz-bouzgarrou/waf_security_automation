const express = require("express");
const router = express.Router();
const reportsController = require("../controllers/reports.controller");

/**
 * Reports Routes
 * GET /api/reports/html - Download HTML report
 * GET /api/reports/xml - Download XML report
 * GET /api/reports/json - Get JSON report
 * POST /api/reports/generate - Generate custom report
 * GET /api/reports/list/all - Get all saved reports
 * GET /api/reports/scan/:scanId - Get report by scan ID
 * GET /api/reports/:reportId/download - Download saved report
 * GET /api/reports/:scanId/content - Get report content by scan ID
 * DELETE /api/reports/:reportId - Delete report
 */

router.get("/html", reportsController.getHtmlReport);

router.get("/xml", reportsController.getXmlReport);

router.get("/json", reportsController.getJsonReport);

router.post("/generate", reportsController.generateReport);

// Saved reports routes (from Report collection in DB)
router.get("/list/all", reportsController.getAllReports);

router.get("/scan/:scanId", reportsController.getReportByScanId);

router.get("/:scanId/content", reportsController.getReportContent);

router.get("/:reportId/download", reportsController.downloadReport);

router.delete("/:reportId", reportsController.deleteReport);

module.exports = router;
