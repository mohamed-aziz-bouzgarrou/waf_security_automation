import React from "react";
import { X, Copy, Check } from "lucide-react";
import { StatusBadge } from "./Badges";
import "../styles/CommandDetailsModal.css";

export const CommandDetailsModal = ({ command, isOpen, onClose }) => {
  const [copiedFields, setCopiedFields] = React.useState({});

  if (!isOpen || !command) return null;

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedFields({ ...copiedFields, [field]: true });
    setTimeout(() => {
      setCopiedFields({ ...copiedFields, [field]: false });
    }, 2000);
  };

  const formatDuration = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const formatTimestamp = (iso) => {
    const date = new Date(iso);
    return date.toLocaleString();
  };

  const getSeverityColor = (severity) => {
    const colors = {
      CRITICAL: "#ef4444",
      HIGH: "#f97316",
      MEDIUM: "#eab308",
      LOW: "#3b82f6",
      INFO: "#10b981",
    };
    return colors[severity] || "#6b7280";
  };

  const approvedOn = command.approvedAt
    ? formatTimestamp(command.approvedAt)
    : command.timestamp
      ? formatTimestamp(command.timestamp)
      : "N/A";

  const executedCommands = Array.isArray(command.executedCommands)
    ? command.executedCommands
    : [];
  const commandSets = Array.isArray(command.commandSets) ? command.commandSets : [];

  const executedSet = new Set(executedCommands);
  const groupedExecutedCommands = commandSets
    .map((group, groupIndex) => {
      const groupCommands = Array.isArray(group.commands) ? group.commands : [];
      const executedInGroup = groupCommands.filter((c) => executedSet.has(c));
      return {
        groupIndex,
        issue_id: group.issue_id,
        issue_name: group.issue_name,
        severity: group.severity,
        description: group.description,
        notes: group.notes,
        executedCommands: executedInGroup,
      };
    })
    .filter((g) => g.executedCommands.length > 0);

  const groupedExecutedSet = new Set(
    groupedExecutedCommands.flatMap((g) => g.executedCommands),
  );
  const ungroupedExecutedCommands = executedCommands.filter(
    (c) => !groupedExecutedSet.has(c),
  );

  return (
    <div className="command-modal-overlay" onClick={onClose}>
      <div
        className="command-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="command-modal-header">
          <div className="command-modal-title">
            <h2>Scan Details</h2>
            <StatusBadge status={command.status} />
          </div>
          <button className="command-modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="command-modal-body">
          <div className="command-detail-section">
            <h3>Scan Information</h3>
            {command.executionMessage && (
              <div className="detail-note">{command.executionMessage}</div>
            )}
            <div className="detail-row">
              <span className="detail-label">Scan ID:</span>
              <div className="detail-value-with-copy">
                <span className="detail-value">{command.scanId}</span>
                <button
                  className="copy-btn"
                  onClick={() => copyToClipboard(command.scanId, "scanId")}
                  title="Copy scan ID"
                >
                  {copiedFields.scanId ? (
                    <Check size={16} />
                  ) : (
                    <Copy size={16} />
                  )}
                </button>
              </div>
            </div>
            <div className="detail-row">
              <span className="detail-label">Target:</span>
              <div className="detail-value-with-copy">
                <span className="detail-value">{command.target}</span>
                <button
                  className="copy-btn"
                  onClick={() => copyToClipboard(command.target, "target")}
                  title="Copy target"
                >
                  {copiedFields.target ? (
                    <Check size={16} />
                  ) : (
                    <Copy size={16} />
                  )}
                </button>
              </div>
            </div>
            <div className="detail-row">
              <span className="detail-label">Approved On:</span>
              <span className="detail-value">{approvedOn}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Executed:</span>
              <span className="detail-value">
                {command.executedCommandsCount ??
                  command.executedCommands?.length ??
                  0}
              </span>
            </div>
            {command.executionStatus && (
              <div className="detail-row">
                <span className="detail-label">Execution:</span>
                <span className="detail-value">{command.executionStatus}</span>
              </div>
            )}
          </div>

          <div className="command-detail-section">
            <h3>
              Successfully Executed Commands (
              {command.executedCommandsCount ??
                command.executedCommands?.length ??
                0}
              )
            </h3>
            {groupedExecutedCommands.length > 0 ? (
              <div className="commands-groups">
                {groupedExecutedCommands.map((cmdSet) => (
                  <div
                    key={`${cmdSet.issue_id || "group"}-${cmdSet.groupIndex}`}
                    className="command-group-item"
                  >
                    <div className="group-header">
                      <span
                        className="severity-badge"
                        style={{
                          backgroundColor: getSeverityColor(cmdSet.severity),
                          color: "white",
                          padding: "0.35rem 0.75rem",
                          borderRadius: "0.25rem",
                          fontSize: "0.75rem",
                          fontWeight: "700",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        {cmdSet.severity}
                      </span>
                      <h4 className="issue-name">{cmdSet.issue_name}</h4>
                    </div>
                    {cmdSet.description && (
                      <p className="issue-description">{cmdSet.description}</p>
                    )}
                    <div className="commands-list">
                      {cmdSet.executedCommands.map((cmd, cmdIdx) => (
                        <div
                          key={`${cmdSet.groupIndex}-${cmdIdx}`}
                          className="command-item-grouped"
                        >
                          <code className="command-code-grouped">{cmd}</code>
                          <button
                            className="copy-cmd-btn"
                            onClick={() =>
                              copyToClipboard(
                                cmd,
                                `cmd-executed-${cmdSet.groupIndex}-${cmdIdx}`,
                              )
                            }
                            title="Copy command"
                          >
                            {copiedFields[
                              `cmd-executed-${cmdSet.groupIndex}-${cmdIdx}`
                            ] ? (
                              <Check size={14} />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                    {cmdSet.notes && (
                      <p className="command-notes">📝 {cmdSet.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : null}

            {ungroupedExecutedCommands.length > 0 && (
              <div className="commands-groups">
                <div className="command-group-item">
                  <div className="group-header">
                    <span
                      className="severity-badge"
                      style={{
                        backgroundColor: getSeverityColor("INFO"),
                        color: "white",
                      }}
                    >
                      INFO
                    </span>
                    <h4 className="issue-name">Other Executed Commands</h4>
                  </div>
                  <div className="commands-list">
                    {ungroupedExecutedCommands.map((cmd, cmdIdx) => (
                      <div key={cmdIdx} className="command-item-grouped">
                        <code className="command-code-grouped">{cmd}</code>
                        <button
                          className="copy-cmd-btn"
                          onClick={() =>
                            copyToClipboard(cmd, `cmd-other-${cmdIdx}`)
                          }
                          title="Copy command"
                        >
                          {copiedFields[`cmd-other-${cmdIdx}`] ? (
                            <Check size={14} />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {groupedExecutedCommands.length === 0 &&
              ungroupedExecutedCommands.length === 0 && (
                <p className="no-commands">No executed commands available</p>
              )}
          </div>

          {command.logs && (
            <div className="command-detail-section">
              <h3>Logs</h3>
              <pre className="logs-box">{command.logs}</pre>
            </div>
          )}
        </div>

        <div className="command-modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
