import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
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
  Link,
  Paper,
  Stack,
  Switch,
  Tab,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { GCraft, ItemKey } from "typed-adventureland";

import {
  applyShinyPolishToSummary,
  ChanceTables,
  COMPOUND_SCROLL_KEYS,
  craftCostToMaterialLines,
  craftExpectedCost,
  defaultPriceTable,
  formatChancePct,
  formatGold,
  formatShrineTime,
  getItemGrade,
  GREED_QUICK_PICKS,
  GreedScrollKey,
  itemAcceptsStatScroll,
  itemHasCraftRecipe,
  listShinyPolishOptions,
  MaterialLine,
  mergeUpgradeStepOverrides,
  minGreedEligibleLevel,
  OFFERING_KEYS,
  pickShinyPolish,
  planCompoundPath,
  planGreedFarm,
  planUpgradePath,
  planUpgradePathBestOdds,
  PlannerContext,
  PlanSummaryStep,
  POLISH_MATERIAL_KEYS,
  PriceTable,
  recomputeUpgradePlan,
  scrollKeyForUpgrade,
  seedMissingPrices,
  STAT_SCROLL_PROXY_KEY,
  summarizeCompoundPlan,
  summarizeUpgradePlan,
  summarizeUpgradeSideEffects,
  UpgradePathStep,
  UpgradeStepOverride,
  upgradeStepOverrideKey,
  UPGRADE_SCROLL_KEYS,
} from "../calculators";
import { GDataContext } from "../GDataContext";
import { SimEntityAutocomplete } from "../DropSimulator/SimEntityAutocomplete";
import { ItemInstance } from "../Shared/ItemInstance";
import { useMerchants } from "../Market/useMerchants";
import { UpgradeCalcHelpButton } from "./UpgradeCalcHelp";
import { GreedFarmResults, greedCompareForLevel } from "./GreedFarmResults";
import {
  ChanceByLevelChart,
  CopyPlanLinkButton,
  EvDeltaBanner,
  formatRecipeClipboard,
  MaterialsPanel,
  materialsTotals,
  PlanHero,
  PlanModifiersChips,
  SideEffectsPanel,
  StepPlanTable,
  StrategyCard,
} from "./PlanResults";
import { AcquireMode, CalcMode, CalcStrategy, useUpgradeCalcParams } from "./useUpgradeCalcParams";

import {
  heaviestStep,
  offeringEnabled,
  offeringList,
  oneshotPercent,
  planTotal,
  pushRecentItem,
  readRecentItems,
  strategyCompareBadge,
  sumAttempts,
  TARGET_COMPOUND,
  TARGET_UPGRADE,
} from "./upgradeCalcHelpers";
import { CraftRecipeBreakdown, MaterialPriceRow, PriceField } from "./UpgradeCalcPricing";
import { LevelRangeControl, LevelStepper, SidebarSection } from "./UpgradeCalcControls";
import { EmptyPickState, RecentItemsStrip } from "./UpgradeCalcPicker";

const UPGRADE_ISSUES_URL =
  "https://github.com/adventureland-community/al-data-explorer/issues/new?title=Upgrade%20Calculator%3A%20";

type PlanSummary = {
  steps: PlanSummaryStep[];
  materials: MaterialLine[];
  totalExpectedCost: number;
};

export function UpgradeCalculator() {
  const G = useContext(GDataContext);
  const { params, patch, priceOverrides, setPriceOverrides } = useUpgradeCalcParams();
  const { items: marketItems } = useMerchants();
  const [stepOverrides, setStepOverrides] = useState<Record<string, UpgradeStepOverride>>({});
  const [recentItems, setRecentItems] = useState<ItemKey[]>(() => readRecentItems());
  const [evDelta, setEvDelta] = useState<number | null>(null);
  const [evDeltaVisible, setEvDeltaVisible] = useState(false);
  const prevEvRef = useRef<number | null>(null);
  const evDeltaTimerRef = useRef<number | null>(null);

  const itemKey = (params.item || "") as ItemKey;
  const gItem = G?.items?.[itemKey];
  const craftMap = G?.craft as Record<string, GCraft> | undefined;
  const canCraft = Boolean(itemKey && itemHasCraftRecipe(craftMap, itemKey));

  const selectItem = (key: ItemKey | "") => {
    if (key) setRecentItems(pushRecentItem(key));
    if (key && params.mode === "greed" && G?.items?.[key]) {
      const def = G.items[key];
      const minLv = minGreedEligibleLevel(def);
      const from = Number.isFinite(minLv) ? minLv : 0;
      const grade = getItemGrade(def, from);
      const minScroll = scrollKeyForUpgrade(Math.max(1, grade)) ?? "scroll1";
      patch({ item: key, from, greedScroll: minScroll });
      return;
    }
    const next: { item: ItemKey | ""; acquire?: AcquireMode } = { item: key };
    if (key && params.acquire === "craft" && !itemHasCraftRecipe(craftMap, key)) {
      next.acquire = "buy";
    }
    patch(next);
  };

  const basePrices = useMemo(() => {
    if (!G?.items) return {};
    const defaults = defaultPriceTable(G.items, itemKey || undefined);
    return seedMissingPrices({
      prices: defaults,
      keys: [...Object.keys(defaults), ...(itemKey ? [itemKey] : [])],
      items: G.items,
      market: marketItems,
    });
  }, [G, itemKey, marketItems]);

  const prices = useMemo(() => {
    if (!G?.items) return { ...basePrices, ...priceOverrides };
    let merged: PriceTable = { ...basePrices, ...priceOverrides };
    if (itemKey && itemHasCraftRecipe(craftMap, itemKey)) {
      // Probe once for unresolved leaves, seed market/vendor, keep overrides on top.
      const probe = craftExpectedCost({ itemKey, prices: merged, craft: craftMap });
      if (!probe.ok && probe.unresolved.length) {
        merged = seedMissingPrices({
          prices: merged,
          keys: probe.unresolved,
          items: G.items,
          market: marketItems,
        });
        merged = { ...merged, ...priceOverrides };
      }
    }
    return merged;
  }, [G, basePrices, priceOverrides, itemKey, craftMap, marketItems]);

  const craftCost = useMemo(() => {
    if (!itemKey || !canCraft) return null;
    return craftExpectedCost({ itemKey, prices, craft: craftMap });
  }, [itemKey, canCraft, prices, craftMap]);

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
        allowPrimstacking: params.primstacking,
        allowScroll4: params.scroll4,
        allowStatScrollGrace: params.statScrollGrace,
        offerings: offeringList(params),
      },
    };
  }, [G, prices, tables, params]);

  const buyUnit =
    typeof prices[itemKey] === "number" && Number.isFinite(prices[itemKey])
      ? prices[itemKey]
      : typeof gItem?.g === "number" && gItem.g > 0
      ? gItem.g
      : 0;

  const craftIncomplete =
    params.acquire === "craft" && canCraft && craftCost != null && !craftCost.ok;
  /** Craft mode with missing leaf prices — do not silently plan as Buy. */
  const craftBlocksPlan = craftIncomplete;

  /** Replacement / destroy accounting unit for the path planner. */
  const itemValue = (() => {
    if (craftBlocksPlan) return 0;
    if (params.acquire === "craft" && craftCost?.ok) return craftCost.cost;
    return buyUnit;
  })();

  /** Gold charged per expected copy on the Acquire row. */
  const acquireChargePerCopy =
    params.acquire === "craft" && craftCost?.ok ? craftCost.cost : buyUnit;

  const craftMaterialLines: MaterialLine[] | null =
    params.acquire === "craft" && craftCost?.ok ? craftCostToMaterialLines(craftCost) : null;

  /** Pareto cheapest only supports +0 starts; mid-path falls back to max-chance. */
  const midPathStart = params.mode === "upgrade" && params.from > 0;
  const upgradeCostModel: "cheapest" | "fewest" =
    midPathStart || params.strategy === "fewest" ? "fewest" : "cheapest";

  const stepPlanIdentity = [
    itemKey,
    params.mode,
    params.from,
    params.target,
    params.strategy,
    params.acquire,
    itemValue,
    params.luckySlot,
    params.serverUgrace,
    params.statScrollGrace,
    params.primstacking,
    params.scroll4,
    params.offeringp,
    params.offering,
    params.offeringx,
  ].join("|");

  useEffect(() => {
    setStepOverrides({});
  }, [stepPlanIdentity]);

  // Shared links may set acquire=craft on non-craftable items — normalize to buy.
  useEffect(() => {
    if (params.acquire === "craft" && itemKey && !canCraft) {
      patch({ acquire: "buy" }, { replace: true });
    }
  }, [params.acquire, itemKey, canCraft, patch]);

  const cheapest = useMemo(() => {
    if (craftBlocksPlan || !ctx || !gItem || !itemKey || params.mode === "greed") return null;
    if (midPathStart) return null;
    if (params.mode === "compound") {
      return planCompoundPath(ctx, itemKey, itemValue, params.target, "costOptimal");
    }
    return planUpgradePath(ctx, itemKey, itemValue, params.target, {
      luckySlot: params.luckySlot,
      startLevel: params.from,
    });
  }, [craftBlocksPlan, midPathStart, ctx, gItem, itemKey, itemValue, params]);

  const fewest = useMemo(() => {
    if (craftBlocksPlan || !ctx || !gItem || !itemKey || params.mode === "greed") return null;
    if (params.mode === "compound") {
      return planCompoundPath(ctx, itemKey, itemValue, params.target, "bestOdds");
    }
    return planUpgradePathBestOdds(ctx, itemKey, itemValue, params.target, {
      luckySlot: params.luckySlot,
      startLevel: params.from,
    });
  }, [craftBlocksPlan, ctx, gItem, itemKey, itemValue, params]);

  const greedFarm = useMemo(() => {
    if (params.mode !== "greed" || !gItem?.upgrade || !itemKey) return null;
    return planGreedFarm({
      gItem,
      itemKey,
      level: params.from,
      scrollKey: params.greedScroll,
      offering: params.greedOffering,
      itemUnit: itemValue,
      prices,
      luckySlot: params.luckySlot,
      tables,
      targetCount: params.greedTarget,
    });
  }, [params, gItem, itemKey, itemValue, prices, tables]);

  const greedCompare = useMemo(() => {
    if (params.mode !== "greed" || !gItem?.upgrade || !itemKey) return [];
    return greedCompareForLevel({
      gItem,
      itemKey,
      level: params.from,
      itemUnit: itemValue,
      prices,
      luckySlot: params.luckySlot,
      tables,
    });
  }, [params, gItem, itemKey, itemValue, prices, tables]);

  const itemIgrade = gItem ? getItemGrade(gItem, 0) : 0;

  const summarizeOpts = useMemo(
    () => ({
      igrade: itemIgrade,
      itemKey,
      itemValue,
      forceAcquire: itemValue > 0 || acquireChargePerCopy > 0,
      acquireChargePerCopy,
      craftMaterialLines,
      acquireMode: params.acquire,
    }),
    [itemIgrade, itemKey, itemValue, acquireChargePerCopy, craftMaterialLines, params.acquire],
  );

  const shinyPolish = useMemo(() => {
    if (!params.wantShiny || params.from > 0 || params.mode !== "upgrade" || !gItem?.upgrade) {
      return null;
    }
    return pickShinyPolish({
      gItem,
      itemValue,
      prices,
      preferredKey: params.polish || null,
    });
  }, [params.wantShiny, params.from, params.mode, params.polish, gItem, itemValue, prices]);

  const shinyPolishOptions = useMemo(() => {
    if (params.mode !== "upgrade" || !gItem?.upgrade) return [];
    return listShinyPolishOptions({ gItem, itemValue, prices });
  }, [params.mode, gItem, itemValue, prices]);

  const withOptionalShiny = (base: PlanSummary | null): PlanSummary | null => {
    if (!base || !shinyPolish) return base;
    return applyShinyPolishToSummary({
      summary: base,
      polish: shinyPolish,
      targetLevel: params.target,
    });
  };

  /** Always recompute so BASE/MAX chance and override edits stay consistent. */
  const withUpgradeOverrides = (
    plan: { steps: UpgradePathStep[]; totalExpectedCost: number },
    costModel: "cheapest" | "fewest",
  ) => {
    if (!ctx || !itemKey) return plan;
    const merged = mergeUpgradeStepOverrides(plan.steps, stepOverrides);
    return (
      recomputeUpgradePlan({
        ctx,
        itemName: itemKey,
        itemValue,
        steps: merged,
        costModel,
        luckySlot: params.luckySlot,
      }) ?? plan
    );
  };

  const cheapestSummary = useMemo((): PlanSummary | null => {
    if (!cheapest) return null;
    let base: PlanSummary | null = null;
    if (params.mode === "compound" && "path" in cheapest) {
      base = summarizeCompoundPlan(cheapest, prices, summarizeOpts);
    } else if ("steps" in cheapest) {
      const plan = withUpgradeOverrides(cheapest, "cheapest");
      base = summarizeUpgradePlan(plan, prices, "upgrade", summarizeOpts);
    }
    return withOptionalShiny(base);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- helpers close over shinyPolish / overrides
  }, [
    cheapest,
    summarizeOpts,
    params.mode,
    params.target,
    params.luckySlot,
    prices,
    shinyPolish,
    stepOverrides,
    ctx,
    itemKey,
    itemValue,
  ]);

  const fewestSummary = useMemo((): PlanSummary | null => {
    if (!fewest) return null;
    let base: PlanSummary | null = null;
    if (params.mode === "compound" && "path" in fewest) {
      base = summarizeCompoundPlan(fewest, prices, summarizeOpts);
    } else if ("steps" in fewest) {
      const plan = withUpgradeOverrides(fewest, "fewest");
      base = summarizeUpgradePlan(plan, prices, "upgrade", summarizeOpts);
    }
    return withOptionalShiny(base);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- helpers close over shinyPolish / overrides
  }, [
    fewest,
    summarizeOpts,
    params.mode,
    params.target,
    params.luckySlot,
    prices,
    shinyPolish,
    stepOverrides,
    ctx,
    itemKey,
    itemValue,
  ]);

  const summary = midPathStart || params.strategy === "fewest" ? fewestSummary : cheapestSummary;

  /** Recomputed upgrade recipe (for chance chart + step edits). */
  const activeUpgradePlan = useMemo(() => {
    if (craftBlocksPlan || !ctx || !gItem || !itemKey || params.mode !== "upgrade") return null;
    const raw = midPathStart || params.strategy === "fewest" ? fewest : cheapest;
    if (!raw || !("steps" in raw)) return null;
    return withUpgradeOverrides(raw, upgradeCostModel);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- withUpgradeOverrides closes over overrides
  }, [
    craftBlocksPlan,
    ctx,
    gItem,
    itemKey,
    params.mode,
    params.strategy,
    midPathStart,
    fewest,
    cheapest,
    upgradeCostModel,
    stepOverrides,
    params.luckySlot,
    itemValue,
  ]);

  const patchStepOverride = (
    fromLevel: number,
    toLevel: number,
    stepPatch: UpgradeStepOverride,
  ) => {
    const key = upgradeStepOverrideKey(fromLevel, toLevel);
    setStepOverrides((prev) => {
      const next = { ...prev, [key]: { ...prev[key], ...stepPatch } };
      return next;
    });
  };

  const clearStepOverride = (fromLevel: number, toLevel: number) => {
    const key = upgradeStepOverrideKey(fromLevel, toLevel);
    setStepOverrides((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const sideEffects = useMemo(() => {
    if (!summary) return null;
    if (params.mode !== "upgrade" && params.mode !== "compound") return null;
    return summarizeUpgradeSideEffects({
      steps: summary.steps,
      gItem,
      itemKey: itemKey ?? undefined,
      mode: params.mode,
    });
  }, [summary, gItem, itemKey, params.mode]);

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

  const cheapestTotal = cheapestSummary?.totalExpectedCost ?? planTotal(cheapest);
  const fewestTotal = fewestSummary?.totalExpectedCost ?? planTotal(fewest);
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
        // Upgrade + Greed farm both need upgradeable gear (any source: vendor, drop, event).
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
    setPriceOverrides((prev) => ({ ...prev, [key]: n }), { replace: true });
  };

  const materialLabel = (key: string) => {
    if (key === "_stacks") return "Stack farms (failstack / ograce)";
    if (key === "_craft_fee") return "Craft fee";
    return G?.items?.[key as ItemKey]?.name ?? key;
  };

  if (!G) {
    return <Typography>Loading game data…</Typography>;
  }

  const itemName = gItem?.name ?? itemKey;
  const pathMode: Exclude<CalcMode, "greed"> | null =
    params.mode === "upgrade" || params.mode === "compound" ? params.mode : null;

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
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
            <Typography variant="h5" component="h1">
              Upgrade Calculator
            </Typography>
            <Chip size="small" color="warning" label="WIP" />
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {itemKey && gItem
              ? `${gItem.name} · ${
                  params.mode === "greed"
                    ? `greed farm at +${params.from}`
                    : params.mode === "compound"
                    ? `compound to +${params.target}`
                    : params.from > 0
                    ? `+${params.from} → +${params.target}`
                    : `upgrade to +${params.target}`
                }`
              : "Plan upgrade/compound paths, or farm Essence of Greed from any upgradeable item (set its unit price)."}
          </Typography>
          <Alert severity="info" sx={{ py: 0.5 }}>
            Work in progress — please{" "}
            <Link href={UPGRADE_ISSUES_URL} target="_blank" rel="noopener noreferrer">
              report bugs, issues, and improvement ideas
            </Link>
            .
          </Alert>
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
              onClick={() => setPriceOverrides({}, { replace: true })}
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
              <Tab label="Greed" value="greed" />
            </Tabs>

            <SimEntityAutocomplete
              options={itemOptions}
              value={itemKey || null}
              label={
                params.mode === "compound"
                  ? "Compound item"
                  : params.mode === "greed"
                  ? "Farm item"
                  : "Upgrade item"
              }
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

            {params.mode !== "greed" ? (
              <SidebarSection title="Acquire">
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  fullWidth
                  value={params.acquire}
                  onChange={(_, v: AcquireMode | null) => {
                    if (!v) return;
                    if (v === "craft" && !canCraft) return;
                    patch({ acquire: v });
                  }}
                >
                  <ToggleButton value="buy">Buy</ToggleButton>
                  <ToggleButton value="craft" disabled={!canCraft}>
                    Craft
                  </ToggleButton>
                </ToggleButtonGroup>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                  sx={{ mt: 0.75 }}
                >
                  {params.acquire === "craft"
                    ? "Cost = craft fee + materials. Override any unit price below."
                    : "Charge market/vendor unit price per expected base copy."}
                </Typography>
                {params.acquire === "craft" && craftCost ? (
                  <CraftRecipeBreakdown
                    craftCost={craftCost}
                    materialLabel={materialLabel}
                    prices={prices}
                    priceOverrides={priceOverrides}
                    onPriceChange={setPrice}
                  />
                ) : null}
              </SidebarSection>
            ) : null}

            {params.acquire !== "craft" ? (
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" color="text.secondary">
                    {params.mode === "greed" ? "Item unit price" : "Base item cost"}
                  </Typography>
                  {itemKey && priceOverrides[itemKey] != null ? (
                    <Typography variant="caption" color="primary.main">
                      edited
                    </Typography>
                  ) : params.mode === "greed" ? (
                    <Typography variant="caption" color="text.secondary">
                      vendor / market / event
                    </Typography>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      override · else market · else vendor .g
                    </Typography>
                  )}
                </Box>
                <PriceField
                  value={buyUnit}
                  onChange={(n) => itemKey && setPrice(itemKey, n)}
                  width={128}
                />
              </Stack>
            ) : null}

            {params.mode === "greed" ? (
              <>
                <SidebarSection title="Quick picks">
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {GREED_QUICK_PICKS.filter((k) => G.items[k]?.upgrade).map((key) => (
                      <Chip
                        key={key}
                        size="small"
                        label={G.items[key]?.name ?? key}
                        color={itemKey === key ? "primary" : "default"}
                        variant={itemKey === key ? "filled" : "outlined"}
                        onClick={() => selectItem(key)}
                      />
                    ))}
                  </Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    sx={{ mt: 0.75 }}
                  >
                    Any upgradeable item works — edit unit price for drops and event gear.
                  </Typography>
                </SidebarSection>

                <SidebarSection title="Farm level">
                  <Stack spacing={1}>
                    <LevelStepper
                      label="Level"
                      value={params.from}
                      min={0}
                      max={12}
                      onChange={(from) => patch({ from })}
                    />
                    {gItem ? (
                      <Typography variant="caption" color="text.secondary">
                        High grade+ from +{minGreedEligibleLevel(gItem)}
                        {greedFarm && greedFarm.eligible
                          ? ` · ${formatChancePct(greedFarm.chance)} with kit`
                          : ""}
                      </Typography>
                    ) : null}
                  </Stack>
                </SidebarSection>

                <SidebarSection title="Target essences">
                  <LevelStepper
                    label="Count"
                    value={params.greedTarget}
                    min={1}
                    max={100}
                    onChange={(greedTarget) => patch({ greedTarget })}
                  />
                </SidebarSection>

                <SidebarSection title="Scroll">
                  <ToggleButtonGroup
                    exclusive
                    size="small"
                    fullWidth
                    value={params.greedScroll}
                    onChange={(_, v: GreedScrollKey | null) => v && patch({ greedScroll: v })}
                  >
                    {(["scroll0", "scroll1", "scroll2", "scroll3"] as const).map((key) => (
                      <ToggleButton key={key} value={key} sx={{ fontSize: 11, px: 0.5 }}>
                        {key.replace("scroll", "s")}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </SidebarSection>

                <SidebarSection title="Offering">
                  <ToggleButtonGroup
                    exclusive
                    size="small"
                    fullWidth
                    value={params.greedOffering == null ? "none" : String(params.greedOffering)}
                    onChange={(_, v: string | null) => {
                      if (v == null) return;
                      if (v === "none") patch({ greedOffering: null });
                      else patch({ greedOffering: Number(v) as 0 | 1 | 2 });
                    }}
                  >
                    <ToggleButton value="none" sx={{ fontSize: 11, px: 0.5 }}>
                      None
                    </ToggleButton>
                    <ToggleButton value="0" sx={{ fontSize: 11, px: 0.5 }}>
                      Primling
                    </ToggleButton>
                    <ToggleButton value="1" sx={{ fontSize: 11, px: 0.5 }}>
                      Primordial
                    </ToggleButton>
                    <ToggleButton value="2" sx={{ fontSize: 11, px: 0.5 }}>
                      Prim X
                    </ToggleButton>
                  </ToggleButtonGroup>
                </SidebarSection>

                <SidebarSection title="Chance modifiers">
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
                </SidebarSection>
              </>
            ) : (
              <LevelRangeControl
                mode={params.mode}
                from={params.from}
                target={params.target}
                maxTarget={maxTarget}
                onFrom={(from) => patch({ from })}
                onTarget={(target) => patch({ target })}
              />
            )}

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
                  <Tooltip
                    title={
                      params.from > 0
                        ? "Shiny polish is only valid at +0 — set From to +0 to enable"
                        : "Polish the +0 copy with an ingot/nugget for Shiny (server allows polish only at level 0; fail keeps the item)"
                    }
                  >
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={params.wantShiny}
                          disabled={params.from > 0}
                          onChange={(e) => patch({ wantShiny: e.target.checked })}
                        />
                      }
                      label="Polish Shiny"
                    />
                  </Tooltip>
                </Stack>
              </SidebarSection>
            ) : null}

            <Divider />

            <Accordion
              disableGutters
              elevation={0}
              defaultExpanded
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
                    {params.mode === "greed"
                      ? "Scroll & offering unit prices"
                      : `${enabledOfferingCount}/${offeringKeys.length} offerings${
                          params.scroll4 ? " · scroll4 on" : ""
                        }${
                          params.mode === "upgrade" && params.primstacking ? " · primstacking" : ""
                        }`}
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
                          enabled={
                            params.mode === "greed" ? undefined : offeringEnabled(key, params)
                          }
                          onEnabledChange={
                            params.mode === "greed"
                              ? undefined
                              : (v) => {
                                  if (key === "offeringp") patch({ offeringp: v });
                                  else if (key === "offering") patch({ offering: v });
                                  else patch({ offeringx: v });
                                }
                          }
                          extra={
                            key === "offeringp" && params.mode === "upgrade" ? (
                              <FormControlLabel
                                sx={{ ml: 4.5, mr: 0 }}
                                control={
                                  <Switch
                                    size="small"
                                    checked={params.primstacking}
                                    onChange={(e) => patch({ primstacking: e.target.checked })}
                                  />
                                }
                                label={
                                  <Typography variant="caption" color="text.secondary">
                                    Allow primstacking
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

                  {params.mode === "upgrade" ? (
                    <SidebarSection title="Shiny polish">
                      <Stack spacing={1.25}>
                        {params.wantShiny ? (
                          <Typography variant="caption" color="text.secondary">
                            Select a material (or leave auto for cheapest EV). Polish runs at +0
                            only; fail consumes the polish but keeps the item. Title survives later
                            upgrades.
                          </Typography>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            Enable Polish Shiny under Chance modifiers to polish the +0 copy before
                            upgrading.
                          </Typography>
                        )}
                        {POLISH_MATERIAL_KEYS.map((key) => {
                          const opt = shinyPolishOptions.find((o) => o.key === key);
                          const selected =
                            params.wantShiny &&
                            (params.polish === key || (!params.polish && shinyPolish?.key === key));
                          const invalid = opt?.invalid ?? false;
                          return (
                            <Stack key={key} spacing={0.5}>
                              <MaterialPriceRow
                                itemKey={key}
                                label={materialLabel(key)}
                                price={prices[key] ?? 0}
                                onPriceChange={(n) => setPrice(key, n)}
                                overridden={priceOverrides[key] != null}
                                enabled={params.wantShiny ? !invalid && selected : undefined}
                                onEnabledChange={
                                  params.wantShiny && !invalid
                                    ? (on) =>
                                        patch({
                                          polish: on ? key : "",
                                          wantShiny: true,
                                        })
                                    : undefined
                                }
                              />
                              {params.wantShiny && opt && !opt.invalid ? (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ pl: 4.5, fontVariantNumeric: "tabular-nums" }}
                                >
                                  {formatChancePct(opt.chance)} · EV {formatGold(opt.expectedCost)}
                                  {selected && !params.polish ? " · auto" : ""}
                                </Typography>
                              ) : null}
                              {params.wantShiny && invalid ? (
                                <Typography
                                  variant="caption"
                                  color="text.disabled"
                                  sx={{ pl: 4.5 }}
                                >
                                  Too low tier for this item
                                </Typography>
                              ) : null}
                            </Stack>
                          );
                        })}
                      </Stack>
                    </SidebarSection>
                  ) : null}
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

          {itemKey && params.mode === "greed" ? (
            <GreedFarmResults
              itemKey={itemKey}
              itemName={itemName}
              result={greedFarm}
              compareRows={greedCompare}
              onPickKit={(greedScroll, greedOffering) => patch({ greedScroll, greedOffering })}
            />
          ) : null}

          {itemKey && midPathStart && params.mode !== "greed" ? (
            <Alert severity="info" sx={{ py: 0.5 }}>
              Mid-path starts use the max-chance chain per step. Pareto Cheapest still needs a +0
              start.
            </Alert>
          ) : null}

          {itemKey && pathMode ? (
            <>
              {!midPathStart ? (
                <>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 1.25,
                      width: "100%",
                    }}
                  >
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
                  </Box>
                </>
              ) : null}

              {craftBlocksPlan ? (
                <Alert severity="warning">
                  Craft Acquire needs a unit price for every recipe material in the sidebar before
                  the upgrade plan can run.
                </Alert>
              ) : !summary ? (
                <Paper sx={{ p: 3 }} variant="outlined">
                  <Typography color="text.secondary">
                    No valid path with the current toolkit. Enable more offerings or scrolls in
                    Toolkit & prices, or lower the target.
                  </Typography>
                </Paper>
              ) : (
                <>
                  <PlanHero
                    itemKey={itemKey}
                    itemName={itemName}
                    mode={pathMode}
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
                      document.getElementById("upgrade-step-table")?.scrollIntoView({
                        behavior: "smooth",
                        block: "nearest",
                      });
                    }}
                  />
                  <PlanModifiersChips
                    luckySlot={params.luckySlot}
                    serverUgrace={params.serverUgrace}
                    statScrollGrace={params.statScrollGrace}
                    wantShiny={params.wantShiny}
                    shinyLabel={
                      shinyPolish ? `Shiny (${materialLabel(shinyPolish.key)})` : "Polish Shiny"
                    }
                    shinyAvailable={
                      params.mode === "upgrade" &&
                      params.from === 0 &&
                      Boolean(gItem?.upgrade) &&
                      shinyPolishOptions.some((o) => !o.invalid)
                    }
                    statScrollAvailable={!gItem || itemAcceptsStatScroll(gItem)}
                    primstacking={params.primstacking}
                    scroll4={params.scroll4}
                    offeringp={params.offeringp}
                    offering={params.offering}
                    offeringx={params.offeringx}
                    mode={pathMode}
                    onToggle={(key) => patch({ [key]: !params[key] })}
                  />
                  {pathMode === "upgrade" && ctx && itemKey && activeUpgradePlan?.steps.length ? (
                    <ChanceByLevelChart
                      ctx={ctx}
                      itemKey={itemKey}
                      steps={activeUpgradePlan.steps}
                      luckySlot={params.luckySlot}
                    />
                  ) : null}
                  {params.wantShiny && pathMode === "upgrade" && !shinyPolish ? (
                    <Alert severity="warning" sx={{ py: 0.5 }}>
                      No valid polish material for this item&apos;s grade. Raise polish tier or
                      check prices in Toolkit.
                    </Alert>
                  ) : null}
                  <StepPlanTable
                    steps={summary.steps}
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
                    stepEdit={
                      pathMode === "upgrade" && gItem
                        ? {
                            costModel: upgradeCostModel,
                            itemGradeAt: (level) => getItemGrade(gItem, level),
                            allowScroll4: params.scroll4,
                            offerings: offeringList(params),
                            allowPrimstacking: params.primstacking,
                            allowStatScrollGrace:
                              params.statScrollGrace && itemAcceptsStatScroll(gItem),
                            overrides: stepOverrides,
                            onPatch: patchStepOverride,
                            onReset: clearStepOverride,
                            onResetAll: () => setStepOverrides({}),
                            onCyclePolish:
                              params.wantShiny && shinyPolishOptions.some((o) => !o.invalid)
                                ? () => {
                                    const valid = shinyPolishOptions.filter((o) => !o.invalid);
                                    if (!valid.length) return;
                                    const curKey =
                                      params.polish || shinyPolish?.key || valid[0].key;
                                    const idx = valid.findIndex((o) => o.key === curKey);
                                    const next = valid[(idx + 1) % valid.length] ?? valid[0];
                                    patch({ polish: next.key, wantShiny: true });
                                  }
                                : undefined,
                          }
                        : null
                    }
                  />
                  <Box
                    sx={{
                      display: "grid",
                      gap: 2,
                      gridTemplateColumns: {
                        xs: "1fr",
                        md: sideEffects ? "minmax(0, 1.15fr) minmax(0, 1fr)" : "1fr",
                      },
                      alignItems: "stretch",
                    }}
                  >
                    <MaterialsPanel
                      materials={summary.materials}
                      materialLabel={materialLabel}
                      planEv={summary.totalExpectedCost}
                      acquireMode={params.acquire}
                    />
                    {sideEffects ? (
                      <SideEffectsPanel
                        summary={sideEffects}
                        mode={pathMode}
                        luckySlot={params.luckySlot}
                      />
                    ) : null}
                  </Box>
                </>
              )}
            </>
          ) : null}
        </Stack>
      </Box>
    </Box>
  );
}
