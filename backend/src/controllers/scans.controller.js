const axios = require("axios");
const ScanV2 = require("../models/ScanV2");
const { generateFortiWebCommands } = require("../utils/fortiwebCommands");

// Import scan status tracker from scan.controller
const ScanController = require("./scan.controller");

/**
 * POST /api/scans
 * Create or update a scan (uses ScanV2 model)
 * If scanId exists in DB, updates it; otherwise creates new
 */
exports.createScan = async (req, res) => {
  try {
    const { target, report, structured, scanId } = req.body;

    // Validate required fields
    if (!target) {
      return res.status(400).json({
        success: false,
        error: "Target is required",
      });
    }

    // Parse structured JSON if it's a string
    let parsedStructured = structured;
    if (typeof structured === "string") {
      try {
        parsedStructured = JSON.parse(structured);
      } catch (err) {
        return res.status(400).json({
          success: false,
          error: "Failed to parse structured JSON",
          details: err.message,
        });
      }
    }

    // Ensure structured is an object
    if (!parsedStructured || typeof parsedStructured !== "object") {
      parsedStructured = {};
    }

    let scan;
    const scanData = {
      target,
      ...(report && { report }),
      structured: parsedStructured,
      status: "REPORT_RECEIVED",
      reportReceivedAt: new Date(),
    };

    if (scanId) {
      // Try to find and update existing scan
      scan = await ScanV2.findOne({ scanId });

      if (scan) {
        // Update existing scan
        Object.assign(scan, scanData);
        await scan.save();
        console.log(
          `[Create Scan] Updated existing scan with scanId: ${scanId}`,
        );
      } else {
        // Create new scan with scanId
        scan = new ScanV2({
          scanId,
          ...scanData,
        });
        await scan.save();
        console.log(`[Create Scan] Created new scan with scanId: ${scanId}`);
      }
    } else {
      // Create new scan without scanId
      scan = new ScanV2(scanData);
      await scan.save();
      console.log(`[Create Scan] Created new scan`);
    }

    // Update status tracker if needed
    if (scanId && ScanController.getScanStatusTracker) {
      const tracker = ScanController.getScanStatusTracker();
      if (tracker && tracker[scanId]) {
        tracker[scanId].status = "report_ready";
        tracker[scanId].report = report || "";
        tracker[scanId].structured = parsedStructured;
        if (parsedStructured && parsedStructured.summary) {
          tracker[scanId].summary = parsedStructured.summary;
        }
        if (parsedStructured && parsedStructured.issues) {
          tracker[scanId].alerts = parsedStructured.issues;
          tracker[scanId].alertCount = parsedStructured.issues.length;
        }
        console.log(
          `[Create Scan] Updated status tracker for scanId ${scanId}`,
        );
      }
    }

    return res.status(201).json({
      success: true,
      message: "Scan created/updated successfully",
      data: scan,
    });
  } catch (error) {
    console.error("Error creating scan:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to create scan",
      details: error.message,
    });
  }
};

/**
 * GET /api/scans
 * Get all scans sorted by newest first
 */
exports.getAllScans = async (req, res) => {
  try {
    const scans = await ScanV2.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: scans.length,
      data: scans,
    });
  } catch (error) {
    console.error("Error fetching scans:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch scans",
      details: error.message,
    });
  }
};

/**
 * GET /api/scans/:id
 * Get a single scan by ID (supports both MongoDB _id and scanId)
 */
exports.getScanById = async (req, res) => {
  try {
    const { id } = req.params;
    let scan = null;

    // Try to find by MongoDB _id first
    if (require("mongoose").Types.ObjectId.isValid(id)) {
      scan = await ScanV2.findById(id).lean();
    }

    // If not found by _id, try scanId field lookup
    if (!scan) {
      scan = await ScanV2.findOne({ scanId: id }).lean();
    }

    if (!scan) {
      return res.status(404).json({
        success: false,
        error: "Scan not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: scan,
    });
  } catch (error) {
    console.error("Error fetching scan:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch scan",
      details: error.message,
    });
  }
};

/**
 * GET /api/scans/:id/download-report
 * Download scan report as text
 */
exports.downloadReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { format = "markdown" } = req.query; // 'markdown' or 'json-zap'
    let scan = null;

    // Try to find by MongoDB _id first
    if (require("mongoose").Types.ObjectId.isValid(id)) {
      scan = await ScanV2.findById(id).lean();
    }

    // If not found by _id, try scanId field lookup
    if (!scan) {
      scan = await ScanV2.findOne({ scanId: id }).lean();
    }

    if (!scan) {
      return res.status(404).json({
        success: false,
        error: "Scan not found",
      });
    }

    // Handle ZAP JSON report download
    if (format === "json-zap") {
      if (!scan.zapReport) {
        return res.status(404).json({
          success: false,
          error: "ZAP report not available for this scan",
        });
      }

      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="zap-report-${id}.json"`,
      );
      res.send(JSON.stringify(scan.zapReport, null, 2));
      return;
    }

    // Default: Handle markdown report download (AI-enriched)
    if (!scan.report) {
      return res.status(404).json({
        success: false,
        error: "Report not available for this scan",
      });
    }

    res.setHeader("Content-Type", "text/plain");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="scan-report-${id}.txt"`,
    );
    res.send(scan.report);
  } catch (error) {
    console.error("Error downloading report:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to download report",
      details: error.message,
    });
  }
};
