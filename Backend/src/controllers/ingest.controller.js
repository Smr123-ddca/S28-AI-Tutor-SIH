const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

// Sub-layer A Storage config
const TMP_DIR = path.join(__dirname, '../../data/ingest-uploads/tmp');
const BASE_UPLOAD_DIR = path.join(__dirname, '../../data/ingest-uploads');
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

// Ensure directories exist
if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
}

// Memory Registry for Batches
const batchRegistry = {};

const getBatch = (batchId) => {
    return batchRegistry[batchId];
};

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, TMP_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_'));
    }
});

const fileFilter = (req, file, cb) => {
    req.rejectedFiles = req.rejectedFiles || [];

    const ext = path.extname(file.originalname).toLowerCase();
    const isValidPdf = ext === '.pdf' && file.mimetype === 'application/pdf';
    const isValidPptx = ext === '.pptx' && file.mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

    if (!isValidPdf && !isValidPptx) {
        req.rejectedFiles.push({
            filename: file.originalname,
            reason: "unsupported file type"
        });
        return cb(null, false);
    }

    cb(null, true);
};

// Use multer instance
const upload = multer({
    storage,
    fileFilter
});

// Middleware array to inject into router
const uploadMiddleware = upload.array('files');

const handleUpload = async (req, res) => {
    try {
        const files = req.files || [];
        const rejectedFiles = req.rejectedFiles || [];

        // Identify oversized files among the accepted ones
        const validFiles = [];
        for (const file of files) {
            if (file.size > MAX_FILE_SIZE) {
                rejectedFiles.push({
                    filename: file.originalname,
                    reason: "file exceeds 20MB limit"
                });
                // Clean up the temp oversized file
                try {
                    fs.unlinkSync(file.path);
                } catch (e) { }
            } else {
                validFiles.push(file);
            }
        }

        if (validFiles.length === 0) {
            if (rejectedFiles.length > 0) {
                return res.status(400).json({
                    error: 'All files were rejected',
                    rejected: rejectedFiles
                });
            } else {
                return res.status(400).json({ error: 'No files provided in request' });
            }
        }

        // Generate batch ID and set up persistent directory
        const batchId = crypto.randomUUID();
        const batchDir = path.join(BASE_UPLOAD_DIR, batchId);

        fs.mkdirSync(batchDir, { recursive: true });

        const storedFilesMeta = [];

        try {
            for (const file of validFiles) {
                const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
                const destPath = path.join(batchDir, safeName);
                fs.renameSync(file.path, destPath);

                storedFilesMeta.push({
                    filename: safeName,
                    size: file.size,
                    status: 'stored',
                    storedPath: destPath
                });
            }
        } catch (error) {
            // Clean up the entire batch directory on any disk move/write failure
            fs.rmSync(batchDir, { recursive: true, force: true });
            throw error;
        }

        // Track in registry
        batchRegistry[batchId] = {
            batch_id: batchId,
            teacher_id: req.user.id,
            created_at: new Date().toISOString(),
            files: storedFilesMeta
        };

        const responsePayload = {
            batch_id: batchId,
            files: storedFilesMeta.map(f => ({
                filename: f.filename,
                size: f.size,
                status: f.status
            }))
        };

        if (rejectedFiles.length > 0) {
            responsePayload.rejected = rejectedFiles;
        }

        return res.status(200).json(responsePayload);

    } catch (error) {
        console.error('Ingestion Upload Error:', error);
        return res.status(500).json({ error: 'Internal server error during upload' });
    }
};

module.exports = {
    uploadMiddleware,
    handleUpload,
    getBatch
};
