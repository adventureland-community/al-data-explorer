import {
  Box,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ItemKey } from "typed-adventureland";

import { CustomGData, GDataContext } from "../GDataContext";
import { ItemInstance } from "../Shared/ItemInstance";
import { abbreviateGold } from "../Shared/utils";
import { getItemName } from "../Shared/iteminfo-util";
import {
  wantTradeSides,
  type GoldOfferRow,
  type OfferSource,
  type WantOfferRow,
} from "./marketOfferRows";
import {
  barterValueSplit,
  calcRangeTitle,
  estimateSourceLabel,
  formatPct,
  goldVsBest,
  isParkingGoldPrice,
  itemCalcMidGold,
  itemCalcUnitRange,
  leadAskPrice,
  type BarterGoldCompare,
  type GoldEstimate,
} from "./marketPriceCompare";
import type { ItemsByNameTitleLevel, Merchant } from "./merchantTypes";

function sourceChip(source: OfferSource) {
  // Stand is the default; only call out Earth /trades rows.
  if (source !== "earth") return null;
  return <Chip size="small" label="Earth" sx={{ ml: 0.75 }} variant="outlined" color="info" />;
}

function getTimeAgo(lastSeen: string | Date) {
  const now = new Date();
  const lastSeenDate = new Date(lastSeen);
  const diffInMs = now.getTime() - lastSeenDate.getTime();

  const days = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffInMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffInMs % (1000 * 60 * 60)) / (1000 * 60));

  return `${days}d ${hours}h ${minutes}m ago`;
}

function merchantTooltip(merchant: Merchant | undefined, name: string): string {
  if (!merchant) return name;
  return [
    name,
    `Server: ${merchant.serverRegion}${merchant.serverIdentifier}`,
    `Map: ${merchant.map}`,
    `X: ${merchant.x.toFixed(2)}, Y: ${merchant.y.toFixed(2)}`,
    `Last seen: ${getTimeAgo(merchant.lastSeen)}`,
  ].join("\n");
}

function copyMerchantMove(merchant: Merchant | undefined) {
  if (!merchant) return;
  const command = `smart_move({map: "${merchant.map}", x: ${merchant.x}, y: ${merchant.y}})`;
  navigator.clipboard.writeText(command).catch(() => {
    /* ignore */
  });
}

function formatItemLabel(
  item: { name: string; level?: number; q?: number; p?: string; data?: string },
  G: CustomGData | undefined,
) {
  const gItem = G?.items[item.name as ItemKey];
  const base = gItem ? getItemName(item.name as ItemKey, gItem) : item.name;
  const level = item.level != null && item.level > 0 ? ` +${item.level}` : "";
  const title = item.p ? `${item.p} ` : "";
  const data = item.data ? ` · ${item.data}` : "";
  return `${title}${base}${level}${data}`;
}

/** One side of a barter, visitor-facing (icon + name). */
function WantItemSide({
  item,
}: {
  item: { name: string; level?: number; q?: number; p?: string; data?: string };
}) {
  const G = useContext(GDataContext);
  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
      <ItemInstance
        itemInfo={
          {
            name: item.name as ItemKey,
            level: item.level,
            q: item.q ?? 1,
            ...(item.p ? { p: item.p } : {}),
            ...(item.data ? { data: item.data } : {}),
          } as never
        }
      />
      <Typography variant="body2">{formatItemLabel(item, G)}</Typography>
    </Box>
  );
}

function PanelShell({
  title,
  badge,
  badgeTitle,
  children,
  empty,
}: {
  title: string;
  badge?: string;
  badgeTitle?: string;
  children: ReactNode;
  empty?: boolean;
}) {
  return (
    <Box
      sx={{
        flex: "1 1 280px",
        minWidth: 260,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        p: 1,
        bgcolor: "background.paper",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
        <Typography variant="subtitle2">{title}</Typography>
        {badge ? <Chip size="small" label={badge} variant="outlined" title={badgeTitle} /> : null}
      </Box>
      {empty ? (
        <Typography variant="body2" color="text.secondary">
          None
        </Typography>
      ) : (
        children
      )}
    </Box>
  );
}

function DiffCell({
  diff,
  pct,
  title,
  /** Drop % when it is just noise (e.g. G-tier ask vs M-tier NPC calc). */
  maxAbsPct,
}: {
  diff: number;
  pct: number | null;
  title?: string;
  maxAbsPct?: number;
}) {
  const color = diff > 0 ? "success.main" : diff < 0 ? "error.main" : "text.secondary";
  const showPct = pct != null && (maxAbsPct == null || Math.abs(pct) <= maxAbsPct);
  return (
    <TableCell align="right" title={title} sx={{ color, whiteSpace: "nowrap" }}>
      <Typography variant="body2" component="span" sx={{ color: "inherit" }}>
        {abbreviateGold(diff, { signed: true })}
      </Typography>
      {showPct ? (
        <Typography
          variant="caption"
          component="div"
          sx={{ color: "inherit", opacity: 0.85, lineHeight: 1.2 }}
        >
          {formatPct(pct)}
        </Typography>
      ) : null}
    </TableCell>
  );
}

export function GoldOffersPanel({
  title,
  rows,
  merchants,
  bestLabel,
  side,
  calcRange,
}: {
  title: string;
  rows: GoldOfferRow[];
  merchants: Record<string, Merchant>;
  bestLabel: string;
  /** bid = highest wins; ask = lowest wins. */
  side: "bid" | "ask";
  calcRange?: ReturnType<typeof itemCalcUnitRange>;
}) {
  const lead = side === "ask" ? leadAskPrice(rows) : rows[0]?.price;
  const calcMid = calcRange ? itemCalcMidGold(calcRange) : undefined;
  const calcTitle = calcRange ? calcRangeTitle(calcRange) : undefined;
  const showVsCalc = calcMid != null && calcMid > 0;
  const isNpcCalc = calcRange?.kind === "npc";
  const vsCalcHeader = isNpcCalc ? "vs npc" : "vs calc";
  const vsCalcTooltip = isNpcCalc
    ? `Listing vs NPC sell value (${calcTitle}) — not upgrade/compound EV`
    : `Listing vs calc mid (${calcTitle})`;
  const vsBestTooltip =
    side === "bid"
      ? "Signed gap vs best (highest) bid"
      : "Signed gap vs best (lowest) live ask — ignores ≈100B+ parking";

  return (
    <PanelShell title={title} badge={`${rows.length}`} empty={rows.length === 0}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Merchant</TableCell>
            <TableCell align="right">Qty</TableCell>
            <TableCell align="right">{bestLabel}</TableCell>
            <TableCell align="right" title={vsBestTooltip}>
              vs best
            </TableCell>
            {showVsCalc ? (
              <TableCell align="right" title={vsCalcTooltip}>
                {vsCalcHeader}
              </TableCell>
            ) : null}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => {
            const merchant = merchants[row.merchantName];
            const parking = side === "ask" && isParkingGoldPrice(row.price);
            const vsLead = lead != null && !parking ? goldVsBest(row.price, lead) : null;
            const vsCalc = showVsCalc ? goldVsBest(row.price, calcMid) : null;
            const isLeadRow = vsLead?.isBest === true;
            return (
              <TableRow key={row.id} hover selected={isLeadRow}>
                <TableCell
                  title={merchantTooltip(merchant, row.merchantName)}
                  onClick={() => copyMerchantMove(merchant)}
                  sx={{ cursor: merchant ? "pointer" : "default" }}
                >
                  {row.merchantName}
                  {sourceChip(row.source)}
                  {parking ? (
                    <Chip
                      size="small"
                      label="Park"
                      sx={{ ml: 0.5 }}
                      variant="outlined"
                      title="≈100B+ asks are usually stand parking, not a real ask"
                    />
                  ) : null}
                  {row.slotCount > 1 ? (
                    <Chip
                      size="small"
                      label={`${row.slotCount} slots`}
                      sx={{ ml: 0.5 }}
                      variant="outlined"
                    />
                  ) : null}
                </TableCell>
                <TableCell align="right">{row.quantity}</TableCell>
                <TableCell align="right" title={row.price.toLocaleString()}>
                  {abbreviateGold(row.price)}
                </TableCell>
                {parking ? (
                  <TableCell align="right">
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      title="≈100B+ asks are usually stand parking, not a real ask"
                    >
                      park
                    </Typography>
                  </TableCell>
                ) : vsLead?.isBest ? (
                  <TableCell align="right">
                    <Typography variant="caption" color="text.secondary">
                      best
                    </Typography>
                  </TableCell>
                ) : vsLead && lead != null ? (
                  <DiffCell
                    diff={vsLead.diff}
                    pct={vsLead.pct}
                    title={`${row.price.toLocaleString()} vs best ${lead.toLocaleString()}`}
                  />
                ) : (
                  <TableCell align="right" />
                )}
                {showVsCalc ? (
                  parking ? (
                    <TableCell align="right">
                      <Typography variant="caption" color="text.secondary">
                        —
                      </Typography>
                    </TableCell>
                  ) : vsCalc ? (
                    <DiffCell
                      diff={vsCalc.diff}
                      pct={vsCalc.pct}
                      maxAbsPct={500}
                      title={vsCalcTooltip}
                    />
                  ) : (
                    <TableCell align="right" />
                  )
                ) : null}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </PanelShell>
  );
}

function goldOrDash(gold: number | undefined, empty: ReactNode) {
  if (gold == null) return empty;
  return (
    <Typography variant="body2" component="span">
      {abbreviateGold(gold)}
    </Typography>
  );
}

/** Gold pair drawn left → right (callers pass you-give then you-get). */
function barterArrowCell(args: {
  leftGold?: number;
  rightGold?: number;
  empty: ReactNode;
  title?: string;
}) {
  const { leftGold, rightGold, empty, title } = args;
  if (leftGold == null && rightGold == null) {
    return (
      <TableCell align="right" title={title} sx={{ whiteSpace: "nowrap" }}>
        {empty}
      </TableCell>
    );
  }
  return (
    <TableCell align="right" title={title} sx={{ whiteSpace: "nowrap" }}>
      {goldOrDash(leftGold, empty)}
      <Typography variant="caption" color="text.secondary" component="span">
        {" → "}
      </Typography>
      {goldOrDash(rightGold, empty)}
    </TableCell>
  );
}

function sideTitle(label: string, estimate?: GoldEstimate) {
  if (!estimate) return `${label} — (no market quote)`;
  return `${label} ≈ ${estimate.gold.toLocaleString()} (${estimateSourceLabel(estimate.source)})`;
}

function barterTitle(compare: BarterGoldCompare): string {
  return [
    `You get ≈ ${compare.give.gold.toLocaleString()} (${estimateSourceLabel(compare.give.source)})`,
    `You give ≈ ${compare.receive.gold.toLocaleString()} (${estimateSourceLabel(
      compare.receive.source,
    )})`,
  ].join("\n");
}

function marketSidesTitle(
  give?: BarterGoldCompare["give"],
  receive?: BarterGoldCompare["receive"],
) {
  return [sideTitle("You get", give), sideTitle("You give", receive)].join("\n");
}

export function WantOffersPanel({
  title,
  rows,
  merchants,
  viewedItem,
  marketItems,
}: {
  title: string;
  rows: WantOfferRow[];
  merchants: Record<string, Merchant>;
  viewedItem: { name: string; level?: number };
  marketItems?: ItemsByNameTitleLevel;
}) {
  const G = useContext(GDataContext);

  // Market values only — sync and cheap (no upgrade EV).
  const marketSplits = useMemo(
    () =>
      rows.map((row) => {
        const sides = wantTradeSides(row, viewedItem);
        if (!sides) return null;
        return barterValueSplit(sides, { market: marketItems, G, light: true }).market;
      }),
    [rows, viewedItem, marketItems, G],
  );

  const [calcSplits, setCalcSplits] = useState<(BarterGoldCompare | null)[] | null>(null);

  // Calc = upgrade/compound EV only (async; never NPC).
  useEffect(() => {
    let cancelled = false;
    setCalcSplits(null);
    if (rows.length === 0) {
      setCalcSplits([]);
      return;
    }
    const raf = window.requestAnimationFrame(() => {
      const next = rows.map((row) => {
        const sides = wantTradeSides(row, viewedItem);
        if (!sides) return null;
        return barterValueSplit(sides, { market: marketItems, G, light: false }).calc;
      });
      if (!cancelled) setCalcSplits(next);
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
    };
  }, [rows, viewedItem, marketItems, G]);

  const calcPending = calcSplits == null;
  const dash = (
    <Typography variant="caption" color="text.secondary" component="span">
      —
    </Typography>
  );

  return (
    <PanelShell title={title} badge={`${rows.length}`} empty={rows.length === 0}>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
        From your side of the deal. Value = market only. Calc = upgrade/compound EV only. Diff = get
        − give when both sides have a market quote.
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Merchant</TableCell>
            <TableCell title="What you hand the merchant">You give</TableCell>
            <TableCell title="What you walk away with">You get</TableCell>
            <TableCell
              align="right"
              title="Live market ask/bid: you give → you get (either side may be —)"
            >
              Value
            </TableCell>
            <TableCell
              align="right"
              title="Upgrade/compound expected cost only (no NPC, no catalog)"
            >
              Calc
            </TableCell>
            <TableCell align="right" title="Value of what you get minus what you give">
              Diff
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, index) => {
            const merchant = merchants[row.merchantName];
            const sides = wantTradeSides(row, viewedItem);
            const market = marketSplits[index] ?? null;
            const calc = calcSplits?.[index] ?? null;
            // Diff is market-only (both sides must quote). Calc stays in its own column.
            const diffCompare = market?.compare ?? null;
            const calcEmpty = calcPending ? <CircularProgress size={14} thickness={5} /> : dash;
            // wantTradeSides: merchant `give` / `receive` → visitor gets `give`, pays `receive`.
            const youGive = sides?.receive;
            const youGet = sides?.give;

            return (
              <TableRow key={row.id} hover>
                <TableCell
                  title={merchantTooltip(merchant, row.merchantName)}
                  onClick={() => copyMerchantMove(merchant)}
                  sx={{ cursor: merchant ? "pointer" : "default", verticalAlign: "top" }}
                >
                  {row.merchantName}
                  {sourceChip(row.source)}
                  {row.slotCount > 1 ? (
                    <Chip
                      size="small"
                      label={`${row.slotCount} slots`}
                      sx={{ ml: 0.5 }}
                      variant="outlined"
                    />
                  ) : null}
                </TableCell>
                <TableCell>{youGive ? <WantItemSide item={youGive} /> : null}</TableCell>
                <TableCell>{youGet ? <WantItemSide item={youGet} /> : null}</TableCell>
                {barterArrowCell({
                  leftGold: market?.receive?.gold,
                  rightGold: market?.give?.gold,
                  empty: dash,
                  title: market
                    ? marketSidesTitle(market.give, market.receive)
                    : "No live market ask/bid",
                })}
                {barterArrowCell({
                  leftGold: calc?.receive.gold,
                  rightGold: calc?.give.gold,
                  empty: calcEmpty,
                  title: calc ? barterTitle(calc) : calcPending ? "Calculating…" : undefined,
                })}
                {diffCompare ? (
                  <DiffCell
                    diff={diffCompare.diff}
                    pct={diffCompare.pct}
                    title={barterTitle(diffCompare)}
                  />
                ) : (
                  <TableCell align="right" />
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </PanelShell>
  );
}
