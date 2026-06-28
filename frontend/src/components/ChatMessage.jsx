import React from "react";
import ReportMarkdown from "./ReportMarkdown";
import "../styles/ChatMessage.css";

/**
 * ChatMessage Component
 * Displays individual chat messages (user or assistant)
 */

const ChatMessage = ({ message }) => {
  const isUser = message.role === "user";
  const timestamp = new Date(message.timestamp);
  const timeString = timestamp.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={`chat-message ${isUser ? "user-message" : "assistant-message"}`}>
      <div className='message-header'>
        <span className='sender'>{isUser ? "You" : "🤖 FortiWeb Expert"}</span>
        <span className='timestamp'>{timeString}</span>
      </div>
      <div className='message-content'>
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <ReportMarkdown content={message.content} />
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
