import apiClient from "../config/api";

/**
 * Chatbot Service
 * API client for all chatbot-related endpoints
 */

class ChatbotService {
  constructor() {
    this.baseUrl = "/api/chatbot";
  }

  /**
   * Create a new conversation
   */
  async createConversation(userId = "default-user", title = "New Conversation") {
    const response = await apiClient.post(`${this.baseUrl}/conversations`, {
      userId,
      title,
    });
    return response.data;
  }

  /**
   * Get all conversations for a user
   */
  async getConversations(userId = "default-user") {
    const response = await apiClient.get(`${this.baseUrl}/conversations`, {
      params: { userId },
    });
    return response.data;
  }

  /**
   * Get a specific conversation
   */
  async getConversation(conversationId) {
    const response = await apiClient.get(
      `${this.baseUrl}/conversations/${conversationId}`,
    );
    return response.data;
  }

  /**
   * Send a message to the chatbot
   */
  async sendMessage(conversationId, message, userId = "default-user") {
    const response = await apiClient.post(`${this.baseUrl}/message`, {
      conversationId,
      message,
      userId,
    });
    return response.data;
  }

  /**
   * Get a fix suggestion for an issue
   */
  async suggestFix(conversationId, issue) {
    const response = await apiClient.post(`${this.baseUrl}/suggest-fix`, {
      conversationId,
      issue,
    });
    return response.data;
  }

  /**
   * Approve a suggested fix
   */
  async approveFix(conversationId, fixId) {
    const response = await apiClient.post(`${this.baseUrl}/fixes/approve`, {
      conversationId,
      fixId,
    });
    return response.data;
  }

  /**
   * Reject a suggested fix
   */
  async rejectFix(conversationId, fixId, reason = "") {
    const response = await apiClient.post(`${this.baseUrl}/fixes/reject`, {
      conversationId,
      fixId,
      reason,
    });
    return response.data;
  }

  /**
   * Apply an approved fix
   */
  async applyFix(conversationId, fixId) {
    const response = await apiClient.post(`${this.baseUrl}/fixes/apply`, {
      conversationId,
      fixId,
    });
    return response.data;
  }

  /**
   * Get current FortiWeb configuration
   */
  async getFortiWebConfig() {
    const response = await apiClient.get(`${this.baseUrl}/config`);
    return response.data;
  }

  /**
   * Archive a conversation
   */
  async archiveConversation(conversationId) {
    const response = await apiClient.post(
      `${this.baseUrl}/conversations/${conversationId}/archive`,
    );
    return response.data;
  }
}

export default new ChatbotService();
