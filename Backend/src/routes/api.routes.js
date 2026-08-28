const express = require('express');
const { retrieve } = require('../controllers/retrieval.controller');
const { explain } = require('../controllers/explain.controller');
const { recordSessionEvent, detectGap } = require('../controllers/gap.controller');
const { getMisconceptions } = require('../controllers/misconception.controller');
const { getChatLogs, getSessions, getSessionMessages, createSession, updateSessionTitle, deleteSession } = require('../controllers/chatlog.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { uploadMiddleware, handleUpload, generatePrerequisites, getBatch } = require('../controllers/ingest.controller');
const { getCourses, updateCourseStatus, getArtifacts } = require('../controllers/course.controller');
const {
    createQuestion,
    getQuestions,
    getQuestionById,
    createAttempt,
    requestHint,
    socraticAttempt,
    revealAnswer
} = require('../controllers/practice.controller');

const router = express.Router();

router.use(authenticate);

router.post('/retrieve', retrieve);
router.post('/explain', explain);
router.post('/session-event', recordSessionEvent);
router.post('/detect-gap', detectGap);
const { debugGetEvents } = require('../controllers/gap.controller');
router.get('/session-events', debugGetEvents);
router.get('/misconceptions', requireRole('teacher'), getMisconceptions);
router.get('/chat-logs', getChatLogs); // explicitly mentioned no auth-gating required yet, but it falls under authenticate middleware

// Session endpoints
router.get('/sessions', getSessions);
router.get('/sessions/:sessionId', getSessionMessages);
router.post('/sessions', createSession);
router.put('/sessions/:sessionId/title', updateSessionTitle);
router.delete('/sessions/:sessionId', deleteSession);

// Practice endpoints
router.post('/practice-questions', createQuestion);
router.get('/practice-questions', getQuestions);
router.get('/practice-questions/:id', getQuestionById);
router.post('/practice-questions/:id/hint', requestHint);
router.post('/practice-questions/:id/socratic', socraticAttempt);
router.post('/practice-questions/:id/reveal', revealAnswer);
router.post('/practice-attempts', createAttempt);


// Ingestion Sub-layer A (Upload)
router.post('/ingest/upload', requireRole('teacher'), uploadMiddleware, handleUpload);
router.post('/ingest/generate-prerequisites', requireRole('teacher'), generatePrerequisites);

// Debug route for Accessing Batch
router.get('/ingest/batch/:batchId', requireRole('teacher'), (req, res) => {
    const batch = getBatch(req.params.batchId);
    if (!batch) return res.status(404).json({ error: 'Batch not found' });
    res.json(batch);
});

// Courses
// Courses
router.get('/courses', getCourses);
router.put('/courses/:courseName/status', requireRole('teacher'), updateCourseStatus);
router.get('/courses/:courseName/prerequisites', requireRole('teacher'), require('../controllers/course.controller').getPrerequisites);
router.put('/courses/:courseName/prerequisites', requireRole('teacher'), require('../controllers/course.controller').updatePrerequisites);
router.get('/courses/:courseName/artifacts', requireRole('teacher'), getArtifacts);

module.exports = router;
