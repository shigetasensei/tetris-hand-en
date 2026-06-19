import { TetrisGame } from './game/tetris.js';
import { HandTracker } from './hand/tracker.js';

const MODE_HELP = {
    hand: 'Tilt your hand to move, point one index finger to rotate, or point the hand downward to hard drop.',
    body: 'Hold your left or right arm out sideways to move. Raise both hands to rotate. Squat to hard drop.',
    eyes: 'Look left or right to move. Choose a wink-free or wink control style below.'
};
const COMMAND_LABELS = {
    left: 'Move left',
    right: 'Move right',
    down: 'Hard drop',
    rotate: 'Rotate'
};

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
        this.trackerInitialized = false;

        this.setupEventListeners();
        this.setupSettingsListeners();
        this.applyInitialSettings();
    }

    setupSettingsListeners() {
        this.modeSelect = document.getElementById('tracking-mode');
        this.profileSelect = document.getElementById('control-profile');
        this.modeHelp = document.getElementById('mode-help');
        this.registrationPanel = document.getElementById('pose-registration');
        this.eyeCalibrationPanel = document.getElementById('eye-calibration');
        this.eyeControlSettings = document.getElementById('eye-control-settings');
        this.eyeControlStyle = document.getElementById('eye-control-style');
        this.registrationStatus = document.getElementById('registration-status');
        this.progressBar = document.getElementById('recording-progress-bar');
        this.recordPoseBtn = document.getElementById('record-pose-btn');

        this.modeSelect.addEventListener('change', async event => {
            this.setSettingsBusy(true);
            try {
                await this.handTracker.setMode(event.target.value);
                this.updateSettingsVisibility();
                this.updateRegisteredCommands();
            } catch (error) {
                console.error('Mode change error:', error);
                alert('Failed to load the selected tracking model. Check your network connection.');
            } finally {
                this.setSettingsBusy(false);
            }
        });

        this.profileSelect.addEventListener('change', event => {
            this.handTracker.setProfile(event.target.value);
            this.updateSettingsVisibility();
            this.updateRegisteredCommands();
        });

        this.eyeControlStyle.addEventListener('change', event => {
            this.handTracker.setEyeControlStyle(event.target.value);
            this.updateSettingsVisibility();
        });

        this.recordPoseBtn.addEventListener('click', () => {
            if (!this.trackerInitialized) {
                this.registrationStatus.textContent = 'Start the camera before recording a pose.';
                return;
            }
            const command = document.getElementById('pose-command').value;
            this.handTracker.startPoseRegistration(command);
        });

        document.getElementById('reset-poses-btn').addEventListener('click', () => {
            this.handTracker.resetTemplatesForMode();
            this.progressBar.style.width = '0%';
            this.updateRegisteredCommands();
        });

        document.getElementById('calibrate-eyes-btn').addEventListener('click', () => {
            const calibrated = this.handTracker.calibrateEyes();
            document.getElementById('eye-calibration-status').textContent = calibrated
                ? 'Center gaze calibrated.'
                : 'Look at the center after starting the camera, then try again.';
        });

        this.handTracker.onStatus(status => {
            document.getElementById('hand-status').textContent = status.message
                || (status.detected ? `${status.mode} detected` : 'Not detected');
            document.getElementById('gesture-type').textContent = status.gesture
                ? COMMAND_LABELS[status.gesture]
                : '-';
            this.updateDebugDisplay(status);
        });

        this.handTracker.onRegistration(event => {
            if (event.state === 'recording') {
                this.recordPoseBtn.disabled = true;
                this.progressBar.style.width = `${Math.round(event.progress * 100)}%`;
                this.registrationStatus.textContent = `Recording ${COMMAND_LABELS[event.command]}...`;
            } else if (event.state === 'saved') {
                this.recordPoseBtn.disabled = false;
                this.progressBar.style.width = '100%';
                this.registrationStatus.textContent = `${COMMAND_LABELS[event.command]} pose saved.`;
                this.updateRegisteredCommands();
            } else {
                this.recordPoseBtn.disabled = false;
                this.progressBar.style.width = '0%';
            }
        });
    }

    applyInitialSettings() {
        this.modeSelect.value = this.handTracker.mode;
        this.profileSelect.value = this.handTracker.profile;
        this.eyeControlStyle.value = this.handTracker.eyeControlStyle;
        this.updateSettingsVisibility();
        this.updateRegisteredCommands();
    }

    updateSettingsVisibility() {
        if (this.handTracker.mode === 'eyes') {
            this.modeHelp.textContent = this.handTracker.eyeControlStyle === 'wink'
                ? 'Look left or right to move. Wink left to rotate and wink right to hard drop.'
                : 'Look left or right to move. Close both eyes to rotate and look up to hard drop.';
        } else {
            this.modeHelp.textContent = MODE_HELP[this.handTracker.mode];
        }
        this.registrationPanel.hidden = this.handTracker.profile !== 'custom';
        this.eyeCalibrationPanel.hidden = this.handTracker.mode !== 'eyes';
        this.eyeControlSettings.hidden = this.handTracker.mode !== 'eyes';
    }

    updateDebugDisplay(status) {
        const metrics = status.metrics || {};
        const lines = [
            `mode: ${status.mode}`,
            `detected: ${status.detected ? 'yes' : 'no'}`,
            `gesture: ${status.gesture || 'none'}`,
            `inference FPS: ${Number(metrics.fps || 0).toFixed(1)}`
        ];
        if (metrics.handTilt !== undefined) lines.push(`hand tilt: ${metrics.handTilt.toFixed(1)}°`);
        if (metrics.gazeOffset !== undefined) lines.push(`gaze x: ${metrics.gazeOffset.toFixed(3)}`);
        if (metrics.verticalGazeOffset !== undefined) lines.push(`gaze y: ${metrics.verticalGazeOffset.toFixed(3)}`);
        if (metrics.shoulderDrop !== undefined) lines.push(`shoulder drop: ${metrics.shoulderDrop.toFixed(3)}`);
        if (metrics.kneeAngle !== undefined) {
            lines.push(`knee angle: ${metrics.kneeAngle === null ? 'not visible' : `${metrics.kneeAngle.toFixed(1)}°`}`);
        }
        document.getElementById('tracking-debug').textContent = lines.join('\n');
    }

    updateRegisteredCommands() {
        const commands = this.handTracker.getRegisteredCommands();
        this.registrationStatus.textContent = commands.length
            ? `Registered: ${commands.map(command => COMMAND_LABELS[command]).join(', ')}`
            : 'No custom poses registered for this mode.';
    }

    setSettingsBusy(busy) {
        this.modeSelect.disabled = busy;
        this.profileSelect.disabled = busy;
        this.eyeControlStyle.disabled = busy;
        if (busy) document.getElementById('hand-status').textContent = 'Loading model...';
    }

    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.startGame());
        this.pauseBtn.addEventListener('click', () => this.togglePause());

        this.handTracker.onGesture(gesture => {
            if (!this.isPlaying || this.isPaused) return;
            this.executeCommand(gesture);
        });

        document.addEventListener('keydown', event => {
            if (!this.isPlaying || this.isPaused) return;
            const keyMap = {
                ArrowLeft: 'left',
                ArrowRight: 'right',
                ArrowDown: 'softDown',
                ArrowUp: 'rotate',
                ' ': 'rotate'
            };
            if (keyMap[event.key]) {
                event.preventDefault();
                this.executeCommand(keyMap[event.key]);
            }
        });

        window.addEventListener('pagehide', () => this.handTracker.stop());
    }

    executeCommand(command) {
        const actions = {
            left: () => this.tetrisGame.moveLeft(),
            right: () => this.tetrisGame.moveRight(),
            down: () => this.tetrisGame.hardDrop(),
            softDown: () => this.tetrisGame.softDrop(),
            rotate: () => this.tetrisGame.rotate()
        };
        actions[command]?.();
    }

    async startGame() {
        this.startBtn.disabled = true;
        this.startBtn.textContent = 'Loading camera...';
        try {
            if (!this.trackerInitialized) {
                await this.handTracker.initialize();
                this.trackerInitialized = true;
            }
            this.tetrisGame.start();
            this.isPlaying = true;
            this.isPaused = false;
            this.handTracker.setPaused(false);
            this.startBtn.textContent = 'Start';
            this.pauseBtn.textContent = 'Pause';
            this.pauseBtn.disabled = false;
            this.gameLoop();
        } catch (error) {
            console.error('Game start error:', error);
            this.handTracker.stop();
            this.trackerInitialized = false;
            this.startBtn.disabled = false;
            this.startBtn.textContent = 'Start';
            alert('Failed to initialize tracking. Allow camera access and check your network connection.');
        }
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        this.pauseBtn.textContent = this.isPaused ? 'Resume' : 'Pause';
        if (this.isPaused) {
            this.tetrisGame.pause();
            this.handTracker.setPaused(true);
        } else {
            this.tetrisGame.resume();
            this.handTracker.setPaused(false);
            this.gameLoop();
        }
    }

    gameLoop() {
        if (!this.isPlaying || this.isPaused) return;
        this.tetrisGame.update();
        this.tetrisGame.render();
        document.getElementById('score').textContent = this.tetrisGame.score;
        document.getElementById('lines').textContent = this.tetrisGame.lines;
        if (this.tetrisGame.isGameOver) {
            this.gameOver();
            return;
        }
        requestAnimationFrame(() => this.gameLoop());
    }

    gameOver() {
        this.isPlaying = false;
        this.handTracker.stop();
        this.trackerInitialized = false;
        this.startBtn.disabled = false;
        this.startBtn.textContent = 'Play Again';
        this.pauseBtn.disabled = true;
        alert(`Game Over!\nScore: ${this.tetrisGame.score}\nLines: ${this.tetrisGame.lines}`);
    }
}

document.addEventListener('DOMContentLoaded', () => new App());
