const mongoose = require("mongoose");

/**
 * Report Schema - Stores individual security scan reports
 * Created when ZAP scan completes and generates the initial report
 */
const reportSchema = new mongoose.Schema(
  {
    // Link to the scan
    scanId: {
      type: String,
      required: [true, "Scan ID is required"],
      unique: true,
      sparse: true,
      index: true,
      description: "Frontend-generated unique scan identifier",
    },

    // Report metadata
    reportId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      description: "Unique report identifier (UUID or similar)",
    },

    // Target information
    target: {
      type: String,
      required: [true, "Target URL is required"],
      trim: true,
    },

    // Report content
    report: {
      type: String,
      default: "",
      description: "Full report content (markdown or HTML)",
    },

    // Report type
    reportType: {
      type: String,
      enum: ["ZAP_RAW", "AI_ENRICHED", "EXECUTIVE_SUMMARY", "TECHNICAL_DETAIL", "FORTIWEB_CLI"],
      default: "ZAP_RAW",
      description: "Type of report",
    },

    // Raw ZAP data
    zapData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      description: "Raw ZAP scan results (alerts, summary, etc.)",
    },

    // Raw ZAP Report (markdown/text format)
    rawZapReport: {
      type: String,
      default: "",
      description: "Raw ZAP report in markdown or text format",
    },

    // Structured vulnerability data
    structured: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      description: "Parsed and structured vulnerability analysis",
    },

    // Summary statistics
    summary: {
      total: {
        type: Number,
        default: 0,
      },
      critical: {
        type: Number,
        default: 0,
      },
      high: {
        type: Number,
        default: 0,
      },
      medium: {
        type: Number,
        default: 0,
      },
      low: {
        type: Number,
        default: 0,
      },
      informational: {
        type: Number,
        default: 0,
      },
    },

    // File information
    fileSize: {
      type: String,
      default: "0 KB",
    },

    // Timestamps
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    generatedAt: {
      type: Date,
      default: Date.now,
      description: "When the report was generated",
    },

    // Status tracking
    status: {
      type: String,
      enum: ["GENERATING", "READY", "ERROR"],
      default: "READY",
    },

    error: {
      type: String,
      default: null,
      description: "Error message if report generation failed",
    },
  },
  { timestamps: true }
);

// Indexes for efficient querying
reportSchema.index({ scanId: 1 });
reportSchema.index({ createdAt: -1 }); // Sort by newest first
reportSchema.index({ target: 1 });

module.exports = mongoose.model("Report", reportSchema);
