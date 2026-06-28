// Utility functions to transform backend API responses to frontend format

/**
 * Transform backend alert object to frontend format
 * Backend: { pluginid, alertRef, alert, name, riskdesc, confidence, url, ... }
 * Frontend: { id, alert, risk, riskId, confidence, url, parameter, description, cweId, wascId }
 */
export const transformAlert = (backendAlert) => {
  const riskMap = {
    High: 3,
    Medium: 2,
    Low: 1,
    Informational: 0,
  };

  return {
    id: backendAlert.alertRef || backendAlert.pluginid,
    alert: backendAlert.alert || backendAlert.name,
    name: backendAlert.name || backendAlert.alert,
    risk: backendAlert.riskdesc || "Unknown",
    riskId: riskMap[backendAlert.riskdesc] || 0,
    confidence: backendAlert.confidence || "Unknown",
    url: backendAlert.url || "",
    parameter: backendAlert.param || "N/A",
    description: backendAlert.description || "",
    cweId: backendAlert.cweid || null,
    wascId: backendAlert.wascid || null,
    pluginid: backendAlert.pluginid,
  };
};

/**
 * Transform backend scan/alerts summary to scan object
 */
export const createScanFromAlertsSummary = (
  targetUrl,
  alertsInfo,
  scanDetails,
  scanSummary,
  report,
) => {
  const alertsCount = alertsInfo?.totalAlerts || 0;
  const summary = alertsInfo?.summary || {
    high: 0,
    medium: 0,
    low: 0,
    informational: 0,
  };

  return {
    id: scanDetails?.activeScanId?.toString() || "scan-" + Date.now(),
    name: `Scan - ${targetUrl}`,
    target: targetUrl,
    status: "Completed",
    progress: 100,
    startTime: scanSummary?.startTime || new Date().toISOString(),
    endTime: scanSummary?.endTime || new Date().toISOString(),
    duration: scanSummary?.durationMinutes || "0m",
    durationMs: scanSummary?.durationMs || 0,
    alertCount: alertsCount,
    alerts: alertsInfo?.alerts || [],
    summary: summary,
    scanDetails: scanDetails || {},
    scanSummary: scanSummary || {},
    report: report || null,
    useAjaxSpider: scanDetails?.useAjaxSpider || false,
    spiderUrlsFound: scanDetails?.spiderUrlsFound || 0,
  };
};

/**
 * Transform alerts by risk to format used by frontend
 */
export const transformAlertsByRisk = (backendAlertsByRisk) => {
  const transformed = {};
  Object.keys(backendAlertsByRisk).forEach((risk) => {
    transformed[risk] = Array.isArray(backendAlertsByRisk[risk])
      ? backendAlertsByRisk[risk].map(transformAlert)
      : [];
  });
  return transformed;
};

/**
 * Create dashboard stats from alerts summary
 */
export const createDashboardStats = (alertsInfo) => {
  const summary = alertsInfo?.summary || {
    high: 0,
    medium: 0,
    low: 0,
    informational: 0,
  };

  return {
    totalScans: 1,
    activeScans: 0,
    criticalVulnerabilities: summary.high,
    totalVulnerabilities: alertsInfo?.totalAlerts || 0,
    vulnerabilityByRisk: summary,
  };
};

/**
 * Transform full scan response to include all necessary data
 */
export const transformFullScanResponse = (backendResponse) => {
  const data = backendResponse.data;

  // Transform raw alerts from backend
  const transformedAlerts = data.alerts?.map(transformAlert) || [];

  // Build summary from transformed alerts to ensure consistency
  const summary = {
    high: transformedAlerts.filter((a) => a.risk === "High").length,
    medium: transformedAlerts.filter((a) => a.risk === "Medium").length,
    low: transformedAlerts.filter((a) => a.risk === "Low").length,
    informational: transformedAlerts.filter((a) => a.risk === "Informational")
      .length,
  };

  return {
    scan: createScanFromAlertsSummary(
      data.scanSummary?.targetUrl,
      {
        ...data.alertsInfo,
        alerts: transformedAlerts,
        summary: summary,
      },
      data.scanDetails,
      data.scanSummary,
      data.report,
    ),
    alerts: transformedAlerts,
    alertsByRisk: transformAlertsByRisk(data.alertsInfo?.byRisk || {}),
    summary: summary,
    report: data.report || null,
    scanDetails: data.scanDetails,
    scanSummary: data.scanSummary,
  };
};

export default {
  transformAlert,
  createScanFromAlertsSummary,
  transformAlertsByRisk,
  createDashboardStats,
  transformFullScanResponse,
};
