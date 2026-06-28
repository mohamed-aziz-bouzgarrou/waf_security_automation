import React, { useState, useEffect } from "react";
import MainLayout from "../layouts/MainLayout";
import { Card } from "../components/Card";
import { RiskBadge, ConfidenceBadge } from "../components/Badges";
import { LoadingSpinner } from "../components/Loading";
import { vulnerabilityService } from "../services/mockService";
import "../styles/Vulnerabilities.css";

const Vulnerabilities = () => {
  const [vulnerabilities, setVulnerabilities] = useState(null);
  const [filteredVulnerabilities, setFilteredVulnerabilities] = useState(null);
  const [loading, setLoading] = useState(true);
  const [riskFilter, setRiskFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVuln, setSelectedVuln] = useState(null);

  useEffect(() => {
    const fetchVulnerabilities = async () => {
      setLoading(true);
      try {
        const response = await vulnerabilityService.getVulnerabilities();
        if (response.success) {
          setVulnerabilities(response.data);
          setFilteredVulnerabilities(response.data);
        }
      } catch (error) {
        console.error("Error fetching vulnerabilities:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVulnerabilities();
  }, []);

  // Apply filters
  useEffect(() => {
    if (!vulnerabilities) return;

    let filtered = [...vulnerabilities];

    // Apply risk filter
    if (riskFilter !== "All") {
      filtered = filtered.filter((v) => v.risk === riskFilter);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (v) =>
          v.name.toLowerCase().includes(query) ||
          v.description.toLowerCase().includes(query) ||
          v.cweId?.toString().includes(query),
      );
    }

    setFilteredVulnerabilities(filtered);
  }, [riskFilter, searchQuery, vulnerabilities]);

  if (loading) {
    return (
      <MainLayout title='Vulnerabilities' subtitle='Detected Security Issues'>
        <LoadingSpinner />
      </MainLayout>
    );
  }

  const getRiskColor = (risk) => {
    switch (risk?.toLowerCase()) {
      case "high":
        return "#dc2626";
      case "medium":
        return "#ea580c";
      case "low":
        return "#eab308";
      default:
        return "#3b82f6";
    }
  };

  return (
    <MainLayout title='Vulnerabilities' subtitle='Detected Security Issues'>
      <div className='vulnerabilities-container'>
        {/* Filters and Search */}
        <Card className='filters-card'>
          <div className='filters-content'>
            <div className='search-box'>
              <input
                type='text'
                placeholder='🔍 Search vulnerabilities by name, CWE ID...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='search-input'
              />
            </div>

            <div className='filter-group'>
              <label>Severity Filter:</label>
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className='filter-select'>
                <option>All</option>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>

            <div className='filter-stats'>
              <span>
                Showing <strong>{filteredVulnerabilities?.length || 0}</strong>{" "}
                of <strong>{vulnerabilities?.length || 0}</strong>{" "}
                vulnerabilities
              </span>
            </div>
          </div>
        </Card>

        {/* Vulnerabilities Table */}
        <Card className='vulnerabilities-table-card'>
          <table className='vulnerabilities-table'>
            <thead>
              <tr>
                <th>Vulnerability Name</th>
                <th>Risk Level</th>
                <th>Confidence</th>
                <th>Occurrences</th>
                <th>CVSS Score</th>
                <th>CWE ID</th>
                <th>Affected URLs</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVulnerabilities && filteredVulnerabilities.length > 0 ? (
                filteredVulnerabilities.map((vuln) => (
                  <tr key={vuln.id}>
                    <td>
                      <strong>{vuln.name}</strong>
                    </td>
                    <td>
                      <RiskBadge risk={vuln.risk} size='small' />
                    </td>
                    <td>
                      <ConfidenceBadge
                        confidence={vuln.confidence}
                        size='small'
                      />
                    </td>
                    <td>
                      <span className='count-badge'>{vuln.count}</span>
                    </td>
                    <td>
                      <span
                        className='cvss-score'
                        style={{ color: getRiskColor(vuln.risk) }}>
                        {vuln.cvssScore}
                      </span>
                    </td>
                    <td>
                      <code>CWE-{vuln.cweId}</code>
                    </td>
                    <td>
                      <span className='url-count'>{vuln.urls.length} URLs</span>
                    </td>
                    <td>
                      <button
                        className='btn btn-sm btn-secondary'
                        onClick={() => setSelectedVuln(vuln)}>
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan='8' className='no-data'>
                    {searchQuery || riskFilter !== "All"
                      ? "No vulnerabilities match your filters"
                      : "No vulnerabilities found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        {/* Risk Distribution Summary */}
        <div className='risk-distribution'>
          <Card>
            <h3>Vulnerability Distribution</h3>
            <div className='distribution-items'>
              {vulnerabilities && (
                <>
                  <div className='distribution-item'>
                    <div
                      className='distribution-bar'
                      style={{ backgroundColor: "#dc2626" }}>
                      <span className='distribution-value'>
                        {
                          vulnerabilities.filter((v) => v.risk === "High")
                            .length
                        }
                      </span>
                    </div>
                    <label>High</label>
                  </div>
                  <div className='distribution-item'>
                    <div
                      className='distribution-bar'
                      style={{ backgroundColor: "#ea580c" }}>
                      <span className='distribution-value'>
                        {
                          vulnerabilities.filter((v) => v.risk === "Medium")
                            .length
                        }
                      </span>
                    </div>
                    <label>Medium</label>
                  </div>
                  <div className='distribution-item'>
                    <div
                      className='distribution-bar'
                      style={{ backgroundColor: "#eab308" }}>
                      <span className='distribution-value'>
                        {vulnerabilities.filter((v) => v.risk === "Low").length}
                      </span>
                    </div>
                    <label>Low</label>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Vulnerability Details Modal */}
      {selectedVuln && (
        <div className='modal-overlay' onClick={() => setSelectedVuln(null)}>
          <div className='modal-content' onClick={(e) => e.stopPropagation()}>
            <div className='modal-header'>
              <h2>{selectedVuln.name}</h2>
              <button
                className='modal-close'
                onClick={() => setSelectedVuln(null)}>
                ✕
              </button>
            </div>

            <div className='modal-body'>
              <div className='detail-badges'>
                <RiskBadge risk={selectedVuln.risk} />
                <ConfidenceBadge confidence={selectedVuln.confidence} />
              </div>

              <div className='detail-grid'>
                <div className='detail-item'>
                  <label>Risk Level</label>
                  <p>{selectedVuln.risk}</p>
                </div>
                <div className='detail-item'>
                  <label>Confidence</label>
                  <p>{selectedVuln.confidence}</p>
                </div>
                <div className='detail-item'>
                  <label>CVSS Score</label>
                  <p>{selectedVuln.cvssScore}</p>
                </div>
                <div className='detail-item'>
                  <label>CWE ID</label>
                  <p>CWE-{selectedVuln.cweId}</p>
                </div>
                <div className='detail-item'>
                  <label>WASC ID</label>
                  <p>WASC-{selectedVuln.wascId}</p>
                </div>
                <div className='detail-item'>
                  <label>Occurrences</label>
                  <p>{selectedVuln.count}</p>
                </div>
              </div>

              <div className='description-section'>
                <h4>Description</h4>
                <p>{selectedVuln.description}</p>
              </div>

              <div className='urls-section'>
                <h4>Affected URLs ({selectedVuln.urls.length})</h4>
                <div className='urls-list'>
                  {selectedVuln.urls.map((url, idx) => (
                    <div key={idx} className='url-item'>
                      <a href={url} target='_blank' rel='noopener noreferrer'>
                        {url}
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              <div className='parameters-section'>
                <h4>Parameters</h4>
                <div className='params-list'>
                  {selectedVuln.parameters.map((param, idx) => (
                    <code key={idx} className='param-item'>
                      {param}
                    </code>
                  ))}
                </div>
              </div>
            </div>

            <div className='modal-footer'>
              <button
                className='btn btn-secondary'
                onClick={() => setSelectedVuln(null)}>
                Close
              </button>
              <button className='btn btn-primary'>Generate Report</button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default Vulnerabilities;
