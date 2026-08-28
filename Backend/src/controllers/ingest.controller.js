const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { execFile } = require('child_process');


// ============================================================
// PATHS
// ============================================================

const TMP_DIR = path.join(
    __dirname,
    '../../data/ingest-uploads/tmp'
);

const BASE_UPLOAD_DIR = path.join(
    __dirname,
    '../../data/ingest-uploads'
);

const DATA_DIR = path.join(
    __dirname,
    '../data'
);

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB


// ============================================================
// PYTHON VIRTUAL ENVIRONMENT
// ============================================================

const PYTHON_PATH = 'python';

console.log('🐍 Python executable:', PYTHON_PATH);
console.log(
    '🐍 Python exists:',
    fs.existsSync(PYTHON_PATH)
);


// ============================================================
// ENSURE DIRECTORIES EXIST
// ============================================================

if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, {
        recursive: true
    });
}

if (!fs.existsSync(BASE_UPLOAD_DIR)) {
    fs.mkdirSync(BASE_UPLOAD_DIR, {
        recursive: true
    });
}

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, {
        recursive: true
    });
}


// ============================================================
// MEMORY REGISTRY FOR BATCHES
// ============================================================

const batchRegistry = {};

const getBatch = (batchId) => {
    return batchRegistry[batchId];
};


// ============================================================
// MULTER STORAGE
// ============================================================

const storage = multer.diskStorage({

    destination: (req, file, cb) => {

        cb(
            null,
            TMP_DIR
        );

    },

    filename: (req, file, cb) => {

        const uniqueSuffix =
            Date.now() +
            '-' +
            Math.round(
                Math.random() * 1E9
            );

        const safeName =
            file.originalname.replace(
                /[^a-zA-Z0-9.\-_]/g,
                '_'
            );

        cb(
            null,
            uniqueSuffix +
            '-' +
            safeName
        );

    }

});


// ============================================================
// FILE FILTER
// ============================================================

const fileFilter = (
    req,
    file,
    cb
) => {

    req.rejectedFiles =
        req.rejectedFiles || [];

    const ext =
        path.extname(
            file.originalname
        ).toLowerCase();

    const isValidPdf =
        ext === '.pdf' &&
        file.mimetype === 'application/pdf';

    const isValidPptx =
        ext === '.pptx' &&
        file.mimetype ===
        'application/vnd.openxmlformats-officedocument.presentationml.presentation';

    if (
        !isValidPdf &&
        !isValidPptx
    ) {

        req.rejectedFiles.push({
            filename:
                file.originalname,

            reason:
                'unsupported file type'
        });

        return cb(
            null,
            false
        );
    }

    cb(
        null,
        true
    );
};


// ============================================================
// MULTER
// ============================================================

const upload = multer({

    storage,

    fileFilter

});


// ============================================================
// UPLOAD MIDDLEWARE
// ============================================================

const uploadMiddleware =
    upload.array('files');


// ============================================================
// RUN PYTHON CHUNKING
// ============================================================

function runChunking(pdfPath) {

    return new Promise(
        (resolve, reject) => {

            const scriptPath =
                path.join(
                    __dirname,
                    '../../python/chunking.py'
                );


            console.log(
                '\n=========================================='
            );

            console.log(
                '🐍 STARTING PYTHON CHUNKING'
            );

            console.log(
                '=========================================='
            );

            console.log(
                'PDF:',
                pdfPath
            );

            console.log(
                'Script:',
                scriptPath
            );

            console.log(
                'Python:',
                PYTHON_PATH
            );


            // ----------------------------------------------------
            // CHECK PYTHON
            // ----------------------------------------------------

            if (PYTHON_PATH !== 'python' && false) {
                return reject(
                    new Error(
                        `Python executable not found: ${PYTHON_PATH}`
                    )
                );
            }


            // ----------------------------------------------------
            // CHECK SCRIPT
            // ----------------------------------------------------

            if (
                !fs.existsSync(
                    scriptPath
                )
            ) {

                return reject(
                    new Error(
                        `Chunking script not found: ${scriptPath}`
                    )
                );

            }


            // ----------------------------------------------------
            // EXECUTE
            // ----------------------------------------------------

            execFile(

                PYTHON_PATH,

                [
                    scriptPath,
                    pdfPath
                ],

                {

                    cwd:
                        path.join(
                            __dirname,
                            '../..'
                        ),

                    encoding:
                        'utf8',

                    maxBuffer:
                        50 * 1024 * 1024,

                    windowsHide:
                        true,

                    env: {
                        ...process.env,

                        PYTHONIOENCODING:
                            'utf-8'
                    }

                },

                (
                    error,
                    stdout,
                    stderr
                ) => {

                    // ------------------------------------------------
                    // LOG STDERR
                    // ------------------------------------------------

                    if (stderr) {

                        console.log(
                            'Python chunking log:',
                            stderr
                        );

                    }


                    // ------------------------------------------------
                    // HANDLE ERROR
                    // ------------------------------------------------

                    if (error) {

                        console.error(
                            '❌ Chunking failed'
                        );

                        console.error(
                            error
                        );

                        return reject(
                            new Error(
                                stderr ||
                                error.message
                            )
                        );

                    }


                    // ------------------------------------------------
                    // CHECK OUTPUT
                    // ------------------------------------------------

                    if (
                        !stdout ||
                        !stdout.trim()
                    ) {

                        return reject(
                            new Error(
                                'Chunking returned empty output.'
                            )
                        );

                    }


                    // ------------------------------------------------
                    // PARSE JSON
                    // ------------------------------------------------

                    try {

                        const chunks =
                            JSON.parse(
                                stdout.trim()
                            );


                        if (
                            !Array.isArray(
                                chunks
                            )
                        ) {

                            throw new Error(
                                'Chunking output is not an array.'
                            );

                        }


                        console.log(
                            `✅ Chunking created ${chunks.length} chunks`
                        );


                        // ------------------------------------------------
                        // IMPORTANT
                        // ------------------------------------------------

                        if (
                            chunks.length === 0
                        ) {

                            return reject(
                                new Error(
                                    'Chunking completed but created 0 chunks. Document might be empty.'
                                )
                            );

                        }

                        // ------------------------------------------------
                        // VALIDATE CHUNK SCHEMA
                        // ------------------------------------------------
                        const idSet = new Set();
                        for (const chunk of chunks) {
                            if (!chunk.id || typeof chunk.id !== 'string' || chunk.id.trim() === '') {
                                throw new Error('Schema validation failed: Found chunk with missing or empty ID.');
                            }

                            if (idSet.has(chunk.id)) {
                                throw new Error(`Schema validation failed: Duplicate chunk ID detected (${chunk.id}).`);
                            }
                            idSet.add(chunk.id);

                            if (!chunk.text || typeof chunk.text !== 'string' || chunk.text.trim() === '') {
                                throw new Error(`Schema validation failed: Chunk ${chunk.id} has empty textbook text.`);
                            }

                            if (typeof chunk.chunk_index !== 'number' || isNaN(chunk.chunk_index)) {
                                throw new Error(`Schema validation failed: Chunk ${chunk.id} is missing a native chunk_index.`);
                            }

                            // Check for invalid undefined or object mapping leaking from python output natively
                            for (const key of Object.keys(chunk)) {
                                if (chunk[key] === undefined || (typeof chunk[key] === 'string' && chunk[key].includes('NaN'))) {
                                    throw new Error(`Schema validation failed: Chunk ${chunk.id} contains invalid JSON parameters.`);
                                }
                            }
                        }

                        resolve(
                            chunks
                        );

                    } catch (
                    parseError
                    ) {

                        console.error(
                            '❌ Failed to parse or validate chunking output'
                        );

                        console.error(
                            parseError.message
                        );

                        reject(
                            new Error(
                                parseError.message || 'Chunking returned invalid JSON.'
                            )
                        );

                    }

                }

            );

        }
    );

}


// ============================================================
// RUN PYTHON PREREQUISITES
// ============================================================

function runPrerequisites(
    courseName
) {

    return new Promise(
        (resolve, reject) => {

            const scriptPath =
                path.join(
                    __dirname,
                    '../../python/prerequisites.py'
                );


            console.log(
                '\n=========================================='
            );

            console.log(
                '🤖 STARTING PREREQUISITE GENERATION'
            );

            console.log(
                '=========================================='
            );

            console.log(
                'Course:',
                courseName
            );

            console.log(
                'Python:',
                PYTHON_PATH
            );

            console.log(
                'Script:',
                scriptPath
            );


            // ------------------------------------------------
            // CHECK PYTHON
            // ------------------------------------------------

            if (PYTHON_PATH !== 'python' && false) {
                return reject(
                    new Error(
                        `Python executable not found: ${PYTHON_PATH}`
                    )
                );
            }


            // ------------------------------------------------
            // CHECK SCRIPT
            // ------------------------------------------------

            if (
                !fs.existsSync(
                    scriptPath
                )
            ) {

                return reject(
                    new Error(
                        `Prerequisites script not found: ${scriptPath}`
                    )
                );

            }


            // ------------------------------------------------
            // EXECUTE PYTHON
            // ------------------------------------------------

            execFile(

                PYTHON_PATH,

                [
                    scriptPath,
                    courseName
                ],

                {

                    cwd:
                        path.join(
                            __dirname,
                            '../..'
                        ),

                    encoding:
                        'utf8',

                    maxBuffer:
                        50 * 1024 * 1024,

                    windowsHide:
                        true,

                    env: {
                        ...process.env,

                        PYTHONIOENCODING:
                            'utf-8'
                    }

                },

                (
                    error,
                    stdout,
                    stderr
                ) => {

                    // ------------------------------------------------
                    // LOG STDERR
                    // ------------------------------------------------

                    if (stderr) {

                        console.log(
                            'Prerequisite log:',
                            stderr
                        );

                    }


                    // ------------------------------------------------
                    // HANDLE PYTHON ERROR
                    // ------------------------------------------------

                    if (error) {

                        console.error(
                            '❌ Prerequisite generation failed'
                        );

                        console.error(
                            error
                        );

                        return reject(
                            new Error(
                                stderr ||
                                error.message
                            )
                        );

                    }


                    // ------------------------------------------------
                    // CHECK OUTPUT
                    // ------------------------------------------------

                    if (
                        !stdout ||
                        !stdout.trim()
                    ) {

                        return reject(
                            new Error(
                                'Prerequisite script returned empty output.'
                            )
                        );

                    }


                    // ------------------------------------------------
                    // PARSE JSON
                    // ------------------------------------------------

                    try {

                        const result =
                            JSON.parse(
                                stdout.trim()
                            );


                        if (
                            result.status !==
                            'success'
                        ) {

                            throw new Error(
                                result.error ||
                                'Prerequisite generation failed.'
                            );

                        }


                        console.log(
                            '✅ Prerequisites generated'
                        );


                        resolve(
                            result
                        );

                    } catch (
                    parseError
                    ) {

                        console.error(
                            '❌ Invalid prerequisite output'
                        );

                        console.error(
                            stdout
                        );

                        reject(
                            new Error(
                                'Prerequisites returned invalid JSON.'
                            )
                        );

                    }

                }

            );

        }
    );

}


// ============================================================
// UPDATE COURSES REGISTRY
// ============================================================

function updateCoursesRegistry(
    courseName,
    pdfFilename
) {

    const coursesPath =
        path.join(
            DATA_DIR,
            'courses.json'
        );


    let courses = [];


    // ------------------------------------------------
    // READ EXISTING COURSES
    // ------------------------------------------------

    if (
        fs.existsSync(
            coursesPath
        )
    ) {

        try {

            courses =
                JSON.parse(
                    fs.readFileSync(
                        coursesPath,
                        'utf8'
                    )
                );

        } catch (
        error
        ) {

            console.error(
                '❌ Failed to read courses.json'
            );

            throw error;

        }

    }


    // ------------------------------------------------
    // COURSE NAME
    // ------------------------------------------------

    const existingIndex =
        courses.findIndex(
            course =>
                course.name ===
                courseName
        );


    // ------------------------------------------------
    // ENTRY
    // ------------------------------------------------

    const courseEntry = {
        name: courseName,
        pdf: pdfFilename,
        chunks: `${courseName}_chunks.json`,
        prerequisites: `${courseName}_prerequisites.json`,
        status: 'pending_review'
    };

    // ------------------------------------------------
    // UPDATE OR ADD
    // ------------------------------------------------

    if (
        existingIndex >= 0
    ) {

        courses[
            existingIndex
        ] = courseEntry;

    } else {

        courses.push(
            courseEntry
        );

    }


    // ------------------------------------------------
    // SAVE
    // ------------------------------------------------

    fs.writeFileSync(

        coursesPath,

        JSON.stringify(
            courses,
            null,
            2
        ),

        'utf8'

    );


    console.log(
        '✅ courses.json updated'
    );


    return courseEntry;

}


// ============================================================
// HANDLE UPLOAD
// ============================================================

const handleUpload = async (
    req,
    res
) => {

    let batchDir = null;

    try {

        const files =
            req.files || [];

        const rejectedFiles =
            req.rejectedFiles || [];


        // ====================================================
        // VALIDATE FILES
        // ====================================================

        const validFiles = [];


        for (
            const file of files
        ) {

            if (
                file.size >
                MAX_FILE_SIZE
            ) {

                rejectedFiles.push({

                    filename:
                        file.originalname,

                    reason:
                        'file exceeds 20MB limit'

                });


                try {

                    fs.unlinkSync(
                        file.path
                    );

                } catch (
                e
                ) { }

            } else {

                validFiles.push(
                    file
                );

            }

        }


        // ====================================================
        // NO VALID FILES
        // ====================================================

        if (
            validFiles.length === 0
        ) {

            if (
                rejectedFiles.length > 0
            ) {

                return res.status(400).json({

                    error:
                        'All files were rejected',

                    rejected:
                        rejectedFiles

                });

            }


            return res.status(400).json({

                error:
                    'No files provided in request'

            });

        }


        // ====================================================
        // CREATE BATCH
        // ====================================================

        const batchId =
            crypto.randomUUID();


        batchDir =
            path.join(
                BASE_UPLOAD_DIR,
                batchId
            );


        fs.mkdirSync(
            batchDir,
            {
                recursive: true
            }
        );


        const storedFilesMeta = [];


        // ====================================================
        // MOVE FILES
        // ====================================================

        for (
            const file of validFiles
        ) {

            const safeName =
                file.originalname.replace(
                    /[^a-zA-Z0-9.\-_]/g,
                    '_'
                );


            const destPath =
                path.join(
                    batchDir,
                    safeName
                );


            fs.renameSync(
                file.path,
                destPath
            );


            storedFilesMeta.push({

                filename:
                    safeName,

                size:
                    file.size,

                status:
                    'stored',

                storedPath:
                    destPath

            });

        }


        // ====================================================
        // PROCESS COURSES
        // ====================================================

        const processedCourses = [];


        for (
            const file of storedFilesMeta
        ) {

            const pdfPath =
                file.storedPath;


            // ------------------------------------------------
            // COURSE NAME
            // ------------------------------------------------

            const courseName =
                path.basename(
                    file.filename,
                    path.extname(
                        file.filename
                    )
                ).trim();


            console.log(
                '\n📚 Processing course:',
                courseName
            );


            // =================================================
            // 1. RUN CHUNKING
            // =================================================

            const chunks =
                await runChunking(
                    pdfPath
                );


            // =================================================
            // 2. SAVE CHUNKS
            // =================================================

            const chunksPath =
                path.join(
                    DATA_DIR,
                    `${courseName}_chunks.json`
                );


            fs.writeFileSync(

                chunksPath,

                JSON.stringify(
                    chunks,
                    null,
                    2
                ),

                'utf8'

            );


            console.log(
                '✅ Chunks saved:',
                chunksPath
            );


            // =================================================
            // 3. UPDATE COURSES REGISTRY
            // =================================================

            const courseEntry =
                updateCoursesRegistry(
                    courseName,
                    file.filename
                );


            // =================================================
            // 4. DO NOT GENERATE PREREQUISITES HERE
            // =================================================

            processedCourses.push({

                ...courseEntry,

                total_chunks:
                    chunks.length,

                prerequisite_status:
                    'pending'

            });

        }


        // ====================================================
        // SAVE BATCH REGISTRY
        // ====================================================

        batchRegistry[
            batchId
        ] = {

            batch_id:
                batchId,

            teacher_id:
                req.user.id,

            created_at:
                new Date().toISOString(),

            files:
                storedFilesMeta

        };


        // ====================================================
        // RESPONSE
        // ====================================================

        const responsePayload = {

            batch_id:
                batchId,

            files:
                storedFilesMeta.map(
                    file => ({

                        filename:
                            file.filename,

                        size:
                            file.size,

                        status:
                            file.status

                    })
                ),

            courses:
                processedCourses

        };


        if (
            rejectedFiles.length > 0
        ) {

            responsePayload.rejected =
                rejectedFiles;

        }


        return res.status(200).json(
            responsePayload
        );


    } catch (
    error
    ) {

        console.error(
            '\n❌ INGESTION UPLOAD ERROR'
        );

        console.error(
            error
        );


        // ====================================================
        // CLEAN BATCH
        // ====================================================

        if (
            batchDir
        ) {

            try {

                fs.rmSync(
                    batchDir,
                    {
                        recursive: true,
                        force: true
                    }
                );

            } catch (
            cleanupError
            ) {

                console.error(
                    'Cleanup error:',
                    cleanupError
                );

            }

        }


        return res.status(500).json({

            error:
                'Internal server error during upload',

            details:
                error.message

        });

    }

};


// ============================================================
// GENERATE PREREQUISITES ENDPOINT
// ============================================================

const generatePrerequisites = async (
    req,
    res
) => {

    try {

        const courseName =
            req.body?.courseName?.trim();


        // ====================================================
        // VALIDATE COURSE
        // ====================================================

        if (
            !courseName
        ) {

            return res.status(400).json({

                error:
                    'Course name is required'

            });

        }


        console.log(
            '\n=========================================='
        );

        console.log(
            '🤖 GENERATE PREREQUISITES REQUEST'
        );

        console.log(
            '=========================================='
        );

        console.log(
            'Course:',
            courseName
        );


        // ====================================================
        // CHECK CHUNKS
        // ====================================================

        const chunksPath =
            path.join(
                DATA_DIR,
                `${courseName}_chunks.json`
            );


        if (
            !fs.existsSync(
                chunksPath
            )
        ) {

            return res.status(404).json({

                error:
                    `Chunks file not found for course: ${courseName}`,

                path:
                    chunksPath

            });

        }


        // ====================================================
        // READ CHUNKS
        // ====================================================

        let chunks;


        try {

            chunks =
                JSON.parse(
                    fs.readFileSync(
                        chunksPath,
                        'utf8'
                    )
                );

        } catch (
        error
        ) {

            return res.status(500).json({

                error:
                    'Failed to read chunks file',

                details:
                    error.message

            });

        }


        if (
            !Array.isArray(
                chunks
            ) ||
            chunks.length === 0
        ) {

            return res.status(400).json({

                error:
                    'The course has no chunks. Cannot generate prerequisites.'

            });

        }


        console.log(
            `📦 Found ${chunks.length} chunks`
        );


        // ====================================================
        // RUN PREREQUISITES.PY
        // ====================================================

        const result =
            await runPrerequisites(
                courseName
            );


        // ====================================================
        // RETURN SUCCESS
        // ====================================================

        return res.status(200).json({

            status:
                'success',

            message:
                'Prerequisites generated successfully.',

            course:
                courseName,

            total_chunks:
                result.total_chunks,

            output:
                result.output

        });


    } catch (
    error
    ) {

        console.error(
            '❌ Generate prerequisites error:',
            error
        );


        return res.status(500).json({

            error:
                'Failed to generate prerequisites.',

            details:
                error.message

        });

    }

};


// ============================================================
// EXPORTS
// ============================================================

module.exports = {

    uploadMiddleware,

    handleUpload,

    generatePrerequisites,

    getBatch

};