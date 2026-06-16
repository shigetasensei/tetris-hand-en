import { TetrisGame } from './game/tetris.js';
import { HandTracker } from './hand/tracker.js';

class App {
    constructor() {
        this.tetrisCanvas = document.getElementById('tetris-canvas');
        this.cameraVideo = document.getElementById('camera-video');
        this.cameraCanvas = document.getElementById('camera-canvas');
        this.startBtn = document.getElementById('start-btn');
        this.pauseBtn = document.getElementById('pause-btn');

        this.tetrisGame = new TetrisGame(this.tetrisCanvas);
        this.handTracker = new HandTracker(this.cameraVideo, this.cameraCanvas);

        this.isPlaying = false;
        this.isPaused = false;

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.startGame());
        this.pauseBtn.addEventListener('click', () => this.togglePause());

        // Receive gestures from hand tracking
        this.handTracker.onGesture((gesture) => {
            if (!this.isPlaying || this.isPaused) return;

            switch(gesture) {
                case 'left':
                    this.tetrisGame.moveLeft();
                    break;
                case 'right':
                    this.tetrisGame.moveRight();
                    break;
                case 'down':
                    this.tetrisGame.softDrop();
                    break;
                case 'rotate':
                    this.tetrisGame.rotate();
                    break;
            }
        });

        // Keyboard controls (for debugging)
        document.addEventListener('keydown', (e) => {
            if (!this.isPlaying || this.isPaused) return;

            switch(e.key) {
                case 'ArrowLeft':
                    this.tetrisGame.moveLeft();
                    break;
                case 'ArrowRight':
                    this.tetrisGame.moveRight();
                    break;
                case 'ArrowDown':
                    this.tetrisGame.softDrop();
                    break;
                case 'ArrowUp':
                case ' ':
                    this.tetrisGame.rotate();
                    break;
            }
        });
    }

    async startGame() {
        try {
            // Initialize the camera
            await this.handTracker.initialize();

            // Start the game
            this.tetrisGame.start();
            this.isPlaying = true;

            // Update button states
            this.startBtn.disabled = true;
            this.pauseBtn.disabled = false;

            // Start the game loop
            this.gameLoop();

        } catch (error) {
            console.error('Game start error:', error);
            alert('Failed to initialize the camera. Please check that camera access is allowed.');
        }
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        this.pauseBtn.textContent = this.isPaused ? 'Resume' : 'Pause';

        if (this.isPaused) {
            this.tetrisGame.pause();
        } else {
            this.tetrisGame.resume();
            this.gameLoop();
        }
    }

    gameLoop() {
        if (!this.isPlaying || this.isPaused) return;

        // Update and render the game
        this.tetrisGame.update();
        this.tetrisGame.render();

        // Update score and lines
        document.getElementById('score').textContent = this.tetrisGame.score;
        document.getElementById('lines').textContent = this.tetrisGame.lines;

        // Check for game over
        if (this.tetrisGame.isGameOver) {
            this.gameOver();
            return;
        }

        requestAnimationFrame(() => this.gameLoop());
    }

    gameOver() {
        this.isPlaying = false;
        this.startBtn.disabled = false;
        this.startBtn.textContent = 'Play Again';
        this.pauseBtn.disabled = true;

        alert(`Game Over!\nScore: ${this.tetrisGame.score}\nLines: ${this.tetrisGame.lines}`);
    }
}

// Start the application
document.addEventListener('DOMContentLoaded', () => {
    new App();
});
