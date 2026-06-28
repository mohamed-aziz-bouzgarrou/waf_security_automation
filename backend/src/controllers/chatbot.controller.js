const ChatConversation = require("../models/Chatbot");
const openRouterService = require("../services/openrouter.service");
const fortiwebConfigMonitor = require("../utils/fortiwebConfigMonitor");
const ScanV2 = require("../models/ScanV2");
const { v4: uuidv4 } = require("uuid");

/**
 * Chatbot Controller
 * Handles chatbot endpoints for AI-powered security recommendations
 */

/**
 * POST /api/chatbot/conversations
 * Create a new conversation or get list of conversations
 */
exports.createConversation = async (req, res) => {
  try {
    const { userId = "default-user", title = "New Conversation" } = req.body;

    const conversationId = uuidv4();

    const conversation = new ChatConversation({
      conversationId,
      userId,
      title,
      messages: [],
      suggestedFixes: [],
    });

    await conversation.save();

    console.log(`[Chatbot] Created conversation ${conversationId} for user ${userId}`);

    res.status(201).json({
      success: true,
      data: {
        conversationId: conversation.conversationId,
        userId: conversation.userId,
        title: conversation.title,
        createdAt: conversation.createdAt,
      },
    });
  } catch (error) {
    console.error("[Chatbot] Error creating conversation:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * GET /api/chatbot/conversations
 * Get all conversations for a user
 */
exports.getConversations = async (req, res) => {
  try {
    const { userId = "default-user" } = req.query;

    const conversations = await ChatConversation.find({ userId })
      .sort({ createdAt: -1 })
      .select(
        "conversationId title status summaryOfFixes createdAt updatedAt archivedAt",
      )
      .lean();

    console.log(`[Chatbot] Retrieved ${conversations.length} conversations for ${userId}`);

    res.json({
      success: true,
      data: conversations,
      count: conversations.length,
    });
  } catch (error) {
    console.error("[Chatbot] Error retrieving conversations:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * GET /api/chatbot/conversations/:conversationId
 * Get a specific conversation with all messages and fixes
 */
exports.getConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await ChatConversation.findOne({ conversationId });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: "Conversation not found",
      });
    }

    console.log(`[Chatbot] Retrieved conversation ${conversationId}`);

    res.json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    console.error("[Chatbot] Error retrieving conversation:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * POST /api/chatbot/message
 * Send message to chatbot and get response with fix suggestions
 */
exports.sendMessage = async (req, res) => {
  try {
    const { conversationId, message, userId = "default-user" } = req.body;

    if (!conversationId || !message) {
      return res.status(400).json({
        success: false,
        error: "conversationId and message are required",
      });
    }

    // Find conversation
    const conversation = await ChatConversation.findOne({ conversationId });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: "Conversation not found",
      });
    }

    console.log(
      `[Chatbot] Processing message for conversation ${conversationId}`,
    );

    // Get current FortiWeb config
    let fortiwebConfig = conversation.currentFortiWebConfig;
    if (!fortiwebConfig) {
      fortiwebConfig = await fortiwebConfigMonitor.getSnapshot();
      conversation.currentFortiWebConfig = fortiwebConfig;
    }

    // Add user message to conversation
    conversation.messages.push({
      role: "user",
      content: message,
      timestamp: new Date(),
    });

    // Get AI response
    let aiResponse;
    try {
      aiResponse = await openRouterService.chat(
        message,
        conversation.messages.slice(0, -1), // Previous messages for context
        fortiwebConfig,
      );
    } catch (error) {
      console.error("[Chatbot] Error getting AI response:", error.message);
      return res.status(500).json({
        success: false,
        error: `Failed to get AI response: ${error.message}`,
      });
    }

    // Add assistant response to conversation
    conversation.messages.push({
      role: "assistant",
      content: aiResponse.message,
      timestamp: new Date(),
    });

    // Check if fix suggestion was extracted
    let suggestedFix = null;
    if (aiResponse.fixSuggestion) {
      suggestedFix = {
        fixId: uuidv4(),
        ...aiResponse.fixSuggestion,
        status: "SUGGESTED",
        fortiwebConfigSnapshot: fortiwebConfig,
      };

      conversation.suggestedFixes.push(suggestedFix);
      conversation.summaryOfFixes.totalSuggested += 1;

      console.log(
        `[Chatbot] Generated fix suggestion ${suggestedFix.fixId} for conversation ${conversationId}`,
      );
    }

    conversation.updatedAt = new Date();
    await conversation.save();

    res.json({
      success: true,
      data: {
        conversationId: conversation.conversationId,
        userMessage: message,
        assistantResponse: aiResponse.message,
        suggestedFix: suggestedFix,
        messageCount: conversation.messages.length,
      },
    });
  } catch (error) {
    console.error("[Chatbot] Error processing message:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * POST /api/chatbot/suggest-fix
 * Get a specific fix suggestion for an issue
 */
exports.suggestFix = async (req, res) => {
  try {
    const { conversationId, issue } = req.body;

    if (!conversationId || !issue) {
      return res.status(400).json({
        success: false,
        error: "conversationId and issue are required",
      });
    }

    const conversation = await ChatConversation.findOne({ conversationId });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: "Conversation not found",
      });
    }

    console.log(`[Chatbot] Generating fix suggestion for issue: ${issue}`);

    // Get current FortiWeb config
    let fortiwebConfig = conversation.currentFortiWebConfig;
    if (!fortiwebConfig) {
      fortiwebConfig = await fortiwebConfigMonitor.getSnapshot();
      conversation.currentFortiWebConfig = fortiwebConfig;
    }

    // Get fix suggestion from OpenRouter
    const aiResponse = await openRouterService.suggestFix(issue, fortiwebConfig);

    const suggestedFix = {
      fixId: uuidv4(),
      description: aiResponse.fixSuggestion?.description || aiResponse.message,
      affectedSettings: aiResponse.fixSuggestion?.affectedSettings || [],
      fortiwebCommands: aiResponse.fixSuggestion?.fortiwebCommands || [],
      severity: aiResponse.fixSuggestion?.severity || "MEDIUM",
      reasoning: aiResponse.fixSuggestion?.reasoning || "",
      potentialImpacts: aiResponse.fixSuggestion?.potentialImpacts || [],
      status: "SUGGESTED",
      fortiwebConfigSnapshot: fortiwebConfig,
    };

    conversation.suggestedFixes.push(suggestedFix);
    conversation.summaryOfFixes.totalSuggested += 1;
    conversation.updatedAt = new Date();

    await conversation.save();

    console.log(
      `[Chatbot] ✅ Fix suggestion ${suggestedFix.fixId} created for conversation ${conversationId}`,
    );

    res.json({
      success: true,
      data: suggestedFix,
    });
  } catch (error) {
    console.error("[Chatbot] Error suggesting fix:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * POST /api/chatbot/fixes/:fixId/approve
 * Approve a suggested fix
 */
exports.approveFix = async (req, res) => {
  try {
    const { conversationId, fixId } = req.body;

    if (!conversationId || !fixId) {
      return res.status(400).json({
        success: false,
        error: "conversationId and fixId are required",
      });
    }

    const conversation = await ChatConversation.findOne({ conversationId });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: "Conversation not found",
      });
    }

    // Find the fix
    const fix = conversation.suggestedFixes.find((f) => f.fixId === fixId);

    if (!fix) {
      return res.status(404).json({
        success: false,
        error: "Fix not found",
      });
    }

    fix.status = "APPROVED";
    fix.approvedAt = new Date();
    conversation.summaryOfFixes.totalApproved += 1;
    conversation.updatedAt = new Date();

    await conversation.save();

    console.log(
      `[Chatbot] Fix ${fixId} approved in conversation ${conversationId}`,
    );

    res.json({
      success: true,
      message: "Fix approved successfully",
      data: {
        fixId: fix.fixId,
        status: fix.status,
        approvedAt: fix.approvedAt,
      },
    });
  } catch (error) {
    console.error("[Chatbot] Error approving fix:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * POST /api/chatbot/fixes/:fixId/reject
 * Reject a suggested fix
 */
exports.rejectFix = async (req, res) => {
  try {
    const { conversationId, fixId, reason = "" } = req.body;

    if (!conversationId || !fixId) {
      return res.status(400).json({
        success: false,
        error: "conversationId and fixId are required",
      });
    }

    const conversation = await ChatConversation.findOne({ conversationId });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: "Conversation not found",
      });
    }

    const fix = conversation.suggestedFixes.find((f) => f.fixId === fixId);

    if (!fix) {
      return res.status(404).json({
        success: false,
        error: "Fix not found",
      });
    }

    fix.status = "REJECTED";
    fix.rejectionReason = reason;
    conversation.updatedAt = new Date();

    await conversation.save();

    console.log(`[Chatbot] Fix ${fixId} rejected in conversation ${conversationId}`);

    res.json({
      success: true,
      message: "Fix rejected successfully",
      data: {
        fixId: fix.fixId,
        status: fix.status,
        rejectionReason: fix.rejectionReason,
      },
    });
  } catch (error) {
    console.error("[Chatbot] Error rejecting fix:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * POST /api/chatbot/fixes/:fixId/apply
 * Apply an approved fix via SSH execution
 */
exports.applyFix = async (req, res) => {
  try {
    const { conversationId, fixId } = req.body;

    if (!conversationId || !fixId) {
      return res.status(400).json({
        success: false,
        error: "conversationId and fixId are required",
      });
    }

    const conversation = await ChatConversation.findOne({ conversationId });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: "Conversation not found",
      });
    }

    const fix = conversation.suggestedFixes.find((f) => f.fixId === fixId);

    if (!fix) {
      return res.status(404).json({
        success: false,
        error: "Fix not found",
      });
    }

    if (fix.status !== "APPROVED") {
      return res.status(400).json({
        success: false,
        error: "Only approved fixes can be applied",
      });
    }

    // Mark as applying
    fix.status = "APPLYING";
    fix.executionResults.status = "EXECUTING";
    conversation.updatedAt = new Date();
    await conversation.save();

    console.log(
      `[Chatbot] Applying fix ${fixId} in conversation ${conversationId}`,
    );

    // Send to n8n webhook for SSH execution
    // This reuses the same SSH execution webhook as the scan workflow
    try {
      const n8nWebhookUrl = process.env.N8N_WEBHOOK_SSH_EXECUTION;

      if (!n8nWebhookUrl) {
        throw new Error("N8N SSH execution webhook URL not configured");
      }

      const payload = {
        commands: fix.fortiwebCommands,
        description: fix.description,
        fixId: fixId,
        conversationId: conversationId,
        severity: fix.severity,
      };

      // Send to n8n asynchronously
      const axios = require("axios");
      axios.post(n8nWebhookUrl, payload, { timeout: 5000 }).catch((err) => {
        console.error("[Chatbot] Error sending to n8n:", err.message);
      });

      res.json({
        success: true,
        message: "Fix is being applied. You will receive updates as it progresses.",
        data: {
          fixId: fix.fixId,
          status: "APPLYING",
          executingAt: new Date(),
        },
      });
    } catch (error) {
      console.error("[Chatbot] Error applying fix:", error);
      fix.status = "FAILED";
      fix.executionResults.status = "FAILURE";
      fix.executionResults.error = error.message;
      await conversation.save();

      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  } catch (error) {
    console.error("[Chatbot] Error in applyFix:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * POST /api/chatbot/webhook/execution-result
 * Receive SSH execution results for applied fixes (from n8n)
 */
exports.handleExecutionResult = async (req, res) => {
  try {
    const {
      fixId,
      conversationId,
      executionStatus,
      executionOutput,
      executionError,
      executedCommands,
      executionDuration,
    } = req.body;

    if (!fixId || !conversationId) {
      return res.status(400).json({
        success: false,
        error: "fixId and conversationId are required",
      });
    }

    console.log(
      `[Chatbot] Received execution result for fix ${fixId}: ${executionStatus}`,
    );

    const conversation = await ChatConversation.findOne({ conversationId });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: "Conversation not found",
      });
    }

    const fix = conversation.suggestedFixes.find((f) => f.fixId === fixId);

    if (!fix) {
      return res.status(404).json({
        success: false,
        error: "Fix not found",
      });
    }

    // Update execution results
    fix.status = executionStatus === "SUCCESS" ? "APPLIED" : "FAILED";
    fix.appliedAt = new Date();
    fix.executionResults = {
      status: executionStatus,
      output: executionOutput || "",
      error: executionError || null,
      executedCommands: executedCommands || [],
      commandCount: executedCommands?.length || 0,
      duration: executionDuration || 0,
      timestamp: new Date().toISOString(),
    };

    // Update summary
    if (executionStatus === "SUCCESS") {
      conversation.summaryOfFixes.totalApplied += 1;
    } else {
      conversation.summaryOfFixes.totalFailed += 1;
    }

    conversation.updatedAt = new Date();
    await conversation.save();

    console.log(
      `[Chatbot] ✅ Fix ${fixId} execution completed with status ${executionStatus}`,
    );

    res.json({
      success: true,
      message: "Execution result received and saved",
      data: {
        fixId: fix.fixId,
        status: fix.status,
        executionResults: fix.executionResults,
      },
    });
  } catch (error) {
    console.error("[Chatbot] Error handling execution result:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * GET /api/chatbot/config
 * Get current FortiWeb configuration snapshot
 */
exports.getFortiWebConfig = async (req, res) => {
  try {
    const config = await fortiwebConfigMonitor.getSnapshot();

    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error("[Chatbot] Error retrieving FortiWeb config:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * POST /api/chatbot/conversations/:conversationId/archive
 * Archive a conversation
 */
exports.archiveConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await ChatConversation.findOne({ conversationId });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: "Conversation not found",
      });
    }

    conversation.status = "ARCHIVED";
    conversation.archivedAt = new Date();
    await conversation.save();

    console.log(`[Chatbot] Conversation ${conversationId} archived`);

    res.json({
      success: true,
      message: "Conversation archived",
    });
  } catch (error) {
    console.error("[Chatbot] Error archiving conversation:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
