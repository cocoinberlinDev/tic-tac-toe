import assert from "node:assert/strict";
import test from "node:test";
import { loadGame } from "./test_helpers.js";

const INITIAL_STATUS = "Player 1's turn (X)";
const COMPUTER_STATUS = "Player 2 is choosing a move (O)";
const EMPTY_BOARD = Array(9).fill("empty");

async function withGame(randomValue, run) {
  const game = await loadGame();
  game.stubRandom(randomValue);
  try {
    await run(game);
  } finally {
    game.restore();
  }
}

test("renders nine empty cells and the initial status", async () => {
  await withGame(0, (game) => {
    assert.equal(game.cells().length, 9);
    assert.deepEqual(game.boardValues(), EMPTY_BOARD);
    assert.equal(game.statusText(), INITIAL_STATUS);
    assert.deepEqual(game.disabledFlags(), Array(9).fill(false));
    assert.deepEqual(game.labels()[0], "Cell 1, empty");
    assert.deepEqual(game.labels()[8], "Cell 9, empty");
  });
});

test("a human click places X, disables input, and schedules O after 300ms", async () => {
  await withGame(0, (game) => {
    game.clickCell(0);

    assert.equal(game.boardValues()[0], "X");
    assert.equal(game.cells()[0].classList.contains("mark-x"), true);
    assert.equal(game.labels()[0], "Cell 1, X");
    assert.equal(game.statusText(), COMPUTER_STATUS);
    assert.deepEqual(game.disabledFlags(), Array(9).fill(true));
    assert.equal(game.timers.pendingCount, 1);
    assert.deepEqual(game.timers.delays, [300]);
  });
});

test("O moves automatically into an empty cell and returns the turn to X", async () => {
  await withGame(0, (game) => {
    game.clickCell(0);
    game.timers.runPending();

    const values = game.boardValues();
    assert.equal(values.filter((value) => value === "X").length, 1);
    assert.equal(values.filter((value) => value === "O").length, 1);
    assert.equal(game.statusText(), INITIAL_STATUS);
    assert.equal(game.timers.pendingCount, 0);

    values.forEach((value, index) => {
      assert.equal(game.disabledFlags()[index], value !== "empty");
    });
  });
});

test("clicks on an occupied cell are ignored", async () => {
  await withGame(0, (game) => {
    game.clickCell(0);
    game.timers.runPending();
    const before = game.boardValues();

    game.clickCell(0);

    assert.deepEqual(game.boardValues(), before);
    assert.equal(game.statusText(), INITIAL_STATUS);
    assert.equal(game.timers.pendingCount, 0);
  });
});

test("clicks are ignored while O is choosing a move", async () => {
  await withGame(0, (game) => {
    game.clickCell(0);
    game.clickCell(1);

    assert.equal(game.boardValues()[1], "empty");
    assert.equal(game.statusText(), COMPUTER_STATUS);
    assert.equal(game.timers.pendingCount, 1);
  });
});

test("an O win shows the winning status, highlight, and blocks further moves", async () => {
  await withGame(0, (game) => {
    [0, 1, 3].forEach((index) => {
      game.clickCell(index);
      game.timers.runPending();
    });

    assert.equal(game.statusText(), "Player 2 wins (O)");
    assert.equal(game.winningCells().length, 3);
    assert.deepEqual(game.disabledFlags(), Array(9).fill(true));

    const finalBoard = game.boardValues();
    const emptyIndex = finalBoard.indexOf("empty");
    if (emptyIndex !== -1) {
      game.clickCell(emptyIndex);
      assert.deepEqual(game.boardValues(), finalBoard);
    }
  });
});

test("a full board without a winner reports a draw", async () => {
  await withGame(0, (game) => {
    [4, 3, 2, 1, 8].forEach((index) => {
      game.clickCell(index);
      game.timers.runPending();
    });

    assert.equal(game.statusText(), "The game is a draw");
    assert.equal(game.boardValues().includes("empty"), false);
    assert.deepEqual(game.disabledFlags(), Array(9).fill(true));
    assert.equal(game.winningCells().length, 0);
  });
});

test("restart clears the board and gives the turn back to X", async () => {
  await withGame(0, (game) => {
    game.clickCell(0);
    game.timers.runPending();

    game.clickRestart();

    assert.deepEqual(game.boardValues(), EMPTY_BOARD);
    assert.equal(game.statusText(), INITIAL_STATUS);
    assert.deepEqual(game.disabledFlags(), Array(9).fill(false));
    assert.equal(game.winningCells().length, 0);
    assert.deepEqual(game.labels()[0], "Cell 1, empty");
  });
});

test("restarting while O is pending discards the stale computer move", async () => {
  await withGame(0, (game) => {
    game.clickCell(0);
    assert.equal(game.timers.pendingCount, 1);

    game.clickRestart();

    assert.equal(game.timers.pendingCount, 0);
    game.timers.runPending();

    assert.deepEqual(game.boardValues(), EMPTY_BOARD);
    assert.equal(game.statusText(), INITIAL_STATUS);
  });
});

test("repeated restarts do not accumulate timers or listeners", async () => {
  await withGame(0, (game) => {
    for (let round = 0; round < 3; round += 1) {
      game.clickCell(0);
      game.clickRestart();
    }

    assert.equal(game.timers.pendingCount, 0);
    assert.equal(game.restartListenerCount(), 1);
    assert.deepEqual(game.boardValues(), EMPTY_BOARD);
  });
});

test("a restarted game accepts a fresh X move", async () => {
  await withGame(0, (game) => {
    game.clickCell(0);
    game.timers.runPending();
    game.clickRestart();

    game.clickCell(8);

    assert.equal(game.boardValues()[8], "X");
    assert.equal(game.statusText(), COMPUTER_STATUS);
  });
});
