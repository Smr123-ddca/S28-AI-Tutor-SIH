const express = require('express');
const { retrieve } = require('../controllers/retrieval.controller');
const { explain } = require('../controllers/explain.controller');
const { recordSessionEvent, detectGap } = require('../controllers/gap.controller');
const { getMisconceptions } = require('../controllers/misconception.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate);

router.post('/retrieve', retrieve);
router.post('/explain', explain);
router.post('/session-event', recordSessionEvent);
router.post('/detect-gap', detectGap);
router.get('/misconceptions', requireRole('teacher'), getMisconceptions);

module.exports = router;
