const zapService = require("../services/zap.service");

/**
 * Session Controller
 * Handles ZAP session operations
 */

/**
 * POST /api/session/new
 * Create a new ZAP session
 */
exports.newSession = async (req, res) => {
  const result = await zapService.newSession();
  res.status(201).json({
    success: true,
    message: "New session created",
    data: result,
  });
};
