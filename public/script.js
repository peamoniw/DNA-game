const BASES = ["A", "T", "C", "G"];
const DNA_PAIRS = {
  A: "T",
  T: "A",
  C: "G",
  G: "C",
};

const GAME_LENGTH_SECONDS = 300;
const INITIAL_SPAWN_MS = 2500;
const MIN_SPAWN_MS = 900;
const EVENT_SPAWN_INTERVAL_MS = 8000;
const SPEED_BOOST_DURATION_MS = 5000;
const SPEED_BOOST_MULTIPLIER = 2;

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
  selectedBase: null,
  lastSpawnAt: 0,
  lastFrame: 0,
  animationFrameId: null,
  events: [],
  lastEventSpawnAt: 0,
  speedBoostActive: false,
  speedBoostEndTime: 0,
  freezeActive: false,
  lastEventType: null,
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
let eventWarningElement = null;

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
  let speedBoost = 1 + progress * 0.8;
  
  // Apply speed boost event multiplier
  if (state.speedBoostActive) {
    speedBoost *= SPEED_BOOST_MULTIPLIER;
  }
  
  const spawnInterval = Math.max(MIN_SPAWN_MS, INITIAL_SPAWN_MS - progress * 1600);

  return {
    speedBoost,
    spawnInterval,
  };
}

function randomBase() {
  const index = Math.floor(Math.random() * BASES.length);
  return BASES[index];
}

function buildCard(base, cardObject) {
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

  card.addEventListener("click", () => handleCardSelection(cardObject));

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
  state.selectedCards.forEach((card) => card.element.classList.remove("selected"));
  state.selectedCards = [];
}

function removeCard(card) {
  state.cards = state.cards.filter((item) => item.id !== card.id);
  card.element.remove();
}

function handleCardSelection(cardItem) {
  if (!state.running) return;

  // If a base is selected, check if card matches the selected base
  if (state.selectedBase) {
    if (isCorrectPair(cardItem.base, state.selectedBase)) {
      state.combo += 1;
      state.bestCombo = Math.max(state.bestCombo, state.combo);
      state.correctMatches += 1;

      const comboBonus = state.combo === 1 ? 10 : 10 + (state.combo - 1) * 2;
      state.score += comboBonus;

      addFloatingText(`+${comboBonus}`, "success");
      cardItem.element.classList.add("correct");

      setTimeout(() => {
        removeCard(cardItem);
        state.selectedBase = null;
        clearPairButtonSelection();
      }, 180);

      updateHud();
      return;
    } else {
      state.combo = 0;
      state.wrongMatches += 1;
      state.score = Math.max(0, state.score - 5);

      addFloatingText("-5", "error");
      cardItem.element.classList.add("wrong");

      setTimeout(() => {
        cardItem.element.classList.remove("wrong");
        state.selectedBase = null;
        clearPairButtonSelection();
      }, 360);

      updateHud();
      return;
    }
  }

  // Card-to-card matching mode (original logic)
  if (state.selectedCards.some((item) => item.id === cardItem.id)) {
    cardItem.element.classList.remove("selected");
    state.selectedCards = state.selectedCards.filter((item) => item.id !== cardItem.id);
    return;
  }

  if (state.selectedCards.length >= 2) {
    clearSelection();
  }

  cardItem.element.classList.add("selected");
  state.selectedCards.push(cardItem);

  if (state.selectedCards.length === 2) {
    const [first, second] = state.selectedCards;
    const firstBase = first.base;
    const secondBase = second.base;

    if (isCorrectPair(firstBase, secondBase)) {
      handleCorrectMatch(first, second);
    } else {
      handleWrongMatch(first, second);
    }

    clearSelection();
  }
}

function clearPairButtonSelection() {
  pairButtons.forEach((button) => button.classList.remove("active"));
}

function handlePairDockSelection(base) {
  if (!state.running) return;

  // Toggle base selection
  if (state.selectedBase === base) {
    state.selectedBase = null;
    clearPairButtonSelection();
    return;
  }

  // Select the clicked base
  state.selectedBase = base;
  clearPairButtonSelection();
  const activeButton = pairButtons.find((button) => button.dataset.base === base);
  if (activeButton) activeButton.classList.add("active");
}

function handleCorrectMatch(first, second) {
  state.combo += 1;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  state.correctMatches += 1;

  const comboBonus = state.combo === 1 ? 10 : 10 + (state.combo - 1) * 2;
  state.score += comboBonus;

  addFloatingText(`+${comboBonus}`, "success");
  first.element.classList.add("correct");
  second.element.classList.add("correct");

  setTimeout(() => {
    removeCard(first);
    removeCard(second);
  }, 180);

  updateHud();
}

function handleWrongMatch(first, second) {
  state.combo = 0;
  state.wrongMatches += 1;
  state.score = Math.max(0, state.score - 5);

  addFloatingText("-5", "error");
  first.element.classList.add("wrong");
  second.element.classList.add("wrong");

  setTimeout(() => {
    first.element.classList.remove("wrong");
    second.element.classList.remove("wrong");
  }, 360);

  updateHud();
}

function updateHud() {
  scoreValue.textContent = String(state.score);
  comboValue.textContent = String(state.combo);
  timeValue.textContent = formatTime(state.timeLeft);
}

function showEventWarning(message) {
  if (eventWarningElement) {
    eventWarningElement.remove();
  }
  eventWarningElement = document.createElement("div");
  eventWarningElement.style.cssText = `
    position: absolute;
    top: 100px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(255, 165, 0, 0.95);
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-weight: bold;
    font-size: 16px;
    z-index: 100;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    animation: slideDown 0.3s ease-out;
  `;
  eventWarningElement.textContent = message;
  conveyorBoard.parentElement.appendChild(eventWarningElement);
  
  setTimeout(() => {
    if (eventWarningElement) {
      eventWarningElement.remove();
      eventWarningElement = null;
    }
  }, 3000);
}

function buildBonusItem() {
  const item = document.createElement("div");
  item.className = "bonus-item";
  item.style.cssText = `
    position: absolute;
    width: 60px;
    height: 60px;
    background: radial-gradient(circle at 30% 30%, #FFD700, #FFA500);
    border: 3px solid #FF8C00;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    color: white;
    font-size: 24px;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
    box-shadow: 0 0 15px rgba(255, 215, 0, 0.8);
    cursor: pointer;
    animation: float 2s ease-in-out infinite;
  `;
  item.innerHTML = "⭐";
  return item;
}

function buildFreezeItem() {
  const item = document.createElement("div");
  item.className = "freeze-item";
  item.style.cssText = `
    position: absolute;
    width: 60px;
    height: 60px;
    background: radial-gradient(circle at 30% 30%, #87CEEB, #4A90E2);
    border: 3px solid #1E90FF;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    color: white;
    font-size: 24px;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
    box-shadow: 0 0 15px rgba(100, 200, 255, 0.8);
    cursor: pointer;
    animation: float 2s ease-in-out infinite;
  `;
  item.innerHTML = "❄️";
  return item;
}

function spawnBonusItem() {
  const boardRect = conveyorBoard.getBoundingClientRect();
  const laneTop = 52;
  const laneBottom = Math.max(90, boardRect.height - 120);
  const y = laneTop + Math.random() * (laneBottom - laneTop);
  const itemWidth = 60;
  
  const eventItem = {
    id: `bonus-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type: "bonus",
    x: -itemWidth - 20,
    y,
    speed: 80 + Math.random() * 30,
    element: buildBonusItem(),
  };
  
  eventItem.element.style.left = `${eventItem.x}px`;
  eventItem.element.style.top = `${eventItem.y}px`;
  eventItem.element.addEventListener("click", () => handleBonusCollect(eventItem));
  conveyorBoard.appendChild(eventItem.element);
  state.events.push(eventItem);
}

function spawnFreezeItem() {
  const boardRect = conveyorBoard.getBoundingClientRect();
  const laneTop = 52;
  const laneBottom = Math.max(90, boardRect.height - 120);
  const y = laneTop + Math.random() * (laneBottom - laneTop);
  const itemWidth = 60;
  
  const eventItem = {
    id: `freeze-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type: "freeze",
    x: -itemWidth - 20,
    y,
    speed: 80 + Math.random() * 30,
    element: buildFreezeItem(),
  };
  
  eventItem.element.style.left = `${eventItem.x}px`;
  eventItem.element.style.top = `${eventItem.y}px`;
  eventItem.element.addEventListener("click", () => handleFreezeCollect(eventItem));
  conveyorBoard.appendChild(eventItem.element);
  state.events.push(eventItem);
}

function handleBonusCollect(eventItem) {
  state.score += 50;
  addFloatingText("+50🌟", "success");
  state.events = state.events.filter((e) => e.id !== eventItem.id);
  eventItem.element.remove();
  updateHud();
}

function handleFreezeCollect(eventItem) {
  state.freezeActive = true;
  showEventWarning("⏸️ FREEZE ACTIVATED!");
  
  state.events = state.events.filter((e) => e.id !== eventItem.id);
  eventItem.element.remove();
  
  // Freeze effect - pause game for 3 seconds
  setTimeout(() => {
    state.freezeActive = false;
  }, 3000);
}

function maybeSpawnEvent(timestamp) {
  if (!state.lastEventSpawnAt) {
    state.lastEventSpawnAt = timestamp;
  }

  if (timestamp - state.lastEventSpawnAt >= EVENT_SPAWN_INTERVAL_MS) {
    const eventType = Math.random();
    
    // EV2: Bonus item (always possible) - 50% chance
    if (eventType < 0.5) {
      spawnBonusItem();
      state.lastEventType = "bonus";
    } 
    // EV1 vs EV3: Cannot happen at same time
    else if (eventType < 0.75) {
      // EV1: Speed boost
      if (state.lastEventType !== "freeze") {
        state.speedBoostActive = true;
        state.speedBoostEndTime = performance.now() + SPEED_BOOST_DURATION_MS;
        showEventWarning("⚡ SPEED BOOST x2 for 5 seconds!");
        state.lastEventType = "speedboost";
      } else {
        spawnBonusItem();
        state.lastEventType = "bonus";
      }
    } 
    else {
      // EV3: Freeze item
      if (state.lastEventType !== "speedboost") {
        spawnFreezeItem();
        state.lastEventType = "freeze";
      } else {
        spawnBonusItem();
        state.lastEventType = "bonus";
      }
    }
    
    state.lastEventSpawnAt = timestamp;
  }
}

function updateEvents(deltaSeconds) {
  const { speedBoost } = getDifficultySettings();

  // Update event items position
  state.events.forEach((eventItem) => {
    eventItem.x += eventItem.speed * speedBoost * deltaSeconds;
    eventItem.element.style.left = `${eventItem.x}px`;
  });

  // Remove off-screen event items
  state.events = state.events.filter((eventItem) => {
    const boardRect = conveyorBoard.getBoundingClientRect();
    const isVisible = eventItem.x < boardRect.width + 180;
    if (!isVisible) {
      eventItem.element.remove();
    }
    return isVisible;
  });

  // Check speed boost duration
  if (state.speedBoostActive && performance.now() >= state.speedBoostEndTime) {
    state.speedBoostActive = false;
  }
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
    element: null,
  };

  card.element = buildCard(base, card);
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

  // Skip game updates during freeze, but keep updating frame time
  if (!state.freezeActive) {
    const deltaSeconds = (timestamp - state.lastFrame) / 1000;
    state.lastFrame = timestamp;

    state.timeLeft = Math.max(0, state.timeLeft - deltaSeconds);
    maybeSpawnCard(timestamp);
    maybeSpawnEvent(timestamp);
    updateCards(deltaSeconds);
    updateEvents(deltaSeconds);
    updateHud();

    if (state.timeLeft <= 0) {
      endGame();
      return;
    }
  } else {
    // During freeze, just update lastFrame to prevent time jumping
    state.lastFrame = timestamp;
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
  state.selectedBase = null;
  state.events.forEach((event) => event.element.remove());
  state.events = [];
  state.lastEventSpawnAt = 0;
  state.speedBoostActive = false;
  state.speedBoostEndTime = 0;
  state.freezeActive = false;
  state.lastEventType = null;
  if (eventWarningElement) {
    eventWarningElement.remove();
    eventWarningElement = null;
  }

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
  state.selectedBase = null;
  state.events.forEach((event) => event.element.remove());
  state.events = [];
  state.score = 0;
  state.combo = 0;
  state.bestCombo = 0;
  state.correctMatches = 0;
  state.wrongMatches = 0;
  state.timeLeft = GAME_LENGTH_SECONDS;
  state.lastEventSpawnAt = 0;
  state.speedBoostActive = false;
  state.freezeActive = false;
  state.lastEventType = null;
  if (eventWarningElement) {
    eventWarningElement.remove();
    eventWarningElement = null;
  }
  updateHud();
  clearPairButtonSelection();
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
