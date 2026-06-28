const axios = require("axios");

/**
 * Centralized ZAP API Service
 * All HTTP calls to OWASP ZAP are made through this service
 */

const baseURL = process.env.ZAP_BASE_URL || "http://localhost:8080";
const apiKey = process.env.ZAP_API_KEY || "changeme";

// Create axios instance with ZAP base URL and automatic API key injection
const zapInstance = axios.create({
  baseURL,
  timeout: 300000, // 5 minutes timeout for long-running operations
  params: {
    apikey: apiKey,
  },
});

// Add request interceptor for logging
zapInstance.interceptors.request.use((config) => {
  console.log(`[ZAP API] ${config.method.toUpperCase()} ${config.url}`);
  return config;
});

// Add response interceptor for error handling
zapInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error(
        `[ZAP API Error] ${error.response.status} - ${error.response.data}`,
      );
    } else if (error.request) {
      console.error(`[ZAP API Error] No response received`);
    } else {
      console.error(`[ZAP API Error] ${error.message}`);
    }
    throw error;
  },
);

/**
 * ==================== CORE API ====================
 */

/**
 * Get OWASP ZAP version
 * @returns {Promise<Object>} Version information
 */
const getVersion = async () => {
  try {
    const response = await zapInstance.get("/JSON/core/action/version");
    return response.data;
  } catch (error) {
    throw new Error(`Failed to get ZAP version: ${error.message}`);
  }
};

/**
 * Get all URLs currently in scope
 * @returns {Promise<Array>} List of URLs
 */
const getUrls = async () => {
  try {
    const response = await zapInstance.get("/JSON/core/view/urls");
    return response.data.urls || [];
  } catch (error) {
    throw new Error(`Failed to get URLs: ${error.message}`);
  }
};

/**
 * Seed a URL into ZAP to include it in scope
 * @param {string} url - URL to access
 * @param {boolean} followRedirects - Whether to follow redirects
 * @returns {Promise<Object>} Response from ZAP
 */
const accessUrl = async (url, followRedirects = true) => {
  try {
    const response = await zapInstance.get("/JSON/core/action/accessUrl", {
      params: {
        url,
        followRedirects: followRedirects ? "true" : "false",
      },
    });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to access URL: ${error.message}`);
  }
};

/**
 * Check if ZAP is reachable and healthy
 * @returns {Promise<Object>} Health status with version
 */
const healthCheck = async () => {
  try {
    const response = await zapInstance.get("/JSON/core/view/version");
    return {
      healthy: true,
      version: response.data.version,
      zapUrl: baseURL,
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message,
      zapUrl: baseURL,
    };
  }
};

/**
 * ==================== SESSION API ====================
 */

/**
 * Create a new ZAP session
 * @returns {Promise<Object>} Session reference
 */
const newSession = async () => {
  try {
    const response = await zapInstance.get("/JSON/core/action/newSession", {
      params: {
        overwrite: "true",
      },
    });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to create new session: ${error.message}`);
  }
};

/**
 * ==================== SPIDER API ====================
 */

/**
 * Start a spider scan on a target URL
 * @param {string} url - Target URL to spider
 * @param {boolean} recurse - Whether to recurse into child pages
 * @param {number} contextId - Optional context ID
 * @returns {Promise<Object>} Scan ID and status
 */
const startSpider = async (url, recurse = true, contextId = null) => {
  try {
    const params = {
      url,
      recurse: recurse ? "true" : "false",
      maxChildren: "0",
    };

    if (contextId) {
      params.contextId = contextId;
    }

    const response = await zapInstance.get("/JSON/spider/action/scan", {
      params,
    });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to start spider: ${error.message}`);
  }
};

/**
 * Get the status of a spider scan
 * @param {number} scanId - Spider scan ID (default: 0)
 * @returns {Promise<number>} Scan progress percentage (0-100)
 */
const getSpiderStatus = async (scanId = 0) => {
  try {
    const response = await zapInstance.get("/JSON/spider/view/status", {
      params: { scanId },
    });
    return parseInt(response.data.status, 10);
  } catch (error) {
    throw new Error(`Failed to get spider status: ${error.message}`);
  }
};

/**
 * Get URLs found by the spider
 * @param {number} scanId - Spider scan ID (default: 0)
 * @returns {Promise<Array>} List of discovered URLs
 */
const getSpiderResults = async (scanId = 0) => {
  try {
    const response = await zapInstance.get("/JSON/spider/view/results", {
      params: { scanId },
    });
    return response.data.results || [];
  } catch (error) {
    throw new Error(`Failed to get spider results: ${error.message}`);
  }
};

/**
 * ==================== AJAX SPIDER API ====================
 */

/**
 * Start an AJAX spider scan
 * @param {string} url - Target URL to scan
 * @param {number} inScope - Whether to limit to scope (0/1)
 * @returns {Promise<Object>} Response from ZAP
 */
const startAjaxSpider = async (url, inScope = 0) => {
  try {
    const response = await zapInstance.get("/JSON/ajaxSpider/action/scan", {
      params: {
        url,
        inScope,
      },
    });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to start AJAX spider: ${error.message}`);
  }
};

/**
 * Get the status of AJAX spider
 * @returns {Promise<Object>} AJAX spider status and details
 */
const getAjaxSpiderStatus = async () => {
  try {
    const response = await zapInstance.get("/JSON/ajaxSpider/view/status");
    return response.data;
  } catch (error) {
    throw new Error(`Failed to get AJAX spider status: ${error.message}`);
  }
};

/**
 * Stop the running AJAX spider
 * @returns {Promise<Object>} Response from ZAP
 */
const stopAjaxSpider = async () => {
  try {
    const response = await zapInstance.get("/JSON/ajaxSpider/action/stop");
    return response.data;
  } catch (error) {
    throw new Error(`Failed to stop AJAX spider: ${error.message}`);
  }
};

/**
 * ==================== ACTIVE SCAN API ====================
 */

/**
 * Start an active scan on a target URL
 * @param {string} url - Target URL to scan
 * @param {boolean} recurse - Whether to recurse
 * @param {string} scanPolicyName - Name of scan policy
 * @param {number} contextId - Optional context ID
 * @returns {Promise<Object>} Scan ID and status
 */
const startActiveScan = async (
  url,
  recurse = true,
  scanPolicyName = "Default Policy",
  contextId = null,
) => {
  try {
    const params = {
      url,
      recurse: recurse ? "true" : "false",
      scanPolicyName,
    };

    if (contextId) {
      params.contextId = contextId;
    }

    const response = await zapInstance.get("/JSON/ascan/action/scan", {
      params,
    });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to start active scan: ${error.message}`);
  }
};

/**
 * Get the status of an active scan
 * @param {number} scanId - Active scan ID (default: 0)
 * @returns {Promise<number>} Scan progress percentage (0-100)
 */
const getActiveScanStatus = async (scanId = 0) => {
  try {
    const response = await zapInstance.get("/JSON/ascan/view/status", {
      params: { scanId },
    });
    return parseInt(response.data.status, 10);
  } catch (error) {
    throw new Error(`Failed to get active scan status: ${error.message}`);
  }
};

/**
 * Get detailed progress of an active scan
 * @param {number} scanId - Active scan ID (default: 0)
 * @returns {Promise<Object>} Detailed scan progress
 */
const getActiveScanProgress = async (scanId = 0) => {
  try {
    const response = await zapInstance.get("/JSON/ascan/view/scanProgress", {
      params: { scanId },
    });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to get active scan progress: ${error.message}`);
  }
};

/**
 * Get list of all active scans
 * @returns {Promise<Array>} List of active scans
 */
const listActiveScans = async () => {
  try {
    const response = await zapInstance.get("/JSON/ascan/view/scans");
    return response.data.scans || [];
  } catch (error) {
    throw new Error(`Failed to list active scans: ${error.message}`);
  }
};

/**
 * Stop an active scan
 * @param {number} scanId - Active scan ID (default: 0)
 * @returns {Promise<Object>} Response from ZAP
 */
const stopActiveScan = async (scanId = 0) => {
  try {
    const response = await zapInstance.get("/JSON/ascan/action/stop", {
      params: { scanId },
    });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to stop active scan: ${error.message}`);
  }
};

/**
 * ==================== PASSIVE SCAN API ====================
 */

/**
 * Get the number of records waiting to be passively scanned
 * @returns {Promise<number>} Number of records in passive scan queue
 */
const getPassiveScanQueue = async () => {
  try {
    const response = await zapInstance.get("/JSON/pscan/view/recordsToScan");
    return parseInt(response.data.recordsToScan, 10);
  } catch (error) {
    throw new Error(`Failed to get passive scan queue: ${error.message}`);
  }
};

/**
 * Enable all passive scanners
 * @returns {Promise<Object>} Response from ZAP
 */
const enablePassiveScan = async () => {
  try {
    const response = await zapInstance.get(
      "/JSON/pscan/action/enableAllScanners",
    );
    return response.data;
  } catch (error) {
    throw new Error(`Failed to enable passive scan: ${error.message}`);
  }
};

/**
 * Disable all passive scanners
 * @returns {Promise<Object>} Response from ZAP
 */
const disablePassiveScan = async () => {
  try {
    const response = await zapInstance.get(
      "/JSON/pscan/action/disableAllScanners",
    );
    return response.data;
  } catch (error) {
    throw new Error(`Failed to disable passive scan: ${error.message}`);
  }
};

/**
 * ==================== ALERTS API ====================
 */

/**
 * Get all alerts from ZAP
 * @param {Object} options - Query options
 * @param {string} options.baseurl - Filter by base URL
 * @param {number} options.start - Start index
 * @param {number} options.count - Number of alerts to return
 * @param {string} options.riskId - Filter by risk ID
 * @returns {Promise<Array>} List of alerts
 */
const getAlerts = async (options = {}) => {
  try {
    const params = {};
    if (options.baseurl) params.baseurl = options.baseurl;
    if (options.start !== undefined) params.start = options.start;
    if (options.count !== undefined) params.count = options.count;
    if (options.riskId !== undefined) params.riskId = options.riskId;

    const response = await zapInstance.get("/JSON/alert/view/alerts", {
      params,
    });
    return response.data.alerts || [];
  } catch (error) {
    throw new Error(`Failed to get alerts: ${error.message}`);
  }
};

/**
 * Get summary of alerts by risk level
 * @returns {Promise<Object>} Alert summary with counts by risk
 */
const getAlertsSummary = async () => {
  try {
    const response = await zapInstance.get("/JSON/alert/view/alertsSummary");
    const data = response.data;

    // ZAP returns alertsSummary with capitalized keys, normalize to lowercase
    if (data.alertsSummary) {
      return {
        critical: 0,
        high: data.alertsSummary.High || 0,
        medium: data.alertsSummary.Medium || 0,
        low: data.alertsSummary.Low || 0,
        informational: data.alertsSummary.Informational || 0,
        total: (data.alertsSummary.High || 0) + (data.alertsSummary.Medium || 0) + (data.alertsSummary.Low || 0) + (data.alertsSummary.Informational || 0),
      };
    }

    // Fallback if structure is different
    return {
      critical: data.critical || 0,
      high: data.high || 0,
      medium: data.medium || 0,
      low: data.low || 0,
      informational: data.informational || 0,
      total: (data.high || 0) + (data.medium || 0) + (data.low || 0) + (data.informational || 0),
    };
  } catch (error) {
    throw new Error(`Failed to get alerts summary: ${error.message}`);
  }
};

/**
 * Get alerts grouped by risk level
 * @returns {Promise<Object>} Alerts grouped by risk
 */
const getAlertsByRisk = async () => {
  try {
    const alerts = await getAlerts();
    const grouped = {
      high: [],
      medium: [],
      low: [],
      informational: [],
    };

    alerts.forEach((alert) => {
      const risk = alert.riskdesc?.toLowerCase() || "informational";
      if (grouped[risk]) {
        grouped[risk].push(alert);
      }
    });

    return grouped;
  } catch (error) {
    throw new Error(`Failed to group alerts by risk: ${error.message}`);
  }
};

/**
 * Get count of all alerts
 * @returns {Promise<number>} Total count of alerts
 */
const getAlertsCount = async () => {
  try {
    const response = await zapInstance.get("/JSON/alert/view/alertCount");
    return parseInt(response.data.alertCount, 10);
  } catch (error) {
    throw new Error(`Failed to get alerts count: ${error.message}`);
  }
};

/**
 * Delete all alerts
 * @returns {Promise<Object>} Response from ZAP
 */
const deleteAlerts = async () => {
  try {
    const response = await zapInstance.get(
      "/JSON/alert/action/deleteAllAlerts",
    );
    return response.data;
  } catch (error) {
    throw new Error(`Failed to delete alerts: ${error.message}`);
  }
};

/**
 * ==================== REPORT API ====================
 */

/**
 * Generate HTML report
 * @param {Object} options - Report options
 * @param {string} options.title - Report title
 * @param {string} options.template - Template name
 * @returns {Promise<string>} HTML report content
 */
const generateHtmlReport = async (options = {}) => {
  try {
    const params = {};
    if (options.title) params.title = options.title;
    if (options.template) params.template = options.template;

    const response = await zapInstance.get("/OTHER/report/report", {
      params: {
        ...params,
        reporttype: "html",
      },
      responseType: "stream",
    });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to generate HTML report: ${error.message}`);
  }
};

/**
 * Generate XML report
 * @param {Object} options - Report options
 * @param {string} options.title - Report title
 * @param {string} options.template - Template name
 * @returns {Promise<string>} XML report content
 */
const generateXmlReport = async (options = {}) => {
  try {
    const params = {};
    if (options.title) params.title = options.title;
    if (options.template) params.template = options.template;

    const response = await zapInstance.get("/OTHER/report/report", {
      params: {
        ...params,
        reporttype: "xml",
      },
      responseType: "stream",
    });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to generate XML report: ${error.message}`);
  }
};

/**
 * Generate JSON report
 * @returns {Promise<Object>} JSON report data
 */
const generateJsonReport = async () => {
  try {
    const response = await zapInstance.get("/JSON/core/view/alerts");
    return response.data;
  } catch (error) {
    throw new Error(`Failed to generate JSON report: ${error.message}`);
  }
};

/**
 * Generate custom report with template
 * @param {Object} options - Report generation options
 * @param {string} options.title - Report title
 * @param {string} options.template - Template name
 * @param {string} options.reportDir - Directory to save report
 * @param {string} options.reportFileName - Report file name
 * @returns {Promise<Object>} Report generation response
 */
const generateCustomReport = async (options) => {
  try {
    const response = await zapInstance.get("/JSON/reports/action/generate", {
      params: {
        title: options.title || "ZAP Security Report",
        template: options.template || "traditional-html",
        reportDir: options.reportDir || "/tmp",
        reportFileName: options.reportFileName || "report",
      },
    });
    return response.data;
  } catch (error) {
    // Fallback to generating basic alert report if custom template fails
    console.warn("Custom report generation failed, using basic report");
    const alerts = await getAlerts();
    const summary = await getAlertsSummary();
    return {
      title: options.title || "ZAP Security Report",
      alerts,
      summary,
      generatedAt: new Date().toISOString(),
    };
  }
};

module.exports = {
  // Core
  getVersion,
  getUrls,
  accessUrl,
  healthCheck,
  // Session
  newSession,
  // Spider
  startSpider,
  getSpiderStatus,
  getSpiderResults,
  // AJAX Spider
  startAjaxSpider,
  getAjaxSpiderStatus,
  stopAjaxSpider,
  // Active Scan
  startActiveScan,
  getActiveScanStatus,
  getActiveScanProgress,
  listActiveScans,
  stopActiveScan,
  // Passive Scan
  getPassiveScanQueue,
  enablePassiveScan,
  disablePassiveScan,
  // Alerts
  getAlerts,
  getAlertsSummary,
  getAlertsByRisk,
  getAlertsCount,
  deleteAlerts,
  // Reports
  generateHtmlReport,
  generateXmlReport,
  generateJsonReport,
  generateCustomReport,
};
