import {
  VARIANTS,
  analyzeBets,
  coveredNumbers,
  exposureOnNumber,
  getBetCatalog,
  getInsideBets,
  getNumberColor,
  getOutsideBets,
  getStraightBets,
  makeTicket,
  simulateBets,
} from "./math.js";

const euro = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentage = new Intl.NumberFormat("it-IT", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dom = {
  chipInput: document.querySelector("#chip-input"),
  budgetInput: document.querySelector("#budget-input"),
  spinsInput: document.querySelector("#spins-input"),
  variantNote: document.querySelector("#variant-note"),
  chipValueLabel: document.querySelector("#chip-value-label"),
  quickBets: document.querySelector("#quick-bets"),
  insideBetSelect: document.querySelector("#inside-bet-select"),
  addInsideBet: document.querySelector("#add-inside-bet"),
  rouletteBoard: document.querySelector("#roulette-board"),
  ticketList: document.querySelector("#ticket-list"),
  undoBet: document.querySelector("#undo-bet"),
  clearBets: document.querySelector("#clear-bets"),
  totalStake: document.querySelector("#total-stake"),
  metricsGrid: document.querySelector("#metrics-grid"),
  riskMessage: document.querySelector("#risk-message"),
  edgeBadge: document.querySelector("#edge-badge"),
  actionHelp: document.querySelector("#action-help"),
  showTicket: document.querySelector("#show-ticket"),
  simulateButton: document.querySelector("#simulate-button"),
  simulationResult: document.querySelector("#simulation-result"),
  visualOutput: document.querySelector("#visual-output"),
  visualOutputTitle: document.querySelector("#visual-output-title"),
  ticketVisual: document.querySelector("#ticket-visual"),
  downloadSvg: document.querySelector("#download-svg"),
  downloadPng: document.querySelector("#download-png"),
  closeVisual: document.querySelector("#close-visual"),
  appStatus: document.querySelector("#app-status"),
};

const STORAGE_KEY = "roulette-chiara-v1";
const numberRows = [
  Array.from({ length: 12 }, (_, index) => 3 + index * 3),
  Array.from({ length: 12 }, (_, index) => 2 + index * 3),
  Array.from({ length: 12 }, (_, index) => 1 + index * 3),
];

const defaults = {
  variantId: "european",
  chip: 5,
  budget: 100,
  spins: 10,
  bets: [],
  visualShown: false,
  notice: "",
  simulation: null,
  undoSnapshot: null,
};

const state = restoreState();

function restoreState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!stored || typeof stored !== "object") return { ...defaults };
    const variantId = Object.hasOwn(VARIANTS, stored.variantId) ? stored.variantId : defaults.variantId;
    const catalog = new Map(getBetCatalog(variantId).map((entry) => [entry.id, entry]));
    const bets = Array.isArray(stored.bets)
      ? stored.bets.flatMap((entry) => {
        const baseBet = entry && catalog.get(entry.id);
        const stake = positiveNumber(entry?.stake, 0);
        return baseBet && stake > 0 ? [makeTicket(baseBet, stake)] : [];
      })
      : [];
    return {
      ...defaults,
      ...stored,
      variantId,
      chip: positiveNumber(stored.chip, defaults.chip),
      budget: positiveNumber(stored.budget, defaults.budget),
      spins: Math.max(1, Math.min(10000, Math.floor(positiveNumber(stored.spins, defaults.spins)))),
      bets,
      visualShown: false,
      notice: "",
      simulation: null,
      undoSnapshot: null,
    };
  } catch {
    return { ...defaults };
  }
}

function persistState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      variantId: state.variantId,
      chip: state.chip,
      budget: state.budget,
      spins: state.spins,
      bets: state.bets,
    }));
  } catch {
    // Il calcolatore deve funzionare anche se il browser blocca localStorage.
  }
}

function positiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function roundCurrency(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function cloneBets(bets) {
  return bets.map((entry) => ({ ...entry, numbers: [...entry.numbers] }));
}

function saveUndoSnapshot() {
  state.undoSnapshot = {
    variantId: state.variantId,
    bets: cloneBets(state.bets),
  };
}

function announce(message) {
  dom.appStatus.textContent = "";
  window.requestAnimationFrame(() => {
    dom.appStatus.textContent = message;
  });
}

function formatCurrency(value) {
  return euro.format(Number.isFinite(value) ? value : 0);
}

function formatSignedCurrency(value) {
  if (value > 0) return `+${formatCurrency(value)}`;
  if (value < 0) return `−${formatCurrency(Math.abs(value))}`;
  return formatCurrency(0);
}

function formatPercent(value) {
  return percentage.format(Number.isFinite(value) ? value : 0);
}

function getAnalysis() {
  return analyzeBets(state.bets, state.variantId);
}

function findBaseBet(id) {
  return getBetCatalog(state.variantId).find((entry) => entry.id === id);
}

function updateInputs() {
  dom.chipInput.value = state.chip;
  dom.budgetInput.value = state.budget;
  dom.spinsInput.value = state.spins;
  const activeVariant = document.querySelector(`input[name="variant"][value="${state.variantId}"]`);
  if (activeVariant) activeVariant.checked = true;
}

function renderAll({ syncInputs = true, focusSelector = "" } = {}) {
  if (syncInputs) updateInputs();
  renderVariantNote();
  renderQuickBets();
  renderInsideSelect();
  renderBoard();
  renderTicket();
  renderMetrics();
  renderActions();
  renderSimulation();
  dom.chipValueLabel.textContent = formatCurrency(state.chip);
  if (state.visualShown && state.bets.length > 0) renderVisual();
  if (focusSelector) {
    window.requestAnimationFrame(() => {
      document.querySelector(focusSelector)?.focus();
    });
  }
}

function renderActions() {
  const hasBets = state.bets.length > 0;
  dom.showTicket.disabled = !hasBets;
  dom.simulateButton.disabled = !hasBets;
  dom.actionHelp.textContent = hasBets
    ? "La scheda mostra la configurazione attuale; la simulazione è casuale e non predittiva."
    : "Aggiungi una puntata per creare una scheda o avviare una simulazione.";
}

function renderVariantNote() {
  if (state.variantId === "european") {
    dom.variantNote.innerHTML = "<strong>Roulette europea:</strong> 37 esiti possibili e margine standard del banco pari al <strong>2,70%</strong>.";
    return;
  }
  dom.variantNote.innerHTML = "<strong>Roulette americana:</strong> 38 esiti possibili e margine standard del banco pari al <strong>5,26%</strong>. La puntata Primi cinque arriva al 7,89%.";
}

function renderQuickBets() {
  const groups = [
    ["red", "black", "even", "odd", "low", "high"],
    ["dozen-1", "dozen-2", "dozen-3"],
    ["column-1", "column-2", "column-3"],
  ];
  const outsideBets = getOutsideBets();
  const lookup = new Map(outsideBets.map((entry) => [entry.id, entry]));

  dom.quickBets.innerHTML = groups.map((group) => `
    <div class="quick-bet-group">
      ${group.map((id) => {
        const current = lookup.get(id);
        return `<button type="button" class="quick-bet" data-bet-id="${current.id}">${current.label}</button>`;
      }).join("")}
    </div>
  `).join("");
}

function renderInsideSelect() {
  const remembered = dom.insideBetSelect.value;
  const options = getInsideBets(state.variantId);
  dom.insideBetSelect.innerHTML = [
    "<option value=\"\" disabled>Scegli split, strada, carré o sestina…</option>",
    ...options.map((entry) => `<option value="${entry.id}">${entry.label} · ${entry.payout}:1</option>`),
  ].join("");
  const stillExists = options.some((entry) => entry.id === remembered);
  dom.insideBetSelect.value = stillExists ? remembered : "";
  dom.addInsideBet.disabled = !dom.insideBetSelect.value;
}

function renderBoard() {
  const selectedNumbers = coveredNumbers(state.bets);
  const directStakes = new Map();
  getStraightBets(state.variantId).forEach((entry) => {
    const amount = exposureOnNumber(state.bets, entry.numbers[0]);
    if (amount > 0) directStakes.set(entry.numbers[0], amount);
  });
  const variant = VARIANTS[state.variantId];
  const zeroMarkup = variant.zeroPockets.map((number) => numberButtonMarkup(number, selectedNumbers, directStakes)).join("");

  dom.rouletteBoard.innerHTML = `
    <div class="felt-table" role="group" aria-label="Tavolo ${variant.shortLabel} con puntate selezionabili">
      <div class="felt-caption"><span>Fai clic sulle caselle per aggiungere un pieno</span><span>payout indicato come profitto</span></div>
      <div class="number-area ${variant.zeroPockets.length === 2 ? "double-zero" : "single-zero"}">
        <div class="zero-area">${zeroMarkup}</div>
        <div class="number-grid">
          ${numberRows.flatMap((row) => row.map((number) => numberButtonMarkup(number, selectedNumbers, directStakes))).join("")}
        </div>
        <div class="column-area" role="group" aria-label="Puntate colonna">
          ${[3, 2, 1].map((column) => `<button class="column-cell" type="button" data-bet-id="column-${column}" aria-label="Aggiungi colonna ${column}">2:1</button>`).join("")}
        </div>
      </div>
      <div class="outside-table" role="group" aria-label="Puntate esterne sul tavolo">
        <button type="button" data-bet-id="low">1–18</button>
        <button type="button" data-bet-id="even">PARI</button>
        <button type="button" data-bet-id="red" class="red-outside">ROSSO</button>
        <button type="button" data-bet-id="black" class="black-outside">NERO</button>
        <button type="button" data-bet-id="odd">DISPARI</button>
        <button type="button" data-bet-id="high">19–36</button>
      </div>
    </div>
  `;
}

function numberButtonMarkup(number, selectedNumbers, directStakes) {
  const key = String(number);
  const color = getNumberColor(key);
  const selected = selectedNumbers.has(key);
  const directStake = directStakes.get(key);
  const directStakeLabel = directStake ? ` Totale sul pieno: ${formatCurrency(directStake)}.` : "";
  return `
    <button
      class="number-cell ${color} ${selected ? "covered" : ""}"
      type="button"
      data-straight-number="${key}"
      aria-label="Aggiungi ${formatCurrency(state.chip)} al pieno sul numero ${key}.${directStakeLabel}"
    >
      <span>${key}</span>
      ${directStake ? `<em>${formatCurrency(directStake)}</em>` : ""}
    </button>
  `;
}

function renderTicket() {
  dom.undoBet.disabled = !state.undoSnapshot;
  dom.clearBets.disabled = state.bets.length === 0;
  if (state.bets.length === 0) {
    dom.ticketList.innerHTML = `
      <div class="empty-ticket">
        <span aria-hidden="true">◎</span>
        <p>Nessuna fiche sul tavolo.<br />Inizia da un numero o da una puntata esterna.</p>
      </div>
    `;
    dom.totalStake.textContent = formatCurrency(0);
    return;
  }

  dom.ticketList.innerHTML = `<ul>${state.bets.map((entry) => `
    <li class="ticket-row">
      <div class="ticket-name">
        <strong>${escapeHtml(entry.label)}</strong>
        <span>${entry.numbers.join(", ")} · ${entry.payout}:1</span>
      </div>
      <div class="ticket-controls">
        <button class="mini-button" type="button" data-adjust-id="${entry.id}" data-adjust="-1" aria-label="Riduci ${escapeAttribute(entry.label)}">−</button>
        <span>${formatCurrency(entry.stake)}</span>
        <button class="mini-button" type="button" data-adjust-id="${entry.id}" data-adjust="1" aria-label="Aumenta ${escapeAttribute(entry.label)}">+</button>
        <button class="remove-button" type="button" data-remove-id="${entry.id}" aria-label="Rimuovi ${escapeAttribute(entry.label)}">×</button>
      </div>
    </li>
  `).join("")}</ul>`;

  dom.totalStake.textContent = formatCurrency(getAnalysis().totalStake);
}

function renderMetrics() {
  const analysis = getAnalysis();
  const hasBets = state.bets.length > 0;
  const sessionExpectedLoss = analysis.expectedLoss * state.spins;
  const metrics = hasBets
    ? [
      ["Copertura", formatPercent(analysis.hitProbability), "almeno una fiche vincente"],
      ["Probabilità di utile", formatPercent(analysis.profitProbability), "esiti con profitto netto"],
      ["Vincita massima", formatCurrency(analysis.maxProfit), "in un singolo giro"],
      ["Perdita massima", formatCurrency(analysis.maxLoss), "in un singolo giro"],
      ["Valore atteso", formatSignedCurrency(analysis.expectedNet), "per giro"],
      ["Perdita attesa", formatCurrency(sessionExpectedLoss), `su ${state.spins.toLocaleString("it-IT")} giri`],
    ]
    : [
      ["Copertura", "—", "aggiungi una puntata"],
      ["Utile netto", "—", "nessuna puntata"],
      ["Vincita massima", "—", "nessuna puntata"],
      ["Perdita massima", "—", "nessuna puntata"],
      ["Valore atteso", "—", "nessuna puntata"],
      ["Perdita attesa", "—", "nessuna puntata"],
    ];

  dom.metricsGrid.innerHTML = metrics.map(([label, value, caption], index) => `
    <div class="metric ${index === 4 && hasBets ? "expected-value" : ""}">
      <span>${label}</span>
      <strong>${value}</strong>
      <small>${caption}</small>
    </div>
  `).join("");

  dom.edgeBadge.textContent = hasBets ? `Margine ${formatPercent(analysis.houseEdge)}` : "—";
  renderRiskMessage(analysis);
}

function renderRiskMessage(analysis) {
  const budget = positiveNumber(state.budget, defaults.budget);
  const exposureRatio = analysis.totalStake / budget;
  dom.riskMessage.className = "risk-message";

  if (state.notice) {
    dom.riskMessage.classList.add("notice");
    dom.riskMessage.textContent = state.notice;
    return;
  }

  if (state.bets.length === 0) {
    dom.riskMessage.textContent = "Il calcolatore non suggerisce una puntata: prima di tutto mostra numeri e rischio.";
    return;
  }

  if (analysis.totalStake > budget) {
    dom.riskMessage.classList.add("warning");
    dom.riskMessage.textContent = `Attenzione: l'esposizione di ${formatCurrency(analysis.totalStake)} supera il budget impostato di ${formatCurrency(budget)}.`;
    return;
  }

  if (exposureRatio > 0.25) {
    dom.riskMessage.classList.add("warning");
    dom.riskMessage.textContent = `Esposizione elevata: una singola perdita massima può usare il ${formatPercent(analysis.maxLoss / budget)} del budget.`;
    return;
  }

  const suggestedUnit = Math.max(0, Math.min(state.chip, budget * 0.02));
  dom.riskMessage.textContent = `Esposizione: ${formatPercent(exposureRatio)} del budget. L'opzione più sicura resta non puntare; se scegli di farlo, un limite prudente è non superare ${formatCurrency(suggestedUnit)} per unità.`;
}

function renderSimulation() {
  if (!state.simulation) {
    dom.simulationResult.textContent = "";
    return;
  }
  const current = state.simulation;
  dom.simulationResult.innerHTML = `
    <strong>Simulazione didattica · ${current.spins.toLocaleString("it-IT")} giri</strong>
    <span>Risultato simulato: ${formatSignedCurrency(current.totalNet)} · utile netto osservato: ${formatPercent(current.profitRate)}</span>
  `;
}

function addBet(baseBet, focusSelector = "") {
  if (!baseBet) return;
  saveUndoSnapshot();
  const existing = state.bets.find((entry) => entry.id === baseBet.id);
  if (existing) {
    existing.stake = roundCurrency(existing.stake + state.chip);
  } else {
    state.bets.push(makeTicket(baseBet, state.chip));
  }
  state.notice = "";
  state.simulation = null;
  persistState();
  renderAll({ focusSelector });
  announce(`${baseBet.label} aggiunta. Esposizione per giro: ${formatCurrency(getAnalysis().totalStake)}.`);
}

function adjustBet(id, direction, focusSelector = "") {
  const current = state.bets.find((entry) => entry.id === id);
  if (!current) return;
  saveUndoSnapshot();
  const label = current.label;
  const nextAmount = roundCurrency(current.stake + state.chip * direction);
  if (nextAmount <= 0) {
    state.bets = state.bets.filter((entry) => entry.id !== id);
  } else {
    current.stake = nextAmount;
  }
  state.notice = "";
  state.simulation = null;
  persistState();
  const nextFocus = nextAmount <= 0 ? "#undo-bet" : focusSelector;
  renderAll({ focusSelector: nextFocus });
  announce(nextAmount <= 0
    ? `${label} rimossa dalla giocata.`
    : `${label} aggiornata a ${formatCurrency(nextAmount)}.`);
}

function removeBet(id) {
  const current = state.bets.find((entry) => entry.id === id);
  if (!current) return;
  saveUndoSnapshot();
  state.bets = state.bets.filter((entry) => entry.id !== id);
  state.notice = "";
  state.simulation = null;
  persistState();
  renderAll({ focusSelector: "#undo-bet" });
  announce(`${current.label} rimossa dalla giocata.`);
}

function clearBets() {
  if (state.bets.length === 0) return;
  saveUndoSnapshot();
  state.bets = [];
  state.visualShown = false;
  state.notice = "Tavolo azzerato. Non hai alcun obbligo di aggiungere una nuova puntata.";
  state.simulation = null;
  persistState();
  dom.visualOutput.hidden = true;
  renderAll({ focusSelector: "#undo-bet" });
  announce("Tavolo azzerato. Puoi annullare l'ultima azione se è stato un errore.");
}

function changeVariant(variantId) {
  if (variantId === state.variantId) return;
  saveUndoSnapshot();
  const catalog = new Map(getBetCatalog(variantId).map((entry) => [entry.id, entry]));
  const nextPockets = new Set(VARIANTS[variantId].pockets.map(String));
  const retainedBets = state.bets.flatMap((entry) => {
    const compatible = catalog.get(entry.id);
    const coversOnlyValidPockets = entry.numbers.every((number) => nextPockets.has(String(number)));
    return compatible && coversOnlyValidPockets ? [makeTicket(compatible, entry.stake)] : [];
  });
  const droppedBets = state.bets.length - retainedBets.length;
  state.variantId = variantId;
  state.bets = retainedBets;
  state.visualShown = false;
  state.simulation = null;
  state.notice = droppedBets > 0
    ? `Variante cambiata: mantenute ${retainedBets.length} puntate compatibili e rimosse ${droppedBets} non disponibili con questo tavolo.`
    : "Variante cambiata: le puntate compatibili sono state mantenute e i calcoli sono stati aggiornati.";
  persistState();
  dom.visualOutput.hidden = true;
  renderAll({ focusSelector: `input[name="variant"][value="${variantId}"]` });
  announce(state.notice);
}

function undoLastAction() {
  const snapshot = state.undoSnapshot;
  if (!snapshot) return;
  state.variantId = snapshot.variantId;
  state.bets = cloneBets(snapshot.bets);
  state.undoSnapshot = null;
  state.visualShown = false;
  state.simulation = null;
  state.notice = "Ultima modifica annullata.";
  persistState();
  dom.visualOutput.hidden = true;
  renderAll({ focusSelector: "#undo-bet" });
  announce("Ultima modifica annullata.");
}

function buildTicketSvg(analysis) {
  const selected = coveredNumbers(state.bets);
  const directBets = new Map();
  state.bets.filter((entry) => entry.id.startsWith("straight-")).forEach((entry) => {
    directBets.set(entry.numbers[0], entry.stake);
  });

  const width = 1160;
  const height = 560;
  const cellWidth = 48;
  const cellHeight = 54;
  const boardX = 40;
  const boardY = 148;
  const zeroWidth = state.variantId === "american" ? 82 : 52;
  const gridX = boardX + zeroWidth;
  const boardBoxX = 25;
  const boardBoxWidth = gridX + cellWidth * 12 + 15 - boardBoxX;
  const detailsBoxX = boardBoxX + boardBoxWidth + 25;
  const detailsBoxWidth = width - detailsBoxX - 25;
  const detailsX = detailsBoxX + 18;

  const zeroCells = VARIANTS[state.variantId].zeroPockets.map((number, index, list) => {
    const cellHeightForZero = (cellHeight * 3) / list.length;
    const y = boardY + index * cellHeightForZero;
    return svgCell(number, boardX, y, zeroWidth, cellHeightForZero, selected, directBets);
  }).join("");

  const gridCells = numberRows.flatMap((row, rowIndex) => row.map((number, columnIndex) => svgCell(
    number,
    gridX + columnIndex * cellWidth,
    boardY + rowIndex * cellHeight,
    cellWidth,
    cellHeight,
    selected,
    directBets,
  ))).join("");

  const betList = state.bets.slice(0, 5).map((entry) => `${entry.label} · ${formatCurrency(entry.stake)}`);
  const remaining = state.bets.length - betList.length;
  if (remaining > 0) betList.push(`+ ${remaining} altre puntate`);
  const listMarkup = betList.map((label, index) => `<text x="${detailsX}" y="${224 + index * 29}" fill="#d7e6dd" font-size="17">${escapeXml(label)}</text>`).join("");

  const summary = [
    ["Copertura", formatPercent(analysis.hitProbability)],
    ["Utile netto", formatPercent(analysis.profitProbability)],
    ["EV / giro", formatSignedCurrency(analysis.expectedNet)],
    ["Perdita max", formatCurrency(analysis.maxLoss)],
  ];
  const summaryMarkup = summary.map(([label, value], index) => {
    const x = index % 2 === 0 ? 40 : 600;
    const y = 400 + Math.floor(index / 2) * 76;
    return `
      <text x="${x}" y="${y}" fill="#9fb9aa" font-size="14">${escapeXml(label.toUpperCase())}</text>
      <text x="${x}" y="${y + 28}" fill="#fffaf0" font-size="23" font-weight="700">${escapeXml(value)}</text>
    `;
  }).join("");

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Scheda visiva della puntata selezionata">
      <rect width="${width}" height="${height}" rx="28" fill="#10251f" />
      <path d="M0 85 H${width}" stroke="#315246" stroke-width="1" />
      <text x="40" y="52" fill="#f7d37b" font-size="26" font-family="system-ui, sans-serif" font-weight="700">ROULETTE CHIARA</text>
      <text x="40" y="76" fill="#b8cabf" font-size="16" font-family="system-ui, sans-serif">${escapeXml(VARIANTS[state.variantId].label)} · configurazione non predittiva</text>
      <text x="1120" y="53" text-anchor="end" fill="#fffaf0" font-size="20" font-family="system-ui, sans-serif" font-weight="700">${escapeXml(formatCurrency(analysis.totalStake))} / giro</text>
      <text x="1120" y="76" text-anchor="end" fill="#b8cabf" font-size="14" font-family="system-ui, sans-serif">esposizione selezionata</text>

      <rect x="${boardBoxX}" y="120" width="${boardBoxWidth}" height="220" rx="18" fill="#0a1b16" stroke="#345d4d" />
      <text x="40" y="133" fill="#9fb9aa" font-size="12" font-family="system-ui, sans-serif">TAVOLO · numeri coperti evidenziati</text>
      ${zeroCells}
      ${gridCells}

      <rect x="${detailsBoxX}" y="120" width="${detailsBoxWidth}" height="220" rx="18" fill="#15382e" stroke="#315e4c" />
      <text x="${detailsX}" y="160" fill="#f7d37b" font-size="15" font-family="system-ui, sans-serif" font-weight="700">FICHES NELLA CONFIGURAZIONE</text>
      ${listMarkup || `<text x="${detailsX}" y="224" fill="#d7e6dd" font-size="17">Nessuna puntata</text>`}

      <path d="M40 380 H1120" stroke="#315246" stroke-width="1" />
      ${summaryMarkup}
      <text x="40" y="525" fill="#9fb9aa" font-size="13" font-family="system-ui, sans-serif">Ogni giro è indipendente. Questa scheda non individua il prossimo numero.</text>
    </svg>
  `;
}

function svgCell(number, x, y, width, height, selected, directBets) {
  const key = String(number);
  const baseColor = {
    red: "#a92f35",
    black: "#17201d",
    green: "#146b4a",
  }[getNumberColor(key)];
  const isSelected = selected.has(key);
  const directStake = directBets.get(key);
  const textX = x + width / 2;
  const textY = y + height / 2 + 6;
  return `
    <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${baseColor}" stroke="${isSelected ? "#f7d37b" : "#4c6d60"}" stroke-width="${isSelected ? 3 : 1}" />
    <text x="${textX}" y="${textY}" text-anchor="middle" fill="#fffaf0" font-size="16" font-family="system-ui, sans-serif" font-weight="700">${key}</text>
    ${directStake ? `<circle cx="${x + width - 11}" cy="${y + 11}" r="9" fill="#f7d37b" /><text x="${x + width - 11}" y="${y + 14}" text-anchor="middle" fill="#10251f" font-size="8" font-family="system-ui, sans-serif" font-weight="800">€</text>` : ""}
  `;
}

function escapeXml(value) {
  return String(value).replace(/[<>&'\"]/g, (character) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    "\"": "&quot;",
  }[character]));
}

function escapeHtml(value) {
  return escapeXml(value);
}

function escapeAttribute(value) {
  return escapeXml(value);
}

function renderVisual() {
  const analysis = getAnalysis();
  dom.ticketVisual.innerHTML = buildTicketSvg(analysis);
}

function showVisual() {
  if (state.bets.length === 0) {
    state.notice = "Aggiungi almeno una fiche: la grafica descrive una configurazione, non suggerisce un numero.";
    renderMetrics();
    dom.chipInput.focus();
    return;
  }
  state.visualShown = true;
  dom.visualOutput.hidden = false;
  renderVisual();
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  dom.visualOutput.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  window.requestAnimationFrame(() => dom.visualOutputTitle.focus());
  announce("Scheda visiva generata. I numeri mostrati descrivono la configurazione selezionata.");
}

function serializeCurrentSvg() {
  const svg = dom.ticketVisual.querySelector("svg");
  return svg ? new XMLSerializer().serializeToString(svg) : null;
}

function triggerDownload(blob, filename) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename;
  link.href = objectUrl;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

function downloadSvg() {
  const serialized = serializeCurrentSvg();
  if (!serialized) return;
  triggerDownload(
    new Blob([serialized], { type: "image/svg+xml;charset=utf-8" }),
    `roulette-chiara-${state.variantId}.svg`,
  );
  announce("Scheda SVG scaricata.");
}

function downloadVisual() {
  const serialized = serializeCurrentSvg();
  if (!serialized) return;
  dom.downloadPng.disabled = true;
  const blob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const image = new Image();
  image.onload = () => {
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = 1160 * scale;
    canvas.height = 560 * scale;
    const context = canvas.getContext("2d");
    if (!context) {
      URL.revokeObjectURL(objectUrl);
      dom.downloadPng.disabled = false;
      announce("Il browser non riesce a creare il PNG. Puoi scaricare la versione SVG.");
      return;
    }
    if (typeof canvas.toBlob !== "function") {
      URL.revokeObjectURL(objectUrl);
      dom.downloadPng.disabled = false;
      announce("Il browser non riesce a creare il PNG. Puoi scaricare la versione SVG.");
      return;
    }
    context.scale(scale, scale);
    context.drawImage(image, 0, 0);
    URL.revokeObjectURL(objectUrl);
    canvas.toBlob((pngBlob) => {
      dom.downloadPng.disabled = false;
      if (!pngBlob) {
        announce("Il browser non riesce a creare il PNG. Puoi scaricare la versione SVG.");
        return;
      }
      triggerDownload(pngBlob, `roulette-chiara-${state.variantId}.png`);
      announce("Scheda PNG scaricata.");
    }, "image/png");
  };
  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    dom.downloadPng.disabled = false;
    announce("Esportazione PNG non riuscita. Puoi scaricare la versione SVG.");
  };
  image.src = objectUrl;
}

function simulate() {
  if (state.bets.length === 0) {
    state.notice = "Aggiungi una configurazione prima di simularla.";
    renderMetrics();
    return;
  }
  state.simulation = simulateBets(state.bets, state.variantId, 1000);
  renderSimulation();
  announce(`Simulazione di ${state.simulation.spins.toLocaleString("it-IT")} giri completata. Il risultato è casuale e non predittivo.`);
}

function readSetting(value, { min, max = Number.POSITIVE_INFINITY, integer = false }) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null;
  if (integer && !Number.isInteger(parsed)) return null;
  return integer ? parsed : roundCurrency(parsed);
}

function bindNumericInput(input, key, config) {
  input.addEventListener("input", () => {
    const value = readSetting(input.value, config);
    if (value === null) {
      input.setAttribute("aria-invalid", "true");
      return;
    }
    input.removeAttribute("aria-invalid");
    state[key] = value;
    state.notice = "";
    state.simulation = null;
    persistState();
    renderAll({ syncInputs: false });
  });

  input.addEventListener("blur", () => {
    const value = readSetting(input.value, config);
    if (value !== null) return;
    input.value = state[key];
    input.removeAttribute("aria-invalid");
    announce(`${config.label}: inserisci un valore valido.`);
  });
}

function bindEvents() {
  document.querySelectorAll("input[name=variant]").forEach((input) => {
    input.addEventListener("change", (event) => changeVariant(event.target.value));
  });

  bindNumericInput(dom.chipInput, "chip", { min: 0.1, max: 1000000, label: "Unità di puntata" });
  bindNumericInput(dom.budgetInput, "budget", { min: 1, max: 1000000000, label: "Budget di riferimento" });
  bindNumericInput(dom.spinsInput, "spins", { min: 1, max: 10000, integer: true, label: "Giri per perdita attesa" });

  dom.quickBets.addEventListener("click", (event) => {
    const button = event.target.closest("[data-bet-id]");
    if (button) addBet(findBaseBet(button.dataset.betId), `#quick-bets [data-bet-id="${button.dataset.betId}"]`);
  });

  dom.addInsideBet.addEventListener("click", () => {
    addBet(findBaseBet(dom.insideBetSelect.value), "#add-inside-bet");
  });
  dom.insideBetSelect.addEventListener("change", () => {
    dom.addInsideBet.disabled = !dom.insideBetSelect.value;
  });

  dom.rouletteBoard.addEventListener("click", (event) => {
    const directButton = event.target.closest("[data-straight-number]");
    if (directButton) {
      addBet(
        findBaseBet(`straight-${directButton.dataset.straightNumber}`),
        `#roulette-board [data-straight-number="${directButton.dataset.straightNumber}"]`,
      );
      return;
    }
    const externalButton = event.target.closest("[data-bet-id]");
    if (externalButton) {
      addBet(
        findBaseBet(externalButton.dataset.betId),
        `#roulette-board [data-bet-id="${externalButton.dataset.betId}"]`,
      );
    }
  });

  dom.ticketList.addEventListener("click", (event) => {
    const adjustButton = event.target.closest("[data-adjust-id]");
    if (adjustButton) {
      adjustBet(
        adjustButton.dataset.adjustId,
        Number(adjustButton.dataset.adjust),
        `#ticket-list [data-adjust-id="${adjustButton.dataset.adjustId}"][data-adjust="${adjustButton.dataset.adjust}"]`,
      );
      return;
    }
    const removeButton = event.target.closest("[data-remove-id]");
    if (removeButton) removeBet(removeButton.dataset.removeId);
  });

  dom.undoBet.addEventListener("click", undoLastAction);
  dom.clearBets.addEventListener("click", clearBets);
  dom.showTicket.addEventListener("click", showVisual);
  dom.simulateButton.addEventListener("click", simulate);
  dom.downloadSvg.addEventListener("click", downloadSvg);
  dom.downloadPng.addEventListener("click", downloadVisual);
  dom.closeVisual.addEventListener("click", () => {
    state.visualShown = false;
    dom.visualOutput.hidden = true;
    dom.showTicket.focus();
    announce("Scheda visiva chiusa.");
  });
}

bindEvents();
renderAll();
