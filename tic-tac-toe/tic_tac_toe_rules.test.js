import assert from "node:assert/strict";
import test from "node:test";
import {
  getNextPlayer,
  getWinner,
  getWinningCombination,
  isEmptyBoard,
  isFullBoard,
  validateBoardState,
} from "./tic_tac_toe_rules.js";

const emptyBoard = () => Array(9).fill("empty");

const ALL_WINNING_COMBINATIONS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function boardWithLine(combination, player) {
  const board = emptyBoard();
  combination.forEach((index) => {
    board[index] = player;
  });
  return board;
}

test("accepts a valid board state", () => {
  assert.doesNotThrow(() => validateBoardState(emptyBoard()));
  assert.doesNotThrow(() => validateBoardState(["X", "O", "X", "O", "X", "O", "X", "O", "X"]));
});

test("rejects boards that are not arrays", () => {
  assert.throws(() => validateBoardState("not-an-array"), /expected an array/);
  assert.throws(() => validateBoardState(null), /expected an array/);
});

test("rejects boards without exactly nine cells", () => {
  assert.throws(() => validateBoardState(Array(8).fill("empty")), /exactly nine cells/);
  assert.throws(() => validateBoardState(Array(10).fill("empty")), /exactly nine cells/);
});

test("rejects boards containing invalid cell values", () => {
  const board = emptyBoard();
  board[4] = "x";
  assert.throws(() => validateBoardState(board), /cells must be/);
});

test("identifies an empty board", () => {
  assert.equal(isEmptyBoard(emptyBoard()), true);

  const board = emptyBoard();
  board[0] = "X";
  assert.equal(isEmptyBoard(board), false);
});

test("identifies a full board", () => {
  assert.equal(isFullBoard(["X", "O", "X", "X", "O", "O", "O", "X", "X"]), true);
  assert.equal(isFullBoard(emptyBoard()), false);
  assert.equal(isFullBoard(["X", "O", "X", "X", "O", "O", "O", "X", "empty"]), false);
});

test("detects all eight winning combinations for both players", () => {
  ALL_WINNING_COMBINATIONS.forEach((combination) => {
    ["X", "O"].forEach((player) => {
      const board = boardWithLine(combination, player);
      assert.equal(getWinner(board), player);
      assert.deepEqual(getWinningCombination(board), combination);
    });
  });
});

test("reports no winner when no line is complete", () => {
  assert.equal(getWinner(emptyBoard()), null);
  assert.equal(getWinningCombination(emptyBoard()), null);

  const drawnBoard = ["X", "O", "X", "X", "O", "O", "O", "X", "X"];
  assert.equal(getWinner(drawnBoard), null);
  assert.equal(getWinningCombination(drawnBoard), null);

  const partialLine = ["X", "X", "empty", "O", "O", "empty", "empty", "empty", "empty"];
  assert.equal(getWinner(partialLine), null);
});

test("determines the next player", () => {
  assert.equal(getNextPlayer(emptyBoard()), "X");
  const board = emptyBoard();
  board[0] = "X";
  assert.equal(getNextPlayer(board), "O");
  assert.equal(
    getNextPlayer(["X", "O", "empty", "empty", "empty", "empty", "empty", "empty", "empty"]),
    "X",
  );
});

test("rejects inconsistent X and O counts", () => {
  assert.throws(
    () => getNextPlayer(["X", "X", "empty", "empty", "empty", "empty", "empty", "empty", "empty"]),
    /counts are inconsistent/,
  );
  assert.throws(
    () => getNextPlayer(["O", "empty", "empty", "empty", "empty", "empty", "empty", "empty", "empty"]),
    /counts are inconsistent/,
  );
});

test("rules functions never modify the supplied board", () => {
  const board = Object.freeze(["X", "X", "X", "O", "O", "empty", "empty", "empty", "empty"]);

  assert.doesNotThrow(() => {
    validateBoardState(board);
    isEmptyBoard(board);
    isFullBoard(board);
    getWinner(board);
    getWinningCombination(board);
    getNextPlayer(board);
  });

  assert.deepEqual(board, ["X", "X", "X", "O", "O", "empty", "empty", "empty", "empty"]);
});
