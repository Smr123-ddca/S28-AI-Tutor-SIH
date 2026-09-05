const retrievalService = require('../services/retrieval.service');

function retrieve(req, res) {
    const { question, course, subject } = req.body;
    const resolvedSubject = subject || course || null;

    if (!question || typeof question !== 'string') {
        return res.status(400).json({ error: 'Please provide a valid "question" string in the JSON payload.' });
    }

    const results = retrievalService.retrieve(question, { subject: resolvedSubject });

    // Response mapping specifically requested
    res.json({ results });
}

module.exports = {
    retrieve
};
