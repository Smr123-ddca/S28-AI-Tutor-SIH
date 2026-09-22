from fastapi import (
    FastAPI,
    UploadFile,
    File,
    Form,
    HTTPException
)

from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from src.document_generator import DocumentGenerator


import os
import uuid
import cv2
from datetime import datetime
import json

from dotenv import load_dotenv

from src.frame_selector import FrameSelector
from src.board_reader import BoardReader


# Load environment variables
load_dotenv()


app = FastAPI(
    title="Smart Board Capture"
)


CAPTURE_DIR = "data/captures"
FRONTEND_DIR = "frontend"


os.makedirs(
    CAPTURE_DIR,
    exist_ok=True
)

os.makedirs(
    FRONTEND_DIR,
    exist_ok=True
)


# Store active sessions
frame_selectors = {}
session_rois = {}


# Gemini board reader
board_reader = BoardReader()


# Serve frontend
app.mount(
    "/static",
    StaticFiles(
        directory=FRONTEND_DIR
    ),
    name="static"
)


@app.get("/")
async def home():

    return FileResponse(
        os.path.join(
            FRONTEND_DIR,
            "index.html"
        )
    )


# --------------------------------------------------
# START CLASS
# --------------------------------------------------

@app.post("/start-class")
async def start_class():

    session_id = (
        datetime.now().strftime(
            "%Y%m%d_%H%M%S"
        )
        + "_"
        + uuid.uuid4().hex[:6]
    )

    session_dir = os.path.join(CAPTURE_DIR, session_id)

    frame_dir = os.path.join(session_dir, "frames")
    page_dir = os.path.join(session_dir, "pages")

    os.makedirs(frame_dir, exist_ok=True)
    os.makedirs(page_dir, exist_ok=True)

    frame_selectors[session_id] = FrameSelector(
        difference_threshold=0.025,
        erase_threshold=0.20,
        stable_frames=2
)
    print(
        f"\nClass started: {session_id}"
    )

    return {
        "status": "started",
        "session_id": session_id
    }


# --------------------------------------------------
# SET BOARD REGION
# --------------------------------------------------

@app.post("/set-board-region")
async def set_board_region(

    session_id: str = Form(...),

    x: float = Form(...),

    y: float = Form(...),

    width: float = Form(...),

    height: float = Form(...)

):

    if session_id not in frame_selectors:

        raise HTTPException(
            status_code=404,
            detail="Session not found"
        )

    roi = {

        "x": x,

        "y": y,

        "width": width,

        "height": height

    }

    session_rois[
        session_id
    ] = roi

    print(
        f"Board region selected: {roi}"
    )

    return {

        "status":
            "board_region_set",

        "roi":
            roi

    }


# --------------------------------------------------
# CAPTURE FRAME
# --------------------------------------------------
@app.post("/capture-frame")
async def capture_frame(
    session_id: str = Form(...),
    frame: UploadFile = File(...)
):
    # -----------------------------
    # SESSION DIRECTORIES
    # -----------------------------
    session_dir = os.path.join(CAPTURE_DIR, session_id)
    frame_dir = os.path.join(session_dir, "frames")
    page_dir = os.path.join(session_dir, "pages")

    if not os.path.exists(session_dir):
        raise HTTPException(
            status_code=404,
            detail="Session not found"
        )

    # -----------------------------
    # READ IMAGE
    # -----------------------------
    image_bytes = await frame.read()

    # -----------------------------
    # GET FRAME SELECTOR + ROI
    # -----------------------------
    selector = frame_selectors.get(session_id)
    roi = session_rois.get(session_id)

    if selector is None:
        raise HTTPException(
            status_code=404,
            detail="Frame selector not found"
        )

    if roi is None:
        raise HTTPException(
            status_code=400,
            detail="Board region has not been selected"
        )

    # -----------------------------
    # ANALYZE FRAME
    # -----------------------------
    result = selector.analyze_frame(image_bytes, roi)

    event = result["event"]

    # =====================================================
    # 1. DISCARD FRAME
    # =====================================================
    # =====================================================
    # 1. DISCARD FRAME
    # =====================================================
    if event == "discard":

        print(
            f"Discarded → {result['reason']} | "
            f"Blur Score: {result.get('blur_score', 'N/A')}"
        )

        return {
            "status": "discarded",
            "reason": result["reason"],
            "blur_score": result.get("blur_score")
        }
    # =====================================================
    # 2. WRITING DETECTED
    # =====================================================
    if event == "write":

        existing_frames = sorted([
            f for f in os.listdir(frame_dir)
            if f.endswith(".jpg")
        ])

        frame_number = len(existing_frames)

        filename = f"frame_{frame_number:05d}.jpg"

        filepath = os.path.join(frame_dir, filename)

        with open(filepath, "wb") as f:
            f.write(image_bytes)

        print(
            f"✍️ Writing detected → Saved {filename}"
        )

        return {
            "status": "captured",
            "event": "write",
            "filename": filename,
            "frame_number": frame_number,
            "change_ratio": round(result["change_ratio"], 3),
            "writing_ratio": round(result["writing_ratio"], 3),
            "erasing_ratio": round(result["erasing_ratio"], 3)
        }

    # =====================================================
    # 3. BOARD ERASED → SAVE FINAL PAGE
    # =====================================================
    if event == "erase":

        page_number = result["page_number"]

        page_filename = f"page_{page_number:03d}.jpg"

        page_path = os.path.join(page_dir, page_filename)

        # Save the LAST GOOD BOARD before erase
        cv2.imwrite(page_path, result["page"])

        print(
            f"🧹 Board erased → Saved final page {page_filename}"
        )

        return {
            "status": "page_saved",
            "event": "erase",
            "page": page_filename,
            "page_number": page_number,
            "change_ratio": round(result["change_ratio"], 3),
            "writing_ratio": round(result["writing_ratio"], 3),
            "erasing_ratio": round(result["erasing_ratio"], 3)
        }

    # =====================================================
    # SAFETY FALLBACK
    # =====================================================
    return {
        "status": "discarded",
        "reason": "unknown_event"
    }

      

# --------------------------------------------------
# END CLASS
# --------------------------------------------------
@app.post("/end-class")
async def end_class(
    session_id: str = Form(...)
):

    session_dir = os.path.join(CAPTURE_DIR, session_id)

    if not os.path.exists(session_dir):
        raise HTTPException(
            status_code=404,
            detail="Session not found"
        )

    # New folder structure
    frame_dir = os.path.join(session_dir, "frames")
    page_dir = os.path.join(session_dir, "pages")

    frames = sorted([
        f for f in os.listdir(frame_dir)
        if f.endswith(".jpg")
    ])

    pages = sorted([
        f for f in os.listdir(page_dir)
        if f.endswith(".jpg")
    ])

    roi = session_rois.get(session_id)

    print(f"\nClass ended: {session_id}")
    print(f"Writing frames captured: {len(frames)}")
    print(f"Board pages captured: {len(pages)}")

    # Save session metadata
    metadata = {
        "session_id": session_id,
        "frame_count": len(frames),
        "page_count": len(pages),
        "board_region": roi
    }

    metadata_path = os.path.join(session_dir, "session.json")

    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=4)

    # Remove frame selector from memory
    frame_selectors.pop(session_id, None)

    # IMPORTANT: Don't remove ROI here.
    # read-board needs it later to crop the board.
    # session_rois.pop(session_id, None)

    return {
        "status": "ended",
        "session_id": session_id,
        "frame_count": len(frames),
        "page_count": len(pages),
        "board_region": roi
    }



# --------------------------------------------------
# READ BOARD WITH GEMINI (ONE AI CALL)
# --------------------------------------------------

@app.post("/read-board")
async def read_board(
    session_id: str = Form(...)
):

    session_dir = os.path.join(CAPTURE_DIR, session_id)

    if not os.path.exists(session_dir):
        raise HTTPException(
            status_code=404,
            detail="Session not found"
        )

    frame_dir = os.path.join(session_dir, "frames")
    page_dir = os.path.join(session_dir, "pages")

    # --------------------------------------------
    # LOAD ROI FROM SESSION METADATA
    # --------------------------------------------

    metadata_path = os.path.join(session_dir, "session.json")

    roi = None

    if os.path.exists(metadata_path):
        with open(metadata_path, "r", encoding="utf-8") as f:
            metadata = json.load(f)
            roi = metadata.get("board_region")

    # --------------------------------------------
    # USE PAGE CHECKPOINTS IF THEY EXIST
    # --------------------------------------------

    page_files = sorted([
        f for f in os.listdir(page_dir)
        if f.endswith(".jpg")
    ])

    image_paths = []

    if len(page_files) > 0:

        print(f"\nUsing {len(page_files)} board pages.")

        image_paths = [
            os.path.join(page_dir, page)
            for page in page_files
        ]

    else:

        frame_files = sorted([
            f for f in os.listdir(frame_dir)
            if f.endswith(".jpg")
        ])

        if len(frame_files) == 0:
            raise HTTPException(
                status_code=400,
                detail="No captured board images found."
            )

        # Teacher never erased board.
        # Use only the final board frame.
        last_frame = frame_files[-1]

        print(
            "No page checkpoints found. "
            "Using final board frame."
        )

        image_paths = [
            os.path.join(frame_dir, last_frame)
        ]

    # --------------------------------------------
    # GEMINI RECONSTRUCTION
    # --------------------------------------------

    print("\n===================================")
    print("STARTING BOARD RECONSTRUCTION")
    print("===================================")

    print(f"Images sent to Gemini: {len(image_paths)}")

    try:

         board_content = board_reader.read_frames(
         image_paths
)

    except Exception as error:

        print(f"\nGemini Error: {error}")

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )

    # --------------------------------------------
    # SAVE OUTPUT
    # --------------------------------------------

    output = {
        "session_id": session_id,
        "page_count": len(page_files),
        "images_used": len(image_paths),
        "board_content": board_content
    }

    output_path = os.path.join(
        session_dir,
        "board_content.json"
    )

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(
            output,
            f,
            indent=4,
            ensure_ascii=False
        )

    print(f"\nBoard reconstruction saved to:")
    print(output_path)

    # --------------------------------------------
    # RETURN TO FRONTEND
    # --------------------------------------------

    return {
        "status": "success",
        "session_id": session_id,
        "page_count": len(page_files),
        "images_used": len(image_paths),
        "board_content": board_content
    }

# --------------------------------------------------
# GET BOARD CONTENT
# --------------------------------------------------

@app.get(
    "/board-content/{session_id}"
)
async def get_board_content(
    session_id: str
):

    filepath = os.path.join(
        CAPTURE_DIR,
        session_id,
        "board_content.json"
    )

    if not os.path.exists(
        filepath
    ):

        raise HTTPException(
            status_code=404,
            detail="Board content not found"
        )

    with open(
        filepath,
        "r",
        encoding="utf-8"
    ) as f:

        return json.load(f)


# --------------------------------------------------
# SERVE CAPTURED IMAGE
# --------------------------------------------------

@app.get(
    "/capture/{session_id}/{filename}"
)
async def get_capture(
    session_id: str,
    filename: str
):

    session_dir = os.path.abspath(
        os.path.join(
            CAPTURE_DIR,
            session_id
        )
    )

    filepath = os.path.abspath(
        os.path.join(
            session_dir,
            filename
        )
    )

    # Prevent path traversal
    if not filepath.startswith(
        session_dir + os.sep
    ):

        raise HTTPException(
            status_code=403,
            detail="Invalid file path"
        )

    if not os.path.exists(
        filepath
    ):

        raise HTTPException(
            status_code=404,
            detail="Image not found"
        )

    return FileResponse(
        filepath,
        media_type="image/jpeg"
    )


# --------------------------------------------------
# HEALTH CHECK
# --------------------------------------------------

@app.get("/health")
async def health():

    return {
        "status": "ok"
    }

# --------------------------------------------------
# GENERATE PDF CLASS NOTES
# --------------------------------------------------

@app.post("/generate-pdf")
async def generate_pdf(
    session_id: str = Form(...)
):

    session_dir = os.path.join(
        CAPTURE_DIR,
        session_id
    )

    if not os.path.exists(
        session_dir
    ):
        raise HTTPException(
            status_code=404,
            detail="Session not found"
        )

    json_path = os.path.join(
        session_dir,
        "board_content.json"
    )

    if not os.path.exists(
        json_path
    ):
        raise HTTPException(
            status_code=404,
            detail=(
                "Board content not found. "
                "Run /read-board first."
            )
        )

    try:

        with open(
            json_path,
            "r",
            encoding="utf-8"
        ) as f:

            data = json.load(f)

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=f"Could not read board content: {error}"
        )

    board_content = data.get(
        "board_content",
        {}
    )

    if not board_content:

        raise HTTPException(
            status_code=400,
            detail="Board content is empty."
        )

    # --------------------------------------------------
    # FIND ORIGINAL BOARD PAGES
    # --------------------------------------------------

    page_dir = os.path.join(
        session_dir,
        "pages"
    )

    frame_dir = os.path.join(
        session_dir,
        "frames"
    )

    page_images = []

    if os.path.exists(
        page_dir
    ):

        page_images = sorted(
            [
                os.path.join(
                    page_dir,
                    file
                )
                for file in os.listdir(
                    page_dir
                )
                if file.lower().endswith(
                    (".jpg", ".jpeg", ".png")
                )
            ]
        )

    # Fallback if no checkpoints exist.
    if not page_images and os.path.exists(
        frame_dir
    ):

        frames = sorted(
            [
                os.path.join(
                    frame_dir,
                    file
                )
                for file in os.listdir(
                    frame_dir
                )
                if file.lower().endswith(
                    (".jpg", ".jpeg", ".png")
                )
            ]
        )

        if frames:
            page_images.append(
                frames[-1]
            )

    print("\n==============================")
    print("PDF GENERATION")
    print("==============================")

    print(
        "Heading:",
        board_content.get(
            "heading"
        )
    )

    print(
        "Sections:",
        len(
            board_content.get(
                "sections",
                []
            )
        )
    )

    print(
        "Diagrams:",
        len(
            board_content.get(
                "diagrams",
                []
            )
        )
    )

    print(
        "Original board images:",
        len(page_images)
    )

    pdf_path = os.path.join(
        session_dir,
        "class_notes.pdf"
    )

    try:

        generator = DocumentGenerator()

        generator.generate_pdf(
            content=board_content,
            output_path=pdf_path,
            page_images=page_images
        )

    except Exception as error:

        print(
            f"PDF generation error: {error}"
        )

        raise HTTPException(
            status_code=500,
            detail=f"PDF generation failed: {error}"
        )

    print(
        f"\nPDF generated: {pdf_path}"
    )

    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename="class_notes.pdf"
    )

# --------------------------------------------------
# GENERATE POWERPOINT
# --------------------------------------------------

@app.post("/generate-ppt")
async def generate_ppt(session_id: str = Form(...)):

    session_dir = os.path.join(CAPTURE_DIR, session_id)

    if not os.path.exists(session_dir):
        raise HTTPException(
            status_code=404,
            detail="Session not found"
        )

    # ----------------------------
    # Load board_content.json
    # ----------------------------

    json_path = os.path.join(session_dir, "board_content.json")

    if not os.path.exists(json_path):
        raise HTTPException(
            status_code=404,
            detail="Run /read-board before generating PPT."
        )

    try:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Could not read board content: {error}"
        )

    board_content = data.get("board_content", {})

    if not board_content:
        raise HTTPException(
            status_code=400,
            detail="Board content is empty."
        )

    # ----------------------------
    # Collect whiteboard images
    # ----------------------------

    page_dir = os.path.join(session_dir, "pages")
    frame_dir = os.path.join(session_dir, "frames")

    page_images = []

    if os.path.exists(page_dir):
        page_images = sorted([
            os.path.join(page_dir, file)
            for file in os.listdir(page_dir)
            if file.endswith(".jpg")
        ])

    if not page_images and os.path.exists(frame_dir):

        frames = sorted([
            os.path.join(frame_dir, file)
            for file in os.listdir(frame_dir)
            if file.endswith(".jpg")
        ])

        if frames:
            page_images.append(frames[-1])

    print(f"Using {len(page_images)} board images in PPT.")

    # ----------------------------
    # Generate PowerPoint
    # ----------------------------

    ppt_path = os.path.join(session_dir, "class_presentation.pptx")

    try:

        generator = DocumentGenerator()

        generator.generate_ppt(
            content=board_content,
            output_path=ppt_path,
            page_images=page_images
)
    except Exception as error:

        print(f"\nPPT generation failed: {error}")

        raise HTTPException(
            status_code=500,
            detail=f"PPT generation failed: {error}"
        )

    print(f"\nPowerPoint generated successfully:")
    print(ppt_path)

    return FileResponse(
        ppt_path,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        filename="class_presentation.pptx"
    )