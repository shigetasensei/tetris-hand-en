# MediaPipe Hand-Tracking Tetris Specification

## 1. Overview
We will develop a simple web application that lets you play Tetris with hand gestures, using MediaPipe's hand-tracking feature. It is built to run in an environment that works with GitHub Codespaces.

## 2. System Requirements

### 2.1 Operating Environment
- **Platform**: Web browser (Chrome recommended)
- **Camera**: Webcam required
- **Runtime environment**: GitHub Codespaces
- **Node.js**: 18.x or higher

### 2.2 Technology Stack (Minimal Setup)
- **Frontend**: HTML5, CSS3, JavaScript
- **Hand tracking**: MediaPipe Hands
- **Game rendering**: Canvas API
- **Development server**: Vite (simple and fast)
- **Package management**: npm

## 3. Steps to Run in the Codespaces Terminal

### 3.1 Setup in the GitHub Codespaces Terminal
```bash
# 1. After opening the repository in Codespaces, run these in the Codespaces terminal

# 2. Create and move into the project directory
mkdir tetris-hand
cd tetris-hand

# 3. Initialize package.json
npm init -y

# 4. Install the required packages
npm install --save-dev vite

# 5. Install the MediaPipe packages
npm install @mediapipe/hands @mediapipe/camera_utils @mediapipe/drawing_utils

# 6. Start the development server
npm run dev

# 7. Preview in the browser (Codespaces forwards the port automatically)
# Click the forwarded URL from the "PORTS" tab
```

### 3.2 Project Creation Commands
```bash
# Create the entire file structure at once (run in the Codespaces terminal)
mkdir -p src/{game,hand} styles
touch index.html src/main.js src/game/tetris.js src/hand/tracker.js styles/main.css
```

### 3.3 Configuring the package.json Scripts
```bash
# Add the development scripts to package.json
npm pkg set scripts.dev="vite"
npm pkg set scripts.build="vite build"
npm pkg set scripts.preview="vite preview"
```

## 4. Feature Specification (Simple Version)

### 4.1 Minimal Game Features
- **Tetris basics**: 7 types of tetrominoes
- **Field**: 10×20 grid
- **Score**: Earn points by clearing lines
- **Game over**: Ends when a piece reaches the top

### 4.2 Simple Gesture Controls
1. **Move left**: Tilt your hand left
2. **Move right**: Tilt your hand right
3. **Drop**: Point your hand down
4. **Rotate**: Raise your index finger

## 5. Simple UI Design

### 5.1 Screen Layout
```
+------------------+------------------+
|                  |                  |
|   Tetris screen  |   Camera feed    |
|   (50%)         |   (50%)          |
|                  |                  |
|  +-----------+   |                  |
|  |  10 x 20  |   |  Hand detection  |
|  |  grid     |   |  status          |
|  +-----------+   |                  |
|                  |                  |
|  Score: 0        |                  |
+------------------+------------------+
```

## 6. Minimal Implementation Structure

### 6.1 Simple File Layout
```
tetris-hand/
├── index.html         # Main HTML
├── package.json       # npm configuration
├── src/
│   ├── main.js        # Main file
│   ├── game/
│   │   └── tetris.js  # Tetris logic
│   └── hand/
│       └── tracker.js # Hand tracking
└── styles/
    └── main.css       # Styles
```

### 6.2 Minimal Code Example

#### index.html
```html
<!DOCTYPE html>
<html>
<head>
    <title>Hand Tetris</title>
    <link rel="stylesheet" href="styles/main.css">
</head>
<body>
    <div id="game-container">
        <canvas id="tetris-canvas"></canvas>
        <video id="camera-video"></video>
    </div>
    <script type="module" src="src/main.js"></script>
</body>
</html>
```

## 7. Steps to Verify It Works in Codespaces

### 7.1 Verifying in the Codespaces Terminal
```bash
# 1. Start the development server in the Codespaces terminal
npm run dev

# 2. Check the "PORTS" tab at the bottom of the Codespaces screen
# 3. Click the forwarded URL (globe icon)
# 4. When the camera permission dialog appears in the browser, click "Allow"
# 5. Point your hand at the camera and test the gestures
```

### 7.2 Troubleshooting in Codespaces
```bash
# If the port does not appear (run in the Codespaces terminal)
npx vite --host

# If you get a MediaPipe error
npm list @mediapipe/hands

# Reinstall the dependencies
rm -rf node_modules package-lock.json
npm install
```

## 8. Minimum Requirements to Run
- Camera access permission
- A stable internet connection (for downloading the MediaPipe model)
- A bright environment (improves hand-recognition accuracy)

## 9. Getting Started with Development in Codespaces
```bash
# Quick start: run everything at once in the Codespaces terminal
npm init -y
npm install --save-dev vite
npm install @mediapipe/hands @mediapipe/camera_utils @mediapipe/drawing_utils
npm pkg set scripts.dev="vite"
mkdir -p src/{game,hand} styles
touch index.html src/main.js src/game/tetris.js src/hand/tracker.js styles/main.css
# After adding the code to the files
npm run dev
```
