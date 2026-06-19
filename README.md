# Motion Tracking Tetris

A browser-based Tetris game controlled with hand gestures, full-body poses, eye movements, or poses you record yourself. Tracking runs in the browser with the MediaPipe Tasks Vision API.

## Controls

Choose a tracking mode and control profile in **Tracking Settings**.

| Command | Hand | Full body | Eyes only |
| --- | --- | --- | --- |
| Move left | Tilt the hand left | Hold the left arm sideways | Look left |
| Move right | Tilt the hand right | Hold the right arm sideways | Look right |
| Rotate | Raise only the index finger | Raise both hands | Wink the left eye |
| Hard drop | Point the hand downward | Squat or lower the shoulders | Look up (wink-free) / wink right |

The tracking `down` command instantly drops and locks the current piece. The keyboard's Arrow Down key remains a one-row soft drop.

Eye mode defaults to **No wink required**: close both eyes to rotate and look up to hard drop. Select **Wink controls** to use left wink for rotate and right wink for hard drop.

For **Custom poses**, select a command, press **Record pose**, and hold the pose until recording finishes. Templates are stored in your browser's `localStorage`; camera images are not saved. In eye mode, look at the center of the screen and press **Calibrate center gaze** before playing.

Keyboard controls are also available:

- Arrow Left / Arrow Right: move
- Arrow Down: soft drop by one row
- Arrow Up / Space: rotate

## Quick Start

Requirements:

- Node.js and npm
- A webcam
- A current Chrome, Edge, or another browser with WebAssembly and camera support
- An internet connection on first use to download the MediaPipe WASM runtime and model files

Clone and run the project:

```bash
git clone https://github.com/shigetasensei/tetris-hand-en.git
cd tetris-hand-en
npm install
npm run dev
```

Open the URL printed by Vite, usually `http://localhost:5173`, then allow camera access.

To create a production build:

```bash
npm run build
npm run preview
```

Do not install `@mediapipe/hands`, `@mediapipe/camera_utils`, or `@mediapipe/drawing_utils`. This project uses `@mediapipe/tasks-vision`, which is installed from `package.json` by `npm install`.

## GitHub Codespaces

1. Open this repository on GitHub.
2. Select **Code → Codespaces → Create codespace on main**.
3. In the terminal, run:

   ```bash
   npm install
   npm run dev
   ```

4. Open port `5173` from the **PORTS** panel.
5. Allow camera access in the browser.

Codespaces serves forwarded ports over HTTPS, which satisfies browser camera security requirements.

## How It Works

The application uses three MediaPipe Tasks Vision landmarkers:

- `HandLandmarker`: 21 landmarks for one hand
- `PoseLandmarker`: 33 landmarks for one body
- `FaceLandmarker`: face and iris landmarks plus eye-blink blendshapes

The selected landmarker processes webcam frames. `src/hand/tracker.js` converts the result into one of four commands: `left`, `right`, `down`, or `rotate`. `src/main.js` maps those commands to the Tetris game in `src/game/tetris.js`.

The current API initialization looks like this:

```javascript
import {
    FilesetResolver,
    HandLandmarker
} from '@mediapipe/tasks-vision';

const WASM_ROOT = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const MODEL_PATH = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const vision = await FilesetResolver.forVisionTasks(WASM_ROOT);
const handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
        modelAssetPath: MODEL_PATH,
        delegate: 'GPU'
    },
    runningMode: 'VIDEO',
    numHands: 1,
    minHandDetectionConfidence: 0.5,
    minHandPresenceConfidence: 0.5,
    minTrackingConfidence: 0.5
});

const result = handLandmarker.detectForVideo(video, performance.now());
const landmarks = result.landmarks[0];
```

The implementation falls back to the CPU delegate if GPU initialization fails.

## Project Structure

```text
tetris-hand-en/
├── index.html
├── package.json
├── package-lock.json
├── README.md
├── GESTURE_CUSTOMIZATION_GUIDE.md
├── PROGRAMMING_EXERCISES.md
├── src/
│   ├── main.js
│   ├── game/
│   │   └── tetris.js
│   └── hand/
│       └── tracker.js
└── styles/
    └── main.css
```

## Learning Documents

- [Gesture Customization Guide](./GESTURE_CUSTOMIZATION_GUIDE.md): tracking pipeline, standard gestures, and custom-pose templates
- [Programming Exercises](./PROGRAMMING_EXERCISES.md): exercises from simple visual changes to larger game features

## Troubleshooting

### Camera access fails

- Use `localhost` or HTTPS. Browsers block camera access on insecure remote pages.
- Check the camera permission in the browser address bar.
- Close other applications that are using the camera.
- Reload the page after changing camera permissions.

### A tracking model does not load

- Confirm that the browser has internet access.
- Reload the page and try the mode again.
- Check the browser console for a blocked model or WASM request.
- The first load can take longer because models are several megabytes.

### Tracking is unreliable

- Use even lighting and keep the tracked body part inside the frame.
- Avoid a background with the same color as your skin or clothing.
- In eye mode, face the camera and recalibrate center gaze.
- In full-body mode, make sure the shoulders, arms, hips, knees, and ankles are visible for the standard squat command.

### Vite's port does not appear in Codespaces

```bash
npm run dev -- --host 0.0.0.0
```

### Dependencies are inconsistent

Use the committed lockfile to perform a clean installation:

```bash
rm -rf node_modules
npm ci
```

## Saving Changes to Your Own Repository

Create an empty repository on GitHub, then update this checkout's remote:

```bash
git remote rename origin upstream
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

For later changes:

```bash
git add .
git commit -m "Describe the change"
git push
```

## References

- [MediaPipe Tasks Vision for Web](https://ai.google.dev/edge/mediapipe/solutions/vision)
- [Hand Landmarker for Web](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/web_js)
- [Pose Landmarker for Web](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/web_js)
- [Face Landmarker for Web](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/web_js)
- [MDN: MediaDevices.getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)

## License

MIT
