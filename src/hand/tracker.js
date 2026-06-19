import {
    DrawingUtils,
    FaceLandmarker,
    FilesetResolver,
    HandLandmarker,
    PoseLandmarker
} from '@mediapipe/tasks-vision';

const WASM_ROOT = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const MODEL_ROOT = 'https://storage.googleapis.com/mediapipe-models';
const MODEL_PATHS = {
    hand: `${MODEL_ROOT}/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
    body: `${MODEL_ROOT}/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
    eyes: `${MODEL_ROOT}/face_landmarker/face_landmarker/float16/1/face_landmarker.task`
};
const TEMPLATE_STORAGE_KEY = 'tetris-tracking-templates-v1';
const EYE_CALIBRATION_KEY = 'tetris-eye-calibration-v1';
const COMMANDS = ['left', 'right', 'down', 'rotate'];

export class HandTracker {
    constructor(videoElement, canvasElement) {
        this.video = videoElement;
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');
        this.drawing = new DrawingUtils(this.ctx);

        this.gestureCallback = null;
        this.statusCallback = null;
        this.registrationCallback = null;
        this.activeGesture = null;
        this.gestureStartTime = 0;
        this.lastFireTime = 0;

        this.gestureThreshold = 300;
        this.tiltAngle = 30;
        this.dropThreshold = 0.1;
        this.indexExtendThreshold = 0.1;
        this.fingerExtendThreshold = 0.05;
        this.customThreshold = 0.2;

        this.mode = localStorage.getItem('tetris-tracking-mode') || 'hand';
        this.profile = localStorage.getItem('tetris-control-profile') || 'standard';
        this.templates = this.loadJson(TEMPLATE_STORAGE_KEY, {});
        this.eyeCalibration = this.loadJson(EYE_CALIBRATION_KEY, { gaze: 0.5 });

        this.vision = null;
        this.landmarker = null;
        this.stream = null;
        this.running = false;
        this.paused = false;
        this.animationFrameId = null;
        this.lastVideoTime = -1;
        this.lastInferenceTime = 0;
        this.lastFeatures = null;
        this.recording = null;
    }

    loadJson(key, fallback) {
        try {
            return JSON.parse(localStorage.getItem(key)) || fallback;
        } catch {
            return fallback;
        }
    }

    async initialize() {
        if (!this.vision) {
            this.vision = await FilesetResolver.forVisionTasks(WASM_ROOT);
        }
        if (!this.stream) {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' },
                audio: false
            });
            this.video.srcObject = this.stream;
            await this.video.play();
        }

        this.canvas.width = this.video.videoWidth || 640;
        this.canvas.height = this.video.videoHeight || 480;
        await this.createLandmarker();

        if (!this.running) {
            this.running = true;
            this.paused = false;
            this.animationFrameId = requestAnimationFrame(timestamp => this.processFrame(timestamp));
        }
    }

    async createLandmarker() {
        if (this.landmarker) {
            this.landmarker.close();
            this.landmarker = null;
        }

        try {
            this.landmarker = await this.instantiateLandmarker('GPU');
        } catch (gpuError) {
            console.warn('GPU tracking initialization failed; using CPU.', gpuError);
            this.landmarker = await this.instantiateLandmarker('CPU');
        }

        this.resetGestureState();
        this.emitStatus(false, null, `${this.mode} model ready`);
    }

    async instantiateLandmarker(delegate) {
        const sharedOptions = {
            baseOptions: { modelAssetPath: MODEL_PATHS[this.mode], delegate },
            runningMode: 'VIDEO'
        };

        if (this.mode === 'hand') {
            return HandLandmarker.createFromOptions(this.vision, {
                ...sharedOptions,
                numHands: 1,
                minHandDetectionConfidence: 0.5,
                minHandPresenceConfidence: 0.5,
                minTrackingConfidence: 0.5
            });
        } else if (this.mode === 'body') {
            return PoseLandmarker.createFromOptions(this.vision, {
                ...sharedOptions,
                numPoses: 1,
                minPoseDetectionConfidence: 0.5,
                minPosePresenceConfidence: 0.5,
                minTrackingConfidence: 0.5
            });
        } else {
            return FaceLandmarker.createFromOptions(this.vision, {
                ...sharedOptions,
                numFaces: 1,
                outputFaceBlendshapes: true,
                minFaceDetectionConfidence: 0.5,
                minFacePresenceConfidence: 0.5,
                minTrackingConfidence: 0.5
            });
        }
    }

    async setMode(mode) {
        if (!MODEL_PATHS[mode] || mode === this.mode) return;
        this.mode = mode;
        localStorage.setItem('tetris-tracking-mode', mode);
        this.recording = null;
        this.resetGestureState();
        this.emitStatus(false, null, `Loading ${mode} model...`);
        if (this.running && this.stream) await this.createLandmarker();
    }

    setProfile(profile) {
        this.profile = profile === 'custom' ? 'custom' : 'standard';
        localStorage.setItem('tetris-control-profile', this.profile);
        this.resetGestureState();
    }

    processFrame(timestamp) {
        if (!this.running) return;
        this.animationFrameId = requestAnimationFrame(nextTimestamp => this.processFrame(nextTimestamp));

        if (this.paused) return;
        if (!this.landmarker || this.video.readyState < 2) return;
        if (timestamp - this.lastInferenceTime < 50) return;
        if (this.video.currentTime === this.lastVideoTime) return;

        this.lastInferenceTime = timestamp;
        this.lastVideoTime = this.video.currentTime;

        try {
            const result = this.landmarker.detectForVideo(this.video, timestamp);
            this.onResults(result);
        } catch (error) {
            console.error('Tracking error:', error);
            this.emitStatus(false, null, 'Tracking error');
        }
    }

    setPaused(paused) {
        this.paused = Boolean(paused);
        if (this.paused) {
            this.resetGestureState();
            this.emitStatus(false, null, 'Tracking paused');
        } else {
            this.lastVideoTime = -1;
            this.lastInferenceTime = 0;
        }
    }

    stop() {
        this.running = false;
        this.paused = false;

        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        if (this.landmarker) {
            const landmarker = this.landmarker;
            this.landmarker = null;
            try {
                landmarker.close();
            } catch (error) {
                console.warn('Failed to close tracking model cleanly.', error);
            }
        }

        if (this.stream) {
            this.stream.getTracks().forEach(track => {
                try {
                    track.stop();
                } catch (error) {
                    console.warn('Failed to stop a camera track cleanly.', error);
                }
            });
            this.stream = null;
        }

        this.video.pause();
        this.video.srcObject = null;
        this.lastVideoTime = -1;
        this.lastInferenceTime = 0;
        this.lastFeatures = null;
        this.recording = null;
        this.resetGestureState();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.emitStatus(false, null, 'Camera stopped');
    }

    onResults(result) {
        this.ctx.save();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.translate(this.canvas.width, 0);
        this.ctx.scale(-1, 1);
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

        const observation = this.readObservation(result);
        if (observation) {
            this.drawObservation(observation.landmarks);
            this.lastFeatures = observation.features;
            const wasRecording = Boolean(this.recording);
            this.captureRecording(observation.features);
            const gesture = wasRecording
                ? null
                : this.profile === 'custom'
                ? this.recognizeCustomGesture(observation.features)
                : observation.gesture;
            this.handleGesture(gesture);
            this.emitStatus(true, gesture, this.recording ? 'Recording pose...' : null);
        } else {
            this.lastFeatures = null;
            this.handleGesture(null);
            this.emitStatus(false, null, this.recording ? 'Move into camera view' : null);
        }
        this.ctx.restore();
    }

    readObservation(result) {
        if (this.mode === 'hand' && result.landmarks?.length) {
            const landmarks = result.landmarks[0];
            return {
                landmarks,
                features: this.normalizeLandmarks(landmarks, 0, 9, [...Array(21).keys()]),
                gesture: this.recognizeHandGesture(landmarks)
            };
        }
        if (this.mode === 'body' && result.landmarks?.length) {
            const landmarks = result.landmarks[0];
            const indices = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
            return {
                landmarks,
                features: this.normalizeBodyLandmarks(landmarks, indices),
                gesture: this.recognizeBodyGesture(landmarks)
            };
        }
        if (this.mode === 'eyes' && result.faceLandmarks?.length) {
            const landmarks = result.faceLandmarks[0];
            const blendshapes = result.faceBlendshapes?.[0]?.categories || [];
            const eyeState = this.getEyeState(landmarks, blendshapes);
            return {
                landmarks,
                features: [eyeState.gaze, eyeState.blinkLeft, eyeState.blinkRight],
                gesture: this.recognizeEyeGesture(eyeState)
            };
        }
        return null;
    }

    drawObservation(landmarks) {
        if (this.mode === 'hand') {
            this.drawing.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, {
                color: '#00ff88', lineWidth: 4
            });
            this.drawing.drawLandmarks(landmarks, { color: '#ff3355', radius: 3 });
        } else if (this.mode === 'body') {
            this.drawing.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
                color: '#00ff88', lineWidth: 3
            });
            this.drawing.drawLandmarks(landmarks, { color: '#ffcc00', radius: 3 });
        } else {
            const options = { color: '#00ddff', lineWidth: 2 };
            this.drawing.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, options);
            this.drawing.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, options);
            this.drawing.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS, options);
            this.drawing.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS, options);
        }
    }

    recognizeHandGesture(landmarks) {
        const wrist = landmarks[0];
        const middleBase = landmarks[9];
        const handTilt = Math.atan2(
            middleBase.x - wrist.x,
            wrist.y - middleBase.y
        ) * 180 / Math.PI;
        const indexTip = landmarks[8];
        const indexBase = landmarks[5];
        const indexExtended = indexTip.y < indexBase.y - this.indexExtendThreshold;

        if (indexExtended && this.isOnlyIndexExtended(landmarks)) return 'rotate';
        if (handTilt > this.tiltAngle) return 'left';
        if (handTilt < -this.tiltAngle) return 'right';
        if (wrist.y < middleBase.y - this.dropThreshold) return 'down';
        return null;
    }

    isOnlyIndexExtended(landmarks) {
        const fingers = [
            { tip: 8, base: 5 },
            { tip: 12, base: 9 },
            { tip: 16, base: 13 },
            { tip: 20, base: 17 }
        ];
        const extended = fingers.map(finger =>
            landmarks[finger.tip].y < landmarks[finger.base].y - this.fingerExtendThreshold
        );
        return extended[0] && !extended[1] && !extended[2] && !extended[3];
    }

    recognizeBodyGesture(landmarks) {
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];
        const leftWrist = landmarks[15];
        const rightWrist = landmarks[16];
        const bothArmsRaised = leftWrist.y < leftShoulder.y - 0.08
            && rightWrist.y < rightShoulder.y - 0.08;
        const leftArmExtended = leftWrist.x > leftShoulder.x + 0.12
            && Math.abs(leftWrist.y - leftShoulder.y) < 0.15;
        const rightArmExtended = rightWrist.x < rightShoulder.x - 0.12
            && Math.abs(rightWrist.y - rightShoulder.y) < 0.15;
        const kneeAngle = Math.min(
            this.jointAngle(landmarks[23], landmarks[25], landmarks[27]),
            this.jointAngle(landmarks[24], landmarks[26], landmarks[28])
        );

        if (bothArmsRaised) return 'rotate';
        if (leftArmExtended && !rightArmExtended) return 'left';
        if (rightArmExtended && !leftArmExtended) return 'right';
        if (kneeAngle < 135) return 'down';
        return null;
    }

    getEyeState(landmarks, blendshapes) {
        const score = name => blendshapes.find(item => item.categoryName === name)?.score || 0;
        const iris = [468, 469, 470, 471, 472, 473, 474, 475, 476, 477]
            .map(index => landmarks[index])
            .filter(Boolean);
        const eyeCorners = [landmarks[33], landmarks[133], landmarks[362], landmarks[263]];
        const minX = Math.min(...eyeCorners.map(point => point.x));
        const maxX = Math.max(...eyeCorners.map(point => point.x));
        const gaze = iris.length
            ? (iris.reduce((sum, point) => sum + point.x, 0) / iris.length - minX) / (maxX - minX)
            : 0.5;
        return {
            gaze,
            blinkLeft: score('eyeBlinkLeft'),
            blinkRight: score('eyeBlinkRight')
        };
    }

    recognizeEyeGesture({ gaze, blinkLeft, blinkRight }) {
        if (blinkLeft > 0.62 && blinkRight < 0.4) return 'rotate';
        if (blinkRight > 0.62 && blinkLeft < 0.4) return 'down';
        if (blinkLeft > 0.58 && blinkRight > 0.58) return null;
        const offset = gaze - this.eyeCalibration.gaze;
        if (offset > this.dropThreshold) return 'left';
        if (offset < -this.dropThreshold) return 'right';
        return null;
    }

    calibrateEyes() {
        if (this.mode !== 'eyes' || !this.lastFeatures) return false;
        this.eyeCalibration = { gaze: this.lastFeatures[0] };
        localStorage.setItem(EYE_CALIBRATION_KEY, JSON.stringify(this.eyeCalibration));
        return true;
    }

    normalizeLandmarks(landmarks, originIndex, scaleIndex, indices) {
        const origin = landmarks[originIndex];
        const scalePoint = landmarks[scaleIndex];
        const scale = Math.hypot(scalePoint.x - origin.x, scalePoint.y - origin.y) || 1;
        return indices.flatMap(index => [
            (landmarks[index].x - origin.x) / scale,
            (landmarks[index].y - origin.y) / scale
        ]);
    }

    normalizeBodyLandmarks(landmarks, indices) {
        const origin = this.midpoint(landmarks[23], landmarks[24]);
        const shoulderWidth = Math.hypot(
            landmarks[12].x - landmarks[11].x,
            landmarks[12].y - landmarks[11].y
        ) || 1;
        return indices.flatMap(index => [
            (landmarks[index].x - origin.x) / shoulderWidth,
            (landmarks[index].y - origin.y) / shoulderWidth
        ]);
    }

    midpoint(a, b) {
        return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }

    jointAngle(a, b, c) {
        const first = Math.atan2(a.y - b.y, a.x - b.x);
        const second = Math.atan2(c.y - b.y, c.x - b.x);
        let angle = Math.abs((first - second) * 180 / Math.PI);
        if (angle > 180) angle = 360 - angle;
        return angle;
    }

    startPoseRegistration(command) {
        if (!COMMANDS.includes(command)) return false;
        this.recording = { command, samples: [], requiredSamples: 30 };
        this.registrationCallback?.({ state: 'recording', command, progress: 0 });
        return true;
    }

    cancelPoseRegistration() {
        this.recording = null;
        this.registrationCallback?.({ state: 'cancelled' });
    }

    captureRecording(features) {
        if (!this.recording) return;
        this.recording.samples.push([...features]);
        const progress = this.recording.samples.length / this.recording.requiredSamples;
        this.registrationCallback?.({
            state: 'recording',
            command: this.recording.command,
            progress: Math.min(progress, 1)
        });
        if (this.recording.samples.length < this.recording.requiredSamples) return;

        const template = this.averageVectors(this.recording.samples);
        this.templates[this.mode] ||= {};
        this.templates[this.mode][this.recording.command] = template;
        localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(this.templates));
        const command = this.recording.command;
        this.recording = null;
        this.registrationCallback?.({ state: 'saved', command });
    }

    averageVectors(vectors) {
        return vectors[0].map((_, index) =>
            vectors.reduce((sum, vector) => sum + vector[index], 0) / vectors.length
        );
    }

    recognizeCustomGesture(features) {
        const modeTemplates = this.templates[this.mode] || {};
        let closest = { command: null, distance: Infinity };
        for (const [command, template] of Object.entries(modeTemplates)) {
            if (template.length !== features.length) continue;
            const distance = Math.sqrt(features.reduce((sum, value, index) =>
                sum + (value - template[index]) ** 2, 0) / features.length);
            if (distance < closest.distance) closest = { command, distance };
        }
        return closest.distance <= this.customThreshold ? closest.command : null;
    }

    resetTemplatesForMode() {
        delete this.templates[this.mode];
        localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(this.templates));
        this.resetGestureState();
    }

    getRegisteredCommands() {
        return Object.keys(this.templates[this.mode] || {});
    }

    handleGesture(gesture) {
        if (!gesture) {
            this.resetGestureState();
            return;
        }
        const now = performance.now();
        if (gesture !== this.activeGesture) {
            this.activeGesture = gesture;
            this.gestureStartTime = now;
            this.lastFireTime = 0;
            return;
        }
        if (now - this.gestureStartTime < this.gestureThreshold) return;

        const repeatable = gesture !== 'rotate';
        if (!this.lastFireTime || (repeatable && now - this.lastFireTime >= this.gestureThreshold)) {
            this.gestureCallback?.(gesture);
            this.lastFireTime = now;
        }
    }

    resetGestureState() {
        this.activeGesture = null;
        this.gestureStartTime = 0;
        this.lastFireTime = 0;
    }

    emitStatus(detected, gesture, message) {
        this.statusCallback?.({ detected, gesture, message, mode: this.mode });
    }

    onGesture(callback) {
        this.gestureCallback = callback;
    }

    onStatus(callback) {
        this.statusCallback = callback;
    }

    onRegistration(callback) {
        this.registrationCallback = callback;
    }
}
