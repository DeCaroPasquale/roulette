/**
 * Motore matematico della roulette.
 * Tutti i payout sono espressi come profitto "a uno": un pieno da 1€
 * che vince a 35:1 produce +35€, non +36€.
 */

export const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18,
  19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

const numbers = Array.from({ length: 36 }, (_, index) => index + 1);

export const VARIANTS = {
  european: {
    id: "european",
    label: "Europea · 0",
    shortLabel: "Europea",
    pockets: ["0", ...numbers],
    zeroPockets: ["0"],
    standardHouseEdge: 1 / 37,
  },
  american: {
    id: "american",
    label: "Americana · 0 + 00",
    shortLabel: "Americana",
    pockets: ["0", "00", ...numbers],
    zeroPockets: ["0", "00"],
    standardHouseEdge: 2 / 38,
  },
};

export function getVariant(variantId) {
  return VARIANTS[variantId] ?? VARIANTS.european;
}

export function getNumberColor(number) {
  if (number === "0" || number === "00") return "green";
  return RED_NUMBERS.has(Number(number)) ? "red" : "black";
}

/**
 * Gruppi di esito mostrati nell'analisi del giro successivo. Sono eventi
 * disgiunti all'interno di ciascun gruppo e includono sempre lo zero.
 */
export const NEXT_SPIN_GROUPS = [
  { id: "color", label: "Colore", events: ["red", "black", "zero"] },
  { id: "parity", label: "Pari o dispari", events: ["even", "odd", "zero"] },
  { id: "range", label: "Fascia", events: ["low", "high", "zero"] },
];

const EVENT_LABELS = {
  red: "Rosso",
  black: "Nero",
  even: "Pari",
  odd: "Dispari",
  low: "1–18",
  high: "19–36",
};

export function isValidOutcome(outcome, variantId) {
  return getVariant(variantId).pockets.map(String).includes(String(outcome));
}

export function classifyOutcome(outcome) {
  const key = String(outcome);
  if (key === "0" || key === "00") {
    return {
      key,
      color: "zero",
      parity: "zero",
      range: "zero",
    };
  }

  const number = Number(key);
  if (!Number.isInteger(number) || number < 1 || number > 36) return null;
  return {
    key,
    color: getNumberColor(key),
    parity: number % 2 === 0 ? "even" : "odd",
    range: number <= 18 ? "low" : "high",
  };
}

export function getEventLabel(eventId, variantId) {
  if (eventId === "zero") {
    return getVariant(variantId).zeroPockets.length === 2 ? "0 / 00" : "0";
  }
  return EVENT_LABELS[eventId] ?? String(eventId);
}

export function isOutcomeInEvent(outcome, eventId) {
  const classified = classifyOutcome(outcome);
  if (!classified) return false;
  return classified.color === eventId
    || classified.parity === eventId
    || classified.range === eventId;
}

/**
 * Restituisce la probabilità teorica di un evento per un singolo giro.
 * Non accetta uno storico: in una roulette corretta il giro precedente non
 * modifica la distribuzione del giro successivo.
 */
export function getEventProbability(variantId, eventId) {
  const variant = getVariant(variantId);
  return variant.pockets.filter((outcome) => isOutcomeInEvent(outcome, eventId)).length / variant.pockets.length;
}

/**
 * Analisi condizionata solo nel linguaggio dell'interfaccia: previousOutcome
 * viene conservato per spiegare il caso scelto, ma non cambia i valori.
 */
export function getNextSpinAnalysis(variantId, previousOutcome = null) {
  const variant = getVariant(variantId);
  const validPreviousOutcome = isValidOutcome(previousOutcome, variant.id) ? String(previousOutcome) : null;
  const probabilities = Object.fromEntries(
    NEXT_SPIN_GROUPS.flatMap((group) => group.events).map((eventId) => [
      eventId,
      getEventProbability(variant.id, eventId),
    ]),
  );

  return {
    variant,
    previousOutcome: validPreviousOutcome,
    probabilities,
    independent: true,
  };
}

/**
 * Descrive uno storico come campione osservato. È volutamente distinto dalla
 * probabilità teorica: le oscillazioni del campione non sono una previsione.
 */
export function getTransitionSummary(history, variantId, fromEventId, toEventId) {
  const variant = getVariant(variantId);
  const outcomes = (Array.isArray(history) ? history : [])
    .map(String)
    .filter((outcome) => isValidOutcome(outcome, variant.id));
  let samples = 0;
  let matches = 0;

  for (let index = 0; index < outcomes.length - 1; index += 1) {
    if (!isOutcomeInEvent(outcomes[index], fromEventId)) continue;
    samples += 1;
    if (isOutcomeInEvent(outcomes[index + 1], toEventId)) matches += 1;
  }

  return {
    samples,
    matches,
    observedRate: samples > 0 ? matches / samples : null,
    theoreticalRate: getEventProbability(variant.id, toEventId),
  };
}

function bet(id, label, coveredNumbers, payout, group) {
  return {
    id,
    label,
    numbers: coveredNumbers.map(String),
    payout,
    group,
  };
}

export function getOutsideBets() {
  const red = numbers.filter((number) => RED_NUMBERS.has(number));
  const black = numbers.filter((number) => !RED_NUMBERS.has(number));

  return [
    bet("red", "Rosso", red, 1, "esterna"),
    bet("black", "Nero", black, 1, "esterna"),
    bet("even", "Pari", numbers.filter((number) => number % 2 === 0), 1, "esterna"),
    bet("odd", "Dispari", numbers.filter((number) => number % 2 !== 0), 1, "esterna"),
    bet("low", "1–18", numbers.filter((number) => number <= 18), 1, "esterna"),
    bet("high", "19–36", numbers.filter((number) => number >= 19), 1, "esterna"),
    bet("dozen-1", "1ª dozzina", numbers.filter((number) => number <= 12), 2, "esterna"),
    bet("dozen-2", "2ª dozzina", numbers.filter((number) => number >= 13 && number <= 24), 2, "esterna"),
    bet("dozen-3", "3ª dozzina", numbers.filter((number) => number >= 25), 2, "esterna"),
    bet("column-1", "Colonna 1", numbers.filter((number) => number % 3 === 1), 2, "esterna"),
    bet("column-2", "Colonna 2", numbers.filter((number) => number % 3 === 2), 2, "esterna"),
    bet("column-3", "Colonna 3", numbers.filter((number) => number % 3 === 0), 2, "esterna"),
  ];
}

export function getStraightBets(variantId) {
  const variant = getVariant(variantId);
  return variant.pockets.map((number) => bet(
    `straight-${number}`,
    `Pieno ${number}`,
    [number],
    35,
    "interna",
  ));
}

/**
 * Restituisce tutte le puntate interne comuni. I "pieni" sono restituiti a
 * parte, perché nel front-end vengono inseriti cliccando direttamente il tavolo.
 */
export function getInsideBets(variantId) {
  const insideBets = [];

  for (let streetStart = 1; streetStart <= 34; streetStart += 3) {
    insideBets.push(bet(
      `street-${streetStart}`,
      `Strada ${streetStart}–${streetStart + 2}`,
      [streetStart, streetStart + 1, streetStart + 2],
      11,
      "interna",
    ));
  }

  for (let streetStart = 1; streetStart <= 31; streetStart += 3) {
    insideBets.push(bet(
      `six-line-${streetStart}`,
      `Sestina ${streetStart}–${streetStart + 5}`,
      Array.from({ length: 6 }, (_, offset) => streetStart + offset),
      5,
      "interna",
    ));
  }

  for (let streetStart = 1; streetStart <= 34; streetStart += 3) {
    insideBets.push(bet(
      `split-h-${streetStart}`,
      `Split ${streetStart}/${streetStart + 1}`,
      [streetStart, streetStart + 1],
      17,
      "interna",
    ));
    insideBets.push(bet(
      `split-h-${streetStart + 1}`,
      `Split ${streetStart + 1}/${streetStart + 2}`,
      [streetStart + 1, streetStart + 2],
      17,
      "interna",
    ));
  }

  for (let number = 1; number <= 33; number += 1) {
    insideBets.push(bet(
      `split-v-${number}`,
      `Split ${number}/${number + 3}`,
      [number, number + 3],
      17,
      "interna",
    ));
  }

  for (let column = 0; column <= 10; column += 1) {
    for (const rowBase of [1, 2]) {
      const start = column * 3 + rowBase;
      insideBets.push(bet(
        `corner-${start}`,
        `Carré ${start}, ${start + 1}, ${start + 3}, ${start + 4}`,
        [start, start + 1, start + 3, start + 4],
        8,
        "interna",
      ));
    }
  }

  if (variantId === "american") {
    insideBets.unshift(
      bet("first-five", "Primi cinque 0–00–1–2–3", ["0", "00", 1, 2, 3], 6, "interna"),
      bet("basket-0-1-2", "Trio 0–1–2", ["0", 1, 2], 11, "interna"),
      bet("basket-0-2-3", "Trio 0–2–3", ["0", 2, 3], 11, "interna"),
      bet("basket-00-1-2", "Trio 00–1–2", ["00", 1, 2], 11, "interna"),
      bet("basket-00-2-3", "Trio 00–2–3", ["00", 2, 3], 11, "interna"),
    );
  } else {
    insideBets.unshift(
      bet("first-four", "Primi quattro 0–1–2–3", ["0", 1, 2, 3], 8, "interna"),
      bet("basket-0-1-2", "Trio 0–1–2", ["0", 1, 2], 11, "interna"),
      bet("basket-0-2-3", "Trio 0–2–3", ["0", 2, 3], 11, "interna"),
    );
  }

  return insideBets;
}

export function getBetCatalog(variantId) {
  return [
    ...getStraightBets(variantId),
    ...getOutsideBets(),
    ...getInsideBets(variantId),
  ];
}

export function makeTicket(baseBet, stake) {
  return {
    ...baseBet,
    numbers: baseBet.numbers.map(String),
    stake: Number(stake),
  };
}

export function getNetForOutcome(bets, outcome) {
  const outcomeKey = String(outcome);
  return bets.reduce((net, currentBet) => {
    const amount = Number(currentBet.stake) || 0;
    if (currentBet.numbers.map(String).includes(outcomeKey)) {
      return net + amount * currentBet.payout;
    }
    return net - amount;
  }, 0);
}

export function analyzeBets(bets, variantId) {
  const variant = getVariant(variantId);
  const validBets = bets.filter((currentBet) => Number(currentBet.stake) > 0);
  const totalStake = validBets.reduce((sum, currentBet) => sum + Number(currentBet.stake), 0);

  if (validBets.length === 0) {
    return {
      variant,
      totalStake: 0,
      outcomeDetails: [],
      coveredOutcomes: 0,
      hitProbability: 0,
      profitProbability: 0,
      breakEvenProbability: 0,
      expectedNet: 0,
      expectedLoss: 0,
      houseEdge: 0,
      maxProfit: 0,
      maxLoss: 0,
    };
  }

  const outcomeDetails = variant.pockets.map((outcome) => {
    const winningBets = validBets.filter((currentBet) => currentBet.numbers.includes(String(outcome)));
    return {
      outcome: String(outcome),
      hit: winningBets.length > 0,
      net: getNetForOutcome(validBets, outcome),
    };
  });

  const coveredOutcomes = outcomeDetails.filter((detail) => detail.hit).length;
  const profitOutcomes = outcomeDetails.filter((detail) => detail.net > 0).length;
  const breakEvenOutcomes = outcomeDetails.filter((detail) => detail.net === 0).length;
  const expectedNet = outcomeDetails.reduce((sum, detail) => sum + detail.net, 0) / variant.pockets.length;
  const minNet = Math.min(...outcomeDetails.map((detail) => detail.net));
  const maxNet = Math.max(...outcomeDetails.map((detail) => detail.net));

  return {
    variant,
    totalStake,
    outcomeDetails,
    coveredOutcomes,
    hitProbability: coveredOutcomes / variant.pockets.length,
    profitProbability: profitOutcomes / variant.pockets.length,
    breakEvenProbability: breakEvenOutcomes / variant.pockets.length,
    expectedNet,
    expectedLoss: Math.max(0, -expectedNet),
    houseEdge: totalStake === 0 ? 0 : Math.max(0, -expectedNet / totalStake),
    maxProfit: Math.max(0, maxNet),
    maxLoss: Math.max(0, -minNet),
  };
}

export function simulateBets(bets, variantId, spins = 1000, random = Math.random) {
  const analysis = analyzeBets(bets, variantId);
  const { pockets } = analysis.variant;
  const rounds = Math.max(1, Math.floor(Number(spins) || 1));
  let totalNet = 0;
  let profitRounds = 0;
  let hitRounds = 0;

  for (let index = 0; index < rounds; index += 1) {
    const outcome = pockets[Math.floor(random() * pockets.length)];
    const detail = analysis.outcomeDetails.find((item) => item.outcome === String(outcome));
    totalNet += detail.net;
    if (detail.net > 0) profitRounds += 1;
    if (detail.hit) hitRounds += 1;
  }

  return {
    spins: rounds,
    totalNet,
    averageNet: totalNet / rounds,
    profitRate: profitRounds / rounds,
    hitRate: hitRounds / rounds,
  };
}

export function coveredNumbers(bets) {
  return new Set(bets.flatMap((currentBet) => currentBet.numbers.map(String)));
}

export function exposureOnNumber(bets, number) {
  const numberKey = String(number);
  return bets
    .filter((currentBet) => currentBet.id === `straight-${numberKey}`)
    .reduce((sum, currentBet) => sum + Number(currentBet.stake), 0);
}
