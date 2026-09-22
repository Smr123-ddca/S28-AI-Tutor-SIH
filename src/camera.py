import cv2
import os
import time
from datetime import datetime
import threading


class BoardCapture:

    def __init__(self, output_dir="data/captures"):

        self.output_dir = output_dir

        os.makedirs(self.output_dir, exist_ok=True)

        self.cap = None
        self.running = False
        self.thread = None

        self.session_id = None
        self.session_dir = None

        self.frame_count = 0

    def start(self):

        if self.running:
            return self.session_id

        self.session_id = datetime.now().strftime(
            "%Y%m%d_%H%M%S"
        )

        self.session_dir = os.path.join(
            self.output_dir,
            self.session_id
        )

        os.makedirs(self.session_dir, exist_ok=True)

        self.cap = cv2.VideoCapture(0)

        if not self.cap.isOpened():
            raise RuntimeError(
                "Could not open camera"
            )

        self.running = True
        self.frame_count = 0

        # Run camera in background
        self.thread = threading.Thread(
            target=self.capture_loop,
            daemon=True
        )

        self.thread.start()

        print("Class started")
        print(
            f"Saving frames to: {self.session_dir}"
        )

        return self.session_id

    def capture_loop(self):

        last_capture = 0

        while self.running:

            ret, frame = self.cap.read()

            if not ret:
                print("Failed to read frame")
                continue

            current_time = time.time()

            # Capture once every second
            if current_time - last_capture >= 1:

                filename = os.path.join(
                    self.session_dir,
                    f"frame_{self.frame_count:05d}.jpg"
                )

                cv2.imwrite(
                    filename,
                    frame
                )

                print(
                    f"Captured frame {self.frame_count}"
                )

                self.frame_count += 1
                last_capture = current_time

    def stop(self):

        if not self.running:
            return self.session_id

        self.running = False

        if self.thread:
            self.thread.join(timeout=2)

        if self.cap:
            self.cap.release()

        print("Class ended")

        print(
            f"Total frames: {self.frame_count}"
        )

        return self.session_id