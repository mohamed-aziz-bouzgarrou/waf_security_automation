/**
 * Global error handler middleware
 * Catches all errors and returns structured error responses
 * Must be registered AFTER all other routes and middleware
 */
module.exports = (err, req, res, next) => {
  console.error('[Error]', err);

  // ZAP API errors
  if (err.response) {
    return res.status(err.response.status || 500).json({
      error: true,
      message: 'ZAP API Error',
      zapMessage: err.response.data,
      status: err.response.status,
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: true,
      message: 'Validation Error',
      details: err.message,
      status: 400,
    });
  }

  // Timeout or connection errors
  if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
    return res.status(503).json({
      error: true,
      message: 'ZAP Service Unavailable',
      details: 'Cannot connect to OWASP ZAP API. Ensure ZAP is running at the configured URL.',
      zapUrl: process.env.ZAP_BASE_URL || 'http://localhost:8080',
      status: 503,
    });
  }

  // Generic error
  res.status(500).json({
    error: true,
    message: err.message || 'Internal Server Error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    status: 500,
  });
};
