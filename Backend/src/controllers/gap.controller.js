const prerequisites = require('../data/prerequisites.json');
const { getChunks } = require('../data/store');

// In-memory session log
const sessionEvents = [];

function recordSessionEvent(req, res) {
    const { student_id, chunk_id, correct } = req.body;

    if (!student_id || !chunk_id || typeof correct !== 'boolean') {
        return res.status(400).json({ error: "Missing required fields: student_id, chunk_id, correct (boolean)" });
    }

    const event = {
        student_id,
        chunk_id,
        correct,
        timestamp: new Date().toISOString()
    };

    sessionEvents.push(event);

    return res.json({ success: true, recorded: event });
}

function getLikelyGaps(student_id, chunk_id) {
    const prereqs = prerequisites[chunk_id] || [];
    if (prereqs.length === 0) return [];

    const studentHistory = sessionEvents.filter(e => e.student_id === student_id);
    const likely_gaps = [];

    for (const prereq_id of prereqs) {
        const eventsForPrereq = studentHistory.filter(e => e.chunk_id === prereq_id);

        if (eventsForPrereq.length === 0) {
            likely_gaps.push({ chunk_id: prereq_id, reason: "no evidence of mastery" });
            continue;
        }

        const mostRecentEvent = eventsForPrereq[eventsForPrereq.length - 1];
        const hasCorrectEvent = eventsForPrereq.some(e => e.correct === true);

        if (!mostRecentEvent.correct) {
            likely_gaps.push({ chunk_id: prereq_id, reason: "recent incorrect answer" });
        } else if (!hasCorrectEvent) {
            likely_gaps.push({ chunk_id: prereq_id, reason: "no evidence of mastery" });
        }
    }

    const chunks = getChunks();
    const enrichedGaps = likely_gaps.map(gap => {
        const chunkMatch = chunks.find(c => c.id === gap.chunk_id);
        return {
            chunk_id: gap.chunk_id,
            section_label: chunkMatch ? chunkMatch.section_label : "Unknown Concept",
            reason: gap.reason
        };
    });

    return enrichedGaps;
}

function detectGap(req, res) {
    const { student_id, chunk_id } = req.body;

    if (!student_id || !chunk_id) {
        return res.status(400).json({ error: "Missing required fields: student_id, chunk_id" });
    }

    const likely_gaps = getLikelyGaps(student_id, chunk_id);

    return res.json({
        target_chunk_id: chunk_id,
        likely_gaps
    });
}

// Exposed purely so we can inspect memory easily if needed
function getSessionEvents() {
    return sessionEvents;
}

function debugGetEvents(req, res) {
    res.json({ events: sessionEvents });
}

module.exports = {
    recordSessionEvent,
    detectGap,
    debugGetEvents,
    getLikelyGaps,
    getSessionEvents
};
