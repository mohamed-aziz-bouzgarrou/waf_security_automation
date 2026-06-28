import React, { useState, useEffect } from "react";
import MainLayout from "../layouts/MainLayout";
import { StatusBadge } from "../components/Badges";
import { CommandDetailsModal } from "../components/CommandDetailsModal";
import { LoadingSpinner } from "../components/Loading";
import { API_BASE_URL } from "../config/api";
import "../styles/History.css";

// Helper function to map backend scan status to display status
const mapScanStatus = (status) => {
  const statusMap = {
    SCAN_STARTED: "in-progress",
    ZAP_COMPLETED: "in-progress",
    AI_ANALYZING: "in-progress",
    REPORT_RECEIVED: "in-progress",
    AI_GENERATING_CLI: "in-progress",
    CLI_RECEIVED: "in-progress",
    READY_FOR_APPROVAL: "in-progress",
    APPROVED: "completed",
    REJECTED: "failed",
    APPLYING_FIXES: "in-progress",
    APPLIED: "completed",
    FAILED: "failed",
  };
  return statusMap[status] || "completed";
};

// Transform backend scan data to command history format
const transformScansToCommands = (scans) => {
  return scans
    .map((scan, index) => {
      const timestamp =
        scan.executionCompletedAt ||
        scan.executionResults?.timestamp ||
        scan.reportReceivedAt ||
        scan.createdAt;
      const approvedAt = scan.approvedAt || scan.executionStartedAt || scan.createdAt;
      const date = new Date(timestamp).toLocaleDateString();
      const startTime = new Date(scan.createdAt);
      const endTime = new Date(timestamp);
      const durationSeconds = Math.floor((endTime - startTime) / 1000);

      const executedCmds = scan.executedCommandsList || [];
      const successfulCmds =
        (Array.isArray(scan.executionResults?.successfulCommands) &&
          scan.executionResults.successfulCommands) ||
        (scan.executionStatus === "SUCCESS"
          ? executedCmds
          : scan.executionStatus === "PARTIAL_FAILURE"
            ? (() => {
                const firstFailedIdx =
                  scan.executionResults?.firstFailedCommand?.commandIndex ??
                  scan.executionResults?.failedCommands?.[0]?.commandIndex;
                return typeof firstFailedIdx === "number" && firstFailedIdx >= 0
                  ? executedCmds.slice(0, firstFailedIdx)
                  : [];
              })()
            : []);

      const commandSets = scan.cliCommands?.commands || [];

      // Generate result summary
      let resultsSummary = "Scan completed";
      if (scan.structured && scan.structured.summary) {
        resultsSummary = scan.structured.summary;
      } else if (scan.status === "FAILED") {
        resultsSummary = scan.executionErrors?.[0] || "Scan failed";
      }

      return {
        id: index + 1,
        scanId: scan.scanId || scan._id,
        command: "scan",
        target: scan.target,
        status: mapScanStatus(scan.status),
        originalStatus: scan.status,
        executionStatus: scan.executionStatus || null,
        executionMessage: scan.executionMessage || null,
        timestamp: new Date(timestamp).toISOString(),
        approvedAt: approvedAt ? new Date(approvedAt).toISOString() : null,
        date,
        duration: durationSeconds,
        resultsSummary,
        commandSets, // Generated command sets with issue info
        executedCommands: successfulCmds,
        executedCommandsCount: successfulCmds.length,
        logs: scan.executionErrors?.join("\n") || "",
        additionalInfo: scan.statusMessage || "",
      };
    })
    .filter((cmd) => {
      // Must have CLI command sets
      if (!cmd.commandSets || cmd.commandSets.length === 0) {
        return false;
      }

      if (!cmd.executedCommands || cmd.executedCommands.length === 0) {
        return false;
      }

      return cmd.originalStatus === "APPLIED";
    });
};

// Mock data fallback
const getMockData = () => {
  return [
    {
      id: 1,
      scanId: "scan_001",
      command: "scan",
      target: "https://example.com",
      status: "completed",
      executionStatus: "SUCCESS",
      executionMessage: "✅ All commands executed successfully",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      approvedAt: new Date(Date.now() - 3600000).toISOString(),
      date: new Date(Date.now() - 3600000).toLocaleDateString(),
      duration: 1200,
      resultsSummary: "Found 5 vulnerabilities",
      executedCommands: [
        "curl -X POST http://fortiweb:8080/api/auth -d 'username=admin&password=admin'",
        "curl -X POST http://fortiweb:8080/api/waf/rules -d '{\"name\":\"SQL-Injection\",\"action\":\"block\"}'",
        "curl -X POST http://fortiweb:8080/api/waf/rules -d '{\"name\":\"XSS-Protection\",\"action\":\"block\"}'",
      ],
      executedCommandsCount: 3,
      commandSets: [
        {
          issue_id: "1",
          issue_name: "SQL Injection",
          severity: "CRITICAL",
          description: "SQL injection vulnerability detected in login form",
          commands: [
            "curl -s http://localhost:8080/api/fix -d 'issue=sql_injection'",
          ],
          notes: "Apply input validation and parameterized queries",
        },
        {
          issue_id: "2",
          issue_name: "XSS Vulnerability",
          severity: "HIGH",
          description: "Cross-site scripting vulnerability in user comments",
          commands: [
            "curl -s http://localhost:8080/api/fix -d 'issue=xss'",
          ],
          notes: "Implement output encoding",
        },
      ],
    },
  ];
};

const History = () => {
  const [commands, setCommands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCommand, setSelectedCommand] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const fetchCommandHistory = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/scans`, {
          headers: {
            "x-api-key": localStorage.getItem("apiKey") || "test-key",
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log("[History] Fetched scans from API:", data.data);
          const transformedCommands = transformScansToCommands(data.data || []);
          console.log("[History] Transformed commands:", transformedCommands);
          setCommands(transformedCommands);
        } else {
          console.error("Failed to fetch scans, status:", response.status);
          setCommands(getMockData());
        }
      } catch (error) {
        console.error("Error fetching command history:", error);
        setCommands(getMockData());
      } finally {
        setLoading(false);
      }
    };

    fetchCommandHistory();
  }, []);

  const handleViewDetails = (command) => {
    setSelectedCommand(command);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setTimeout(() => setSelectedCommand(null), 200);
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

  return (
    <MainLayout>
      <div className='history-page'>
        <div className='page-header'>
          <h1>Command History</h1>
          <p>View all executed commands and their results</p>
        </div>

        {loading ? (
          <div className='loading-container'>
            <LoadingSpinner />
            <p>Loading command history...</p>
          </div>
        ) : commands.length > 0 ? (
          <div className='history-table-container'>
            <table className='history-table'>
              <thead>
                <tr>
                  <th>Approved On</th>
                  <th>Target</th>
                  <th>Executed</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {commands.map((cmd) => (
                  <tr key={cmd.id} className='history-row'>
                    <td className='date-cell'>
                      {cmd.approvedAt ? formatTimestamp(cmd.approvedAt) : "N/A"}
                    </td>
                    <td className='target-cell'>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                        <span className='target-text'>{cmd.target}</span>
                        <code style={{ opacity: 0.85 }}>{cmd.scanId}</code>
                      </div>
                    </td>
                    <td className='duration-cell'>
                      {cmd.executedCommandsCount}
                    </td>
                    <td className='actions-cell'>
                      <button
                        className='details-btn'
                        onClick={() => handleViewDetails(cmd)}
                        title='View command details'
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className='empty-state'>
            <div className='empty-content'>
              <span className='empty-icon'>📜</span>
              <h3>No commands found</h3>
              <p>No commands match your search criteria.</p>
            </div>
          </div>
        )}

        <CommandDetailsModal
          command={selectedCommand}
          isOpen={showModal}
          onClose={handleCloseModal}
        />
      </div>
    </MainLayout>
  );
};

export default History;
