"use strict";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const tokenBlueprints = [
  { ticker: "BARK", name: "Bark Protocol", icon: "B", narrative: "Dog meta returns wearing a tie", liquidity: "Locked", holders: 18, momentum: "Building", risk: 34, drift: .012, volatility: .055 },
  { ticker: "MUD", name: "Mud Money", icon: "M", narrative: "The official currency of bad decisions", liquidity: "Thin", holders: 31, momentum: "Hot", risk: 67, drift: .018, volatility: .09 },
  { ticker: "WIFHAT", name: "Hat With Hat", icon: "H", narrative: "A derivative of a derivative", liquidity: "Locked", holders: 14, momentum: "Viral", risk: 42, drift: .025, volatility: .075 },
  { ticker: "COPE", name: "Cope Industries", icon: "C", narrative: "Community-owned emotional infrastructure", liquidity: "Unlocked", holders: 39, momentum: "Fading", risk: 82, drift: -.006, volatility: .11 },
  { ticker: "BYTE", name: "Byte The Dip", icon: "8", narrative: "AI, gaming, and several other keywords", liquidity: "Locked", holders: 23, momentum: "Building", risk: 48, drift: .01, volatility: .06 },
  { ticker: "GOBLN", name: "Goblin Hours", icon: "G", narrative: "It only trades after midnight", liquidity: "Burned", holders: 12, momentum: "Hot", risk: 28, drift: .016, volatility: .05 },
  { ticker: "RUGU", name: "Rug University", icon: "R", narrative: "Tuition is paid in realized losses", liquidity: "Thin", holders: 47, momentum: "Viral", risk: 91, drift: .03, volatility: .14 },
  { ticker: "DUST", name: "Digital Dust", icon: "D", narrative: "Nothing but vibes and tiny decimals", liquidity: "Locked", holders: 20, momentum: "Flat", risk: 45, drift: .003, volatility: .04 },
  { ticker: "TRENCH", name: "Trench Tools", icon: "T", narrative: "Picks, shovels, and faster RPCs", liquidity: "Burned", holders: 9, momentum: "Building", risk: 21, drift: .014, volatility: .045 },
  { ticker: "NPC", name: "Non Player Coin", icon: "N", narrative: "The chart trades itself", liquidity: "Unlocked", holders: 34, momentum: "Fading", risk: 75, drift: -.01, volatility: .095 },
  { ticker: "MOGUL", name: "Basement Mogul", icon: "$", narrative: "Institutional-grade bedroom trading", liquidity: "Locked", holders: 16, momentum: "Hot", risk: 38, drift: .019, volatility: .065 },
  { ticker: "404", name: "Liquidity Not Found", icon: "?", narrative: "The warning is right in the name", liquidity: "Thin", holders: 55, momentum: "Viral", risk: 95, drift: .035, volatility: .16 }
];

const upgrades = [
  { id: "radar", name: "Rug Radar", cost: 18, skill: "alpha", description: "Makes the risk meter more honest and reveals dangerous contracts sooner." },
  { id: "holders", name: "Holder Map", cost: 28, skill: "alpha", description: "Shows exact top-holder concentration instead of a vague estimate." },
  { id: "rpc", name: "Faster RPC", cost: 36, skill: "execution", description: "Improves fills. You enter 2% lower and exit 2% higher." },
  { id: "discipline", name: "Exit Discipline", cost: 44, skill: "risk", description: "Softens the worst red candles when a position turns against you." },
  { id: "memes", name: "Meme Terminal", cost: 54, skill: "meme", description: "Improves narrative reads and adds a small reputation bonus to wins." },
  { id: "shield", name: "MEV Shield", cost: 70, skill: "execution", description: "Cuts execution drag again and rewards decisive exits." }
];

const ranks = [
  { min: 0, name: "Fresh Wallet" },
  { min: 35, name: "Dirt Digger" },
  { min: 90, name: "Trench Regular" },
  { min: 175, name: "Alpha Hunter" },
  { min: 290, name: "Trench Lord" }
];

const achievementDefinitions = [
  { id: "first_trade", mark: "01", name: "Skin in the Game", description: "Open your first position.", reward: 5, unlocked: () => Boolean(state.position) || state.history.length > 0 },
  { id: "green_close", mark: "+", name: "Green Is Green", description: "Close a profitable trade.", reward: 5, unlocked: () => state.wins >= 1 },
  { id: "double", mark: "2X", name: "Buried Treasure", description: "Close a trade above +50%.", reward: 8, unlocked: () => state.history.some((trade) => trade.returnPct >= 50) },
  { id: "halfway", mark: "50", name: "Still Digging", description: "Reach day 50 of a run.", reward: 8, unlocked: () => state.day >= 50 },
  { id: "toolbox", mark: "03", name: "Proper Equipment", description: "Install three upgrades.", reward: 10, unlocked: () => state.owned.length >= 3 },
  { id: "lord", mark: "99", name: "Trench Lord", description: "Earn the final career rank.", reward: 15, unlocked: () => getRank().name === "Trench Lord" }
];

const SAVE_KEY = "trencher-99-save-v2";

const state = {
  started: false,
  callsign: "FRESH WALLET",
  day: 1,
  cash: 2500,
  startingCash: 2500,
  reputation: 0,
  lifetimeRep: 0,
  wins: 0,
  losses: 0,
  size: .25,
  token: null,
  position: null,
  history: [],
  feed: [],
  achievements: [],
  skills: { alpha: 1, execution: 1, risk: 1, meme: 1 },
  owned: [],
  sound: true,
  timer: null,
  tick: 0
};

const ui = {
  boot: $("#bootScreen"), shell: $("#gameShell"), chart: $("#priceChart"),
  result: $("#resultDialog"), end: $("#endDialog"), toast: $("#toast")
};

function money(value, digits = 2) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}

function signedMoney(value) {
  return `${value >= 0 ? "+" : "-"}${money(Math.abs(value))}`;
}

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function random(min, max) { return Math.random() * (max - min) + min; }

function beep(note = 220, duration = .05, volume = .025) {
  if (!state.sound || !window.AudioContext) return;
  const context = beep.context || (beep.context = new AudioContext());
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "square";
  oscillator.frequency.value = note;
  gain.gain.setValueAtTime(volume, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + duration);
}

function makeToken() {
  const base = tokenBlueprints[Math.floor(Math.random() * tokenBlueprints.length)];
  const price = Number(random(.0012, .018).toFixed(6));
  const riskVariance = random(-7, 7) - state.skills.alpha * .5;
  const token = {
    ...base,
    price,
    launchPrice: price,
    risk: clamp(Math.round(base.risk + riskVariance), 8, 98),
    holders: clamp(base.holders + Math.round(random(-3, 4)), 7, 61),
    drift: base.drift + random(-.006, .006),
    prices: [],
    rugged: false,
    age: 0
  };
  token.prices = Array.from({ length: 24 }, (_, index) => price * (1 + Math.sin(index / 3) * .015 + random(-.018, .018)));
  return token;
}

function startGame(name) {
  Object.assign(state, {
    callsign: (name || "Fresh Wallet").toUpperCase(),
    started: true, day: 1, cash: 2500, reputation: 0, lifetimeRep: 0,
    wins: 0, losses: 0, token: makeToken(), position: null,
    history: [], feed: [], owned: [], achievements: [], tick: 0
  });
  state.skills = { alpha: 1, execution: 1, risk: 1, meme: 1 };
  $("#operatorName").textContent = state.callsign;
  ui.boot.hidden = true;
  ui.shell.hidden = false;
  seedFeed();
  renderAll();
  clearInterval(state.timer);
  state.timer = setInterval(marketTick, 1150);
  saveGame();
  beep(180, .08, .04);
  setTimeout(() => beep(260, .12, .035), 90);
}

function seedFeed() {
  state.feed = [];
  addFeed(`$${state.token.ticker} launched: ${state.token.narrative}.`, "neutral");
  addFeed(state.token.liquidity === "Locked" ? "Liquidity lock verified by a bot with no profile picture." : "Liquidity conditions deserve a second look.", state.token.liquidity === "Locked" ? "good" : "bad");
  addFeed(state.token.holders > 35 ? "Top wallets are uncomfortably cozy." : "Holder distribution looks survivable.", state.token.holders > 35 ? "bad" : "good");
}

function addFeed(message, tone = "neutral") {
  state.feed.unshift({ message, tone, time: `D${String(state.day).padStart(2, "0")} · ${String(9 + (state.tick % 12)).padStart(2, "0")}:${String((state.tick * 7) % 60).padStart(2, "0")}` });
  state.feed = state.feed.slice(0, 7);
  renderFeed();
}

function marketTick() {
  if (!state.started || !state.token || ui.result.open || ui.end.open) return;
  state.tick += 1;
  const token = state.token;
  token.age += 1;

  let move = token.drift + random(-token.volatility, token.volatility);
  if (state.position && state.owned.includes("discipline") && move < -.065) move *= .82;

  const rugWindow = token.age > 5 && !token.rugged && token.risk > 65;
  const rugChance = (token.risk - 55) / 1250;
  if (rugWindow && Math.random() < rugChance) {
    token.rugged = true;
    move = -random(.48, .78);
    token.drift = -.025;
    addFeed("Liquidity just moved. The chart has chosen violence.", "bad");
    $("#chartStatus").textContent = "RUG EVENT DETECTED";
    beep(92, .34, .06);
  } else if (state.tick % 5 === 0) {
    triggerEvent();
  }

  token.price = Math.max(.000001, token.price * (1 + move));
  token.prices.push(token.price);
  if (token.prices.length > 54) token.prices.shift();
  renderMarket();
  renderAccount();
  drawChart();
  if (state.tick % 5 === 0) saveGame();
}

function triggerEvent() {
  const token = state.token;
  const positive = Math.random() > (token.risk / 130);
  const goodEvents = [
    "A whale entered with the confidence of someone using someone else's money.",
    `The ${token.narrative.toLowerCase()} narrative is spreading across the timeline.`,
    "Volume just woke up. Nobody knows why, which is considered bullish.",
    "The community changed the profile picture. Engagement is up."
  ];
  const badEvents = [
    "A dev wallet blinked. The trench noticed.",
    "Early wallets are trimming positions with suspicious coordination.",
    "The influencer who called this has quietly deleted the post.",
    "Buy volume is thinning while the group chat gets louder."
  ];
  if (positive) {
    token.drift += .003;
    addFeed(goodEvents[Math.floor(Math.random() * goodEvents.length)], "good");
  } else {
    token.drift -= .004;
    addFeed(badEvents[Math.floor(Math.random() * badEvents.length)], "bad");
  }
}

function enterTrade() {
  if (state.position) return;
  const amount = state.cash * state.size;
  if (amount < 1) return showToast("Not enough dry powder for that position.");
  const fillBoost = state.owned.includes("shield") ? .97 : state.owned.includes("rpc") ? .98 : 1;
  const entryPrice = state.token.price * fillBoost;
  state.cash -= amount;
  state.position = {
    ticker: state.token.ticker,
    name: state.token.name,
    units: amount / entryPrice,
    entryPrice,
    initialInvestment: amount,
    realized: 0,
    entryDay: state.day
  };
  addFeed(`Position opened: ${Math.round(state.size * 100)}% size. Conviction is now measurable.`, "neutral");
  $("#chartStatus").textContent = "POSITION LIVE";
  beep(360, .07, .035);
  checkAchievements();
  renderAll();
  saveGame();
}

function sellFraction(fraction) {
  if (!state.position) return;
  if (fraction >= .999) return closeTrade();
  const units = state.position.units * fraction;
  const exitBoost = state.owned.includes("shield") ? 1.03 : state.owned.includes("rpc") ? 1.02 : 1;
  const proceeds = units * state.token.price * exitBoost;
  state.position.units -= units;
  state.position.realized += proceeds;
  state.cash += proceeds;
  addFeed(`Scaled out 25%. The timeline calls this cowardice; the ledger calls it cash.`, "good");
  beep(290, .05, .03);
  renderAll();
  saveGame();
}

function closeTrade() {
  if (!state.position) return;
  const position = state.position;
  const exitBoost = state.owned.includes("shield") ? 1.03 : state.owned.includes("rpc") ? 1.02 : 1;
  const proceeds = position.units * state.token.price * exitBoost;
  state.cash += proceeds;
  const totalReturned = position.realized + proceeds;
  const profit = totalReturned - position.initialInvestment;
  const returnPct = profit / position.initialInvestment * 100;
  const won = profit >= 0;
  const memeBonus = won && state.owned.includes("memes") ? 4 : 0;
  const repGain = won ? clamp(Math.round(8 + returnPct / 5) + memeBonus, 5, 34) : 3;

  state.reputation += repGain;
  state.lifetimeRep += repGain;
  state.wins += won ? 1 : 0;
  state.losses += won ? 0 : 1;
  state.skills.risk = clamp(state.skills.risk + (won ? 1 : .5), 1, 10);
  state.skills.execution = clamp(state.skills.execution + (Math.abs(returnPct) > 15 ? .7 : .35), 1, 10);
  state.history.unshift({ day: state.day, ticker: position.ticker, profit, returnPct, rep: repGain });
  state.position = null;
  advanceDays(Math.floor(random(3, 7)));
  checkAchievements();

  $("#resultKicker").textContent = won ? `+${repGain} trench rep` : `Lesson acquired · +${repGain} rep`;
  $("#resultTitle").textContent = getResultTitle(returnPct);
  $("#resultNumber").textContent = signedMoney(profit);
  $("#resultNumber").className = `result-number ${won ? "positive" : "negative"}`;
  $("#resultCopy").textContent = getResultCopy(returnPct);
  $("#nextPairButton").innerHTML = state.day >= 99 ? "View 99 day report <span aria-hidden=\"true\">→</span>" : "Scan next pair <span aria-hidden=\"true\">→</span>";
  renderAll();
  saveGame();
  ui.result.showModal();
  beep(won ? 480 : 120, won ? .09 : .18, .045);
}

function getResultTitle(percent) {
  if (percent > 80) return "Buried treasure.";
  if (percent > 20) return "Clean extraction.";
  if (percent >= 0) return "Profit is profit.";
  if (percent > -25) return "Tuition paid.";
  return "The trench collects.";
}

function getResultCopy(percent) {
  if (percent > 80) return "You found the signal before the crowd found the ticker.";
  if (percent > 20) return "A disciplined exit. Your group chat will insist it could have gone higher.";
  if (percent >= 0) return "Nobody went broke taking profit. Plenty got bored, though.";
  if (percent > -25) return "Small losses are risk management wearing an unpleasant outfit.";
  return "The lesson was expensive, memorable, and technically still content.";
}

function scanNext(skipped = false) {
  if (state.position) return;
  if (skipped) {
    advanceDays(2);
    state.skills.alpha = clamp(state.skills.alpha + .15, 1, 10);
  }
  if (state.day >= 99) return endRun();
  state.token = makeToken();
  state.tick = 0;
  seedFeed();
  $("#chartStatus").textContent = "WATCHING LAUNCH...";
  renderAll();
  checkAchievements();
  saveGame();
  beep(210, .05, .025);
}

function advanceDays(amount) {
  state.day = Math.min(99, state.day + amount);
}

function buyUpgrade(id) {
  const upgrade = upgrades.find((item) => item.id === id);
  if (!upgrade || state.owned.includes(id) || state.reputation < upgrade.cost) return;
  state.reputation -= upgrade.cost;
  state.owned.push(id);
  state.skills[upgrade.skill] = clamp(state.skills[upgrade.skill] + 1.5, 1, 10);
  checkAchievements();
  addFeed(`${upgrade.name} installed. The terminal feels 12% more expensive.`, "good");
  renderAll();
  renderUpgrades();
  showToast(`${upgrade.name} installed.`);
  beep(520, .08, .035);
  saveGame();
}

function endRun() {
  if (ui.result.open) ui.result.close();
  const portfolio = getPortfolioValue();
  const pnl = portfolio - state.startingCash;
  const totalTrades = state.wins + state.losses;
  const winRate = totalTrades ? Math.round(state.wins / totalTrades * 100) : 0;
  checkAchievements();
  $("#endTitle").textContent = portfolio >= 5000 ? "The trench remembers your name." : portfolio >= 2500 ? "You survived the trenches." : "You escaped with a pulse.";
  $("#endPortfolio").textContent = money(portfolio, 0);
  $("#endPortfolio").className = `result-number ${pnl >= 0 ? "positive" : "negative"}`;
  $("#endStats").innerHTML = `
    <div><small>Run P&amp;L</small><strong class="${pnl >= 0 ? "positive" : "negative"}">${signedMoney(pnl)}</strong></div>
    <div><small>Win rate</small><strong>${winRate}%</strong></div>
    <div><small>Final rank</small><strong>${getRank().name}</strong></div>`;
  $("#endCopy").textContent = totalTrades ? `${totalTrades} calls, ${state.wins} clean exits, and at least one story you will tell as if it was intentional.` : "You spent 99 days observing the market. Unusually responsible behavior.";
  ui.end.showModal();
}

function getPortfolioValue() {
  return state.cash + (state.position ? state.position.units * state.token.price : 0);
}

function getRank() {
  return [...ranks].reverse().find((rank) => state.lifetimeRep >= rank.min) || ranks[0];
}

function getRankLevel() {
  return ranks.findIndex((rank) => rank.name === getRank().name) + 1;
}

function renderAll() {
  if (!state.token) return;
  renderMarket();
  renderAccount();
  renderOperator();
  renderFeed();
  renderJournal();
  renderUpgrades();
  renderAchievements();
  drawChart();
}

function renderMarket() {
  const token = state.token;
  const change = (token.price / token.launchPrice - 1) * 100;
  $("#tokenTicker").textContent = `$${token.ticker}`;
  $("#tokenName").textContent = token.name;
  $("#tokenIcon").textContent = token.icon;
  $("#priceText").textContent = token.price < .01 ? money(token.price, 6) : money(token.price, 4);
  $("#changeText").textContent = `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;
  $("#changeText").className = change >= 0 ? "positive" : "negative";
  $("#liquiditySignal").textContent = token.liquidity;
  $("#holderSignal").textContent = state.owned.includes("holders") ? `${token.holders}% exact` : token.holders > 38 ? "Concentrated" : token.holders > 24 ? "Mixed" : "Distributed";
  $("#momentumSignal").textContent = token.momentum;
  $("#narrativeText").textContent = token.narrative;

  const shownRisk = state.owned.includes("radar") ? token.risk : Math.round(token.risk / 20) * 20;
  $("#riskMeter").style.width = `${shownRisk}%`;
  $("#riskMeter").style.background = shownRisk > 70 ? "var(--red)" : shownRisk > 42 ? "var(--yellow)" : "var(--green)";
  $("#riskLabel").textContent = `${shownRisk > 70 ? "High" : shownRisk > 42 ? "Medium" : "Low"} risk${state.owned.includes("radar") ? ` · ${token.risk}%` : ""}`;
  $("#riskLabel").className = shownRisk > 70 ? "negative" : shownRisk < 40 ? "positive" : "";
  $("#riskCopy").textContent = riskDescription(token);

  const holding = Boolean(state.position);
  $("#sizingControls").hidden = holding;
  $("#entryActions").hidden = holding;
  $("#exitActions").hidden = !holding;
  $("#pnlFloat").hidden = !holding;
  if (holding) {
    const openValue = state.position.units * token.price;
    const basisLeft = state.position.initialInvestment * (state.position.units / (state.position.initialInvestment / state.position.entryPrice));
    const openPnl = openValue - basisLeft;
    $("#pnlText").textContent = signedMoney(openPnl);
    $("#pnlText").className = openPnl >= 0 ? "positive" : "negative";
    $("#positionDetail").textContent = `${money(openValue, 0)} LIVE`;
  } else {
    $("#positionDetail").textContent = "NO POSITION";
  }
}

function riskDescription(token) {
  if (token.rugged) return "The warning is no longer theoretical.";
  if (state.owned.includes("radar") && token.risk > 70) return "Multiple exit-liquidity patterns detected. Keep one hand on sell.";
  if (token.risk > 70) return "Something is off. The contract is smiling too hard.";
  if (token.risk > 42) return "Contract looks ordinary. In this market, that is not a compliment.";
  return "No obvious hazards. Hidden hazards remain emotionally available.";
}

function renderAccount() {
  const portfolio = getPortfolioValue();
  const pnl = portfolio - state.startingCash;
  $("#portfolioText").textContent = money(portfolio);
  $("#cashText").textContent = money(state.cash);
  $("#runPnlText").textContent = signedMoney(pnl);
  $("#runPnlText").className = pnl >= 0 ? "positive" : "negative";
  $("#recordText").textContent = `${state.wins}W / ${state.losses}L`;
  $("#dayText").textContent = `Day ${String(state.day).padStart(2, "0")} / 99`;
  $("#dayProgress").style.width = `${state.day / 99 * 100}%`;
  const mood = pnl > 1200 ? "euphoric" : pnl < -900 ? "cursed" : state.token.rugged ? "evacuating" : state.token.momentum.toLowerCase();
  $("#marketMood").textContent = `Market: ${mood}`;
  $("#marketTicker").textContent = state.feed[0]?.message || "New pairs spawning. Verify before you vibe.";
}

function renderOperator() {
  const rank = getRank();
  const level = getRankLevel();
  const nextRank = ranks[level] || ranks[ranks.length - 1];
  const previousMin = rank.min;
  const nextMin = nextRank.min === previousMin ? previousMin + 1 : nextRank.min;
  const progress = clamp((state.lifetimeRep - previousMin) / (nextMin - previousMin) * 100, 0, 100);
  $("#rankName").textContent = rank.name;
  $("#rankBadge").textContent = `LV. ${String(level).padStart(2, "0")}`;
  $("#reputationText").textContent = `${state.reputation} rep`;
  $("#rankProgress").style.width = `${progress}%`;
  ["alpha", "execution", "risk", "meme"].forEach((skill) => {
    const value = state.skills[skill];
    $(`#${skill}Value`).textContent = Math.floor(value);
    $(`#${skill}Bar`).style.width = `${value * 10}%`;
  });
  $("#journalCount").textContent = state.history.length;
  $("#upgradeCount").textContent = upgrades.filter((item) => !state.owned.includes(item.id) && state.reputation >= item.cost).length;
  $("#achievementCount").textContent = `${state.achievements.length}/${achievementDefinitions.length}`;
}

function renderFeed() {
  $("#feed").innerHTML = state.feed.map((item) => `<article class="feed-item ${item.tone}"><time>${item.time}</time><p>${item.message}</p></article>`).join("");
}

function renderUpgrades() {
  $("#upgradeGrid").innerHTML = upgrades.map((upgrade) => {
    const owned = state.owned.includes(upgrade.id);
    const affordable = state.reputation >= upgrade.cost;
    return `<article class="upgrade-card ${owned ? "owned" : ""}">
      <header><h3>${upgrade.name}</h3><span>${owned ? "INSTALLED" : `${upgrade.cost} REP`}</span></header>
      <p>${upgrade.description}</p>
      <button type="button" data-upgrade="${upgrade.id}" ${owned || !affordable ? "disabled" : ""}>${owned ? "Installed" : affordable ? "Install upgrade" : `Need ${upgrade.cost - state.reputation} rep`}</button>
    </article>`;
  }).join("");
  $$('[data-upgrade]').forEach((button) => button.addEventListener("click", () => buyUpgrade(button.dataset.upgrade)));
}

function renderJournal() {
  if (!state.history.length) {
    $("#journalList").innerHTML = `<p class="journal-empty">No closed trades yet. The cleanest journal is also the least interesting.</p>`;
    return;
  }
  $("#journalList").innerHTML = state.history.map((trade) => `<article class="journal-row">
    <small>DAY ${String(trade.day).padStart(2, "0")}</small><b>$${trade.ticker}</b>
    <span class="${trade.returnPct >= 0 ? "positive" : "negative"}">${trade.returnPct >= 0 ? "+" : ""}${trade.returnPct.toFixed(1)}%</span>
    <strong class="${trade.profit >= 0 ? "positive" : "negative"}">${signedMoney(trade.profit)}</strong>
  </article>`).join("");
}

function renderAchievements() {
  $("#achievementGrid").innerHTML = achievementDefinitions.map((achievement) => {
    const unlocked = state.achievements.includes(achievement.id);
    return `<article class="achievement-card ${unlocked ? "unlocked" : ""}">
      <span class="achievement-medal">${achievement.mark}</span>
      <h3>${achievement.name}</h3>
      <p>${achievement.description}</p>
      <small>${unlocked ? "Unlocked" : `Reward: +${achievement.reward} rep`}</small>
    </article>`;
  }).join("");
}

function checkAchievements() {
  let newest = null;
  achievementDefinitions.forEach((achievement) => {
    if (state.achievements.includes(achievement.id) || !achievement.unlocked()) return;
    state.achievements.push(achievement.id);
    state.reputation += achievement.reward;
    state.lifetimeRep += achievement.reward;
    newest = achievement;
  });
  if (newest) {
    showToast(`Achievement unlocked: ${newest.name} · +${newest.reward} rep`);
    beep(620, .12, .035);
  }
}

function saveGame() {
  if (!state.started || !state.token) return;
  try {
    const snapshot = {
      version: 2,
      callsign: state.callsign,
      day: state.day,
      cash: state.cash,
      reputation: state.reputation,
      lifetimeRep: state.lifetimeRep,
      wins: state.wins,
      losses: state.losses,
      size: state.size,
      token: state.token,
      position: state.position,
      history: state.history,
      feed: state.feed,
      skills: state.skills,
      owned: state.owned,
      achievements: state.achievements,
      sound: state.sound,
      tick: state.tick,
      savedAt: Date.now()
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot));
    const status = $("#saveStatus");
    status.textContent = "SAVED";
    status.classList.add("saved");
    clearTimeout(saveGame.statusTimer);
    saveGame.statusTimer = setTimeout(() => {
      status.textContent = "LOCAL SAVE";
      status.classList.remove("saved");
    }, 1100);
    updateResumeButton();
  } catch (error) {
    $("#saveStatus").textContent = "SAVE UNAVAILABLE";
  }
}

function getSavedGame() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    return saved?.version === 2 && saved.token ? saved : null;
  } catch (error) {
    return null;
  }
}

function updateResumeButton() {
  const saved = getSavedGame();
  $("#resumeButton").hidden = !saved;
  if (saved) $("#resumeButton").textContent = `Resume ${saved.callsign} · Day ${String(saved.day).padStart(2, "0")}`;
}

function resumeGame() {
  const saved = getSavedGame();
  if (!saved) return updateResumeButton();
  Object.assign(state, saved, { started: true, timer: null });
  state.achievements = saved.achievements || [];
  state.owned = saved.owned || [];
  state.history = saved.history || [];
  state.feed = saved.feed || [];
  $("#operatorName").textContent = state.callsign;
  $("#soundButton").textContent = `SFX: ${state.sound ? "ON" : "OFF"}`;
  $("#soundButton").setAttribute("aria-pressed", String(state.sound));
  ui.boot.hidden = true;
  ui.shell.hidden = false;
  renderAll();
  clearInterval(state.timer);
  state.timer = setInterval(marketTick, 1150);
  showToast(`Run restored at day ${state.day}.`);
}

function drawChart() {
  const canvas = ui.chart;
  const box = canvas.getBoundingClientRect();
  if (!box.width || !state.token) return;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(box.width * ratio);
  canvas.height = Math.round(box.height * ratio);
  const context = canvas.getContext("2d");
  context.scale(ratio, ratio);
  const width = box.width;
  const height = box.height;
  const padding = 18;
  const prices = state.token.prices;
  const min = Math.min(...prices) * .96;
  const max = Math.max(...prices) * 1.04;
  const range = max - min || 1;
  const points = prices.map((price, index) => ({
    x: padding + index / Math.max(1, prices.length - 1) * (width - padding * 2),
    y: padding + (max - price) / range * (height - padding * 2)
  }));
  const rising = prices[prices.length - 1] >= prices[0];
  const color = rising ? "#82d173" : "#ef765f";

  context.clearRect(0, 0, width, height);
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, rising ? "rgba(130,209,115,.26)" : "rgba(239,118,95,.24)");
  gradient.addColorStop(1, "rgba(13,15,12,0)");
  context.beginPath();
  points.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y));
  context.lineTo(points[points.length - 1].x, height - padding);
  context.lineTo(points[0].x, height - padding);
  context.closePath();
  context.fillStyle = gradient;
  context.fill();

  context.beginPath();
  points.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y));
  context.strokeStyle = color;
  context.lineWidth = 2;
  context.lineJoin = "bevel";
  context.stroke();

  const last = points[points.length - 1];
  context.fillStyle = color;
  context.fillRect(last.x - 3, last.y - 3, 6, 6);
  context.strokeStyle = color;
  context.globalAlpha = .28;
  context.setLineDash([4, 5]);
  context.beginPath();
  context.moveTo(padding, last.y);
  context.lineTo(width - padding, last.y);
  context.stroke();
  context.globalAlpha = 1;
}

let toastTimer;
function showToast(message) {
  ui.toast.textContent = message;
  ui.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ui.toast.classList.remove("show"), 2400);
}

$("#startForm").addEventListener("submit", (event) => {
  event.preventDefault();
  startGame($("#callsign").value.trim());
});

$("#resumeButton").addEventListener("click", resumeGame);

$$('[data-size]').forEach((button) => button.addEventListener("click", () => {
  state.size = Number(button.dataset.size);
  $$('[data-size]').forEach((item) => item.classList.toggle("active", item === button));
  beep(260, .03, .02);
}));

$("#buyButton").addEventListener("click", enterTrade);
$("#skipButton").addEventListener("click", () => scanNext(true));
$("#partialButton").addEventListener("click", () => sellFraction(.25));
$("#sellButton").addEventListener("click", closeTrade);
$("#nextPairButton").addEventListener("click", () => {
  ui.result.close();
  state.day >= 99 ? endRun() : scanNext(false);
});
$("#upgradeButton").addEventListener("click", () => $("#upgradeDialog").showModal());
$("#journalButton").addEventListener("click", () => $("#journalDialog").showModal());
$("#achievementButton").addEventListener("click", () => $("#achievementDialog").showModal());
$("#howButton").addEventListener("click", () => $("#howDialog").showModal());
$("#howButtonBoot").addEventListener("click", () => $("#howDialog").showModal());
$$('[data-close]').forEach((button) => button.addEventListener("click", () => $(`#${button.dataset.close}`).close()));

$("#soundButton").addEventListener("click", () => {
  state.sound = !state.sound;
  $("#soundButton").textContent = `SFX: ${state.sound ? "ON" : "OFF"}`;
  $("#soundButton").setAttribute("aria-pressed", String(state.sound));
  $("#soundButton").setAttribute("aria-label", state.sound ? "Mute sound" : "Enable sound");
  if (state.sound) beep(320, .05, .025);
});

$("#resetButton").addEventListener("click", () => {
  if (!confirm("Reset this 99 day run? Your current progress will be lost.")) return;
  clearInterval(state.timer);
  state.started = false;
  localStorage.removeItem(SAVE_KEY);
  ui.shell.hidden = true;
  ui.boot.hidden = false;
  updateResumeButton();
});

$("#playAgainButton").addEventListener("click", () => {
  ui.end.close();
  startGame($("#operatorName").textContent);
});

$(".brand").addEventListener("click", (event) => event.preventDefault());
window.addEventListener("resize", drawChart);
updateResumeButton();

document.addEventListener("keydown", (event) => {
  if (!state.started || event.target.matches("input") || $("dialog[open]")) return;
  if (event.key.toLowerCase() === "b" && !state.position) enterTrade();
  if (event.key.toLowerCase() === "s" && state.position) closeTrade();
});
