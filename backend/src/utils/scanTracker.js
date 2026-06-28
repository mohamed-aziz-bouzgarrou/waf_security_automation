/**
 * Shared Scan Status Tracker
 * In-memory storage for active/recently-completed scans
 * Used by scan.controller.js and webhookV2.controller.js to coordinate state
 */

const scanStatusTracker = {};

/**
 * Get scan status from tracker
 * @param {string} scanId - The scan ID
 * @returns {Object|null} - Scan data or null if not found
 */
const getScanStatus = (scanId) => {
  return scanStatusTracker[scanId] || null;
};

/**
 * Set scan status in tracker
 * @param {string} scanId - The scan ID
 * @param {Object} data - Scan data to store
 */
const setScanStatus = (scanId, data) => {
  scanStatusTracker[scanId] = data;
};

/**
 * Update scan status in tracker
 * @param {string} scanId - The scan ID
 * @param {Object} updates - Fields to update
 */
const updateScanStatus = (scanId, updates) => {
  if (scanStatusTracker[scanId]) {
    Object.assign(scanStatusTracker[scanId], updates);
  }
};

/**
 * Clear scan from tracker
 * @param {string} scanId - The scan ID
 */
const clearScanStatus = (scanId) => {
  delete scanStatusTracker[scanId];
};

/**
 * Get all scans from tracker
 * @returns {Object} - All scans in tracker
 */
const getAllScans = () => {
  return { ...scanStatusTracker };
};

module.exports = {
  getScanStatus,
  setScanStatus,
  updateScanStatus,
  clearScanStatus,
  getAllScans,
  // Direct access for legacy code that manipulates tracker directly
  scanStatusTracker,
};
