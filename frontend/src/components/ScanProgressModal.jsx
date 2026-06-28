import React, { useState, useEffect } from "react";
import { X, CheckCircle, Loader, AlertCircle, Copy } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "../styles/ScanProgressModal.css";

/**
 * ScanProgressModal Component
 * Displays scan progress with real-time updates
 * Shows: AI analyzing → Report → CLI commands generation → Ready for approval
 *
 * Props:
 * - scanId: string - The scan identifier
 * - apiBaseUrl: string - API base URL for polling
 * - isOpen: boolean - Modal visibility
 * - onClose: function - Callback when closing modal
 * - onApprove: function - Callback when user approves
 * - onReject: function - Callback when user rejects
 * - mode: string - "view" (Scans page - show reports) or "approve" (Approval page - show only commands + buttons)
 */
export const ScanProgressModal = ({
  scanId,
  apiBaseUrl,
  isOpen,
  onClose,
  onApprove,
  onReject,
  mode = "view",
}) => {
  const [scanData, setScanData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [selectedGroups, setSelectedGroups] = useState(new Set());

  // Poll for scan updates
  useEffect(() => {
    if (!isOpen || !scanId) return;

    const fetchScanData = async () => {
      try {
        console.log(`[ScanProgressModal] Polling status for scanId: ${scanId}`);
        const response = await fetch(
          `${apiBaseUrl}/api/scan/status-v2/${scanId}`,
        );
        if (!response.ok) throw new Error("Failed to fetch scan data");

        const result = await response.json();
        if (result.success) {
          console.log(`[ScanProgressModal] Received data:`, result.data);
          console.log(`  - Status: ${result.data.status}`);
          console.log(
            `  - Has Report: ${!!result.data.report && result.data.report.trim().length > 0}`,
          );
          console.log(
            `  - Report Length: ${result.data.report?.length || 0} chars`,
          );
          console.log(
            `  - CLI Commands: ${result.data.cliCommands?.commands?.length || 0}`,
          );

          setScanData(result.data);
          setError(null);
          // Keep polling if not ready yet (cli_ready means both report and CLI commands received)
          if (result.data.status !== "cli_ready") {
            setLoading(true);
          } else {
            setLoading(false);
          }
        } else {
          setError(result.error || "Unknown error");
        }
      } catch (err) {
        console.error(`[ScanProgressModal] Error:`, err.message);
        console.error(`[ScanProgressModal] Full Error:`, err);
        console.error(
          `[ScanProgressModal] Attempted to fetch from: ${apiBaseUrl}/api/scan/status-v2/${scanId}`,
        );
        setError(err.message);
      }
    };

    fetchScanData();
    const interval = setInterval(fetchScanData, 2000); // Poll every 2 seconds
    return () => clearInterval(interval);
  }, [isOpen, scanId, apiBaseUrl]);

  if (!isOpen) return null;

  const executionCompleted =
    scanData?.executionStatus &&
    ["SUCCESS", "FAILURE", "PARTIAL_FAILURE"].includes(scanData.executionStatus);
  const isExecuting =
    !executionCompleted &&
    (scanData?.status === "APPLYING_FIXES" ||
      scanData?.executionStatus === "EXECUTING");

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const toggleGroupSelection = (idx) => {
    const newSelected = new Set(selectedGroups);
    if (newSelected.has(idx)) {
      newSelected.delete(idx);
    } else {
      newSelected.add(idx);
    }
    setSelectedGroups(newSelected);
  };

  const selectAllGroups = () => {
    if (scanData?.cliCommands?.commands?.length > 0) {
      const pendingIndices = new Set(
        Array.from(
          { length: scanData.cliCommands.commands.length },
          (_, i) => i,
        ).filter((idx) => !scanData?.approvedCommandIndices?.includes(idx)),
      );
      setSelectedGroups(pendingIndices);
    }
  };

  const deselectAllGroups = () => {
    setSelectedGroups(new Set());
  };

  const handleApproveSelected = async () => {
    if (selectedGroups.size === 0) return;
    setApproving(true);
    try {
      await onApprove(scanData._id || scanId, Array.from(selectedGroups));
      setSelectedGroups(new Set());
    } finally {
      setApproving(false);
    }
  };

  const handleApproveAll = async () => {
    setApproving(true);
    try {
      await onApprove(scanData._id || scanId, null);
      setSelectedGroups(new Set());
    } finally {
      setApproving(false);
    }
  };

  const handleRejectScan = async () => {
    setRejecting(true);
    try {
      await onReject(scanData._id || scanId, rejectReason);
      setShowRejectModal(false);
      setRejectReason("");
    } finally {
      setRejecting(false);
    }
  };

  const getStatusIcon = (statusKey) => {
    if (!scanData) return null;

    switch (statusKey) {
      case "report":
        // Check if report has actual content (not empty string)
        if (scanData.report && scanData.report.trim().length > 0) {
          return <CheckCircle className='status-icon check' />;
        }
        if (scanData.status === "report_ready" || !scanData.report) {
          return <Loader className='status-icon spinning' />;
        }
        return <div className='status-icon pending' />;

      case "cli":
        if (scanData.cliCommands?.commands?.length > 0)
          return <CheckCircle className='status-icon check' />;
        if (scanData.report && !scanData.cliCommands?.commands?.length)
          return <Loader className='status-icon spinning' />;
        return <div className='status-icon pending' />;

      default:
        return null;
    }
  };

  const hasReport = scanData?.report && scanData.report.trim().length > 0;
  const hasCliCommands =
    scanData?.cliCommands?.commands && scanData.cliCommands.commands.length > 0;
  const isReady = hasReport && hasCliCommands;

  return (
    <div className='scan-progress-overlay'>
      <div className='scan-progress-modal'>
        {/* Header */}
        <div className='modal-header'>
          <div className='header-content'>
            <h2>
              {mode === "approve"
                ? "Approve Scan Commands"
                : "Scan Analysis Progress"}
            </h2>
            {scanData?.target && mode === "approve" && (
              <div
                style={{
                  marginTop: "0.5rem",
                  fontSize: "0.95rem",
                  color: "var(--color-text-secondary)",
                }}>
                <div>
                  <strong>Target:</strong> {scanData.target}
                </div>
                <div>
                  <strong>Scan ID:</strong> {scanId}
                </div>
              </div>
            )}
            {!scanData?.target && <p className='scan-id'>ID: {scanId}</p>}
          </div>
          <button className='close-btn' onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Status Message - Only show in "view" mode during progress */}
        {mode === "view" && (
          <div className='status-message'>
            {loading && !hasReport && (
              <div className='spinner-inline'>
                <Loader className='spinner' />
              </div>
            )}
            <p
              className='status-text'
              style={{ whiteSpace: "pre-line", fontWeight: "500" }}>
              {scanData?.statusMessage || "Processing..."}
            </p>
          </div>
        )}

        {/* Content */}
        <div className='modal-content'>
          {error && (
            <div className='alert alert-error'>
              <AlertCircle size={20} />
              <p>{error}</p>
            </div>
          )}

          {/* ZAP Scan Summary Section - Only show in "view" mode */}
          {mode === "view" &&
            scanData?.summary &&
            Object.values(scanData.summary).some((v) => v > 0) && (
              <div className='progress-section'>
                <div className='section-header'>
                  <div className='header-left'>
                    <CheckCircle className='status-icon check' />
                    <span>ZAP Security Scan Results</span>
                  </div>
                </div>
                <div className='section-content'>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "1rem",
                      marginBottom: "1rem",
                    }}>
                    <div
                      style={{
                        padding: "0.75rem",
                        backgroundColor: "var(--color-bg-secondary)",
                        borderRadius: "0.5rem",
                        textAlign: "center",
                      }}>
                      <div
                        style={{
                          fontSize: "1.5rem",
                          fontWeight: "bold",
                          color: "#ef4444",
                        }}>
                        {scanData.summary.critical || 0}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                        Critical
                      </div>
                    </div>
                    <div
                      style={{
                        padding: "0.75rem",
                        backgroundColor: "var(--color-bg-secondary)",
                        borderRadius: "0.5rem",
                        textAlign: "center",
                      }}>
                      <div
                        style={{
                          fontSize: "1.5rem",
                          fontWeight: "bold",
                          color: "#f97316",
                        }}>
                        {scanData.summary.high || 0}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                        High
                      </div>
                    </div>
                    <div
                      style={{
                        padding: "0.75rem",
                        backgroundColor: "var(--color-bg-secondary)",
                        borderRadius: "0.5rem",
                        textAlign: "center",
                      }}>
                      <div
                        style={{
                          fontSize: "1.5rem",
                          fontWeight: "bold",
                          color: "#eab308",
                        }}>
                        {scanData.summary.medium || 0}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                        Medium
                      </div>
                    </div>
                  </div>
                  <p
                    style={{
                      fontSize: "0.9rem",
                      color: "#9ca3af",
                      margin: "0.5rem 0",
                    }}>
                    Total vulnerabilities found:{" "}
                    <strong>{scanData.summary.total || 0}</strong>
                  </p>
                </div>
              </div>
            )}

          {/* ZAP Report Details Section - Only show in "view" mode */}
          {mode === "view" && scanData?.zapReport && (
            <div className='progress-section'>
              <div className='section-header'>
                <div className='header-left'>
                  <CheckCircle className='status-icon check' />
                  <span>ZAP Detailed Report</span>
                </div>
              </div>
              <div className='section-content'>
                <div
                  style={{
                    whiteSpace: "pre-wrap",
                    fontFamily: "monospace",
                    fontSize: "0.85rem",
                    lineHeight: "1.6",
                    maxHeight: "300px",
                    overflowY: "auto",
                    backgroundColor: "var(--color-bg-secondary)",
                    padding: "1rem",
                    borderRadius: "0.5rem",
                    color: "#cbd5e1",
                  }}>
                  {typeof scanData.zapReport === "string"
                    ? scanData.zapReport
                    : JSON.stringify(scanData.zapReport, null, 2)}
                </div>
              </div>
            </div>
          )}

          {/* AI Report Section - Only show in "view" mode */}
          {mode === "view" && hasReport && (
            <div className='progress-section'>
              <div className='section-header'>
                <div className='header-left'>
                  <CheckCircle className='status-icon check' />
                  <span>AI Security Analysis Report</span>
                </div>
              </div>
              <div className='section-content ai-report-content'>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {scanData.report}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* CLI Commands Summary Section */}
          <>
            <div className='progress-section'>
              <div className='section-header'>
                <div className='header-left'>
                  {getStatusIcon("cli")}
                  <span>
                    CLI Commands Summary
                    {hasCliCommands && (
                      <span className='badge'>
                        {scanData.cliCommands.commands.length} sets
                      </span>
                    )}
                  </span>
                </div>
              </div>

              <div className='section-content'>
                {hasCliCommands ? (
                  <>
                    {scanData.cliCommands.summary && (
                      <div className='cli-summary'>
                        {scanData.cliCommands.summary}
                      </div>
                    )}
                    {scanData.cliCommands.warnings?.length > 0 && (
                      <div className='warnings'>
                        <h4>⚠️ Warnings:</h4>
                        <ul>
                          {scanData.cliCommands.warnings.map((w, i) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className='command-count'>
                      <strong>{scanData.cliCommands.totalCommands}</strong>{" "}
                      command set
                      {scanData.cliCommands.totalCommands !== 1 ? "s" : ""}{" "}
                      ready for approval
                    </div>
                  </>
                ) : (
                  <div className='placeholder'>
                    <Loader className='spinner' />
                    <p>AI is generating CLI commands...</p>
                  </div>
                )}
              </div>
            </div>

            {/* CLI Commands Detail Section */}
            {hasCliCommands && (
              <div className='progress-section'>
                <div className='section-header'>
                  <div className='header-left'>
                    <span>Command Details</span>
                  </div>
                </div>

                <div className='section-content commands-list'>
                  {/* Approval Status Summary */}
                  {mode === "approve" && scanData?.approvedCommandIndices && scanData.approvedCommandIndices.length > 0 && (
                    <div
                      style={{
                        marginBottom: "1rem",
                        padding: "1rem",
                        backgroundColor: "#d1fae5",
                        borderLeft: "4px solid #10b981",
                        borderRadius: "4px",
                      }}>
                      <div style={{ color: "#047857", fontWeight: "600" }}>
                        ✅ Approval Status
                      </div>
                      <div style={{ color: "#065f46", fontSize: "0.9rem", marginTop: "0.5rem" }}>
                        {scanData.approvedCommandIndices.length} of {scanData.cliCommands.commands.length} command sets already approved
                      </div>
                      {scanData.approvedAt && (
                        <div style={{ color: "#065f46", fontSize: "0.85rem", marginTop: "0.25rem" }}>
                          Approved on {new Date(scanData.approvedAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                  )}

                  <div
                    style={{
                      marginBottom: "1rem",
                      display: "flex",
                      gap: "0.5rem",
                    }}>
                    <button
                      className='btn btn-sm'
                      onClick={selectAllGroups}
                      style={{ fontSize: "0.85rem" }}>
                      Select All Pending
                    </button>
                    <button
                      className='btn btn-sm'
                      onClick={deselectAllGroups}
                      style={{ fontSize: "0.85rem" }}>
                      Deselect All
                    </button>
                    <span
                      style={{
                        marginLeft: "auto",
                        fontSize: "0.9rem",
                        alignSelf: "center",
                      }}>
                      {mode === "approve"
                        ? `${scanData.cliCommands.commands.length - (scanData?.approvedCommandIndices?.length || 0)} pending • ${selectedGroups.size} selected`
                        : `${selectedGroups.size} of ${scanData.cliCommands.commands.length} selected`}
                    </span>
                  </div>
                  {scanData.cliCommands.commands.map((cmdSet, idx) => {
                    const isApproved = scanData?.approvedCommandIndices?.includes(idx);
                    return (
                      <div
                        key={idx}
                        className='command-set'
                        style={{
                          opacity:
                            selectedGroups.size === 0 || selectedGroups.has(idx)
                              ? 1
                              : 0.5,
                          backgroundColor: isApproved
                            ? "rgba(34, 197, 94, 0.15)"
                            : selectedGroups.has(idx)
                              ? "rgba(34, 197, 94, 0.1)"
                              : "transparent",
                          border: isApproved
                            ? "2px solid #10b981"
                            : selectedGroups.has(idx)
                              ? "2px solid #22c55e"
                              : "1px solid var(--color-border)",
                        }}>
                        <div
                          className='command-header'
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.75rem",
                            justifyContent: "space-between",
                          }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.75rem",
                              flex: 1,
                            }}>
                            {mode === "approve" && !isApproved && (
                              <input
                                type='checkbox'
                                checked={selectedGroups.has(idx)}
                                onChange={() => toggleGroupSelection(idx)}
                                style={{
                                  width: "18px",
                                  height: "18px",
                                  cursor: "pointer",
                                }}
                                title={`Select group: ${cmdSet.issue_name}`}
                              />
                            )}
                            {isApproved && (
                              <div style={{ width: "18px", height: "18px" }}>
                                <CheckCircle size={18} style={{ color: "#10b981" }} />
                              </div>
                            )}
                            <span
                              className={`severity-badge ${cmdSet.severity.toLowerCase()}`}>
                              {cmdSet.severity}
                            </span>
                            <h4 style={{ margin: 0 }}>{cmdSet.issue_name}</h4>
                          </div>
                          <span
                            style={{
                              padding: "0.25rem 0.75rem",
                              borderRadius: "4px",
                              fontSize: "0.75rem",
                              fontWeight: "600",
                              backgroundColor: isApproved ? "#d1fae5" : "#fef3c7",
                              color: isApproved ? "#047857" : "#92400e",
                            }}>
                            {isApproved ? "✅ Approved" : "⏳ Pending"}
                          </span>
                        </div>
                      <p className='command-description'>
                        {cmdSet.description}
                      </p>
                      <div className='commands'>
                        {cmdSet.commands.map((cmd, cmdIdx) => (
                          <div key={cmdIdx} className='command-item'>
                            <code>{cmd}</code>
                            <button
                              className='copy-btn'
                              onClick={() => copyToClipboard(cmd, cmdIdx)}
                              title='Copy command'>
                              {copiedIndex === cmdIdx ? (
                                <CheckCircle size={16} />
                              ) : (
                                <Copy size={16} />
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                      {cmdSet.notes && (
                        <p className='command-notes'>📝 {cmdSet.notes}</p>
                      )}
                    </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        </div>

        {/* Actions */}
        <div className='modal-footer'>
          <button className='btn btn-secondary' onClick={onClose}>
            Close
          </button>

          {mode === "approve" && (
            <>
              {/* Execution Results Section - Show after execution */}
              {executionCompleted && (
                <div
                  style={{
                    width: "100%",
                    marginBottom: "1rem",
                    padding: "1rem",
                    backgroundColor:
                      scanData.executionStatus === "SUCCESS"
                        ? "#d1fae5"
                        : scanData.executionStatus === "FAILURE"
                          ? "#fee2e2"
                          : "#ffedd5",
                    borderRadius: "6px",
                    border:
                      scanData.executionStatus === "SUCCESS"
                        ? "1px solid #6ee7b7"
                        : scanData.executionStatus === "FAILURE"
                          ? "1px solid #fca5a5"
                          : "1px solid #fdba74",
                    color:
                      scanData.executionStatus === "SUCCESS"
                        ? "#064e3b"
                        : scanData.executionStatus === "FAILURE"
                          ? "#7f1d1d"
                          : "#7c2d12",
                  }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginBottom: "0.5rem",
                    }}>
                    {scanData.executionStatus === "SUCCESS" && (
                      <span style={{ color: "#047857", fontWeight: "bold" }}>
                        ✅ Success
                      </span>
                    )}
                    {scanData.executionStatus === "FAILURE" && (
                      <span style={{ color: "#b91c1c", fontWeight: "bold" }}>
                        ❌ Failed
                      </span>
                    )}
                    {scanData.executionStatus === "PARTIAL_FAILURE" && (
                      <span style={{ color: "#c2410c", fontWeight: "bold" }}>
                        ⚠️ Partial Failure
                      </span>
                    )}
                  </div>
                  {scanData.executionMessage && (
                    <p style={{ margin: 0, color: "inherit" }}>
                      {scanData.executionMessage}
                    </p>
                  )}
                  {(scanData.executionStatus === "FAILURE" ||
                    scanData.executionStatus === "PARTIAL_FAILURE") &&
                    (scanData.executionResults?.firstFailedCommand ||
                      (Array.isArray(scanData.executionResults?.failedCommands) &&
                        scanData.executionResults.failedCommands.length > 0)) && (
                      (() => {
                        const first =
                          scanData.executionResults?.firstFailedCommand ||
                          scanData.executionResults.failedCommands[0];
                        return (
                          <div
                            style={{
                              marginTop: "0.75rem",
                              paddingTop: "0.75rem",
                              borderTop: "1px solid rgba(0,0,0,0.12)",
                            }}>
                            <p style={{ margin: 0, fontWeight: 600 }}>
                              First failing command: #{first.commandIndex}
                            </p>
                            <p
                              style={{
                                margin: "0.5rem 0 0 0",
                                fontFamily:
                                  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                                fontSize: "0.85rem",
                                whiteSpace: "pre-wrap",
                              }}>
                              {first.command}
                            </p>
                            {first.errorLine && (
                              <p
                                style={{
                                  margin: "0.5rem 0 0 0",
                                  fontFamily:
                                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                                  fontSize: "0.85rem",
                                  whiteSpace: "pre-wrap",
                                }}>
                                {first.errorLine}
                              </p>
                            )}
                          </div>
                        );
                      })()
                    )}
                </div>
              )}

              {isExecuting && (
                <div style={{ width: '100%', marginBottom: '1rem', padding: '1rem', backgroundColor: '#dbeafe', borderRadius: '4px' }}>
                  <p style={{ margin: 0, color: '#1d4ed8', fontWeight: 600 }}>
                    ⚙️ Executing approved commands on FortiWeb...
                  </p>
                </div>
              )}

              {!executionCompleted && (
                <>
                  <button
                    className='btn btn-danger'
                    onClick={() => setShowRejectModal(true)}
                    disabled={rejecting || !isReady}>
                    Reject
                  </button>
                  <button
                    className='btn btn-secondary'
                    onClick={handleApproveAll}
                    disabled={
                      approving || !hasReport || !hasCliCommands || !isReady
                    }
                    title='Approve all command groups'>
                    {approving ? "Approving..." : "Approve All"}
                  </button>
                  <button
                    className='btn btn-primary'
                    onClick={handleApproveSelected}
                    disabled={
                      approving ||
                      !hasReport ||
                      !hasCliCommands ||
                      selectedGroups.size === 0 ||
                      !isReady
                    }
                    title={
                      selectedGroups.size === 0
                        ? "Select at least one group"
                        : "Approve selected groups"
                    }>
                    {approving
                      ? `Approving ${selectedGroups.size}...`
                      : `Approve Selected (${selectedGroups.size})`}
                  </button>
                </>
              )}
            </>
          )}
        </div>

        {/* Reject Modal */}
        {showRejectModal && (
          <div className='reject-modal-overlay'>
            <div className='reject-modal'>
              <h3>Reject Scan</h3>
              <p>Please provide a reason for rejection:</p>
              <textarea
                placeholder='Enter rejection reason...'
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
              />
              <div className='modal-actions'>
                <button
                  className='btn btn-secondary'
                  onClick={() => setShowRejectModal(false)}>
                  Cancel
                </button>
                <button
                  className='btn btn-danger'
                  onClick={handleRejectScan}
                  disabled={rejecting || !rejectReason.trim()}>
                  {rejecting ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScanProgressModal;
