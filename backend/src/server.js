const app = require("./app");

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";

// Create HTTP server
const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║   OWASP ZAP API Middleware Server Started               ║
╚═══════════════════════════════════════════════════════════╝

Environment:  ${NODE_ENV}
Server URL:   http://localhost:${PORT}
ZAP URL:      ${process.env.ZAP_BASE_URL || "http://localhost:8080"}

Available Endpoints:
  • GET  /                         - Server info
  • GET  /health                   - Health check
  • GET  /api/info                 - API information

Documentation: See README.md for full API reference
Press CTRL+C to stop the server
  `);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("\nSIGINT received. Shutting down gracefully...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

module.exports = server;
