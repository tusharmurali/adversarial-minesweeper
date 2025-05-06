// Game configuration constants
const rows = 7;
const cols = 7;
const totalMines = 8;
const cellSize = 30;

// Game state variables
let board = [];
const directions = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], /*self*/ [0, 1],
  [1, -1], [1, 0], [1, 1]
];
let minePositions = new Set();
let firstClick = true;
let revealedCount = 0;
let timer = 0;
let timerInterval = null;
let gameEnded = false;
let flagCount = 0;

// DOM element references
const boardEl = document.getElementById("board");
const counterEl = document.getElementById("counter");
const faceEl = document.getElementById("face");
const timerEl = document.getElementById("timer");

// Initializes or resets the game
function startGame() {
  // Reset game state
  board = [];
  minePositions = new Set();
  firstClick = true;
  revealedCount = 0;
  flagCount = 0;
  gameEnded = false;
  clearInterval(timerInterval);
  timer = 0;

  // Reset UI
  timerEl.textContent = "000";
  counterEl.textContent = String(totalMines).padStart(3, "0");
  faceEl.textContent = "😊";
  boardEl.innerHTML = "";
  boardEl.style.pointerEvents = "auto";
  boardEl.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;
  boardEl.style.gridTemplateRows = `repeat(${rows}, ${cellSize}px)`;

  const fragment = document.createDocumentFragment();

  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      const cell = {
        r, c,
        element: document.createElement("div"),
        mine: false,
        revealed: false,
        flagged: false,
        adjacent: 0,
      };

      const el = cell.element;
      el.className = "cell";
      el.style.width = `${cellSize}px`;
      el.style.height = `${cellSize}px`;
      el.style.lineHeight = `${cellSize - 2}px`;
      el.style.fontSize = `${Math.floor(cellSize * 0.6)}px`;

      el.addEventListener("click", () => {
        if (cell.revealed && cell.adjacent > 0) chordCell(cell);
        else handleClick(cell);
      });

      el.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        toggleFlag(cell);
      });

      fragment.appendChild(el);
      row.push(cell);
    }
    board.push(row);
  }

  boardEl.appendChild(fragment);
}

// Places mines randomly on the board, avoiding the first clicked cell and its neighbors
function placeMines(safeCell) {
  const avoid = new Set();

  for (const [dr, dc] of directions) {
    const nr = safeCell.r + dr;
    const nc = safeCell.c + dc;
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
      avoid.add(`${nr},${nc}`);
    }
  }
  avoid.add(`${safeCell.r},${safeCell.c}`);

  while (minePositions.size < totalMines) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    const key = `${r},${c}`;
    if (!minePositions.has(key) && !avoid.has(key)) {
      minePositions.add(key);
      board[r][c].mine = true;
    }
  }

  // Update adjacent counts
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].mine) continue;
      let count = 0;
      for (const [dr, dc] of directions) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].mine) {
          count++;
        }
      }
      board[r][c].adjacent = count;
    }
  }
}


// Helper: checks if two cells are neighbors (including diagonals)
function isNeighbor(r1, c1, r2, c2) {
  return Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1;
}

function isMinePossible(targetCell) {
  const maxMines = totalMines;
  const constraints = [];
  const toAssign = [];
  const cellIdMap = new Map(); // Map cell => id
  let idCounter = 0;

  // Assign unique IDs to cells
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = board[r][c];
      if (!cell.revealed && !cell.flagged) {
        const id = idCounter++;
        cellIdMap.set(cell, id);
        toAssign.push(cell);
      }
    }
  }

  // Build constraints based on known revealed cells
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = board[r][c];
      if (cell.revealed && cell.adjacent > 0) {
        let flagged = 0;
        const unknown = [];

        for (const [dr, dc] of directions) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            const neighbor = board[nr][nc];
            if (!neighbor.revealed && !neighbor.flagged) {
              unknown.push(cellIdMap.get(neighbor));
            } else if (neighbor.flagged || neighbor.mine) {
              flagged++;
            }
          }
        }

        constraints.push({ count: cell.adjacent - flagged, unknown });
      }
    }
  }

  const targetId = cellIdMap.get(targetCell);
  const total = toAssign.length;
  const memo = new Map();

  function backtrack(i, count, mineSet) {
    if (count > maxMines) return false;
    if (i === total) return check(mineSet);

    const key = `${i},${count},${mineSet.join(",")}`;
    if (memo.has(key)) return memo.get(key);

    const cell = toAssign[i];
    const cellId = cellIdMap.get(cell);

    // Try assigning a mine
    mineSet.push(cellId);
    if (backtrack(i + 1, count + 1, mineSet)) {
      memo.set(key, true);
      mineSet.pop();
      return true;
    }
    mineSet.pop();

    // Try not assigning a mine
    if (backtrack(i + 1, count, mineSet)) {
      memo.set(key, true);
      return true;
    }

    memo.set(key, false);
    return false;
  }

  function check(mineSet) {
    const mineLookup = new Set(mineSet);
    for (const { unknown, count } of constraints) {
      let mines = 0;
      for (const id of unknown) {
        if (mineLookup.has(id)) mines++;
      }
      if (mines !== count) return false;
    }
    return mineLookup.has(targetId);
  }

  return backtrack(0, 0, []);
}




// Handles left-click logic
function handleClick(cell) {
  if (cell.revealed || cell.flagged || gameEnded) return;

  if (firstClick) {
    placeMines(cell); // Place mines only after the first click
    firstClick = false;
    timerInterval = setInterval(() => {
      timer++;
      timerEl.textContent = String(timer).padStart(3, "0");
    }, 1000);
  } else {
    // After the first click, validate logically
    if (isMinePossible(cell)) {
      cell.element.classList.add("mine");
      cell.element.textContent = "💣";
      gameOver(false); // Logical error - ended due to unsafe guess
      return;
    }
  }

  reveal(cell);

  if (cell.mine) {
    // Game over if mine clicked
    cell.element.classList.add("mine");
    cell.element.textContent = "💣";
    gameOver(false);
  } else {
    if (cell.adjacent === 0) {
      revealAdjacent(cell);
    }
    checkWin();
  }
}


// Reveals a single cell (if not flagged or already revealed)
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

// Recursively reveals all adjacent non-mine, non-flagged cells
function revealAdjacent(cell) {
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const nr = cell.r + dr;
      const nc = cell.c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        const neighbor = board[nr][nc];
        if (!neighbor.revealed && !neighbor.mine) {
          reveal(neighbor);
          if (neighbor.adjacent === 0) revealAdjacent(neighbor);
        }
      }
    }
  }
}

// Implements the "chord" mechanic: if number of adjacent flags equals number on cell, reveal others
function chordCell(cell) {
  if (!cell.revealed || cell.adjacent === 0 || gameEnded) return;

  let flaggedCount = 0;
  const neighborsToReveal = [];

  // Count flags and prepare to reveal others
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const nr = cell.r + dr;
      const nc = cell.c + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      const neighbor = board[nr][nc];
      if (neighbor.flagged) {
        flaggedCount++;
      } else if (!neighbor.revealed) {
        neighborsToReveal.push(neighbor);
      }
    }
  }

  // Reveal if flags match the number
  if (flaggedCount === cell.adjacent) {
    for (const neighbor of neighborsToReveal) {
      handleClick(neighbor);
    }
  }
}

// Toggles a flag on a cell (right click)
function toggleFlag(cell) {
  if (cell.revealed || gameEnded) return;

  cell.flagged = !cell.flagged;
  if (cell.flagged) {
    cell.element.textContent = "🚩";
    flagCount++;
  } else {
    cell.element.textContent = "";
    flagCount--;
  }

  const remaining = totalMines - flagCount;
  counterEl.textContent = String(Math.max(0, remaining)).padStart(3, "0");
}

// Ends the game: reveal all mines and show win/lose face
function gameOver(won) {
  clearInterval(timerInterval);
  boardEl.style.pointerEvents = "none";
  gameEnded = true;
  faceEl.textContent = won ? "😎" : "😵";

  if (!won) {
    // Show all mines if player loses
    minePositions.forEach((pos) => {
      const [r, c] = pos.split(",").map(Number);
      const cell = board[r][c];
      cell.element.textContent = "💣";
      cell.element.classList.add("mine");
    });
  }
}

// Checks if the player has revealed all safe cells
function checkWin() {
  if (revealedCount === rows * cols - totalMines) {
    gameOver(true);
  }
}

// Start the game on load
startGame();
