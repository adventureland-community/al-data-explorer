import RefreshIcon from "@mui/icons-material/Refresh";
import BuildCircleOutlinedIcon from "@mui/icons-material/BuildCircleOutlined";
import CallMergeOutlinedIcon from "@mui/icons-material/CallMergeOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CompressIcon from "@mui/icons-material/Compress";
import HourglassTopOutlinedIcon from "@mui/icons-material/HourglassTopOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import { Box, Button, CircularProgress, Paper, Stack, Tab, Tabs, Typography } from "@mui/material";
import { ReactElement, useContext, useMemo, useState } from "react";
import type { EntityTooltipLine } from "../gameData/entityTooltip";
import { craftRowKey } from "../gameData/craftRecipe";
import { CustomGData, GDataContext } from "../GDataContext";
import { useMerchants } from "../Market/useMerchants";
import type { Merchant } from "../Market/merchantTypes";
import { CraftCostLabel, RecipeItemTile } from "../Shared/RecipeItemTile";
import { ItemInstance } from "../Shared/ItemInstance";
import { abbreviateNumber, msToTime } from "../Shared/utils";
import { AggregatedBankItem, formatBankItemLabel, getUniqueItemKey } from "./bankItems";
import {
  analyzeCompoundCombines,
  analyzeCraftRecipes,
  BankSellLineItem,
  CombineRecipeStatus,
  computeBankSellBreakdown,
  computeStackConsolidation,
  CraftIngredientStatus,
  CraftRecipeStatus,
  estimateBankValue,
  groupCombineSteps,
} from "./bankAnalysis";
import { BankDataProps } from "./getBankData";

type BankInsightsSidebarProps = {
  bankData: BankDataProps;
  items: AggregatedBankItem[];
};

type SidebarTab = "craft" | "combine" | "stacks" | "market";

const rowSx = {
  py: 1.25,
  borderBottom: 1,
  borderColor: "divider",
  "&:last-child": { borderBottom: 0 },
};

const craftGridSx = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
  gap: 1.25,
  pt: 1,
};

const craftCardSx = {
  p: 1.25,
  border: 1,
  borderColor: "divider",
  borderRadius: 1,
  bgcolor: "background.paper",
};

function craftIngredientTooltipLines(
  ingredient: CraftIngredientStatus,
  opts?: { usageQty?: number; forPotentialBatch?: boolean },
): EntityTooltipLine[] {
  const lines: EntityTooltipLine[] = [
    {
      kind: "stat",
      label: "In bank",
      value: String(abbreviateNumber(ingredient.have)),
      labelColor: "text.secondary",
    },
  ];

  if (opts?.forPotentialBatch && opts.usageQty != null) {
    lines.push({
      kind: "stat",
      label: "Need",
      value: String(abbreviateNumber(opts.usageQty)),
      labelColor: "text.secondary",
    });
  }

  if (ingredient.missing > 0) {
    lines.push({
      kind: "stat",
      label: "Missing",
      value: String(abbreviateNumber(ingredient.missing)),
      labelColor: "text.secondary",
      valueColor: "#ff5252",
    });
  }

  return lines;
}

type InsightSection = "ready" | "almost";

const MAIN_TAB_HEIGHT = 40;

const mainTabSx = {
  minHeight: MAIN_TAB_HEIGHT,
  borderBottom: 1,
  borderColor: "divider",
  bgcolor: "background.paper",
  position: "sticky" as const,
  top: 0,
  zIndex: 3,
};

const subTabSx = {
  minHeight: 36,
  borderBottom: 1,
  borderColor: "divider",
  bgcolor: "background.paper",
  position: "sticky" as const,
  top: MAIN_TAB_HEIGHT,
  zIndex: 2,
  "& .MuiTab-root": { minHeight: 36, py: 0.5, fontSize: "0.72rem" },
};

function combineStepCount(combine: CombineRecipeStatus, mode: "ready" | "missing"): number {
  return mode === "ready" ? combine.combineReadyCount : combine.potentialCombineCount;
}

function combineInputTooltipLines(
  combine: CombineRecipeStatus,
  mode: "ready" | "missing",
): EntityTooltipLine[] {
  const count = combineStepCount(combine, mode);
  const uses = count * 3;

  const lines: EntityTooltipLine[] = [
    {
      kind: "stat",
      label: "In bank",
      value: String(abbreviateNumber(combine.have)),
      labelColor: "text.secondary",
    },
  ];

  if (combine.cascadeIn > 0) {
    lines.push({
      kind: "stat",
      label: `From +${combine.level - 1} combines`,
      value: String(abbreviateNumber(combine.cascadeIn)),
      labelColor: "text.secondary",
      valueColor: "#81c784",
    });
  }

  if (count > 0) {
    lines.push(
      {
        kind: "stat",
        label: "Combines",
        value: String(abbreviateNumber(count)),
        labelColor: "text.secondary",
      },
      {
        kind: "stat",
        label: "Uses",
        value: `${abbreviateNumber(uses)} copies`,
        labelColor: "text.secondary",
      },
    );
  }

  if (combine.missing > 0) {
    lines.push({
      kind: "stat",
      label: "Missing",
      value: String(abbreviateNumber(combine.missing)),
      labelColor: "text.secondary",
      valueColor: "#ff5252",
    });
  }

  return lines;
}

function combineInputBadge(
  combine: CombineRecipeStatus,
  mode: "ready" | "missing",
): { quantity: number; color?: string } {
  const isShort = mode === "missing" && combine.missing > 0;
  if (isShort) {
    return { quantity: combine.missing, color: "#ff5252" };
  }
  return { quantity: combine.effectiveHave };
}

function CombineArrow() {
  return (
    <Typography
      aria-hidden
      color="text.secondary"
      sx={{
        alignSelf: "center",
        fontSize: "1.25rem",
        lineHeight: 1,
        px: 0.25,
        userSelect: "none",
      }}
    >
      ←
    </Typography>
  );
}

function BankCombineChainCard({
  steps,
  mode,
}: {
  steps: CombineRecipeStatus[];
  mode: "ready" | "missing";
}) {
  const sorted = [...steps].sort((a, b) => a.level - b.level);
  const finalStep = sorted[sorted.length - 1]!;
  const finalCount = combineStepCount(finalStep, mode);

  return (
    <Box sx={craftCardSx}>
      {mode === "missing" && finalStep.combineReadyCount > 0 && (
        <Typography
          variant="caption"
          color="success.main"
          sx={{ display: "block", textAlign: "center", mb: 0.5, fontWeight: 600 }}
        >
          {abbreviateNumber(finalStep.combineReadyCount)} ready now ·{" "}
          {abbreviateNumber(finalCount - finalStep.combineReadyCount)} more if restocked
        </Typography>
      )}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", textAlign: "center", mb: 0.75, fontWeight: 600 }}
      >
        Result: {abbreviateNumber(finalCount)} × +{finalStep.outputLevel}
      </Typography>
      <Stack
        direction="row"
        alignItems="flex-start"
        flexWrap="wrap"
        sx={{ gap: 0.75, justifyContent: "center" }}
      >
        <RecipeItemTile
          itemKey={finalStep.itemKey}
          level={finalStep.outputLevel}
          title={finalStep.title}
          quantity={finalCount}
          showQuantity
          forceShowQuantity
        />

        {[...sorted].reverse().map((step) => {
          const badge = combineInputBadge(step, mode);

          return (
            <Stack
              key={`${step.itemKey}-${step.level}-${step.title ?? ""}`}
              direction="row"
              alignItems="flex-start"
              sx={{ gap: 0.75 }}
            >
              <CombineArrow />
              <RecipeItemTile
                itemKey={step.itemKey}
                level={step.level}
                title={step.title}
                quantity={badge.quantity}
                showQuantity
                forceShowQuantity
                quantityColor={badge.color}
                tooltipExtraLines={combineInputTooltipLines(step, mode)}
              />
            </Stack>
          );
        })}
      </Stack>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", textAlign: "center", mt: 0.75 }}
      >
        3 copies per output · +1 level · compound scroll
      </Typography>
    </Box>
  );
}

function combineChainKey(chain: CombineRecipeStatus[]): string {
  const head = chain[0]!;
  return `${head.itemKey}-${head.title ?? ""}-${chain.map((step) => step.level).join("-")}`;
}

function BankCombineCard({
  combine,
  mode,
}: {
  combine: CombineRecipeStatus;
  mode: "ready" | "missing";
}) {
  const count = mode === "ready" ? combine.combineReadyCount : combine.potentialCombineCount;
  const badge = combineInputBadge(combine, mode);

  return (
    <Box sx={craftCardSx}>
      {mode === "missing" && combine.combineReadyCount > 0 && (
        <Typography
          variant="caption"
          color="success.main"
          sx={{ display: "block", textAlign: "center", mb: 0.5, fontWeight: 600 }}
        >
          {abbreviateNumber(combine.combineReadyCount)} ready now ·{" "}
          {abbreviateNumber(count - combine.combineReadyCount)} more if restocked
        </Typography>
      )}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", textAlign: "center", mb: 0.75, fontWeight: 600 }}
      >
        Result: {abbreviateNumber(count)} × +{combine.outputLevel}
      </Typography>
      <Stack
        direction="row"
        alignItems="flex-start"
        flexWrap="wrap"
        sx={{ gap: 0.75, justifyContent: "center" }}
      >
        <RecipeItemTile
          itemKey={combine.itemKey}
          level={combine.outputLevel}
          title={combine.title}
          quantity={count}
          showQuantity
          forceShowQuantity
        />

        <CombineArrow />

        <RecipeItemTile
          itemKey={combine.itemKey}
          level={combine.level}
          title={combine.title}
          quantity={badge.quantity}
          showQuantity
          forceShowQuantity
          quantityColor={badge.color}
          tooltipExtraLines={combineInputTooltipLines(combine, mode)}
        />
      </Stack>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", textAlign: "center", mt: 0.75 }}
      >
        3 copies per output · +1 level · compound scroll
      </Typography>
    </Box>
  );
}

function RenderCombineChains({
  steps,
  mode,
}: {
  steps: CombineRecipeStatus[];
  mode: "ready" | "missing";
}) {
  const chains = groupCombineSteps(steps);

  return (
    <>
      {chains.map((chain) =>
        chain.length > 1 ? (
          <BankCombineChainCard key={combineChainKey(chain)} steps={chain} mode={mode} />
        ) : (
          <BankCombineCard key={combineChainKey(chain)} combine={chain[0]!} mode={mode} />
        ),
      )}
    </>
  );
}

function BankCraftCard({ recipe, mode }: { recipe: CraftRecipeStatus; mode: "ready" | "missing" }) {
  const craftCount = mode === "ready" ? recipe.craftableCount : recipe.potentialCraftCount ?? 0;

  return (
    <Box sx={craftCardSx}>
      {mode === "missing" && recipe.craftableCount > 0 && (
        <Typography
          variant="caption"
          color="success.main"
          sx={{ display: "block", textAlign: "center", mb: 0.5, fontWeight: 600 }}
        >
          {abbreviateNumber(recipe.craftableCount)} ready now ·{" "}
          {abbreviateNumber(craftCount - recipe.craftableCount)} more if restocked
        </Typography>
      )}
      <Stack
        direction="row"
        alignItems="flex-start"
        flexWrap="wrap"
        sx={{ gap: 0.75, justifyContent: "center" }}
      >
        <RecipeItemTile
          itemKey={recipe.outputKey}
          quantity={craftCount}
          showQuantity
          forceShowQuantity
        />

        <Typography
          aria-hidden
          color="text.secondary"
          sx={{
            alignSelf: "center",
            fontSize: "1.25rem",
            lineHeight: 1,
            px: 0.25,
            userSelect: "none",
          }}
        >
          ←
        </Typography>

        {recipe.ingredients.map((ingredient) => {
          const usageQty = ingredient.need * craftCount;
          const isShort = mode === "missing" && ingredient.missing > 0;
          const badgeQty =
            mode === "missing" ? (isShort ? ingredient.missing : usageQty) : usageQty;

          return (
            <RecipeItemTile
              key={craftRowKey({
                itemKey: ingredient.key,
                level: ingredient.level,
                title: ingredient.title,
                quantity: ingredient.need,
              })}
              itemKey={ingredient.key}
              level={ingredient.level}
              title={ingredient.title}
              quantity={badgeQty}
              showQuantity
              forceShowQuantity
              quantityColor={isShort ? "#ff5252" : undefined}
              tooltipExtraLines={craftIngredientTooltipLines(ingredient, {
                usageQty,
                forPotentialBatch: mode === "missing",
              })}
            />
          );
        })}
      </Stack>
      <CraftCostLabel costPerCraft={recipe.craftCostPerCraft} batchCount={craftCount} />
    </Box>
  );
}

const marketGridSx = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(132px, 1fr))",
  gap: 1.25,
  pt: 0.5,
};

const marketCardSx = (line: BankSellLineItem) => ({
  ...craftCardSx,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  borderColor: line.merchantId ? "success.dark" : "divider",
  opacity: line.priceSource === "npc" ? 0.9 : 1,
});

function copyMerchantMove(merchant: Merchant | undefined) {
  if (!merchant) return;
  const command = `smart_move({map: "${merchant.map}", x: ${merchant.x}, y: ${merchant.y}})`;
  navigator.clipboard.writeText(command).catch(() => {});
}

function bankMarketTooltipLines(
  line: BankSellLineItem,
  merchant: Merchant | undefined,
): EntityTooltipLine[] {
  const lines: EntityTooltipLine[] = [
    {
      kind: "stat",
      label: "Unit price",
      value: `${abbreviateNumber(line.unitPrice)}g`,
      labelColor: "text.secondary",
      valueColor: "#fde047",
    },
    {
      kind: "stat",
      label: "Total",
      value: `${abbreviateNumber(line.totalValue)}g`,
      labelColor: "text.secondary",
      valueColor: "#fde047",
    },
    {
      kind: "stat",
      label: "Quantity",
      value: String(abbreviateNumber(line.item.q)),
      labelColor: "text.secondary",
    },
  ];

  if (line.priceSource === "merchant" && line.merchantId) {
    lines.push({
      kind: "stat",
      label: "Sell to",
      value: line.merchantId,
      labelColor: "text.secondary",
      valueColor: "#81c784",
    });
    if (merchant) {
      lines.push({
        kind: "stat",
        label: "Location",
        value: `${merchant.map} (${merchant.serverRegion}${merchant.serverIdentifier})`,
        labelColor: "text.secondary",
      });
    }
  } else if (line.priceSource === "npc") {
    lines.push({
      kind: "stat",
      label: "Sell to",
      value: "NPC merchant (calculate_item_value)",
      labelColor: "text.secondary",
    });
  }

  return lines;
}

function BankMarketTile({
  line,
  merchant,
}: {
  line: BankSellLineItem;
  merchant: Merchant | undefined;
}) {
  const hasMerchant = line.priceSource === "merchant" && Boolean(line.merchantId);
  const sellTarget = hasMerchant ? line.merchantId! : "NPC merchant";
  const merchantHint = merchant
    ? `${merchant.map} · ${merchant.serverRegion}${merchant.serverIdentifier}`
    : undefined;

  return (
    <Box sx={marketCardSx(line)}>
      <ItemInstance
        itemInfo={{
          name: line.item.name,
          level: line.item.level,
          ...(line.item.p ? { p: line.item.p } : {}),
        }}
        linkToDetail
        size={48}
        tooltip
        tooltipExtraLines={bankMarketTooltipLines(line, merchant)}
      />

      <Box sx={{ width: "100%", mt: 0.75, textAlign: "center" }}>
        <Typography
          variant="caption"
          sx={{
            display: "block",
            fontWeight: 700,
            color: "#fde047",
            fontSize: "0.8rem",
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1.2,
          }}
        >
          {abbreviateNumber(line.totalValue)}g
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: "block",
            mt: 0.25,
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1.2,
          }}
        >
          {abbreviateNumber(line.unitPrice)} × {abbreviateNumber(line.item.q)}
        </Typography>

        <Box
          component="button"
          type="button"
          title={merchantHint ? `${sellTarget} · ${merchantHint} · click to copy move` : sellTarget}
          onClick={() => copyMerchantMove(merchant)}
          sx={{
            display: "block",
            width: "100%",
            mt: 0.5,
            px: 0.5,
            py: 0.35,
            border: 0,
            borderRadius: 0.75,
            bgcolor: hasMerchant ? "success.dark" : "action.selected",
            color: hasMerchant ? "success.contrastText" : "text.secondary",
            cursor: merchant ? "pointer" : "default",
            font: "inherit",
            fontSize: "0.65rem",
            fontWeight: 600,
            lineHeight: 1.2,
            textAlign: "center",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {sellTarget}
        </Box>

        {merchant && (
          <Typography
            variant="caption"
            color="text.secondary"
            noWrap
            title={merchantHint}
            sx={{ display: "block", mt: 0.25, fontSize: "0.62rem", opacity: 0.85 }}
          >
            {merchant.map}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

function SectionHeader({ icon, title }: { icon: ReactElement; title: string }) {
  return (
    <Stack
      direction="row"
      spacing={0.75}
      alignItems="center"
      sx={{
        px: 0.5,
        py: 0.75,
        mb: 0.5,
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      {icon}
      <Typography variant="overline" sx={{ lineHeight: 1.2, letterSpacing: 0.6 }}>
        {title}
      </Typography>
    </Stack>
  );
}

export function BankInsightsSidebar({ bankData, items }: BankInsightsSidebarProps) {
  const G = useContext(GDataContext) as CustomGData | undefined;
  const { items: merchantItems, merchants, lastRefresh, refresh } = useMerchants();
  const [marketRefreshing, setMarketRefreshing] = useState(false);

  const consolidation = useMemo(() => computeStackConsolidation(items, G), [items, G]);
  const craftAnalysis = useMemo(
    () => (G ? analyzeCraftRecipes(G, bankData) : { ready: [], potential: [] }),
    [G, bankData],
  );
  const combineAnalysis = useMemo(
    () => (G ? analyzeCompoundCombines(items, G) : { ready: [], potential: [] }),
    [G, items],
  );
  const sellBreakdown = useMemo(
    () => (G ? computeBankSellBreakdown(items, merchantItems, G) : []),
    [G, items, merchantItems],
  );
  const valueBreakdown = useMemo(
    () =>
      estimateBankValue(
        items,
        merchantItems,
        typeof bankData.gold === "number" ? bankData.gold : 0,
        G,
      ),
    [items, merchantItems, bankData.gold, G],
  );

  const onRefreshMarket = () => {
    setMarketRefreshing(true);
    refresh().finally(() => setMarketRefreshing(false));
  };

  const marketUpdatedAgo =
    lastRefresh != null ? msToTime(Date.now() - lastRefresh.getTime()) : undefined;

  const hasConsolidation = consolidation.totalSlotsSaved > 0;
  const hasCraftRecipes = craftAnalysis.ready.length > 0 || craftAnalysis.potential.length > 0;
  const hasCombineReady = combineAnalysis.ready.length > 0;
  const hasCombineAlmost = combineAnalysis.potential.length > 0;
  const hasCombine = hasCombineReady || hasCombineAlmost;
  const hasMarketValue = valueBreakdown.itemsSellValue > 0;

  const tabs = useMemo(() => {
    const next: { id: SidebarTab; label: string; icon: ReactElement }[] = [];
    if (hasCraftRecipes) {
      next.push({
        id: "craft",
        label: `Craft (${craftAnalysis.ready.length})`,
        icon: <BuildCircleOutlinedIcon fontSize="small" />,
      });
    }
    if (hasCombine) {
      next.push({
        id: "combine",
        label: `Combine (${combineAnalysis.ready.length})`,
        icon: <CallMergeOutlinedIcon fontSize="small" />,
      });
    }
    if (hasConsolidation) {
      next.push({
        id: "stacks",
        label: `Stacks (${consolidation.totalSlotsSaved})`,
        icon: <CompressIcon fontSize="small" />,
      });
    }
    if (hasMarketValue) {
      next.push({
        id: "market",
        label: "Market",
        icon: <StorefrontOutlinedIcon fontSize="small" />,
      });
    }
    return next;
  }, [
    hasCraftRecipes,
    hasCombine,
    hasConsolidation,
    hasMarketValue,
    craftAnalysis.ready.length,
    combineAnalysis.ready.length,
    consolidation.totalSlotsSaved,
  ]);

  const [tab, setTab] = useState<SidebarTab>("craft");
  const [craftSection, setCraftSection] = useState<InsightSection>("ready");
  const [combineSection, setCombineSection] = useState<InsightSection>("ready");

  const activeTab = tabs.some((entry) => entry.id === tab) ? tab : tabs[0]?.id;

  if (!G || tabs.length === 0) return null;

  const hasCraftAlmost = craftAnalysis.potential.length > 0;
  const hasCraftReady = craftAnalysis.ready.length > 0;

  const activeCraftSection: InsightSection =
    craftSection === "ready" && hasCraftReady
      ? "ready"
      : craftSection === "almost" && hasCraftAlmost
      ? "almost"
      : hasCraftReady
      ? "ready"
      : "almost";

  const activeCombineSection: InsightSection =
    combineSection === "ready" && hasCombineReady
      ? "ready"
      : combineSection === "almost" && hasCombineAlmost
      ? "almost"
      : hasCombineReady
      ? "ready"
      : "almost";

  return (
    <Paper
      variant="outlined"
      sx={{
        width: { xs: "100%", lg: 520, xl: 640 },
        flexShrink: 0,
        alignSelf: "flex-start",
      }}
    >
      <Tabs
        value={activeTab}
        onChange={(_event, value: SidebarTab) => setTab(value)}
        variant="fullWidth"
        sx={mainTabSx}
      >
        {tabs.map((entry) => (
          <Tab
            key={entry.id}
            value={entry.id}
            icon={entry.icon}
            iconPosition="start"
            label={entry.label}
            sx={{ minHeight: MAIN_TAB_HEIGHT, py: 0.5, fontSize: "0.75rem", minWidth: 0 }}
          />
        ))}
      </Tabs>

      <Box>
        {activeTab === "craft" && hasCraftRecipes && (
          <Box>
            {(hasCraftReady || hasCraftAlmost) && (
              <Tabs
                value={activeCraftSection}
                onChange={(_event, value: InsightSection) => setCraftSection(value)}
                variant="fullWidth"
                sx={subTabSx}
              >
                {hasCraftReady && (
                  <Tab
                    value="ready"
                    label={`Ready (${craftAnalysis.ready.length})`}
                    icon={<CheckCircleOutlineIcon sx={{ fontSize: 16 }} />}
                    iconPosition="start"
                  />
                )}
                {hasCraftAlmost && (
                  <Tab
                    value="almost"
                    label={`Almost (${craftAnalysis.potential.length})`}
                    icon={<HourglassTopOutlinedIcon sx={{ fontSize: 16 }} />}
                    iconPosition="start"
                  />
                )}
              </Tabs>
            )}

            <Box sx={{ px: 1.5, pb: 1.5 }}>
              {activeCraftSection === "ready" && hasCraftReady && (
                <Box sx={craftGridSx}>
                  {craftAnalysis.ready.map((recipe) => (
                    <BankCraftCard key={recipe.outputKey} recipe={recipe} mode="ready" />
                  ))}
                </Box>
              )}

              {activeCraftSection === "almost" && hasCraftAlmost && (
                <Box sx={craftGridSx}>
                  {craftAnalysis.potential.map((recipe) => (
                    <BankCraftCard
                      key={`potential-${recipe.outputKey}`}
                      recipe={recipe}
                      mode="missing"
                    />
                  ))}
                </Box>
              )}
            </Box>
          </Box>
        )}

        {activeTab === "combine" && hasCombine && (
          <Box>
            {(hasCombineReady || hasCombineAlmost) && (
              <Tabs
                value={activeCombineSection}
                onChange={(_event, value: InsightSection) => setCombineSection(value)}
                variant="fullWidth"
                sx={subTabSx}
              >
                {hasCombineReady && (
                  <Tab
                    value="ready"
                    label={`Ready (${combineAnalysis.ready.length})`}
                    icon={<CheckCircleOutlineIcon sx={{ fontSize: 16 }} />}
                    iconPosition="start"
                  />
                )}
                {hasCombineAlmost && (
                  <Tab
                    value="almost"
                    label={`Almost (${combineAnalysis.potential.length})`}
                    icon={<HourglassTopOutlinedIcon sx={{ fontSize: 16 }} />}
                    iconPosition="start"
                  />
                )}
              </Tabs>
            )}

            <Box sx={{ px: 1.5, pb: 1.5 }}>
              {activeCombineSection === "ready" && hasCombineReady && (
                <Box sx={craftGridSx}>
                  <RenderCombineChains steps={combineAnalysis.ready} mode="ready" />
                </Box>
              )}

              {activeCombineSection === "almost" && hasCombineAlmost && (
                <Box sx={craftGridSx}>
                  <RenderCombineChains steps={combineAnalysis.potential} mode="missing" />
                </Box>
              )}
            </Box>
          </Box>
        )}

        {activeTab === "stacks" && (
          <Box sx={{ px: 1.5, pb: 1.5 }}>
            <SectionHeader
              icon={<CompressIcon fontSize="small" color="primary" />}
              title={`Free ${consolidation.totalSlotsSaved} slots`}
            />
            {consolidation.suggestions.slice(0, 20).map((suggestion) => (
              <Box key={formatBankItemLabel(suggestion.item, G)} sx={rowSx}>
                <Stack direction="row" spacing={1.25} alignItems="center">
                  <ItemInstance itemInfo={suggestion.item} linkToDetail size={40} tooltip={false} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      noWrap
                      title={formatBankItemLabel(suggestion.item, G)}
                    >
                      {formatBankItemLabel(suggestion.item, G)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {suggestion.currentStacks} → {suggestion.optimalStacks} stacks ·{" "}
                      <Box component="span" sx={{ color: "success.main" }}>
                        −{suggestion.slotsSaved}
                      </Box>
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            ))}
          </Box>
        )}

        {activeTab === "market" && (
          <Box sx={{ px: 1.5, py: 2 }}>
            <SectionHeader
              icon={<StorefrontOutlinedIcon fontSize="small" color="primary" />}
              title="Sell estimate"
            />
            <Typography variant="h6" sx={{ fontWeight: 600, mt: 1 }}>
              {abbreviateNumber(valueBreakdown.itemsSellValue)}
            </Typography>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              alignItems={{ sm: "center" }}
              justifyContent="space-between"
              sx={{ mt: 1, mb: 1.5 }}
            >
              <Typography variant="caption" color="text.secondary" component="div">
                {lastRefresh ? (
                  <>
                    Market data {lastRefresh.toLocaleString()}
                    {marketUpdatedAgo ? ` (${marketUpdatedAgo} ago)` : ""}
                  </>
                ) : (
                  "Market data not loaded yet"
                )}
                {" · "}
                best merchant buy offers · {valueBreakdown.pricedItemCount} priced
                {valueBreakdown.unpricedItemCount > 0
                  ? ` · ${valueBreakdown.unpricedItemCount} unpriced`
                  : ""}
              </Typography>
              <Button
                size="small"
                variant="outlined"
                startIcon={
                  marketRefreshing ? (
                    <CircularProgress size={14} />
                  ) : (
                    <RefreshIcon fontSize="small" />
                  )
                }
                onClick={onRefreshMarket}
                disabled={marketRefreshing}
                sx={{ flexShrink: 0, alignSelf: { xs: "stretch", sm: "auto" } }}
              >
                Refresh market
              </Button>
            </Stack>

            {sellBreakdown.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No sell prices found for bank items.
              </Typography>
            ) : (
              <Box sx={marketGridSx}>
                {sellBreakdown.map((line) => (
                  <BankMarketTile
                    key={getUniqueItemKey(line.item)}
                    line={line}
                    merchant={line.merchantId ? merchants[line.merchantId] : undefined}
                  />
                ))}
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Paper>
  );
}
