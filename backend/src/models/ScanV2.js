const mongoose = require("mongoose");

/**
 * CLI Command Schema - Represents a single set of commands for one issue
 */
const cliCommandSetSchema = new mongoose.Schema(
  {
    issue_id: {
      type: String,
      required: true,
    },
    issue_name: {
      type: String,
      required: true,
    },
    severity: {
      type: String,
      enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    commands: {
      type: [String],
      required: true,
      default: [],
    },
    notes: {
      type: String,
      default: "",
    },
  },
  { _id: false },
);

/**
 * CLI Commands Schema - Container for all CLI commands from one payload
 */
const cliCommandsSchema = new mongoose.Schema(
  {
    commands: {
      type: [cliCommandSetSchema],
      required: true,
      default: [],
    },
    summary: {
      type: String,
      default: "",
    },
    warnings: {
      type: [String],
      default: [],
    },
    totalCommands: {
      type: Number,
      default: 0,
    },
    appliedCommands: {
      type: Number,
      default: 0,
    },
    executionStatus: {
      type: String,
      enum: ["PENDING_APPROVAL", "EXECUTING", "COMPLETED", "FAILED"],
      default: "PENDING_APPROVAL",
    },
  },
  { _id: false },
);

const scanSchema = new mongoose.Schema(
  {
    scanId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      description: "Frontend-generated unique scan identifier",
    },
    zapScanId: {
      type: Number,
      default: null,
      index: true,
      description: "Scan ID returned by ZAP scanner - preserved as-is",
    },
    target: {
      type: String,
      required: [true, "Target URL is required"],
      trim: true,
    },

    // Analysis Report (from first webhook)
    report: {
      type: String,
      default: "",
      description: "Markdown analysis report with AI enrichment",
    },
    structured: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      description: "Structured vulnerability analysis data",
    },

    // CLI Commands (from second webhook)
    cliCommands: cliCommandsSchema,

    // Metadata tracking
    reportReceivedAt: {
      type: Date,
      default: null,
      description: "Timestamp when analysis report was received",
    },
    cliReceivedAt: {
      type: Date,
      default: null,
      description: "Timestamp when CLI commands were received",
    },

    // Workflow Status
    status: {
      type: String,
      enum: [
        "SCAN_STARTED", // Scan initiated, waiting for ZAP completion
        "ZAP_COMPLETED", // ZAP scan finished, ready to send to n8n
        "AI_ANALYZING", // AI is analyzing the scan results
        "REPORT_RECEIVED", // AI report received from first webhook
        "AI_GENERATING_CLI", // AI is generating CLI commands
        "CLI_RECEIVED", // CLI commands received from second webhook
        "READY_FOR_APPROVAL", // Both received, awaiting user action
        "APPROVED", // User approved the scan
        "REJECTED", // User rejected the scan
        "APPLYING_FIXES", // Commands are being applied to FortiWeb
        "APPLIED", // Commands successfully applied
        "FAILED", // Scan or execution failed
      ],
      default: "SCAN_STARTED",
    },

    // Message to display in modal
    statusMessage: {
      type: String,
      default: "Scan started...",
      description: "User-friendly status message for modal display",
    },

    // Approval metadata
    approvedAt: {
      type: Date,
      default: null,
    },
    approvedBy: {
      type: String,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
    },

    // Execution metadata
    appliedAt: {
      type: Date,
      default: null,
    },
    executionErrors: {
      type: [String],
      default: [],
    },

    // Approval selections (for partial approval)
    approvedCommandIndices: {
      type: [Number],
      default: null,
      description:
        "If set, contains indices of approved commands (for partial approval)",
    },

    // Raw ZAP Report and Data
    zapReport: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      description: "Raw JSON report from OWASP ZAP security scan",
    },
    zapData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      description: "Structured ZAP scan metadata (alerts, summary, byRisk, etc.)",
    },
    zapCompletedAt: {
      type: Date,
      default: null,
      description: "Timestamp when ZAP scan completed and report was saved",
    },

    // Report Metadata (same structure as Report collection for consistency)
    reportMetadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      description: "Report metadata including reportId, type, fileSize, and generation timestamp",
    },

    // SSH Execution Results (from n8n SSH webhook)
    executionResults: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      description: "SSH command execution output and status",
    },
    executionStartedAt: {
      type: Date,
      default: null,
      description: "Timestamp when SSH commands execution started",
    },
    executionCompletedAt: {
      type: Date,
      default: null,
      description: "Timestamp when SSH commands execution completed",
    },
    executionStatus: {
      type: String,
      enum: ["PENDING", "EXECUTING", "SUCCESS", "FAILURE", "PARTIAL_FAILURE"],
      default: "PENDING",
      description: "Overall SSH execution status",
    },
    executionMessage: {
      type: String,
      default: null,
      description: "User-friendly message about execution result",
    },
    executedCommandsList: {
      type: [String],
      default: [],
      description: "List of CLI commands that were executed via SSH",
    },
  },
  {
    timestamps: true,
    collection: "scans",
  },
);

// Indexes for faster queries
scanSchema.index({ createdAt: -1 });
scanSchema.index({ status: 1 });
scanSchema.index({ scanId: 1 });
scanSchema.index({ zapScanId: 1 });
scanSchema.index({ status: 1, createdAt: -1 });

// Middleware to update totalCommands when saving
scanSchema.pre("save", function (next) {
  if (this.cliCommands) {
    this.cliCommands.totalCommands = this.cliCommands.commands?.length || 0;
  }
  next();
});

module.exports = mongoose.model("ScanV2", scanSchema);
