# 🎯 Programming Exercise Collection

In this file, we've prepared a set of exercises so you can learn programming by modifying the Tetris game. From beginner to advanced, you can learn step by step.

## 📚 Table of Contents

1. [Getting Started - Let's Read the Code](#getting-started---lets-read-the-code)
2. [Beginner - Start with Small Changes](#beginner---start-with-small-changes)
3. [Intermediate - Add New Features](#intermediate---add-new-features)
4. [Advanced - Take On Bigger Modifications](#advanced---take-on-bigger-modifications)
5. [Extension - Make Your Own Original Game](#extension---make-your-own-original-game)

---

## Getting Started - Let's Read the Code

### 📖 Exercise 0-1: Understand the Code Structure

**Goal**: Get a sense of the overall structure of the project

1. Open each file and try reading the first 10 lines
2. Answer the following questions:
   - What is the role of `index.html`?
   - What does the `main.js` file do?
   - What's the difference between `tetris.js` and `tracker.js`?

<details>
<summary>💡 Answers</summary>

- `index.html`: Defines the screen structure of the game (HTML)
- `main.js`: Manages the whole app and connects the game with the camera
- `tetris.js`: The game logic for Tetris
- `tracker.js`: The processing that recognizes hand movements

</details>

### 📖 Exercise 0-2: Check Values with console.log

**Goal**: Learn the basics of debugging

Add the following to the `recognizeGesture` function in `src/hand/tracker.js`:

```javascript
recognizeGesture(landmarks) {
    const wrist = landmarks[0];
    const middleBase = landmarks[9];
    
    // Add this here
    console.log('Wrist position:', wrist);
    console.log('Base of the middle finger:', middleBase);
    
    // The existing code below...
}
```

Check the console in your browser's developer tools (F12).

---

## Beginner - Start with Small Changes

### 🔰 Problem 1-1: Try Changing the Game's Colors

**File**: `src/game/tetris.js`

**Task**: Change the colors of the Tetris blocks to your favorite colors

Current code (around line 30):
```javascript
this.colors = [
    '#000000', // 0: empty
    '#00f0f0', // 1: I - cyan
    '#f0f000', // 2: O - yellow
    // ...
];
```

**Hint**: 
- Colors are specified as hexadecimal color codes (#RRGGBB)
- You can pick any color you like with a [color picker](https://www.google.com/search?q=color+picker)

**Challenge**: Try making a rainbow theme!

### 🔰 Problem 1-2: Adjust the Game Speed

**File**: `src/game/tetris.js`

**Task**: Change the game's starting speed

Current code (around line 17):
```javascript
this.dropInterval = 1000; // milliseconds
```

**Experiment**:
1. Change it to `500` → What happens?
2. Change it to `2000` → What happens?
3. Find the speed that feels just right for you

### 🔰 Problem 1-3: Change How the Score Is Calculated

**File**: `src/game/tetris.js`

**Task**: Double the score you get when you clear lines

Current code (inside the `checkLines` function, around line 180):
```javascript
this.score += linesCleared * 100 * this.level;
```

**Challenge**: 
- Add bonus points for clearing multiple lines at once
- Example: 2 lines at once → 300 points, 3 lines → 500 points, 4 lines (a Tetris) → 1000 points

<details>
<summary>💡 Example Solution</summary>

```javascript
// Bonus calculation
let bonus = 0;
switch(linesCleared) {
    case 1: bonus = 100; break;
    case 2: bonus = 300; break;
    case 3: bonus = 500; break;
    case 4: bonus = 1000; break;
}
this.score += bonus * this.level;
```

</details>

---

## Intermediate - Add New Features

### 🏃 Problem 2-1: Next-Piece Display Feature

**Task**: Show the next piece that will fall on the screen

**Steps**:
1. Add a `nextPiece` variable to `tetris.js`
2. Decide the next piece in `spawnPiece`
3. Add a display area to `index.html`
4. Draw the next piece

<details>
<summary>💡 Implementation Hints</summary>

1. Add to tetris.js:
```javascript
constructor(canvas) {
    // Existing code...
    this.nextPiece = null;
    this.nextPieceType = 0;
}

spawnPiece() {
    // Use the current nextPiece
    if (this.nextPiece) {
        this.currentPiece = this.nextPiece;
        // Generate a new next piece
    }
    // ...
}
```

2. Add to the HTML:
```html
<div class="next-piece">
    <h3>Next Piece</h3>
    <canvas id="next-piece-canvas" width="120" height="120"></canvas>
</div>
```

</details>

### 🏃 Problem 2-2: Add Sound Effects

**Task**: Play a sound when a line is cleared

**Steps**:
1. Prepare a sound effect file (or use [free assets](https://freesound.org/))
2. Create an `Audio` object
3. Play it at the right moment

```javascript
// Add to the constructor in tetris.js
this.sounds = {
    lineClear: new Audio('/sounds/line-clear.mp3'),
    gameOver: new Audio('/sounds/game-over.mp3')
};

// Play the sound in the checkLines function
if (linesCleared > 0) {
    this.sounds.lineClear.play();
}
```

### 🏃 Problem 2-3: Particle Effects

**Task**: Show a particle effect when a line is cleared

**Hint**: 
- Manage multiple particles in an array
- Each particle has a position, velocity, color, and lifespan
- Draw them in the `render` function and update them in the `update` function

<details>
<summary>💡 Basic Implementation</summary>

```javascript
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4;
        this.life = 1.0;
        this.color = `hsl(${Math.random() * 360}, 100%, 50%)`;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.1; // gravity
        this.life -= 0.02;
    }
    
    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life;
        ctx.fillRect(this.x, this.y, 4, 4);
        ctx.globalAlpha = 1.0;
    }
}
```

</details>

---

## Advanced - Take On Bigger Modifications

### 🚀 Problem 3-1: Ghost-Piece Feature

**Task**: Show where the current piece will land, drawn semi-transparently

**Skills you'll need**:
- Understanding collision detection
- Working with transparency on the Canvas
- Predictive calculation

### 🚀 Problem 3-2: Multiplayer Mode

**Task**: Add a mode where two people can play at the same time

**What to implement**:
- Split the screen in two
- An independent game instance for each player
- A feature to send blocks to your opponent

### 🚀 Problem 3-3: AI Player

**Task**: Build an AI that plays Tetris automatically

**Algorithm hints**:
1. Calculate every possible placement
2. Evaluate each placement (height, number of holes, chance of clearing lines)
3. Choose the best placement

---

## Extension - Make Your Own Original Game

### 🌟 Project Ideas

#### 1. Tetris × Rhythm Game
- Blocks fall in time with the music
- Get a bonus when you make moves in rhythm

#### 2. Tetris × RPG
- Gain experience points when you clear blocks
- Unlock new abilities when you level up
- A boss battle mode

#### 3. Co-op Tetris
- Two people control one field together
- Split the roles (one person moves, one person rotates)
- Communication is the key

### 🌟 Tips for Building

1. **Start small**: Begin with the basic features first
2. **Test often**: Don't forget to check that it works
3. **Write comments**: So you can look back at it later
4. **Have fun**: Let your creativity shine!

---

## 📝 Learning Log

After you solve each problem, try recording the following:

```markdown
## Problem X-X: [Problem Name]
- Date: 2024/XX/XX
- Difficulty: ★★★☆☆
- Time it took: XX minutes
- What I learned:
  - 
  - 
- Challenges for next time:
  - 
```

---

## 🎉 Congratulations on Finishing!

If you've solved all the problems, you're already a real game developer!

Next steps:
- Publish your own creation on GitHub
- Have friends play it and get their feedback
- Take on new technologies (Three.js, Phaser.js, and so on)
- Try joining a game jam

**Happy Coding! 🚀**