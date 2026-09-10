// Pure Tic-Tac-Toe rules: no DOM, no timers, no randomness, no shared state.

export const EMPTY = "empty";
export const PLAYER_X = "X";
export const PLAYER_O = "O";
export const BOARD_SIZE = 9;

const VALID_CELL_VALUES = new Set([EMPTY, PLAYER_X, PLAYER_O]);
const WINNING_COMBINATIONS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

/** Throws a descriptive error when the board is not a valid nine-cell state. */
export function validateBoardState(boardState) {
  if (!Array.isArray(boardState)) {
    throw new Error("Invalid board state: expected an array.");
  }
  if (boardState.length !== BOARD_SIZE) {
    throw new Error("Invalid board state: expected exactly nine cells.");
  }
  if (boardState.some((cell) => !VALID_CELL_VALUES.has(cell))) {
    throw new Error('Invalid board state: cells must be "empty", "X", or "O".');
  }
}

/** Returns true when all nine cells are empty. */
export function isEmptyBoard(boardState) {
  validateBoardState(boardState);
  return boardState.every((cell) => cell === EMPTY);
}

/** Returns true when no cells remain empty. */
export function isFullBoard(boardState) {
  validateBoardState(boardState);
  return boardState.every((cell) => cell !== EMPTY);
}

/** Returns the three indexes forming a completed line, or null when there is none. */
export function getWinningCombination(boardState) {
  validateBoardState(boardState);
  return WINNING_COMBINATIONS.find(([a, b, c]) => (
    boardState[a] !== EMPTY &&
    boardState[a] === boardState[b] &&
    boardState[a] === boardState[c]
  )) ?? null;
}

/** Returns the winning player ("X" or "O"), or null when nobody has won. */
export function getWinner(boardState) {
  const winningCombination = getWinningCombination(boardState);
  return winningCombination ? boardState[winningCombination[0]] : null;
}

/** Returns the indexes of every empty cell, in ascending order. */
export function getEmptyIndexes(boardState) {
  validateBoardState(boardState);
  return boardState.reduce((indexes, cell, index) => {
    if (cell === EMPTY) {
      indexes.push(index);
    }
    return indexes;
  }, []);
}

/** Returns whose turn is next; throws when the X and O counts cannot occur. */
export function getNextPlayer(boardState) {
  validateBoardState(boardState);
  const xCount = boardState.filter((cell) => cell === PLAYER_X).length;
  const oCount = boardState.filter((cell) => cell === PLAYER_O).length;

  if (xCount === oCount) {
    return PLAYER_X;
  }
  if (xCount === oCount + 1) {
    return PLAYER_O;
  }
  throw new Error("Invalid board state: X and O counts are inconsistent.");
}
