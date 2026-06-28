const axios = require("axios");

/**
 * Send notification to n8n webhook
 * @param {Object} payload - Data to send to webhook
 * @param {string} event - Event type (scan_started, scan_completed, etc)
 * @returns {Promise<Object>} Response from webhook
 */
const sendWebhookNotification = async (payload, event = "scan_event") => {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn(
      "[Webhook] N8N_WEBHOOK_URL not configured, skipping notification",
    );
    return null;
  }

  try {
    const notification = {
      event,
      timestamp: new Date().toISOString(),
      ...payload,
    };

    const jsonString = JSON.stringify(notification);
    console.log(`[Webhook] Sending ${event} to n8n:`, webhookUrl);
    console.log(`[Webhook] Payload size: ${jsonString.length} bytes`);
    console.log(`[Webhook] Event: ${event}, Target URL: ${payload.targetUrl}`);

    const response = await axios.post(webhookUrl, notification, {
      timeout: 60000, // 60 second timeout for webhook
      headers: {
        "Content-Type": "application/json",
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    console.log(
      `[Webhook] ${event} sent successfully, response status:`,
      response.status,
    );
    console.log(`[Webhook] Response:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`[Webhook] Failed to send ${event}:`, error.message);
    if (error.response) {
      console.error(`[Webhook] Response status:`, error.response.status);
      console.error(`[Webhook] Response data:`, error.response.data);
    }
    if (error.code) {
      console.error(`[Webhook] Error code:`, error.code);
    }
    // Don't throw - webhook failures shouldn't break the scan
    return null;
  }
};

/**
 * Send scan started notification
 * @param {Object} scanData - Scan details
 */
const notifyScanStarted = async (scanData) => {
  return sendWebhookNotification(
    {
      scanType: "full",
      targetUrl: scanData.url,
      options: {
        useAjaxSpider: scanData.useAjaxSpider || false,
        reportTemplate: scanData.reportTemplate || "traditional-html",
      },
    },
    "scan_started",
  );
};

/**
 * Send scan completed notification
 * @param {Object} scanResults - Complete scan results including alerts and report
 */
const notifyScanCompleted = async (scanResults) => {
  const N8nNotificationPromise = sendWebhookNotification(
    {
      scanId: scanResults.scanId, // Include scanId so n8n can send it back
      scanType: "full",
      targetUrl: scanResults.targetUrl,
      status: "completed",
      durationMs: scanResults.durationMs,
      durationMinutes: scanResults.durationMinutes,
      scanSummary: scanResults.scanSummary,
      scanDetails: scanResults.scanDetails,
      alertsInfo: {
        totalAlerts: scanResults.totalAlerts,
        summary: scanResults.summary,
        byRisk: scanResults.byRisk,
      },
      alerts: scanResults.alerts,
      report: scanResults.report,
    },
    "scan_completed",
  );

  // Add a 30-second timeout for n8n to respond
  // If n8n doesn't respond, auto-complete the scan with ZAP report
  const timeoutPromise = new Promise((resolve) => {
    setTimeout(() => {
      console.log(
        `[Webhook] n8n did not respond within 30s for scanId ${scanResults.scanId}, auto-completing with ZAP report`,
      );
      resolve({ auto_completed: true });
    }, 30000); // 30 seconds
  });

  // Race: whichever finishes first
  const result = await Promise.race([N8nNotificationPromise, timeoutPromise]);

  // If n8n timed out, auto-complete the scan
  if (result?.auto_completed) {
    console.log(
      `[Webhook] Auto-completing scan ${scanResults.scanId} with ZAP report (n8n timeout)`,
    );
    try {
      const ScanV2 = require("../models/ScanV2");
      await ScanV2.findOneAndUpdate(
        { scanId: scanResults.scanId },
        {
          status: "READY_FOR_APPROVAL",
          statusMessage:
            "✅ Security scan complete. Ready for approval.\n📋 Note: Using ZAP report. AI enrichment pending.",
          report:
            scanResults.report ||
            "ZAP security scan report (awaiting AI enrichment from n8n)",
          structured: {
            scanId: scanResults.scanId,
            summary: scanResults.summary || {
              total: scanResults.totalAlerts || 0,
            },
            issues: (scanResults.alerts || []).map((a) => ({
              name: a.name || a.alert || "Unknown",
              severity:
                a.riskcode === "3"
                  ? "HIGH"
                  : a.riskcode === "2"
                    ? "MEDIUM"
                    : "LOW",
              description: a.description || "",
              solution: a.solution || "",
            })),
          },
        },
      );
      console.log(
        `[Webhook] ✅ Auto-completed scan ${scanResults.scanId} in database`,
      );
    } catch (err) {
      console.error(
        `[Webhook] Error auto-completing scan ${scanResults.scanId}:`,
        err.message,
      );
    }
  }

  return result;
};

/**
 * Send scan error notification
 * @param {Object} errorData - Error details
 */
const notifyScanError = async (errorData) => {
  return sendWebhookNotification(
    {
      scanType: "full",
      targetUrl: errorData.url,
      status: "error",
      error: errorData.message,
    },
    "scan_error",
  );
};

module.exports = {
  sendWebhookNotification,
  notifyScanStarted,
  notifyScanCompleted,
  notifyScanError,
};
