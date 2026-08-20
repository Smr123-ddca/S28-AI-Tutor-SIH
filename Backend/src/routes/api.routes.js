const express = require('express');
const { retrieve } = require('../controllers/retrieval.controller');
const { explain } = require('../controllers/explain.controller');
const { recordSessionEvent, detectGap } = require('../controllers/gap.controller');
const { getMisconceptions } = require('../controllers/misconception.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { uploadMiddleware, handleUpload } = require('../controllers/ingest.controller');

const router = express.Router();

router.use(authenticate);

router.post('/retrieve', retrieve);
router.post('/explain', explain);
router.post('/session-event', recordSessionEvent);
router.post('/detect-gap', detectGap);
router.get('/misconceptions', requireRole('teacher'), getMisconceptions);

// Ingestion Sub-layer A (Upload)
router.post('/ingest/upload', requireRole('teacher'), uploadMiddleware, handleUpload);

// Debug route for Accessing Batch
const { getBatch } = require('../controllers/ingest.controller');
router.get('/ingest/batch/:batchId', requireRole('teacher'), (req, res) => {
    const batch = getBatch(req.params.batchId);
    if (!batch) return res.status(404).json({ error: 'Batch not found' });
    res.json(batch);
});

module.exports = router;
