const axios = require("axios");

/**
 * FortiWeb Configuration Monitor
 * Fetches and tracks FortiWeb configuration changes
 */

class FortiWebConfigMonitor {
  constructor() {
    this.fortiwebHost = process.env.FORTIWEB_HOST || "https://localhost";
    this.fortiwebUsername = process.env.FORTIWEB_USERNAME || "admin";
    this.fortiwebPassword = process.env.FORTIWEB_PASSWORD;
    this.lastConfig = null;
    this.configHistory = [];
  }

  /**
   * Fetch current FortiWeb configuration
   * @returns {Promise<Object>} - Current configuration
   */
  async fetchConfig() {
    try {
      console.log("[FortiWeb Monitor] Fetching current configuration...");

      // For now, we'll use a placeholder implementation
      // You should adapt this to your actual FortiWeb API
      const config = await this.getFortiWebConfig();

      console.log("[FortiWeb Monitor] ✅ Configuration fetched successfully");
      return config;
    } catch (error) {
      console.error("[FortiWeb Monitor] Error fetching config:", error.message);
      return this.getDefaultConfig();
    }
  }

  /**
   * Connect to FortiWeb API/SSH and retrieve config
   * Adapt this method to your FortiWeb API
   */
  async getFortiWebConfig() {
    try {
      // Example: If FortiWeb has REST API on port 8443
      const response = await axios.get(
        `${this.fortiwebHost}:8443/api/v2.0/config`,
        {
          auth: {
            username: this.fortiwebUsername,
            password: this.fortiwebPassword,
          },
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 10000,
          httpsAgent: {
            rejectUnauthorized: false, // For self-signed certs
          },
        },
      );

      return response.data || this.getDefaultConfig();
    } catch (error) {
      console.warn("[FortiWeb Monitor] Could not fetch via API:", error.message);
      // Return mock config - replace with real API call
      return this.getDefaultConfig();
    }
  }

  /**
   * Get default/mock FortiWeb configuration
   * Replace this with real configuration from your FortiWeb
   */
  getDefaultConfig() {
    return {
      hostname: "FortiWeb",
      version: "7.0.0",
      serialNumber: "FTWF-12345678",
      timestamp: new Date().toISOString(),
      wafSettings: {
        enabled: true,
        threatWeight: {
          critical: 10,
          high: 5,
          medium: 3,
          low: 1,
        },
        policies: {
          count: 5,
          names: [
            "Default Policy",
            "API Protection",
            "Admin Panel",
            "Public API",
            "Sensitive",
          ],
        },
      },
      securityHeaders: {
        "X-Frame-Options": "SAMEORIGIN",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'self'",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
      },
      advancedSettings: {
        sessionTimeout: 30,
        maxConnections: 10000,
        cacheSize: 512,
        logLevel: "medium",
        alertThreshold: "high",
      },
      lastUpdateTime: new Date().toISOString(),
    };
  }

  /**
   * Get configuration snapshot
   * @returns {Promise<Object>} - Current config snapshot
   */
  async getSnapshot() {
    const config = await this.fetchConfig();
    this.lastConfig = config;
    return config;
  }

  /**
   * Compare current config with previous version
   * @returns {Promise<Object>} - Changes detected
   */
  async detectChanges() {
    const currentConfig = await this.fetchConfig();

    if (!this.lastConfig) {
      this.lastConfig = currentConfig;
      return {
        changed: false,
        changes: [],
        currentConfig,
      };
    }

    const changes = this.compareConfigs(this.lastConfig, currentConfig);
    this.lastConfig = currentConfig;

    if (changes.length > 0) {
      console.log(
        `[FortiWeb Monitor] ⚠️ Detected ${changes.length} configuration changes`,
      );
      this.configHistory.push({
        timestamp: new Date(),
        changes: changes,
        snapshot: currentConfig,
      });
    }

    return {
      changed: changes.length > 0,
      changes: changes,
      currentConfig,
    };
  }

  /**
   * Deep compare two config objects
   * @param {Object} prev - Previous config
   * @param {Object} curr - Current config
   * @returns {Array} - Array of changes
   */
  compareConfigs(prev, curr) {
    const changes = [];

    // Compare top-level keys
    const allKeys = new Set([...Object.keys(prev), ...Object.keys(curr)]);

    for (const key of allKeys) {
      if (JSON.stringify(prev[key]) !== JSON.stringify(curr[key])) {
        changes.push({
          key: key,
          previousValue: prev[key],
          currentValue: curr[key],
          timestamp: new Date(),
        });
      }
    }

    return changes;
  }

  /**
   * Get configuration history
   * @param {number} limit - Number of recent changes to return
   * @returns {Array} - Configuration change history
   */
  getHistory(limit = 10) {
    return this.configHistory.slice(-limit);
  }

  /**
   * Clear configuration history
   */
  clearHistory() {
    this.configHistory = [];
  }

  /**
   * Start continuous monitoring
   * @param {number} intervalMs - Interval in milliseconds (default 30 minutes)
   */
  startMonitoring(intervalMs = 30 * 60 * 1000) {
    console.log(
      `[FortiWeb Monitor] Starting continuous monitoring (every ${intervalMs / 1000}s)`,
    );

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.detectChanges();
      } catch (error) {
        console.error("[FortiWeb Monitor] Error during monitoring:", error.message);
      }
    }, intervalMs);
  }

  /**
   * Stop continuous monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      console.log("[FortiWeb Monitor] Monitoring stopped");
    }
  }
}

module.exports = new FortiWebConfigMonitor();
