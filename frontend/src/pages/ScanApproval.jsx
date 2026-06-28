import React, { useState, useEffect } from "react";
import MainLayout from "../layouts/MainLayout";
import { Card } from "../components/Card";
import { StatusBadge } from "../components/Badges";
import { LoadingSpinner } from "../components/Loading";
import ScanProgressModal from "../components/ScanProgressModal";
import { n8nScanService } from "../services/n8nScanService";
import "../styles/ScanApproval.css";

const ScanApproval = () => {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedScan, setSelectedScan] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [sendingCommandSet, setSendingCommandSet] = useState(null);
  const [commandSendError, setCommandSendError] = useState({});

  useEffect(() => {
    fetchScans();
    // Poll for new scans every 5 seconds
    const interval = setInterval(fetchScans, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchScans = async () => {
    try {
      const response = await n8nScanService.getAllScans();
      if (response.success) {
        setScans(response.data || []);
        setError("");
      } else {
        setError(response.error);
        setScans([]);
      }
    } catch (err) {
      console.error("Error fetching scans:", err);
      setError("Failed to fetch scans");
    } finally {
      setLoading(false);
    }
  };

  const handleViewScan = (scan) => {
    setSelectedScan(scan);
    setShowModal(true);
  };

  const handleCloseScan = () => {
    setShowModal(false);
    setTimeout(() => setSelectedScan(null), 300);
  };

  const handleApproveScan = async (scanId, indices) => {
    setApproving(true);
    setError("");

    try {
      const response = indices
        ? await n8nScanService.approveScanPartial(scanId, indices)
        : await n8nScanService.approveScanWithSSH(scanId, null);

      if (response.success) {
        setSuccessMessage(`Scan approved successfully! Commands will be executed via SSH.`);
        // Use the actual status from backend response instead of hardcoding
        const actualStatus = response.data?.status || "APPLYING_FIXES";
        setScans((prevScans) =>
          prevScans.map((s) =>
            s._id === scanId || s.scanId === scanId ? { ...s, status: actualStatus } : s,
          ),
        );

        setTimeout(() => {
          setSelectedScan(null);
          setShowModal(false);
          setSuccessMessage("");
          fetchScans();
        }, 2000);
      } else {
        setError(response.error || "Failed to approve scan");
      }
    } catch (err) {
      console.error("Error approving scan:", err);
      setError("Error approving scan: " + err.message);
    } finally {
      setApproving(false);
    }
  };

  const handleRejectScan = async (scanId, reason) => {
    setRejecting(true);
    setError("");

    try {
      const response = await n8nScanService.rejectScan(scanId, reason);

      if (response.success) {
        setSuccessMessage("Scan rejected successfully.");
        setScans((prevScans) =>
          prevScans.map((s) =>
            s._id === scanId || s.scanId === scanId ? { ...s, status: "REJECTED" } : s,
          ),
        );

        setTimeout(() => {
          setSelectedScan(null);
          setShowModal(false);
          setSuccessMessage("");
          fetchScans();
        }, 2000);
      } else {
        setError(response.error || "Failed to reject scan");
      }
    } catch (err) {
      console.error("Error rejecting scan:", err);
      setError("Error rejecting scan: " + err.message);
    } finally {
      setRejecting(false);
    }
  };

  const handleSendCommandSetToN8n = async (scanId, cmdSetIndex, cmdSet) => {
    const commandKey = `${scanId}-${cmdSetIndex}`;
    setSendingCommandSet(commandKey);
    setCommandSendError((prev) => ({ ...prev, [commandKey]: "" }));

    try {
      const response = await n8nScanService.sendCommandSetToN8n(scanId, cmdSetIndex, cmdSet);

      if (response.success) {
        setSuccessMessage(`Command set "${cmdSet.issue_name}" sent to n8n workflow successfully!`);
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        setCommandSendError((prev) => ({
          ...prev,
          [commandKey]: response.error || "Failed to send command set",
        }));
      }
    } catch (err) {
      console.error("Error sending command set to n8n:", err);
      setCommandSendError((prev) => ({ ...prev, [commandKey]: err.message }));
    } finally {
      setSendingCommandSet(null);
    }
  };

  const pendingScans = scans.filter(
    (s) =>
      s.status === "READY_FOR_APPROVAL" ||
      s.status === "REPORT_RECEIVED" ||
      s.status === "CLI_RECEIVED" ||
      s.status === "report_ready" ||
      s.status === "cli_ready",
  );
  const approvedScans = scans.filter(
    (s) =>
      s.status === "APPROVED" ||
      s.status === "approved" ||
      s.status === "APPLIED",
  );
  const rejectedScans = scans.filter((s) => s.status === "REJECTED" || s.status === "rejected");

  const getStatusBadge = (scan) => {
    const status = scan?.status;
    const executionStatus = scan?.executionStatus;
    if (
      status === "READY_FOR_APPROVAL" ||
      status === "REPORT_RECEIVED" ||
      status === "CLI_RECEIVED" ||
      status === "report_ready" ||
      status === "cli_ready"
    ) {
      return { color: "#fbbf24", bgColor: "#fef3c7", text: "⏳ Pending" };
    } else if (status === "APPLYING_FIXES") {
      return { color: "#3b82f6", bgColor: "#dbeafe", text: "⚙️ Applying" };
    } else if (status === "APPROVED" || status === "approved") {
      return { color: "#10b981", bgColor: "#d1fae5", text: "✅ Approved" };
    } else if (status === "APPLIED") {
      if (executionStatus === "PARTIAL_FAILURE") {
        return { color: "#ea580c", bgColor: "#ffedd5", text: "⚠️ Partial" };
      }
      return { color: "#059669", bgColor: "#d1fae5", text: "✅ Applied" };
    } else if (status === "FAILED") {
      return { color: "#ef4444", bgColor: "#fee2e2", text: "❌ Failed" };
    } else if (status === "REJECTED" || status === "rejected") {
      return { color: "#ef4444", bgColor: "#fee2e2", text: "❌ Rejected" };
    }
    return { color: "#6b7280", bgColor: "#f3f4f6", text: "⚪ Unknown" };
  };

  if (loading) {
    return (
      <MainLayout title="Scan Approval" subtitle="Review and approve OWASP ZAP scan results">
        <LoadingSpinner />
      </MainLayout>
    );
  }

  return (
    <MainLayout
      title="Scan Approval"
      subtitle="Review and approve OWASP ZAP scan results organized by scan">
      <div className="scan-approval-container">
        {error && <div className="alert alert-danger">{error}</div>}
        {successMessage && <div className="alert alert-success">{successMessage}</div>}

        {/* Stats Cards */}
        <div className="approval-stats">
          <Card className="stat-card">
            <h3>{pendingScans.length}</h3>
            <p>Pending Approval</p>
          </Card>
          <Card className="stat-card">
            <h3>{approvedScans.length}</h3>
            <p>Approved</p>
          </Card>
          <Card className="stat-card">
            <h3>{rejectedScans.length}</h3>
            <p>Rejected</p>
          </Card>
        </div>

        {/* All Scans Organized by Scan */}
        {scans.length > 0 ? (
          <Card className="scans-section">
            <h2>All Scans ({scans.length})</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.5rem" }}>
              {scans.map((scan) => {
                const statusBadge = getStatusBadge(scan);
                const isPending = pendingScans.some((s) => s._id === scan._id);
                return (
                  <div
                    key={scan._id}
                    style={{
                      padding: "1.5rem",
                      border: `2px solid ${statusBadge.color}`,
                      borderRadius: "8px",
                      backgroundColor: statusBadge.bgColor,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                    onClick={() => handleViewScan(scan)}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                      <div>
                        <h3 style={{ margin: "0 0 0.5rem 0", color: statusBadge.color }}>
                          {scan.target || "Unknown Target"}
                        </h3>
                        <div style={{ fontSize: "0.9rem", color: "#666", marginBottom: "0.75rem" }}>
                          <div>
                            <strong>Scan ID:</strong> {scan.scanId}
                          </div>
                          <div>
                            <strong>Created:</strong> {new Date(scan.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "1rem", fontSize: "0.9rem", marginTop: "0.75rem" }}>
                          <span>🔴 {scan.structured?.summary?.critical || 0}</span>
                          <span>🟠 {scan.structured?.summary?.high || 0}</span>
                          <span>🟡 {scan.structured?.summary?.medium || 0}</span>
                          <span>🔵 {scan.structured?.summary?.low || 0}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span
                          style={{
                            padding: "0.5rem 1rem",
                            backgroundColor: statusBadge.color,
                            color: "white",
                            borderRadius: "4px",
                            fontWeight: "bold",
                            display: "inline-block",
                          }}
                        >
                          {statusBadge.text}
                        </span>
                        <div style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: "#666" }}>
                          Click to view details
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ) : (
          <Card className="empty-state">
            <div className="empty-content">
              <span style={{ fontSize: "3rem" }}>📋</span>
              <h3>No scans available</h3>
              <p>Start a new security scan to see it here for approval.</p>
            </div>
          </Card>
        )}

        {/* Progress Modal */}
        {selectedScan && (
          <ScanProgressModal
            scanId={selectedScan._id || selectedScan.scanId}
            apiBaseUrl={import.meta.env.VITE_API_URL || "http://localhost:3000"}
            isOpen={showModal}
            mode="approve"
            onClose={handleCloseScan}
            onApprove={handleApproveScan}
            onReject={handleRejectScan}
          />
        )}
      </div>
    </MainLayout>
  );
};

export default ScanApproval;
