const express = require('express');
const router = express.Router();
const docsController = require('../controllers/docs.controller');

/**
 * Documentation Routes
 * GET /docs - List all documentation
 * GET /docs/readme - Read README
 * GET /docs/quick-start - Read Quick Start
 * GET /docs/project-summary - Read Project Summary
 * GET /docs/deployment - Read Deployment Guide
 */

router.get('/', docsController.listDocs);
router.get('/readme', docsController.getReadme);
router.get('/quick-start', docsController.getQuickStart);
router.get('/project-summary', docsController.getProjectSummary);
router.get('/deployment', docsController.getDeployment);

module.exports = router;
