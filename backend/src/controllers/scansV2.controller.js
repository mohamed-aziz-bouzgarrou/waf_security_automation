/**
 * Scan Approval Controllers (V2)
 * Works with new unified data structure (ScanV2 model)
 */

const axios = require("axios");
const ScanV2 = require("../models/ScanV2");

/**
 * POST /api/scans/:id/approve
 * Approve all CLI commands and trigger FortiWeb execution
 */
exports.approveScan = async (req, res) => {
  try {
    // Support both MongoDB _id and scanId
    const { id } = req.params;
    let scan;

    // Try to find by MongoDB _id first, then by scanId
    if (require("mongoose").Types.ObjectId.isValid(id)) {
      scan = await ScanV2.findById(id);
    }
    if (!scan) {
      scan = await ScanV2.findOne({ scanId: id });
    }

    if (!scan) {
      return res.status(404).json({
        success: false,
        error: "Scan not found",
      });
    }

    if (
      !scan.cliCommands ||
      !scan.cliCommands.commands ||
      scan.cliCommands.commands.length === 0
    ) {
      return res.status(400).json({
        success: false,
        error: "No CLI commands to approve",
      });
    }

    console.log(
      `[Approve Scan] Approving scan ${id} (scanId: ${scan.scanId}) - all ${scan.cliCommands.commands.length} commands`,
    );

    // Mark as approved and set to applying fixes status
    scan.status = "APPLYING_FIXES";
    scan.statusMessage = "⏳ Sending commands to FortiWeb via SSH...";
    scan.approvedAt = new Date();
    scan.approvedBy = req.user?.id || "system";
    scan.approvedCommandIndices = scan.cliCommands.commands.map((_, i) => i); // All indices

    await scan.save();

    console.log(
      `[Approve Scan] Scan ${id} approved with ${scan.cliCommands.commands.length} command sets`,
    );

    // Send to FortiWeb via n8n SSH webhook
    sendToSSHWebhook(
      scan,
      scan.cliCommands.commands,
      scan.approvedCommandIndices,
    ).catch((err) => {
      console.error("[Approve Scan] Webhook error:", err.message);
      console.error("[Approve Scan] Webhook failed but scan is already saved with APPLYING_FIXES status");
      // Don't revert status - it's already saved as APPLYING_FIXES
      // The webhook will be retried by n8n or user can check logs
    });

    return res.status(200).json({
      success: true,
      message: "Scan approved. Commands queued for FortiWeb execution.",
      data: {
        scanId: scan.scanId,
        _id: scan._id,
        status: scan.status,
        approvedCommandSets: scan.cliCommands.commands.length,
        approvedAt: scan.approvedAt,
      },
    });
  } catch (error) {
    console.error("[Approve Scan] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to approve scan",
      details: error.message,
    });
  }
};

/**
 * POST /api/scans/:id/approve-partial
 * Approve only selected CLI command sets by index
 */
exports.approveScanPartial = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedIndices } = req.body;

    if (!Array.isArray(approvedIndices) || approvedIndices.length === 0) {
      return res.status(400).json({
        success: false,
        error: "approvedIndices must be a non-empty array",
      });
    }

    // Support both MongoDB _id and scanId
    let scan;
    if (require("mongoose").Types.ObjectId.isValid(id)) {
      scan = await ScanV2.findById(id);
    }
    if (!scan) {
      scan = await ScanV2.findOne({ scanId: id });
    }

    if (!scan) {
      return res.status(404).json({
        success: false,
        error: "Scan not found",
      });
    }

    if (
      !scan.cliCommands ||
      !scan.cliCommands.commands ||
      approvedIndices.some((idx) => idx >= scan.cliCommands.commands.length)
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid command indices",
      });
    }

    console.log(
      `[Approve Partial] Approving ${approvedIndices.length}/${scan.cliCommands.commands.length} command sets`,
    );

    // Mark as approved and set to applying status
    scan.status = "APPLYING_FIXES";
    scan.statusMessage = "⏳ Sending selected commands to FortiWeb via SSH...";
    scan.approvedAt = new Date();
    scan.approvedBy = req.user?.id || "system";
    scan.approvedCommandIndices = approvedIndices;

    await scan.save();

    // Get approved commands
    const approvedCommands = approvedIndices.map(
      (idx) => scan.cliCommands.commands[idx],
    );

    console.log(
      `[Approve Partial] Scan ${id} partially approved with ${approvedCommands.length} command sets`,
    );

    // Send to FortiWeb via SSH
    sendToSSHWebhook(scan, approvedCommands, approvedIndices).catch((err) => {
      console.error("[Approve Partial] Webhook error:", err.message);
      console.error("[Approve Partial] Webhook failed but scan is already saved with APPLYING_FIXES status");
      // Don't revert status - it's already saved as APPLYING_FIXES
    });

    return res.status(200).json({
      success: true,
      message: `Approved ${approvedIndices.length}/${scan.cliCommands.commands.length} command sets`,
      data: {
        scanId: scan.scanId,
        _id: scan._id,
        status: scan.status,
        approvedCommandSets: approvedCommands.length,
        totalCommandSets: scan.cliCommands.commands.length,
        approvedAt: scan.approvedAt,
      },
    });
  } catch (error) {
    console.error("[Approve Partial] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to approve scan",
      details: error.message,
    });
  }
};

/**
 * POST /api/scans/:id/reject
 * Reject the scan and commands
 */
exports.rejectScan = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Support both MongoDB _id and scanId
    let scan;
    if (require("mongoose").Types.ObjectId.isValid(id)) {
      scan = await ScanV2.findById(id);
    }
    if (!scan) {
      scan = await ScanV2.findOne({ scanId: id });
    }

    if (!scan) {
      return res.status(404).json({
        success: false,
        error: "Scan not found",
      });
    }

    console.log(
      `[Reject Scan] Rejecting scan ${id}. Reason: ${reason || "not provided"}`,
    );

    // Mark as rejected
    scan.status = "REJECTED";
    scan.statusMessage = reason
      ? `Rejected: ${reason}`
      : "Scan rejected by user";
    scan.rejectionReason = reason || null;
    scan.approvedAt = new Date();
    scan.approvedBy = req.user?.id || "system";

    await scan.save();

    console.log(`[Reject Scan] Scan ${id} rejected`);

    return res.status(200).json({
      success: true,
      message: "Scan rejected",
      data: {
        scanId: scan.scanId,
        _id: scan._id,
        status: scan.status,
        rejectionReason: scan.rejectionReason,
      },
    });
  } catch (error) {
    console.error("[Reject Scan] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to reject scan",
      details: error.message,
    });
  }
};

/**
 * POST /api/scans/:id/approve-ssh
 * Approve selected or all CLI commands and send to SSH webhook for execution
 */
exports.approveScanSSH = async (req, res) => {
  try {
    const { id } = req.params;
    const { groupIndices = [], approveAll = false } = req.body;

    // Support both MongoDB _id and scanId
    let scan;
    if (require("mongoose").Types.ObjectId.isValid(id)) {
      scan = await ScanV2.findById(id);
    }
    if (!scan) {
      scan = await ScanV2.findOne({ scanId: id });
    }

    if (!scan) {
      return res.status(404).json({
        success: false,
        error: "Scan not found",
      });
    }

    if (
      !scan.cliCommands ||
      !scan.cliCommands.commands ||
      scan.cliCommands.commands.length === 0
    ) {
      return res.status(400).json({
        success: false,
        error: "No CLI commands to approve",
      });
    }

    // Determine which commands to approve
    let approvedIndices = [];
    let approvedCommands = [];

    if (
      approveAll ||
      (Array.isArray(groupIndices) && groupIndices.length === 0)
    ) {
      // All commands
      approvedIndices = scan.cliCommands.commands.map((_, i) => i);
      approvedCommands = scan.cliCommands.commands;
    } else if (Array.isArray(groupIndices) && groupIndices.length > 0) {
      // Only selected commands
      approvedIndices = groupIndices.filter(
        (idx) => idx >= 0 && idx < scan.cliCommands.commands.length,
      );
      approvedCommands = approvedIndices.map(
        (idx) => scan.cliCommands.commands[idx],
      );
    }

    if (approvedCommands.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No valid command groups selected",
      });
    }

    console.log(
      `[Approve SSH] Approving ${approvedCommands.length}/${scan.cliCommands.commands.length} command groups for SSH execution`,
    );

    // Mark as approved and set to applying fixes status
    scan.status = "APPLYING_FIXES";
    scan.statusMessage = "⏳ Sending commands to FortiWeb via SSH...";
    scan.approvedAt = new Date();
    scan.approvedBy = req.user?.id || "system";
    scan.approvedCommandIndices = approvedIndices;

    await scan.save();

    // Send to SSH webhook
    sendToSSHWebhook(scan, approvedCommands, approvedIndices).catch((err) => {
      console.error("[Approve SSH] Webhook error:", err.message);
      console.error("[Approve SSH] Webhook failed but scan is already saved with APPLYING_FIXES status");
      // Don't revert status - it's already saved as APPLYING_FIXES
    });

    return res.status(200).json({
      success: true,
      message: `${approvedCommands.length} command groups sent to SSH for execution`,
      data: {
        scanId: scan.scanId,
        _id: scan._id,
        status: scan.status,
        approvedCommandSets: approvedCommands.length,
        totalCommandSets: scan.cliCommands.commands.length,
        approvedAt: scan.approvedAt,
      },
    });
  } catch (error) {
    console.error("[Approve SSH] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to approve scan for SSH execution",
      details: error.message,
    });
  }
};

/**
 * POST /api/scans/:id/send-command-to-n8n
 * Send a single command set to n8n webhook for execution
 */
exports.sendCommandSetToN8n = async (req, res) => {
  try {
    const { id } = req.params;
    const { commandSetIndex, commandSet } = req.body;

    if (commandSetIndex === undefined || !commandSet) {
      return res.status(400).json({
        success: false,
        error: "commandSetIndex and commandSet are required",
      });
    }

    // Support both MongoDB _id and scanId
    let scan;
    if (require("mongoose").Types.ObjectId.isValid(id)) {
      scan = await ScanV2.findById(id);
    }
    if (!scan) {
      scan = await ScanV2.findOne({ scanId: id });
    }

    if (!scan) {
      return res.status(404).json({
        success: false,
        error: "Scan not found",
      });
    }

    console.log(
      `[Send Command] Sending command set ${commandSetIndex} (${commandSet.issue_name}) to n8n for scan ${scan.scanId}`,
    );

    // Send to n8n webhook
    await sendCommandSetToN8nWebhook(scan, commandSetIndex, commandSet);

    return res.status(200).json({
      success: true,
      message: `Command set "${commandSet.issue_name}" sent to n8n workflow successfully`,
      data: {
        scanId: scan.scanId,
        _id: scan._id,
        commandSetIndex,
        issueName: commandSet.issue_name,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[Send Command] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to send command set to n8n",
      details: error.message,
    });
  }
};

/**
 * Helper: Send a single command set to n8n webhook
 */
async function sendCommandSetToN8nWebhook(scan, commandSetIndex, commandSet) {
  const webhookUrl =
    process.env.N8N_WEBHOOK || "http://localhost:5678/webhook-test/fortiweb";

  if (!webhookUrl) {
    console.warn("[N8N] N8N_WEBHOOK not configured");
    return;
  }

  try {
    const payload = {
      scanId: scan._id.toString(),
      scanIdText: scan.scanId,
      targetHost: scan.host || scan.target,
      targetUrl: scan.target,
      commandSetIndex: commandSetIndex,
      issue_id: commandSet.issue_id,
      issue_name: commandSet.issue_name,
      severity: commandSet.severity,
      description: commandSet.description,
      commands: commandSet.commands,
      notes: commandSet.notes || "",
      timestamp: new Date().toISOString(),
    };

    console.log(`[N8N] Sending command set to n8n webhook: ${webhookUrl}`);
    console.log(`[N8N] Payload:`, {
      scanId: payload.scanId,
      issueName: payload.issue_name,
      severity: payload.severity,
      commandCount: payload.commands.length,
    });

    const response = await axios.post(webhookUrl, payload, {
      timeout: 60000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log(`[N8N] Webhook sent successfully. Status: ${response.status}`);
    return response.data;
  } catch (error) {
    console.error("[N8N] Error:", error.message);
    if (error.response?.data) {
      console.error("[N8N] Response data:", error.response.data);
    }
    throw error;
  }
}

/**
 * Helper: Send approved commands to SSH execution via n8n
 */
async function sendToSSHWebhook(scan, approvedCommands, approvedIndices) {
  const webhookUrl =
    process.env.N8N_FORTIWEB_WEBHOOK ||
    "http://192.168.10.20:5678/webhook/fortiweb";

  if (!webhookUrl) {
    console.warn("[SSH] N8N_FORTIWEB_WEBHOOK not configured");
    return;
  }

  try {
    // Build command groups payload
    const commandGroups = approvedCommands.map((cmd, idx) => ({
      groupIndex: approvedIndices[idx],
      issue_id: cmd.issue_id,
      issue_name: cmd.issue_name,
      severity: cmd.severity,
      description: cmd.description,
      commands: cmd.commands,
      notes: cmd.notes || "",
    }));

    const payload = {
      scanId: scan._id.toString(),
      scanIdText: scan.scanId,
      targetHost: scan.host || scan.target,
      targetUrl: scan.target,
      commandGroups: commandGroups,
      totalGroups: scan.cliCommands?.commands?.length || 0,
      selectedGroups: approvedCommands.length,
      approvedBy: scan.approvedBy,
      approvedAt: scan.approvedAt.toISOString(),
      timestamp: new Date().toISOString(),
      cliSummary: scan.cliCommands?.summary || "",
      warnings: scan.cliCommands?.warnings || [],
    };

    console.log(
      `[SSH] Sending ${approvedCommands.length} command groups to SSH webhook: ${webhookUrl}`,
    );
    console.log(`[SSH] Payload summary:`, {
      scanId: payload.scanId,
      targetHost: payload.targetHost,
      groupCount: payload.commandGroups.length,
      totalGroups: payload.totalGroups,
    });

    const response = await axios.post(webhookUrl, payload, {
      timeout: 60000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log(`[SSH] Webhook sent successfully. Status: ${response.status}`);
    return response.data;
  } catch (error) {
    console.error("[SSH] Error:", error.message);
    if (error.response?.data) {
      console.error("[SSH] Response data:", error.response.data);
    }
    throw error;
  }
}
