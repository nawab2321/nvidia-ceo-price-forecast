// Market-specific, empirically calibrated random-walk quantiles for the
// Polymarket NVIDIA CEO competition. Node.js standard library only.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const INPUT_DIR = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const QUANTILES = [0.05, 0.25, 0.5, 0.75, 0.95];
const Z = [-1.644854, -0.67449, 0, 0.67449, 1.644854];
const VOL_WINDOW = 120;
const EVENT_SHRINKAGE = 0.60;
const MIN_SIGMA = 0.0001;

function clampRound(x) {
  return Math.round(Math.max(0, Math.min(1, x)) * 1e6) / 1e6 + 0;
}

function rmsMove(prices) {
  if (prices.length < 2) return MIN_SIGMA;
  const end = prices.length - 1;
  const start = Math.max(0, end - VOL_WINDOW);
  let sumSquares = 0;
  let count = 0;
  for (let i = start + 1; i <= end; i++) {
    const change = prices[i] - prices[i - 1];
    sumSquares += change * change;
    count++;
  }
  return count ? Math.sqrt(sumSquares / count) : MIN_SIGMA;
}

function median(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  const middle = sorted.length >> 1;
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function forecast(market, horizon, eventSigma) {
  if (!market.prices.length) throw new Error(`market ${market.id} has no prices`);
  const x = market.prices[market.prices.length - 1];
  const localSigma = rmsMove(market.prices);
  const sigma = Math.max(MIN_SIGMA,
    (1 - EVENT_SHRINKAGE) * localSigma + EVENT_SHRINKAGE * eventSigma);
  const rows = [];
  for (let h = 1; h <= horizon; h++) {
    const spread = sigma * Math.sqrt(h);
    rows.push(Z.map((z) => clampRound(x + z * spread)));
  }
  return rows;
}

mkdirSync(OUTPUT_DIR, { recursive: true });
const inputs = readdirSync(INPUT_DIR).filter((name) => name.endsWith('.in')).sort();
for (const file of inputs) {
  const caseId = file.slice(0, -3);
  const c = JSON.parse(readFileSync(join(INPUT_DIR, file), 'utf8'));
  if (c.quantiles.length !== QUANTILES.length || c.quantiles.some((q, i) => q !== QUANTILES[i])) {
    throw new Error(`${file} has unexpected quantiles`);
  }
  const marketSigmas = c.markets.map((m) => rmsMove(m.prices));
  const eventSigma = median(marketSigmas);
  const forecasts = c.markets.map((market) => ({
    id: market.id,
    q: forecast(market, c.horizon_minutes, eventSigma),
  }));
  writeFileSync(join(OUTPUT_DIR, `${caseId}.out`), `${JSON.stringify({ forecasts })}\n`);
}
