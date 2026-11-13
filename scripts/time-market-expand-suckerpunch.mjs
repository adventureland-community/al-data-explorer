/**
 * Timing harness: fresh ALData merchants → suckerpunch +0 expand path.
 * Run: node scripts/time-market-expand-suckerpunch.mjs
 *
 * RED when the *sync expand* work (split + glance + market-light) exceeds
 * BUDGET_MS, or when a single idle-chunk of want-barter calcs exceeds
 * CHUNK_BUDGET_MS (mirrors useWantBarterCalcs: one row then yield).
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const require = createRequire(import.meta.url);

const BUDGET_MS = 50;
const CHUNK_BUDGET_MS = 80; // snappy + stable tables: per-row EV should stay interactive
const ALDATA = process.env.REACT_APP_ALDATA_URL?.replace(/\/$/, "") || "https://aldata.earthiverse.ca";

async function main() {
  const merchantsPath =
    process.env.MERCHANTS_JSON || join(process.env.TEMP || "/tmp", "al-merchants.json");
  let merchants;
  try {
    merchants = JSON.parse(readFileSync(merchantsPath, "utf8"));
    console.log(`loaded merchants from ${merchantsPath} (${merchants.length})`);
  } catch {
    console.log(`fetching ${ALDATA}/merchants …`);
    const res = await fetch(`${ALDATA}/merchants`);
    if (!res.ok) throw new Error(`merchants HTTP ${res.status}`);
    merchants = await res.json();
    writeFileSync(merchantsPath, JSON.stringify(merchants));
    console.log(`wrote ${merchantsPath} (${merchants.length})`);
  }

  process.chdir(root);
  require("ts-node").register({
    transpileOnly: true,
    compilerOptions: { module: "commonjs", esModuleInterop: true },
  });

  const { groupItemsByNameAndLevel } = require("../src/Market/useMerchants.ts");
  const { instanceVariantKey } = require("../src/gameData/itemInstanceData.ts");
  const { splitMarketOffers, wantTradeSides } = require("../src/Market/marketOfferRows.ts");
  const {
    itemCalcUnitRange,
    barterValueSplit,
    barterCalcSides,
  } = require("../src/Market/marketPriceCompare.ts");

  const G = JSON.parse(readFileSync(join(root, "public/data.json"), "utf8"));
  const market = groupItemsByNameAndLevel(merchants);
  const punch = market.suckerpunch?.[instanceVariantKey({})]?.[0];
  if (!punch) {
    console.error("no suckerpunch listings in fresh data");
    process.exit(2);
  }

  const viewed = { name: "suckerpunch", level: 0 };

  const t0 = performance.now();
  const offers = splitMarketOffers(punch, [], viewed);
  const splitMs = performance.now() - t0;

  const t1 = performance.now();
  const calcRange = itemCalcUnitRange(viewed, { G, market });
  const glanceMs = performance.now() - t1;

  const wantRows = [...offers.outgoingWant, ...offers.incomingWant];

  const t2 = performance.now();
  const marketSplits = wantRows.map((row) => {
    const sides = wantTradeSides(row, viewed);
    if (!sides) return null;
    return barterValueSplit(sides, { market, G, light: true }).market;
  });
  const marketLightMs = performance.now() - t2;

  const syncExpandMs = splitMs + glanceMs + marketLightMs;

  // Mirror useWantBarterCalcs: one row per chunk, shared cache.
  const cache = new Map();
  const chunkMs = [];
  let oneSidedHits = 0;
  let bothHits = 0;
  for (const row of wantRows) {
    const sides = wantTradeSides(row, viewed);
    const started = performance.now();
    const calc = sides
      ? barterCalcSides(sides, { G, market, light: false }, cache)
      : { compare: null };
    chunkMs.push(Math.round((performance.now() - started) * 10) / 10);
    if (calc.compare) bothHits += 1;
    else if (calc.give || calc.receive) oneSidedHits += 1;
  }

  const maxChunkMs = chunkMs.length ? Math.max(...chunkMs) : 0;
  const summary = {
    wantRows: wantRows.length,
    goldBuy: offers.buyGold.length,
    goldSell: offers.sellGold.length,
    splitMs: Math.round(splitMs * 10) / 10,
    glanceMs: Math.round(glanceMs * 10) / 10,
    glanceKind: calcRange?.kind ?? null,
    marketLightMs: Math.round(marketLightMs * 10) / 10,
    syncExpandMs: Math.round(syncExpandMs * 10) / 10,
    chunkMs,
    maxChunkMs,
    oneSidedHits,
    bothHits,
    marketHits: marketSplits.filter(Boolean).length,
    budgetMs: BUDGET_MS,
    chunkBudgetMs: CHUNK_BUDGET_MS,
    redSync: syncExpandMs > BUDGET_MS,
    redChunk: maxChunkMs > CHUNK_BUDGET_MS,
  };

  console.log(JSON.stringify(summary, null, 2));
  if (summary.redSync || summary.redChunk) {
    console.error(
      `RED: syncExpand=${summary.syncExpandMs}ms (budget ${BUDGET_MS}) maxChunk=${maxChunkMs}ms (budget ${CHUNK_BUDGET_MS})`,
    );
    process.exit(1);
  }
  console.log(
    `GREEN: sync expand ${summary.syncExpandMs}ms ≤ ${BUDGET_MS}ms; max chunk ${maxChunkMs}ms ≤ ${CHUNK_BUDGET_MS}ms`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
