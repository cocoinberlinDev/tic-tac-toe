# Codebase reference

Developer reference for the code in [`tic-tac-toe/`](../tic-tac-toe/). Behavioural rules are in
[business-logic.md](./business-logic.md); module boundaries and diagrams are in
[architecture.md](./architecture.md); tests are in [test-cases.md](./test-cases.md).

**Public API** = symbols exported with `export`. Everything else listed here is **private** to its
module and documented for maintainers only; it cannot be imported.

## Data model

### Board state

| Property | Value |
|---|---|
| Type | `Array` of length 9 (`BOARD_SIZE`) |
| Cell values | `"empty"` (`EMPTY`), `"X"` (`PLAYER_X`), `"O"` (`PLAYER_O`) – exact, case-sensitive strings |
| Index → position | `0 1 2` top row, `3 4 5` middle row, `6 7 8` bottom row (left → right) |
| Legal count relation (enforced only by `getNextPlayer`) | `count(X) === count(O)` (X to move) or `count(X) === count(O) + 1` (O to move) |
| Existing winner | Not checked by any validation function |

The view keeps a single mutable array; the rules and `next_move.js` treat boards as read-only and
copy before simulating (`[...boardState]`).

### Winning-combination representation

A winning combination is a three-element array of board indexes, e.g. `[0, 4, 8]`. The eight
combinations are stored in the private constant `WINNING_COMBINATIONS` in
`tic_tac_toe_rules.js`, in the order rows → columns → diagonals (full table in
[business-logic.md → Winning conditions](./business-logic.md#winning-conditions)). The order matters:
`getWinningCombination` returns the first match.

### Move result (`getNextMove` return value)

```js
{
  player:     "X" | "O" | null,   // null only for a full board
  fieldIndex: 0..8 | null,        // null only for a full board
  boardState: string[9],          // a NEW array with the move applied (or a copy, for a full board)
  outcome:    "win" | "not-winning" | "draw"
}
```

`outcome` is the game-theoretic evaluation of the position after the move, from the mover's
perspective: `"win"` – the mover has won or can force a win; `"draw"` – best play leads to a draw;
`"not-winning"` – the opponent can force a win. The strings are private constants in
`next_move.js` (`OUTCOME_WIN`, `OUTCOME_NOT_WINNING`, `OUTCOME_DRAW`) and are not exported.

---

## `tic-tac-toe/tic_tac_toe_rules.js`

Pure module: no DOM, timers, randomness, or module state. All functions validate their input and
never mutate it.

### Exported constants

| Name | Value | Used by |
|---|---|---|
| `EMPTY` | `"empty"` | view; rules internally |
| `PLAYER_X` | `"X"` | view; rules internally |
| `PLAYER_O` | `"O"` | view; rules internally |
| `BOARD_SIZE` | `9` | view (initial array); rules internally |

`next_move.js` does not import these constants; it relies on values returned by the rules
functions. Tests use string literals rather than the constants.

### `validateBoardState(boardState)`

| | |
|---|---|
| Purpose | Assert that a value is a well-formed nine-cell board. |
| Parameters | `boardState` – any value. |
| Returns | `undefined`. |
| Errors | `Error("Invalid board state: expected an array.")` if not an array (including `null`); `Error("Invalid board state: expected exactly nine cells.")` if `length !== 9`; `Error('Invalid board state: cells must be "empty", "X", or "O".')` if any cell is outside the allowed set. |
| Mutates arguments | No. |
| Side effects | None. |
| Edge cases | Does not check X/O counts or existing winners; `"x"`/`"o"` lower-case are rejected. |
| Called by | Every other rules function (except `getWinner`, which delegates to `getWinningCombination`); `next_move.getNextMove`; tests. Not called directly by the view. |

### `isEmptyBoard(boardState)`

| | |
|---|---|
| Purpose | Detect a board with no marks. |
| Parameters | Valid board state. |
| Returns | `true` if every cell is `"empty"`, else `false`. |
| Errors | Propagates `validateBoardState` errors. |
| Mutates arguments | No. |
| Called by | `tic_tac_toe_rules.test.js` only. **Not used by production code.** |

### `isFullBoard(boardState)`

| | |
|---|---|
| Purpose | Detect a board with no empty cell. |
| Parameters | Valid board state. |
| Returns | `true` if no cell is `"empty"`, else `false`. |
| Errors | Propagates `validateBoardState` errors. |
| Mutates arguments | No. |
| Edge cases | Returns `true` for a full board even if it also contains a winning line – callers check the winner first. |
| Called by | `next_move.createMoveResult`, `next_move.getNextMove`, `view.finishTurn`, tests. |

### `getWinningCombination(boardState)`

| | |
|---|---|
| Purpose | Find a completed line. |
| Parameters | Valid board state. |
| Returns | The matching triple from `WINNING_COMBINATIONS` (the actual internal array element, e.g. `[0, 1, 2]`) or `null`. |
| Errors | Propagates `validateBoardState` errors. |
| Mutates arguments | No. |
| Edge cases | Returns only the **first** match in rows → columns → diagonals order when several lines are complete. The returned array is the shared internal constant – callers must not modify it (no caller does). |
| Called by | `getWinner`, `view.highlightWinningCombination`, tests. |

### `getWinner(boardState)`

| | |
|---|---|
| Purpose | Identify the winning player. |
| Parameters | Valid board state. |
| Returns | `"X"`, `"O"`, or `null`. |
| Errors | Propagates validation errors (via `getWinningCombination`). |
| Mutates arguments | No. |
| Edge cases | Same first-match rule as `getWinningCombination`. |
| Called by | `next_move.createMoveResult`, `view.finishTurn`, tests. |

### `getEmptyIndexes(boardState)`

| | |
|---|---|
| Purpose | List the playable cells. |
| Parameters | Valid board state. |
| Returns | New array of indexes whose cell is `"empty"`, ascending; `[]` for a full board. |
| Errors | Propagates `validateBoardState` errors. |
| Mutates arguments | No. |
| Called by | `next_move.getNextMove`. Not directly tested. |

### `getNextPlayer(boardState)`

| | |
|---|---|
| Purpose | Determine whose turn it is from the mark counts. |
| Parameters | Valid board state. |
| Returns | `"X"` when `count(X) === count(O)`; `"O"` when `count(X) === count(O) + 1`. |
| Errors | Propagates validation errors; throws `Error("Invalid board state: X and O counts are inconsistent.")` for any other count relation (e.g. two X and no O, or more O than X). |
| Mutates arguments | No. |
| Edge cases | Does not consider an existing winner; a full board with 5 X / 4 O returns `"O"`. |
| Called by | `next_move.getNextMove`, `view.handleHumanMove`, `view.runComputerMove`, tests. |

### Private members

| Name | Kind | Description |
|---|---|---|
| `VALID_CELL_VALUES` | `Set` | `{"empty", "X", "O"}` used by `validateBoardState`. |
| `WINNING_COMBINATIONS` | `number[][]` | The eight index triples. Not exported; `tic_tac_toe_rules.test.js` re-declares the same list locally as `ALL_WINNING_COMBINATIONS`. |

---

## `tic-tac-toe/next_move.js`

### `getNextMove(boardState)` (exported)

| | |
|---|---|
| Purpose | Choose the next move for whichever player is on turn. |
| Parameters | `boardState` – valid board with consistent X/O counts. |
| Returns | A [move result](#move-result-getnextmove-return-value). For a full board: `{ player: null, fieldIndex: null, boardState: [...boardState], outcome: "draw" }`. |
| Algorithm | 1) validate; 2) full board → draw result; 3) `player = getNextPlayer`, `emptyIndexes = getEmptyIndexes`; 4) return the first (lowest-index) immediate winning move, if any; 5) for every empty index simulate the move and recursively evaluate the opponent's reply via `getNextMove`; 6) keep moves whose opponent outcome is not `"win"`; prefer those with opponent outcome `"not-winning"` (forced win), else `"draw"`, else fall back to all empty indexes; 7) `selectRandomly` among the preferred class; 8) return the move with `outcome = invertOpponentOutcome(opponentOutcome)`. |
| Errors | Propagates `validateBoardState` and `getNextPlayer` errors. |
| Mutates arguments | No – every simulated board is a spread copy; frozen inputs are accepted. |
| Side effects | Calls `Math.random()` once per level when a random choice is needed (none when an immediate win exists). |
| Determinism | Immediate wins are deterministic (ascending index). The *class* of the chosen move and therefore `outcome` are deterministic; only the pick inside the class is random. |
| Edge cases | Boards that already contain a line are not rejected; results are computed but not meaningful. Exhaustive, unmemoised recursion: an empty board evaluates the whole game tree (~190 ms on Node 18 here); ≤ 8 empties is tens of milliseconds. |
| Called by | `view.runComputerMove`, `next_move.test.js`, and itself (recursion). |

### Private members

| Name | Kind | Description |
|---|---|---|
| `OUTCOME_WIN` / `OUTCOME_NOT_WINNING` / `OUTCOME_DRAW` | string constants | `"win"`, `"not-winning"`, `"draw"`. |
| `createMoveResult(boardState, player, fieldIndex)` | function | Copies the board, writes `player` at `fieldIndex`, and returns `{ player, fieldIndex, boardState, outcome }` where `outcome` is `"win"` if `getWinner(copy) === player`, else `"draw"` if the copy is full, else `"not-winning"`. Does not validate that the cell was empty. |
| `invertOpponentOutcome(opponentOutcome)` | function | `"not-winning"` → `"win"`, `"win"` → `"not-winning"`, otherwise `"draw"`. |
| `findSafeMoves(boardState, player, emptyIndexes)` | function | For each empty index, simulates the move and recursively calls `getNextMove` on the result; returns `[{ fieldIndex, opponentOutcome }]` for moves whose opponent outcome is not `"win"`. |
| `selectRandomly(candidates)` | function | `candidates[Math.floor(Math.random() * candidates.length)]`. |

---

## `tic-tac-toe/tic_tac_toe_view.js`

**No exports.** The module executes its setup when evaluated and must run in an environment where
`document` exposes the three required elements (see [DOM contract](#dom-contract)). All functions
below are private.

### Module-level constants

| Name | Value |
|---|---|
| `COMPUTER_MOVE_DELAY_MS` | `300` |
| `STATUS_HUMAN_TURN` | `"Player 1's turn (X)"` |
| `STATUS_COMPUTER_TURN` | `"Player 2 is choosing a move (O)"` |
| `STATUS_DRAW` | `"The game is a draw"` |
| `STATUS_WIN` | `{ X: "Player 1 wins (X)", O: "Player 2 wins (O)" }` |

### Mutable module state

| Name | Initial | Meaning |
|---|---|---|
| `boardState` | `Array(9).fill("empty")` | The live board; the DOM is rendered from it. Same array instance for the page lifetime. |
| `currentPlayer` | `"X"` | Whose move is expected next. |
| `gameIsOver` | `false` | Set by `finishTurn`; blocks input and computer moves. |
| `computerMovePending` | `false` | `true` between scheduling and running O's move; disables all cells. |
| `computerMoveTimer` | `null` | Id returned by `setTimeout`, or `null`. |
| `boardElement`, `statusMessageElement`, `restartButton` | DOM lookups at load | `#board`, `#status-message`, `#restart-button`. |

### Private functions

| Function | Purpose | Reads / writes | Side effects | Notes |
|---|---|---|---|---|
| `createBoardCells()` | Build the nine cell buttons. | reads `boardState` length | Sets `boardElement.innerHTML = ""`; appends `<button type="button" class="cell" data-index="i">` with a `click` listener → `handleHumanMove(i)`. | Called once at load; **not** on restart. |
| `isCellDisabled(cellValue)` | Decide whether a cell accepts input. | reads `gameIsOver`, `computerMovePending` | none | `true` if value ≠ `"empty"` or game over or O pending. |
| `cellLabel(index, cellValue)` | Build the ARIA label. | – | none | `"Cell {index+1}, empty"` or `"Cell {index+1}, X"` / `"…, O"`. |
| `renderBoard()` | Sync DOM cells with `boardState`. | reads `boardState` | Per cell: `textContent` (`""` for empty), toggles `mark-x`/`mark-o`, **removes** `winning-cell`, sets `disabled`, sets `aria-label`. | Always clears highlights; `highlightWinningCombination` must run after it. |
| `renderStatus(message)` | Set status text. | – | `statusMessageElement.textContent = message`. | |
| `highlightWinningCombination()` | Mark the winning triple. | reads `boardState` via `getWinningCombination` | Adds `winning-cell` to the three cells (no-op if `null`). | First-match rule applies. |
| `finishTurn(player)` | End the game if the last move won or filled the board. | writes `gameIsOver` | On win: `renderBoard`, highlight, `STATUS_WIN[player]`. On full board: `renderBoard`, `STATUS_DRAW`. | Returns `true` when the game ended, else `false`. Win is checked before draw. |
| `makeMove(fieldIndex, player)` | Write a mark. | writes `boardState[fieldIndex]` | none | Returns `false` without change if the cell is not `"empty"`. The return value is checked for X but ignored for O. |
| `cancelPendingComputerMove()` | Cancel O's timer. | writes `computerMoveTimer` | `clearTimeout` | No-op if no timer. |
| `runComputerMove()` | Timer callback that plays O. | writes `computerMoveTimer = null`, `computerMovePending = false`, `boardState`, `currentPlayer` | `getNextMove`, `makeMove(…, "O")`, `renderBoard`, `finishTurn("O")`, `renderStatus(STATUS_HUMAN_TURN)` | Stale guard: returns after `renderBoard()` if `gameIsOver` or `currentPlayer !== "O"`. Throws `Error("Computer move was requested when it was not O's turn.")` if `getNextMove` does not return an O move with an index (defensive, unreachable via UI). |
| `scheduleComputerMove()` | Start O's delayed move. | writes `computerMovePending = true`, `computerMoveTimer` | `renderBoard` (all disabled), `renderStatus(STATUS_COMPUTER_TURN)`, `setTimeout(runComputerMove, 300)` | |
| `handleHumanMove(fieldIndex)` | Cell click handler (plays X). | reads guards; writes `boardState`, `currentPlayer` | `renderBoard`, `finishTurn("X")`, `scheduleComputerMove` | Silently returns if `gameIsOver`, `computerMovePending`, `currentPlayer !== "X"`, or the cell is occupied. |
| `restartGame()` | Restart button handler. | writes all state | `cancelPendingComputerMove`, `boardState.fill("empty")`, `renderBoard`, `renderStatus(STATUS_HUMAN_TURN)` | Does not rebuild cells or listeners. |

### Module evaluation (side effects on import)

```js
restartButton.addEventListener("click", restartGame);
createBoardCells();
renderBoard();
renderStatus(STATUS_HUMAN_TURN);
```

If any of the three elements is missing, `document.getElementById` returns `null` and the module
throws a `TypeError` at this point; there is no guard.

---

## DOM contract

Elements the view requires (defined in [`index.html`](../tic-tac-toe/index.html)):

| Selector | Element | Used for | Static attributes in HTML |
|---|---|---|---|
| `#board` | `<div>` | Container for generated cells; `innerHTML` cleared once, children indexed by position | `class="board" role="grid" aria-label="Tic-Tac-Toe board"` |
| `#status-message` | `<p>` | `textContent` set by `renderStatus` | `class="status-message" role="status" aria-live="polite"`; initial text `Player 1's turn (X)` |
| `#restart-button` | `<button>` | `click` → `restartGame` | `class="restart-button" type="button"`; text `Restart Game` |

Elements generated by the view (`createBoardCells`):

| Attribute / property | Value | Set by |
|---|---|---|
| tag | `<button>` | `createBoardCells` |
| `type` | `"button"` | `createBoardCells` |
| `class` | `cell` (+ `mark-x` \| `mark-o` when marked, + `winning-cell` on the winning triple) | `createBoardCells`, `renderBoard`, `highlightWinningCombination` |
| `data-index` | `"0"` … `"8"` (string) | `createBoardCells`; not read back by JavaScript |
| `textContent` | `""`, `"X"`, or `"O"` | `renderBoard` |
| `disabled` | see `isCellDisabled` | `renderBoard` |
| `aria-label` | `Cell n, empty` / `Cell n, X` / `Cell n, O` (n = 1..9) | `renderBoard` |

CSS classes consumed by [`style.css`](../tic-tac-toe/style.css): `.game-container`, `.status-message`,
`.board`, `.cell`, `.cell.mark-x`, `.cell.mark-o`, `.cell.winning-cell`, `.cell:disabled`,
`.restart-button`, `:focus-visible` variants.

### Event listeners

| Target | Event | Handler | Registered | Count |
|---|---|---|---|---|
| each `.cell` button | `click` | arrow → `handleHumanMove(index)` (index captured by closure) | `createBoardCells` at load | 1 per cell, never re-registered |
| `#restart-button` | `click` | `restartGame` | module evaluation | exactly 1 |

No `keydown`, `mouseover`, or document-level listeners exist; keyboard operation relies on native
`<button>` behaviour (Enter/Space trigger `click`).

### Timer / asynchronous state

Single `setTimeout` (300 ms) whose id is kept in `computerMoveTimer`; `computerMovePending` mirrors
whether the callback is outstanding. Cancelled by `clearTimeout` in `restartGame`. No promises,
`requestAnimationFrame`, intervals, workers, or game identifiers. See
[architecture.md → Asynchronous behaviour](./architecture.md#asynchronous-behaviour).

## Error-handling strategy

| Layer | Strategy |
|---|---|
| Rules | Fail fast: every function validates and throws `Error` with a descriptive `Invalid board state: …` message. No return codes. |
| `next_move.js` | Does not catch; propagates rules errors. Does not validate that the chosen move is legal beyond using `getEmptyIndexes`. |
| View | Invalid **user** actions are ignored silently (no exception, no message). Programming errors (missing DOM elements, non-O result from `getNextMove`) throw and are not caught; the timer callback has no `try/catch`, so such an error surfaces as an uncaught exception in the console. |
| UI feedback | Only via the status line and `disabled` cells; no error messages are rendered. |

## Running the application locally

1. Serve the `tic-tac-toe/` directory over HTTP (the repository includes no server; e.g. any static
   file server such as `npx --yes serve .` or `python -m http.server 8000`).
2. Open `index.html` from that server in a browser.

Opening `index.html` directly via `file://` fails in Chromium-based browsers because module scripts
are subject to CORS and `file://` origins are opaque. See the [README](../README.md#running-the-game-locally).

Tests: `cd tic-tac-toe` then `npm test` (Node ≥ 18; verified with v18.20.8 – 37/37 pass).

## Runtime and browser assumptions

| Assumption | Where it comes from |
|---|---|
| ES modules (`import`/`export`, `<script type="module">`, dynamic `import()`) | all modules, `index.html`, `test_helpers.js` |
| Optional chaining `?.` and nullish coalescing `??` | `tic_tac_toe_rules.js`, `tic_tac_toe_view.js`, `test_helpers.js` |
| Spread syntax, `Array.prototype.fill/every/some/find/reduce/filter`, `Set` | all modules |
| `element.dataset`, `classList.toggle(name, force)`, `setAttribute`, `disabled` | `tic_tac_toe_view.js` |
| `setTimeout` / `clearTimeout` on the global object | `tic_tac_toe_view.js` |
| `Math.random` | `next_move.js` |
| CSS `aspect-ratio`, `clamp()`, `:focus-visible`, CSS Grid | `style.css` |
| Node.js ≥ 18 with `node --test` and `node:assert/strict` | `package.json`, test files |
| `"type": "module"` in `package.json` so `.js` files load as ESM under Node | `package.json` |
| Page served over HTTP for module loading in Chromium | `index.html` |

No polyfills, transpilation, or bundling are used.
