const mongoose = require("mongoose");

/**
 * Suggested Fix Schema - Represents a fix proposal from the chatbot
 */
const suggestedFixSchema = new mongoose.Schema(
  {
    fixId: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
      description: "Human-readable description of the fix",
    },
    affectedSettings: {
      type: [String],
      default: [],
      description: "FortiWeb settings affected by this fix",
    },
    fortiwebCommands: {
      type: [String],
      required: true,
      default: [],
      description: "CLI commands to apply this fix",
    },
    severity: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "MEDIUM",
    },
    reasoning: {
      type: String,
      default: "",
      description: "Explanation from AI why this fix is needed",
    },
    potentialImpacts: {
      type: [String],
      default: [],
      description: "Potential impacts of applying this fix",
    },
    status: {
      type: String,
      enum: ["SUGGESTED", "APPROVED", "REJECTED", "APPLYING", "APPLIED", "FAILED"],
      default: "SUGGESTED",
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: "",
    },
    appliedAt: {
      type: Date,
      default: null,
    },
    executionResults: {
      status: {
        type: String,
        enum: ["PENDING", "EXECUTING", "SUCCESS", "FAILURE", "PARTIAL_FAILURE"],
        default: "PENDING",
      },
      output: String,
      error: String,
      executedCommands: [String],
      commandCount: Number,
      duration: Number,
      timestamp: Date,
    },
    fortiwebConfigSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      description: "Snapshot of FortiWeb config when fix was suggested",
    },
  },
  { _id: false },
);

/**
 * Chat Message Schema - Individual chat message
 */
const chatMessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

/**
 * Chat Conversation Schema - Stores complete chatbot conversation with fixes
 */
const chatConversationSchema = new mongoose.Schema(
  {
    conversationId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      required: true,
    },
    userId: {
      type: String,
      default: "default-user",
      index: true,
    },
    title: {
      type: String,
      default: "New Conversation",
    },
    messages: {
      type: [chatMessageSchema],
      default: [],
    },
    suggestedFixes: {
      type: [suggestedFixSchema],
      default: [],
    },
    currentFortiWebConfig: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      description: "Current FortiWeb config snapshot",
    },
    status: {
      type: String,
      enum: ["ACTIVE", "ARCHIVED", "COMPLETED"],
      default: "ACTIVE",
    },
    summaryOfFixes: {
      totalSuggested: { type: Number, default: 0 },
      totalApproved: { type: Number, default: 0 },
      totalApplied: { type: Number, default: 0 },
      totalFailed: { type: Number, default: 0 },
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    archivedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

// Index for faster queries
chatConversationSchema.index({ userId: 1, createdAt: -1 });
chatConversationSchema.index({ conversationId: 1 });

module.exports = mongoose.model("ChatConversation", chatConversationSchema);
