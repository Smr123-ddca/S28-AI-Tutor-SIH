const retrievalService = require('../services/retrieval.service');

function retrieve(req, res) {
    const { question } = req.body;

    if (!question || typeof question !== 'string') {
        return res.status(400).json({ error: 'Please provide a valid "question" string in the JSON payload.' });
    }

    const results = retrievalService.retrieve(question);

    // Response mapping specifically requested
    res.json({ results });
}

module.exports = {
    retrieve
};
