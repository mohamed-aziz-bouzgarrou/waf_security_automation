const express = require("express");
const router = express.Router();
const chatbotController = require("../controllers/chatbot.controller");

/**
 * Chatbot Routes
 * POST   /api/chatbot/conversations          - Create new conversation
 * GET    /api/chatbot/conversations          - Get all conversations for user
 * GET    /api/chatbot/conversations/:id      - Get specific conversation
 * POST   /api/chatbot/message                - Send message to chatbot
 * POST   /api/chatbot/suggest-fix            - Get fix suggestion for issue
 * POST   /api/chatbot/fixes/approve          - Approve a fix
 * POST   /api/chatbot/fixes/reject           - Reject a fix
 * POST   /api/chatbot/fixes/apply            - Apply an approved fix
 * POST   /api/chatbot/webhook/execution-result - Receive execution results
 * GET    /api/chatbot/config                 - Get FortiWeb config
 * POST   /api/chatbot/conversations/:id/archive - Archive conversation
 */

// Conversation management
router.post("/conversations", chatbotController.createConversation);
router.get("/conversations", chatbotController.getConversations);
router.get("/conversations/:conversationId", chatbotController.getConversation);
router.post(
  "/conversations/:conversationId/archive",
  chatbotController.archiveConversation,
);

// Chat messaging
router.post("/message", chatbotController.sendMessage);

// Fix suggestions and management
router.post("/suggest-fix", chatbotController.suggestFix);
router.post("/fixes/approve", chatbotController.approveFix);
router.post("/fixes/reject", chatbotController.rejectFix);
router.post("/fixes/apply", chatbotController.applyFix);

// Webhooks
router.post("/webhook/execution-result", chatbotController.handleExecutionResult);

// Configuration
router.get("/config", chatbotController.getFortiWebConfig);

module.exports = router;
