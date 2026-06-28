const express = require("express");
const router = express.Router();
const sessionController = require("../controllers/session.controller");

/**
 * Session Routes
 * POST /api/session/new - Create a new ZAP session
 */

router.post("/new", sessionController.newSession);

module.exports = router;
