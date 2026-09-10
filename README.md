# AgenticPlay – Tic-Tac-Toe

A dependency-free, browser-based Tic-Tac-Toe game written in vanilla JavaScript (ES modules).
The human plays **Player 1 (X)** against the computer, **Player 2 (O)**. The computer looks ahead
through the remaining game tree, takes an immediate win when available, otherwise prefers moves that
force a win, then moves that hold a draw, and picks randomly among equally good candidates.

All statements in this README and in [`docs/`](docs/) are derived from the code that exists in the
repository at the time of writing. Where the code, the tests, and earlier informal descriptions
disagree, the discrepancy is called out explicitly (see
[Discrepancies](docs/business-logic.md#discrepancies-between-code-tests-and-descriptions)).

## Repository layout

| Path | Role |
|---|---|
| [`tic-tac-toe/index.html`](tic-tac-toe/index.html) | Page shell: status line, board container, restart button; loads the view module. |
| [`tic-tac-toe/style.css`](tic-tac-toe/style.css) | Layout and colours for the board, marks, winning highlight, and buttons. |
| [`tic-tac-toe/tic_tac_toe_rules.js`](tic-tac-toe/tic_tac_toe_rules.js) | Pure game rules: board validation, empty/full detection, winner detection, next player. |
| [`tic-tac-toe/next_move.js`](tic-tac-toe/next_move.js) | Computer move selection (`getNextMove`) built on the rules module. |
| [`tic-tac-toe/tic_tac_toe_view.js`](tic-tac-toe/tic_tac_toe_view.js) | Browser controller/view: owns the board state, renders the DOM, handles clicks, schedules O's move. |
| [`tic-tac-toe/tic_tac_toe_rules.test.js`](tic-tac-toe/tic_tac_toe_rules.test.js) | Unit tests for the rules module. |
| [`tic-tac-toe/next_move.test.js`](tic-tac-toe/next_move.test.js) | Unit tests for `getNextMove`. |
| [`tic-tac-toe/tic_tac_toe_view.test.js`](tic-tac-toe/tic_tac_toe_view.test.js) | Behavioural tests for the view, using a fake DOM and fake timers. |
| [`tic-tac-toe/test_helpers.js`](tic-tac-toe/test_helpers.js) | Test doubles: minimal fake DOM, controllable timers, fresh view-module loader. |
| [`tic-tac-toe/package.json`](tic-tac-toe/package.json) | Declares `"type": "module"` and the `npm test` script. No dependencies. |
| [`docs/`](docs/) | Project documentation (see below). |

There is no build step, no bundler, no lockfile, and no runtime or development dependency.

## Documentation

| Document | Contents |
|---|---|
| [docs/business-logic.md](docs/business-logic.md) | Game rules and behaviour as implemented: players, board model, win/draw detection, valid moves, computer strategy, restart, asynchronous computer move, and known discrepancies. |
| [docs/architecture.md](docs/architecture.md) | Module responsibilities, dependency and sequence diagrams (Mermaid), state ownership, side effects, asynchronous behaviour. |
| [docs/codebase-reference.md](docs/codebase-reference.md) | Developer reference for every export and private helper, data model, DOM contract, event listeners, error handling, runtime assumptions. |
| [docs/test-cases.md](docs/test-cases.md) | Description of every existing automated test, how randomness/timers/DOM are controlled, requirement-to-test traceability, and coverage gaps. |

## Running the game locally

The page loads `tic_tac_toe_view.js` as `<script type="module">`, which in Chromium-based browsers
is blocked when the page is opened from a `file://` URL (module scripts require an HTTP(S) origin).
Serve the `tic-tac-toe/` folder with any static file server and open `index.html` over HTTP.

The repository does **not** ship a server; the following are only examples of commonly available
tools:

```powershell
cd tic-tac-toe
# any one of:
npx --yes serve .            # Node
python -m http.server 8000   # Python 3
```

Then open the printed URL (for example `http://localhost:8000/index.html`).

Runtime requirements are listed in
[docs/codebase-reference.md → Runtime and browser assumptions](docs/codebase-reference.md#runtime-and-browser-assumptions).

## Running the tests

Tests use only Node's built-in `node:test` and `node:assert/strict`; nothing needs to be installed.
The test script uses paths relative to `tic-tac-toe/`, so run it from that folder:

```powershell
cd tic-tac-toe
npm test
```

`npm test` runs `node --test next_move.test.js tic_tac_toe_rules.test.js tic_tac_toe_view.test.js`
(see [`package.json`](tic-tac-toe/package.json)). Node.js 18 or newer is required for `node --test`.

Last verified result (Node v18.20.8, npm 10.8.2, Windows):

```
# tests 37
# pass 37
# fail 0
# duration_ms 4396
```

Most of the wall-clock time is spent in `next_move.test.js`, because `getNextMove` searches the whole
game tree when called on an empty board (see
[docs/business-logic.md → How the computer selects a move](docs/business-logic.md#how-the-computer-selects-a-move)).

## How to play

1. The status line shows `Player 1's turn (X)`. Click any empty cell to place an X.
2. All cells are disabled and the status shows `Player 2 is choosing a move (O)` while the computer
   waits 300 ms and then places an O.
3. Play continues until a player completes a row, column, or diagonal (`Player 1 wins (X)` /
   `Player 2 wins (O)`, winning cells highlighted) or the board fills without a winner
   (`The game is a draw`).
4. **Restart Game** clears the board at any time – including while the computer's move is pending –
   and hands the first move back to Player 1 (X).
