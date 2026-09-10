# Business logic

This document describes the game behaviour that the code in [`tic-tac-toe/`](../tic-tac-toe/)
actually implements. Every rule below is traced to a function in
[`tic_tac_toe_rules.js`](../tic-tac-toe/tic_tac_toe_rules.js),
[`next_move.js`](../tic-tac-toe/next_move.js), or
[`tic_tac_toe_view.js`](../tic-tac-toe/tic_tac_toe_view.js). Function signatures and edge cases are
detailed in the [codebase reference](./codebase-reference.md); module boundaries are described in
[architecture.md](./architecture.md).

## Objective

Two players alternately mark cells of a 3×3 board. The first player to own three cells forming a
complete row, column, or diagonal wins. If all nine cells are marked and no line is complete, the
game is a draw.

## Players and symbols

| Player | Symbol constant | Cell value | Controlled by | Status-line name |
|---|---|---|---|---|
| Player 1 | `PLAYER_X` | `"X"` | The user (mouse/keyboard clicks on cells) | `Player 1` |
| Player 2 | `PLAYER_O` | `"O"` | The computer (`getNextMove` in `next_move.js`) | `Player 2` |

The constants live in `tic_tac_toe_rules.js`. The view hard-codes that the human is X
(`handleHumanMove` only ever calls `makeMove(fieldIndex, PLAYER_X)`) and that the computer is O
(`runComputerMove` only calls `makeMove(nextMove.fieldIndex, PLAYER_O)` and throws if
`getNextMove` reports any other player).

## Who starts

Player 1 (X) always starts. This follows from two places:

- `getNextPlayer` returns `"X"` whenever the board contains equally many `"X"` and `"O"` cells,
  including the empty board.
- The view initialises `currentPlayer = PLAYER_X` at load time and again in `restartGame`.

## Board representation

### Empty field

An unmarked cell is the string `"empty"` (constant `EMPTY`). It is never `null`, `undefined`, or
`""`. `validateBoardState` rejects any other value. (The view renders an empty cell as an empty
`textContent`, but the *state* is always the string `"empty"`.)

### Ordering of the nine fields

The board is a flat array of exactly nine cells (`BOARD_SIZE = 9`), indexed row by row from the
top-left:

```
index:   0 | 1 | 2        row 1
         3 | 4 | 5        row 2
         6 | 7 | 8        row 3
```

The view creates the cell buttons in this order and stores the index in `data-index`; the
accessible label uses the 1-based number (`Cell 1` … `Cell 9`).

### Valid board state

`validateBoardState(boardState)` accepts a board only if all of the following hold, otherwise it
throws an `Error`:

1. It is an array (`Array.isArray`).
2. It has exactly nine elements.
3. Every element is one of `"empty"`, `"X"`, `"O"` (case-sensitive; `"x"` is rejected).

Validation does **not** check the X/O count relationship or whether a winner already exists.
The count check happens only in `getNextPlayer` (see below).

### Empty board

`isEmptyBoard(boardState)` is `true` when all nine cells equal `"empty"`. The view creates its
initial board as `Array(BOARD_SIZE).fill(EMPTY)` and resets it with `boardState.fill(EMPTY)`; there
is no dedicated "create empty board" function in production code.

Note: `isEmptyBoard` is exported and tested, but no production module calls it.

### Full board

`isFullBoard(boardState)` is `true` when no cell equals `"empty"` (all nine cells are `"X"` or
`"O"`).

## Determining the next player

`getNextPlayer(boardState)` counts the marks:

| Condition | Result |
|---|---|
| `count(X) === count(O)` | `"X"` |
| `count(X) === count(O) + 1` | `"O"` |
| anything else | throws `Error("Invalid board state: X and O counts are inconsistent.")` |

The function ignores whether the game has already been won.

## Winning conditions

`getWinningCombination` checks the eight index triples in this fixed order (private constant
`WINNING_COMBINATIONS` in `tic_tac_toe_rules.js`):

| # | Kind | Indexes | Cells |
|---|---|---|---|
| 1 | Horizontal | `[0, 1, 2]` | top row |
| 2 | Horizontal | `[3, 4, 5]` | middle row |
| 3 | Horizontal | `[6, 7, 8]` | bottom row |
| 4 | Vertical | `[0, 3, 6]` | left column |
| 5 | Vertical | `[1, 4, 7]` | middle column |
| 6 | Vertical | `[2, 5, 8]` | right column |
| 7 | Diagonal | `[0, 4, 8]` | top-left → bottom-right |
| 8 | Diagonal | `[2, 4, 6]` | top-right → bottom-left |

A triple is a winning line when its first cell is not `"empty"` and all three cells are equal.
`getWinningCombination` returns the **first** matching triple in the order above (or `null`);
`getWinner` returns the symbol found in that triple (`"X"` or `"O"`) or `null`.

Consequences of "first match":

- If one move completes two lines at once, only the earlier triple in the table is reported and
  highlighted by the view.
- Boards where both players have a line (impossible in a legal game but accepted by
  `validateBoardState`) report whichever line appears first in the table.

## Draw detection

There is no dedicated draw function in the rules module. A draw is derived in two places with the
same logic: *no winner and the board is full*.

- View (`finishTurn`): after each move it first checks `getWinner(boardState) === player`; if not,
  it checks `isFullBoard(boardState)` and, when true, ends the game with the status
  `The game is a draw`.
- `next_move.js` (`createMoveResult`): a simulated move that neither wins nor leaves an empty cell
  gets `outcome: "draw"`. Calling `getNextMove` on an already full board also returns
  `outcome: "draw"` with `player: null` and `fieldIndex: null`.

## Valid and invalid moves

The view is the only place that mutates a real board. `handleHumanMove(fieldIndex)` accepts a click
only if **all** of these hold; otherwise the click is silently ignored (no message, no state change):

| Check | Where | Rejected when |
|---|---|---|
| Game still running | `handleHumanMove` guard | `gameIsOver === true` |
| Computer not thinking | `handleHumanMove` guard | `computerMovePending === true` |
| It is X's turn | `handleHumanMove` guard | `currentPlayer !== "X"` |
| Cell is empty | `makeMove` returns `false` | `boardState[fieldIndex] !== "empty"` |

As a first line of defence, `renderBoard` also sets the `disabled` attribute on every cell that is
not empty, and on **all** cells while the game is over or a computer move is pending
(`isCellDisabled`). Real browsers do not dispatch `click` on disabled buttons; the guards above
protect against programmatic clicks and races.

Clicking a cell can only place an `"X"`. There is no way for the user to place an `"O"` or to
undo a move.

## What happens after a win or a draw

`finishTurn(player)` runs after every move (X in `handleHumanMove`, O in `runComputerMove`):

| Result | Effect |
|---|---|
| `getWinner(boardState) === player` | `gameIsOver = true`; board re-rendered with every cell disabled; the three winning cells get the `winning-cell` class; status becomes `Player 1 wins (X)` or `Player 2 wins (O)`. |
| otherwise, `isFullBoard(boardState)` | `gameIsOver = true`; board re-rendered with every cell disabled; status becomes `The game is a draw`. No cells are highlighted. |
| otherwise | game continues (`finishTurn` returns `false`). |

After the game ends, no further cell clicks are accepted, no computer move is scheduled, and the
board stays visible until **Restart Game** is pressed. The restart button is never disabled.

## How the computer selects a move

`getNextMove(boardState)` in [`next_move.js`](../tic-tac-toe/next_move.js) is the whole computer
strategy. It is a **recursive, exhaustive look-ahead over the remaining game tree with random
tie-breaking**, not a plain random pick. The algorithm, in order:

1. `validateBoardState(boardState)` – throws on malformed input.
2. **Full board** → return `{ player: null, fieldIndex: null, boardState: copy, outcome: "draw" }`.
3. `player = getNextPlayer(boardState)` (throws on inconsistent counts) and
   `emptyIndexes = getEmptyIndexes(boardState)` (ascending).
4. **Immediate win**: simulate `player` on each empty index in ascending order; the first simulated
   board where `getWinner(...) === player` is returned immediately with `outcome: "win"`.
   This step is deterministic (lowest winning index, no randomness).
5. **Look-ahead** (`findSafeMoves`): for every empty index, simulate the move and call
   `getNextMove` recursively on the resulting board to obtain the *opponent's* evaluated
   `outcome`. Candidates are classified by that opponent outcome:
   - `"win"` – the opponent can force a win afterwards → **unsafe**, discarded.
   - `"not-winning"` – the opponent cannot avoid losing → **open** (a forced win for `player`).
   - `"draw"` – best play leads to a draw → **safe**.
6. **Preference**: open moves if any exist; otherwise safe (drawing) moves; otherwise – when every
   move loses – all empty indexes.
7. **Random tie-break**: `selectRandomly` picks uniformly from the chosen class using
   `Math.random()`.
8. The returned `outcome` is the mover's perspective of the recursive result:
   `invertOpponentOutcome` maps opponent `"not-winning"` → `"win"`, opponent `"win"` →
   `"not-winning"`, opponent `"draw"` → `"draw"`.

Observed behaviour (probed with `Math.random` stubbed):

| Position | Result |
|---|---|
| Empty board | Every opening is a draw under perfect play, so all nine cells are candidates; `outcome: "draw"`. |
| X in a corner, O to move | Only the centre (index 4) holds the draw; O always plays 4 regardless of the random value. |
| X can create a fork | `outcome: "win"` is returned even though no line exists yet. |
| Board already contains a line | Not rejected; the result is computed but has no meaningful interpretation. The view never calls `getNextMove` after a game ended. |

Because the search is unmemoised and synchronous, evaluating an empty board visits the entire game
tree (~190 ms per call on Node 18 in this environment). In the application the computer only moves
after X has moved (≤ 8 empty cells), which took ≈ 40 ms in the view tests.

The view uses only `player` and `fieldIndex` from the result; it ignores `outcome` and
`boardState` and re-derives win/draw from the rules module.

## Restart behaviour

`restartGame` (bound to the `#restart-button` click) performs, in order:

1. `cancelPendingComputerMove()` – `clearTimeout` on the pending O timer, if any.
2. `boardState.fill(EMPTY)` – the board array is reset in place (same array instance).
3. `currentPlayer = PLAYER_X`, `gameIsOver = false`, `computerMovePending = false`.
4. `renderBoard()` – all cells empty and enabled, `winning-cell` removed, labels reset to
   `Cell n, empty`.
5. `renderStatus("Player 1's turn (X)")`.

Restart works at any time: before the first move, mid-game, while O's move is pending, and after a
win or draw. Cell buttons and their click listeners are created once (`createBoardCells` at module
load) and are **not** recreated on restart, so listeners do not accumulate. The restart button
itself receives exactly one listener at module load.

## Delayed computer move and user input

After a valid X move that does not end the game:

1. `currentPlayer` becomes `"O"` (via `getNextPlayer`).
2. `scheduleComputerMove()` sets `computerMovePending = true`, re-renders the board (**all** cells
   disabled), shows `Player 2 is choosing a move (O)`, and calls
   `setTimeout(runComputerMove, 300)` (`COMPUTER_MOVE_DELAY_MS = 300`). The timer id is stored in
   `computerMoveTimer`.
3. During the delay every cell click is rejected (disabled attribute + `computerMovePending`
   guard). Only **Restart Game** remains actionable.
4. When the timer fires, `runComputerMove`:
   - clears `computerMoveTimer` and `computerMovePending`;
   - **stale guard**: if `gameIsOver` or `currentPlayer !== "O"` it only re-renders and returns
     (defensive; a restart already cancels the timer so this path is not reached in normal use);
   - calls `getNextMove(boardState)`, throws if the result is not an O move with a field index;
   - places O, sets `currentPlayer` back to `"X"`, renders, runs `finishTurn("O")`;
   - if the game continues, restores the status `Player 1's turn (X)` and re-renders so empty cells
     are enabled again.

There is exactly one timer at a time and no game-identifier/generation counter; stale callbacks are
prevented by `clearTimeout` in `restartGame` and by the state guard in `runComputerMove`. See
[architecture.md → Asynchronous behaviour](./architecture.md#asynchronous-behaviour) for the
sequence diagram.

## Status messages (exact strings)

| Constant (`tic_tac_toe_view.js`) | Text | Shown when |
|---|---|---|
| `STATUS_HUMAN_TURN` | `Player 1's turn (X)` | Initial load, after O moved, after restart. Also the static text in `index.html`. |
| `STATUS_COMPUTER_TURN` | `Player 2 is choosing a move (O)` | From a valid X move until O has moved. |
| `STATUS_WIN["X"]` | `Player 1 wins (X)` | X completed a line. |
| `STATUS_WIN["O"]` | `Player 2 wins (O)` | O completed a line. |
| `STATUS_DRAW` | `The game is a draw` | Board full, no winner. |

## Discrepancies between code, tests, and descriptions

| # | Topic | Description says | Code does | Assessment |
|---|---|---|---|---|
| 1 | Computer strategy | The task brief and the test name `falls back to a random valid move when no winning move exists` (`next_move.test.js`) describe O as picking a **random empty field** after checking for an immediate win. | `getNextMove` runs a full recursive look-ahead and randomises only within the best class of moves (forced win → draw → loss). E.g. after X takes a corner, O deterministically takes the centre. | Documentation in this repo follows the code. The tests still pass because they only assert weak properties (valid empty index, several reachable fields on an empty board). |
| 2 | `getNextMove` JSDoc | "selects randomly among the fields that do not hand the opponent an **immediate** win" | The safety check is recursive: a move is unsafe if the opponent can force a win at *any* depth, not only immediately. | JSDoc understates the behaviour; code is the source of truth. |
| 3 | Meaning of `outcome` | Test comments/names suggest `outcome` reports whether the chosen move wins. | `outcome` is the game-theoretic value of the position after the move from the mover's perspective (`"win"` = forced win, `"draw"`, `"not-winning"` = opponent can force a win). A fork move returns `"win"` with no line on the board. | Documented here; the view ignores `outcome`. |
| 4 | Duplicate test | — | `returns a winning move for the next player` and `takes an immediate winning move instead of allowing a loss` in `next_move.test.js` use the same board and identical assertions. | Harmless redundancy; noted in [test-cases.md](./test-cases.md). |
| 5 | Unused export | — | `isEmptyBoard` is exported and unit-tested but never called by production code. | No behavioural impact. |
| 6 | `role="grid"` | — | `#board` has `role="grid"` but its children are plain `<button>` elements without `row`/`gridcell` roles. | Accessibility detail only; behaviour unaffected. |
