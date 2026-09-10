import assert from "node:assert/strict";
import test from "node:test";
import { getNextMove } from "./next_move.js";

const emptyBoard = () => Array(9).fill("empty");

test("empty board returns X and a valid index", () => {
  const result = getNextMove(emptyBoard());
  assert.equal(result.player, "X");
  assert.ok(result.fieldIndex >= 0 && result.fieldIndex <= 8);
  assert.equal(result.boardState[result.fieldIndex], "X");
  assert.ok(["win", "not-winning", "draw"].includes(result.outcome));
});

test("board containing one X returns O", () => {
  const board = emptyBoard();
  board[0] = "X";
  assert.equal(getNextMove(board).player, "O");
});

test("returns a winning move for the next player", () => {
  const board = ["O", "O", "empty", "X", "X", "empty", "X", "empty", "empty"];
  const result = getNextMove(board);
  assert.equal(result.player, "O");
  assert.equal(result.fieldIndex, 2);
  assert.deepEqual(result.boardState, ["O", "O", "O", "X", "X", "empty", "X", "empty", "empty"]);
  assert.equal(result.outcome, "win");
});

test("returns a winning X move when X is next", () => {
  const board = ["X", "X", "empty", "O", "empty", "empty", "O", "empty", "empty"];
  const result = getNextMove(board);
  assert.equal(result.fieldIndex, 2);
  assert.equal(result.outcome, "win");
});

test("takes an immediate winning move instead of allowing a loss", () => {
  const board = ["O", "O", "empty", "X", "X", "empty", "X", "empty", "empty"];
  const result = getNextMove(board);
  assert.equal(result.player, "O");
  assert.equal(result.fieldIndex, 2);
  assert.equal(result.outcome, "win");
});

test("returned index always refers to an empty cell", () => {
  const board = ["X", "O", "empty", "X", "O", "empty", "empty", "empty", "empty"];
  assert.equal(board[getNextMove(board).fieldIndex], "empty");
});

test("falls back to a random valid move when no winning move exists", () => {
  const board = ["X", "O", "empty", "empty", "X", "empty", "empty", "empty", "O"];
  const originalRandom = Math.random;
  Math.random = () => 0;
  try {
    const result = getNextMove(board);
    assert.equal(result.player, "X");
    assert.equal(result.boardState[result.fieldIndex], "X");
    assert.ok(["win", "not-winning", "draw"].includes(result.outcome));
  } finally {
    Math.random = originalRandom;
  }
});

test("one empty cell returns that cell index", () => {
  const board = ["X", "O", "X", "X", "O", "O", "O", "X", "empty"];
  const result = getNextMove(board);
  assert.equal(result.fieldIndex, 8);
  assert.equal(result.outcome, "draw");
});

test("full board returns null values", () => {
  const board = ["X", "O", "X", "X", "O", "O", "O", "X", "X"];
  assert.deepEqual(getNextMove(board), {
    player: null,
    fieldIndex: null,
    boardState: board,
    outcome: "draw",
  });
});

test("invalid cell values cause an error", () => {
  const board = emptyBoard();
  board[0] = "invalid";
  assert.throws(() => getNextMove(board), /cells must be/);
});

test("invalid X and O counts cause an error", () => {
  const board = ["X", "X", "empty", "empty", "empty", "empty", "empty", "empty", "empty"];
  assert.throws(() => getNextMove(board), /counts are inconsistent/);
});

test("the supplied board array is not modified", () => {
  const board = emptyBoard();
  const original = [...board];
  getNextMove(board);
  assert.deepEqual(board, original);
});

test("does not mutate a frozen board", () => {
  const board = Object.freeze(["X", "O", "empty", "empty", "X", "empty", "empty", "empty", "O"]);
  assert.doesNotThrow(() => getNextMove(board));
});

test("random selection can reach several different empty fields", () => {
  const originalRandom = Math.random;
  const selected = new Set();
  try {
    for (let step = 0; step < 20; step += 1) {
      Math.random = () => step / 20;
      const result = getNextMove(emptyBoard());
      assert.equal(result.boardState[result.fieldIndex], "X");
      selected.add(result.fieldIndex);
    }
  } finally {
    Math.random = originalRandom;
  }
  assert.ok(selected.size > 1, "expected more than one reachable field");
});

test("a board that already contains a winner still returns an empty field", () => {
  const board = ["X", "X", "X", "O", "O", "empty", "empty", "empty", "empty"];
  const result = getNextMove(board);
  assert.equal(board[result.fieldIndex], "empty");
  assert.equal(result.player, "O");
});
