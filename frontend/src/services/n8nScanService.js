// n8n Integration Service
// Handles submission of scans to backend for n8n workflow integration

import { apiClient } from "../config/api";

const N8N_API_CONFIG = {
  baseURL: import.meta.env.VITE_BACKEND_URL || "http://localhost:3000",
  apiKey: import.meta.env.VITE_API_KEY || "your-secret-api-key-change-this",
};

// Create axios instance with n8n API authentication
const n8nClient = apiClient.create({
  baseURL: N8N_API_CONFIG.baseURL,
  timeout: 60000, // 60 seconds for longer operations
  headers: {
    "Content-Type": "application/json",
    "x-api-key": N8N_API_CONFIG.apiKey,
  },
});

export const n8nScanService = {
  /**
   * Submit scan for n8n analysis
   * Sends scan results to backend which triggers n8n workflow
   */
  submitScanForAnalysis: async (scanData) => {
    try {
      const response = await n8nClient.post("/api/scans", {
        target: scanData.target,
        report: scanData.report,
        structured: scanData.structured || {},
      });

      return {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message,
      };
    } catch (error) {
      console.error("Error submitting scan for n8n analysis:", error);
      return {
        success: false,
        error:
          error.response?.data?.error ||
          error.message ||
          "Failed to submit scan",
        details: error.response?.data?.details,
      };
    }
  },

  /**
   * Get all scans (pending approval, approved, rejected, applied)
   */
  getAllScans: async () => {
    try {
      const response = await n8nClient.get("/api/scans");

      return {
        success: response.data.success,
        data: response.data.data,
        count: response.data.count,
      };
    } catch (error) {
      console.error("Error fetching scans:", error);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
        data: [],
      };
    }
  },

  /**
   * Get single scan by ID
   */
  getScanById: async (scanId) => {
    try {
      const response = await n8nClient.get(`/api/scans/${scanId}`);

      return {
        success: response.data.success,
        data: response.data.data,
      };
    } catch (error) {
      console.error("Error fetching scan:", error);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  },

  /**
   * Approve a scan and trigger FortiWeb command generation
   */
  approveScan: async (scanId) => {
    try {
      const response = await n8nClient.post(`/api/scans/${scanId}/approve`);

      return {
        success: response.data.success,
        data: response.data.data,
        commands: response.data.data?.commands || [],
        message: response.data.message,
      };
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
      const response = await n8nClient.post(`/api/scans/${scanId}/reject`, {
        reason,
      });

      return {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message,
      };
    } catch (error) {
      console.error("Error rejecting scan:", error);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  },

  /**
   * Download scan report as text file
   */
  downloadReport: async (scanId) => {
    try {
      const response = await n8nClient.get(`/api/scans/${scanId}/download-report`, {
        responseType: "blob",
      });

      // Create and trigger file download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `scan-report-${scanId}-${new Date().getTime()}.txt`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return {
        success: true,
        message: "Report downloaded successfully",
      };
    } catch (error) {
      console.error("Error downloading report:", error);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  },

  /**
   * Poll scan status with interval
   */
  pollScanStatus: async (scanId, intervalMs = 2000, maxAttempts = 150) => {
    return new Promise((resolve, reject) => {
      let attempts = 0;

      const poll = async () => {
        try {
          const response = await this.getScanById(scanId);

          if (response.success) {
            attempts++;

            // Check if scan has been processed/approved
            if (response.data.status === "APPROVED") {
              resolve({
                success: true,
                status: "APPROVED",
                data: response.data,
              });
              return;
            }

            if (response.data.status === "APPLIED") {
              resolve({
                success: true,
                status: "APPLIED",
                data: response.data,
              });
              return;
            }

            if (response.data.status === "REJECTED") {
              resolve({
                success: true,
                status: "REJECTED",
                data: response.data,
              });
              return;
            }

            if (attempts < maxAttempts) {
              setTimeout(poll, intervalMs);
            } else {
              reject(new Error("Poll timeout: scan status not updated"));
            }
          } else {
            reject(new Error(response.error));
          }
        } catch (error) {
          reject(error);
        }
      };

      poll();
    });
  },

  /**
   * Approve scan with selected command groups (partial approval)
   * Sends selected groups to SSH webhook for execution
   * @param {string} scanId - Scan ID
   * @param {number[]} groupIndices - Array of selected command group indices
   */
  approveScanPartial: async (scanId, groupIndices = []) => {
    try {
      const response = await n8nClient.post(`/api/scans/${scanId}/approve-ssh`, {
        groupIndices,
      });

      return {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message,
      };
    } catch (error) {
      console.error("Error approving scan with SSH:", error);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  },

  /**
   * Approve and execute commands via SSH (alias for approveScanPartial)
   * @param {string} scanId - Scan ID
   * @param {number[]} groupIndices - Array of selected command group indices (null = all)
   */
  approveScanWithSSH: async (scanId, groupIndices = null) => {
    try {
      const response = await n8nClient.post(`/api/scans/${scanId}/approve-ssh`, {
        groupIndices: groupIndices || [],
        approveAll: groupIndices === null,
      });

      return {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message,
      };
    } catch (error) {
      console.error("Error approving scan with SSH:", error);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  },

  /**
   * Send individual command set to n8n webhook for execution
   * @param {string} scanId - Scan ID
   * @param {number} commandSetIndex - Index of the command set to send
   * @param {object} commandSet - The command set object containing commands, severity, etc.
   */
  sendCommandSetToN8n: async (scanId, commandSetIndex, commandSet) => {
    try {
      const response = await n8nClient.post(`/api/scans/${scanId}/send-command-to-n8n`, {
        commandSetIndex,
        commandSet,
      });

      return {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message,
      };
    } catch (error) {
      console.error("Error sending command set to n8n:", error);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  },
};

export default n8nScanService;
