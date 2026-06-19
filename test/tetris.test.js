import assert from 'node:assert/strict';
import test from 'node:test';
import { TetrisGame } from '../src/game/tetris.js';

function createGame() {
    const ctx = new Proxy({}, { get: () => () => {} });
    return new TetrisGame({ getContext: () => ctx, width: 300, height: 600 });
}

test('four rotations preserve every tetromino', () => {
    const game = createGame();

    for (const original of game.pieces) {
        game.currentPiece = original.map(row => [...row]);
        game.currentX = 3;
        game.currentY = 2;
        const blockCount = original.flat().filter(Boolean).length;

        for (let turn = 0; turn < 4; turn++) {
            assert.equal(game.rotate(), true);
            assert.equal(game.currentPiece.flat().filter(Boolean).length, blockCount);
        }

        assert.deepEqual(game.currentPiece, original);
    }
});

test('rotation kicks an I piece away from the right wall', () => {
    const game = createGame();
    game.currentPiece = [[1], [1], [1], [1]];
    game.currentX = 9;
    game.currentY = 2;

    assert.equal(game.rotate(), true);
    assert.deepEqual(game.currentPiece, [[1, 1, 1, 1]]);
    assert.equal(game.currentX, 6);
});

test('rotation fails without changing the piece when all kicks collide', () => {
    const game = createGame();
    game.currentPiece = [[1, 1, 1], [0, 1, 0]];
    game.currentX = 4;
    game.currentY = 5;
    const original = game.currentPiece.map(row => [...row]);
    game.board = game.board.map(row => row.map(() => 1));

    assert.equal(game.rotate(), false);
    assert.deepEqual(game.currentPiece, original);
    assert.equal(game.currentX, 4);
    assert.equal(game.currentY, 5);
});

test('hard drop locks the piece, scores distance, and resets the timer', () => {
    const game = createGame();
    game.currentPiece = [[2, 2], [2, 2]];
    game.currentX = 4;
    game.currentY = 0;
    game.dropCounter = 750;

    const droppedRows = game.hardDrop();

    assert.equal(droppedRows, 18);
    assert.equal(game.score, 36);
    assert.equal(game.dropCounter, 0);
    assert.deepEqual(game.board[18].slice(4, 6), [2, 2]);
    assert.deepEqual(game.board[19].slice(4, 6), [2, 2]);
    assert.equal(game.currentY, 0);
});
