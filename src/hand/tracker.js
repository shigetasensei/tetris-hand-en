import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { HAND_CONNECTIONS } from '@mediapipe/hands';

export class HandTracker {
    constructor(videoElement, canvasElement) {
        this.video = videoElement;
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');

        this.gestureCallback = null;
        this.lastGesture = null;
        this.gestureStartTime = 0;
        this.gestureThreshold = 300; // 300ms

        this.hands = null;
        this.camera = null;
    }

    async initialize() {
        // Initialize MediaPipe Hands
        this.hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });

        this.hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        this.hands.onResults((results) => this.onResults(results));

        // Initialize the camera
        this.camera = new Camera(this.video, {
            onFrame: async () => {
                await this.hands.send({ image: this.video });
            },
            width: 640,
            height: 480
        });

        await this.camera.start();

        // Set the canvas size
        this.canvas.width = 640;
        this.canvas.height = 480;
    }

    onResults(results) {
        // Clear the canvas
        this.ctx.save();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw the camera image
        this.ctx.drawImage(results.image, 0, 0, this.canvas.width, this.canvas.height);

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];

            // Draw the hand landmarks
            drawConnectors(this.ctx, landmarks, HAND_CONNECTIONS, {
                color: '#00FF00',
                lineWidth: 5
            });

            drawLandmarks(this.ctx, landmarks, {
                color: '#FF0000',
                lineWidth: 2
            });

            // Gesture recognition
            const gesture = this.recognizeGesture(landmarks);
            this.handleGesture(gesture);

            // Update the status
            document.getElementById('hand-status').textContent = 'Detected';
            document.getElementById('gesture-type').textContent = gesture || '-';
        } else {
            document.getElementById('hand-status').textContent = 'Not detected';
            document.getElementById('gesture-type').textContent = '-';
        }

        this.ctx.restore();
    }

    recognizeGesture(landmarks) {
        // Get the coordinates of the wrist and the base of the middle finger
        const wrist = landmarks[0];
        const middleBase = landmarks[9];

        // Calculate the tilt of the hand
        const angle = Math.atan2(middleBase.y - wrist.y, middleBase.x - wrist.x) * 180 / Math.PI;

        // Check the state of the index finger
        const indexTip = landmarks[8];
        const indexBase = landmarks[5];
        const indexExtended = indexTip.y < indexBase.y - 0.1;

        // Determine the gesture
        if (indexExtended && this.isOnlyIndexExtended(landmarks)) {
            return 'rotate';
        } else if (angle < -30) {
            return 'right'; // Left and right are mirrored on screen
        } else if (angle > 30) {
            return 'left';  // Left and right are mirrored on screen
        } else if (wrist.y < middleBase.y - 0.1) {
            return 'down';
        }

        return null;
    }

    isOnlyIndexExtended(landmarks) {
        // Check the state of each finger
        const fingers = [
            { tip: 4, base: 2 },   // Thumb
            { tip: 8, base: 5 },   // Index finger
            { tip: 12, base: 9 },  // Middle finger
            { tip: 16, base: 13 }, // Ring finger
            { tip: 20, base: 17 }  // Pinky finger
        ];

        const extended = fingers.map((finger, index) => {
            if (index === 0) { // The thumb is judged by horizontal movement
                return Math.abs(landmarks[finger.tip].x - landmarks[finger.base].x) > 0.1;
            } else {
                return landmarks[finger.tip].y < landmarks[finger.base].y - 0.05;
            }
        });

        // Only the index finger is extended
        return extended[1] && !extended[2] && !extended[3] && !extended[4];
    }

    handleGesture(gesture) {
        if (!gesture) {
            this.lastGesture = null;
            this.gestureStartTime = 0;
            return;
        }

        const now = Date.now();

        if (gesture !== this.lastGesture) {
            this.lastGesture = gesture;
            this.gestureStartTime = now;
        } else if (now - this.gestureStartTime > this.gestureThreshold) {
            // Fire the gesture once the threshold is exceeded
            if (this.gestureCallback) {
                this.gestureCallback(gesture);
            }
        }
    }

    onGesture(callback) {
        this.gestureCallback = callback;
    }
}