/**
 * Decode `G.tokens[token][item]` the way the server does (`node/server.js` exchange_buy):
 * - cost < 1 → pay 1 token, receive `parseInt(1 / cost)` items
 * - cost ≥ 1 → pay `cost` tokens, receive 1 item
 */
export function normalizeTokenShopOffer(rawCost: number | null | undefined): {
  rawCost: number | null;
  tokenCost: number;
  quantity: number;
} {
  if (rawCost == null || !Number.isFinite(rawCost) || rawCost <= 0) {
    return { rawCost: rawCost ?? null, tokenCost: 0, quantity: 1 };
  }
  if (rawCost < 1) {
    return {
      rawCost,
      tokenCost: 1,
      quantity: Math.max(1, Math.trunc(1 / rawCost)),
    };
  }
  return { rawCost, tokenCost: rawCost, quantity: 1 };
}
