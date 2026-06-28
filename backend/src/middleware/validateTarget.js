/**
 * Input validation middleware
 * Validates URL and other inputs before passing to ZAP
 */

/**
 * Validate that a URL is well-formed and starts with http/https
 * @param {string} url - URL to validate
 * @returns {boolean} Whether URL is valid
 */
const isValidUrl = (url) => {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === "http:" || urlObj.protocol === "https:";
  } catch {
    return false;
  }
};

/**
 * Middleware to validate target URL in request body
 */
const validateTarget = (req, res, next) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({
      error: true,
      message: "Validation Error",
      details: "Target URL is required in request body",
    });
  }

  if (!isValidUrl(url)) {
    return res.status(400).json({
      error: true,
      message: "Validation Error",
      details: "Invalid URL format. URL must start with http:// or https://",
    });
  }

  next();
};

/**
 * Middleware to validate query parameters for scan ID
 */
const validateScanId = (req, res, next) => {
  const { scanId } = req.params;

  if (scanId && isNaN(parseInt(scanId, 10))) {
    return res.status(400).json({
      error: true,
      message: "Validation Error",
      details: "Scan ID must be a valid integer",
    });
  }

  next();
};

module.exports = {
  validateTarget,
  validateScanId,
  isValidUrl,
};
