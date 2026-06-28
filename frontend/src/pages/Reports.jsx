import React, { useState, useEffect } from "react";
import MainLayout from "../layouts/MainLayout";
import { Card } from "../components/Card";
import { LoadingSpinner } from "../components/Loading";
import { API_BASE_URL } from "../config/api";
import "../styles/Reports.css";

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [sortConfig, setSortConfig] = useState({
    key: "generatedDate",
    direction: "desc",
  });

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        console.log("[Reports] Fetching reports from API...");
        const response = await fetch(`${API_BASE_URL}/api/reports/list/all`, {
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const result = await response.json();

        if (result.success && result.data) {
          console.log(
            `[Reports] Fetched ${result.data.length} reports from database`,
          );
          console.log("[Reports] Sample report data:", result.data[0]); // Log first report for debugging
          setReports(result.data);
          setError(null);
        } else {
          throw new Error(result.error || "Failed to fetch reports");
        }
      } catch (err) {
        console.error("[Reports] Error fetching reports:", err);
        setError(err.message);
        setReports([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction:
        sortConfig.key === key && sortConfig.direction === "asc"
          ? "desc"
          : "asc",
    });
  };

  const getSortedReports = () => {
    const sorted = [...reports].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      // Handle null/undefined values
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      // Convert dates for comparison
      if (
        sortConfig.key === "generatedDate" ||
        sortConfig.key === "createdAt"
      ) {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      // String comparison
      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (sortConfig.direction === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
    return sorted;
  };

  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return " ↕️";
    return sortConfig.direction === "asc" ? " ↑" : " ↓";
  };

  const handleGenerateReport = async (e) => {
    e.preventDefault();
    setGeneratingReport(true);
    const formData = new FormData(e.target);
    const scanId = formData.get("scanId");
    const reportType = formData.get("reportType");

    try {
      console.log(`[Reports] Generating report for scanId: ${scanId}`);
      // Note: Report generation happens automatically when scan completes
      // This is a placeholder for manual trigger if needed
      alert(
        "Reports are automatically generated when scans complete. Check your scan results!",
      );
      setShowGenerateModal(false);
    } catch (error) {
      console.error("Error generating report:", error);
      alert("Failed to generate report: " + error.message);
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleDownloadReport = async (reportId) => {
    try {
      console.log(`[Reports] Downloading report: ${reportId}`);
      const response = await fetch(
        `${API_BASE_URL}/api/reports/${reportId}/download`,
      );

      if (!response.ok) throw new Error("Failed to download report");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get("content-disposition");
      let filename = `security-report-${Date.now()}.pdf`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+?)"/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log("[Reports] Report downloaded successfully");
    } catch (error) {
      console.error("Error downloading report:", error);
      alert("Failed to download report: " + error.message);
    }
  };

  const handlePreviewReport = (report) => {
    setSelectedReport(report);
    setShowPreviewModal(true);
  };

  const handleDeleteReport = async (reportId) => {
    if (window.confirm("Are you sure you want to delete this report?")) {
      try {
        console.log(`[Reports] Deleting report: ${reportId}`);
        const response = await fetch(
          `${API_BASE_URL}/api/reports/${reportId}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        if (!response.ok) throw new Error("Failed to delete report");

        const result = await response.json();
        if (result.success) {
          console.log("[Reports] Report deleted successfully");
          setReports(reports.filter((r) => r.id !== reportId));
          alert("Report deleted successfully");
        } else {
          throw new Error(result.error || "Failed to delete report");
        }
      } catch (error) {
        console.error("Error deleting report:", error);
        alert("Failed to delete report: " + error.message);
      }
    }
  };

  const getFileIcon = (type) => {
    switch (type) {
      case "PDF":
        return "📕";
      case "HTML":
        return "🌐";
      case "JSON":
        return "{ }";
      default:
        return "📄";
    }
  };

  const getSafeSummary = (report) => {
    const summary = report.summary || {};
    return {
      critical: summary.critical || 0,
      high: summary.high || 0,
      medium: summary.medium || 0,
      low: summary.low || 0,
      informational: summary.informational || 0,
      total: summary.total || 0,
    };
  };

  return (
    <MainLayout title='Reports' subtitle='Security Audit Reports'>
      <div className='reports-container'>
        {/* Header with Generate Button */}
        <div className='reports-header'>
          <div className='header-info'>
            <h2>Security Reports</h2>
            <p className='subtitle'>
              View and manage all security scan reports
            </p>
          </div>
          {/* <button
            className='btn btn-primary'
            onClick={() => setShowGenerateModal(true)}>
            + Generate Report
          </button> */}
        </div>

        {/* Error Alert */}
        {error && (
          <div className='error-alert'>
            <strong>Note:</strong> {error}
          </div>
        )}

        {/* Reports Table */}
        {loading ? (
          <div className='loading-container'>
            <LoadingSpinner />
          </div>
        ) : reports && reports.length > 0 ? (
          <Card className='reports-table-card'>
            <div className='table-wrapper'>
              <table className='reports-table'>
                <thead>
                  <tr>
                    <th onClick={() => handleSort("name")} className='sortable'>
                      Report Name {getSortIndicator("name")}
                    </th>
                    <th onClick={() => handleSort("type")} className='sortable'>
                      Type {getSortIndicator("type")}
                    </th>
                    <th
                      onClick={() => handleSort("target")}
                      className='sortable'>
                      Target {getSortIndicator("target")}
                    </th>
                    <th
                      onClick={() => handleSort("generatedDate")}
                      className='sortable'>
                      Generated {getSortIndicator("generatedDate")}
                    </th>
                    <th
                      onClick={() => handleSort("vulnerabilitiesFound")}
                      className='sortable'>
                      Issues {getSortIndicator("vulnerabilitiesFound")}
                    </th>
                    <th>Severity Breakdown</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {getSortedReports().map((report) => (
                    <tr key={report.id} className='report-row'>
                      <td className='name-cell'>
                        <div className='report-name-info'>
                          <span className='report-type-icon'>
                            {report.type === "PDF"
                              ? "📕"
                              : report.type === "HTML"
                                ? "🌐"
                                : "{ }"}
                          </span>
                          <span>{report.name}</span>
                        </div>
                      </td>
                      <td className='type-cell'>
                        <span className='badge-type'>{report.type}</span>
                      </td>
                      <td className='target-cell'>
                        <a
                          href={report.target}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='target-link'>
                          {report.target}
                        </a>
                      </td>
                      <td className='date-cell'>{report.generatedDate}</td>
                      <td className='issues-cell'>
                        <span
                          className={`issues-badge ${report.vulnerabilitiesFound > 10 ? "high" : report.vulnerabilitiesFound > 5 ? "medium" : "low"}`}>
                          {report.vulnerabilitiesFound}
                        </span>
                      </td>
                      <td className='severity-cell'>
                        <div className='severity-breakdown'>
                          {report.summary && (
                            <>
                              <span
                                className='severity-item critical'
                                title={`Critical: ${report.summary.critical}`}>
                                🔴 {report.summary.critical}
                              </span>
                              <span
                                className='severity-item high'
                                title={`High: ${report.summary.high}`}>
                                🟠 {report.summary.high}
                              </span>
                              <span
                                className='severity-item medium'
                                title={`Medium: ${report.summary.medium}`}>
                                🟡 {report.summary.medium}
                              </span>
                              <span
                                className='severity-item low'
                                title={`Low: ${report.summary.low}`}>
                                🔵 {report.summary.low}
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className='actions-cell'>
                        <div className='action-buttons'>
                          <button
                            className='btn-icon'
                            onClick={() => handleDownloadReport(report.id)}
                            title='Download report'>
                            ⬇️
                          </button>
                          <button
                            className='btn-icon'
                            onClick={() => handlePreviewReport(report)}
                            title='Preview report'>
                            👁️
                          </button>
                          <button
                            className='btn-icon btn-danger'
                            onClick={() => handleDeleteReport(report.id)}
                            title='Delete report'>
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <Card className='empty-state'>
            <div className='empty-content'>
              <span className='empty-icon'>📄</span>
              <h3>No reports generated yet</h3>
              <p>
                Reports are automatically created when security scans complete.
                Start a new scan to generate your first report.
              </p>
            </div>
          </Card>
        )}

        {/* Report Statistics */}
        <div className='report-stats'>
          <Card className='stat-card'>
            <h3>📊 Total Reports</h3>
            <p className='stat-value'>{reports?.length || 0}</p>
          </Card>
          <Card className='stat-card'>
            <h3>⚠️ Total Issues Found</h3>
            <p className='stat-value'>
              {reports?.reduce(
                (sum, r) => sum + (r.vulnerabilitiesFound || 0),
                0,
              ) || 0}
            </p>
          </Card>
          <Card className='stat-card critical-card'>
            <h3>🔴 Critical Issues</h3>
            <p className='stat-value'>
              {reports?.reduce(
                (sum, r) => sum + (r.summary?.critical || 0),
                0,
              ) || 0}
            </p>
          </Card>
          <Card className='stat-card high-card'>
            <h3>🟠 High Severity</h3>
            <p className='stat-value'>
              {reports?.reduce((sum, r) => sum + (r.summary?.high || 0), 0) ||
                0}
            </p>
          </Card>
        </div>
      </div>

      {/* Generate Report Modal */}
      {showGenerateModal && (
        <div
          className='modal-overlay'
          onClick={() => setShowGenerateModal(false)}>
          <div className='modal-content' onClick={(e) => e.stopPropagation()}>
            <div className='modal-header'>
              <h2>Generate New Report</h2>
              <button
                className='modal-close'
                onClick={() => setShowGenerateModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleGenerateReport} className='generate-form'>
              <div className='modal-body'>
                <div
                  style={{
                    padding: "1.5rem",
                    backgroundColor: "#dbeafe",
                    borderRadius: "6px",
                    border: "1px solid #93c5fd",
                    marginBottom: "1.5rem",
                  }}>
                  <div
                    style={{
                      color: "#1e40af",
                      fontSize: "0.95rem",
                      lineHeight: "1.6",
                    }}>
                    <strong>ℹ️ Automatic Report Generation</strong>
                    <p style={{ margin: "0.5rem 0 0 0" }}>
                      Security reports are automatically generated when ZAP
                      scans complete. They appear in the Reports list
                      immediately. No manual generation needed!
                    </p>
                  </div>
                </div>

                <p
                  style={{
                    fontSize: "0.9rem",
                    color: "var(--color-text-secondary)",
                    marginBottom: "1.5rem",
                  }}>
                  If you need to access a specific report or export it in a
                  different format, you can download it from the Reports grid
                  above.
                </p>

                <div
                  style={{
                    padding: "1rem",
                    backgroundColor: "var(--color-bg-tertiary)",
                    borderRadius: "6px",
                  }}>
                  <h4 style={{ marginTop: 0 }}>Need a Report Urgently?</h4>
                  <p style={{ fontSize: "0.9rem", marginBottom: "1rem" }}>
                    Start a new security scan from the Scans page. Reports will
                    be generated automatically once the scan completes.
                  </p>
                </div>
              </div>

              <div className='modal-footer'>
                <button
                  type='button'
                  className='btn btn-secondary'
                  onClick={() => setShowGenerateModal(false)}>
                  Close
                </button>
                <button
                  type='submit'
                  className='btn btn-primary'
                  disabled={true}
                  title='Reports are generated automatically'>
                  Refresh Reports
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Preview Modal */}
      {showPreviewModal && selectedReport && (
        <div
          className='modal-overlay'
          onClick={() => setShowPreviewModal(false)}>
          <div
            className='modal-content report-preview-modal'
            onClick={(e) => e.stopPropagation()}>
            <div className='modal-header'>
              <h2>📋 Report Preview</h2>
              <button
                className='modal-close'
                onClick={() => setShowPreviewModal(false)}>
                ✕
              </button>
            </div>

            <div className='modal-body report-preview-body'>
              {/* Report Header */}
              <div className='preview-section'>
                <h3>Scan Information</h3>
                <div className='preview-grid'>
                  <div className='preview-item'>
                    <span className='preview-label'>Scan ID:</span>
                    <span className='preview-value'>
                      {selectedReport.scanId}
                    </span>
                  </div>
                  <div className='preview-item'>
                    <span className='preview-label'>Target:</span>
                    <span className='preview-value'>
                      {selectedReport.target}
                    </span>
                  </div>
                  <div className='preview-item'>
                    <span className='preview-label'>Date:</span>
                    <span className='preview-value'>
                      {selectedReport.generatedDate}
                    </span>
                  </div>
                  <div className='preview-item'>
                    <span className='preview-label'>Type:</span>
                    <span className='preview-value'>
                      {selectedReport.reportType || selectedReport.type}
                    </span>
                  </div>
                </div>
              </div>

              {/* Summary Statistics */}
              <div className='preview-section'>
                <h3>Vulnerability Summary</h3>
                <div className='preview-summary'>
                  {(() => {
                    const summary = getSafeSummary(selectedReport);
                    return (
                      <>
                        <div className='summary-stat critical'>
                          <span className='stat-icon'>🔴</span>
                          <span className='stat-count'>{summary.critical}</span>
                          <span className='stat-label'>Critical</span>
                        </div>
                        <div className='summary-stat high'>
                          <span className='stat-icon'>🟠</span>
                          <span className='stat-count'>{summary.high}</span>
                          <span className='stat-label'>High</span>
                        </div>
                        <div className='summary-stat medium'>
                          <span className='stat-icon'>🟡</span>
                          <span className='stat-count'>{summary.medium}</span>
                          <span className='stat-label'>Medium</span>
                        </div>
                        <div className='summary-stat low'>
                          <span className='stat-icon'>🔵</span>
                          <span className='stat-count'>{summary.low}</span>
                          <span className='stat-label'>Low</span>
                        </div>
                        <div className='summary-stat info'>
                          <span className='stat-icon'>ℹ️</span>
                          <span className='stat-count'>
                            {summary.informational}
                          </span>
                          <span className='stat-label'>Info</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Structured Data */}
              {selectedReport.structured &&
                Object.keys(selectedReport.structured).length > 0 && (
                  <div className='preview-section'>
                    <h3>Structured Data</h3>
                    <div className='preview-code'>
                      <pre>
                        {JSON.stringify(selectedReport.structured, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

              {/* Full Report Content */}
              {selectedReport.report && (
                <div className='preview-section'>
                  <h3>Full Report</h3>
                  <div className='preview-content'>{selectedReport.report}</div>
                </div>
              )}
            </div>

            <div className='modal-footer'>
              <button
                className='btn btn-secondary'
                onClick={() => setShowPreviewModal(false)}>
                Close
              </button>
              <button
                className='btn btn-primary'
                onClick={() => {
                  handleDownloadReport(selectedReport.id);
                  setShowPreviewModal(false);
                }}>
                ⬇️ Download Report
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default Reports;
