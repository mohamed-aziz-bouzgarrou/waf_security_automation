const zapService = require("../services/zap.service");
const Report = require("../models/Report");
const PDFDocument = require("pdfkit");

/**
 * Reports Controller
 * Handles OWASP ZAP report generation
 */

/**
 * GET /api/reports/html
 * Download HTML report
 */
exports.getHtmlReport = async (req, res) => {
  const { title, template } = req.query;

  const reportStream = await zapService.generateHtmlReport({
    title: title || "OWASP ZAP Security Report",
    template: template || "traditional-html",
  });

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="security-report-${Date.now()}.html"`,
  );

  reportStream.pipe(res);
};

/**
 * GET /api/reports/xml
 * Download XML report
 */
exports.getXmlReport = async (req, res) => {
  const { title, template } = req.query;

  const reportStream = await zapService.generateXmlReport({
    title: title || "OWASP ZAP Security Report",
    template: template || "traditional-xml",
  });

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="security-report-${Date.now()}.xml"`,
  );

  reportStream.pipe(res);
};

/**
 * GET /api/reports/json
 * Get JSON report of alerts
 */
exports.getJsonReport = async (req, res) => {
  const report = await zapService.generateJsonReport();
  res.json({
    success: true,
    data: report,
  });
};

/**
 * POST /api/reports/generate
 * Generate custom report with options
 * Body: { title, template, reportDir, reportFileName }
 */
exports.generateReport = async (req, res) => {
  const options = req.body;

  const report = await zapService.generateCustomReport({
    title: options.title || "OWASP ZAP Security Report",
    template: options.template || "traditional-html",
    reportDir: options.reportDir,
    reportFileName: options.reportFileName,
  });

  res.status(201).json({
    success: true,
    message: "Report generated",
    data: report,
  });
};

/**
 * GET /api/reports/list/all
 * Get all saved reports from DB sorted by most recent first
 */
/**
 * Helper function to normalize report summary from various formats
 */
const normalizeSummary = (report) => {
  let summary = report.summary || {};

  // If using ZAP format with alertsSummary (capitalized keys)
  if (summary.alertsSummary) {
    summary = {
      critical: 0,
      high: summary.alertsSummary.High || 0,
      medium: summary.alertsSummary.Medium || 0,
      low: summary.alertsSummary.Low || 0,
      informational: summary.alertsSummary.Informational || 0,
    };
  }

  // Ensure all fields exist
  summary = {
    critical: summary.critical || 0,
    high: summary.high || 0,
    medium: summary.medium || 0,
    low: summary.low || 0,
    informational: summary.informational || 0,
  };

  // If summary is still all zeros, try to calculate from issues array
  if (summary.total === undefined || summary.total === 0) {
    if (report.issues && Array.isArray(report.issues)) {
      console.log(
        `[normalizeSummary] Calculating from ${report.issues.length} issues`,
      );
      summary.critical = report.issues.filter(
        (i) => i.severity === "CRITICAL",
      ).length;
      summary.high = report.issues.filter((i) => i.severity === "HIGH").length;
      summary.medium = report.issues.filter(
        (i) => i.severity === "MEDIUM",
      ).length;
      summary.low = report.issues.filter((i) => i.severity === "LOW").length;
      summary.informational = report.issues.filter(
        (i) => i.severity === "INFORMATIONAL",
      ).length;
    }
  }

  // Calculate total
  summary.total =
    summary.critical +
    summary.high +
    summary.medium +
    summary.low +
    (summary.informational || 0);

  console.log(`[normalizeSummary] Final summary:`, summary);
  return summary;
};

/**
 * GET /api/reports/list/all
 * Get all saved reports from DB sorted by most recent first
 */
exports.getAllReports = async (req, res) => {
  try {
    console.log("[Get All Reports] Fetching all reports from DB...");

    const reports = await Report.find().sort({ createdAt: -1 }).lean();

    console.log(`[Get All Reports] Found ${reports.length} reports`);

    return res.json({
      success: true,
      data: reports.map((report) => {
        const summary = normalizeSummary(report);

        return {
          id: report._id.toString(),
          reportId: report.reportId,
          scanId: report.scanId,
          name: `Security Report - ${new Date(report.generatedAt || report.createdAt).toLocaleDateString()}`,
          target: report.target,
          type: "JSON",
          reportType: report.reportType,
          generatedDate: new Date(
            report.generatedAt || report.createdAt,
          ).toLocaleDateString(),
          fileSize: report.fileSize,
          vulnerabilitiesFound: summary.total,
          summary: summary,
          structured: report.structured || {},
          zapData: report.zapData || {},
          rawZapReport: report.rawZapReport || "",
          status: report.status,
          createdAt: report.createdAt,
        };
      }),
    });
  } catch (error) {
    console.error("[Get All Reports] Error:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * GET /api/reports/scan/:scanId
 * Get report by scan ID
 */
exports.getReportByScanId = async (req, res) => {
  try {
    const { scanId } = req.params;
    console.log(
      `[Get Report By Scan ID] Fetching report for scanId: ${scanId}`,
    );

    const report = await Report.findOne({ scanId }).lean();

    if (!report) {
      console.log(
        `[Get Report By Scan ID] Report not found for scanId: ${scanId}`,
      );
      return res.status(404).json({
        success: false,
        error: "Report not found",
      });
    }

    console.log(`[Get Report By Scan ID] Report found: ${report.reportId}`);

    const summary = normalizeSummary(report);

    return res.json({
      success: true,
      data: {
        id: report._id.toString(),
        reportId: report.reportId,
        scanId: report.scanId,
        target: report.target,
        report: report.report,
        reportType: report.reportType,
        structured: report.structured,
        summary: summary,
        zapData: report.zapData,
        rawZapReport: report.rawZapReport || "",
        fileSize: report.fileSize,
        status: report.status,
        generatedAt: report.generatedAt,
        createdAt: report.createdAt,
      },
    });
  } catch (error) {
    console.error("[Get Report By Scan ID] Error:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * GET /api/reports/:reportId/download
 * Download report as JSON
 */
exports.downloadReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    console.log(`[Download Report] Fetching report: ${reportId}`);

    const report = await Report.findById(reportId).lean();

    if (!report) {
      console.log(`[Download Report] Report not found: ${reportId}`);
      return res.status(404).json({
        success: false,
        error: "Report not found",
      });
    }

    console.log(
      `[Download Report] Preparing PDF download for: ${report.reportId}`,
    );

    const summary = normalizeSummary(report);

    // Create PDF document
    const doc = new PDFDocument({ margin: 50, bufferPages: true });
    const fileName = `security-report-${report.scanId}-${new Date(report.generatedAt).getTime()}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    // Pipe PDF to response
    doc.pipe(res);

    // Title
    doc
      .fontSize(24)
      .font("Helvetica-Bold")
      .text("Security Report", { underline: true });
    doc.moveDown(0.5);

    // Report Info
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("Report Information", { underline: true });
    doc.fontSize(10).font("Helvetica");
    doc.text(`Report ID: ${report.reportId}`);
    doc.text(`Scan ID: ${report.scanId}`);
    doc.text(`Target: ${report.target}`);
    doc.text(`Generated: ${new Date(report.generatedAt).toLocaleString()}`);
    doc.text(`Report Type: ${report.reportType}`);
    doc.moveDown();

    // Vulnerability Summary
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("Vulnerability Summary", { underline: true });
    doc.fontSize(10).font("Helvetica");
    doc.text(`Total Issues: ${summary.total}`);
    doc.text(`Critical: ${summary.critical}`, { color: "CC0000" });
    doc.text(`High: ${summary.high}`, { color: "FF6600" });
    doc.text(`Medium: ${summary.medium}`, { color: "FFCC00" });
    doc.text(`Low: ${summary.low}`, { color: "0066FF" });
    doc.text(`Informational: ${summary.informational}`, { color: "666666" });
    doc.moveDown();

    // Issues Details
    if (
      report.zapData &&
      report.zapData.rawAlerts &&
      report.zapData.rawAlerts.length > 0
    ) {
      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("Detected Issues", { underline: true });
      doc.fontSize(9).font("Helvetica");

      report.zapData.rawAlerts.slice(0, 50).forEach((alert, index) => {
        if (doc.y > 700) doc.addPage();

        doc
          .fontSize(10)
          .font("Helvetica-Bold")
          .text(
            `${index + 1}. ${alert.name || alert.alertname || "Unknown Issue"}`,
          );
        doc.fontSize(9).font("Helvetica");
        doc.text(`Severity: ${alert.riskdesc || alert.risk || "N/A"}`);
        doc.text(`URL: ${alert.url || "N/A"}`, { width: 450 });
        if (alert.description) {
          doc.text(`Description: ${alert.description}`, { width: 450 });
        }
        doc.moveDown(0.3);
      });

      if (report.zapData.rawAlerts.length > 50) {
        doc.text(`... and ${report.zapData.rawAlerts.length - 50} more issues`);
      }
      doc.moveDown();
    }

    // Structured Data
    if (report.structured) {
      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("Scan Details", { underline: true });
      doc.fontSize(9).font("Helvetica");
      doc.text(`Scan ID: ${report.structured.scanId}`);
      doc.text(`Host: ${report.structured.host}`);
      if (report.structured.issues && Array.isArray(report.structured.issues)) {
        doc.text(`Total Structured Issues: ${report.structured.issues.length}`);
      }
    }

    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error("[Download Report] Error:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * DELETE /api/reports/:reportId
 * Delete a report
 */
exports.deleteReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    console.log(`[Delete Report] Deleting report: ${reportId}`);

    const result = await Report.findByIdAndDelete(reportId);

    if (!result) {
      console.log(`[Delete Report] Report not found: ${reportId}`);
      return res.status(404).json({
        success: false,
        error: "Report not found",
      });
    }

    console.log(`[Delete Report] ✅ Report deleted: ${reportId}`);

    return res.json({
      success: true,
      message: "Report deleted successfully",
      reportId: result.reportId,
    });
  } catch (error) {
    console.error("[Delete Report] Error:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * GET /api/reports/:scanId/content
 * Get raw report content with structured data
 */
exports.getReportContent = async (req, res) => {
  try {
    const { scanId } = req.params;
    console.log(`[Get Report Content] Fetching content for scanId: ${scanId}`);

    const report = await Report.findOne({ scanId }).lean();

    if (!report) {
      console.log(
        `[Get Report Content] Report not found for scanId: ${scanId}`,
      );
      return res.status(404).json({
        success: false,
        error: "Report not found",
      });
    }

    console.log(
      `[Get Report Content] Content length: ${report.report?.length || 0} chars`,
    );

    return res.json({
      success: true,
      data: {
        scanId: report.scanId,
        target: report.target,
        report: report.report,
        reportType: report.reportType,
        summary: report.summary,
        structured: report.structured || {},
        zapData: report.zapData || {},
        generatedAt: report.generatedAt,
      },
    });
  } catch (error) {
    console.error("[Get Report Content] Error:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
