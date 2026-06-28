/**
 * API Key Validation Middleware
 * Checks for valid x-api-key header
 */
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];
  const expectedApiKey = process.env.API_KEY;

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: "Missing API key. Please provide x-api-key header.",
    });
  }

  if (apiKey !== expectedApiKey) {
    return res.status(403).json({
      success: false,
      error: "Invalid API key.",
    });
  }

  next();
};

module.exports = validateApiKey;
