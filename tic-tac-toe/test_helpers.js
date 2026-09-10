// Dependency-free test doubles: a minimal DOM, controllable timers, and a
// fresh instance of the view module for each test.

class FakeClassList {
  constructor() {
    this.tokens = new Set();
  }

  add(...names) {
    names.forEach((name) => this.tokens.add(name));
  }

  remove(...names) {
    names.forEach((name) => this.tokens.delete(name));
  }

  contains(name) {
    return this.tokens.has(name);
  }

  toggle(name, force) {
    if (force === undefined) {
      if (this.tokens.has(name)) {
        this.tokens.delete(name);
      } else {
        this.tokens.add(name);
      }
    } else if (force) {
      this.tokens.add(name);
    } else {
      this.tokens.delete(name);
    }
    return this.tokens.has(name);
  }
}

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.classList = new FakeClassList();
    this.dataset = {};
    this.attributes = {};
    this.listeners = new Map();
    this.textContent = "";
    this.disabled = false;
  }

  set innerHTML(value) {
    if (value === "") {
      this.children = [];
    }
    this._innerHTML = value;
  }

  get innerHTML() {
    return this._innerHTML ?? "";
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  getAttribute(name) {
    return this.attributes[name] ?? null;
  }

  addEventListener(type, handler) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type).push(handler);
  }

  listenerCount(type) {
    return this.listeners.get(type)?.length ?? 0;
  }

  click() {
    (this.listeners.get("click") ?? []).forEach((handler) => handler());
  }
}

function createFakeDocument() {
  const board = new FakeElement("div");
  const status = new FakeElement("p");
  const restart = new FakeElement("button");
  const elementsById = {
    board,
    "status-message": status,
    "restart-button": restart,
  };

  return {
    board,
    status,
    restart,
    document: {
      getElementById: (id) => elementsById[id] ?? null,
      createElement: (tagName) => new FakeElement(tagName),
    },
  };
}

/** Replaces the global timer functions so scheduled work runs on demand. */
function installFakeTimers() {
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const scheduled = new Map();
  let nextTimerId = 1;

  globalThis.setTimeout = (callback, delay) => {
    const timerId = nextTimerId;
    nextTimerId += 1;
    scheduled.set(timerId, { callback, delay });
    return timerId;
  };
  globalThis.clearTimeout = (timerId) => {
    scheduled.delete(timerId);
  };

  return {
    get pendingCount() {
      return scheduled.size;
    },
    get delays() {
      return [...scheduled.values()].map(({ delay }) => delay);
    },
    runPending() {
      const callbacks = [...scheduled.values()].map(({ callback }) => callback);
      scheduled.clear();
      callbacks.forEach((callback) => callback());
    },
    restore() {
      globalThis.setTimeout = originalSetTimeout;
      globalThis.clearTimeout = originalClearTimeout;
    },
  };
}

let loadCounter = 0;

/** Loads a fresh view module instance wired to fake DOM and timers. */
export async function loadGame() {
  const fakeDom = createFakeDocument();
  const previousDocument = globalThis.document;
  const originalRandom = Math.random;

  globalThis.document = fakeDom.document;
  const timers = installFakeTimers();

  loadCounter += 1;
  await import(`./tic_tac_toe_view.js?instance=${loadCounter}`);

  return {
    timers,
    statusText: () => fakeDom.status.textContent,
    cells: () => fakeDom.board.children,
    boardValues: () => fakeDom.board.children.map(
      (cell) => (cell.textContent === "" ? "empty" : cell.textContent),
    ),
    disabledFlags: () => fakeDom.board.children.map((cell) => cell.disabled),
    labels: () => fakeDom.board.children.map((cell) => cell.getAttribute("aria-label")),
    winningCells: () => fakeDom.board.children
      .map((cell, index) => (cell.classList.contains("winning-cell") ? index : null))
      .filter((index) => index !== null),
    restartListenerCount: () => fakeDom.restart.listenerCount("click"),
    clickCell(index) {
      fakeDom.board.children[index].click();
    },
    clickRestart() {
      fakeDom.restart.click();
    },
    stubRandom(value) {
      Math.random = typeof value === "function" ? value : () => value;
    },
    restore() {
      Math.random = originalRandom;
      timers.restore();
      globalThis.document = previousDocument;
    },
  };
}
