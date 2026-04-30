const SYMBOLS = {
  coin: {
    id: "coin",
    icon: "🪙",
    name: "おこづかい",
    rarity: 4,
    base: 1,
    description: "基本収入 +1。祖父母がいると追加 +1。",
    score(ctx) {
      return 1 + (ctx.count("grandma") + ctx.count("grandpa") > 0 ? 1 : 0);
    },
  },
  child: {
    id: "child",
    icon: "🧒",
    name: "こども",
    rarity: 3,
    base: 1,
    description: "基本 +1。おもちゃ1つにつき +1。",
    score(ctx) {
      return 1 + ctx.count("toy");
    },
  },
  parent: {
    id: "parent",
    icon: "🧑",
    name: "親",
    rarity: 3,
    base: 2,
    description: "基本 +2。こどもがいると +2。",
    score(ctx) {
      return 2 + (ctx.count("child") > 0 ? 2 : 0);
    },
  },
  grandma: {
    id: "grandma",
    icon: "👵",
    name: "おばあちゃん",
    rarity: 2,
    base: 2,
    description: "基本 +2。お茶があると +3。",
    score(ctx) {
      return 2 + (ctx.count("tea") > 0 ? 3 : 0);
    },
  },
  grandpa: {
    id: "grandpa",
    icon: "👴",
    name: "おじいちゃん",
    rarity: 2,
    base: 2,
    description: "基本 +2。ねこがいると +2。",
    score(ctx) {
      return 2 + (ctx.count("cat") > 0 ? 2 : 0);
    },
  },
  cat: {
    id: "cat",
    icon: "🐈",
    name: "まねきねこ",
    rarity: 2,
    base: 1,
    description: "基本 +1。盤面の金運シンボルを +1。",
    score(ctx) {
      return 1;
    },
    bonus(target) {
      return ["coin", "charm", "treasure"].includes(target.id) ? 1 : 0;
    },
  },
  toy: {
    id: "toy",
    icon: "🧸",
    name: "おもちゃ",
    rarity: 3,
    base: 1,
    description: "基本 +1。こどもの価値を上げる。",
    score() {
      return 1;
    },
  },
  tea: {
    id: "tea",
    icon: "🍵",
    name: "お茶",
    rarity: 3,
    base: 1,
    description: "基本 +1。祖母の価値を大きく上げる。",
    score() {
      return 1;
    },
  },
  charm: {
    id: "charm",
    icon: "🍀",
    name: "幸運のお守り",
    rarity: 1,
    base: 0,
    description: "基本 +0。スピン後の選択肢が少し良くなる。",
    score() {
      return 0;
    },
  },
  treasure: {
    id: "treasure",
    icon: "💎",
    name: "へそくり",
    rarity: 1,
    base: 5,
    description: "基本 +5。ねこがいるとさらに伸びる。",
    score() {
      return 5;
    },
  },
};

const START_DECK = [
  "coin", "coin", "coin", "coin", "coin",
  "child", "parent", "cat", "toy", "tea",
];

const state = {
  money: 10,
  rent: 25,
  rentDue: 5,
  turn: 1,
  deck: [...START_DECK],
  spinning: false,
  gameOver: false,
};

const els = {
  money: document.querySelector("#money"),
  rent: document.querySelector("#rent"),
  rentDue: document.querySelector("#rentDue"),
  turn: document.querySelector("#turn"),
  deckSize: document.querySelector("#deckSize"),
  slotGrid: document.querySelector("#slotGrid"),
  spinButton: document.querySelector("#spinButton"),
  resetButton: document.querySelector("#resetButton"),
  turnSummary: document.querySelector("#turnSummary"),
  choicePanel: document.querySelector("#choicePanel"),
  choices: document.querySelector("#choices"),
  deckList: document.querySelector("#deckList"),
  template: document.querySelector("#symbolTemplate"),
};

function sample(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function weightedSymbolPool() {
  const luck = state.deck.filter((id) => id === "charm").length;
  return Object.values(SYMBOLS).flatMap((symbol) => {
    const extraLuck = symbol.rarity <= 2 ? luck : 0;
    return Array.from({ length: symbol.rarity + extraLuck }, () => symbol.id);
  });
}

function drawSpin() {
  return Array.from({ length: 15 }, () => SYMBOLS[sample(state.deck)]);
}

function createContext(spin) {
  return {
    spin,
    count(id) {
      return spin.filter((symbol) => symbol.id === id).length;
    },
  };
}

function scoreSpin(spin) {
  const ctx = createContext(spin);
  const cats = spin.filter((symbol) => symbol.id === "cat");
  return spin.map((symbol) => {
    const base = symbol.score(ctx);
    const bonus = cats.reduce((sum, cat) => sum + (cat.bonus?.(symbol) ?? 0), 0);
    return {
      symbol,
      value: base + bonus,
    };
  });
}

function makeSymbolCard(symbol, value) {
  const node = els.template.content.firstElementChild.cloneNode(true);
  node.querySelector(".symbol-icon").textContent = symbol.icon;
  node.querySelector(".symbol-name").textContent = value == null ? symbol.name : `${symbol.name} +${value}`;
  node.querySelector(".symbol-description").textContent = symbol.description;
  return node;
}

function renderSlots(scored = []) {
  els.slotGrid.innerHTML = "";
  const cells = scored.length ? scored : Array.from({ length: 15 }, () => null);
  cells.forEach((entry) => {
    const reel = document.createElement("div");
    reel.className = "reel";
    if (entry) {
      reel.innerHTML = `<div>${entry.symbol.icon}<small>+${entry.value}</small></div>`;
    } else {
      reel.textContent = "？";
    }
    els.slotGrid.appendChild(reel);
  });
}

function renderDeck() {
  const counts = state.deck.reduce((map, id) => {
    map.set(id, (map.get(id) ?? 0) + 1);
    return map;
  }, new Map());
  els.deckList.innerHTML = "";
  [...counts.entries()]
    .sort(([a], [b]) => SYMBOLS[a].name.localeCompare(SYMBOLS[b].name, "ja"))
    .forEach(([id, count]) => {
      const card = makeSymbolCard(SYMBOLS[id]);
      card.querySelector(".symbol-name").textContent = `${SYMBOLS[id].name} ×${count}`;
      els.deckList.appendChild(card);
    });
}

function renderStatus() {
  els.money.textContent = state.money;
  els.rent.textContent = state.rent;
  els.rentDue.textContent = state.rentDue;
  els.turn.textContent = state.turn;
  els.deckSize.textContent = state.deck.length;
  els.spinButton.disabled = state.spinning || state.gameOver || !els.choicePanel.classList.contains("hidden");
  renderDeck();
}

function showChoices() {
  const pool = weightedSymbolPool();
  const choices = new Set();
  while (choices.size < 3) {
    choices.add(sample(pool));
  }

  els.choices.innerHTML = "";
  choices.forEach((id) => {
    const symbol = SYMBOLS[id];
    const button = makeSymbolCard(symbol);
    button.type = "button";
    button.addEventListener("click", () => {
      state.deck.push(id);
      els.choicePanel.classList.add("hidden");
      els.turnSummary.textContent = `${symbol.name} が家族に加わった。次のターンへ進もう。`;
      renderStatus();
    });
    els.choices.appendChild(button);
  });
  els.choicePanel.classList.remove("hidden");
}

function resolveRentIfNeeded() {
  state.rentDue -= 1;
  if (state.rentDue > 0) return;

  if (state.money >= state.rent) {
    state.money -= state.rent;
    state.rent = Math.ceil(state.rent * 1.45 + 8);
    state.rentDue = 5;
    els.turnSummary.innerHTML = `<span class="win">支払い成功。</span> 次の支払いは ${state.rent}。`;
  } else {
    state.gameOver = true;
    els.turnSummary.innerHTML = `<span class="lose">支払い失敗。</span> 家計が尽きました。最初からやり直そう。`;
  }
}

function spin() {
  if (state.spinning || state.gameOver || !els.choicePanel.classList.contains("hidden")) return;
  state.spinning = true;
  renderStatus();

  let ticks = 0;
  const timer = setInterval(() => {
    const preview = drawSpin().map((symbol) => ({ symbol, value: symbol.base }));
    renderSlots(preview);
    ticks += 1;
    if (ticks < 10) return;

    clearInterval(timer);
    const scored = scoreSpin(drawSpin());
    const income = scored.reduce((sum, entry) => sum + entry.value, 0);
    state.money += income;
    state.turn += 1;
    state.spinning = false;
    renderSlots(scored);
    els.turnSummary.textContent = `${income} コイン獲得。シンボルを1つ選んで家族を増やそう。`;
    resolveRentIfNeeded();
    if (!state.gameOver) showChoices();
    renderStatus();
  }, 70);
}

function reset() {
  state.money = 10;
  state.rent = 25;
  state.rentDue = 5;
  state.turn = 1;
  state.deck = [...START_DECK];
  state.spinning = false;
  state.gameOver = false;
  els.choicePanel.classList.add("hidden");
  els.turnSummary.textContent = "スピンして今月の収入を作ろう。";
  renderSlots();
  renderStatus();
}

els.spinButton.addEventListener("click", spin);
els.resetButton.addEventListener("click", reset);

reset();
