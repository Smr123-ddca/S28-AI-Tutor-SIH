import cv2
import numpy as np


class FrameSelector:

    def __init__(
        self,
        difference_threshold=0.025,
        erase_threshold=0.20,
        stable_frames=2
    ):
        # Minimum amount of visual change required
        # to consider a frame useful.
        self.difference_threshold = difference_threshold

        # Large change can indicate erasing.
        self.erase_threshold = erase_threshold

        # Erasing must be detected this many times
        # before it is confirmed.
        self.stable_frames = stable_frames

        # Previous frame
        self.previous_frame = None

        # Last board state containing completed writing
        self.last_stable_board = None

        # Last grayscale stable board
        self.last_stable_gray = None

        # Erasing persistence counter
        self.erase_counter = 0

        # Page numbering
        self.page_counter = 0

        # Whether first frame has been initialized
        self.initialized = False

    # =====================================================
    # CROP BOARD
    # =====================================================

    def crop_board(self, frame, roi):

        if roi is None:
            return frame

        x = int(roi["x"])
        y = int(roi["y"])
        w = int(roi["width"])
        h = int(roi["height"])

        frame_h, frame_w = frame.shape[:2]

        x = max(0, min(x, frame_w - 1))
        y = max(0, min(y, frame_h - 1))

        w = max(1, min(w, frame_w - x))
        h = max(1, min(h, frame_h - y))

        return frame[y:y + h, x:x + w]

    # =====================================================
    # PREPROCESS
    # =====================================================

    def preprocess(self, frame, roi):

        board = self.crop_board(frame, roi)

        gray = cv2.cvtColor(
            board,
            cv2.COLOR_BGR2GRAY
        )

        # Mild noise reduction only.
        # This is NOT a blur rejection test.
        gray = cv2.GaussianBlur(
            gray,
            (5, 5),
            0
        )

        return board, gray

    # =====================================================
    # DIFFERENCE
    # =====================================================

    def calculate_difference(
        self,
        previous,
        current
    ):

        difference = cv2.absdiff(
            previous,
            current
        )

        # Ignore tiny camera noise.
        _, difference = cv2.threshold(
            difference,
            12,
            255,
            cv2.THRESH_BINARY
        )

        # Remove tiny isolated noise.
        kernel = np.ones(
            (3, 3),
            np.uint8
        )

        difference = cv2.morphologyEx(
            difference,
            cv2.MORPH_OPEN,
            kernel
        )

        changed_pixels = cv2.countNonZero(
            difference
        )

        total_pixels = (
            difference.shape[0] *
            difference.shape[1]
        )

        if total_pixels == 0:
            return 0.0

        return changed_pixels / total_pixels

    # =====================================================
    # CONTENT MEASUREMENT
    # =====================================================

    def calculate_content(
        self,
        gray
    ):

        # Adaptive threshold makes this independent
        # of whether the marker is green, black, blue etc.
        adaptive = cv2.adaptiveThreshold(
            gray,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY_INV,
            31,
            10
        )

        # Remove very small noise
        kernel = np.ones(
            (3, 3),
            np.uint8
        )

        adaptive = cv2.morphologyEx(
            adaptive,
            cv2.MORPH_OPEN,
            kernel
        )

        total_pixels = (
            adaptive.shape[0] *
            adaptive.shape[1]
        )

        if total_pixels == 0:
            return 0.0

        content_pixels = cv2.countNonZero(
            adaptive
        )

        return content_pixels / total_pixels

    # =====================================================
    # ANALYZE FRAME
    # =====================================================

    def analyze_frame(
        self,
        image_bytes,
        roi
    ):

        # -------------------------------------------------
        # Decode image
        # -------------------------------------------------

        image_array = np.frombuffer(
            image_bytes,
            dtype=np.uint8
        )

        frame = cv2.imdecode(
            image_array,
            cv2.IMREAD_COLOR
        )

        if frame is None:

            print("Could not decode frame")

            return {
                "event": "discard",
                "reason": "invalid_frame"
            }

        # -------------------------------------------------
        # Crop board
        # -------------------------------------------------

        board, gray = self.preprocess(
            frame,
            roi
        )

        current_content = self.calculate_content(
            gray
        )

        # =================================================
        # FIRST FRAME = BASELINE ONLY
        # =================================================

        if not self.initialized:

            self.initialized = True

            self.previous_frame = gray.copy()

            self.last_stable_board = board.copy()

            self.last_stable_gray = gray.copy()

            print(
                "BASELINE CREATED"
            )

            print(
                f"Initial content: "
                f"{current_content:.4f}"
            )

            return {
                "event": "discard",
                "reason": "initial_baseline",
                "change_ratio": 0.0,
                "writing_ratio": 0.0,
                "erasing_ratio": 0.0
            }

        # =================================================
        # CALCULATE CHANGE
        # =================================================

        change_ratio = self.calculate_difference(
            self.previous_frame,
            gray
        )

        # Also compare against the last stable board.
        stable_change = self.calculate_difference(
            self.last_stable_gray,
            gray
        )

        # =================================================
        # PRINT DEBUG INFORMATION
        # =================================================

        print(
            f"CHANGE={change_ratio:.4f} | "
            f"STABLE_CHANGE={stable_change:.4f} | "
            f"CONTENT={current_content:.4f}"
        )

        # =================================================
        # NO CHANGE
        # =================================================

        if change_ratio < self.difference_threshold:

            self.previous_frame = gray.copy()

            self.erase_counter = 0

            return {
                "event": "discard",
                "reason": "no_significant_change",
                "change_ratio": change_ratio,
                "writing_ratio": 0.0,
                "erasing_ratio": 0.0
            }

        # =================================================
        # CONTENT LOSS
        # =================================================

        previous_content = self.calculate_content(
            self.last_stable_gray
        )

        if previous_content > 0:

            content_loss = (
                previous_content -
                current_content
            ) / previous_content

        else:

            content_loss = 0.0

        # =================================================
        # ERASE DETECTION
        # =================================================

        erase_candidate = (
            stable_change >= self.erase_threshold
            and
            content_loss >= 0.20
        )

        if erase_candidate:

            self.erase_counter += 1

            print(
                f"ERASE CANDIDATE "
                f"{self.erase_counter}/"
                f"{self.stable_frames}"
            )

            self.previous_frame = gray.copy()

            # ---------------------------------------------
            # Not enough evidence yet
            # ---------------------------------------------

            if self.erase_counter < self.stable_frames:

                return {
                    "event": "discard",
                    "reason": "possible_erasing",
                    "change_ratio": stable_change,
                    "writing_ratio": 0.0,
                    "erasing_ratio": content_loss
                }

            # ---------------------------------------------
            # ERASING CONFIRMED
            # ---------------------------------------------

            self.page_counter += 1

            print(
                "================================"
            )

            print(
                f"ERASING CONFIRMED"
            )

            print(
                f"SAVING PAGE "
                f"{self.page_counter}"
            )

            print(
                "================================"
            )

            # VERY IMPORTANT:
            # Save the board BEFORE erasing.
            page = self.last_stable_board.copy()

            # Current erased board becomes baseline.
            self.last_stable_board = board.copy()

            self.last_stable_gray = gray.copy()

            self.previous_frame = gray.copy()

            self.erase_counter = 0

            return {
                "event": "erase",
                "page": page,
                "page_number": self.page_counter,
                "change_ratio": stable_change,
                "writing_ratio": 0.0,
                "erasing_ratio": content_loss
            }

        # =================================================
        # NEW WRITING
        # =================================================

        self.erase_counter = 0

        print(
            "NEW BOARD CONTENT DETECTED"
        )

        # Save this as the latest complete board.
        self.last_stable_board = board.copy()

        self.last_stable_gray = gray.copy()

        self.previous_frame = gray.copy()

        return {
            "event": "write",
            "board": board.copy(),
            "change_ratio": stable_change,
            "writing_ratio": stable_change,
            "erasing_ratio": 0.0
        }