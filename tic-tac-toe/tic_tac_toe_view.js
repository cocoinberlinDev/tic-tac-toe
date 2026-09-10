import { getNextMove } from "./next_move.js";
import {
  BOARD_SIZE,
  EMPTY,
  PLAYER_O,
  PLAYER_X,
  getNextPlayer,
  getWinner,
  getWinningCombination,
  isFullBoard,
} from "./tic_tac_toe_rules.js";

const COMPUTER_MOVE_DELAY_MS = 300;

const STATUS_HUMAN_TURN = "Player 1's turn (X)";
const STATUS_COMPUTER_TURN = "Player 2 is choosing a move (O)";
const STATUS_DRAW = "The game is a draw";
const STATUS_WIN = {
  [PLAYER_X]: "Player 1 wins (X)",
  [PLAYER_O]: "Player 2 wins (O)",
};

// The view owns the current board state; the DOM is rendered from this array.
const boardState = Array(BOARD_SIZE).fill(EMPTY);

let currentPlayer = PLAYER_X;
let gameIsOver = false;
let computerMovePending = false;
let computerMoveTimer = null;

const boardElement = document.getElementById("board");
const statusMessageElement = document.getElementById("status-message");
const restartButton = document.getElementById("restart-button");

function createBoardCells() {
  boardElement.innerHTML = "";
  boardState.forEach((_, index) => {
    const cellButton = document.createElement("button");
    cellButton.type = "button";
    cellButton.className = "cell";
    cellButton.dataset.index = String(index);
    cellButton.addEventListener("click", () => handleHumanMove(index));
    boardElement.appendChild(cellButton);
  });
}

/** Input is accepted only for empty cells while the human is allowed to move. */
function isCellDisabled(cellValue) {
  return cellValue !== EMPTY || gameIsOver || computerMovePending;
}

function cellLabel(index, cellValue) {
  return cellValue === EMPTY
    ? `Cell ${index + 1}, empty`
    : `Cell ${index + 1}, ${cellValue}`;
}

/** Renders the visible board from boardState. */
function renderBoard() {
  boardState.forEach((value, index) => {
    const cellButton = boardElement.children[index];
    cellButton.textContent = value === EMPTY ? "" : value;
    cellButton.classList.toggle("mark-x", value === PLAYER_X);
    cellButton.classList.toggle("mark-o", value === PLAYER_O);
    cellButton.classList.remove("winning-cell");
    cellButton.disabled = isCellDisabled(value);
    cellButton.setAttribute("aria-label", cellLabel(index, value));
  });
}

function renderStatus(message) {
  statusMessageElement.textContent = message;
}

/** Must run after renderBoard, which clears the highlight from every cell. */
function highlightWinningCombination() {
  getWinningCombination(boardState)?.forEach((index) => {
    boardElement.children[index].classList.add("winning-cell");
  });
}

/**
 * Ends the game when the last move won or filled the board.
 * Returns true when no further moves are allowed.
 */
function finishTurn(player) {
  if (getWinner(boardState) === player) {
    gameIsOver = true;
    renderBoard();
    highlightWinningCombination();
    renderStatus(STATUS_WIN[player]);
    return true;
  }
  if (isFullBoard(boardState)) {
    gameIsOver = true;
    renderBoard();
    renderStatus(STATUS_DRAW);
    return true;
  }
  return false;
}

function makeMove(fieldIndex, player) {
  if (boardState[fieldIndex] !== EMPTY) {
    return false;
  }
  boardState[fieldIndex] = player;
  return true;
}

function cancelPendingComputerMove() {
  if (computerMoveTimer !== null) {
    clearTimeout(computerMoveTimer);
    computerMoveTimer = null;
  }
}

/** Applies O's move once the delay elapsed, unless a restart or win intervened. */
function runComputerMove() {
  computerMoveTimer = null;
  computerMovePending = false;

  if (gameIsOver || currentPlayer !== PLAYER_O) {
    renderBoard();
    return;
  }

  const nextMove = getNextMove(boardState);
  if (nextMove.player !== PLAYER_O || nextMove.fieldIndex === null) {
    throw new Error("Computer move was requested when it was not O's turn.");
  }

  makeMove(nextMove.fieldIndex, PLAYER_O);
  currentPlayer = getNextPlayer(boardState);
  renderBoard();

  if (!finishTurn(PLAYER_O)) {
    renderStatus(STATUS_HUMAN_TURN);
    renderBoard();
  }
}

/** Disables human input and schedules O's move without waiting for a click. */
function scheduleComputerMove() {
  computerMovePending = true;
  renderBoard();
  renderStatus(STATUS_COMPUTER_TURN);
  computerMoveTimer = setTimeout(runComputerMove, COMPUTER_MOVE_DELAY_MS);
}

function handleHumanMove(fieldIndex) {
  if (gameIsOver || computerMovePending || currentPlayer !== PLAYER_X) {
    return;
  }
  if (!makeMove(fieldIndex, PLAYER_X)) {
    return;
  }

  renderBoard();
  if (finishTurn(PLAYER_X)) {
    return;
  }

  currentPlayer = getNextPlayer(boardState);
  scheduleComputerMove();
}

function restartGame() {
  cancelPendingComputerMove();
  boardState.fill(EMPTY);
  currentPlayer = PLAYER_X;
  gameIsOver = false;
  computerMovePending = false;
  renderBoard();
  renderStatus(STATUS_HUMAN_TURN);
}

restartButton.addEventListener("click", restartGame);
createBoardCells();
renderBoard();
renderStatus(STATUS_HUMAN_TURN);
