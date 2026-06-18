import { TetrisGame } from './game/tetris.js';
import { HandTracker } from './hand/tracker.js';

const MODE_HELP = {
    hand: 'Tilt your hand to move, point one index finger to rotate, or point the hand downward to drop.',
    body: 'Lean left or right to move, raise either arm to rotate, or bend your knees to drop.',
    eyes: 'Look left or right to move, wink to rotate, or close both eyes to drop.'
};
const COMMAND_LABELS = {
    left: 'Move left',
    right: 'Move right',
    down: 'Move down',
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
        this.applySavedSettings();
    }

    setupSettingsListeners() {
        this.modeSelect = document.getElementById('tracking-mode');
        this.profileSelect = document.getElementById('control-profile');
        this.modeHelp = document.getElementById('mode-help');
        this.registrationPanel = document.getElementById('pose-registration');
        this.eyeCalibrationPanel = document.getElementById('eye-calibration');
        this.registrationStatus = document.getElementById('registration-status');
        this.progressBar = document.getElementById('recording-progress-bar');
        this.recordPoseBtn = document.getElementById('record-pose-btn');

        const tiltAngleSlider = document.getElementById('tilt-angle');
        const gestureDelaySlider = document.getElementById('gesture-delay');
        const dropThresholdSlider = document.getElementById('drop-threshold');

        tiltAngleSlider.addEventListener('input', event => {
            const value = Number.parseInt(event.target.value, 10);
            document.getElementById('tilt-angle-val').textContent = value;
            this.handTracker.tiltAngle = value;
            this.saveSetting('tiltAngle', value);
        });

        gestureDelaySlider.addEventListener('input', event => {
            const value = Number.parseInt(event.target.value, 10);
            document.getElementById('gesture-delay-val').textContent = value;
            this.handTracker.gestureThreshold = value;
            this.saveSetting('gestureThreshold', value);
        });

        dropThresholdSlider.addEventListener('input', event => {
            const value = Number.parseFloat(event.target.value);
            document.getElementById('drop-threshold-val').textContent = value.toFixed(2);
            this.handTracker.dropThreshold = value;
            this.saveSetting('dropThreshold', value);
        });

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

    applySavedSettings() {
        let settings = {};
        try {
            settings = JSON.parse(localStorage.getItem('tetris-tracking-settings')) || {};
        } catch {
            settings = {};
        }
        const assignRange = (id, value, displayId, formatter = String) => {
            if (value == null) return;
            document.getElementById(id).value = value;
            document.getElementById(displayId).textContent = formatter(value);
        };

        this.handTracker.tiltAngle = settings.tiltAngle ?? this.handTracker.tiltAngle;
        this.handTracker.gestureThreshold = settings.gestureThreshold ?? this.handTracker.gestureThreshold;
        this.handTracker.dropThreshold = settings.dropThreshold ?? this.handTracker.dropThreshold;
        assignRange('tilt-angle', settings.tiltAngle, 'tilt-angle-val');
        assignRange('gesture-delay', settings.gestureThreshold, 'gesture-delay-val');
        assignRange('drop-threshold', settings.dropThreshold, 'drop-threshold-val', value => Number(value).toFixed(2));

        this.modeSelect.value = this.handTracker.mode;
        this.profileSelect.value = this.handTracker.profile;
        this.updateSettingsVisibility();
        this.updateRegisteredCommands();
    }

    saveSetting(key, value) {
        let settings = {};
        try {
            settings = JSON.parse(localStorage.getItem('tetris-tracking-settings')) || {};
        } catch {
            settings = {};
        }
        settings[key] = value;
        localStorage.setItem('tetris-tracking-settings', JSON.stringify(settings));
    }

    updateSettingsVisibility() {
        this.modeHelp.textContent = MODE_HELP[this.handTracker.mode];
        this.registrationPanel.hidden = this.handTracker.profile !== 'custom';
        this.eyeCalibrationPanel.hidden = this.handTracker.mode !== 'eyes';
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
                ArrowDown: 'down',
                ArrowUp: 'rotate',
                ' ': 'rotate'
            };
            if (keyMap[event.key]) {
                event.preventDefault();
                this.executeCommand(keyMap[event.key]);
            }
        });
    }

    executeCommand(command) {
        const actions = {
            left: () => this.tetrisGame.moveLeft(),
            right: () => this.tetrisGame.moveRight(),
            down: () => this.tetrisGame.softDrop(),
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
            this.startBtn.textContent = 'Start';
            this.pauseBtn.textContent = 'Pause';
            this.pauseBtn.disabled = false;
            this.gameLoop();
        } catch (error) {
            console.error('Game start error:', error);
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
        } else {
            this.tetrisGame.resume();
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
        this.startBtn.disabled = false;
        this.startBtn.textContent = 'Play Again';
        this.pauseBtn.disabled = true;
        alert(`Game Over!\nScore: ${this.tetrisGame.score}\nLines: ${this.tetrisGame.lines}`);
    }
}

document.addEventListener('DOMContentLoaded', () => new App());
