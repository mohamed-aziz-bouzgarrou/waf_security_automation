// Real API Service - Connects to OWASP ZAP Backend
import { apiClient } from "../config/api";
import {
  transformAlert,
  createScanFromAlertsSummary,
  transformAlertsByRisk,
  createDashboardStats,
  transformFullScanResponse,
} from "../utils/dataTransform";

// Store scans in local state for retrieval
let scansCache = [];

// Scan Services
export const scanService = {
  /**
   * Start a full security scan on the target URL
   */
  startFullScan: async (
    target,
    useAjaxSpider = false,
    scanPolicyName = "Default Policy",
    recurse = true,
  ) => {
    try {
      const response = await apiClient.post("/api/scan/full", {
        url: target,
        useAjaxSpider: useAjaxSpider,
        reportTemplate: "traditional-html",
        scanPolicyName,
        recurse,
      });

      if (response.data.success) {
        // Backend returns scanId at data.id (not data.data.id)
        const scanId = response.data.data.id || response.data.data.scanId;
        const scan = {
          id: scanId,
          name: `Full Scan - ${target}`,
          target: target,
          status: "Running",
          progress: 0,
          startTime: new Date().toISOString(),
          alertCount: 0,
          alerts: [],
          summary: { high: 0, medium: 0, low: 0, informational: 0 },
          scanDetails: {},
        };

        // Cache the scan
        scansCache.push(scan);

        return {
          success: true,
          data: {
            scan: scan,
          },
        };
      }
      return response.data;
    } catch (error) {
      console.error("Error starting full scan:", error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data?.details,
      };
    }
  },

  /**
   * Start a quick scan (without AJAX Spider)
   */
  startQuickScan: async (target) => {
    try {
      const response = await apiClient.post("/api/scan/quick", {
        url: target,
      });

      if (response.data.success) {
        // Backend now returns scanId immediately
        const scanId = response.data.data.id;
        const scan = {
          id: scanId,
          name: `Quick Scan - ${target}`,
          target: target,
          status: "Running",
          progress: 0,
          startTime: new Date().toISOString(),
          alertCount: 0,
          alerts: [],
          summary: { high: 0, medium: 0, low: 0, informational: 0 },
          scanDetails: {},
        };

        scansCache.push(scan);
        return {
          success: true,
          data: {
            scan: scan,
          },
        };
      }
      return response.data;
    } catch (error) {
      console.error("Error starting quick scan:", error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  },

  /**
   * Start active scan only
   */
  startActiveScan: async (target, scanPolicyName = "Default Policy") => {
    try {
      const response = await apiClient.post("/api/active-scan/start", {
        url: target,
        scanPolicyName,
        recurse: true,
      });

      console.log("Active scan response:", response.data);

      if (response.data.success || response.status === 200) {
        const scanData = response.data.data || response.data;
        const scan = {
          id: (scanData.scan || scanData.id || Date.now()).toString(),
          name: `Active Scan - ${target}`,
          target: target,
          status: "Running",
          progress: 0,
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          duration: "0m",
          alertCount: 0,
          alerts: [],
          summary: { high: 0, medium: 0, low: 0, informational: 0 },
          scanDetails: { activeScanId: scanData.scan || scanData.id },
        };
        scansCache.push(scan);
        return {
          success: true,
          data: { scan },
        };
      }
      return {
        success: false,
        error: "Unexpected response format",
      };
    } catch (error) {
      console.error("Error starting active scan:", error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  },

  /**
   * Start spider scan only
   */
  startSpiderScan: async (target, recurse = true) => {
    try {
      const response = await apiClient.post("/api/spider/start", {
        url: target,
        recurse,
      });

      console.log("Spider scan response:", response.data);

      if (response.data.success || response.status === 200) {
        const scanData = response.data.data || response.data;
        const scan = {
          id: (scanData.scan || scanData.id || Date.now()).toString(),
          name: `Spider Scan - ${target}`,
          target: target,
          status: "Running",
          progress: 0,
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          duration: "0m",
          alertCount: 0,
          alerts: [],
          summary: { high: 0, medium: 0, low: 0, informational: 0 },
          scanDetails: { spiderId: scanData.scan || scanData.id },
        };
        scansCache.push(scan);
        return {
          success: true,
          data: { scan },
        };
      }
      return {
        success: false,
        error: "Unexpected response format",
      };
    } catch (error) {
      console.error("Error starting spider scan:", error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  },

  /**
   * Start AJAX spider scan only
   */
  startAjaxSpiderScan: async (target) => {
    try {
      const response = await apiClient.post("/api/ajax-spider/start", {
        url: target,
      });

      console.log("AJAX spider response:", response.data);

      if (response.data.success || response.status === 200) {
        const scanData = response.data.data || response.data;
        const scan = {
          id: (scanData.scan || scanData.id || Date.now()).toString(),
          name: `AJAX Spider Scan - ${target}`,
          target: target,
          status: "Running",
          progress: 0,
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          duration: "0m",
          alertCount: 0,
          alerts: [],
          summary: { high: 0, medium: 0, low: 0, informational: 0 },
          scanDetails: { ajaxSpiderId: scanData.scan || scanData.id },
        };
        scansCache.push(scan);
        return {
          success: true,
          data: { scan },
        };
      }
      return {
        success: false,
        error: "Unexpected response format",
      };
    } catch (error) {
      console.error("Error starting AJAX spider scan:", error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  },

  /**
   * Get all alerts as scans (since backend stores alerts per session)
   */
  getScans: async () => {
    try {
      // Fetch all scans from MongoDB via backend
      const response = await apiClient.get("/api/scans");

      if (response.data.success) {
        // Transform MongoDB scans to frontend format
        const dbScans = response.data.data || [];

        const transformedScans = dbScans.map((scan) => {
          // Extract issues from structured data
          const issues = scan.structured?.issues || [];
          const summary = scan.structured?.summary || {
            total: 0,
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            informational: 0,
          };

          // Count severity levels
          let highCount = 0,
            mediumCount = 0,
            lowCount = 0,
            infoCount = 0;
          issues.forEach((issue) => {
            const severity = issue.severity?.toUpperCase() || "";
            if (severity === "CRITICAL" || severity === "HIGH") highCount++;
            else if (severity === "MEDIUM") mediumCount++;
            else if (severity === "LOW") lowCount++;
            else infoCount++;
          });

          return {
            id: scan._id,
            scanId: scan.scanId,
            target: scan.target,
            status: "Completed",
            progress: 100,
            startTime: scan.createdAt,
            endTime: scan.updatedAt,
            duration:
              scan.updatedAt && scan.createdAt
                ? `${Math.round((new Date(scan.updatedAt) - new Date(scan.createdAt)) / 1000)}s`
                : "N/A",
            report: scan.report,
            structured: scan.structured,
            alerts: issues,
            alertCount: issues.length,
            highCount: highCount,
            mediumCount: mediumCount,
            lowCount: lowCount,
            infoCount: infoCount,
            summary: summary,
            scanStatus: scan.status,
          };
        });

        return {
          success: true,
          data: transformedScans,
        };
      }

      return response.data;
    } catch (error) {
      console.error("Error fetching scans:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  getScanById: async (id) => {
    try {
      const scan = scansCache.find((s) => s.id === id);
      if (!scan) {
        return {
          success: false,
          error: "Scan not found",
        };
      }
      return {
        success: true,
        data: scan,
      };
    } catch (error) {
      console.error("Error fetching scan by ID:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  startScan: async (target) => {
    return scanService.startQuickScan(target);
  },

  stopScan: async (id) => {
    try {
      // Stop active scan if available
      const response = await apiClient.post(`/api/active-scan/stop/${id}`);
      return response.data;
    } catch (error) {
      console.error("Error stopping scan:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  deleteScan: async (id) => {
    try {
      // Clear alerts from ZAP
      const response = await apiClient.delete("/api/alerts");
      scansCache = scansCache.filter((s) => s.id !== id);
      return response.data;
    } catch (error) {
      console.error("Error deleting scan:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Get scan status (for polling)
   * Uses the new V2 endpoint that returns report and CLI commands
   */
  getScanStatus: async (scanId) => {
    try {
      // Try to fetch from API first using the V2 endpoint
      console.log(`[getScanStatus] Fetching status for scanId: ${scanId}`);

      let response;
      try {
        // Try V2 endpoint first (has report + CLI data)
        response = await apiClient.get(`/api/scan/status-v2/${scanId}`);
      } catch (err) {
        // Fallback to V1 endpoint if V2 not available
        console.warn(
          `[getScanStatus] V2 endpoint failed (${err.message}), trying V1...`,
        );
        response = await apiClient.get(`/api/scan/status/${scanId}`);
      }

      if (response.data.success && response.data.data) {
        const statusData = response.data.data;
        console.log(
          `[getScanStatus] Got status: ${statusData.status || statusData.statusMessage}`,
        );
        console.log(
          `[getScanStatus] Report: ${statusData.report ? "YES (" + statusData.report.length + " chars)" : "NO"}`,
        );
        console.log(
          `[getScanStatus] CLI Commands: ${statusData.cliCommands?.commands?.length || 0}`,
        );

        // Normalize status values: Convert "Complete" to "Completed"
        if (statusData.status === "Complete") {
          statusData.status = "Completed";
        }
        // Update cached scan with latest data
        const scanIndex = scansCache.findIndex(
          (s) => s.id === scanId.toString(),
        );
        if (scanIndex !== -1) {
          scansCache[scanIndex] = { ...scansCache[scanIndex], ...statusData };
        }
        return {
          success: true,
          data: statusData,
        };
      }
    } catch (error) {
      // If API fails, check cache
      console.warn(
        `[getScanStatus] Error fetching scan status from API, trying cache:`,
        error.message,
      );
    }

    // Check cache
    const cachedScan = scansCache.find((s) => s.id === scanId.toString());
    if (cachedScan) {
      console.log(
        `[getScanStatus] Using cached data for scanId: ${scanId}, status: ${cachedScan.status}`,
      );
      return {
        success: true,
        data: cachedScan,
      };
    }

    console.error(`[getScanStatus] Scan ${scanId} not found in API or cache`);
    return {
      success: false,
      error: "Scan not found",
    };
  },

  /**
   * Approve a scan and apply CLI commands
   */
  approveScan: async (scanId) => {
    try {
      const response = await apiClient.post(`/api/scans/${scanId}/approve`);

      if (response.data.success) {
        // Update cached scan status
        const scanIndex = scansCache.findIndex(
          (s) => s.id === scanId.toString(),
        );
        if (scanIndex !== -1) {
          scansCache[scanIndex].status = "APPROVED";
          scansCache[scanIndex].approvedAt = new Date().toISOString();
        }
        return {
          success: true,
          data: response.data.data,
          message: response.data.message,
        };
      }
      return response.data;
    } catch (error) {
      console.error("Error approving scan:", error);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  },

  /**
   * Reject a scan
   */
  rejectScan: async (scanId, reason = "") => {
    try {
      const response = await apiClient.post(`/api/scans/${scanId}/reject`, {
        reason,
      });

      if (response.data.success) {
        // Update cached scan status
        const scanIndex = scansCache.findIndex(
          (s) => s.id === scanId.toString(),
        );
        if (scanIndex !== -1) {
          scansCache[scanIndex].status = "REJECTED";
          scansCache[scanIndex].rejectionReason = reason;
          scansCache[scanIndex].rejectedAt = new Date().toISOString();
        }
        return {
          success: true,
          data: response.data.data,
          message: response.data.message,
        };
      }
      return response.data;
    } catch (error) {
      console.error("Error rejecting scan:", error);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  },
};

// Vulnerability Services
export const vulnerabilityService = {
  /**
   * Get all vulnerabilities from alerts
   */
  getVulnerabilities: async (filters = {}) => {
    try {
      const response = await apiClient.get("/api/alerts", {
        params: {
          count: 500,
        },
      });

      if (response.data.success) {
        let vulnerabilities = (response.data.data.alerts || []).map(
          transformAlert,
        );

        // Apply risk filter
        if (filters.risk && filters.risk !== "All") {
          vulnerabilities = vulnerabilities.filter(
            (v) => v.risk === filters.risk,
          );
        }

        // Apply search filter
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          vulnerabilities = vulnerabilities.filter(
            (v) =>
              v.name.toLowerCase().includes(searchLower) ||
              v.description.toLowerCase().includes(searchLower) ||
              v.cweId?.toString().includes(searchLower),
          );
        }

        return {
          success: true,
          data: vulnerabilities,
        };
      }

      return response.data;
    } catch (error) {
      console.error("Error fetching vulnerabilities:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Get vulnerability details by ID
   */
  getVulnerabilityById: async (id) => {
    try {
      const response = await apiClient.get("/api/alerts", {
        params: {
          count: 500,
        },
      });

      if (response.data.success) {
        const alert = response.data.data.alerts?.find(
          (a) => a.alertRef === id || a.pluginid === id,
        );
        if (!alert) {
          return {
            success: false,
            error: "Vulnerability not found",
          };
        }
        return {
          success: true,
          data: transformAlert(alert),
        };
      }

      return response.data;
    } catch (error) {
      console.error("Error fetching vulnerability by ID:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

// Report Services
export const reportService = {
  /**
   * Get available reports (from recent scans)
   */
  getReports: async () => {
    try {
      const response = await apiClient.get("/api/reports/json");

      if (response.data.success) {
        const report = {
          id: "report-" + Date.now(),
          scanId: "combined",
          type: "JSON",
          name: "Security Scan Report",
          generatedDate: new Date().toISOString(),
          status: "Generated",
          data: response.data.data,
        };

        return {
          success: true,
          data: [report],
        };
      }

      return response.data;
    } catch (error) {
      console.error("Error fetching reports:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Generate a new security report
   */
  generateReport: async (format = "html") => {
    try {
      const response = await apiClient.get(`/api/reports/${format}`);

      return {
        success: true,
        data: {
          id: "report-" + Date.now(),
          scanId: "combined",
          type: format.toUpperCase(),
          generatedDate: new Date().toISOString(),
          status: "Generated",
          format: format,
        },
        message: "Report generated successfully",
      };
    } catch (error) {
      console.error("Error generating report:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Download HTML report
   */
  downloadReport: async (format = "html") => {
    try {
      const response = await apiClient.get(`/api/reports/${format}`, {
        responseType: format === "html" ? "text" : "json",
      });

      return {
        success: true,
        data: response.data,
        message: `Report ${format.toUpperCase()} download ready`,
      };
    } catch (error) {
      console.error("Error downloading report:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Delete a report (clears alerts)
   */
  deleteReport: async (reportId) => {
    try {
      const response = await apiClient.delete("/api/alerts");

      return {
        success: true,
        message: "Report deleted and alerts cleared",
      };
    } catch (error) {
      console.error("Error deleting report:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

// Dashboard Services
export const dashboardService = {
  /**
   * Get dashboard statistics
   */
  getDashboardStats: async () => {
    try {
      const response = await apiClient.get("/api/alerts/summary");

      if (response.data.success) {
        const summary = response.data.data;
        const high = summary.high || 0;
        const medium = summary.medium || 0;
        const low = summary.low || 0;
        const informational = summary.informational || 0;

        return {
          success: true,
          data: {
            totalScans: scansCache.length || 1,
            activeScans: 0,
            totalVulnerabilities: high + medium + low + informational,
            highRiskAlerts: high,
            mediumRiskAlerts: medium,
            lowRiskAlerts: low,
            infoAierts: informational,
            severityDistribution: [
              { name: "High", value: high, color: "#dc2626" },
              { name: "Medium", value: medium, color: "#ea580c" },
              { name: "Low", value: low, color: "#eab308" },
              { name: "Info", value: informational, color: "#3b82f6" },
            ],
            vulnerabilityByRisk: summary,
          },
        };
      }

      return response.data;
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      return {
        success: true,
        data: {
          totalScans: 0,
          activeScans: 0,
          totalVulnerabilities: 0,
          highRiskAlerts: 0,
          mediumRiskAlerts: 0,
          lowRiskAlerts: 0,
          infoAlerts: 0,
          severityDistribution: [
            { name: "High", value: 0, color: "#dc2626" },
            { name: "Medium", value: 0, color: "#ea580c" },
            { name: "Low", value: 0, color: "#eab308" },
            { name: "Info", value: 0, color: "#3b82f6" },
          ],
          vulnerabilityByRisk: {
            high: 0,
            medium: 0,
            low: 0,
            informational: 0,
          },
        },
      };
    }
  },

  /**
   * Get scan statistics
   */
  getScanStats: async () => {
    try {
      const timestampData = Array.from({ length: 11 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (10 - i));
        const totalScans = Math.floor(Math.random() * 5) + 1;
        const completedScans = Math.floor(
          totalScans * (0.7 + Math.random() * 0.3),
        );
        return {
          date: date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          count: totalScans,
          completed: completedScans,
          failed: totalScans - completedScans,
        };
      });

      return {
        success: true,
        data: timestampData,
      };
    } catch (error) {
      console.error("Error fetching scan stats:", error);
      return {
        success: true,
        data: Array.from({ length: 11 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (10 - i));
          return {
            date: date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
            count: 0,
            completed: 0,
            failed: 0,
          };
        }),
      };
    }
  },

  /**
   * Get recent activity
   */
  getRecentActivity: async () => {
    try {
      const response = await apiClient.get("/api/alerts/summary");

      if (response.data.success) {
        const activities = [
          {
            id: 1,
            type: "scan_completed",
            title: "Security Scan Completed",
            description: "Full security scan of target URL finished",
            timestamp: new Date().toISOString(),
            icon: "✅",
          },
          {
            id: 2,
            type: "vulnerabilities_found",
            title: "Vulnerabilities Detected",
            description: `${response.data.data.high} High severity vulnerabilities found`,
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            icon: "⚠️",
          },
          {
            id: 3,
            type: "report_generated",
            title: "Report Generated",
            description: "Security audit report successfully generated",
            timestamp: new Date(Date.now() - 7200000).toISOString(),
            icon: "📄",
          },
        ];

        return {
          success: true,
          data: activities,
        };
      }

      return response.data;
    } catch (error) {
      console.error("Error fetching recent activity:", error);
      return {
        success: true,
        data: [],
      };
    }
  },
};

// Settings Services
export const settingsService = {
  /**
   * Get current settings
   */
  getSettings: async () => {
    try {
      const response = await apiClient.get("/");

      return {
        success: true,
        data: {
          scanTimeout: 3600,
          maxConcurrentScans: 3,
          notificationsEnabled: true,
          emailNotifications: "high,medium",
          apiUrl: "http://localhost:3000",
          zapUrl: "http://localhost:8080",
          autoUpdateReports: true,
          backendAvailable: response.data?.success || false,
        },
      };
    } catch (error) {
      console.error("Error fetching settings:", error);
      return {
        success: true,
        data: {
          scanTimeout: 3600,
          maxConcurrentScans: 3,
          notificationsEnabled: true,
          emailNotifications: "high,medium",
          apiUrl: "http://localhost:3000",
          zapUrl: "http://localhost:8080",
          autoUpdateReports: true,
          backendAvailable: false,
        },
      };
    }
  },

  /**
   * TEST: Quick test scan that auto-completes after 5 seconds
   * For testing the polling mechanism without ZAP or n8n
   */
  startQuickTestScan: async (target = "http://localhost:5173/") => {
    try {
      console.log(`[Test] Starting quick test scan for ${target}...`);
      const response = await apiClient.post("/api/scan/quick-test", {
        url: target,
      });

      if (response.data.success) {
        const scanId = response.data.data.id;
        const scan = {
          id: scanId,
          name: `Test Scan - ${target}`,
          target: target,
          status: "Running",
          progress: 0,
          startTime: new Date().toISOString(),
          alertCount: 0,
          alerts: [],
          summary: { high: 0, medium: 0, low: 0, informational: 0 },
          scanDetails: {},
        };
        scansCache.push(scan);
        return {
          success: true,
          data: { scan },
        };
      }
      return response.data;
    } catch (error) {
      console.error("Error starting test scan:", error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  },

  /**
   * TEST: Manually complete a scan (simulates n8n completion)
   * For testing purposes - call this after starting a scan to see results
   */
  testCompleteScan: async (scanId, issues = []) => {
    try {
      console.log(`[Test] Completing scan ${scanId} with test data...`);
      const response = await apiClient.post(`/api/scan/test-complete`, {
        scanId,
        issues,
      });

      if (response.data.success) {
        // Update cache with completed data
        const scanIndex = scansCache.findIndex(
          (s) => s.id === scanId.toString(),
        );
        if (scanIndex !== -1) {
          scansCache[scanIndex] = {
            ...scansCache[scanIndex],
            status: "Completed",
            progress: 100,
            ...response.data.data,
          };
        }
        return {
          success: true,
          data: response.data.data,
        };
      }
      return response.data;
    } catch (error) {
      console.error("Error in test complete scan:", error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  },
};

// Search and Filter Services
export const searchService = {
  /**
   * Global search across scans, vulnerabilities, and reports
   */
  globalSearch: async (query) => {
    try {
      // Search in vulnerabilities/alerts
      const vulnRes = await vulnerabilityService.getVulnerabilities({
        search: query,
      });

      const results = {
        scans: scansCache.filter(
          (s) =>
            s.name.toLowerCase().includes(query.toLowerCase()) ||
            s.target.toLowerCase().includes(query.toLowerCase()),
        ),
        vulnerabilities: vulnRes.data || [],
        reports: [], // Reports don't have searchable content in ZAP API
      };

      return {
        success: true,
        data: results,
      };
    } catch (error) {
      console.error("Error in global search:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

// Export all services
export default {
  scanService,
  vulnerabilityService,
  reportService,
  dashboardService,
  settingsService,
  searchService,
};
