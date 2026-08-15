const BASES = ["A", "T", "C", "G"];
const DNA_PAIRS = {
  A: "T",
  T: "A",
  C: "G",
  G: "C",
};

const GAME_LENGTH_SECONDS = 300;
const INITIAL_SPAWN_MS = 1800;
const MIN_SPAWN_MS = 420;

const state = {
  screen: "menu",
  running: false,
  score: 0,
  combo: 0,
  bestCombo: 0,
  correctMatches: 0,
  wrongMatches: 0,
  timeLeft: GAME_LENGTH_SECONDS,
  cards: [],
  selectedCards: [],
  lastSpawnAt: 0,
  lastFrame: 0,
  animationFrameId: null,
};

const screenMap = {
  menu: document.getElementById("menuScreen"),
  game: document.getElementById("gameScreen"),
  over: document.getElementById("gameOverScreen"),
};

const scoreValue = document.getElementById("scoreValue");
const timeValue = document.getElementById("timeValue");
const comboValue = document.getElementById("comboValue");
const finalScore = document.getElementById("finalScore");
const bestComboValue = document.getElementById("bestComboValue");
const correctMatchesValue = document.getElementById("correctMatchesValue");
const wrongMatchesValue = document.getElementById("wrongMatchesValue");
const accuracyValue = document.getElementById("accuracyValue");
const conveyorBoard = document.getElementById("conveyorBoard");
const pairButtons = Array.from(document.querySelectorAll(".pair-button"));

function formatTime(totalSeconds) {
  const safe = Math.max(0, Math.ceil(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function setScreen(nextScreen) {
  state.screen = nextScreen;
  Object.entries(screenMap).forEach(([name, el]) => {
    el.classList.toggle("active", name === nextScreen);
  });
}

function isCorrectPair(base1, base2) {
  if (!base1 || !base2) return false;
  return DNA_PAIRS[base1] === base2;
}

function getDifficultySettings() {
  const elapsed = GAME_LENGTH_SECONDS - state.timeLeft;
  const progress = Math.min(1, elapsed / GAME_LENGTH_SECONDS);
  const speedBoost = 1 + progress * 1.9;
  const spawnInterval = Math.max(MIN_SPAWN_MS, INITIAL_SPAWN_MS - progress * 1300);

  return {
    speedBoost,
    spawnInterval,
  };
}

function randomBase() {
  const index = Math.floor(Math.random() * BASES.length);
  return BASES[index];
}

function buildCard(base) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "dna-card";
  card.dataset.base = base;
  card.setAttribute("aria-label", `${base} DNA base card`);
  card.innerHTML = `
    <div class="card-inner">
      <span class="base-letter">${base}</span>
      <span class="base-label">DNA BASE</span>
    </div>
  `;

  card.addEventListener("click", () => handleCardSelection(card));

  return card;
}

function addFloatingText(text, tone = "success") {
  const element = document.createElement("div");
  element.className = "combo-pop";
  element.textContent = text;
  element.style.color = tone === "success" ? "#34b186" : "#e85d6e";
  element.style.border = tone === "success"
    ? "1px solid rgba(52,177,134,0.15)"
    : "1px solid rgba(232,93,110,0.15)";
  conveyorBoard.appendChild(element);
  setTimeout(() => element.remove(), 800);
}

function clearSelection() {
  state.selectedCards.forEach((card) => {
    if (card && card.element) {
      card.element.classList.remove("selected");
    }
  });
  state.selectedCards = [];
}

function removeCard(card) {
  if (!card) return;

  state.cards = state.cards.filter((item) => item && item.id !== card.id);
  state.selectedCards = state.selectedCards.filter((item) => item && item.id !== card.id);

  if (card.element && card.element.parentNode) {
    card.element.remove();
  }
}

function handleCardSelection(cardItem) {
  if (!state.running || !cardItem) return;

  if (state.selectedCards.some((item) => item && item.id === cardItem.id)) {
    cardItem.element.classList.remove("selected");
    state.selectedCards = state.selectedCards.filter((item) => item && item.id !== cardItem.id);
    return;
  }

  clearSelection();
  cardItem.element.classList.add("selected");
  state.selectedCards = [cardItem];
  clearPairButtonSelection();
}

function clearPairButtonSelection() {
  pairButtons.forEach((button) => button.classList.remove("active"));
}

function handlePairDockSelection(base) {
  if (!state.running) return;

  const targetCard = state.selectedCards[0];
  if (!targetCard) {
    clearPairButtonSelection();
    const activeButton = pairButtons.find((button) => button.dataset.base === base);
    if (activeButton) activeButton.classList.add("active");
    return;
  }

  clearPairButtonSelection();
  const chosenButton = pairButtons.find((button) => button.dataset.base === base);
  if (chosenButton) chosenButton.classList.add("active");

  if (isCorrectPair(targetCard.base, base)) {
    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    state.correctMatches += 1;

    const comboBonus = state.combo === 1 ? 10 : 10 + (state.combo - 1) * 2;
    state.score += comboBonus;

    addFloatingText(`+${comboBonus}`, "success");
    targetCard.element.classList.add("correct");

    setTimeout(() => {
      clearPairButtonSelection();
      removeCard(targetCard);
      clearSelection();
    }, 180);

    updateHud();
    return;
  }

  state.combo = 0;
  state.wrongMatches += 1;
  state.score = Math.max(0, state.score - 5);

  addFloatingText("-5", "error");
  targetCard.element.classList.add("wrong");

  setTimeout(() => {
    clearPairButtonSelection();
    targetCard.element.classList.remove("wrong");
    clearSelection();
  }, 360);

  updateHud();
}

function handleCorrectMatch(first, second) {
  state.combo += 1;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  state.correctMatches += 1;

  const comboBonus = state.combo === 1 ? 10 : 10 + (state.combo - 1) * 2;
  state.score += comboBonus;

  addFloatingText(`+${comboBonus}`, "success");
  if (first && first.element) first.element.classList.add("correct");
  if (second && second.element) second.element.classList.add("correct");

  setTimeout(() => {
    clearPairButtonSelection();
    if (first) removeCard(first);
    if (second) removeCard(second);
    clearSelection();
  }, 180);

  updateHud();
}

function handleWrongMatch(first, second) {
  state.combo = 0;
  state.wrongMatches += 1;
  state.score = Math.max(0, state.score - 5);

  addFloatingText("-5", "error");
  if (first && first.element) first.element.classList.add("wrong");
  if (second && second.element) second.element.classList.add("wrong");

  setTimeout(() => {
    clearPairButtonSelection();
    if (first && first.element) first.element.classList.remove("wrong");
    if (second && second.element) second.element.classList.remove("wrong");
    clearSelection();
  }, 360);

  updateHud();
}

function updateHud() {
  scoreValue.textContent = String(state.score);
  comboValue.textContent = String(state.combo);
  timeValue.textContent = formatTime(state.timeLeft);
}

function spawnCard() {
  const base = randomBase();
  const boardRect = conveyorBoard.getBoundingClientRect();
  const cardWidth = 110;
  const cardHeight = 148;
  const laneTop = 52;
  const laneBottom = Math.max(90, boardRect.height - 120);
  const y = laneTop + Math.random() * (laneBottom - laneTop);
  const card = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    base,
    x: -cardWidth - 20,
    y,
    speed: 60 + Math.random() * 30,
    element: buildCard(base),
  };

  card.element.style.left = `${card.x}px`;
  card.element.style.top = `${card.y}px`;
  conveyorBoard.appendChild(card.element);
  state.cards.push(card);
}

function updateCards(deltaSeconds) {
  const { speedBoost } = getDifficultySettings();

  state.cards.forEach((card) => {
    card.x += card.speed * speedBoost * deltaSeconds;
    card.element.style.left = `${card.x}px`;
  });

  state.cards = state.cards.filter((card) => {
    const boardRect = conveyorBoard.getBoundingClientRect();
    const isVisible = card.x < boardRect.width + 180;
    if (!isVisible) {
      card.element.remove();
    }
    return isVisible;
  });
}

function maybeSpawnCard(timestamp) {
  const { spawnInterval } = getDifficultySettings();
  if (!state.lastSpawnAt) {
    state.lastSpawnAt = timestamp;
  }

  if (timestamp - state.lastSpawnAt >= spawnInterval) {
    spawnCard();
    state.lastSpawnAt = timestamp;
  }
}

function tick(timestamp) {
  if (!state.running) return;

  if (!state.lastFrame) {
    state.lastFrame = timestamp;
  }

  const deltaSeconds = (timestamp - state.lastFrame) / 1000;
  state.lastFrame = timestamp;

  state.timeLeft = Math.max(0, state.timeLeft - deltaSeconds);
  maybeSpawnCard(timestamp);
  updateCards(deltaSeconds);
  updateHud();

  if (state.timeLeft <= 0) {
    endGame();
    return;
  }

  state.animationFrameId = requestAnimationFrame(tick);
}

function resetGameState() {
  state.score = 0;
  state.combo = 0;
  state.bestCombo = 0;
  state.correctMatches = 0;
  state.wrongMatches = 0;
  state.timeLeft = GAME_LENGTH_SECONDS;
  state.lastSpawnAt = 0;
  state.lastFrame = 0;
  state.cards.forEach((card) => card.element.remove());
  state.cards = [];
  state.selectedCards = [];
  clearPairButtonSelection();

  updateHud();
}

function startGame() {
  resetGameState();
  state.running = true;
  setScreen("game");

  for (let i = 0; i < 5; i += 1) {
    spawnCard();
  }

  state.animationFrameId = requestAnimationFrame(tick);
}

function endGame() {
  state.running = false;
  if (state.animationFrameId) {
    cancelAnimationFrame(state.animationFrameId);
    state.animationFrameId = null;
  }

  const totalAttempts = state.correctMatches + state.wrongMatches;
  const accuracy = totalAttempts > 0 ? Math.round((state.correctMatches / totalAttempts) * 100) : 0;

  finalScore.textContent = String(state.score);
  bestComboValue.textContent = String(state.bestCombo);
  correctMatchesValue.textContent = String(state.correctMatches);
  wrongMatchesValue.textContent = String(state.wrongMatches);
  accuracyValue.textContent = `${accuracy}%`;

  setScreen("over");
}

function backToMenu() {
  state.running = false;
  if (state.animationFrameId) {
    cancelAnimationFrame(state.animationFrameId);
    state.animationFrameId = null;
  }

  state.cards.forEach((card) => card.element.remove());
  state.cards = [];
  state.selectedCards = [];
  state.score = 0;
  state.combo = 0;
  state.bestCombo = 0;
  state.correctMatches = 0;
  state.wrongMatches = 0;
  state.timeLeft = GAME_LENGTH_SECONDS;
  clearPairButtonSelection();
  updateHud();
  setScreen("menu");
}

document.getElementById("startButton").addEventListener("click", startGame);
document.getElementById("playAgainButton").addEventListener("click", startGame);
document.getElementById("backMenuButton").addEventListener("click", backToMenu);
pairButtons.forEach((button) => {
  button.addEventListener("click", () => {
    handlePairDockSelection(button.dataset.base);
  });
});

updateHud();
setScreen("menu");
