const retrievalService = require('../services/retrieval.service');

async function retrieve(req, res) {
    const { question, course, subject } = req.body;
    const resolvedSubject = subject || course || null;

    if (!question || typeof question !== 'string') {
        return res.status(400).json({ error: 'Please provide a valid "question" string in the JSON payload.' });
    }

    try {
        const results = await retrievalService.retrieve(question, { subject: resolvedSubject });
        res.json({ results });
    } catch (err) {
        console.error("Retrieval failed:", err);
        res.status(500).json({ error: "Internal retrieval error" });
    }
}

module.exports = {
    retrieve
};
