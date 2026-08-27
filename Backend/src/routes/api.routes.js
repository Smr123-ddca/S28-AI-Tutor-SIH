const express = require('express');


// ============================================================
// CONTROLLERS
// ============================================================

const {
    getCourses
} = require('../controllers/course.controller');


const {
    retrieve
} = require('../controllers/retrieval.controller');


const {
    explain
} = require('../controllers/explain.controller');


const {
    recordSessionEvent,
    detectGap,
    debugGetEvents
} = require('../controllers/gap.controller');


const {
    getMisconceptions
} = require('../controllers/misconception.controller');


const {
    getChatLogs,
    getSessions,
    getSessionMessages,
    createSession,
    updateSessionTitle
} = require('../controllers/chatlog.controller');


const {
    authenticate,
    requireRole
} = require('../middleware/auth.middleware');


const {
    uploadMiddleware,
    handleUpload,
    generatePrerequisites,
    getBatch
} = require('../controllers/ingest.controller');


// ============================================================
// ROUTER
// ============================================================

const router =
    express.Router();


// ============================================================
// AUTHENTICATION
// ============================================================

router.use(
    authenticate
);


// ============================================================
// STUDENT / RAG
// ============================================================

router.post(
    '/retrieve',
    retrieve
);


router.post(
    '/explain',
    explain
);


// ============================================================
// COURSES
// ============================================================

router.get(
    '/courses',
    getCourses
);


// ============================================================
// GAP / MISCONCEPTION
// ============================================================

router.post(
    '/session-event',
    recordSessionEvent
);


router.post(
    '/detect-gap',
    detectGap
);


router.get(
    '/session-events',
    debugGetEvents
);


router.get(
    '/misconceptions',
    requireRole('teacher'),
    getMisconceptions
);


// ============================================================
// CHAT LOGS
// ============================================================

router.get(
    '/chat-logs',
    getChatLogs
);


// ============================================================
// SESSIONS
// ============================================================

router.get(
    '/sessions',
    getSessions
);


router.get(
    '/sessions/:sessionId',
    getSessionMessages
);


router.post(
    '/sessions',
    createSession
);


router.put(
    '/sessions/:sessionId/title',
    updateSessionTitle
);


// ============================================================
// INGESTION — UPLOAD
// ============================================================

router.post(
    '/ingest/upload',
    requireRole('teacher'),
    uploadMiddleware,
    handleUpload
);


// ============================================================
// INGESTION — GENERATE PREREQUISITES
// ============================================================

router.post(
    '/ingest/generate-prerequisites',
    requireRole('teacher'),
    generatePrerequisites
);


// ============================================================
// INGESTION — DEBUG BATCH
// ============================================================

router.get(
    '/ingest/batch/:batchId',
    requireRole('teacher'),
    (req, res) => {

        const batch =
            getBatch(
                req.params.batchId
            );


        if (!batch) {

            return res.status(404).json({

                error:
                    'Batch not found'

            });

        }


        res.json(
            batch
        );

    }
);


// ============================================================
// EXPORT
// ============================================================

module.exports = router;