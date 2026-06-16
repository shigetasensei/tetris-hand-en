# Hand Tracking Tetris

A web app that lets you play Tetris with hand gestures, powered by MediaPipe hand tracking.

## 📚 Learning Documents

- 🎮 **[Gesture Customization Guide](./GESTURE_CUSTOMIZATION_GUIDE.md)** - How gestures work and how to customize them
- 🎯 **[Programming Exercises](./PROGRAMMING_EXERCISES.md)** - Practice problems from beginner to advanced

## Demo

Point your hand at the camera and use these gestures to play Tetris:
- 👈 Tilt your hand left: move the piece left
- 👉 Tilt your hand right: move the piece right
- 👇 Point your hand down: hard drop the piece
- ☝️ Raise your index finger: rotate the piece

## Detailed Setup with GitHub Codespaces

### 1. Launch Codespaces

#### Starting from a GitHub repository
1. Open this repository on GitHub
2. Click the green "Code" button
3. Select the "Codespaces" tab
4. Click "Create codespace on main"
5. Wait for Codespaces to launch in a new tab (the first time takes 2-3 minutes)

#### Starting as a brand-new project
1. Log in to GitHub.com
2. Click the "+" icon in the top right and choose "New codespace"
3. Pick the "Blank" template and launch it

### 2. Set Up the Project

Once Codespaces has launched, run these commands one by one in the terminal at the bottom:

```bash
# 1. Create the project folder if you don't have one (new projects only)
mkdir tetris-hand
cd tetris-hand

# 2. Copy this repository's files (skip this if you already have the files)
# If the files are already there, skip this step
git clone https://github.com/itoksk/tetris-hand.git temp_clone
cp -r temp_clone/* .
cp -r temp_clone/.* . 2>/dev/null || true
rm -rf temp_clone

# 3. Clean up before installing dependencies (recommended)
rm -rf node_modules package-lock.json
npm cache clean --force

# 4. Install dependencies
npm install

# 5. Start the dev server
npm run dev

# If npm run dev gives you an error, run this instead
npx vite --host 0.0.0.0
```

### 3. Open the Application

#### Check port forwarding
1. Click the "PORTS" tab at the bottom of the Codespaces window
2. Wait for port "5173" (Vite's default) to appear
3. If the port doesn't show up, check the URL printed in the terminal

#### Open the app in your browser
1. Click the globe icon (🌐) on the "5173" row in the PORTS tab
2. The app opens in a new tab
3. Or copy the URL from the "Forwarded Address" column and open it in a new tab

### 4. Set Up the Camera

1. When the app opens in your browser, a dialog will ask for camera access
2. Click "Allow"
3. The camera starts up and you'll see your video feed on the right side of the screen

### 5. Start the Game

1. Click the "Start Game" button
2. Show your hand to the camera and use these gestures to play:
   - Tilt your hand left → the piece moves left
   - Tilt your hand right → the piece moves right
   - Point your hand down → the piece hard drops
   - Raise your index finger → the piece rotates

## Quick Start (First-Time Setup)

Copy and paste these commands into the Codespaces terminal and run them:

```bash
# Start from a clean environment
rm -rf node_modules package-lock.json
npm cache clean --force

# Initialize and install packages
npm init -y
npm install --save-dev vite
npm install @mediapipe/hands @mediapipe/camera_utils @mediapipe/drawing_utils

# Set up the scripts
npm pkg set scripts.dev="vite"
npm pkg set scripts.build="vite build"
npm pkg set scripts.preview="vite preview"

# Start the dev server
npm run dev

# If you get an error
npx vite --host 0.0.0.0
```

## How to Save to Your Own GitHub Repository

After you've customized the program, here's how to save it to your own GitHub account:

### 1. Create a New Repository on GitHub
1. Log in to [GitHub](https://github.com)
2. Click the "+" icon in the top right → "New repository"
3. Settings:
   - Repository name: `my-tetris-hand` (any name you like is fine)
   - Description: something like "A Tetris game you control with hand gestures"
   - Choose Public or Private
   - **Important**: **uncheck** "Add a README file"
4. Click "Create repository"

### 2. Run These Commands in Codespaces

```bash
# Initialize as a Git repository (if you haven't already)
git init

# Stage all the files
git add .

# First commit
git commit -m "Create a Tetris game controlled with hand gestures"

# Connect to your own repository (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/my-tetris-hand.git

# Set the main branch
git branch -M main

# Push to GitHub
git push -u origin main
```

### 3. Saving Future Changes

```bash
# Check which files you changed
git status

# Stage your changes
git add .

# Commit (write a message describing what you changed)
git commit -m "Adjust gesture sensitivity"

# Push to GitHub
git push
```

### Common Errors and Fixes

**If you get an authentication error**
```bash
# Set your GitHub username and email
git config --global user.name "Your GitHub username"
git config --global user.email "Your email address"
```

**If the remote repository already exists**
```bash
# Check the current remote settings
git remote -v

# Remove the existing remote and set it again
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/my-tetris-hand.git
```

## Project Structure

```
tetris-hand/
├── README.md          # This file
├── index.html         # Main HTML
├── package.json       # npm settings
├── src/
│   ├── main.js        # Entry point
│   ├── game/
│   │   └── tetris.js  # Tetris game logic
│   └── hand/
│       └── tracker.js # Hand tracking
└── styles/
    └── main.css       # Stylesheet
```

## About MediaPipe Hands

### What is MediaPipe Hands?

MediaPipe Hands is a **hand-shape recognition technology** developed by Google. From the image of a hand captured by a camera, it can detect the position of the hand and the locations of the finger joints in real time.

#### To put it simply...
- Have you ever used the feature on your phone's camera that adds effects to your face?
- MediaPipe Hands works the same way, but it recognizes your "hand" and tracks its movements
- It represents the shape of your hand using **21 points** (landmarks)

### How Does It Recognize Hands?

#### 1. Using machine learning
MediaPipe Hands uses a technology called **deep learning**. This is a computer program that imitates how the human brain works.

- You show it lots of hand images and teach it "this is a hand"
- The computer automatically learns the features of a hand
- When you show it a new image, it uses what it learned to find the hand

#### 2. How the processing works
1. **Hand detection**: find where the hand is in the image
2. **Landmark detection**: pinpoint the 21 key points of the hand (such as the finger joints)
3. **Tracking**: keep following the hand in the next frame

### Implementation in JavaScript

This project uses the JavaScript version of MediaPipe Hands. One of its strengths is that it runs not only in Python but right in a web browser.

```javascript
// Basic usage of MediaPipe Hands
import {Hands} from '@mediapipe/hands';

// Hand recognition settings
const hands = new Hands({
  maxNumHands: 2,        // Recognize up to 2 hands
  modelComplexity: 1,    // Model complexity (0-1)
  minDetectionConfidence: 0.5,  // Detection confidence (0-1)
});
```

### Core Technology and Industry Applications

#### 1. Computer vision
MediaPipe Hands is a technology in the field of **computer vision**. This is the technology of "giving computers eyes" — it extracts meaningful information from camera images.

#### 2. Examples of industry applications

**Manufacturing**
- Analyzing workers' movements on the factory floor
- Detecting dangerous movements and issuing warnings
- Automatically checking manual work for quality control

**Healthcare and Rehabilitation**
- Supporting hand-movement rehabilitation
- Automatic sign language translation systems
- Analyzing surgeons' operating techniques

**Entertainment**
- Natural hand control in VR/AR
- Motion controls for games
- Playing instruments like a virtual piano

**Automotive Industry**
- Gesture controls while driving
- Detecting driver fatigue
- Controlling in-car entertainment

#### 3. Connection to Network Technology

**Edge computing**
- MediaPipe processes everything on the device (the edge), so there's no network lag
- It can run fast while keeping your data private

**WebRTC (Web Real-Time Communication)**
- The technology for handling camera video in the browser
- It makes real-time video processing possible

### Key Takeaways for Learning

1. **Math matters**: coordinate calculations and matrix operations are used here
2. **Programming**: real-time processing is implemented in JavaScript
3. **Problem-solving**: figuring out how to turn hand movements into game controls

By learning technology like this, you could go on to work in fields such as robotics, AI development, and human interface design.

## Requirements

- You need a webcam
- Chrome is recommended (for MediaPipe compatibility)
- A well-lit room is recommended

## Troubleshooting

### Common Codespaces Problems and Solutions

#### If the port doesn't appear
```bash
# Launch with the host explicitly specified
npx vite --host 0.0.0.0

# Or launch on a different port
npx vite --port 3000 --host
```

#### If npm install gives an error
```bash
# Clear the cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

#### If the camera isn't recognized
1. Check the camera icon on the left side of your browser's address bar
2. Make sure the camera isn't blocked
3. Allow it under browser Settings → Privacy and security → Site settings → Camera
4. Codespaces is served over HTTPS automatically, so camera access works

#### If hand recognition isn't working well
- Make sure there's good contrast between your hand and the background
- Keep a distance of 30-100 cm from the camera
- Make sure there's enough light
- Show your palm clearly toward the camera

#### If Codespaces feels slow
1. Check your Codespaces machine type (the free tier has 2 cores and 4GB RAM)
2. Close unnecessary tabs and applications
3. Enable hardware acceleration in your browser

## License

MIT
