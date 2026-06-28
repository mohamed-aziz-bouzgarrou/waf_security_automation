/**
 * Enhanced Webhook Handler (V2)
 * Supports both report and CLI commands payloads for the same scanId
 *
 * Payload Type 1: Analysis Report
 * {
 *   "scanId": "string",
 *   "host": "string",
 *   "report": "markdown string",
 *   "structured": {
 *     "summary": { total, critical, high, medium, low, informational },
 *     "issues": [...]
 *   }
 * }
 *
 * Payload Type 2: CLI Commands for FortiWeb
 * {
 *   "scanId": "string",
 *   "host": "string",
 *   "type": "cli_commands",
 *   "cli_commands": [
 *     {
 *       "issue_id": "string",
 *       "issue_name": "string",
 *       "severity": "CRITICAL|HIGH|MEDIUM|LOW",
 *       "description": "short description",
 *       "commands": [...],
 *       "notes": "optional string"
 *     }
 *   ],
 *   "cli_summary": "string",
 *   "warnings": ["array of strings"]
 * }
 */

const ScanV2 = require("../models/ScanV2");
const { scanStatusTracker } = require("../utils/scanTracker");

/**
 * POST /api/scan/webhook
 * Enhanced handler supporting both report and CLI commands payloads
 */
exports.handleWebhookV2 = async (req, res) => {
  try {
    const { scanId, host, type, ...payload } = req.body;

    if (!scanId) {
      return res.status(400).json({
        success: false,
        error: "scanId is required",
      });
    }

    // Route to appropriate handler based on payload type
    if (type === "cli_commands") {
      return handleCliCommandsPayload(scanId, host, payload, req, res);
    } else {
      // Default: treat as analysis report (backward compatible)
      return handleReportPayload(scanId, host, payload, req, res);
    }
  } catch (error) {
    console.error("[Webhook V2] Unhandled error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      scanId: req.body?.scanId || "unknown",
    });
  }
};

/**
 * Handle Analysis Report Payload (First webhook)
 */
async function handleReportPayload(scanId, host, payload, req, res) {
  const { report, structured } = payload;

  console.log(
    `[Webhook V2 - Report] Received analysis report for scanId ${scanId}`,
  );

  if (!report) {
    return res.status(400).json({
      success: false,
      error: "report is required",
    });
  }

  try {
    // Update tracker
    scanStatusTracker[scanId] = {
      id: scanId,
      target: host || "unknown",
      status: "REPORT_RECEIVED",
      statusMessage: "✅ AI analysis complete. Generating CLI commands...",
      report: report,
      structured: structured || {},
      createdAt: new Date().toISOString(),
    };

    console.log(
      `[Webhook V2 - Report] Updated tracker for ${scanId}, awaiting CLI commands...`,
    );

    // Persist to MongoDB
    try {
      const scanData = {
        report: report,
        structured: structured || {},
        status: "REPORT_RECEIVED", // Report has arrived, awaiting CLI commands
        statusMessage: "✅ AI analysis complete. Generating CLI commands...",
        reportReceivedAt: new Date(),
      };

      const existingScan = await ScanV2.findOne({ scanId });

      if (existingScan) {
        // Update existing scan
        Object.assign(existingScan, scanData);
        await existingScan.save();
        console.log(`[Webhook V2 - Report] Updated scan ${scanId} in MongoDB`);
      } else {
        // Create new scan (shouldn't happen if fullScan worked, but handle it)
        const newScan = new ScanV2({
          scanId,
          target: host || "unknown",
          ...scanData,
        });
        await newScan.save();
        console.log(
          `[Webhook V2 - Report] Created new scan ${scanId} in MongoDB`,
        );
      }
    } catch (dbError) {
      console.error(
        `[Webhook V2 - Report] MongoDB error for ${scanId}:`,
        dbError.message,
      );
      // Non-blocking: continue with tracker as fallback
    }

    return res.status(200).json({
      success: true,
      message: "Analysis report received and processed",
      data: {
        scanId,
        issuesFound: structured?.summary?.total || 0,
        status: "REPORT_RECEIVED",
        payload_type: "report",
      },
    });
  } catch (error) {
    console.error(`[Webhook V2 - Report] Error processing report:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      scanId,
    });
  }
}

/**
 * Handle CLI Commands Payload (Second webhook)
 */
async function handleCliCommandsPayload(scanId, host, payload, req, res) {
  const { cli_commands, cli_summary, warnings } = payload;

  console.log(
    `[Webhook V2 - CLI] Received CLI commands for scanId ${scanId}, command sets: ${cli_commands?.length || 0}`,
  );

  if (!Array.isArray(cli_commands) || cli_commands.length === 0) {
    console.error(
      `[Webhook V2 - CLI] Invalid cli_commands: ${JSON.stringify(cli_commands)}`,
    );
    return res.status(400).json({
      success: false,
      error: "cli_commands must be a non-empty array",
    });
  }

  try {
    // Update tracker
    if (scanStatusTracker[scanId]) {
      // Set status to cli_ready if both report and CLI have arrived
      if (scanStatusTracker[scanId].report) {
        scanStatusTracker[scanId].status = "cli_ready";
        scanStatusTracker[scanId].statusMessage =
          "✅ CLI commands ready. Please review and approve.";
      } else {
        scanStatusTracker[scanId].status = "cli_received";
        scanStatusTracker[scanId].statusMessage =
          "✅ CLI commands received. Waiting for analysis report...";
      }
      scanStatusTracker[scanId].cliCommands = {
        commands: cli_commands,
        summary: cli_summary || "",
        warnings: warnings || [],
        totalCommands: cli_commands.length,
        appliedCommands: 0,
        executionStatus: "PENDING_APPROVAL",
      };
      scanStatusTracker[scanId].updatedAt = new Date().toISOString();

      console.log(
        `[Webhook V2 - CLI] Updated tracker for ${scanId}, status: ${scanStatusTracker[scanId].status}`,
      );
    } else {
      // Scan not in tracker yet (CLI arrived before report - unusual but supported)
      console.warn(
        `[Webhook V2 - CLI] Scan ${scanId} not in tracker, creating entry`,
      );
      scanStatusTracker[scanId] = {
        id: scanId,
        target: host || "unknown",
        status: "cli_received",
        statusMessage:
          "✅ CLI commands received. Waiting for analysis report...",
        cliCommands: {
          commands: cli_commands,
          summary: cli_summary || "",
          warnings: warnings || [],
          totalCommands: cli_commands.length,
          appliedCommands: 0,
          executionStatus: "PENDING_APPROVAL",
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    // Persist to MongoDB
    let dbUpdateSuccess = false;
    try {
      // Map payload to schema structure
      const cliData = {
        cliCommands: {
          commands: cli_commands,
          summary: cli_summary || "",
          warnings: warnings || [],
          totalCommands: cli_commands.length,
          appliedCommands: 0,
          executionStatus: "PENDING_APPROVAL",
        },
        cliReceivedAt: new Date(),
      };

      console.log(
        `[Webhook V2 - CLI] Looking for existing scan with scanId: ${scanId}`,
      );

      const existingScan = await ScanV2.findOne({ scanId });

      if (existingScan) {
        // Update existing scan and set status to cli_ready or READY_FOR_APPROVAL
        console.log(
          `[Webhook V2 - CLI] Found existing scan, updating with CLI data`,
        );

        existingScan.cliCommands = cliData.cliCommands;
        existingScan.cliReceivedAt = cliData.cliReceivedAt;

        // Set appropriate status based on whether we have both report and CLI
        if (existingScan.report && existingScan.structured) {
          existingScan.status = "READY_FOR_APPROVAL";
          existingScan.statusMessage =
            "✅ AI analysis & CLI commands ready. Awaiting your approval...";
          console.log(
            `[Webhook V2 - CLI] Set status to READY_FOR_APPROVAL (both report and CLI present)`,
          );
        } else {
          existingScan.status = "CLI_RECEIVED";
          existingScan.statusMessage =
            "✅ CLI commands received. Waiting for analysis report...";
          console.log(
            `[Webhook V2 - CLI] Set status to CLI_RECEIVED (waiting for report)`,
          );
        }

        await existingScan.save();
        console.log(
          `[Webhook V2 - CLI] ✅ Successfully saved scan ${scanId} to MongoDB`,
        );
        console.log(
          `[Webhook V2 - CLI] Saved CLI commands count: ${existingScan.cliCommands.commands.length}`,
        );
        dbUpdateSuccess = true;
      } else {
        // Create new scan with CLI data (unusual but supported)
        console.log(
          `[Webhook V2 - CLI] Scan not found, creating new scan with CLI data`,
        );

        const newScan = new ScanV2({
          scanId,
          target: host || "unknown",
          ...cliData,
          status: "CLI_RECEIVED",
          statusMessage:
            "✅ CLI commands received. Waiting for analysis report...",
        });
        await newScan.save();
        console.log(
          `[Webhook V2 - CLI] ✅ Created new scan ${scanId} in MongoDB with CLI data`,
        );
        dbUpdateSuccess = true;
      }
    } catch (dbError) {
      console.error(
        `[Webhook V2 - CLI] ❌ MongoDB error for ${scanId}:`,
        dbError.message,
      );
      console.error(`[Webhook V2 - CLI] Stack:`, dbError.stack);
    }

    return res.status(200).json({
      success: true,
      message: "CLI commands received and processed",
      data: {
        scanId,
        host,
        commandSetsReceived: cli_commands.length,
        status: dbUpdateSuccess ? "CLI_RECEIVED" : "SAVED_IN_TRACKER",
        payload_type: "cli_commands",
        databaseSaved: dbUpdateSuccess,
      },
    });
  } catch (error) {
    console.error(
      `[Webhook V2 - CLI] ❌ Error processing CLI commands:`,
      error,
    );
    console.error(`[Webhook V2 - CLI] Stack:`, error.stack);
    res.status(500).json({
      success: false,
      error: error.message,
      scanId,
    });
  }
}

/**
 * GET /api/scan/status-v2/:scanId
 * Get scan status with complete data (report + CLI commands)
 * Supports both MongoDB _id and scanId field lookups
 */
exports.getScanStatusV2 = async (req, res) => {
  const { scanId } = req.params;
  console.log(`[V2 Route Handler] Received request for scanId: ${scanId}`);

  try {
    // Try to parse as MongoDB ObjectId first, then fall back to scanId lookup
    let dbScan = null;
    const mongoose = require("mongoose");

    // Try MongoDB _id lookup
    if (mongoose.Types.ObjectId.isValid(scanId)) {
      dbScan = await ScanV2.findById(scanId).lean();
      if (dbScan) {
        console.log(`[Get Scan Status V2] Found by MongoDB ID: ${scanId}`);
      }
    }

    // If not found by _id, try scanId field lookup
    if (!dbScan) {
      dbScan = await ScanV2.findOne({ scanId }).lean();
      if (dbScan) {
        console.log(`[Get Scan Status V2] Found by scanId field: ${scanId}`);
      }
    }

    if (dbScan) {
      console.log(`[Get Scan Status V2] Returning scan data for ${scanId}`);
      console.log(`  - Status: ${dbScan.status}`);
      console.log(`  - Has Report: ${!!dbScan.report}`);
      console.log(
        `  - CLI Commands Count: ${dbScan.cliCommands?.commands?.length || 0}`,
      );

      return res.json({
        success: true,
        data: {
          _id: dbScan._id,
          id: dbScan._id,
          scanId: dbScan.scanId,
          target: dbScan.target,
          status: dbScan.status || "PENDING_APPROVAL",
          statusMessage: dbScan.statusMessage || "Processing your scan...",
          report: dbScan.report || "",
          structured: dbScan.structured || {},
          summary: dbScan.structured?.summary || {
            total: 0,
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            informational: 0,
          },
          cliCommands: dbScan.cliCommands || {
            commands: [],
            summary: "",
            warnings: [],
            totalCommands: 0,
            appliedCommands: 0,
            executionStatus: "PENDING",
          },
          // Execution fields - CRITICAL for showing execution results
          executionStatus: dbScan.executionStatus || null,
          executionResults: dbScan.executionResults || null,
          executionMessage: dbScan.executionMessage || null,
          executionStartedAt: dbScan.executionStartedAt || null,
          executionCompletedAt: dbScan.executionCompletedAt || null,
          executedCommandsList: dbScan.executedCommandsList || [],
          reportMetadata: dbScan.reportMetadata || null,
          zapData: dbScan.zapData || null,
          zapReport: dbScan.zapReport || null,
          approvedAt: dbScan.approvedAt,
          approvedBy: dbScan.approvedBy,
          approvedCommandIndices: dbScan.approvedCommandIndices || [],
          rejectionReason: dbScan.rejectionReason,
          reportReceivedAt: dbScan.reportReceivedAt,
          cliReceivedAt: dbScan.cliReceivedAt,
          zapCompletedAt: dbScan.zapCompletedAt,
          createdAt: dbScan.createdAt,
          updatedAt: dbScan.updatedAt,
        },
      });
    }

    // Check in-memory tracker
    const scanStatus = scanStatusTracker[scanId];

    if (!scanStatus) {
      console.log(
        `[Get Scan Status V2] Scan ${scanId} not found in DB or tracker - returning pending status`,
      );
      // Return a pending status instead of 404, as the scan may still be initializing
      return res.status(200).json({
        success: true,
        data: {
          id: scanId,
          scanId: scanId,
          target: "unknown",
          status: "running",
          statusMessage: "🔍 Scan is starting, please wait...",
          progress: 0,
          report: "",
          structured: {},
          cliCommands: {
            commands: [],
            summary: "",
            warnings: [],
            totalCommands: 0,
            appliedCommands: 0,
            executionStatus: "PENDING",
          },
          alertCount: 0,
          alerts: [],
          summary: {
            total: 0,
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            informational: 0,
          },
        },
      });
    }

    console.log(`[Get Scan Status V2] Returning tracker data for ${scanId}`);
    return res.json({
      success: true,
      data: {
        ...scanStatus,
        summary: scanStatus.structured?.summary || {
          total: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          informational: 0,
        },
      },
    });
  } catch (error) {
    console.error("[Get Scan Status V2] Error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Export tracker for use in other modules
 */
exports.getScanStatusTracker = () => scanStatusTracker;

/**
 * POST /api/scan/webhook/ssh-execution
 * Handle SSH command execution results from n8n
 *
 * Payload format:
 * {
 *   "scanId": "string",
 *   "executionStatus": "SUCCESS|FAILURE|PARTIAL_FAILURE",
 *   "executionOutput": "stdout from SSH execution",
 *   "executionError": "stderr or error message (if failed)",
 *   "executedCommands": ["command1", "command2", ...],
 *   "executionDuration": number (seconds)
 * }
 */
exports.handleSshExecutionWebhook = async (req, res) => {
  try {
    const payload = Array.isArray(req.body) ? req.body[0] : req.body;
    const {
      scanId,
      scanIdText,
      executionStatus,
      executionOutput,
      executionError,
      executedCommands,
      executionDuration,
      exitCode,
      host,
      timestamp,
      // Additional detailed fields for failure tracking
      failedCommands,
      failedGroups,
      errorLocationSummary,
      stderrFailingTokens,
      stderrSummary,
      errorCount,
      commandsExecuted,
    } = payload || {};

    // Use scanIdText if available (the actual scanId), otherwise use scanId
    const lookupScanId = scanIdText || scanId;

    if (!lookupScanId) {
      return res.status(400).json({
        success: false,
        error: "scanId or scanIdText is required",
      });
    }

    if (
      !executionStatus ||
      !["SUCCESS", "FAILURE", "PARTIAL_FAILURE"].includes(executionStatus)
    ) {
      return res.status(400).json({
        success: false,
        error: "executionStatus must be SUCCESS, FAILURE, or PARTIAL_FAILURE",
      });
    }

    console.log(
      `[SSH Execution Webhook] Received ${executionStatus} result for scanId ${lookupScanId}`,
    );

    try {
      // Try to find scan by scanId field first
      let scan = await ScanV2.findOne({ scanId: lookupScanId });

      // If not found and lookupScanId looks like a MongoDB ID, try by _id
      if (!scan && require("mongoose").Types.ObjectId.isValid(lookupScanId)) {
        console.log(
          `[SSH Execution Webhook] scanId lookup failed, trying MongoDB _id`,
        );
        scan = await ScanV2.findById(lookupScanId);
      }

      if (!scan) {
        console.error(
          `[SSH Execution Webhook] Scan ${lookupScanId} not found in database`,
        );
        return res.status(404).json({
          success: false,
          error: `Scan ${lookupScanId} not found`,
        });
      }

      console.log(
        `[SSH Execution Webhook] Found scan: scanId=${scan.scanId}, _id=${scan._id}`,
      );

      const executedCommandsList = Array.isArray(executedCommands)
        ? executedCommands
        : [];
      const commandCount =
        typeof commandsExecuted === "number"
          ? commandsExecuted
          : executedCommandsList.length;

      const firstFailedCommand =
        Array.isArray(failedCommands) && failedCommands.length > 0
          ? failedCommands[0]
          : null;

      const successfulCommands =
        executionStatus === "SUCCESS"
          ? executedCommandsList
          : executionStatus === "PARTIAL_FAILURE" &&
              firstFailedCommand &&
              typeof firstFailedCommand.commandIndex === "number" &&
              firstFailedCommand.commandIndex >= 0
            ? executedCommandsList.slice(0, firstFailedCommand.commandIndex)
            : [];

      // Build comprehensive execution result object
      const executionResults = {
        status: executionStatus,
        output: executionOutput || "",
        error: executionError || null,
        executedCommands: executedCommandsList,
        successfulCommands,
        commandCount,
        successfulCommandCount: successfulCommands.length,
        duration: executionDuration || 0,
        timestamp:
          typeof timestamp === "string" && timestamp.trim().length > 0
            ? timestamp
            : new Date().toISOString(),
        ...(exitCode !== undefined && { exitCode }),
        ...(host && { host }),
        // Additional detailed error tracking
        ...(failedCommands && { failedCommands }),
        ...(firstFailedCommand && { firstFailedCommand }),
        ...(failedGroups && { failedGroups }),
        ...(errorLocationSummary && { errorLocationSummary }),
        ...(stderrFailingTokens && { stderrFailingTokens }),
        ...(stderrSummary && { stderrSummary }),
        ...(errorCount !== undefined && { errorCount }),
      };

      // Update scan with execution results
      scan.executionResults = executionResults;
      scan.executedCommandsList = executedCommandsList;
      const completedAt =
        typeof timestamp === "string" && timestamp.trim().length > 0
          ? new Date(timestamp)
          : new Date();
      scan.executionCompletedAt = completedAt;
      scan.executionStartedAt =
        scan.executionStartedAt ||
        new Date(
          completedAt.getTime() - (executionDuration || 0) * 1000,
        );
      scan.executionStatus = executionStatus;

      // Set user-friendly message based on status
      if (executionStatus === "SUCCESS") {
        scan.executionMessage = `✅ All ${commandCount} command(s) executed successfully on FortiWeb in ${executionDuration}s`;
        scan.status = "APPLIED";
        scan.statusMessage = `✅ Successfully applied ${commandCount} security fix command(s) to FortiWeb`;
        scan.appliedAt = new Date();
      } else if (executionStatus === "PARTIAL_FAILURE") {
        const successCount = commandCount - (errorCount || 0);
        scan.executionMessage = `⚠️ Partial Success: ${successCount}/${commandCount} command(s) executed. ${errorCount || 0} error(s) occurred.`;
        scan.status = "APPLIED"; // Still mark as applied even with partial failures
        scan.statusMessage = `⚠️ Partially applied. ${successCount}/${commandCount} commands succeeded - review details.`;
        scan.appliedAt = new Date();
      } else {
        scan.executionMessage = `❌ Command execution failed. ${commandCount} command(s) were not executed.`;
        scan.status = "FAILED";
        scan.statusMessage = `❌ Command execution failed. Check error details below.`;
        if (executionError) {
          scan.executionErrors = [executionError];
        }
      }

      // Save to database
      const savedScan = await scan.save();

      console.log(
        `[SSH Execution Webhook] ✅ Updated scan ${savedScan.scanId} (${savedScan._id}) with execution results`,
      );
      console.log(`  - Execution Status: ${executionStatus}`);
      console.log(`  - Commands Executed: ${commandCount}`);
      console.log(`  - Failed Commands: ${errorCount || 0}`);
      console.log(`  - Duration: ${executionDuration}s`);
      console.log(`  - Scan Status: ${savedScan.status}`);
      console.log(`  - Message: ${savedScan.executionMessage}`);
      console.log(`  - Saved executionResults:`, {
        hasResults: !!savedScan.executionResults,
        status: savedScan.executionResults?.status,
        commandCount: savedScan.executionResults?.commandCount,
        hasFailedCommands:
          savedScan.executionResults?.failedCommands?.length > 0,
      });
      console.log(
        `  - Database executionStatus field: ${savedScan.executionStatus}`,
      );
      console.log(`  - Database status field: ${savedScan.status}`);

      // Update tracker with both scanId and MongoDB _id
      if (scanStatusTracker[savedScan.scanId]) {
        scanStatusTracker[savedScan.scanId].executionStatus = executionStatus;
        scanStatusTracker[savedScan.scanId].executionResults = executionResults;
        scanStatusTracker[savedScan.scanId].status = savedScan.status;
        scanStatusTracker[savedScan.scanId].statusMessage =
          savedScan.statusMessage;
        scanStatusTracker[savedScan.scanId].executionMessage =
          savedScan.executionMessage;
        scanStatusTracker[savedScan.scanId].updatedAt =
          new Date().toISOString();
      }

      return res.status(200).json({
        success: true,
        message: savedScan.executionMessage,
        data: {
          scanId: savedScan.scanId,
          _id: savedScan._id,
          executionStatus: executionStatus,
          commandsExecuted: commandCount,
          failedCommands: errorCount || 0,
          duration: executionDuration,
          scanStatus: savedScan.status,
          message: savedScan.executionMessage,
          statusMessage: savedScan.statusMessage,
        },
      });
    } catch (dbError) {
      console.error(`[SSH Execution Webhook] MongoDB error:`, dbError.message);
      console.error(`[SSH Execution Webhook] Stack:`, dbError.stack);
      return res.status(500).json({
        success: false,
        error: `Database error: ${dbError.message}`,
        scanId: lookupScanId,
      });
    }
  } catch (error) {
    console.error("[SSH Execution Webhook] Unhandled error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      scanId: req.body?.scanId || req.body?.scanIdText || "unknown",
    });
  }
};
