const rows = 7, cols = 7, totalMines = 8;
let board = [], firstClick = true, revealedCount = 0, flagCount = 0;
let startTime = null, timerInterval = null, gameEnded = false;

const directions = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],          [0, 1],
  [1, -1],  [1, 0], [1, 1]
];

const $ = id => document.getElementById(id);
const boardEl = $("board"), counterEl = $("counter"), faceEl = $("face");
const timerEl = $("timer"), messageEl = $("message");

function inBounds(r, c) {
  return r >= 0 && r < rows && c >= 0 && c < cols;
}

function getNeighbors(r, c) {
  return directions
    .map(([dr, dc]) => [r + dr, c + dc])
    .filter(([nr, nc]) => inBounds(nr, nc))
    .map(([nr, nc]) => board[nr][nc]);
}

function startGame() {
  board = [], firstClick = true, revealedCount = 0, flagCount = 0;
  gameEnded = false;
  clearInterval(timerInterval);

  boardEl.innerHTML = "";
  boardEl.style.pointerEvents = "auto";
  counterEl.textContent = String(totalMines).padStart(3, "0");
  timerEl.textContent = "000";
  faceEl.textContent = "😊";
  messageEl.textContent = "";

  const fragment = document.createDocumentFragment();

  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      const cell = {
        r, c, mine: false, revealed: false, flagged: false, adjacent: 0,
        element: document.createElement("div")
      };

      const el = cell.element;
      el.className = "cell";
      el.addEventListener("click", () => cell.revealed && cell.adjacent > 0 ? chordCell(cell) : handleClick(cell));
      el.addEventListener("contextmenu", e => (e.preventDefault(), toggleFlag(cell)));

      fragment.appendChild(el);
      row.push(cell);
    }
    board.push(row);
  }

  boardEl.appendChild(fragment);
}

function placeMines(safeCell) {
  const avoid = new Set([`${safeCell.r},${safeCell.c}`, ...getNeighbors(safeCell.r, safeCell.c).map(n => `${n.r},${n.c}`)]);
  const placed = new Set();

  while (placed.size < totalMines) {
    const r = Math.floor(Math.random() * rows), c = Math.floor(Math.random() * cols);
    const key = `${r},${c}`;
    if (!placed.has(key) && !avoid.has(key)) {
      placed.add(key);
      board[r][c].mine = true;
    }
  }

  board.flat().forEach(cell => {
    if (!cell.mine) {
      cell.adjacent = getNeighbors(cell.r, cell.c).filter(n => n.mine).length;
    }
  });
}

function isMinePossible(targetCell) {
  const constraints = [], toAssign = [];

  board.flat().forEach(cell => {
    if (!cell.revealed && cell !== targetCell) toAssign.push(cell);
    if (cell.revealed && cell.adjacent > 0) {
      const unknown = getNeighbors(cell.r, cell.c).filter(n => !n.revealed);
      constraints.push({ count: cell.adjacent, unknown });
    }
  });

  function backtrack(i, count, mineSet) {
    if (count > totalMines) return null;
    if (i === toAssign.length) return check(mineSet);
    const cell = toAssign[i];

    mineSet.push(cell);
    const withMine = backtrack(i + 1, count + 1, mineSet);
    if (withMine) return withMine;
    mineSet.pop();

    return backtrack(i + 1, count, mineSet);
  }

  function check(mineSet) {
    const lookup = new Set(mineSet);
    return constraints.every(({ unknown, count }) =>
      unknown.filter(c => lookup.has(c)).length === count
    ) ? [...mineSet] : null;
  }

  return backtrack(0, 1, [targetCell]);
}

function handleClick(cell) {
  if (cell.revealed || cell.flagged || gameEnded) return;

  if (firstClick) {
    placeMines(cell);
    firstClick = false;
    startTime = performance.now();
    timerInterval = setInterval(() => {
      const elapsed = Math.floor((performance.now() - startTime) / 1000);
      timerEl.textContent = String(elapsed).padStart(3, "0");
    }, 100);
  } else {
    const adversarial = isMinePossible(cell);
    if (adversarial) return gameOver(adversarial);
  }

  reveal(cell);
  if (cell.adjacent === 0) revealAdjacent(cell);
  checkWin();
}

function reveal(cell) {
  if (cell.revealed || cell.flagged) return;
  cell.revealed = true;
  cell.element.classList.add("revealed");
  if (cell.adjacent > 0) {
    cell.element.textContent = cell.adjacent;
    cell.element.classList.add(`number-${cell.adjacent}`);
  }
  revealedCount++;
}

function revealAdjacent(cell) {
  getNeighbors(cell.r, cell.c).forEach(n => {
    if (!n.revealed && !n.mine) {
      reveal(n);
      if (n.adjacent === 0) revealAdjacent(n);
    }
  });
}

function chordCell(cell) {
  const neighbors = getNeighbors(cell.r, cell.c);
  const flagged = neighbors.filter(n => n.flagged).length;
  if (flagged === cell.adjacent) {
    neighbors.filter(n => !n.revealed && !n.flagged).forEach(handleClick);
  }
}

function toggleFlag(cell) {
  if (cell.revealed || gameEnded) return;
  cell.flagged = !cell.flagged;
  cell.element.textContent = cell.flagged ? "🚩" : "";
  flagCount += cell.flagged ? 1 : -1;
  counterEl.textContent = String(totalMines - flagCount).padStart(3, "0");
}

function gameOver(adversarial = null) {
  clearInterval(timerInterval);
  boardEl.style.pointerEvents = "none";
  gameEnded = true;
  faceEl.textContent = adversarial ? "😵" : "😎";

  if (adversarial) {
    adversarial[0].element.classList.add("mine");
    board.flat().forEach(cell => {
      if (adversarial.includes(cell)) {
        if (!cell.flagged) {
          cell.element.textContent = "💣";
          cell.element.classList.add("revealed");
        }
      } else if (cell.flagged) {
        cell.element.style.opacity = 0.5;
      }
    });
  } else {
    const seconds = ((performance.now() - startTime) / 1000).toFixed(2);
    messageEl.textContent = `You won in ${seconds} second${seconds !== "1.0" ? "s" : ""}!`;
  }
}

function checkWin() {
  if (revealedCount === rows * cols - totalMines) gameOver();
}

startGame();
