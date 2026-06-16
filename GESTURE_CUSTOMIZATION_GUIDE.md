# 🎮 Gesture Customization Guide

This guide explains how hand tracking (gesture) recognition works with MediaPipe, and how to customize it, in a way that's easy to follow even if you're just getting started.

## 📚 Table of Contents

1. [Hand Tracking Basics](#1-hand-tracking-basics)
2. [Understanding the Code Structure](#2-understanding-the-code-structure)
3. [How to Customize Gestures](#3-how-to-customize-gestures)
4. [Practice Problems](#4-practice-problems)
5. [Advanced Customization](#5-advanced-customization)

## 1. Hand Tracking Basics

### MediaPipe's 21 Landmarks

MediaPipe represents a hand using 21 points (landmarks):

```
    8   12  16  20  ← Fingertips (Tip)
    |   |   |   |
    7   11  15  19
    |   |   |   |
    6   10  14  18
    |   |   |   |
4   5   9   13  17  ← Finger bases (MCP)
 \ | / | / | /
  \|/ |/ |/
   3  2  1
    \ | /
     \|/
      0 ← Wrist
```

What each number means:
- 0: Wrist
- 1-4: Thumb
- 5-8: Index finger
- 9-12: Middle finger
- 13-16: Ring finger
- 17-20: Pinky

### Coordinate System

Each landmark has three values:
- `x`: Left-right position (0.0–1.0)
- `y`: Up-down position (0.0–1.0)
- `z`: Depth (distance from the camera)

## 2. Understanding the Code Structure

### The Important File

```
src/hand/tracker.js  ← This is where gestures are recognized
```

### How Gesture Recognition Works

```javascript
// The key part of tracker.js

recognizeGesture(landmarks) {
    // 1. Get the landmarks you need
    const wrist = landmarks[0];        // Wrist
    const middleBase = landmarks[9];   // Base of the middle finger
    
    // 2. Do some calculations and checks
    const angle = /* calculate the angle */;
    
    // 3. Decide on a gesture and return it
    if (angle < -30) {
        return 'right';
    }
    // ...
}
```

## 3. How to Customize Gestures

### 🎯 Basic Customization Examples

#### Example 1: Change the sensitivity of the hand tilt

The current code (around line 90 of tracker.js):
```javascript
// Calculate the hand's tilt
const angle = Math.atan2(middleBase.y - wrist.y, middleBase.x - wrist.x) * 180 / Math.PI;

// Decide on a gesture
if (angle < -30) {
    return 'right';
} else if (angle > 30) {
    return 'left';
}
```

**Customization example**: make it more sensitive
```javascript
// Change the angle to 20 degrees (reacts to a smaller tilt)
if (angle < -20) {    // -30 → -20
    return 'right';
} else if (angle > 20) {  // 30 → 20
    return 'left';
}
```

#### Example 2: Add a new gesture

**Add a feature that pauses the game with a "fist"**

1. First, add a function to tracker.js that checks whether the fingers are closed:

```javascript
// Check whether all fingers are closed
isFist(landmarks) {
    // Check the distance between each fingertip and its base
    const fingers = [
        { tip: 4, base: 2 },   // Thumb
        { tip: 8, base: 5 },   // Index finger
        { tip: 12, base: 9 },  // Middle finger
        { tip: 16, base: 13 }, // Ring finger
        { tip: 20, base: 17 }  // Pinky
    ];
    
    for (let finger of fingers) {
        const tipY = landmarks[finger.tip].y;
        const baseY = landmarks[finger.base].y;
        
        // If the fingertip is above the base (the finger is open)
        if (tipY < baseY - 0.05) {
            return false;
        }
    }
    
    return true;  // All fingers are closed
}
```

2. Add it to the recognizeGesture function:

```javascript
recognizeGesture(landmarks) {
    // Existing code...
    
    // Add the fist check
    if (this.isFist(landmarks)) {
        return 'pause';
    }
    
    // Existing checks...
}
```

3. Handle the pause action in main.js:

```javascript
switch(gesture) {
    // Existing cases...
    case 'pause':
        this.togglePause();
        break;
}
```

### 🎨 Adding Visual Feedback

Show the hand's state on screen to make debugging easier:

```javascript
// Add this inside the onResults function in tracker.js
onResults(results) {
    // Existing code...
    
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        
        // Display debug info
        const wrist = landmarks[0];
        const middleBase = landmarks[9];
        const angle = Math.atan2(middleBase.y - wrist.y, middleBase.x - wrist.x) * 180 / Math.PI;
        
        // Show the angle on screen (you'll need to add a new element)
        console.log(`Hand angle: ${angle.toFixed(1)} degrees`);
    }
}
```

## 4. Practice Problems

### 🔰 Beginner Problems

#### Problem 1: Make a peace sign (✌️) trigger a special action

Hints:
- Only the index finger (8) and middle finger (12) are extended
- The other fingers are bent

<details>
<summary>💡 See an example solution</summary>

```javascript
isPeaceSign(landmarks) {
    // Is the index finger extended?
    const indexExtended = landmarks[8].y < landmarks[5].y - 0.1;
    
    // Is the middle finger extended?
    const middleExtended = landmarks[12].y < landmarks[9].y - 0.1;
    
    // Is the ring finger bent?
    const ringBent = landmarks[16].y > landmarks[13].y - 0.05;
    
    // Is the pinky bent?
    const pinkyBent = landmarks[20].y > landmarks[17].y - 0.05;
    
    return indexExtended && middleExtended && ringBent && pinkyBent;
}
```

</details>

#### Problem 2: Build a sensitivity adjustment feature

Create a settings file so you can change the angle threshold.

<details>
<summary>💡 See an example solution</summary>

1. Add a variable to hold the settings:

```javascript
// Add this near the top of tracker.js
class HandTracker {
    constructor(videoElement, canvasElement) {
        // Existing code...
        
        // Setting values
        this.settings = {
            leftAngle: 30,
            rightAngle: -30,
            gestureThreshold: 300
        };
    }
}
```

2. Change the code to use the settings:

```javascript
recognizeGesture(landmarks) {
    // Existing code...
    
    if (angle < this.settings.rightAngle) {
        return 'right';
    } else if (angle > this.settings.leftAngle) {
        return 'left';
    }
}
```

</details>

### 🏃 Intermediate Problems

#### Problem 3: Change the speed based on how many fingers are up

Use the number of open fingers to control the drop speed.

<details>
<summary>💡 See an example solution</summary>

```javascript
countOpenFingers(landmarks) {
    let count = 0;
    const fingers = [
        { tip: 4, base: 2 },   // Thumb
        { tip: 8, base: 5 },   // Index finger
        { tip: 12, base: 9 },  // Middle finger
        { tip: 16, base: 13 }, // Ring finger
        { tip: 20, base: 17 }  // Pinky
    ];
    
    for (let i = 0; i < fingers.length; i++) {
        const finger = fingers[i];
        
        if (i === 0) { // For the thumb, check horizontally
            if (Math.abs(landmarks[finger.tip].x - landmarks[finger.base].x) > 0.1) {
                count++;
            }
        } else { // For the other fingers, check vertically
            if (landmarks[finger.tip].y < landmarks[finger.base].y - 0.05) {
                count++;
            }
        }
    }
    
    return count;
}

// Add to recognizeGesture
const openFingers = this.countOpenFingers(landmarks);
if (openFingers === 1) {
    return 'slow_drop';
} else if (openFingers === 5) {
    return 'fast_drop';
}
```

</details>

### 🚀 Advanced Problems

#### Problem 4: Combining gestures

Implement a feature that rotates the piece when you "raise your index finger and rotate your hand."

Hints:
- Remember the hand's position from the previous frame
- Track the movement of the hand's center point
- Detect a circular motion

<details>
<summary>💡 See an example solution</summary>

```javascript
class HandTracker {
    constructor(videoElement, canvasElement) {
        // Existing code...
        
        // Hand position history
        this.handHistory = [];
        this.maxHistoryLength = 10;
    }
    
    detectCircularMotion(landmarks) {
        // Calculate the center of the hand
        const palmCenter = {
            x: (landmarks[0].x + landmarks[5].x + landmarks[17].x) / 3,
            y: (landmarks[0].y + landmarks[5].y + landmarks[17].y) / 3
        };
        
        // Add it to the history
        this.handHistory.push(palmCenter);
        if (this.handHistory.length > this.maxHistoryLength) {
            this.handHistory.shift();
        }
        
        // If we don't have enough history yet
        if (this.handHistory.length < this.maxHistoryLength) {
            return false;
        }
        
        // Calculate the total distance traveled
        let totalDistance = 0;
        for (let i = 1; i < this.handHistory.length; i++) {
            const dx = this.handHistory[i].x - this.handHistory[i-1].x;
            const dy = this.handHistory[i].y - this.handHistory[i-1].y;
            totalDistance += Math.sqrt(dx * dx + dy * dy);
        }
        
        // Distance between the start and end points
        const startEnd = Math.sqrt(
            Math.pow(this.handHistory[0].x - palmCenter.x, 2) +
            Math.pow(this.handHistory[0].y - palmCenter.y, 2)
        );
        
        // Check whether the hand is drawing a circle
        return totalDistance > 0.3 && startEnd < 0.1;
    }
}
```

</details>

## 5. Advanced Customization

### 🎯 Custom Gestures with Machine Learning

If you want to recognize more complex gestures, you can build your own classifier using TensorFlow.js.

```javascript
// Example of a future extension
class CustomGestureRecognizer {
    async loadModel() {
        this.model = await tf.loadLayersModel('/models/custom-gestures/model.json');
    }
    
    async predict(landmarks) {
        // Convert the landmarks into an array
        const input = landmarks.flatMap(l => [l.x, l.y, l.z]);
        const prediction = await this.model.predict(tf.tensor2d([input]));
        return prediction;
    }
}
```

### 🎨 Building a Debug Tool

To make development easier, add a debug mode:

```javascript
// Add this to tracker.js
enableDebugMode() {
    this.debugMode = true;
    
    // Create the debug panel
    const debugPanel = document.createElement('div');
    debugPanel.id = 'debug-panel';
    debugPanel.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 10px;
        font-family: monospace;
    `;
    document.body.appendChild(debugPanel);
}

updateDebugInfo(landmarks) {
    if (!this.debugMode) return;
    
    const panel = document.getElementById('debug-panel');
    const angle = this.calculateAngle(landmarks);
    const gesture = this.recognizeGesture(landmarks);
    
    panel.innerHTML = `
        <h3>Debug Info</h3>
        <p>Angle: ${angle.toFixed(1)}°</p>
        <p>Gesture: ${gesture || 'none'}</p>
        <p>FPS: ${this.fps}</p>
    `;
}
```

## 🎓 Summary

What you learned in this guide:
1. MediaPipe's landmark system
2. The basics of how gesture recognition works
3. How to create custom gestures
4. How to debug and test

### Next Steps

- Try implementing more complex gestures
- Add controls that use two hands
- Build a feature that learns gestures
- Create a feature for sharing gestures with friends

## 📚 Reference Links

- [MediaPipe Official Documentation](https://google.github.io/mediapipe/solutions/hands.html)
- [JavaScript MDN Web Docs](https://developer.mozilla.org/ja/docs/Web/JavaScript)
- [TensorFlow.js](https://www.tensorflow.org/js)

---

💡 **Tip**: Whenever something isn't clear, use console logs (`console.log()`) to check values as you go!
