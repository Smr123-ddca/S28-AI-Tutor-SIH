import { useState, useEffect } from 'react'


function TeacherDashboard({ session }) {

    // ============================================================
    // MISCONCEPTIONS
    // ============================================================

    const [misconceptions, setMisconceptions] =
        useState([])

    const [loading, setLoading] =
        useState(true)

    const [error, setError] =
        useState(null)


    // ============================================================
    // UPLOAD
    // ============================================================

    const [selectedFiles, setSelectedFiles] =
        useState([])

    const [uploading, setUploading] =
        useState(false)

    const [uploadStatus, setUploadStatus] =
        useState('')

    const [uploadError, setUploadError] =
        useState('')


    // ============================================================
    // PROCESSED COURSES
    // ============================================================

    const [uploadedCourses, setUploadedCourses] =
        useState([])


    // ============================================================
    // PREREQUISITES
    // ============================================================

    const [generatingCourse, setGeneratingCourse] =
        useState(null)

    const [prerequisiteStatus, setPrerequisiteStatus] =
        useState({})


    // ============================================================
    // FETCH MISCONCEPTIONS
    // ============================================================

    useEffect(() => {

        const fetchData = async () => {

            try {

                const response =
                    await fetch(
                        '/api/misconceptions',
                        {
                            headers: {
                                'Authorization':
                                    `Bearer ${session?.access_token}`
                            }
                        }
                    )


                if (!response.ok) {

                    throw new Error(
                        'API fetch failed'
                    )

                }


                const data =
                    await response.json()


                setMisconceptions(
                    data.misconceptions || []
                )


            } catch (err) {

                setError(
                    err.message
                )

            } finally {

                setLoading(
                    false
                )

            }

        }


        if (
            session?.access_token
        ) {

            fetchData()

        }

    }, [
        session?.access_token
    ])


    // ============================================================
    // FILE SELECTION
    // ============================================================

    const handleFileChange = (
        event
    ) => {

        const files =
            Array.from(
                event.target.files || []
            )


        setSelectedFiles(
            files
        )


        setUploadStatus(
            ''
        )


        setUploadError(
            ''
        )

    }


    // ============================================================
    // UPLOAD COURSE
    // ============================================================

    const handleUpload = async () => {

        if (
            selectedFiles.length === 0
        ) {

            setUploadError(
                'Please select at least one PDF or PPTX file.'
            )

            return

        }


        setUploading(
            true
        )


        setUploadStatus(
            'Uploading and creating chunks...'
        )


        setUploadError(
            ''
        )


        try {

            // ----------------------------------------------------
            // FORM DATA
            // ----------------------------------------------------

            const formData =
                new FormData()


            selectedFiles.forEach(
                file => {

                    formData.append(
                        'files',
                        file
                    )

                }
            )


            // ----------------------------------------------------
            // REQUEST
            // ----------------------------------------------------

            const response =
                await fetch(
                    '/api/ingest/upload',
                    {

                        method:
                            'POST',

                        headers: {

                            'Authorization':
                                `Bearer ${session?.access_token}`

                        },

                        body:
                            formData

                    }
                )


            // ----------------------------------------------------
            // RESPONSE
            // ----------------------------------------------------

            const data =
                await response.json()


            // ----------------------------------------------------
            // ERROR
            // ----------------------------------------------------

            if (
                !response.ok
            ) {

                throw new Error(
                    data.details ||
                    data.error ||
                    'Upload failed'
                )

            }


            // ----------------------------------------------------
            // COURSES
            // ----------------------------------------------------

            if (
                data.courses
            ) {

                setUploadedCourses(
                    data.courses
                )

            }


            // ----------------------------------------------------
            // SUCCESS
            // ----------------------------------------------------

            setUploadStatus(
                `✓ Upload successful. ${data.courses?.length || 0} course(s) processed and chunks created.`
            )


            setSelectedFiles(
                []
            )


            // ----------------------------------------------------
            // RESET INPUT
            // ----------------------------------------------------

            const input =
                document.getElementById(
                    'course-file-input'
                )


            if (input) {

                input.value =
                    ''

            }


        } catch (
            err
        ) {

            console.error(
                'Upload error:',
                err
            )


            setUploadError(
                err.message
            )


            setUploadStatus(
                ''
            )

        } finally {

            setUploading(
                false
            )

        }

    }


    // ============================================================
    // GENERATE PREREQUISITES
    // ============================================================

    const handleGeneratePrerequisites =
        async (
            courseName
        ) => {

            setGeneratingCourse(
                courseName
            )


            setPrerequisiteStatus(
                prev => ({

                    ...prev,

                    [courseName]:
                        'Generating prerequisites with Gemini...'

                })
            )


            try {

                const response =
                    await fetch(
                        '/api/ingest/generate-prerequisites',
                        {

                            method:
                                'POST',

                            headers: {

                                'Authorization':
                                    `Bearer ${session?.access_token}`,

                                'Content-Type':
                                    'application/json'

                            },

                            body:
                                JSON.stringify({
                                    courseName
                                })

                        }
                    )


                const data =
                    await response.json()


                if (
                    !response.ok
                ) {

                    throw new Error(
                        data.details ||
                        data.error ||
                        'Prerequisite generation failed'
                    )

                }


                // ------------------------------------------------
                // SUCCESS
                // ------------------------------------------------

                setPrerequisiteStatus(
                    prev => ({

                        ...prev,

                        [courseName]:
                            `✓ Prerequisites generated successfully for ${courseName}.`

                    })
                )


                // ------------------------------------------------
                // UPDATE COURSE STATUS
                // ------------------------------------------------

                setUploadedCourses(
                    prev =>
                        prev.map(
                            course => {

                                if (
                                    course.name ===
                                    courseName
                                ) {

                                    return {

                                        ...course,

                                        prerequisite_status:
                                            'generated'

                                    }

                                }


                                return course

                            }
                        )
                )


            } catch (
                err
            ) {

                console.error(
                    'Prerequisite generation error:',
                    err
                )


                setPrerequisiteStatus(
                    prev => ({

                        ...prev,

                        [courseName]:
                            `❌ ${err.message}`

                    })
                )

            } finally {

                setGeneratingCourse(
                    null
                )

            }

        }


    // ============================================================
    // LOADING
    // ============================================================

    if (
        loading
    ) {

        return (

            <div
                style={{
                    color:
                        'var(--text-secondary)'
                }}
            >

                Loading dashboard data...

            </div>

        )

    }


    // ============================================================
    // ERROR
    // ============================================================

    if (
        error
    ) {

        return (

            <div
                style={{
                    color:
                        'var(--red)'
                }}
            >

                Error: {error}

            </div>

        )

    }


    // ============================================================
    // SORT MISCONCEPTIONS
    // ============================================================

    const sorted =
        [...misconceptions].sort(
            (a, b) =>
                b.incorrect_rate -
                a.incorrect_rate
        )


    // ============================================================
    // UI
    // ============================================================

    return (

        <div>


            {/* ====================================================
                COURSE UPLOAD
            ==================================================== */}

            <div
                style={{
                    background:
                        '#ffffff',

                    border:
                        '1px solid #e5e7eb',

                    borderRadius:
                        '16px',

                    padding:
                        '1.5rem',

                    marginBottom:
                        '2rem',

                    boxShadow:
                        '0 4px 6px -1px rgba(0,0,0,0.05)'
                }}
            >


                <h2
                    style={{
                        color:
                            'var(--text-primary)',

                        marginTop:
                            0
                    }}
                >

                    Upload Course Material

                </h2>


                <p
                    style={{
                        color:
                            'var(--text-secondary)',

                        marginBottom:
                            '1rem'
                    }}
                >

                    Upload a PDF or PowerPoint course file.
                    The system will extract the material
                    and create chunks. You can then generate
                    prerequisites separately.

                </p>


                {/* =================================================
                    FILE INPUT
                ================================================= */}

                <input
                    id="course-file-input"
                    type="file"
                    accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                    multiple
                    onChange={
                        handleFileChange
                    }
                    disabled={
                        uploading
                    }
                />


                {/* =================================================
                    SELECTED FILES
                ================================================= */}

                {
                    selectedFiles.length > 0 && (

                        <div
                            style={{
                                marginTop:
                                    '1rem',

                                marginBottom:
                                    '1rem'
                            }}
                        >

                            <strong>
                                Selected files:
                            </strong>


                            <ul>

                                {
                                    selectedFiles.map(
                                        (
                                            file,
                                            index
                                        ) => (

                                            <li
                                                key={
                                                    index
                                                }
                                            >

                                                {file.name}

                                            </li>

                                        )
                                    )
                                }

                            </ul>

                        </div>

                    )
                }


                {/* =================================================
                    UPLOAD BUTTON
                ================================================= */}

                <button
                    onClick={
                        handleUpload
                    }
                    disabled={
                        uploading ||
                        selectedFiles.length === 0
                    }
                    style={{
                        marginTop:
                            '0.5rem',

                        padding:
                            '0.7rem 1.2rem',

                        border:
                            'none',

                        borderRadius:
                            '8px',

                        background:
                            uploading
                                ? '#9ca3af'
                                : '#2563eb',

                        color:
                            '#ffffff',

                        fontWeight:
                            '600',

                        cursor:
                            uploading
                                ? 'not-allowed'
                                : 'pointer'
                    }}
                >

                    {
                        uploading
                            ? 'Processing...'
                            : 'Upload Course'
                    }

                </button>


                {/* =================================================
                    UPLOAD STATUS
                ================================================= */}

                {
                    uploadStatus && (

                        <div
                            style={{
                                marginTop:
                                    '1rem',

                                color:
                                    'green',

                                fontWeight:
                                    '600'
                            }}
                        >

                            {uploadStatus}

                        </div>

                    )
                }


                {/* =================================================
                    UPLOAD ERROR
                ================================================= */}

                {
                    uploadError && (

                        <div
                            style={{
                                marginTop:
                                    '1rem',

                                color:
                                    'var(--red)',

                                fontWeight:
                                    '600'
                            }}
                        >

                            {uploadError}

                        </div>

                    )
                }


                {/* =================================================
                    UPLOADED COURSES
                ================================================= */}

                {
                    uploadedCourses.length > 0 && (

                        <div
                            style={{
                                marginTop:
                                    '1.5rem',

                                borderTop:
                                    '1px solid #e5e7eb',

                                paddingTop:
                                    '1.5rem'
                            }}
                        >


                            <h3
                                style={{
                                    marginTop:
                                        0,

                                    color:
                                        'var(--text-primary)'
                                }}
                            >

                                Uploaded Courses

                            </h3>


                            {
                                uploadedCourses.map(
                                    course => (

                                        <div
                                            key={
                                                course.name
                                            }
                                            style={{
                                                display:
                                                    'flex',

                                                alignItems:
                                                    'center',

                                                justifyContent:
                                                    'space-between',

                                                gap:
                                                    '1rem',

                                                padding:
                                                    '1rem',

                                                marginBottom:
                                                    '0.75rem',

                                                border:
                                                    '1px solid #e5e7eb',

                                                borderRadius:
                                                    '10px'
                                            }}
                                        >


                                            {/* COURSE INFO */}

                                            <div>

                                                <strong>
                                                    {course.name}
                                                </strong>


                                                <div
                                                    style={{
                                                        color:
                                                            'var(--text-secondary)',

                                                        fontSize:
                                                            '0.9rem',

                                                        marginTop:
                                                            '0.25rem'
                                                    }}
                                                >

                                                    {
                                                        course.total_chunks
                                                    }
                                                    {' '}
                                                    chunks created

                                                </div>


                                                {
                                                    prerequisiteStatus[
                                                        course.name
                                                    ] && (

                                                        <div
                                                            style={{
                                                                marginTop:
                                                                    '0.5rem',

                                                                color:
                                                                    prerequisiteStatus[
                                                                        course.name
                                                                    ].startsWith(
                                                                        '✓'
                                                                    )
                                                                        ? 'green'
                                                                        : prerequisiteStatus[
                                                                            course.name
                                                                        ].startsWith(
                                                                            '❌'
                                                                        )
                                                                            ? 'var(--red)'
                                                                            : 'var(--text-secondary)'
                                                            }}
                                                        >

                                                            {
                                                                prerequisiteStatus[
                                                                    course.name
                                                                ]
                                                            }

                                                        </div>

                                                    )
                                                }

                                            </div>


                                            {/* GENERATE BUTTON */}

                                            <button
                                                onClick={() =>
                                                    handleGeneratePrerequisites(
                                                        course.name
                                                    )
                                                }
                                                disabled={
                                                    generatingCourse ===
                                                    course.name
                                                }
                                                style={{
                                                    padding:
                                                        '0.7rem 1.2rem',

                                                    border:
                                                        'none',

                                                    borderRadius:
                                                        '8px',

                                                    background:
                                                        generatingCourse ===
                                                        course.name
                                                            ? '#9ca3af'
                                                            : '#16a34a',

                                                    color:
                                                        'white',

                                                    fontWeight:
                                                        '600',

                                                    cursor:
                                                        generatingCourse ===
                                                        course.name
                                                            ? 'not-allowed'
                                                            : 'pointer'
                                                }}
                                            >

                                                {
                                                    generatingCourse ===
                                                    course.name
                                                        ? 'Generating...'
                                                        : course.prerequisite_status ===
                                                          'generated'
                                                            ? 'Regenerate Prerequisites'
                                                            : 'Generate Prerequisites'
                                                }

                                            </button>


                                        </div>

                                    )
                                )
                            }


                        </div>

                    )
                }


            </div>


            {/* ====================================================
                MISCONCEPTIONS
            ==================================================== */}

            <h2
                style={{
                    color:
                        'var(--text-primary)',

                    marginTop:
                        0,

                    fontSize:
                        '2.5rem'
                }}
            >

                Class Misconceptions

            </h2>


            <p
                style={{
                    color:
                        'var(--text-secondary)',

                    marginBottom:
                        '2rem',

                    fontSize:
                        '1.1rem',

                    fontWeight:
                        500
                }}
            >

                Overview of topics where students struggle.
                Rows exceeding 40% fail rate are highlighted.

            </p>


            {/* ====================================================
                NO DATA
            ==================================================== */}

            {
                misconceptions.length === 0 ? (

                    <div
                        style={{
                            color:
                                'var(--text-secondary)'
                        }}
                    >

                        No class data available yet.
                        Please interact with the student chat
                        using different IDs to populate data.

                    </div>

                ) : (


                    <table>

                        <thead>

                            <tr>

                                <th>
                                    Topic
                                </th>

                                <th>
                                    Incorrect Rate
                                </th>

                                <th>
                                    Attempts
                                </th>

                                <th>
                                    Most Common Root Cause
                                </th>

                            </tr>

                        </thead>


                        <tbody>

                            {
                                sorted.map(
                                    item => {

                                        const isHigh =
                                            item.incorrect_rate >
                                            0.4


                                        return (

                                            <tr
                                                key={
                                                    item.chunk_id
                                                }
                                                className={
                                                    isHigh
                                                        ? 'row-alert'
                                                        : ''
                                                }
                                            >

                                                <td>
                                                    {
                                                        item.section_label
                                                    }
                                                </td>


                                                <td>

                                                    <strong
                                                        style={{
                                                            color:
                                                                isHigh
                                                                    ? 'var(--red)'
                                                                    : 'inherit'
                                                        }}
                                                    >

                                                        {
                                                            (
                                                                item.incorrect_rate *
                                                                100
                                                            ).toFixed(
                                                                1
                                                            )
                                                        }%

                                                    </strong>

                                                </td>


                                                <td>
                                                    {
                                                        item.total_attempts
                                                    }
                                                </td>


                                                <td>

                                                    {
                                                        item.most_common_gap
                                                            ? (

                                                                <div>

                                                                    {
                                                                        item
                                                                            .most_common_gap
                                                                            .section_label
                                                                    }

                                                                    <small
                                                                        style={{
                                                                            marginLeft:
                                                                                '0.5rem',

                                                                            color:
                                                                                isHigh
                                                                                    ? 'var(--red)'
                                                                                    : 'var(--text-secondary)'
                                                                        }}
                                                                    >

                                                                        (
                                                                        {
                                                                            item
                                                                                .most_common_gap
                                                                                .frequency
                                                                        }
                                                                        x)

                                                                    </small>

                                                                </div>

                                                            )
                                                            : (
                                                                '—'
                                                            )
                                                    }

                                                </td>


                                            </tr>

                                        )

                                    }
                                )
                            }

                        </tbody>

                    </table>

                )

            }


        </div>

    )

}


export default TeacherDashboard