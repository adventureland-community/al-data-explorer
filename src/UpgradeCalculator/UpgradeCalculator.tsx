import AddIcon from "@mui/icons-material/Add";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import RemoveIcon from "@mui/icons-material/Remove";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControlLabel,
  IconButton,
  Paper,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ItemKey } from "typed-adventureland";

import { itemAcceptsStatScroll } from "../gameData/itemAffixes";
import { getItemGrade } from "../gameData/playerItemDisplay";
import { ChanceTables, OfferingChoice } from "../gameData/upgradeChance";
import {
  formatGold,
  formatShrineTime,
  MaterialLine,
  planCompoundPath,
  planUpgradePath,
  planUpgradePathBestOdds,
  PlannerContext,
  PlanSummaryStep,
  summarizeCompoundPlan,
  summarizeUpgradePlan,
} from "../gameData/upgradePath";
import {
  COMPOUND_SCROLL_KEYS,
  defaultPriceTable,
  OFFERING_KEYS,
  PriceTable,
  STAT_SCROLL_PROXY_KEY,
  UPGRADE_SCROLL_KEYS,
} from "../gameData/upgradePrices";
import { GDataContext } from "../GDataContext";
import { SimEntityAutocomplete } from "../DropSimulator/SimEntityAutocomplete";
import { ItemInstance } from "../Shared/ItemInstance";
import { useMerchants } from "../Market/useMerchants";
import { UpgradeCalcHelpButton } from "./UpgradeCalcHelp";
import {
  CopyPlanLinkButton,
  EvDeltaBanner,
  formatRecipeClipboard,
  MaterialsPanel,
  materialsTotals,
  PathLadder,
  pathStepKey,
  PlanHero,
  PlanModifiersChips,
  StepPlanTable,
  StrategyCard,
} from "./PlanResults";
import { buildStarterPicks, sampleKeys, STARTER_SECTION_LIMIT } from "./starterPicks";
import { CalcMode, CalcStrategy, useUpgradeCalcParams } from "./useUpgradeCalcParams";

const TARGET_UPGRADE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const TARGET_COMPOUND = [1, 2, 3, 4, 5];
const RECENT_STORAGE_KEY = "aldex.upgradeCalc.recentItems";
const RECENT_LIMIT = 6;

function offeringList(params: {
  offeringp: boolean;
  offering: boolean;
  offeringx: boolean;
}): OfferingChoice[] {
  const list: OfferingChoice[] = [null];
  if (params.offeringp) list.push(0);
  if (params.offering) list.push(1);
  if (params.offeringx) list.push(2);
  return list;
}

function offeringEnabled(
  key: "offeringp" | "offering" | "offeringx",
  params: { offeringp: boolean; offering: boolean; offeringx: boolean },
): boolean {
  if (key === "offeringp") return params.offeringp;
  if (key === "offering") return params.offering;
  return params.offeringx;
}

function sumAttempts(steps: PlanSummaryStep[]): number {
  let sum = 0;
  for (const s of steps) {
    if (Number.isFinite(s.attempts)) sum += s.attempts;
  }
  return sum;
}

function oneshotPercent(steps: PlanSummaryStep[]): number | null {
  if (!steps.length) return null;
  let product = 1;
  for (const s of steps) {
    if (!Number.isFinite(s.chance) || s.chance <= 0) return null;
    product *= s.chance;
  }
  return product * 100;
}

function heaviestStep(steps: PlanSummaryStep[]): PlanSummaryStep | null {
  let best: PlanSummaryStep | null = null;
  for (const s of steps) {
    if (!Number.isFinite(s.stepSpend)) continue;
    if (!best || s.stepSpend > best.stepSpend) best = s;
  }
  return best;
}

function PriceField({
  value,
  onChange,
  width = 112,
}: {
  value: number;
  onChange: (n: number) => void;
  width?: number;
}) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(() => String(Number.isFinite(value) ? value : ""));

  useEffect(() => {
    if (!focused) {
      setDraft(String(Number.isFinite(value) ? value : ""));
    }
  }, [value, focused]);

  const display = focused ? draft : Number.isFinite(value) ? formatGold(value) : "";

  return (
    <Tooltip title={Number.isFinite(value) ? value.toLocaleString("en-US") : ""} placement="top">
      <TextField
        size="small"
        value={display}
        onFocus={() => {
          setFocused(true);
          setDraft(String(Number.isFinite(value) ? value : ""));
        }}
        onBlur={() => {
          setFocused(false);
          const n = Number(draft.replace(/,/g, ""));
          if (Number.isFinite(n) && n >= 0) onChange(n);
          else setDraft(String(Number.isFinite(value) ? value : ""));
        }}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "" || /^\d*\.?\d*$/.test(raw)) setDraft(raw);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        sx={{ width, flexShrink: 0 }}
        inputProps={{
          inputMode: "decimal",
          "aria-label": "Price",
          sx: { fontVariantNumeric: "tabular-nums", textAlign: "right" },
        }}
      />
    </Tooltip>
  );
}

function MaterialPriceRow({
  itemKey,
  label,
  price,
  onPriceChange,
  enabled,
  onEnabledChange,
  enabledDisabled,
  overridden,
  extra,
}: {
  itemKey: string;
  label: string;
  price: number;
  onPriceChange: (n: number) => void;
  enabled?: boolean;
  onEnabledChange?: (v: boolean) => void;
  enabledDisabled?: boolean;
  overridden?: boolean;
  extra?: ReactNode;
}) {
  return (
    <Stack spacing={0.5}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <ItemInstance itemInfo={{ name: itemKey as ItemKey }} size={32} tooltip />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" noWrap title={label}>
            {label}
          </Typography>
          {overridden ? (
            <Typography variant="caption" color="primary.main">
              edited
            </Typography>
          ) : null}
        </Box>
        {onEnabledChange != null ? (
          <Switch
            size="small"
            checked={Boolean(enabled)}
            disabled={enabledDisabled}
            onChange={(e) => onEnabledChange(e.target.checked)}
            inputProps={{ "aria-label": `Allow ${label}` }}
          />
        ) : null}
        <PriceField value={price} onChange={onPriceChange} />
      </Stack>
      {extra}
    </Stack>
  );
}

function SidebarSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box>
      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ display: "block", letterSpacing: 0.6, lineHeight: 1.5, mb: 0.75 }}
      >
        {title}
      </Typography>
      {children}
    </Box>
  );
}

function LevelStepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <Box sx={{ textAlign: "center", minWidth: 88 }}>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.25 }}>
        {label}
      </Typography>
      <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.25}>
        <IconButton
          size="small"
          aria-label={`Decrease ${label.toLowerCase()}`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          <RemoveIcon fontSize="small" />
        </IconButton>
        <Typography
          variant="h6"
          fontWeight={700}
          sx={{ minWidth: 40, fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}
        >
          +{value}
        </Typography>
        <IconButton
          size="small"
          aria-label={`Increase ${label.toLowerCase()}`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          <AddIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Box>
  );
}

/** Compact from→to steppers + common target presets (replaces dual chip grids). */
function LevelRangeControl({
  mode,
  from,
  target,
  maxTarget,
  onFrom,
  onTarget,
}: {
  mode: CalcMode;
  from: number;
  target: number;
  maxTarget: number;
  onFrom: (n: number) => void;
  onTarget: (n: number) => void;
}) {
  const presets = mode === "compound" ? [3, 4, 5] : [7, 8, 9, 10, 12];
  const minTarget = mode === "compound" ? 1 : Math.max(1, from + 1);
  const maxFrom = Math.max(0, target - 1);

  return (
    <SidebarSection title="Level range">
      <Stack spacing={1.25}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="center"
          spacing={0.5}
          sx={{
            py: 0.75,
            px: 0.5,
            borderRadius: 1,
            border: 1,
            borderColor: "divider",
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
          }}
        >
          {mode === "upgrade" ? (
            <>
              <LevelStepper label="From" value={from} min={0} max={maxFrom} onChange={onFrom} />
              <Typography variant="h6" color="text.secondary" aria-hidden sx={{ px: 0.25 }}>
                →
              </Typography>
              <LevelStepper
                label="To"
                value={target}
                min={minTarget}
                max={maxTarget}
                onChange={onTarget}
              />
            </>
          ) : (
            <LevelStepper
              label="Target"
              value={target}
              min={1}
              max={maxTarget}
              onChange={onTarget}
            />
          )}
        </Stack>

        <Box
          sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, justifyContent: "center" }}
          role="group"
          aria-label="Target presets"
        >
          {presets.map((t) => {
            const disabled = mode === "upgrade" && t <= from;
            const selected = target === t;
            return (
              <Chip
                key={t}
                size="small"
                label={`+${t}`}
                disabled={disabled}
                color={selected ? "primary" : "default"}
                variant={selected ? "filled" : "outlined"}
                onClick={() => onTarget(t)}
                sx={{ height: 26, fontWeight: selected ? 700 : 500 }}
              />
            );
          })}
        </Box>

        {mode === "upgrade" && from > 0 ? (
          <Button size="small" onClick={() => onFrom(0)} sx={{ alignSelf: "center" }}>
            Start from +0
          </Button>
        ) : null}
      </Stack>
    </SidebarSection>
  );
}

function planTotal(plan: { totalExpectedCost: number } | null): number | null {
  if (!plan || !("totalExpectedCost" in plan)) return null;
  return plan.totalExpectedCost;
}

function strategyCompareBadge(
  thisStrategy: CalcStrategy,
  goldDelta: number | null,
  attemptDelta: number | null,
): string | null {
  const parts: string[] = [];
  if (goldDelta != null && Number.isFinite(goldDelta) && Math.abs(goldDelta) >= 1) {
    if (thisStrategy === "cheapest" && goldDelta > 0) parts.push(`saves ${formatGold(goldDelta)}`);
    if (thisStrategy === "fewest" && goldDelta > 0) parts.push(`+${formatGold(goldDelta)} gold`);
  }
  if (attemptDelta != null && Number.isFinite(attemptDelta) && Math.abs(attemptDelta) >= 0.05) {
    if (thisStrategy === "fewest" && attemptDelta > 0) {
      parts.push(`${attemptDelta.toFixed(attemptDelta >= 10 ? 0 : 1)} fewer tries`);
    }
    if (thisStrategy === "cheapest" && attemptDelta > 0) {
      parts.push(`+${attemptDelta.toFixed(attemptDelta >= 10 ? 0 : 1)} tries`);
    }
  }
  return parts.length ? parts.join(" · ") : null;
}

type PlanSummary = {
  steps: PlanSummaryStep[];
  materials: MaterialLine[];
  totalExpectedCost: number;
};

function readRecentItems(): ItemKey[] {
  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const keys: ItemKey[] = [];
    for (const entry of parsed) {
      if (typeof entry === "string" && entry) keys.push(entry as ItemKey);
    }
    return keys.slice(0, RECENT_LIMIT);
  } catch {
    return [];
  }
}

function pushRecentItem(key: ItemKey): ItemKey[] {
  const next = [key, ...readRecentItems().filter((k) => k !== key)].slice(0, RECENT_LIMIT);
  try {
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota / private mode */
  }
  return next;
}

function ItemPickGrid({ picks, onPick }: { picks: ItemKey[]; onPick: (key: ItemKey) => void }) {
  const G = useContext(GDataContext);
  if (!picks.length) return null;
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
        gap: 1,
      }}
    >
      {picks.map((key) => (
        <Box
          key={key}
          component="button"
          type="button"
          onClick={() => onPick(key)}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            p: 1,
            borderRadius: 1,
            border: 1,
            borderColor: "divider",
            bgcolor: "transparent",
            font: "inherit",
            color: "inherit",
            textAlign: "left",
            cursor: "pointer",
            "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
            "&:focus-visible": {
              outline: "2px solid",
              outlineColor: "primary.main",
              outlineOffset: 2,
            },
          }}
        >
          <ItemInstance itemInfo={{ name: key }} size={32} tooltip={false} />
          <Typography variant="body2" noWrap title={G?.items?.[key]?.name ?? key}>
            {G?.items?.[key]?.name ?? key}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

function RecentItemsStrip({
  items,
  available,
  current,
  onPick,
}: {
  items: ItemKey[];
  available: ItemKey[];
  current: string;
  onPick: (key: ItemKey) => void;
}) {
  const G = useContext(GDataContext);
  const picks = items.filter((k) => available.includes(k) && k !== current).slice(0, RECENT_LIMIT);
  if (!picks.length) return null;
  return (
    <SidebarSection title="Recent">
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
        {picks.map((key) => (
          <Box
            key={key}
            component="button"
            type="button"
            onClick={() => onPick(key)}
            title={G?.items?.[key]?.name ?? key}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.5,
              py: 0.25,
              pl: 0.5,
              pr: 1,
              borderRadius: 1,
              border: 1,
              borderColor: "divider",
              bgcolor: "transparent",
              font: "inherit",
              color: "inherit",
              cursor: "pointer",
              maxWidth: "100%",
              "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
              "&:focus-visible": {
                outline: "2px solid",
                outlineColor: "primary.main",
                outlineOffset: 2,
              },
            }}
          >
            <ItemInstance itemInfo={{ name: key }} size={20} tooltip={false} />
            <Typography variant="caption" noWrap>
              {G?.items?.[key]?.name ?? key}
            </Typography>
          </Box>
        ))}
      </Box>
    </SidebarSection>
  );
}

function StarterSection({
  title,
  picks,
  onPick,
}: {
  title: string;
  picks: ItemKey[];
  onPick: (key: ItemKey) => void;
}) {
  if (!picks.length) return null;
  return (
    <Box sx={{ mb: 2, "&:last-child": { mb: 0 } }}>
      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ letterSpacing: 0.6, display: "block", mb: 0.5 }}
      >
        {title}
      </Typography>
      <ItemPickGrid picks={picks} onPick={onPick} />
    </Box>
  );
}

function EmptyPickState({
  mode,
  available,
  recent,
  onPick,
}: {
  mode: CalcMode;
  available: ItemKey[];
  recent: ItemKey[];
  onPick: (key: ItemKey) => void;
}) {
  const { items: marketItems } = useMerchants();
  // Resample when the available set changes (incl. mode switch) — not when merchants load.
  const randomPool = useMemo(() => sampleKeys(available, STARTER_SECTION_LIMIT * 3), [available]);
  const picks = useMemo(() => {
    const built = buildStarterPicks({
      available,
      recent,
      marketItems,
      randomLimit: 0,
    });
    const taken = new Set([...built.recent, ...built.market]);
    const random: ItemKey[] = [];
    for (const key of randomPool) {
      if (taken.has(key) || !available.includes(key)) continue;
      random.push(key);
      if (random.length >= STARTER_SECTION_LIMIT) break;
    }
    return { ...built, random };
  }, [available, recent, marketItems, randomPool]);
  const hasAny = picks.recent.length > 0 || picks.market.length > 0 || picks.random.length > 0;

  return (
    <Paper sx={{ p: 3 }} variant="outlined">
      <Typography variant="subtitle1" gutterBottom>
        Pick an item to plan
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Search in the sidebar, or start from a recent, market, or random{" "}
        {mode === "compound" ? "compound" : "upgrade"} item.
      </Typography>
      {hasAny ? (
        <>
          <StarterSection title="Recent" picks={picks.recent} onPick={onPick} />
          <StarterSection title="On the market" picks={picks.market} onPick={onPick} />
          <StarterSection title="Random" picks={picks.random} onPick={onPick} />
        </>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Choose an item in the sidebar to plan a path to your target level.
        </Typography>
      )}
    </Paper>
  );
}

export function UpgradeCalculator() {
  const G = useContext(GDataContext);
  const { params, patch } = useUpgradeCalcParams();
  const [priceOverrides, setPriceOverrides] = useState<PriceTable>({});
  const [recentItems, setRecentItems] = useState<ItemKey[]>(() => readRecentItems());
  const [evDelta, setEvDelta] = useState<number | null>(null);
  const [evDeltaVisible, setEvDeltaVisible] = useState(false);
  const [focusStep, setFocusStep] = useState<{ key: string; token: number } | null>(null);
  const prevEvRef = useRef<number | null>(null);
  const evDeltaTimerRef = useRef<number | null>(null);

  const itemKey = (params.item || "") as ItemKey;
  const gItem = G?.items?.[itemKey];

  const selectItem = (key: ItemKey | "") => {
    if (key) setRecentItems(pushRecentItem(key));
    patch({ item: key });
  };

  const basePrices = useMemo(() => {
    if (!G?.items) return {};
    return defaultPriceTable(G.items, itemKey || undefined);
  }, [G, itemKey]);

  const prices = useMemo(
    () => ({ ...basePrices, ...priceOverrides }),
    [basePrices, priceOverrides],
  );

  const tables: ChanceTables | undefined = useMemo(() => {
    if (!G) return undefined;
    const gAny = G as typeof G & {
      upgrades?: ChanceTables["upgrades"];
      compounds?: ChanceTables["compounds"];
    };
    return { upgrades: gAny.upgrades, compounds: gAny.compounds };
  }, [G]);

  const ctx: PlannerContext | null = useMemo(() => {
    if (!G?.items) return null;
    return {
      lookup: (name) => G.items[name],
      prices,
      tables,
      useServerUgrace: params.serverUgrace,
      toolkit: {
        allowPrimlings: params.primlings,
        allowScroll4: params.scroll4,
        allowStatScrollGrace: params.statScrollGrace,
        offerings: offeringList(params),
      },
    };
  }, [G, prices, tables, params]);

  const itemValue = prices[itemKey] ?? gItem?.g ?? 0;

  /** Pareto cheapest only supports +0 starts; mid-path falls back to max-chance. */
  const midPathStart = params.mode === "upgrade" && params.from > 0;

  const cheapest = useMemo(() => {
    if (!ctx || !gItem || !itemKey) return null;
    if (params.mode === "compound") {
      return planCompoundPath(ctx, itemKey, itemValue, params.target, "costOptimal");
    }
    return planUpgradePath(ctx, itemKey, itemValue, params.target, {
      luckySlot: params.luckySlot,
      startLevel: params.from,
    });
  }, [ctx, gItem, itemKey, itemValue, params]);

  const fewest = useMemo(() => {
    if (!ctx || !gItem || !itemKey) return null;
    if (params.mode === "compound") {
      return planCompoundPath(ctx, itemKey, itemValue, params.target, "bestOdds");
    }
    return planUpgradePathBestOdds(ctx, itemKey, itemValue, params.target, {
      luckySlot: params.luckySlot,
      startLevel: params.from,
    });
  }, [ctx, gItem, itemKey, itemValue, params]);

  const itemIgrade = gItem ? getItemGrade(gItem, 0) : 0;

  const cheapestSummary = useMemo((): PlanSummary | null => {
    if (!cheapest) return null;
    const summarizeOpts = { igrade: itemIgrade };
    if (params.mode === "compound" && "path" in cheapest) {
      return summarizeCompoundPlan(cheapest, prices, summarizeOpts);
    }
    if ("steps" in cheapest) {
      return summarizeUpgradePlan(cheapest, prices, "upgrade", summarizeOpts);
    }
    return null;
  }, [cheapest, itemIgrade, params.mode, prices]);

  const fewestSummary = useMemo((): PlanSummary | null => {
    if (!fewest) return null;
    const summarizeOpts = { igrade: itemIgrade };
    if (params.mode === "compound" && "path" in fewest) {
      return summarizeCompoundPlan(fewest, prices, summarizeOpts);
    }
    if ("steps" in fewest) {
      return summarizeUpgradePlan(fewest, prices, "upgrade", summarizeOpts);
    }
    return null;
  }, [fewest, itemIgrade, params.mode, prices]);

  const summary = midPathStart || params.strategy === "fewest" ? fewestSummary : cheapestSummary;

  const totalAttempts = summary ? sumAttempts(summary.steps) : 0;
  const oneshotPct = summary ? oneshotPercent(summary.steps) : null;
  const bottleneck = summary ? heaviestStep(summary.steps) : null;
  const shrineMsTotal = summary
    ? summary.steps.reduce(
        (sum, s) => (Number.isFinite(s.shrineMs) ? sum + s.shrineMs : Infinity),
        0,
      )
    : null;
  const { materialsSum, destroyGap } = summary
    ? materialsTotals(summary.materials, summary.totalExpectedCost)
    : { materialsSum: 0, destroyGap: 0 };
  const cheapestMats = cheapestSummary
    ? materialsTotals(cheapestSummary.materials, cheapestSummary.totalExpectedCost)
    : null;
  const fewestMats = fewestSummary
    ? materialsTotals(fewestSummary.materials, fewestSummary.totalExpectedCost)
    : null;

  const cheapestTotal = planTotal(cheapest);
  const fewestTotal = planTotal(fewest);
  const cheapestAttempts = cheapestSummary ? sumAttempts(cheapestSummary.steps) : null;
  const fewestAttempts = fewestSummary ? sumAttempts(fewestSummary.steps) : null;
  const strategyGoldDelta =
    cheapestTotal != null && fewestTotal != null ? fewestTotal - cheapestTotal : null;
  const strategyAttemptDelta =
    cheapestAttempts != null && fewestAttempts != null ? cheapestAttempts - fewestAttempts : null;
  const showStrategyCards = Boolean(itemKey) && !midPathStart;
  const riskShare =
    summary && summary.totalExpectedCost > 0 ? destroyGap / summary.totalExpectedCost : 0;
  const alternateStrategy =
    showStrategyCards &&
    params.strategy === "cheapest" &&
    riskShare >= 0.5 &&
    strategyAttemptDelta != null &&
    strategyAttemptDelta > 0.5 &&
    fewestTotal != null
      ? {
          strategy: "fewest" as CalcStrategy,
          label: "Try Fewest Copies",
          detail:
            strategyAttemptDelta >= 1
              ? `${strategyAttemptDelta.toFixed(
                  strategyAttemptDelta >= 10 ? 0 : 1,
                )} fewer tries · ${formatGold(fewestTotal)}`
              : formatGold(fewestTotal),
          onSelect: () => patch({ strategy: "fewest" }),
        }
      : null;

  const planEv = summary?.totalExpectedCost;
  const evTrackKey = `${itemKey}|${params.mode}|${midPathStart ? "fewest" : params.strategy}`;

  useEffect(() => {
    if (itemKey) setRecentItems(pushRecentItem(itemKey));
  }, [itemKey]);

  useEffect(() => {
    // Reset baseline when the plan identity changes (item / mode / strategy).
    prevEvRef.current = null;
    setEvDeltaVisible(false);
  }, [evTrackKey]);

  useEffect(() => {
    if (planEv == null || !Number.isFinite(planEv)) return;
    const prev = prevEvRef.current;
    prevEvRef.current = planEv;
    if (prev == null) return;
    const delta = planEv - prev;
    if (Math.abs(delta) < 1) return;
    setEvDelta(delta);
    setEvDeltaVisible(true);
    if (evDeltaTimerRef.current != null) window.clearTimeout(evDeltaTimerRef.current);
    evDeltaTimerRef.current = window.setTimeout(() => {
      setEvDeltaVisible(false);
      evDeltaTimerRef.current = null;
    }, 4000);
  }, [planEv]);

  useEffect(
    () => () => {
      if (evDeltaTimerRef.current != null) window.clearTimeout(evDeltaTimerRef.current);
    },
    [],
  );

  const scrollKeys = useMemo(() => {
    if (params.mode === "compound") return [...COMPOUND_SCROLL_KEYS];
    return [...UPGRADE_SCROLL_KEYS];
  }, [params.mode]);

  const offeringKeys = useMemo(
    () => OFFERING_KEYS.filter((k): k is Exclude<typeof k, null> => k != null),
    [],
  );

  const itemOptions = useMemo(() => {
    if (!G?.items) return [] as ItemKey[];
    const keys: ItemKey[] = [];
    for (const key of Object.keys(G.items) as ItemKey[]) {
      const item = G.items[key];
      if (!item) continue;
      if (params.mode === "compound") {
        if (item.compound) keys.push(key);
      } else if (item.upgrade) {
        keys.push(key);
      }
    }
    if (itemKey && G.items[itemKey] && !keys.includes(itemKey)) {
      keys.push(itemKey);
    }
    keys.sort((a, b) => {
      const an = G.items[a]?.name ?? a;
      const bn = G.items[b]?.name ?? b;
      return an.localeCompare(bn);
    });
    return keys;
  }, [G, params.mode, itemKey]);

  const maxTarget =
    params.mode === "compound"
      ? TARGET_COMPOUND[TARGET_COMPOUND.length - 1]
      : TARGET_UPGRADE[TARGET_UPGRADE.length - 1];
  const hasPriceOverrides = Object.keys(priceOverrides).length > 0;
  const enabledOfferingCount = offeringKeys.filter((k) => offeringEnabled(k, params)).length;

  const setPrice = (key: string, n: number) => {
    setPriceOverrides((prev) => ({ ...prev, [key]: n }));
  };

  const materialLabel = (key: string) => {
    if (key === "_stacks") return "Stack farms (fail/prime)";
    return G?.items?.[key as ItemKey]?.name ?? key;
  };

  if (!G) {
    return <Typography>Loading game data…</Typography>;
  }

  const itemName = gItem?.name ?? itemKey;

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        textAlign: "left",
        overflowX: "hidden",
        px: { xs: 1.5, sm: 2 },
        py: { xs: 1.5, sm: 2 },
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "stretch", sm: "flex-start" }}
        justifyContent="space-between"
        spacing={1.5}
        sx={{ mb: 2 }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" component="h1" gutterBottom>
            Upgrade Calculator
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {itemKey && gItem
              ? `${gItem.name} · ${
                  params.mode === "compound"
                    ? `compound to +${params.target}`
                    : params.from > 0
                    ? `+${params.from} → +${params.target}`
                    : `upgrade to +${params.target}`
                }`
              : "Plan upgrade and compound paths. Pick Cheapest for minimum expected gold, or Fewest Copies when base items are scarce."}
          </Typography>
        </Box>
        <Stack
          direction="row"
          spacing={0.5}
          alignItems="center"
          sx={{ flexShrink: 0, alignSelf: { xs: "flex-start", sm: "center" } }}
        >
          <EvDeltaBanner delta={evDelta} visible={evDeltaVisible} />
          {hasPriceOverrides ? (
            <Button
              size="small"
              variant="text"
              startIcon={<RestartAltIcon fontSize="small" />}
              onClick={() => setPriceOverrides({})}
            >
              Reset prices
            </Button>
          ) : null}
          <UpgradeCalcHelpButton />
          <CopyPlanLinkButton />
        </Stack>
      </Stack>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "340px minmax(0, 1fr)" },
          gap: 2,
          alignItems: "start",
        }}
      >
        <Paper
          sx={{
            p: 2,
            position: { md: "sticky" },
            top: { md: 8 },
            maxHeight: { md: "calc(100vh - 24px)" },
            overflow: { md: "auto" },
            alignSelf: "start",
          }}
          variant="outlined"
        >
          <Stack spacing={2}>
            <Tabs
              value={params.mode}
              onChange={(_, mode: CalcMode) => patch({ mode })}
              variant="fullWidth"
            >
              <Tab label="Upgrade" value="upgrade" />
              <Tab label="Compound" value="compound" />
            </Tabs>

            <SimEntityAutocomplete
              options={itemOptions}
              value={itemKey || null}
              label={params.mode === "compound" ? "Compound item" : "Upgrade item"}
              onChange={(value) => selectItem((value ?? "") as ItemKey | "")}
              getOptionLabel={(option) => {
                const item = G.items[option];
                return item?.name ? `${item.name} (${option})` : option;
              }}
              getPrimaryLabel={(option) => G.items[option]?.name ?? option}
              getSecondaryLabel={(option) => (G.items[option]?.name ? option : undefined)}
              filterOption={(key, q) => {
                if (key.toLowerCase().includes(q)) return true;
                const name = G.items[key]?.name;
                return Boolean(name && name.toLowerCase().includes(q));
              }}
              renderListIcon={(option) => (
                <ItemInstance itemInfo={{ name: option }} size={32} tooltip={false} />
              )}
              renderInputIcon={(option) => (
                <ItemInstance itemInfo={{ name: option }} size={24} tooltip={false} />
              )}
              inputIconBoxSx={{ width: 24, height: 24, overflow: "hidden", flexShrink: 0 }}
              fullWidth
            />

            <RecentItemsStrip
              items={recentItems}
              available={itemOptions}
              current={itemKey}
              onPick={(key) => selectItem(key)}
            />

            <Stack direction="row" alignItems="center" spacing={1}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" color="text.secondary">
                  Base item cost
                </Typography>
                {itemKey && priceOverrides[itemKey] != null ? (
                  <Typography variant="caption" color="primary.main">
                    edited
                  </Typography>
                ) : null}
              </Box>
              <PriceField
                value={itemValue}
                onChange={(n) => itemKey && setPrice(itemKey, n)}
                width={128}
              />
            </Stack>

            <LevelRangeControl
              mode={params.mode}
              from={params.from}
              target={params.target}
              maxTarget={maxTarget}
              onFrom={(from) => patch({ from })}
              onTarget={(target) => patch({ target })}
            />

            {params.mode === "upgrade" ? (
              <SidebarSection title="Chance modifiers">
                <Stack spacing={0.25}>
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={params.luckySlot}
                        onChange={(e) => patch({ luckySlot: e.target.checked })}
                      />
                    }
                    label="Lucky Slot"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={params.serverUgrace}
                        onChange={(e) => patch({ serverUgrace: e.target.checked })}
                      />
                    }
                    label="Server ugrace"
                  />
                  <Tooltip
                    title={
                      gItem && !itemAcceptsStatScroll(gItem)
                        ? "This item has no stat pool — property scrolls cannot apply"
                        : "Apply a property scroll with an offering for +1 item grace (server)"
                    }
                  >
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={params.statScrollGrace}
                          disabled={Boolean(gItem && !itemAcceptsStatScroll(gItem))}
                          onChange={(e) => patch({ statScrollGrace: e.target.checked })}
                        />
                      }
                      label="Stat scroll grace"
                    />
                  </Tooltip>
                </Stack>
              </SidebarSection>
            ) : null}

            <Divider />

            <Accordion
              disableGutters
              elevation={0}
              defaultExpanded={false}
              sx={{
                bgcolor: "transparent",
                "&:before": { display: "none" },
                boxShadow: "none",
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{ px: 0, minHeight: 36, "& .MuiAccordionSummary-content": { my: 0.5 } }}
              >
                <Box>
                  <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 0.6 }}>
                    Toolkit & prices
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {enabledOfferingCount}/{offeringKeys.length} offerings
                    {params.scroll4 ? " · scroll4 on" : ""}
                    {params.mode === "upgrade" && params.primlings ? " · primlings" : ""}
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 0, pt: 0 }}>
                <Stack spacing={2}>
                  <SidebarSection title="Offerings">
                    <Stack spacing={1.25}>
                      {offeringKeys.map((key) => (
                        <MaterialPriceRow
                          key={key}
                          itemKey={key}
                          label={materialLabel(key)}
                          price={prices[key] ?? 0}
                          onPriceChange={(n) => setPrice(key, n)}
                          overridden={priceOverrides[key] != null}
                          enabled={offeringEnabled(key, params)}
                          onEnabledChange={(v) => {
                            if (key === "offeringp") patch({ offeringp: v });
                            else if (key === "offering") patch({ offering: v });
                            else patch({ offeringx: v });
                          }}
                          extra={
                            key === "offeringp" && params.mode === "upgrade" ? (
                              <FormControlLabel
                                sx={{ ml: 4.5, mr: 0 }}
                                control={
                                  <Switch
                                    size="small"
                                    checked={params.primlings}
                                    onChange={(e) => patch({ primlings: e.target.checked })}
                                  />
                                }
                                label={
                                  <Typography variant="caption" color="text.secondary">
                                    Primling stacks
                                  </Typography>
                                }
                              />
                            ) : null
                          }
                        />
                      ))}
                    </Stack>
                  </SidebarSection>

                  <SidebarSection title="Scrolls">
                    <Stack spacing={1.25}>
                      {scrollKeys.map((key) => (
                        <MaterialPriceRow
                          key={key}
                          itemKey={key}
                          label={materialLabel(key)}
                          price={prices[key] ?? 0}
                          onPriceChange={(n) => setPrice(key, n)}
                          overridden={priceOverrides[key] != null}
                          enabled={key === "scroll4" ? params.scroll4 : undefined}
                          onEnabledChange={
                            key === "scroll4" ? (v) => patch({ scroll4: v }) : undefined
                          }
                        />
                      ))}
                      {params.mode === "upgrade" && params.statScrollGrace ? (
                        <MaterialPriceRow
                          itemKey={STAT_SCROLL_PROXY_KEY}
                          label={`${materialLabel(STAT_SCROLL_PROXY_KEY)} (grace proxy)`}
                          price={prices[STAT_SCROLL_PROXY_KEY] ?? 0}
                          onPriceChange={(n) => setPrice(STAT_SCROLL_PROXY_KEY, n)}
                          overridden={priceOverrides[STAT_SCROLL_PROXY_KEY] != null}
                        />
                      ) : null}
                    </Stack>
                  </SidebarSection>
                </Stack>
              </AccordionDetails>
            </Accordion>
          </Stack>
        </Paper>

        <Stack spacing={2} sx={{ minWidth: 0 }}>
          {!itemKey && (
            <EmptyPickState
              mode={params.mode}
              available={itemOptions}
              recent={recentItems}
              onPick={(key) => selectItem(key)}
            />
          )}

          {itemKey && midPathStart ? (
            <Alert severity="info" sx={{ py: 0.5 }}>
              Mid-path starts use the max-chance chain per step. Pareto Cheapest still needs a +0
              start.
            </Alert>
          ) : null}

          {itemKey ? (
            <>
              {!midPathStart ? (
                <>
                  <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={params.strategy}
                    onChange={(_, v: CalcStrategy | null) => v && patch({ strategy: v })}
                    sx={{ display: { xs: "flex", sm: "none" }, alignSelf: "stretch" }}
                    fullWidth
                  >
                    <ToggleButton value="cheapest">Cheapest</ToggleButton>
                    <ToggleButton value="fewest">Fewest</ToggleButton>
                  </ToggleButtonGroup>

                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <StrategyCard
                      title="Cheapest"
                      subtitle="Pareto min expected gold"
                      selected={params.strategy === "cheapest"}
                      total={cheapestTotal}
                      attempts={cheapestAttempts}
                      oneshotPct={cheapestSummary ? oneshotPercent(cheapestSummary.steps) : null}
                      badge={strategyCompareBadge(
                        "cheapest",
                        strategyGoldDelta,
                        strategyAttemptDelta,
                      )}
                      materialsSum={cheapestMats?.materialsSum}
                      destroyGap={cheapestMats?.destroyGap}
                      onSelect={() => patch({ strategy: "cheapest" as CalcStrategy })}
                    />
                    <StrategyCard
                      title="Fewest Copies"
                      subtitle="Max chance / fewer bases"
                      selected={params.strategy === "fewest"}
                      total={fewestTotal}
                      attempts={fewestAttempts}
                      oneshotPct={fewestSummary ? oneshotPercent(fewestSummary.steps) : null}
                      badge={strategyCompareBadge(
                        "fewest",
                        strategyGoldDelta,
                        strategyAttemptDelta,
                      )}
                      materialsSum={fewestMats?.materialsSum}
                      destroyGap={fewestMats?.destroyGap}
                      onSelect={() => patch({ strategy: "fewest" as CalcStrategy })}
                    />
                  </Stack>
                </>
              ) : null}

              {!summary ? (
                <Paper sx={{ p: 3 }} variant="outlined">
                  <Typography color="text.secondary">
                    No valid path with the current toolkit. Enable more offerings or scrolls in
                    Toolkit & prices, or lower the target.
                  </Typography>
                </Paper>
              ) : (
                <>
                  <PathLadder
                    steps={summary.steps}
                    focusStep={focusStep}
                    recipeClipboard={formatRecipeClipboard(summary.steps, {
                      itemName,
                      rangeLabel:
                        params.mode === "compound"
                          ? `compound to +${params.target}`
                          : params.from > 0
                          ? `+${params.from} → +${params.target}`
                          : `upgrade to +${params.target}`,
                      strategyLabel: midPathStart
                        ? "Fewest copies"
                        : params.strategy === "fewest"
                        ? "Fewest copies"
                        : "Cheapest",
                      planEv: summary.totalExpectedCost,
                    })}
                  />
                  <PlanHero
                    itemKey={itemKey}
                    itemName={itemName}
                    mode={params.mode}
                    from={params.from}
                    target={params.target}
                    strategy={midPathStart ? "fewest" : params.strategy}
                    planEv={summary.totalExpectedCost}
                    materialsSum={materialsSum}
                    destroyGap={destroyGap}
                    totalAttempts={totalAttempts}
                    oneshotPct={oneshotPct}
                    shrineTime={
                      shrineMsTotal != null && Number.isFinite(shrineMsTotal)
                        ? formatShrineTime(shrineMsTotal)
                        : shrineMsTotal != null
                        ? "∞"
                        : null
                    }
                    bottleneck={bottleneck}
                    showMetrics={!showStrategyCards}
                    alternateStrategy={alternateStrategy}
                    onBottleneckClick={() => {
                      if (bottleneck) {
                        setFocusStep((prev) => ({
                          key: pathStepKey(bottleneck),
                          token: (prev?.token ?? 0) + 1,
                        }));
                      }
                      document.getElementById("upgrade-recipe-path")?.scrollIntoView({
                        behavior: "smooth",
                        block: "nearest",
                      });
                    }}
                  />
                  <PlanModifiersChips
                    luckySlot={params.luckySlot}
                    serverUgrace={params.serverUgrace}
                    statScrollGrace={params.statScrollGrace}
                    statScrollAvailable={!gItem || itemAcceptsStatScroll(gItem)}
                    primlings={params.primlings}
                    scroll4={params.scroll4}
                    offeringp={params.offeringp}
                    offering={params.offering}
                    offeringx={params.offeringx}
                    mode={params.mode}
                    onToggle={(key) => patch({ [key]: !params[key] })}
                  />
                  <MaterialsPanel
                    materials={summary.materials}
                    materialLabel={materialLabel}
                    planEv={summary.totalExpectedCost}
                  />
                  <StepPlanTable steps={summary.steps} />
                </>
              )}
            </>
          ) : null}
        </Stack>
      </Box>
    </Box>
  );
}
