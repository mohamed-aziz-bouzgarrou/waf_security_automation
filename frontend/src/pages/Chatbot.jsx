import React, { useState, useEffect, useRef } from "react";
import MainLayout from "../layouts/MainLayout";
import ChatMessage from "../components/ChatMessage";
import FixSuggestion from "../components/FixSuggestion";
import chatbotService from "../services/chatbotService";
import "../styles/Chatbot.css";

/**
 * Chatbot Page
 * Main chatbot interface for interacting with AI and applying fixes
 */

const Chatbot = () => {
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [suggestedFixes, setSuggestedFixes] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [applyingFixId, setApplyingFixId] = useState(null);
  const messagesEndRef = useRef(null);
  const [showNewConvForm, setShowNewConvForm] = useState(false);
  const [newConvTitle, setNewConvTitle] = useState("");

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversations = async () => {
    try {
      const response = await chatbotService.getConversations();
      setConversations(response.data);
      console.log("Loaded conversations:", response.data);
    } catch (err) {
      setError("Failed to load conversations");
      console.error(err);
    }
  };

  const createNewConversation = async () => {
    try {
      setLoading(true);
      const response = await chatbotService.createConversation(
        "default-user",
        newConvTitle || "New Conversation",
      );
      const newConversation = response.data;
      setCurrentConversation(newConversation);
      setMessages([]);
      setSuggestedFixes([]);
      setInputMessage("");
      setShowNewConvForm(false);
      setNewConvTitle("");
      await loadConversations();
    } catch (err) {
      setError("Failed to create conversation");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadConversation = async (conversationId) => {
    try {
      setLoading(true);
      const response = await chatbotService.getConversation(conversationId);
      const conv = response.data;
      setCurrentConversation(conv);
      setMessages(conv.messages);
      setSuggestedFixes(conv.suggestedFixes);
      setInputMessage("");
      setError(null);
    } catch (err) {
      setError("Failed to load conversation");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !currentConversation) return;

    try {
      setLoading(true);
      setError(null);

      const response = await chatbotService.sendMessage(
        currentConversation.conversationId,
        inputMessage,
      );

      // Add messages
      const newMessages = [
        ...messages,
        {
          role: "user",
          content: inputMessage,
          timestamp: new Date().toISOString(),
        },
        {
          role: "assistant",
          content: response.data.assistantResponse,
          timestamp: new Date().toISOString(),
        },
      ];
      setMessages(newMessages);

      // Add fix if suggested
      if (response.data.suggestedFix) {
        setSuggestedFixes([...suggestedFixes, response.data.suggestedFix]);
      }

      setInputMessage("");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send message");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveFix = async (fixId) => {
    try {
      setLoading(true);
      await chatbotService.approveFix(
        currentConversation.conversationId,
        fixId,
      );
      setSuggestedFixes(
        suggestedFixes.map((fix) =>
          fix.fixId === fixId
            ? { ...fix, status: "APPROVED", approvedAt: new Date() }
            : fix,
        ),
      );
    } catch (err) {
      setError("Failed to approve fix");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectFix = async (fixId, reason) => {
    try {
      setLoading(true);
      await chatbotService.rejectFix(
        currentConversation.conversationId,
        fixId,
        reason,
      );
      setSuggestedFixes(
        suggestedFixes.map((fix) =>
          fix.fixId === fixId
            ? { ...fix, status: "REJECTED", rejectionReason: reason }
            : fix,
        ),
      );
    } catch (err) {
      setError("Failed to reject fix");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFix = async (fixId) => {
    try {
      setApplyingFixId(fixId);
      setError(null);
      await chatbotService.applyFix(currentConversation.conversationId, fixId);
      setSuggestedFixes(
        suggestedFixes.map((fix) =>
          fix.fixId === fixId ? { ...fix, status: "APPLYING" } : fix,
        ),
      );
    } catch (err) {
      setError(err.response?.data?.error || "Failed to apply fix");
      console.error(err);
    } finally {
      setApplyingFixId(null);
    }
  };

  const handleArchiveConversation = async (conversationId) => {
    try {
      await chatbotService.archiveConversation(conversationId);
      if (currentConversation?.conversationId === conversationId) {
        setCurrentConversation(null);
        setMessages([]);
        setSuggestedFixes([]);
      }
      await loadConversations();
    } catch (err) {
      setError("Failed to archive conversation");
      console.error(err);
    }
  };

  return (
    <MainLayout
      title='💬 Security Chatbot'
      subtitle='Get AI-powered security advice and fixes'>
      <div className='chatbot-content'>
        <div className='chatbot-sidebar'>
          <div className='sidebar-header'>
            <h3>Conversations</h3>
            <button
              className='new-conv-btn'
              onClick={() => setShowNewConvForm(!showNewConvForm)}>
              + New
            </button>
          </div>

          {showNewConvForm && (
            <div className='new-conv-form'>
              <input
                type='text'
                placeholder='Conversation title...'
                value={newConvTitle}
                onChange={(e) => setNewConvTitle(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && createNewConversation()}
              />
              <div className='form-actions'>
                <button onClick={createNewConversation} className='btn-create'>
                  Create
                </button>
                <button
                  onClick={() => setShowNewConvForm(false)}
                  className='btn-cancel'>
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className='conversations-list'>
            {conversations.length === 0 ? (
              <p className='empty-state'>No conversations yet</p>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.conversationId}
                  className={`conversation-item ${
                    currentConversation?.conversationId === conv.conversationId
                      ? "active"
                      : ""
                  }`}>
                  <div
                    className='conv-title'
                    onClick={() => loadConversation(conv.conversationId)}>
                    <span>{conv.title}</span>
                    <small>
                      {conv.summaryOfFixes?.totalApplied || 0}/
                      {conv.summaryOfFixes?.totalSuggested || 0} applied
                    </small>
                  </div>
                  <button
                    className='archive-btn'
                    onClick={() =>
                      handleArchiveConversation(conv.conversationId)
                    }
                    title='Archive conversation'>
                    📦
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className='chatbot-main'>
          {!currentConversation ? (
            <div className='welcome-screen'>
              <div className='welcome-content'>
                <h1>🤖 FortiWeb Security Expert</h1>
                <p>
                  Ask me anything about securing your FortiWeb deployment. I'll
                  suggest fixes and help you apply them.
                </p>
                <button
                  className='welcome-btn'
                  onClick={() => setShowNewConvForm(true)}>
                  Start New Conversation
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className='chat-header'>
                <div>
                  <h2>{currentConversation.title}</h2>
                  <div className='header-stats'>
                    <span>
                      💡{" "}
                      {currentConversation.summaryOfFixes?.totalSuggested || 0}{" "}
                      suggested
                    </span>
                    <span>
                      ✅ {currentConversation.summaryOfFixes?.totalApplied || 0}{" "}
                      applied
                    </span>
                  </div>
                </div>
              </div>

              {error && <div className='error-message'>⚠️ {error}</div>}

              <div className='messages-container'>
                {messages.length === 0 ? (
                  <div className='empty-chat'>
                    <p>
                      Start the conversation by asking a security question...
                    </p>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <ChatMessage key={idx} message={msg} />
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {suggestedFixes.length > 0 && (
                <div className='fixes-section'>
                  <h3>🔧 Suggested Fixes ({suggestedFixes.length})</h3>
                  <div className='fixes-list'>
                    {suggestedFixes.map((fix) => (
                      <FixSuggestion
                        key={fix.fixId}
                        fix={fix}
                        onApprove={handleApproveFix}
                        onReject={handleRejectFix}
                        onApply={handleApplyFix}
                        isApplyingCmd={applyingFixId === fix.fixId}
                      />
                    ))}
                  </div>
                </div>
              )}

              <form className='message-input-form' onSubmit={handleSendMessage}>
                <input
                  type='text'
                  placeholder='Ask me about FortiWeb security...'
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  disabled={loading}
                />
                <button
                  type='submit'
                  disabled={loading || !inputMessage.trim()}>
                  {loading ? "⏳ Sending..." : "Send"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Chatbot;
