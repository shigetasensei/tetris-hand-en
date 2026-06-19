# Gesture Customization Guide

This guide describes the current MediaPipe Tasks Vision implementation and the two supported ways to customize controls:

1. Record poses through the application's **Custom poses** interface.
2. Change or extend the recognition code in `src/hand/tracker.js`.

## Tracking Pipeline

The important files are:

```text
index.html                 Tracking settings and pose-recording controls
src/main.js                Maps recognized commands to game actions
src/hand/tracker.js        Camera, MediaPipe models, recognition, templates
src/game/tetris.js         Tetris state and movement
```

The runtime flow is:

```text
webcam frame
  → HandLandmarker / PoseLandmarker / FaceLandmarker
  → readObservation(result)
  → standard recognizer or custom-template matcher
  → handleGesture(command)
  → App.executeCommand(command)
  → TetrisGame
```

The project uses `@mediapipe/tasks-vision`. It does not use the older MediaPipe Solutions packages such as `@mediapipe/hands` or `@mediapipe/camera_utils`.

## MediaPipe Results

### Hand mode

`HandLandmarker` produces 21 landmarks. Useful indices include:

```text
0     wrist
4     thumb tip
5/8   index base/tip
9/12  middle base/tip
13/16 ring base/tip
17/20 pinky base/tip
```

Each landmark has normalized `x`, `y`, and `z` coordinates. `x` increases across the image and `y` increases downward.

The current result access is:

```javascript
const result = this.landmarker.detectForVideo(this.video, timestamp);

if (result.landmarks?.length) {
    const landmarks = result.landmarks[0];
    const gesture = this.recognizeHandGesture(landmarks);
}
```

### Full-body mode

`PoseLandmarker` produces 33 landmarks. The standard controls use shoulders (`11`, `12`), wrists (`15`, `16`), hips (`23`, `24`), knees (`25`, `26`), and ankles (`27`, `28`).

### Eye mode

`FaceLandmarker` provides face and iris landmarks. With `outputFaceBlendshapes: true`, it also provides `eyeBlinkLeft` and `eyeBlinkRight` scores. The eye recognizer combines those scores with a calibrated horizontal gaze value.

## Standard Recognition

### Hand tilt

The current hand recognizer is `recognizeHandGesture(landmarks)`. Tilt is measured relative to the vertical wrist-to-middle-finger direction:

```javascript
const wrist = landmarks[0];
const middleBase = landmarks[9];
const handTilt = Math.atan2(
    middleBase.x - wrist.x,
    wrist.y - middleBase.y
) * 180 / Math.PI;

if (handTilt > this.tiltAngle) return 'left';
if (handTilt < -this.tiltAngle) return 'right';
```

To make tilt recognition more sensitive, reduce the default `tiltAngle` in the `HandTracker` constructor. To require a larger movement, increase it.

### Full-body poses

`recognizeBodyGesture(landmarks)` implements these defaults:

- both wrists above their shoulders → `rotate`
- left arm held sideways → `left`
- right arm held sideways → `right`
- knee angle below the squat threshold → `down`

### Eye controls

`recognizeEyeGesture(eyeState)` implements these defaults:

- horizontal gaze offset → `left` or `right`
- left-eye wink → `rotate`
- right-eye wink → `down`

Center calibration stores the neutral gaze value in `localStorage`.

## Record Custom Poses Without Editing Code

This is the recommended customization path for students.

1. Start the game so the camera and selected model are active.
2. Select **Custom poses** under **Control profile**.
3. Choose `Move left`, `Move right`, `Move down`, or `Rotate`.
4. Press **Record pose**.
5. Hold a stable pose until the progress bar finishes.
6. Repeat for the other commands.

The tracker collects 30 feature samples, averages them, and stores the template under the active mode. Hand, body, and eye templates are separate.

Features are normalized before storage:

- hand landmarks use the wrist as origin and palm length as scale
- body landmarks use the hip midpoint as origin and shoulder width as scale
- eye templates use gaze and left/right blink scores

`recognizeCustomGesture(features)` selects the nearest registered template when its root-mean-square distance is below `customThreshold`.

Use **Reset** to remove templates for the selected mode.

## Add a New Code-Based Gesture

All recognized commands must eventually map to a game action. The built-in commands are `left`, `right`, `down`, and `rotate`.

For example, to recognize a fist in hand mode:

```javascript
isFist(landmarks) {
    const fingers = [
        { tip: 8, base: 5 },
        { tip: 12, base: 9 },
        { tip: 16, base: 13 },
        { tip: 20, base: 17 }
    ];

    return fingers.every(({ tip, base }) =>
        landmarks[tip].y >= landmarks[base].y - this.fingerExtendThreshold
    );
}
```

Call it near the start of `recognizeHandGesture`:

```javascript
recognizeHandGesture(landmarks) {
    if (this.isFist(landmarks)) return 'down';

    // Existing recognition follows.
}
```

Reusing an existing command requires no change in `src/main.js`. If you introduce a new command name, add it to both places:

1. The `COMMANDS` array in `src/hand/tracker.js` if it can be recorded.
2. The `actions` map in `App.executeCommand()` in `src/main.js`.

## Add Debug Output

Use the existing status callback instead of querying old MediaPipe result fields:

```javascript
this.handTracker.onStatus(status => {
    console.log({
        mode: status.mode,
        detected: status.detected,
        gesture: status.gesture,
        message: status.message
    });
});
```

For a hand-tilt value, temporarily log it inside `recognizeHandGesture` after calculating `handTilt`:

```javascript
console.log('Hand tilt:', handTilt.toFixed(1));
```

Remove per-frame logs after debugging because they can produce a large amount of console output.

## Practice Tasks

### Beginner: Peace sign

Create `isPeaceSign(landmarks)` by checking that the index and middle fingertips are above their bases while the ring and pinky fingers are not. Call it from `recognizeHandGesture` and map it to an existing command.

### Intermediate: Tune a body pose

In `recognizeBodyGesture`, change the sideways-arm tolerance and test different distances from the camera. Keep the conditions mutually exclusive so extending both arms does not produce alternating left/right commands.

### Intermediate: Add an eye control profile

Add a profile that does not require winking. For example, distinguish a short two-eye blink from a longer eye closure. Keep timing state separate from the landmark calculation.

### Advanced: Dynamic gesture

Store a short sequence of normalized features and compare it with a recorded sequence. Static template averaging cannot distinguish motion direction, so a dynamic gesture needs time-series matching.

## Common Pitfalls

- `detectForVideo()` is synchronous and can block the UI. Keep the existing frame-rate limit unless processing is moved to a worker.
- The preview canvas is mirrored. Validate left/right behavior using a real camera whenever changing `x` calculations.
- Do not save raw camera frames for custom poses; the current template system only needs normalized numeric features.
- Avoid firing rotation repeatedly. `handleGesture()` intentionally treats `rotate` as non-repeatable until the gesture returns to neutral.
- When changing modes, close the old landmarker before creating the new one to avoid retaining model resources.

## References

- [MediaPipe Tasks Vision for Web](https://ai.google.dev/edge/mediapipe/solutions/vision)
- [Hand Landmarker for Web](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/web_js)
- [Pose Landmarker for Web](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/web_js)
- [Face Landmarker for Web](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/web_js)
- [MDN JavaScript Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide)
