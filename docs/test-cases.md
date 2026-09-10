# Test cases

This document describes the automated tests that exist in [`tic-tac-toe/`](../tic-tac-toe/). It
does not propose new tests; gaps are listed at the end. Test names below are the exact strings
passed to `test(...)`.

## How to run

```powershell
cd tic-tac-toe
npm test
```

`npm test` executes `node --test next_move.test.js tic_tac_toe_rules.test.js tic_tac_toe_view.test.js`
([`package.json`](../tic-tac-toe/package.json)). Runner: Node's built-in `node:test`; assertions:
`node:assert/strict`. No test framework or dependency is installed.

Last verified run (Node v18.20.8, Windows): **37 tests, 37 passed, 0 failed**, `duration_ms 4396`.
About 4 s of that is `random selection can reach several different empty fields`, which calls
`getNextMove` on an empty board 20 times (each call searches the full game tree).

## Common controls

| Concern | How it is controlled |
|---|---|
| Randomness | `next_move.test.js` temporarily assigns `Math.random = () => value` inside `try/finally`. `tic_tac_toe_view.test.js` uses `game.stubRandom(0)` from `test_helpers.js` (through `withGame`), so `selectRandomly` always picks the **first** candidate; restored in `finally`. |
| Timers | `test_helpers.installFakeTimers()` replaces `globalThis.setTimeout`/`clearTimeout` with a `Map`-backed queue exposing `pendingCount`, `delays`, `runPending()` (runs and clears all queued callbacks synchronously), and `restore()`. |
| DOM | `test_helpers.createFakeDocument()` provides `getElementById` for `board`, `status-message`, `restart-button` and `createElement`; `FakeElement` implements `children`, `classList` (add/remove/contains/toggle), `dataset`, `setAttribute/getAttribute`, `textContent`, `disabled`, `innerHTML` setter (clears children when set to `""`), `appendChild`, `addEventListener`, `listenerCount`, `click()`. **Note:** `FakeElement.click()` ignores `disabled`, so view tests exercise the JavaScript guards rather than browser behaviour. |
| Module isolation | `loadGame()` imports `./tic_tac_toe_view.js?instance=N` with an incrementing `N`, so each view test gets fresh module state. |
| Input immutability | Rules and `next_move` tests pass `Object.freeze`d boards and/or compare against a copy after the call. |

---

## `tic_tac_toe_rules.test.js` – rules module (11 tests)

Under test: [`tic_tac_toe_rules.js`](../tic-tac-toe/tic_tac_toe_rules.js) exports
`validateBoardState`, `isEmptyBoard`, `isFullBoard`, `getWinner`, `getWinningCombination`,
`getNextPlayer`. Fixtures: local `emptyBoard()` (`Array(9).fill("empty")`), local
`ALL_WINNING_COMBINATIONS` (copy of the eight triples, because the production constant is not
exported), helper `boardWithLine(combination, player)`. No randomness, timers, or DOM.

| Test | Function(s) | Inputs | Expected result |
|---|---|---|---|
| `accepts a valid board state` | `validateBoardState` | empty board; `["X","O","X","O","X","O","X","O","X"]` | does not throw |
| `rejects boards that are not arrays` | `validateBoardState` | `"not-an-array"`, `null` | throws `/expected an array/` |
| `rejects boards without exactly nine cells` | `validateBoardState` | 8 cells, 10 cells | throws `/exactly nine cells/` |
| `rejects boards containing invalid cell values` | `validateBoardState` | cell 4 = `"x"` (lower-case) | throws `/cells must be/` |
| `identifies an empty board` | `isEmptyBoard` | empty board; board with `X` at 0 | `true`; `false` |
| `identifies a full board` | `isFullBoard` | full drawn board; empty board; 8 marks + one `"empty"` | `true`; `false`; `false` |
| `detects all eight winning combinations for both players` | `getWinner`, `getWinningCombination` | for each of 8 triples × `["X","O"]`: board with only that line | `getWinner` = player; `getWinningCombination` deep-equals the triple (16 boards) |
| `reports no winner when no line is complete` | `getWinner`, `getWinningCombination` | empty board; full drawn board `["X","O","X","X","O","O","O","X","X"]`; two-in-a-row partial board | `null` everywhere |
| `determines the next player` | `getNextPlayer` | empty; one `X`; `X` and `O` | `"X"`; `"O"`; `"X"` |
| `rejects inconsistent X and O counts` | `getNextPlayer` | two `X` no `O`; one `O` no `X` | throws `/counts are inconsistent/` |
| `rules functions never modify the supplied board` | all six imported functions | frozen board `["X","X","X","O","O","empty"×4]` | none throws; board deep-equals the original |

Edge/invalid cases covered: non-array, `null`, wrong length (both directions), wrong case,
inconsistent counts in both directions, frozen input. Not covered: `getEmptyIndexes`, the exported
constants, boards with two simultaneous lines.

---

## `next_move.test.js` – computer move selection (15 tests)

Under test: `getNextMove` from [`next_move.js`](../tic-tac-toe/next_move.js). Fixture: local
`emptyBoard()`. Randomness controlled in two tests by reassigning `Math.random`; other tests are
written so that the assertion holds for any random pick. No timers or DOM.

| Test | Board (X/O to move) | Random | Expected result |
|---|---|---|---|
| `empty board returns X and a valid index` | empty (X) | real | `player === "X"`; `0 ≤ fieldIndex ≤ 8`; `boardState[fieldIndex] === "X"`; `outcome` ∈ {`win`,`not-winning`,`draw`} |
| `board containing one X returns O` | `X` at 0 (O) | real | `player === "O"` |
| `returns a winning move for the next player` | `["O","O","e","X","X","e","X","e","e"]` (O) | n/a (immediate win) | `player "O"`, `fieldIndex 2`, resulting board deep-equals expected, `outcome "win"` |
| `returns a winning X move when X is next` | `["X","X","e","O","e","e","O","e","e"]` (X) | n/a | `fieldIndex 2`, `outcome "win"` |
| `takes an immediate winning move instead of allowing a loss` | same board as the third test | n/a | same assertions as the third test (**duplicate**) |
| `returned index always refers to an empty cell` | `["X","O","e","X","O","e","e","e","e"]` (X; wins at 6) | n/a | `board[fieldIndex] === "empty"` |
| `falls back to a random valid move when no winning move exists` | `["X","O","e","e","X","e","e","e","O"]` (X) | `Math.random = () => 0` | `player "X"`, mark placed at `fieldIndex`, `outcome` ∈ the three values. *Note:* despite the name, X has a forced win (fork) here, so the code returns `outcome "win"` and picks the first open move deterministically. |
| `one empty cell returns that cell index` | 8 marks, index 8 empty (X) | n/a | `fieldIndex 8`, `outcome "draw"` |
| `full board returns null values` | full drawn board | n/a | deep-equals `{ player: null, fieldIndex: null, boardState: board, outcome: "draw" }` |
| `invalid cell values cause an error` | cell 0 = `"invalid"` | – | throws `/cells must be/` |
| `invalid X and O counts cause an error` | two `X`, no `O` | – | throws `/counts are inconsistent/` |
| `the supplied board array is not modified` | empty | real | input deep-equals its pre-call copy |
| `does not mutate a frozen board` | frozen `["X","O","e","e","X","e","e","e","O"]` | real | does not throw |
| `random selection can reach several different empty fields` | empty, 20 calls | `Math.random = () => step/20` for `step` 0..19 | each result marks `X` at its index; the set of chosen indexes has size > 1 |
| `a board that already contains a winner still returns an empty field` | `["X","X","X","O","O","e","e","e","e"]` (O) | real | `board[fieldIndex] === "empty"`; `player === "O"` |

(`e` abbreviates `"empty"` in the table only; the tests use the full string.)

Edge/invalid cases covered: full board, single empty cell, existing winner, invalid cell, invalid
counts, frozen input. Not covered: the look-ahead preference itself (blocking a threat, preferring
forced wins over draws), exact `outcome` for non-immediate positions, uniformity of the random
selection, the fallback when every move loses.

---

## `tic_tac_toe_view.test.js` – view/controller (11 tests)

Under test: the side effects of [`tic_tac_toe_view.js`](../tic-tac-toe/tic_tac_toe_view.js) on a
fake DOM, via `loadGame()` from [`test_helpers.js`](../tic-tac-toe/test_helpers.js). Every test uses
`withGame(0, run)`: fresh module instance, `Math.random` stubbed to `0`, fake timers, restore in
`finally`. Constants: `INITIAL_STATUS = "Player 1's turn (X)"`,
`COMPUTER_STATUS = "Player 2 is choosing a move (O)"`, `EMPTY_BOARD`.

Because `Math.random` is `0` and the computer uses look-ahead, O's replies in these tests are
deterministic: after X at 0, O plays 4; the win test (`X: 0, 1, 3`) ends with O completing
`[2, 4, 6]`; the draw test (`X: 4, 3, 2, 1, 8`) fills the board without a line.

| Test | Actions | Expected result | Verifies |
|---|---|---|---|
| `renders nine empty cells and the initial status` | load only | 9 cells; all `"empty"`; status `INITIAL_STATUS`; all enabled; labels `Cell 1, empty` / `Cell 9, empty` | initial render, ARIA labels |
| `a human click places X, disables input, and schedules O after 300ms` | click 0 | cell 0 = `X` with class `mark-x`, label `Cell 1, X`; status `COMPUTER_STATUS`; all 9 disabled; `pendingCount 1`; `delays [300]` | human move, disabling, timer delay |
| `O moves automatically into an empty cell and returns the turn to X` | click 0; `runPending()` | exactly one `X` and one `O`; status `INITIAL_STATUS`; `pendingCount 0`; each cell disabled iff not empty | automatic O move, re-enabling |
| `clicks on an occupied cell are ignored` | click 0; run O; click 0 again | board unchanged; status `INITIAL_STATUS`; no timer scheduled | occupied-cell rejection |
| `clicks are ignored while O is choosing a move` | click 0; click 1 (timer pending) | cell 1 still `"empty"`; status `COMPUTER_STATUS`; `pendingCount 1` | rejection during O's turn |
| `an O win shows the winning status, highlight, and blocks further moves` | for 0, 1, 3: click then `runPending()` | status `Player 2 wins (O)`; 3 `winning-cell`s; all disabled; a further click on an empty cell (if any) leaves the board unchanged | O win message, highlight, input lock |
| `a full board without a winner reports a draw` | for 4, 3, 2, 1, 8: click then `runPending()` | status `The game is a draw`; no `"empty"` left; all disabled; 0 highlighted cells | draw message, input lock |
| `restart clears the board and gives the turn back to X` | click 0; run O; restart | all `"empty"`; status `INITIAL_STATUS`; all enabled; 0 highlights; label `Cell 1, empty` | restart mid-game |
| `restarting while O is pending discards the stale computer move` | click 0 (timer pending); restart; `runPending()` | `pendingCount 0` after restart; after `runPending()` board still empty and status `INITIAL_STATUS` | timer cancellation |
| `repeated restarts do not accumulate timers or listeners` | 3× (click 0; restart) | `pendingCount 0`; restart listener count 1; board empty | idempotent restart |
| `a restarted game accepts a fresh X move` | click 0; run O; restart; click 8 | cell 8 = `X`; status `COMPUTER_STATUS` | playable after restart |

DOM behaviour tested: yes, against the fake DOM (`textContent`, `classList`, `disabled`,
`aria-label`, listener count). Not tested: `data-index`, `type="button"`, `class="cell"`, the
`mark-o` class, real browser `disabled` semantics, X-win status/highlight, the stale guard inside
`runComputerMove` (the fake `clearTimeout` removes the callback, so it never fires after restart),
the defensive `Error` in `runComputerMove`, and missing DOM elements at load. Input immutability is
not applicable (the view owns and intentionally mutates `boardState`).

---

## Traceability

| Requirement or behavior | Production implementation | Test file and test case | Coverage status |
|---|---|---|---|
| Empty-board creation | No dedicated function; `tic_tac_toe_view.js` uses `Array(BOARD_SIZE).fill(EMPTY)` at load and `boardState.fill(EMPTY)` in `restartGame` | `tic_tac_toe_view.test.js` → `renders nine empty cells and the initial status` (verifies the rendered result, not a creation function) | Partially covered |
| Board validation | `tic_tac_toe_rules.js` → `validateBoardState` | `tic_tac_toe_rules.test.js` → `accepts a valid board state`, `rejects boards that are not arrays`, `rejects boards without exactly nine cells`, `rejects boards containing invalid cell values`; `next_move.test.js` → `invalid cell values cause an error` | Covered |
| Empty-board detection | `tic_tac_toe_rules.js` → `isEmptyBoard` | `tic_tac_toe_rules.test.js` → `identifies an empty board` | Covered |
| Full-board detection | `tic_tac_toe_rules.js` → `isFullBoard` | `tic_tac_toe_rules.test.js` → `identifies a full board` | Covered |
| All eight winning combinations (both players) | `tic_tac_toe_rules.js` → `getWinningCombination`, `getWinner` | `tic_tac_toe_rules.test.js` → `detects all eight winning combinations for both players` | Covered |
| States without a winner | `getWinner`, `getWinningCombination` return `null` | `tic_tac_toe_rules.test.js` → `reports no winner when no line is complete` | Covered |
| First-match behaviour with two simultaneous lines | `getWinningCombination` (`Array.prototype.find`) | — | Not covered |
| Next-player calculation | `tic_tac_toe_rules.js` → `getNextPlayer` | `tic_tac_toe_rules.test.js` → `determines the next player`; `next_move.test.js` → `empty board returns X and a valid index`, `board containing one X returns O` | Covered |
| Invalid board states (inconsistent counts) | `getNextPlayer` throws | `tic_tac_toe_rules.test.js` → `rejects inconsistent X and O counts`; `next_move.test.js` → `invalid X and O counts cause an error` | Covered |
| Empty-index listing | `tic_tac_toe_rules.js` → `getEmptyIndexes` | only indirectly through `getNextMove` tests | Partially covered |
| Exported constants `EMPTY`, `PLAYER_X`, `PLAYER_O`, `BOARD_SIZE` | `tic_tac_toe_rules.js` | tests use string literals | Not covered |
| Immediate winning move is taken | `next_move.js` → `getNextMove` step 4 | `next_move.test.js` → `returns a winning move for the next player`, `returns a winning X move when X is next`, `takes an immediate winning move instead of allowing a loss`, `returned index always refers to an empty cell` | Covered |
| Random selection from empty fields | `next_move.js` → `selectRandomly` within the preferred class | `next_move.test.js` → `falls back to a random valid move when no winning move exists`, `random selection can reach several different empty fields` (both stub `Math.random`; assert valid empty cell and >1 reachable field on an empty board) | Partially covered |
| Look-ahead preference (block threats, prefer forced win over draw over loss) | `next_move.js` → `findSafeMoves`, `invertOpponentOutcome` | no direct unit test; exercised indirectly by `tic_tac_toe_view.test.js` → `an O win …`, `a full board without a winner reports a draw` (rely on O blocking) | Partially covered |
| `outcome` semantics for non-terminal positions | `next_move.js` → `getNextMove` | only membership in the three values is asserted | Partially covered |
| Completed games (full board / last cell / existing winner) | `getNextMove` full-board branch and general path | `next_move.test.js` → `full board returns null values`, `one empty cell returns that cell index`, `a board that already contains a winner still returns an empty field` | Covered |
| Input immutability | rules functions never write; `createMoveResult` copies | `tic_tac_toe_rules.test.js` → `rules functions never modify the supplied board`; `next_move.test.js` → `the supplied board array is not modified`, `does not mutate a frozen board` | Covered |
| Human X moves | `tic_tac_toe_view.js` → `handleHumanMove`, `makeMove`, `renderBoard` | `tic_tac_toe_view.test.js` → `a human click places X, disables input, and schedules O after 300ms` | Covered |
| Automatic O moves | `scheduleComputerMove`, `runComputerMove` | `tic_tac_toe_view.test.js` → `O moves automatically into an empty cell and returns the turn to X` | Covered |
| 300 ms computer delay | `COMPUTER_MOVE_DELAY_MS`, `setTimeout` | `tic_tac_toe_view.test.js` → `a human click places X, disables input, and schedules O after 300ms` (`delays [300]`) | Covered |
| Rejected occupied-cell clicks | `makeMove` returns `false`; `isCellDisabled` | `tic_tac_toe_view.test.js` → `clicks on an occupied cell are ignored` | Covered |
| Rejected clicks during O's turn | `handleHumanMove` guard on `computerMovePending`; `isCellDisabled` | `tic_tac_toe_view.test.js` → `clicks are ignored while O is choosing a move` | Covered |
| Win message – O | `finishTurn`, `STATUS_WIN["O"]` | `tic_tac_toe_view.test.js` → `an O win shows the winning status, highlight, and blocks further moves` | Covered |
| Win message – X (`Player 1 wins (X)`) | `finishTurn`, `STATUS_WIN["X"]` | — | Not covered |
| Winning-cell highlight | `highlightWinningCombination` | `tic_tac_toe_view.test.js` → `an O win …` (3 cells), `a full board … draw` (0 cells) | Covered |
| Draw message | `finishTurn`, `STATUS_DRAW` | `tic_tac_toe_view.test.js` → `a full board without a winner reports a draw` | Covered |
| Disabled input after completion | `gameIsOver`, `isCellDisabled`, `handleHumanMove` guard | `tic_tac_toe_view.test.js` → `an O win …`, `a full board … draw` | Covered |
| Restart behavior | `restartGame` | `tic_tac_toe_view.test.js` → `restart clears the board and gives the turn back to X`, `repeated restarts do not accumulate timers or listeners`, `a restarted game accepts a fresh X move` | Covered |
| Restart while a computer move is pending | `cancelPendingComputerMove` | `tic_tac_toe_view.test.js` → `restarting while O is pending discards the stale computer move` | Covered |
| Stale-callback guard in `runComputerMove` | `if (gameIsOver \|\| currentPlayer !== PLAYER_O)` | — (fake `clearTimeout` prevents the callback from firing) | Not covered |
| Defensive error in `runComputerMove` | `throw new Error("Computer move was requested when it was not O's turn.")` | — | Not covered |
| ARIA labels | `cellLabel`, `renderBoard` | `tic_tac_toe_view.test.js` → `renders nine empty cells …`, `a human click places X …`, `restart clears the board …` | Covered |
| `data-index`, `type="button"`, `class="cell"`, `mark-o` class | `createBoardCells`, `renderBoard` | — (`mark-x` is checked once) | Not covered |
| Missing DOM elements at module load | implicit `TypeError` | — | Not covered |
| Visual styling (`style.css`) | — | — | Not applicable |
| Real browser `disabled` click suppression, keyboard activation | native `<button>` | fake DOM ignores `disabled` | Not applicable (no browser tests) |

## Important gaps

1. **X win path** – no test asserts `Player 1 wins (X)` or the highlight after an X win.
2. **Look-ahead strategy** – no unit test asserts that O blocks an immediate threat or prefers a
   forced win over a draw; the view tests depend on this behaviour implicitly, so a regression in
   `findSafeMoves` would surface only as a confusing failure in the win/draw view tests.
3. **`outcome` values** – tests only check membership in `{"win","not-winning","draw"}` for
   non-trivial positions; the fork position in `falls back to a random valid move …` actually yields
   `"win"`.
4. **Stale-callback guard and defensive throw** in `runComputerMove` are unreachable under the fake
   timers and therefore untested.
5. **Duplicate test** – `takes an immediate winning move instead of allowing a loss` duplicates
   `returns a winning move for the next player`.
6. **`getEmptyIndexes` and the exported constants** have no direct tests.
7. **Test runtime** – the empty-board searches make `next_move.test.js` take ~4 s; not a correctness
   gap, but worth knowing when tests appear slow.
