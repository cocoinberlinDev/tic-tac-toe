import {
  getEmptyIndexes,
  getNextPlayer,
  getWinner,
  isFullBoard,
  validateBoardState,
} from "./tic_tac_toe_rules.js";

const OUTCOME_WIN = "win";
const OUTCOME_NOT_WINNING = "not-winning";
const OUTCOME_DRAW = "draw";

/** Builds the result of a player taking a field, without touching the input. */
function createMoveResult(boardState, player, fieldIndex) {
  const resultingBoard = [...boardState];
  resultingBoard[fieldIndex] = player;

  let outcome = OUTCOME_NOT_WINNING;
  if (getWinner(resultingBoard) === player) {
    outcome = OUTCOME_WIN;
  } else if (isFullBoard(resultingBoard)) {
    outcome = OUTCOME_DRAW;
  }

  return {
    player,
    fieldIndex,
    boardState: resultingBoard,
    outcome,
  };
}

/**
 * Reports the selected move from the current player's perspective: an opponent
 * who cannot win is reported as a win, and an opponent who wins as not-winning.
 */
function invertOpponentOutcome(opponentOutcome) {
  if (opponentOutcome === OUTCOME_NOT_WINNING) {
    return OUTCOME_WIN;
  }
  if (opponentOutcome === OUTCOME_WIN) {
    return OUTCOME_NOT_WINNING;
  }
  return OUTCOME_DRAW;
}

/**
 * Collects the fields after which the opponent's reply cannot win. A filled
 * board reports a draw, so it is kept as a safe candidate.
 */
function findSafeMoves(boardState, player, emptyIndexes) {
  const safeMoves = [];
  for (const fieldIndex of emptyIndexes) {
    const { boardState: boardAfterMove } = createMoveResult(boardState, player, fieldIndex);
    const opponentOutcome = getNextMove(boardAfterMove).outcome;
    if (opponentOutcome !== OUTCOME_WIN) {
      safeMoves.push({ fieldIndex, opponentOutcome });
    }
  }
  return safeMoves;
}

function selectRandomly(candidates) {
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * Chooses an immediate winning field when one exists. Otherwise selects
 * randomly among the fields that do not hand the opponent an immediate win,
 * preferring those that also keep the game open.
 */
export function getNextMove(boardState) {
  validateBoardState(boardState);

  if (isFullBoard(boardState)) {
    return {
      player: null,
      fieldIndex: null,
      boardState: [...boardState],
      outcome: OUTCOME_DRAW,
    };
  }

  const player = getNextPlayer(boardState);
  const emptyIndexes = getEmptyIndexes(boardState);

  for (const fieldIndex of emptyIndexes) {
    const move = createMoveResult(boardState, player, fieldIndex);
    if (move.outcome === OUTCOME_WIN) {
      return move;
    }
  }

  const safeMoves = findSafeMoves(boardState, player, emptyIndexes);
  const openMoves = safeMoves
    .filter(({ opponentOutcome }) => opponentOutcome === OUTCOME_NOT_WINNING);
  const preferredMoves = openMoves.length > 0 ? openMoves : safeMoves;

  // Every field loses, so fall back to the unfiltered list of empty fields.
  const selectableMoves = preferredMoves.length > 0
    ? preferredMoves
    : emptyIndexes.map((fieldIndex) => ({
      fieldIndex,
      opponentOutcome: OUTCOME_WIN,
    }));

  const selectedMove = selectRandomly(selectableMoves);
  const move = createMoveResult(boardState, player, selectedMove.fieldIndex);

  return { ...move, outcome: invertOpponentOutcome(selectedMove.opponentOutcome) };
}
