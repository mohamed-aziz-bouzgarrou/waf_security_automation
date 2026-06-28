import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import { Card } from "../components/Card";
import { StatusBadge } from "../components/Badges";
import { ProgressBar, LoadingSpinner } from "../components/Loading";
import ReportMarkdown from "../components/ReportMarkdown";
import ScanProgressModal from "../components/ScanProgressModal";
import { scanService } from "../services/mockService";
import { API_BASE_URL } from "../config/api";
import "../styles/Scans.css";

const Scans = () => {
  const [scans, setScans] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedScan, setSelectedScan] = useState(null);
  const [showNewScanModal, setShowNewScanModal] = useState(false);
  const [scanTarget, setScanTarget] = useState("");
  const [scanType, setScanType] = useState("full");
  const [useAjaxSpider, setUseAjaxSpider] = useState(false);
  const [scanPolicy, setScanPolicy] = useState("Default Policy");
  const [recurse, setRecurse] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [scanResult, setScanResult] = useState(null);
  const [pollingScan, setPollingScan] = useState(false);
  const [activeScanningScanId, setActiveScanningScanId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchScans = async () => {
      setLoading(true);
      try {
        const response = await scanService.getScans();
        if (response.success) {
          setScans(response.data);
        }
      } catch (error) {
        console.error("Error fetching scans:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchScans();
  }, []);

  const handleViewDetails = async (scan) => {
    try {
      // Fetch fresh scan data from the database using scanId or MongoDB _id
      const scanId = scan.scanId || scan._id || scan.id;
      console.log(`[Scans] Fetching fresh data for scan: ${scanId}`);

      const response = await fetch(`${API_BASE_URL}/api/scan/status/${scanId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch scan data");
      }

      const result = await response.json();
      if (result.success && result.data) {
        const freshScanData = {
          ...scan,
          ...result.data,
        };

        console.log("Fresh scan data retrieved:", {
          id: freshScanData.id,
          scanId: freshScanData.scanId,
          status: freshScanData.status,
          hasReport: !!freshScanData.report,
          reportLength: freshScanData.report?.length || 0,
          cliCommandsCount: freshScanData.cliCommands?.commands?.length || 0,
          structuredData: !!freshScanData.structured,
        });

        setSelectedScan(freshScanData);
      } else {
        console.warn("API returned no data, using cached scan data");
        setSelectedScan(scan);
      }
    } catch (error) {
      console.error("Error fetching fresh scan data:", error);
      // Fall back to cached data if API fetch fails
      setSelectedScan(scan);
    }
  };

  const handleCloseScanDetails = () => {
    setSelectedScan(null);
  };

  const handleExportReport = async () => {
    if (!selectedScan) {
      alert("No scan selected");
      return;
    }

    try {
      // Call backend report endpoint to generate and download HTML report
      const reportUrl = `${API_BASE_URL}/api/reports/html?title=SecurityReport-${selectedScan.id}&template=traditional-html`;

      const response = await fetch(reportUrl, {
        method: "GET",
        headers: {
          Accept: "text/html",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to download report");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `security-report-${selectedScan.id}-${new Date().getTime()}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      alert("Report downloaded successfully!");
    } catch (error) {
      alert("Error downloading report: " + error.message);
    }
  };

  const handleDeleteScan = async () => {
    if (!window.confirm("Are you sure you want to delete this scan?")) {
      return;
    }

    try {
      const response = await scanService.deleteScan(selectedScan.id);
      if (response.success) {
        setScans(scans.filter((s) => s.id !== selectedScan.id));
        setSelectedScan(null);
        alert("Scan deleted successfully");
      } else {
        alert("Failed to delete scan");
      }
    } catch (error) {
      alert("Error deleting scan: " + error.message);
    }
  };

  const handleStartScan = async (e) => {
    e.preventDefault();
    setScanError("");
    setScanResult(null);

    if (!scanTarget.trim()) {
      setScanError("Please enter a target URL");
      return;
    }

    // Validate URL format
    try {
      new URL(scanTarget);
    } catch {
      setScanError("Invalid URL format. Please enter a valid URL.");
      return;
    }

    setIsScanning(true);
    try {
      let response;

      // Call appropriate scan based on scanType
      switch (scanType) {
        case "active":
          response = await scanService.startActiveScan(scanTarget, scanPolicy);
          break;
        case "spider":
          response = await scanService.startSpiderScan(scanTarget, recurse);
          break;
        case "ajax":
          response = await scanService.startAjaxSpiderScan(scanTarget);
          break;
        case "passive":
          response = { success: true, data: { scan: { id: Date.now() } } };
          break;
        case "full":
        default:
          response = await scanService.startFullScan(
            scanTarget,
            useAjaxSpider,
            scanPolicy,
            recurse,
          );
      }

      if (response.success) {
        // Add the new scan to the list
        const newScan = response.data.scan || response.data.data?.scan;

        if (!newScan) {
          console.error("No scan data in response:", response);
          setScanError("Failed to extract scan ID from response");
          setIsScanning(false);
          return;
        }

        console.log(`[Scans] New scan created with ID: ${newScan.id}`);
        setScans([newScan, ...(scans || [])]);

        // Reset form
        setScanTarget("");
        setScanType("full");
        setUseAjaxSpider(false);
        setScanPolicy("Default Policy");
        setRecurse(true);
        setShowNewScanModal(false);

        setScanResult({
          id: newScan.id,
          target: scanTarget,
          status: "Running",
          startTime: new Date(),
          alerts: 0,
        });

        // Show progress modal and start polling
        setActiveScanningScanId(newScan.id);
        setPollingScan(true);
        setIsScanning(false);
        pollForScanResults(newScan.id, scanType);
      } else {
        const errorMsg = response.error || "Failed to start scan";
        console.error("Scan error:", errorMsg);
        setScanError(errorMsg);
        setIsScanning(false);
      }
    } catch (error) {
      console.error("Scan exception:", error);
      setScanError(
        error.message || "Failed to start scan. Please try again later.",
      );
      setIsScanning(false);
    }
  };

  // Poll for scan results
  const pollForScanResults = async (scanId, type) => {
    console.log(`[Polling] Starting poll for scan ${scanId}...`);
    const maxAttempts = 60;
    let attempts = 0;

    const pollInterval = setInterval(async () => {
      if (!pollingScan) {
        clearInterval(pollInterval);
        return;
      }

      try {
        const statusResponse = await fetch(
          `${API_BASE_URL}/api/scan/status-v2/${scanId}`,
        );
        const statusData = await statusResponse.json();

        if (statusData.success) {
          console.log(
            `[Polling] Status check #${attempts + 1}: ${statusData.data.status}`,
          );

          // Stop polling when we have the report - ScanProgressModal handles display
          if (
            statusData.data.report &&
            statusData.data.report.trim().length > 0
          ) {
            console.log(
              `[Polling] Got report/CLI data, stopping poll. ScanProgressModal will handle display`,
            );
            // Keep pollingScan = true so modal stays visible!
            // Only close when user manually closes the modal
            clearInterval(pollInterval);
            return;
          }
          attempts++;
          if (attempts >= maxAttempts) {
            console.warn("[Polling] Max polling attempts reached");
            clearInterval(pollInterval);
          }
        }
      } catch (err) {
        console.error(`[Polling] Fetch error:`, err.message);
        attempts++;
        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
        }
      }
    }, 2000);
  };

  if (loading) {
    return (
      <MainLayout title='Scans' subtitle='Vulnerability Scanning Management'>
        <LoadingSpinner />
      </MainLayout>
    );
  }

  return (
    <MainLayout title='Scans' subtitle='Vulnerability Scanning Management'>
      <div className='scans-container'>
        <div className='scans-header'>
          <button
            className='btn btn-primary'
            onClick={() => setShowNewScanModal(true)}>
            + New Scan
          </button>
          {/* <div className='filters'>
            <select className='filter-select'>
              <option>All Status</option>
              <option>Running</option>
              <option>Completed</option>
              <option>Failed</option>
            </select>
          </div> */}
        </div>

        {/* Scans Table */}
        <Card className='scans-table-card'>
          <table className='scans-table'>
            <thead>
              <tr>
                <th>Scan ID</th>
                <th>Target URL</th>
                <th>Status</th>
                <th>Start Date</th>
                <th>Duration</th>
                <th>Progress</th>
                <th>Alerts</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {scans && scans.length > 0 ? (
                scans.map((scan) => (
                  <tr key={scan.id}>
                    <td>
                      <code className='scan-id'>{scan.id}</code>
                    </td>
                    <td>
                      <a
                        href={scan.target}
                        target='_blank'
                        rel='noopener noreferrer'>
                        {scan.target}
                      </a>
                    </td>
                    <td>
                      <StatusBadge status={scan.status} size='small' />
                    </td>
                    <td>{new Date(scan.startTime).toLocaleDateString()}</td>
                    <td>{scan.duration}</td>
                    <td>
                      <ProgressBar
                        value={scan.progress}
                        max={100}
                        showLabel={true}
                      />
                    </td>
                    <td>
                      <span
                        className={`alert-count alert-count-${
                          scan.alertCount > 15 ? "high" : "medium"
                        }`}>
                        {scan.alertCount}
                      </span>
                    </td>
                    <td>
                      <button
                        className='btn btn-sm btn-secondary'
                        onClick={() => handleViewDetails(scan)}>
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan='8' className='no-data'>
                    No scans found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>

      {/* New Scan Modal */}
      {showNewScanModal && (
        <div
          className='modal-overlay'
          onClick={() => {
            setShowNewScanModal(false);
            setScanError("");
          }}>
          <div className='modal-content' onClick={(e) => e.stopPropagation()}>
            <div className='modal-header'>
              <h2>{scanResult ? "Scan Results" : "Start New Security Scan"}</h2>
              <button
                className='modal-close'
                onClick={() => {
                  setShowNewScanModal(false);
                  setScanError("");
                  setScanResult(null);
                }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleStartScan}>
              <div className='modal-body'>
                {!scanResult ? (
                  <>
                    {/* Target URL */}
                    <div className='form-group'>
                      <label htmlFor='scanTarget'>Target URL *</label>
                      <input
                        type='text'
                        id='scanTarget'
                        placeholder='Enter target URL (e.g., http://example.com)'
                        value={scanTarget}
                        onChange={(e) => {
                          setScanTarget(e.target.value);
                          setScanError("");
                        }}
                        disabled={isScanning}
                        className='form-input'
                      />
                      <small>
                        Enter the full URL starting with http:// or https://
                      </small>
                    </div>

                    {/* Scan Type */}
                    <div className='form-group'>
                      <label htmlFor='scanType'>Scan Type *</label>
                      <select
                        id='scanType'
                        value={scanType}
                        onChange={(e) => setScanType(e.target.value)}
                        disabled={isScanning}
                        className='form-input'>
                        <option value='full'>
                          Full Scan (Spider + Active)
                        </option>
                        <option value='active'>Active Scan Only</option>
                        <option value='spider'>Spider Only</option>
                        <option value='ajax'>AJAX Spider Only</option>
                        <option value='passive'>Passive Scan Only</option>
                      </select>
                      <small>Select the type of security scan to perform</small>
                    </div>

                    {/* Spider Configuration */}
                    {(scanType === "full" ||
                      scanType === "spider" ||
                      scanType === "ajax") && (
                      <>
                        <div className='form-divider'>
                          <strong>Spider Configuration</strong>
                        </div>

                        <div className='form-group checkbox'>
                          <input
                            type='checkbox'
                            id='recurse'
                            checked={recurse}
                            onChange={(e) => setRecurse(e.target.checked)}
                            disabled={isScanning}
                          />
                          <label htmlFor='recurse'>
                            Recurse (Follow all links)
                          </label>
                        </div>

                        {scanType === "full" && (
                          <div className='form-group checkbox'>
                            <input
                              type='checkbox'
                              id='useAjaxSpider'
                              checked={useAjaxSpider}
                              onChange={(e) =>
                                setUseAjaxSpider(e.target.checked)
                              }
                              disabled={isScanning}
                            />
                            <label htmlFor='useAjaxSpider'>
                              Use AJAX Spider (for JavaScript-heavy sites)
                            </label>
                          </div>
                        )}
                      </>
                    )}

                    {/* Active Scan Configuration */}
                    {(scanType === "full" || scanType === "active") && (
                      <>
                        <div className='form-divider'>
                          <strong>Active Scan Configuration</strong>
                        </div>

                        <div className='form-group'>
                          <label htmlFor='scanPolicy'>Scan Policy</label>
                          <select
                            id='scanPolicy'
                            value={scanPolicy}
                            onChange={(e) => setScanPolicy(e.target.value)}
                            disabled={isScanning}
                            className='form-input'>
                            <option value='Default Policy'>
                              Default Policy
                            </option>
                            <option value='Light'>Light</option>
                            <option value='Medium'>Medium</option>
                            <option value='Heavy'>Heavy</option>
                            <option value='Full'>Full</option>
                          </select>
                          <small>
                            Select the aggressiveness of the active scan
                          </small>
                        </div>
                      </>
                    )}

                    {/* Advanced Options */}
                    <button
                      type='button'
                      className='btn-advanced-toggle'
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--color-secondary)",
                        cursor: "pointer",
                        padding: "0.5rem 0",
                        fontSize: "0.9rem",
                        textDecoration: "underline",
                        marginTop: "1rem",
                      }}>
                      {showAdvanced ? "▼ Hide" : "▶ Show"} Advanced Options
                    </button>

                    {showAdvanced && (
                      <div
                        style={{
                          marginTop: "1rem",
                          padding: "1rem",
                          backgroundColor: "var(--color-bg-tertiary)",
                          borderRadius: "6px",
                          border: "1px solid var(--color-border)",
                        }}>
                        <div className='form-group checkbox'>
                          <input
                            type='checkbox'
                            id='followRedirects'
                            defaultChecked={true}
                            disabled={isScanning}
                          />
                          <label htmlFor='followRedirects'>
                            Follow Redirects
                          </label>
                        </div>

                        <div className='form-group checkbox'>
                          <input
                            type='checkbox'
                            id='followSubdomains'
                            defaultChecked={false}
                            disabled={isScanning}
                          />
                          <label htmlFor='followSubdomains'>
                            Include Subdomains
                          </label>
                        </div>

                        <div className='form-group checkbox'>
                          <input
                            type='checkbox'
                            id='performPassive'
                            defaultChecked={true}
                            disabled={isScanning}
                          />
                          <label htmlFor='performPassive'>
                            Perform Passive Scanning
                          </label>
                        </div>

                        <div className='form-group checkbox'>
                          <input
                            type='checkbox'
                            id='clearAlerts'
                            defaultChecked={false}
                            disabled={isScanning}
                          />
                          <label htmlFor='clearAlerts'>
                            Clear Previous Alerts
                          </label>
                        </div>
                      </div>
                    )}

                    {scanError && (
                      <div
                        className='error-message'
                        style={{ color: "#dc2626" }}>
                        {scanError}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Scan Results Section */}
                    <div style={{ textAlign: "center", padding: "2rem 0" }}>
                      <h3>🔍 Scan in Progress</h3>
                      <p
                        style={{
                          color: "var(--color-text-secondary)",
                          marginBottom: "1.5rem",
                        }}>
                        Target: <strong>{scanResult.target}</strong>
                      </p>

                      {/* Progress Bar */}
                      <ProgressBar
                        value={scanProgress}
                        max={100}
                        showLabel={true}
                      />

                      {/* Status Message */}
                      <p style={{ marginTop: "1rem", fontSize: "0.9rem" }}>
                        {scanResult.status === "Analyzing with AI..."
                          ? "⏳ AI is analyzing findings... this may take a few minutes"
                          : scanProgress < 100
                            ? `${scanResult.status || "Scanning"}... ${Math.round(scanProgress)}%`
                            : "✓ Results loaded with AI analysis!"}
                      </p>
                    </div>

                    {/* Results Summary (shown when complete) */}
                    {scanProgress === 100 && (
                      <div style={{ marginTop: "2rem" }}>
                        <h4 style={{ marginBottom: "1rem" }}>
                          📊 Results Summary
                        </h4>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fit, minmax(120px, 1fr))",
                            gap: "1rem",
                          }}>
                          <div
                            style={{
                              padding: "1rem",
                              backgroundColor: "var(--color-bg-tertiary)",
                              borderRadius: "6px",
                              border: "1px solid var(--color-border)",
                              textAlign: "center",
                            }}>
                            <div
                              style={{
                                fontSize: "1.5rem",
                                fontWeight: "bold",
                                color: "#dc2626",
                              }}>
                              {scanResult.highCount || 0}
                            </div>
                            <div
                              style={{
                                fontSize: "0.85rem",
                                color: "var(--color-text-secondary)",
                              }}>
                              High
                            </div>
                          </div>

                          <div
                            style={{
                              padding: "1rem",
                              backgroundColor: "var(--color-bg-tertiary)",
                              borderRadius: "6px",
                              border: "1px solid var(--color-border)",
                              textAlign: "center",
                            }}>
                            <div
                              style={{
                                fontSize: "1.5rem",
                                fontWeight: "bold",
                                color: "#f59e0b",
                              }}>
                              {scanResult.mediumCount || 0}
                            </div>
                            <div
                              style={{
                                fontSize: "0.85rem",
                                color: "var(--color-text-secondary)",
                              }}>
                              Medium
                            </div>
                          </div>

                          <div
                            style={{
                              padding: "1rem",
                              backgroundColor: "var(--color-bg-tertiary)",
                              borderRadius: "6px",
                              border: "1px solid var(--color-border)",
                              textAlign: "center",
                            }}>
                            <div
                              style={{
                                fontSize: "1.5rem",
                                fontWeight: "bold",
                                color: "#eab308",
                              }}>
                              {scanResult.lowCount || 0}
                            </div>
                            <div
                              style={{
                                fontSize: "0.85rem",
                                color: "var(--color-text-secondary)",
                              }}>
                              Low
                            </div>
                          </div>

                          <div
                            style={{
                              padding: "1rem",
                              backgroundColor: "var(--color-bg-tertiary)",
                              borderRadius: "6px",
                              border: "1px solid var(--color-border)",
                              textAlign: "center",
                            }}>
                            <div
                              style={{
                                fontSize: "1.5rem",
                                fontWeight: "bold",
                              }}>
                              {(scanResult.highCount || 0) +
                                (scanResult.mediumCount || 0) +
                                (scanResult.lowCount || 0)}
                            </div>
                            <div
                              style={{
                                fontSize: "0.85rem",
                                color: "var(--color-text-secondary)",
                              }}>
                              Total
                            </div>
                          </div>
                        </div>

                        {/* Report Section */}
                        {scanResult.report && (
                          <div style={{ marginTop: "2rem" }}>
                            <h4 style={{ marginBottom: "1rem" }}>
                              📄 AI Analysis Report
                            </h4>
                            <div
                              style={{
                                backgroundColor: "var(--color-bg-tertiary)",
                                borderRadius: "6px",
                                border: "1px solid var(--color-border)",
                                padding: "1rem",
                                maxHeight: "350px",
                                overflowY: "auto",
                              }}>
                              <ReportMarkdown content={scanResult.report} />
                            </div>
                          </div>
                        )}

                        {/* Issues Summary */}
                        {scanResult.alerts && scanResult.alerts.length > 0 && (
                          <div style={{ marginTop: "2rem" }}>
                            <h4 style={{ marginBottom: "1rem" }}>
                              🔍 Top Issues
                            </h4>
                            <div
                              style={{
                                backgroundColor: "var(--color-bg-tertiary)",
                                borderRadius: "6px",
                                border: "1px solid var(--color-border)",
                                padding: "1rem",
                                maxHeight: "300px",
                                overflowY: "auto",
                              }}>
                              {scanResult.alerts
                                .slice(0, 5)
                                .map((issue, idx) => (
                                  <div
                                    key={idx}
                                    style={{
                                      padding: "0.75rem",
                                      borderBottom:
                                        idx < 4
                                          ? "1px solid var(--color-border)"
                                          : "none",
                                    }}>
                                    <div
                                      style={{
                                        fontWeight: "bold",
                                        marginBottom: "0.25rem",
                                      }}>
                                      {issue.name ||
                                        issue.title ||
                                        "Unknown Issue"}
                                    </div>
                                    <div
                                      style={{
                                        fontSize: "0.85rem",
                                        color: "var(--color-text-secondary)",
                                      }}>
                                      Severity:{" "}
                                      <strong>
                                        {issue.severity ||
                                          issue.risk ||
                                          "Unknown"}
                                      </strong>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {scanError && (
                      <div
                        className='error-message'
                        style={{ color: "#dc2626", marginTop: "1rem" }}>
                        {scanError}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className='modal-footer'>
                {!scanResult ? (
                  <>
                    <button
                      type='button'
                      className='btn btn-secondary'
                      onClick={() => {
                        setShowNewScanModal(false);
                        setScanError("");
                      }}
                      disabled={isScanning}>
                      Cancel
                    </button>
                    <button
                      type='submit'
                      className='btn btn-primary'
                      disabled={isScanning}>
                      {isScanning
                        ? "Scanning... This may take a while"
                        : "Start Scan"}
                    </button>
                  </>
                ) : (
                  <>
                    {scanProgress === 100 && (
                      <>
                        <button
                          type='button'
                          className='btn btn-secondary'
                          onClick={() => {
                            setShowNewScanModal(false);
                            setScanResult(null);
                            setScanProgress(0);
                            setScanError("");
                          }}>
                          New Scan
                        </button>
                        <button
                          type='button'
                          className='btn btn-primary'
                          onClick={() => {
                            handleViewDetails(scanResult);
                            setShowNewScanModal(false);
                            setScanResult(null);
                            setScanProgress(0);
                          }}>
                          View Full Report
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Scan Details Modal */}
      {selectedScan && (
        <div className='modal-overlay' onClick={handleCloseScanDetails}>
          <div className='modal-content' onClick={(e) => e.stopPropagation()}>
            <div className='modal-header'>
              <h2>Scan Details</h2>
              <button className='modal-close' onClick={handleCloseScanDetails}>
                ✕
              </button>
            </div>

            <div className='modal-body'>
              <div className='detail-section'>
                <h3>Scan Information</h3>
                <div className='detail-grid'>
                  <div className='detail-item'>
                    <label>Scan ID</label>
                    <code>{selectedScan.id}</code>
                  </div>
                  <div className='detail-item'>
                    <label>Target</label>
                    <a
                      href={selectedScan.target}
                      target='_blank'
                      rel='noopener noreferrer'>
                      {selectedScan.target}
                    </a>
                  </div>
                  <div className='detail-item'>
                    <label>Status</label>
                    <StatusBadge status={selectedScan.status} />
                  </div>
                  <div className='detail-item'>
                    <label>Progress</label>
                    <ProgressBar value={selectedScan.progress} max={100} />
                  </div>
                  <div className='detail-item'>
                    <label>Start Time</label>
                    <span>
                      {new Date(selectedScan.startTime).toLocaleString()}
                    </span>
                  </div>
                  <div className='detail-item'>
                    <label>Duration</label>
                    <span>{selectedScan.duration}</span>
                  </div>
                </div>
              </div>

              <div className='detail-section'>
                <h3>Scan Technical Details</h3>
                <div className='detail-grid'>
                  <div className='detail-item'>
                    <label>Scan ID</label>
                    <code>
                      {selectedScan.scanDetails?.spiderId || selectedScan.id}
                    </code>
                  </div>
                  <div className='detail-item'>
                    <label>Active Scan ID</label>
                    <code>
                      {selectedScan.scanDetails?.activeScanId || "N/A"}
                    </code>
                  </div>
                  <div className='detail-item'>
                    <label>URLs Found by Spider</label>
                    <span>
                      {selectedScan.scanDetails?.spiderUrlsFound || 0}
                    </span>
                  </div>
                  <div className='detail-item'>
                    <label>AJAX Spider Used</label>
                    <span>
                      {selectedScan.scanDetails?.useAjaxSpider ? "Yes" : "No"}
                    </span>
                  </div>
                  <div className='detail-item'>
                    <label>Total Duration (ms)</label>
                    <span>
                      {selectedScan.scanSummary?.durationMs ||
                        selectedScan.durationMs ||
                        "N/A"}
                    </span>
                  </div>
                  <div className='detail-item'>
                    <label>End Time</label>
                    <span>
                      {selectedScan.scanSummary?.endTime
                        ? new Date(
                            selectedScan.scanSummary.endTime,
                          ).toLocaleString()
                        : new Date(selectedScan.endTime).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {selectedScan.report && (
                <div className='detail-section'>
                  <h3>📄 AI Analysis Report</h3>
                  <div className='report-content'>
                    <div
                      style={{
                        backgroundColor: "var(--color-bg-tertiary)",
                        borderRadius: "6px",
                        border: "1px solid var(--color-border)",
                        padding: "1rem",
                        maxHeight: "500px",
                        overflowY: "auto",
                      }}>
                      <ReportMarkdown content={selectedScan.report} />
                    </div>
                  </div>
                </div>
              )}

              {/* Structured Analysis Data from Database */}
              {selectedScan.structured && selectedScan.structured.issues && (
                <div className='detail-section'>
                  <h3>📊 Analysis Summary</h3>
                  <div className='detail-grid'>
                    <div className='detail-item'>
                      <label>Total Issues</label>
                      <span style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
                        {selectedScan.structured.summary?.total || 0}
                      </span>
                    </div>
                    <div className='detail-item'>
                      <label>Critical</label>
                      <span style={{ color: "#dc2626", fontWeight: "bold" }}>
                        {selectedScan.structured.summary?.critical || 0}
                      </span>
                    </div>
                    <div className='detail-item'>
                      <label>High</label>
                      <span style={{ color: "#f59e0b", fontWeight: "bold" }}>
                        {selectedScan.structured.summary?.high || 0}
                      </span>
                    </div>
                    <div className='detail-item'>
                      <label>Medium</label>
                      <span style={{ color: "#eab308", fontWeight: "bold" }}>
                        {selectedScan.structured.summary?.medium || 0}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* CLI Commands Section */}
              {selectedScan.cliCommands &&
                selectedScan.cliCommands.commands &&
                selectedScan.cliCommands.commands.length > 0 && (
                  <div className='detail-section'>
                    <h3>
                      ⚙️ FortiWeb CLI Commands (
                      {selectedScan.cliCommands.commands.length} sets)
                    </h3>
                    {selectedScan.cliCommands.summary && (
                      <p
                        style={{
                          marginBottom: "1rem",
                          color: "var(--color-text-secondary)",
                        }}>
                        {selectedScan.cliCommands.summary}
                      </p>
                    )}
                    <div
                      className='cli-commands-list'
                      style={{ marginBottom: "1rem" }}>
                      {selectedScan.cliCommands.commands.map((cmdSet, idx) => (
                        <div
                          key={idx}
                          style={{
                            marginBottom: "1rem",
                            padding: "1rem",
                            backgroundColor: "var(--color-bg-tertiary)",
                            borderRadius: "6px",
                            border: "1px solid var(--color-border)",
                          }}>
                          <div
                            style={{
                              marginBottom: "0.5rem",
                              display: "flex",
                              gap: "0.5rem",
                              alignItems: "center",
                            }}>
                            <span
                              style={{
                                padding: "0.25rem 0.5rem",
                                borderRadius: "3px",
                                fontSize: "0.85rem",
                                fontWeight: "bold",
                                backgroundColor:
                                  cmdSet.severity === "CRITICAL"
                                    ? "#dc2626"
                                    : cmdSet.severity === "HIGH"
                                      ? "#f59e0b"
                                      : cmdSet.severity === "MEDIUM"
                                        ? "#eab308"
                                        : "#3b82f6",
                                color: "white",
                              }}>
                              {cmdSet.severity}
                            </span>
                            <strong>{cmdSet.issue_name}</strong>
                          </div>
                          <p
                            style={{
                              fontSize: "0.9rem",
                              color: "var(--color-text-secondary)",
                              marginBottom: "0.5rem",
                            }}>
                            {cmdSet.description}
                          </p>
                          <div style={{ marginTop: "0.5rem" }}>
                            <strong style={{ fontSize: "0.85rem" }}>
                              Commands:
                            </strong>
                            <div
                              style={{
                                marginTop: "0.25rem",
                                fontFamily: "monospace",
                                fontSize: "0.85rem",
                              }}>
                              {cmdSet.commands.map((cmd, cmdIdx) => (
                                <div
                                  key={cmdIdx}
                                  style={{
                                    padding: "0.25rem 0",
                                    color: "#059669",
                                    whiteSpace: "pre-wrap",
                                  }}>
                                  <code>{cmd}</code>
                                </div>
                              ))}
                            </div>
                          </div>
                          {cmdSet.notes && (
                            <p
                              style={{
                                fontSize: "0.85rem",
                                marginTop: "0.5rem",
                                color: "var(--color-text-secondary)",
                              }}>
                              📝 {cmdSet.notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                    {selectedScan.cliCommands.warnings &&
                      selectedScan.cliCommands.warnings.length > 0 && (
                        <div
                          style={{
                            padding: "1rem",
                            backgroundColor: "#fef3c7",
                            borderRadius: "6px",
                            border: "1px solid #fde68a",
                          }}>
                          <h4
                            style={{
                              marginBottom: "0.5rem",
                              color: "#92400e",
                            }}>
                            ⚠️ Warnings
                          </h4>
                          <ul
                            style={{ marginLeft: "1.5rem", color: "#92400e" }}>
                            {selectedScan.cliCommands.warnings.map(
                              (warning, idx) => (
                                <li key={idx}>{warning}</li>
                              ),
                            )}
                          </ul>
                        </div>
                      )}
                  </div>
                )}

              {selectedScan.alerts && selectedScan.alerts.length > 0 && (
                <div className='detail-section'>
                  <h3>Vulnerabilities Found ({selectedScan.alerts.length})</h3>
                  <div className='vulnerabilities-list'>
                    {selectedScan.alerts.map((alert, idx) => (
                      <div key={alert.id || idx} className='vuln-item'>
                        <div className='vuln-header'>
                          <strong>
                            {alert.name || alert.alert || "Unknown Issue"}
                          </strong>
                          <span
                            className={`risk-label risk-${(
                              alert.severity || alert.risk
                            )
                              ?.toLowerCase()
                              .replace("critical", "high")}`}>
                            {alert.severity || alert.risk || "Unknown"}
                          </span>
                        </div>
                        {alert.affected && alert.affected.length > 0 && (
                          <p className='vuln-url'>
                            Affected URLs:{" "}
                            {alert.affected.slice(0, 2).join(", ")}
                            {alert.affected.length > 2 ? "..." : ""}
                          </p>
                        )}
                        {alert.url && (
                          <p className='vuln-url'>URL: {alert.url}</p>
                        )}
                        {alert.parameter && (
                          <p className='vuln-param'>
                            Parameter: {alert.parameter}
                          </p>
                        )}
                        <p className='vuln-description'>
                          {alert.description ||
                            alert.risk ||
                            "No description available"}
                        </p>
                        {alert.fix && (
                          <div
                            style={{
                              marginTop: "0.5rem",
                              fontSize: "0.85rem",
                              color: "var(--color-text-secondary)",
                            }}>
                            <strong>Recommended Fix:</strong>{" "}
                            {alert.fix.action ||
                              alert.solution ||
                              "See report for details"}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className='risk-breakdown'>
                <h4>Risk Summary</h4>
                <div className='risk-items'>
                  <div className='risk-chip risk-high'>
                    🔴 High:{" "}
                    {selectedScan.highCount !== undefined
                      ? selectedScan.highCount
                      : selectedScan.alerts?.filter(
                          (a) =>
                            (a.severity || a.risk)?.toUpperCase() === "HIGH" ||
                            (a.severity || a.risk)?.toUpperCase() ===
                              "CRITICAL",
                        ).length ||
                        selectedScan.summary?.high ||
                        0}
                  </div>
                  <div className='risk-chip risk-medium'>
                    🟠 Medium:{" "}
                    {selectedScan.mediumCount !== undefined
                      ? selectedScan.mediumCount
                      : selectedScan.alerts?.filter(
                          (a) =>
                            (a.severity || a.risk)?.toUpperCase() === "MEDIUM",
                        ).length ||
                        selectedScan.summary?.medium ||
                        0}
                  </div>
                  <div className='risk-chip risk-low'>
                    🟡 Low:{" "}
                    {selectedScan.lowCount !== undefined
                      ? selectedScan.lowCount
                      : selectedScan.alerts?.filter(
                          (a) =>
                            (a.severity || a.risk)?.toUpperCase() === "LOW",
                        ).length ||
                        selectedScan.summary?.low ||
                        0}
                  </div>
                </div>
              </div>
            </div>

            <div className='modal-footer'>
              <button
                className='btn btn-secondary'
                onClick={handleCloseScanDetails}>
                Close
              </button>
              <button className='btn btn-primary' onClick={handleExportReport}>
                Export Report
              </button>
              <button className='btn btn-danger' onClick={handleDeleteScan}>
                Delete Scan
              </button>
              {selectedScan.cliCommands &&
                selectedScan.cliCommands.commands &&
                selectedScan.cliCommands.commands.length > 0 && (
                  <a
                    href='/approval'
                    className='btn btn-success'
                    style={{
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}>
                    ✅ Go to Approval
                  </a>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Real-time Scan Progress Modal */}
      {activeScanningScanId && pollingScan && (
        <ScanProgressModal
          scanId={activeScanningScanId}
          apiBaseUrl={API_BASE_URL}
          isOpen={true}
          mode='view'
          onClose={() => {
            setActiveScanningScanId(null);
            setPollingScan(false);
          }}
          onApprove={async (scanId) => {
            try {
              const response = await scanService.approveScan(scanId);
              if (response.success) {
                alert("Scan approved successfully!");
                setActiveScanningScanId(null);
                setPollingScan(false);
                // Refresh scans list
                const result = await scanService.getScans();
                if (result.success) {
                  setScans(result.data);
                }
              } else {
                alert("Failed to approve scan: " + response.error);
              }
            } catch (error) {
              console.error("Error approving scan:", error);
              alert("Error approving scan: " + error.message);
            }
          }}
          onReject={async (scanId, reason) => {
            try {
              const response = await scanService.rejectScan(scanId, reason);
              if (response.success) {
                alert("Scan rejected successfully!");
                setActiveScanningScanId(null);
                setPollingScan(false);
                // Refresh scans list
                const result = await scanService.getScans();
                if (result.success) {
                  setScans(result.data);
                }
              } else {
                alert("Failed to reject scan: " + response.error);
              }
            } catch (error) {
              console.error("Error rejecting scan:", error);
              alert("Error rejecting scan: " + error.message);
            }
          }}
        />
      )}
    </MainLayout>
  );
};

export default Scans;
