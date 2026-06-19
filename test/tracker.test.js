import assert from 'node:assert/strict';
import test from 'node:test';
import { HandTracker } from '../src/hand/tracker.js';

function createTracker() {
    return Object.assign(Object.create(HandTracker.prototype), {
        tiltAngle: 30,
        dropThreshold: 0.1,
        gazeThreshold: 0.1,
        gazeVerticalThreshold: 0.12,
        indexExtendThreshold: 0.1,
        fingerExtendThreshold: 0.05,
        eyeCalibration: { gaze: 0.5, gazeY: 0.5 },
        eyeControlStyle: 'accessible',
        bodyShoulderBaseline: null
    });
}

function createStraightPose() {
    const pose = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5 }));
    Object.assign(pose[11], { x: 0.4, y: 0.3 });
    Object.assign(pose[12], { x: 0.6, y: 0.3 });
    Object.assign(pose[15], { x: 0.4, y: 0.6 });
    Object.assign(pose[16], { x: 0.6, y: 0.6 });
    for (const [hip, knee, ankle, x] of [[23, 25, 27, 0.45], [24, 26, 28, 0.55]]) {
        Object.assign(pose[hip], { x, y: 0.55 });
        Object.assign(pose[knee], { x, y: 0.72 });
        Object.assign(pose[ankle], { x, y: 0.9 });
    }
    return pose;
}

test('landmark mirroring changes only the x coordinate', () => {
    const tracker = createTracker();
    const original = [{ x: 0.2, y: 0.3, z: -0.1, visibility: 0.9 }];

    const mirrored = tracker.mirrorLandmarks(original);

    assert.deepEqual(mirrored, [{ x: 0.8, y: 0.3, z: -0.1, visibility: 0.9 }]);
    assert.equal(original[0].x, 0.2);
});

test('hand tilt follows mirrored preview directions', () => {
    const tracker = createTracker();
    const hand = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.6 }));
    Object.assign(hand[0], { x: 0.5, y: 0.8 });
    Object.assign(hand[9], { x: 0.75, y: 0.5 });
    assert.equal(tracker.recognizeHandGesture(hand), 'right');

    Object.assign(hand[9], { x: 0.25, y: 0.5 });
    assert.equal(tracker.recognizeHandGesture(hand), 'left');
});

test('sideways arms follow mirrored preview directions', () => {
    const tracker = createTracker();
    const pose = createStraightPose();
    Object.assign(pose[15], { x: 0.2, y: 0.3 });
    assert.equal(tracker.recognizeBodyGesture(pose), 'left');

    Object.assign(pose[15], { x: 0.4, y: 0.6 });
    Object.assign(pose[16], { x: 0.8, y: 0.3 });
    assert.equal(tracker.recognizeBodyGesture(pose), 'right');
});

test('gaze follows mirrored preview directions', () => {
    const tracker = createTracker();
    assert.equal(tracker.recognizeEyeGesture({ gaze: 0.7, blinkLeft: 0, blinkRight: 0 }), 'right');
    assert.equal(tracker.recognizeEyeGesture({ gaze: 0.3, blinkLeft: 0, blinkRight: 0 }), 'left');
});

test('wink-free eye controls rotate with both eyes and drop with upward gaze', () => {
    const tracker = createTracker();
    assert.equal(tracker.recognizeEyeGesture({
        gaze: 0.5, gazeY: 0.5, blinkLeft: 0.8, blinkRight: 0.8
    }), 'rotate');
    assert.equal(tracker.recognizeEyeGesture({
        gaze: 0.5, gazeY: 0.3, blinkLeft: 0, blinkRight: 0
    }), 'down');
});

test('optional wink controls keep separate rotate and drop gestures', () => {
    const tracker = createTracker();
    tracker.eyeControlStyle = 'wink';
    assert.equal(tracker.recognizeEyeGesture({
        gaze: 0.5, gazeY: 0.5, blinkLeft: 0.8, blinkRight: 0.1
    }), 'rotate');
    assert.equal(tracker.recognizeEyeGesture({
        gaze: 0.5, gazeY: 0.5, blinkLeft: 0.1, blinkRight: 0.8
    }), 'down');
});

test('shoulder drop works when leg landmarks are not visible', () => {
    const tracker = createTracker();
    tracker.bodyShoulderBaseline = 0.3;
    const pose = createStraightPose();
    for (const index of [23, 24, 25, 26, 27, 28]) pose[index].visibility = 0.1;
    pose[11].y = 0.4;
    pose[12].y = 0.4;
    pose[15] = { x: 0.4, y: 0.65 };
    pose[16] = { x: 0.6, y: 0.65 };

    assert.equal(tracker.recognizeBodyGesture(pose), 'down');
    assert.equal(tracker.lastDebugMetrics.legsVisible, false);
    assert.equal(tracker.lastDebugMetrics.kneeAngle, null);
});
