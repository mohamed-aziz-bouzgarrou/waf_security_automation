import React, { useState } from "react";
import "../styles/FixSuggestion.css";

/**
 * FixSuggestion Component
 * Displays a fix suggestion with approve/reject/apply options
 */

const FixSuggestion = ({
  fix,
  onApprove,
  onReject,
  onApply,
  isApplying = false,
  isApplyingCmd = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const severityColors = {
    CRITICAL: "#d32f2f",
    HIGH: "#f57c00",
    MEDIUM: "#fbc02d",
    LOW: "#388e3c",
  };

  const statusColors = {
    SUGGESTED: "#1976d2",
    APPROVED: "#388e3c",
    REJECTED: "#d32f2f",
    APPLYING: "#f57c00",
    APPLIED: "#00796b",
    FAILED: "#d32f2f",
  };

  const handleApprove = () => {
    onApprove(fix.fixId);
  };

  const handleReject = () => {
    if (showRejectForm) {
      onReject(fix.fixId, rejectionReason);
      setShowRejectForm(false);
      setRejectionReason("");
    } else {
      setShowRejectForm(true);
    }
  };

  const handleApply = () => {
    onApply(fix.fixId);
  };

  const handleCancel = () => {
    setShowRejectForm(false);
    setRejectionReason("");
  };

  const copyToClipboard = () => {
    const commands = fix.fortiwebCommands.join("\n");
    navigator.clipboard.writeText(commands).then(() => {
      alert("Commands copied to clipboard!");
    });
  };

  return (
    <div className="fix-suggestion">
      <div className="fix-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="fix-title">
          <span
            className="severity-badge"
            style={{ backgroundColor: severityColors[fix.severity] }}
          >
            {fix.severity}
          </span>
          <span className="title-text">{fix.description}</span>
        </div>
        <div className="fix-meta">
          <span
            className="status-badge"
            style={{ backgroundColor: statusColors[fix.status] }}
          >
            {fix.status}
          </span>
          <span className="expand-icon">{isExpanded ? "▼" : "▶"}</span>
        </div>
      </div>

      {isExpanded && (
        <div className="fix-details">
          {fix.reasoning && (
            <div className="fix-section">
              <h4>Reasoning</h4>
              <p>{fix.reasoning}</p>
            </div>
          )}

          {fix.affectedSettings && fix.affectedSettings.length > 0 && (
            <div className="fix-section">
              <h4>Affected Settings</h4>
              <ul>
                {fix.affectedSettings.map((setting, idx) => (
                  <li key={idx}>{setting}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="fix-section">
            <div className="commands-header">
              <h4>FortiWeb Commands</h4>
              <button className="copy-btn" onClick={copyToClipboard}>
                📋 Copy
              </button>
            </div>
            <div className="commands-box">
              {fix.fortiwebCommands.map((cmd, idx) => (
                <div key={idx} className="command-line">
                  <span className="cmd-number">{idx + 1}</span>
                  <code>{cmd}</code>
                </div>
              ))}
            </div>
          </div>

          {fix.potentialImpacts && fix.potentialImpacts.length > 0 && (
            <div className="fix-section">
              <h4>⚠️ Potential Impacts</h4>
              <ul>
                {fix.potentialImpacts.map((impact, idx) => (
                  <li key={idx}>{impact}</li>
                ))}
              </ul>
            </div>
          )}

          {fix.executionResults && fix.executionResults.output && (
            <div className="fix-section execution-results">
              <h4>Execution Results</h4>
              <div className="result-status">
                Status:{" "}
                <span
                  className={`status-${fix.executionResults.status.toLowerCase()}`}
                >
                  {fix.executionResults.status}
                </span>
              </div>
              <div className="result-output">
                <pre>{fix.executionResults.output}</pre>
              </div>
              {fix.executionResults.error && (
                <div className="result-error">
                  <strong>Error:</strong>
                  <pre>{fix.executionResults.error}</pre>
                </div>
              )}
            </div>
          )}

          <div className="fix-actions">
            {fix.status === "SUGGESTED" && (
              <>
                <button
                  className="btn btn-approve"
                  onClick={handleApprove}
                  disabled={isApplying}
                >
                  ✓ Approve
                </button>
                <button
                  className={`btn btn-reject ${showRejectForm ? "active" : ""}`}
                  onClick={handleReject}
                  disabled={isApplying}
                >
                  ✗ Reject
                </button>
              </>
            )}

            {fix.status === "APPROVED" && (
              <button
                className="btn btn-apply"
                onClick={handleApply}
                disabled={isApplyingCmd}
              >
                {isApplyingCmd ? "⏳ Applying..." : "🚀 Apply to FortiWeb"}
              </button>
            )}

            {fix.status === "APPLYING" && (
              <button className="btn btn-applying" disabled>
                ⏳ Applying...
              </button>
            )}

            {fix.status === "APPLIED" && (
              <button className="btn btn-applied" disabled>
                ✓ Applied Successfully
              </button>
            )}

            {fix.status === "FAILED" && (
              <button className="btn btn-failed" disabled>
                ✗ Application Failed
              </button>
            )}

            {fix.status === "REJECTED" && (
              <button className="btn btn-rejected" disabled>
                ✗ Rejected
              </button>
            )}
          </div>

          {showRejectForm && fix.status === "SUGGESTED" && (
            <div className="reject-form">
              <label>Reason for rejection (optional):</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Why are you rejecting this fix?"
              />
              <div className="form-actions">
                <button className="btn btn-confirm" onClick={handleReject}>
                  Confirm Rejection
                </button>
                <button className="btn btn-cancel" onClick={handleCancel}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FixSuggestion;
