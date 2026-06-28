import React, { useState, useEffect } from "react";
import {
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Code,
} from "lucide-react";

/**
 * ScanResultsWithCLI Component
 * Displays analysis report and CLI commands for FortiWeb remediation
 *
 * Props:
 * - scanId: string - The scan identifier
 * - apiBaseUrl: string - API base URL for polling
 * - onApprove: function - Callback when user approves
 * - onReject: function - Callback when user rejects
 * - onApplySelected: function - Callback for partial approval
 */
export const ScanResultsWithCLI = ({
  scanId,
  apiBaseUrl,
  onApprove,
  onReject,
  onApplySelected,
}) => {
  const [scanData, setScanData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedCommand, setExpandedCommand] = useState(null);
  const [selectedCommands, setSelectedCommands] = useState(new Set());
  const [approving, setApproving] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Polling interval in ms
  const POLL_INTERVAL = 2000;

  // Fetch scan data
  useEffect(() => {
    const fetchScanData = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/scan/status/${scanId}`);
        if (!response.ok) throw new Error("Failed to fetch scan data");

        const result = await response.json();
        if (result.success) {
          setScanData(result.data);
          setError(null);
        } else {
          setError(result.error || "Unknown error");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchScanData();
    const interval = setInterval(fetchScanData, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [scanId, apiBaseUrl]);

  if (loading) {
    return (
      <div className='flex items-center justify-center p-8'>
        <div className='text-center'>
          <div className='mb-4 inline-block'>
            <div className='h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600'></div>
          </div>
          <p className='text-gray-600'>Loading scan results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='rounded-lg border border-red-200 bg-red-50 p-6'>
        <div className='flex items-center gap-3'>
          <AlertCircle className='h-6 w-6 text-red-600' />
          <div>
            <p className='font-semibold text-red-900'>Error</p>
            <p className='text-sm text-red-700'>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!scanData) {
    return (
      <div className='rounded-lg border border-yellow-200 bg-yellow-50 p-6'>
        <p className='text-yellow-800'>No scan data available</p>
      </div>
    );
  }

  const hasReport = !!scanData.report;
  const hasCliCommands =
    !!scanData.cliCommands?.commands &&
    scanData.cliCommands.commands.length > 0;

  // Check if execution has already been completed
  const executionCompleted =
    scanData.executionStatus &&
    ["SUCCESS", "FAILURE", "PARTIAL_FAILURE"].includes(
      scanData.executionStatus,
    );
  const isExecutionApplied =
    scanData.status === "APPLIED" || scanData.status === "FAILED";

  const firstFailedCommand =
    scanData.executionResults?.firstFailedCommand ||
    (Array.isArray(scanData.executionResults?.failedCommands) &&
      scanData.executionResults.failedCommands.length > 0
      ? scanData.executionResults.failedCommands[0]
      : null);

  const toggleCommandSelection = (index) => {
    const newSelected = new Set(selectedCommands);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedCommands(newSelected);
  };

  const toggleAllCommands = () => {
    if (selectedCommands.size === scanData.cliCommands?.commands?.length) {
      setSelectedCommands(new Set());
    } else {
      const allIndices = new Set(
        scanData.cliCommands?.commands?.map((_, i) => i) || [],
      );
      setSelectedCommands(allIndices);
    }
  };

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleApproveAll = async () => {
    setApproving(true);
    try {
      await onApprove(scanId, null);
    } finally {
      setApproving(false);
    }
  };

  const handleApproveSelected = async () => {
    setApproving(true);
    try {
      const indices = Array.from(selectedCommands);
      await onApplySelected(scanId, indices);
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (window.confirm("Are you sure you want to reject this scan?")) {
      await onReject(scanId);
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      CRITICAL: "bg-red-100 text-red-800 border border-red-300",
      HIGH: "bg-orange-100 text-orange-800 border border-orange-300",
      MEDIUM: "bg-yellow-100 text-yellow-800 border border-yellow-300",
      LOW: "bg-blue-100 text-blue-800 border border-blue-300",
      INFO: "bg-gray-100 text-gray-800 border border-gray-300",
    };
    return colors[severity] || colors.INFO;
  };

  const getSeverityBgColor = (severity) => {
    const colors = {
      CRITICAL: "bg-red-50",
      HIGH: "bg-orange-50",
      MEDIUM: "bg-yellow-50",
      LOW: "bg-blue-50",
      INFO: "bg-gray-50",
    };
    return colors[severity] || colors.INFO;
  };

  return (
    <div className='space-y-6'>
      {/* Header Card */}
      <div className='rounded-lg border border-gray-200 bg-white p-6 shadow-sm'>
        <div className='mb-4 flex items-center justify-between'>
          <div>
            <h2 className='text-2xl font-bold text-gray-900'>Scan Results</h2>
            <p className='mt-1 text-sm text-gray-500'>
              Target:{" "}
              <span className='font-mono text-gray-700'>{scanData.target}</span>
            </p>
          </div>
          <div className='text-right'>
            <div className='inline-block rounded-lg bg-gray-100 px-4 py-2'>
              <p className='text-sm text-gray-600'>Total Issues</p>
              <p className='text-3xl font-bold text-gray-900'>
                {scanData.structured?.summary?.total || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Status Indicators */}
        <div className='flex gap-4'>
          <div className='flex items-center gap-2'>
            {hasReport ? (
              <>
                <CheckCircle className='h-5 w-5 text-green-600' />
                <span className='text-sm text-green-700'>Report Ready</span>
              </>
            ) : (
              <>
                <Clock className='h-5 w-5 text-gray-400' />
                <span className='text-sm text-gray-500'>Report Pending...</span>
              </>
            )}
          </div>
          <div className='flex items-center gap-2'>
            {hasCliCommands ? (
              <>
                <CheckCircle className='h-5 w-5 text-green-600' />
                <span className='text-sm text-green-700'>CLI Ready</span>
              </>
            ) : (
              <>
                <Clock className='h-5 w-5 text-gray-400' />
                <span className='text-sm text-gray-500'>
                  Generating FortiWeb CLI fixes...
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Analysis Report Section */}
      {hasReport && (
        <div className='rounded-lg border border-gray-200 bg-white p-6 shadow-sm'>
          <h3 className='mb-4 flex items-center gap-2 text-xl font-bold text-gray-900'>
            <AlertCircle className='h-5 w-5' />
            Analysis Report
          </h3>

          {/* Summary Stats */}
          {scanData.structured?.summary && (
            <div className='mb-6 grid grid-cols-5 gap-4'>
              {Object.entries(scanData.structured.summary).map(
                ([key, value]) => {
                  if (key === "total") return null;
                  return (
                    <div
                      key={key}
                      className='rounded-lg border border-gray-200 bg-gray-50 p-4 text-center'>
                      <p className='text-2xl font-bold text-gray-900'>
                        {value}
                      </p>
                      <p className='text-xs capitalize text-gray-600'>{key}</p>
                    </div>
                  );
                },
              )}
            </div>
          )}

          {/* Report Content */}
          <div className='prose prose-sm max-w-none rounded-lg bg-gray-50 p-4'>
            <div className='overflow-auto text-sm text-gray-700'>
              {scanData.report}
            </div>
          </div>
        </div>
      )}

      {/* CLI Commands Section - Only show if not yet executed */}
      {hasCliCommands && !executionCompleted && (
        <div className='space-y-4'>
          <div className='rounded-lg border border-gray-200 bg-white p-6 shadow-sm'>
            <h3 className='mb-2 flex items-center gap-2 text-xl font-bold text-gray-900'>
              <Code className='h-5 w-5' />
              FortiWeb CLI Commands
            </h3>
            <p className='mb-4 text-sm text-gray-600'>
              {scanData.cliCommands?.summary}
            </p>

            {/* Warnings */}
            {scanData.cliCommands?.warnings &&
              scanData.cliCommands.warnings.length > 0 && (
                <div className='mb-4 space-y-2 rounded-lg border border-yellow-200 bg-yellow-50 p-4'>
                  {scanData.cliCommands.warnings.map((warning, idx) => (
                    <div
                      key={idx}
                      className='flex gap-2 text-sm text-yellow-800'>
                      <AlertCircle className='h-4 w-4 flex-shrink-0 text-yellow-600' />
                      <span>{warning}</span>
                    </div>
                  ))}
                </div>
              )}
          </div>

          {/* Command Sets */}
          <div className='space-y-3'>
            {/* Select All Toggle */}
            {scanData.cliCommands?.commands?.length > 0 && (
              <div className='flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4'>
                <input
                  type='checkbox'
                  id='select-all'
                  checked={
                    selectedCommands.size ===
                    scanData.cliCommands?.commands?.length
                  }
                  onChange={toggleAllCommands}
                  className='h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600'
                />
                <label
                  htmlFor='select-all'
                  className='cursor-pointer text-sm font-medium text-gray-700'>
                  Select All Commands
                </label>
              </div>
            )}

            {/* Individual Command Sets */}
            {scanData.cliCommands?.commands?.map((cmdSet, index) => (
              <div
                key={index}
                className={`rounded-lg border transition-colors ${getSeverityBgColor(
                  cmdSet.severity,
                )} border-gray-200`}>
                {/* Command Header */}
                <button
                  onClick={() =>
                    setExpandedCommand(expandedCommand === index ? null : index)
                  }
                  className='w-full p-4 text-left'>
                  <div className='flex items-start justify-between gap-4'>
                    <div className='flex flex-1 items-start gap-3'>
                      <input
                        type='checkbox'
                        checked={selectedCommands.has(index)}
                        onChange={() => toggleCommandSelection(index)}
                        onClick={(e) => e.stopPropagation()}
                        className='mt-1 h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600'
                      />
                      <div className='flex-1'>
                        <h4 className='font-semibold text-gray-900'>
                          {cmdSet.issue_name}
                        </h4>
                        <p className='mt-1 text-sm text-gray-600'>
                          {cmdSet.description}
                        </p>
                      </div>
                    </div>
                    <div className='flex items-center gap-3'>
                      <span
                        className={`inline-block rounded px-2 py-1 text-xs font-semibold ${getSeverityColor(cmdSet.severity)}`}>
                        {cmdSet.severity}
                      </span>
                      {expandedCommand === index ? (
                        <ChevronUp className='h-5 w-5 text-gray-400' />
                      ) : (
                        <ChevronDown className='h-5 w-5 text-gray-400' />
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded Content */}
                {expandedCommand === index && (
                  <div className='border-t border-gray-200 bg-white p-4'>
                    {/* Issue ID */}
                    <div className='mb-4'>
                      <p className='text-xs font-semibold uppercase text-gray-500'>
                        Issue ID
                      </p>
                      <p className='font-mono text-sm text-gray-700'>
                        {cmdSet.issue_id}
                      </p>
                    </div>

                    {/* Commands */}
                    <div className='mb-4'>
                      <p className='mb-2 text-xs font-semibold uppercase text-gray-500'>
                        CLI Commands ({cmdSet.commands.length})
                      </p>
                      <div className='space-y-2'>
                        {cmdSet.commands.map((cmd, cmdIdx) => (
                          <div key={cmdIdx} className='flex gap-2'>
                            <button
                              onClick={() =>
                                copyToClipboard(cmd, `${index}-${cmdIdx}`)
                              }
                              className='flex-1 rounded-lg border border-gray-300 bg-gray-50 p-3 text-left font-mono text-sm text-gray-700 hover:bg-gray-100 transition-colors'
                              title='Click to copy'>
                              <code>{cmd}</code>
                            </button>
                            <button
                              onClick={() =>
                                copyToClipboard(cmd, `${index}-${cmdIdx}`)
                              }
                              className='flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 hover:bg-gray-50 transition-colors'
                              title='Copy to clipboard'>
                              {copiedIndex === `${index}-${cmdIdx}` ? (
                                <Check className='h-4 w-4 text-green-600' />
                              ) : (
                                <Copy className='h-4 w-4 text-gray-600' />
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Notes */}
                    {cmdSet.notes && (
                      <div className='rounded-lg border border-blue-200 bg-blue-50 p-3'>
                        <p className='text-xs font-semibold uppercase text-blue-900'>
                          Notes
                        </p>
                        <p className='mt-1 text-sm text-blue-800'>
                          {cmdSet.notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Execution Results Section */}
      {scanData.executionStatus && scanData.executionResults && (
        <div
          className={`rounded-lg border-2 shadow-sm p-6 ${
            scanData.executionStatus === "SUCCESS"
              ? "border-green-300 bg-green-50"
              : scanData.executionStatus === "FAILURE"
                ? "border-red-300 bg-red-50"
                : "border-yellow-300 bg-yellow-50"
          }`}>
          <div className='mb-4 flex items-center justify-between'>
            <h3 className='flex items-center gap-2 text-xl font-bold'>
              {scanData.executionStatus === "SUCCESS" ? (
                <>
                  <CheckCircle className='h-6 w-6 text-green-600' />
                  <span className='text-green-900'>
                    ✓ Commands Executed Successfully
                  </span>
                </>
              ) : scanData.executionStatus === "FAILURE" ? (
                <>
                  <AlertCircle className='h-6 w-6 text-red-600' />
                  <span className='text-red-900'>✕ Execution Failed</span>
                </>
              ) : (
                <>
                  <AlertCircle className='h-6 w-6 text-yellow-600' />
                  <span className='text-yellow-900'>⚠ Partial Failure</span>
                </>
              )}
            </h3>
            <span className='rounded-lg bg-white px-3 py-1 text-sm font-semibold'>
              {scanData.executionResults.duration}s
            </span>
          </div>

          {/* Execution Message */}
          {scanData.executionMessage && (
            <p className='mb-4 text-sm font-medium'>
              {scanData.executionMessage}
            </p>
          )}

          {(scanData.executionStatus === "FAILURE" ||
            scanData.executionStatus === "PARTIAL_FAILURE") &&
            firstFailedCommand && (
              <div className='mb-4 rounded-lg border border-red-300 bg-red-50 p-4'>
                <p className='font-semibold text-red-900 mb-2'>
                  First failing command: #{firstFailedCommand.commandIndex}
                </p>
                <p className='font-mono text-xs text-red-700 mb-2 p-2 bg-white rounded border border-red-200'>
                  {firstFailedCommand.command}
                </p>
                {firstFailedCommand.errorLine && (
                  <p className='font-mono text-xs text-red-700 bg-white p-2 rounded border border-red-200 whitespace-pre-wrap'>
                    {firstFailedCommand.errorLine}
                  </p>
                )}
              </div>
            )}

          {/* Error Summary for Partial Failure */}
          {scanData.executionStatus === "PARTIAL_FAILURE" &&
            scanData.executionResults.errorCount && (
              <div className='mb-4 rounded-lg border border-yellow-400 bg-yellow-100 p-4'>
                <p className='font-semibold text-yellow-900 mb-2'>
                  ⚠ Error Summary: {scanData.executionResults.errorCount}{" "}
                  command(s) failed
                </p>
                {scanData.executionResults.stderrSummary && (
                  <p className='text-sm text-yellow-800 mb-2'>
                    {scanData.executionResults.stderrSummary}
                  </p>
                )}
              </div>
            )}

          {/* Failed Groups - Organizational view of what failed */}
          {scanData.executionStatus === "PARTIAL_FAILURE" &&
            scanData.executionResults.failedGroups &&
            scanData.executionResults.failedGroups.length > 0 && (
              <div className='mb-4'>
                <p className='mb-2 text-sm font-semibold uppercase tracking-wide text-yellow-900'>
                  Failed Security Issues (
                  {scanData.executionResults.failedGroups.length})
                </p>
                <div className='space-y-2'>
                  {scanData.executionResults.failedGroups.map(
                    (group, groupIdx) => (
                      <div
                        key={groupIdx}
                        className='rounded-lg border border-yellow-300 bg-white p-3'>
                        <div className='flex items-start justify-between'>
                          <div>
                            <p className='font-semibold text-yellow-900'>
                              {group.issue_name}
                            </p>
                            <p className='text-xs text-gray-600'>
                              ID: {group.issue_id}
                            </p>
                          </div>
                          <span className='text-xs font-semibold text-yellow-700 bg-yellow-100 rounded px-2 py-1'>
                            {group.failingCommands?.length || 0} commands
                          </span>
                        </div>
                        {group.failingCommands &&
                          group.failingCommands.length > 0 && (
                            <div className='mt-2 space-y-1 pt-2 border-t border-yellow-200'>
                              {group.failingCommands.map((cmd, cmdIdx) => (
                                <div
                                  key={cmdIdx}
                                  className='text-xs font-mono text-gray-700 pl-2'>
                                  • {cmd}
                                </div>
                              ))}
                            </div>
                          )}
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}

          {/* Failed Commands - Detailed error information */}
          {scanData.executionStatus === "PARTIAL_FAILURE" &&
            scanData.executionResults.failedCommands &&
            scanData.executionResults.failedCommands.length > 0 && (
              <div className='mb-4'>
                <p className='mb-2 text-sm font-semibold uppercase tracking-wide text-red-900'>
                  Failed Commands (
                  {scanData.executionResults.failedCommands.length})
                </p>
                <div className='space-y-2 max-h-64 overflow-y-auto'>
                  {scanData.executionResults.failedCommands.map(
                    (failedCmd, idx) => (
                      <div
                        key={idx}
                        className='rounded-lg border border-red-300 bg-red-50 p-3'>
                        <div className='flex items-start justify-between mb-2'>
                          <span className='text-xs font-semibold text-red-900'>
                            Command #{failedCmd.commandIndex}
                          </span>
                          <span className='text-xs text-red-700 bg-red-100 rounded px-2 py-0.5'>
                            Index: {failedCmd.commandIndex}
                          </span>
                        </div>
                        <p className='font-mono text-xs text-red-700 mb-2 p-2 bg-white rounded border border-red-200'>
                          {failedCmd.command}
                        </p>
                        <p className='text-xs text-red-600 mb-1 font-semibold'>
                          Error:
                        </p>
                        <p className='font-mono text-xs text-red-700 bg-white p-2 rounded border border-red-200 whitespace-pre-wrap'>
                          {failedCmd.errorLine}
                        </p>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}

          {/* Error Location Summary */}
          {scanData.executionStatus === "PARTIAL_FAILURE" &&
            scanData.executionResults.errorLocationSummary &&
            scanData.executionResults.errorLocationSummary.length > 0 && (
              <div className='mb-4'>
                <p className='mb-2 text-sm font-semibold uppercase tracking-wide'>
                  Error Location Details
                </p>
                <div className='rounded-lg bg-white border border-red-200 p-3 max-h-48 overflow-y-auto'>
                  {scanData.executionResults.errorLocationSummary.map(
                    (summary, idx) => (
                      <div
                        key={idx}
                        className='text-xs font-mono text-red-700 mb-1'>
                        {summary}
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}

          {/* Executed Commands - Show what was attempted */}
          {scanData.executionResults.executedCommands &&
            scanData.executionResults.executedCommands.length > 0 && (
              <div className='mb-4'>
                <p className='mb-2 text-sm font-semibold uppercase tracking-wide'>
                  Commands Executed (
                  {scanData.executionResults.executedCommands.length})
                </p>
                <div className='max-h-48 overflow-y-auto space-y-1 rounded-lg bg-white p-3 border border-gray-200'>
                  {scanData.executionResults.executedCommands.map(
                    (cmd, idx) => (
                      <div
                        key={idx}
                        className='font-mono text-xs text-gray-700'>
                        <span className='text-gray-500'>{idx + 1}.</span> {cmd}
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}

          {/* Execution Output */}
          {scanData.executionResults.output && (
            <div className='mb-4'>
              <p className='mb-2 text-sm font-semibold uppercase tracking-wide'>
                Command Output
              </p>
              <div className='max-h-48 overflow-y-auto rounded-lg bg-black p-3 font-mono text-xs text-green-400 whitespace-pre-wrap break-words border border-gray-300'>
                {scanData.executionResults.output}
              </div>
            </div>
          )}

          {/* Execution Error */}
          {scanData.executionResults.error && (
            <div className='rounded-lg border border-red-300 bg-red-100 p-3 mb-4'>
              <p className='mb-2 text-xs font-semibold uppercase text-red-900'>
                Error Output
              </p>
              <div className='max-h-32 overflow-y-auto font-mono text-xs text-red-700 whitespace-pre-wrap break-words'>
                {scanData.executionResults.error}
              </div>
            </div>
          )}

          {/* Failing Tokens Summary */}
          {scanData.executionResults.stderrFailingTokens &&
            scanData.executionResults.stderrFailingTokens.length > 0 && (
              <div className='mb-4'>
                <p className='mb-2 text-sm font-semibold uppercase tracking-wide'>
                  Failing Command Tokens
                </p>
                <div className='rounded-lg bg-gray-50 p-3 border border-gray-200'>
                  <div className='flex flex-wrap gap-2'>
                    {scanData.executionResults.stderrFailingTokens.map(
                      (token, idx) => (
                        <span
                          key={idx}
                          className='font-mono text-xs bg-red-100 text-red-900 px-2 py-1 rounded border border-red-300'>
                          {token}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              </div>
            )}

          {/* Execution Timestamp */}
          <div className='mt-4 flex justify-between text-xs text-gray-600'>
            <span>
              Started:{" "}
              {scanData.executionStartedAt
                ? new Date(scanData.executionStartedAt).toLocaleString()
                : "N/A"}
            </span>
            <span>
              Completed:{" "}
              {scanData.executionCompletedAt
                ? new Date(scanData.executionCompletedAt).toLocaleString()
                : "N/A"}
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons Section */}
      {!executionCompleted ? (
        <div className='fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white p-6 shadow-lg'>
          <div className='mx-auto max-w-7xl flex gap-3'>
            {/* Reject */}
            <button
              onClick={handleReject}
              disabled={approving}
              className='flex-1 rounded-lg border-2 border-red-300 bg-white px-6 py-3 font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'>
              ✕ Reject
            </button>

            {/* Approve All */}
            <button
              onClick={handleApproveAll}
              disabled={approving || !hasReport || !hasCliCommands}
              className='flex-1 rounded-lg bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'>
              {approving ? "Processing..." : "✓ Approve All"}
            </button>

            {/* Approve Selected (only shown if items selected) */}
            {hasCliCommands && selectedCommands.size > 0 && (
              <button
                onClick={handleApproveSelected}
                disabled={approving}
                className='flex-1 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'>
                {approving
                  ? "Processing..."
                  : `✓ Apply Selected (${selectedCommands.size})`}
              </button>
            )}
          </div>

          {!hasReport && (
            <p className='mt-3 text-center text-sm text-gray-500'>
              ⏳ Waiting for analysis report...
            </p>
          )}
          {hasReport && !hasCliCommands && (
            <p className='mt-3 text-center text-sm text-gray-500'>
              ⏳ Generating FortiWeb CLI fixes...
            </p>
          )}
        </div>
      ) : (
        /* Execution Complete - Show status message instead of action buttons */
        <div className='fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white p-6 shadow-lg'>
          <div className='mx-auto max-w-7xl text-center'>
            <div
              className={`rounded-lg p-4 ${
                scanData.executionStatus === "SUCCESS"
                  ? "bg-green-50 border border-green-300"
                  : scanData.executionStatus === "FAILURE"
                    ? "bg-red-50 border border-red-300"
                    : "bg-yellow-50 border border-yellow-300"
              }`}>
              <p className='font-semibold mb-2'>
                {scanData.executionStatus === "SUCCESS"
                  ? "✅ Execution Complete"
                  : scanData.executionStatus === "FAILURE"
                    ? "❌ Execution Failed"
                    : "⚠️ Execution Complete (Partial)"}
              </p>
              <p className='text-sm text-gray-700'>
                {scanData.executionMessage ||
                  "Commands have been executed on FortiWeb"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add spacing for fixed footer */}
      <div className='h-24'></div>
    </div>
  );
};

export default ScanResultsWithCLI;
