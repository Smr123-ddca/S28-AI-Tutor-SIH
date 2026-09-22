const video =
    document.getElementById("camera");

const canvas =
    document.getElementById("captureCanvas");

const startBtn =
    document.getElementById("startBtn");

const selectBoardBtn =
    document.getElementById(
        "selectBoardBtn"
    );

const confirmBoardBtn =
    document.getElementById(
        "confirmBoardBtn"
    );

const endBtn =
    document.getElementById("endBtn");

const readBoardBtn =
    document.getElementById(
        "readBoardBtn"
    );

const generatePdfBtn =
    document.getElementById(
        "generatePdfBtn"
    );

const generatePptBtn =
    document.getElementById(
        "generatePptBtn"
    );

const newClassBtn =
    document.getElementById(
        "newClassBtn"
    );

const statusText =
    document.getElementById(
        "statusText"
    );

const statusDot =
    document.getElementById(
        "statusDot"
    );

const sessionText =
    document.getElementById(
        "sessionText"
    );

const frameCountText =
    document.getElementById(
        "frameCount"
    );

const captureStatus =
    document.getElementById(
        "captureStatus"
    );

const cameraPlaceholder =
    document.getElementById(
        "cameraPlaceholder"
    );

const selectionBox =
    document.getElementById(
        "selectionBox"
    );

const selectionInstructions =
    document.getElementById(
        "selectionInstructions"
    );

const result =
    document.getElementById(
        "result"
    );

const resultText =
    document.getElementById(
        "resultText"
    );

const aiResult =
    document.getElementById(
        "aiResult"
    );

const boardContent =
    document.getElementById(
        "boardContent"
    );


let stream = null;

let sessionId = null;

let capturing = false;

let frameCount = 0;

let captureTimer = null;

let selectingBoard = false;

let boardRegion = null;

let selectionStart = null;


// --------------------------------------------------
// CAMERA
// --------------------------------------------------

async function startCamera() {

    try {

        stream =
            await navigator.mediaDevices
                .getUserMedia({

                    video: {

                        facingMode:
                            "environment",

                        width: {
                            ideal: 1280
                        },

                        height: {
                            ideal: 720
                        }

                    },

                    audio: false

                });


        video.srcObject =
            stream;

        cameraPlaceholder
            .classList
            .add("hidden");

        await video.play();

        return true;

    }

    catch (error) {

        console.error(
            "Camera error:",
            error
        );

        statusText.innerText =
            "Could not access camera";

        statusDot
            .classList
            .add("error");

        alert(
            "Camera access was denied. " +
            "Please allow camera access."
        );

        return false;
    }
}


// --------------------------------------------------
// STOP CAMERA
// --------------------------------------------------

function stopCamera() {

    if (!stream) {
        return;
    }

    stream
        .getTracks()
        .forEach(
            track => track.stop()
        );

    video.srcObject = null;

    stream = null;

    cameraPlaceholder
        .classList
        .remove("hidden");
}


// --------------------------------------------------
// START CLASS
// --------------------------------------------------

async function startClass() {

    startBtn.disabled = true;

    statusText.innerText =
        "Starting camera...";


    const cameraStarted =
        await startCamera();


    if (!cameraStarted) {

        startBtn.disabled = false;

        return;
    }


    try {

        const response =
            await fetch(
                "/start-class",
                {
                    method: "POST"
                }
            );


        if (!response.ok) {

            throw new Error(
                "Could not create session"
            );

        }


        const data =
            await response.json();


        sessionId =
            data.session_id;


        sessionText.innerText =
            sessionId;


        frameCount = 0;

        frameCountText.innerText =
            "0";


        statusText.innerText =
            "Camera ready — select the board area";


        statusDot
            .classList
            .add("active");


        selectBoardBtn
            .classList
            .remove("hidden");


        endBtn.disabled = false;


        result
            .classList
            .add("hidden");


        aiResult
            .classList
            .add("hidden");


    }

    catch (error) {

        console.error(error);

        stopCamera();

        startBtn.disabled = false;

        statusText.innerText =
            "Could not start class";

    }
}


// --------------------------------------------------
// SELECT BOARD
// --------------------------------------------------

function beginBoardSelection() {

    selectingBoard = true;

    boardRegion = null;

    selectionStart = null;


    selectBoardBtn
        .classList
        .add("hidden");


    confirmBoardBtn
        .classList
        .add("hidden");


    selectionInstructions
        .classList
        .remove("hidden");


    statusText.innerText =
        "Drag around the board to select it";


    video.style.cursor =
        "crosshair";
}


// --------------------------------------------------
// MOUSE DOWN
// --------------------------------------------------

video.addEventListener(
    "mousedown",
    function(event) {

        if (!selectingBoard) {
            return;
        }


        const rect =
            video.getBoundingClientRect();


        selectionStart = {

            x:
                event.clientX -
                rect.left,

            y:
                event.clientY -
                rect.top

        };


        selectionBox.style.left =
            selectionStart.x + "px";


        selectionBox.style.top =
            selectionStart.y + "px";


        selectionBox.style.width =
            "0px";


        selectionBox.style.height =
            "0px";


        selectionBox
            .classList
            .remove("hidden");

    }
);


// --------------------------------------------------
// MOUSE MOVE
// --------------------------------------------------

video.addEventListener(
    "mousemove",
    function(event) {

        if (
            !selectingBoard ||
            !selectionStart
        ) {
            return;
        }


        const rect =
            video.getBoundingClientRect();


        let currentX =
            event.clientX -
            rect.left;


        let currentY =
            event.clientY -
            rect.top;


        currentX =
            Math.max(
                0,
                Math.min(
                    currentX,
                    rect.width
                )
            );


        currentY =
            Math.max(
                0,
                Math.min(
                    currentY,
                    rect.height
                )
            );


        const left =
            Math.min(
                selectionStart.x,
                currentX
            );


        const top =
            Math.min(
                selectionStart.y,
                currentY
            );


        const width =
            Math.abs(
                currentX -
                selectionStart.x
            );


        const height =
            Math.abs(
                currentY -
                selectionStart.y
            );


        selectionBox.style.left =
            left + "px";


        selectionBox.style.top =
            top + "px";


        selectionBox.style.width =
            width + "px";


        selectionBox.style.height =
            height + "px";

    }
);


// --------------------------------------------------
// MOUSE UP
// --------------------------------------------------

video.addEventListener(
    "mouseup",
    function(event) {

        if (
            !selectingBoard ||
            !selectionStart
        ) {
            return;
        }


        const rect =
            video.getBoundingClientRect();


        let endX =
            event.clientX -
            rect.left;


        let endY =
            event.clientY -
            rect.top;


        endX =
            Math.max(
                0,
                Math.min(
                    endX,
                    rect.width
                )
            );


        endY =
            Math.max(
                0,
                Math.min(
                    endY,
                    rect.height
                )
            );


        const displayX =
            Math.min(
                selectionStart.x,
                endX
            );


        const displayY =
            Math.min(
                selectionStart.y,
                endY
            );


        const displayWidth =
            Math.abs(
                endX -
                selectionStart.x
            );


        const displayHeight =
            Math.abs(
                endY -
                selectionStart.y
            );


        if (
            displayWidth < 50 ||
            displayHeight < 50
        ) {

            alert(
                "Please select a larger board area."
            );

            selectionStart = null;

            return;
        }


        const scaleX =
            video.videoWidth /
            rect.width;


        const scaleY =
            video.videoHeight /
            rect.height;


        boardRegion = {

            x:
                Math.round(
                    displayX *
                    scaleX
                ),

            y:
                Math.round(
                    displayY *
                    scaleY
                ),

            width:
                Math.round(
                    displayWidth *
                    scaleX
                ),

            height:
                Math.round(
                    displayHeight *
                    scaleY
                )

        };


        selectingBoard = false;

        selectionStart = null;


        video.style.cursor =
            "default";


        confirmBoardBtn
            .classList
            .remove("hidden");


        statusText.innerText =
            "Board selected — confirm to begin capture";

    }
);


// --------------------------------------------------
// CONFIRM BOARD
// --------------------------------------------------

async function confirmBoard() {

    if (!boardRegion) {

        alert(
            "Please select the board first."
        );

        return;
    }


    try {

        const formData =
            new FormData();


        formData.append(
            "session_id",
            sessionId
        );


        formData.append(
            "x",
            boardRegion.x
        );


        formData.append(
            "y",
            boardRegion.y
        );


        formData.append(
            "width",
            boardRegion.width
        );


        formData.append(
            "height",
            boardRegion.height
        );


        const response =
            await fetch(
                "/set-board-region",
                {
                    method: "POST",
                    body: formData
                }
            );


        if (!response.ok) {

            throw new Error(
                "Could not save board region"
            );

        }


        confirmBoardBtn
            .classList
            .add("hidden");


        selectionInstructions
            .classList
            .add("hidden");


        statusText.innerText =
            "● Class in progress — capturing board changes";


        captureStatus.innerText =
            "Active";


        capturing = true;


        captureFrame();

    }

    catch (error) {

        console.error(error);

        statusText.innerText =
            "Could not start capture";

    }
}


// --------------------------------------------------
// CAPTURE FRAME
// --------------------------------------------------

async function captureFrame() {

    if (!capturing) {
        return;
    }


    if (
        video.readyState <
        HTMLMediaElement.HAVE_CURRENT_DATA
    ) {

        scheduleNextCapture();

        return;
    }


    canvas.width =
        video.videoWidth;


    canvas.height =
        video.videoHeight;


    const context =
        canvas.getContext("2d");


    context.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
    );


    canvas.toBlob(

        async function(blob) {

            if (!blob) {

                scheduleNextCapture();

                return;
            }


            try {

                const formData =
                    new FormData();


                formData.append(
                    "session_id",
                    sessionId
                );


                formData.append(
                    "frame",
                    blob,
                    "frame.jpg"
                );


                const response =
                    await fetch(
                        "/capture-frame",
                        {
                            method: "POST",
                            body: formData
                        }
                    );


                const data =
                    await response.json();


                if (
                    data.status ===
                    "captured"
                ) {

                    frameCount =
                        data.frame_number + 1;


                    frameCountText.innerText =
                        frameCount;


                    console.log(
                        "Useful board frame:",
                        frameCount
                    );

                }

                else {

                    console.log(
                        "Board unchanged"
                    );

                }

            }

            catch (error) {

                console.error(
                    "Frame error:",
                    error
                );

            }


            scheduleNextCapture();

        },

        "image/jpeg",

        0.85

    );
}


// --------------------------------------------------
// SCHEDULE NEXT CAPTURE
// --------------------------------------------------

function scheduleNextCapture() {

    if (!capturing) {
        return;
    }


    captureTimer =
        setTimeout(
            captureFrame,
            1000
        );
}


// --------------------------------------------------
// END CLASS
// --------------------------------------------------

async function endClass() {

    capturing = false;


    if (captureTimer) {

        clearTimeout(
            captureTimer
        );

        captureTimer = null;

    }


    endBtn.disabled = true;


    statusText.innerText =
        "Finishing capture...";


    try {

        const formData =
            new FormData();


        formData.append(
            "session_id",
            sessionId
        );


        const response =
            await fetch(
                "/end-class",
                {
                    method: "POST",
                    body: formData
                }
            );


        const data =
            await response.json();


        stopCamera();


        statusText.innerText =
            "Capture complete";


        statusDot
            .classList
            .remove("active");


        captureStatus.innerText =
            "Complete";


        resultText.innerText =
            `${data.frame_count} useful board frames were captured.`;


        result
            .classList
            .remove("hidden");


        // Show AI button
        readBoardBtn
            .classList
            .remove("hidden");

    }

    catch (error) {

        console.error(error);

        statusText.innerText =
            "Could not finish class";

    }
}


// --------------------------------------------------
// READ BOARD WITH AI
// --------------------------------------------------

async function readBoard() {

    if (!sessionId) {

        alert(
            "No class session available."
        );

        return;
    }


    readBoardBtn.disabled = true;


    statusText.innerText =
        "AI is reading the board...";


    boardContent.innerHTML =
        "<p>Reading captured board frames...</p>";


    aiResult
        .classList
        .remove("hidden");


    try {

        const formData =
            new FormData();


        formData.append(
            "session_id",
            sessionId
        );


        const response =
            await fetch(
                "/read-board",
                {
                    method: "POST",
                    body: formData
                }
            );


        if (!response.ok) {

            const error =
                await response.json();


            throw new Error(
                error.detail ||
                "Board reading failed"
            );

        }


        const data =
            await response.json();


        console.log(
            "BOARD CONTENT:",
            data
        );

        displayBoardContent(data);

        generatePdfBtn
            .classList
            .remove("hidden");

        generatePptBtn
            .classList
            .remove("hidden");

        statusText.innerText =
            "AI board reading complete";
        


    }

    catch (error) {

        console.error(
            "Board reading error:",
            error
        );


        boardContent.innerHTML = `

            <p>
                Error reading board:
                ${escapeHtml(error.message)}
            </p>

        `;


        statusText.innerText =
            "Could not read board";

    }


    finally {

        readBoardBtn.disabled =
            false;

    }
}


// --------------------------------------------------
// DISPLAY AI RESULT
// --------------------------------------------------
function displayBoardContent(data) {

    boardContent.innerHTML = "";

    // Backend returns board_content directly
    const content = data.board_content;

    if (!content) {

        boardContent.innerHTML =
            "<p>No board content detected.</p>";

        return;
    }

    // Check whether there is actually any content
    const hasContent =
        content.heading ||
        (content.subheadings &&
            content.subheadings.length > 0) ||
        (content.text &&
            content.text.length > 0) ||
        (content.bullet_points &&
            content.bullet_points.length > 0) ||
        (content.equations &&
            content.equations.length > 0) ||
        (content.definitions &&
            content.definitions.length > 0) ||
        (content.examples &&
            content.examples.length > 0) ||
        (content.questions &&
            content.questions.length > 0) ||
        (content.diagrams &&
            content.diagrams.length > 0);

    if (!hasContent) {

        boardContent.innerHTML =
            "<p>No board content detected.</p>";

        return;
    }

    const card =
        document.createElement("div");

    card.style.background =
        "#f8fafc";

    card.style.padding =
        "20px";

    card.style.marginBottom =
        "15px";

    card.style.borderRadius =
        "10px";

    card.style.textAlign =
        "left";


    let html = "";


    // Heading
    if (content.heading) {

        html += `
            <h3>
                ${escapeHtml(content.heading)}
            </h3>
        `;
    }


    // Subheadings
    html += createList(
        "Subheadings",
        content.subheadings
    );


    // Text
    html += createList(
        "Text",
        content.text
    );


    // Bullet points
    html += createList(
        "Bullet Points",
        content.bullet_points
    );


    // Equations
    html += createList(
        "Equations",
        content.equations
    );


    // Definitions
    html += createList(
        "Definitions",
        content.definitions
    );


    // Examples
    html += createList(
        "Examples",
        content.examples
    );


    // Questions
    html += createList(
        "Questions",
        content.questions
    );


    // Diagrams
    if (
        content.diagrams &&
        content.diagrams.length > 0
    ) {

        html += `
            <h4>Diagrams</h4>
        `;

        content.diagrams.forEach(
            diagram => {

                if (
                    typeof diagram === "string"
                ) {

                    html += `
                        <p>
                            ${escapeHtml(
                                diagram
                            )}
                        </p>
                    `;

                } else {

                    html += `
                        <p>
                            <strong>
                                Description:
                            </strong>

                            ${escapeHtml(
                                diagram.description || ""
                            )}
                        </p>
                    `;


                    if (
                        diagram.labels &&
                        diagram.labels.length
                    ) {

                        html += `
                            <p>
                                <strong>
                                    Labels:
                                </strong>

                                ${diagram.labels
                                    .map(
                                        label =>
                                            escapeHtml(label)
                                    )
                                    .join(", ")
                                }
                            </p>
                        `;
                    }
                }
            }
        );
    }


    card.innerHTML = html;

    boardContent.appendChild(card);
}

async function generatePDF() {

    if (!sessionId) {
        alert("No class session available.");
        return;
    }

    generatePdfBtn.disabled = true;

    generatePdfBtn.innerText =
        "Generating PDF...";

    try {

        const formData =
            new FormData();

        formData.append(
            "session_id",
            sessionId
        );

        const response =
            await fetch(
                "/generate-pdf",
                {
                    method: "POST",
                    body: formData
                }
            );

        if (!response.ok) {

            const error =
                await response.json();

            throw new Error(
                error.detail ||
                "PDF generation failed"
            );
        }

        /*
         * The backend returns the actual PDF file.
         */
        const blob =
            await response.blob();

        const url =
            window.URL.createObjectURL(
                blob
            );

        const a =
            document.createElement("a");

        a.href = url;

        a.download =
            "class_notes.pdf";

        document.body.appendChild(a);

        a.click();

        a.remove();

        window.URL.revokeObjectURL(url);

        statusText.innerText =
            "PDF generated successfully";

        console.log(
            "PDF generated successfully"
        );

    }

    catch (error) {

        console.error(
            "PDF generation error:",
            error
        );

        alert(
            "Could not generate PDF: " +
            error.message
        );

    }

    finally {

        generatePdfBtn.disabled =
            false;

        generatePdfBtn.innerText =
            "Generate PDF";

    }
}

async function generatePPT() {

    if (!sessionId) {
        alert("No class session available.");
        return;
    }

    generatePptBtn.disabled = true;

    generatePptBtn.innerText =
        "Generating PPT...";

    try {

        const formData =
            new FormData();

        formData.append(
            "session_id",
            sessionId
        );

        const response =
            await fetch(
                "/generate-ppt",
                {
                    method: "POST",
                    body: formData
                }
            );

        if (!response.ok) {

            const error =
                await response.json();

            throw new Error(
                error.detail ||
                "PPT generation failed"
            );
        }

        const blob =
            await response.blob();

        const url =
            window.URL.createObjectURL(
                blob
            );

        const a =
            document.createElement("a");

        a.href = url;

        a.download =
            "class_presentation.pptx";

        document.body.appendChild(a);

        a.click();

        a.remove();

        window.URL.revokeObjectURL(url);

        statusText.innerText =
            "PowerPoint generated successfully";

        console.log(
            "PPT generated successfully"
        );

    }

    catch (error) {

        console.error(
            "PPT generation error:",
            error
        );

        alert(
            "Could not generate PPT: " +
            error.message
        );

    }

    finally {

        generatePptBtn.disabled =
            false;

        generatePptBtn.innerText =
            "Generate PPT";

    }
}

// --------------------------------------------------
// CREATE LIST
// --------------------------------------------------

function createList(
    title,
    items
) {

    if (
        !items ||
        !Array.isArray(items) ||
        items.length === 0
    ) {

        return "";

    }


    let html = `

        <h4>
            ${title}
        </h4>

        <ul>

    `;


    items.forEach(
        item => {

            html += `

                <li>
                    ${escapeHtml(
                        typeof item === "string"
                            ? item
                            : JSON.stringify(item)
                    )}
                </li>

            `;

        }
    );


    html += `
        </ul>
    `;


    return html;
}


// --------------------------------------------------
// ESCAPE HTML
// --------------------------------------------------

function escapeHtml(text) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        text;


    return div.innerHTML;
}


// --------------------------------------------------
// NEW CLASS
// --------------------------------------------------

function newClass() {

    sessionId = null;

    boardRegion = null;

    frameCount = 0;

    capturing = false;


    if (captureTimer) {

        clearTimeout(
            captureTimer
        );

        captureTimer = null;

    }


    frameCountText.innerText =
        "0";


    sessionText.innerText =
        "Not started";


    captureStatus.innerText =
        "Not active";


    statusText.innerText =
        "Ready to start class";


    statusDot
        .classList
        .remove("active");


    statusDot
        .classList
        .remove("error");


    result
        .classList
        .add("hidden");


    aiResult
        .classList
        .add("hidden");


    boardContent.innerHTML =
        "";


    startBtn.disabled =
        false;


    selectBoardBtn
        .classList
        .add("hidden");


    confirmBoardBtn
        .classList
        .add("hidden");


    readBoardBtn
        .classList
        .add("hidden");


    endBtn.disabled =
        true;

}


// --------------------------------------------------
// EVENT LISTENERS
// --------------------------------------------------

startBtn.addEventListener(
    "click",
    startClass
);


selectBoardBtn.addEventListener(
    "click",
    beginBoardSelection
);


confirmBoardBtn.addEventListener(
    "click",
    confirmBoard
);


endBtn.addEventListener(
    "click",
    endClass
);


readBoardBtn.addEventListener(
    "click",
    readBoard
);


newClassBtn.addEventListener(
    "click",
    newClass
);

generatePdfBtn.addEventListener(
    "click",
    generatePDF
);

generatePptBtn.addEventListener(
    "click",
    generatePPT
);