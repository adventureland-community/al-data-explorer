import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import FlagIcon from "@mui/icons-material/Flag";
import SortIcon from "@mui/icons-material/Sort";
import {
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { useCallback, useContext, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { ItemKey, MonsterKey, ClassKey } from "typed-adventureland";

import {
  COMPARE_STAT_KEYS,
  CompareStatKey,
  LevelStats,
  MATRIX_MAX_LEVEL,
  MATRIX_STAT_PRIORITY,
  buildAllLevelStats,
  isEquippable,
  isValidLevel,
  statDelta,
} from "../../gameData/compareStats";
import {
  computeMatrixItemSim,
  canClassEquipItem,
  DpsBreakdown,
  MatrixItemSimResult,
} from "../../gameData/combat";
import { getItemEffects } from "../../gameData/itemEffects";
import { getItemClassList } from "../../gameData/itemMeta";
import { sortItemKeysByTier } from "../../gameData/itemFilters";
import { STAT_DISPLAY_LABELS } from "../../gameData/statLabels";
import { GDataContext, GItems } from "../../GDataContext";
import { SelectedCharacterClass } from "../../GearPlanner/types";
import { ItemInstance } from "../../Shared/ItemInstance";
import { ItemSelectDialog } from "../../Shared/ItemSelectDialog";
import { ItemSimBreakdownDialog } from "../../Shared/ItemSimBreakdownDialog";
import { useMatrixUrlParams, useMatrixCombatParams } from "../useItemsUrlParams";
import { CombatContextBar, CombatContextValue, useCombatContextClasses } from "./CombatContextBar";

const ITEM_COL_WIDTH = 248;
/** Floor so equal level columns still scroll on narrow viewports. */
const LEVEL_COL_MIN = 88;

const STICKY_CELL_SX = {
  position: "sticky" as const,
  left: 0,
  zIndex: 1,
  bgcolor: "background.paper",
  borderRight: 1,
  borderColor: "divider",
  width: ITEM_COL_WIDTH,
  minWidth: ITEM_COL_WIDTH,
  maxWidth: ITEM_COL_WIDTH,
  boxSizing: "border-box" as const,
  verticalAlign: "middle" as const,
  px: 1,
  py: 0.75,
};

const LEVEL_CELL_SX = {
  minWidth: LEVEL_COL_MIN,
  boxSizing: "border-box" as const,
  verticalAlign: "top" as const,
  overflow: "hidden",
  py: 1,
};

function formatDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  return String(delta);
}

function keysPresentOrDiffering(stats: LevelStats, baseline?: LevelStats): CompareStatKey[] {
  if (!baseline) {
    return COMPARE_STAT_KEYS.filter((key) => stats[key] != null && stats[key] !== 0);
  }
  return COMPARE_STAT_KEYS.filter((key) => {
    const delta = statDelta(baseline[key], stats[key]);
    return delta != null && delta !== 0;
  });
}

/**
 * Order relevant stats by MATRIX_STAT_PRIORITY so on-hit stats (attr0, explosion, blast)
 * surface before generic armor columns.
 */
export function pickRowStatKeys(
  levelStats: LevelStats[],
  baselineLevelStats?: LevelStats[] | null,
): CompareStatKey[] {
  const relevant = new Set<CompareStatKey>();
  for (let i = 0; i < levelStats.length; i += 1) {
    const stats = levelStats[i];
    if (!stats || Object.keys(stats).length === 0) continue;
    for (const key of keysPresentOrDiffering(stats, baselineLevelStats?.[i])) {
      relevant.add(key);
    }
  }
  const ordered = MATRIX_STAT_PRIORITY.filter((key) => relevant.has(key));
  for (const key of COMPARE_STAT_KEYS) {
    if (relevant.has(key) && !ordered.includes(key)) ordered.push(key);
  }
  return ordered;
}

/** Stats-only cell — no icons — so rows scan horizontally. */
function LevelStatCell({
  stats,
  baselineStats,
  valid,
  isBaseline,
  ability,
  statKeys,
}: {
  stats: LevelStats;
  baselineStats?: LevelStats;
  valid: boolean;
  isBaseline: boolean;
  ability?: string;
  statKeys: CompareStatKey[];
}) {
  if (!valid) {
    return (
      <Typography variant="caption" color="text.disabled">
        ·
      </Typography>
    );
  }

  if (statKeys.length === 0) {
    return (
      <Typography variant="caption" color="text.secondary">
        —
      </Typography>
    );
  }

  const labelFor = (key: CompareStatKey): string => {
    // Use the real attribute / ability key — no invented abbreviations.
    if (key === "attr0" && ability) return ability;
    return key;
  };

  return (
    <Box
      sx={{
        display: "grid",
        // label | value | delta — shared columns so rows don't jagged
        gridTemplateColumns: "minmax(0, 1fr) max-content max-content",
        columnGap: 0.5,
        rowGap: 0.15,
        width: "100%",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        fontSize: 11,
        lineHeight: 1.35,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {statKeys.map((key) => {
        const value = stats[key];
        const delta = !isBaseline && baselineStats ? statDelta(baselineStats[key], value) : null;
        const showDelta = delta != null && delta !== 0;
        let deltaColor = "transparent";
        if (showDelta) {
          deltaColor = delta > 0 ? "success.light" : "error.light";
        }
        return (
          <Box key={key} sx={{ display: "contents" }}>
            <Box
              component="span"
              title={STAT_DISPLAY_LABELS[key] ?? key}
              sx={{
                color: "text.secondary",
                textAlign: "left",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {labelFor(key)}
            </Box>
            <Box component="span" sx={{ textAlign: "right", whiteSpace: "nowrap", pl: 0.5 }}>
              {value ?? 0}
            </Box>
            <Box
              component="span"
              sx={{
                textAlign: "right",
                whiteSpace: "nowrap",
                fontWeight: 600,
                minWidth: "3.5ch",
                color: deltaColor,
              }}
            >
              {showDelta ? formatDelta(delta) : "\u00a0"}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

function LevelDpsCell({
  breakdown,
  baselineBreakdown,
  valid,
  isBaseline,
  equippable,
  onOpen,
}: {
  breakdown: DpsBreakdown | null;
  baselineBreakdown: DpsBreakdown | null;
  valid: boolean;
  isBaseline: boolean;
  equippable: boolean;
  onOpen?: () => void;
}) {
  if (!valid || breakdown == null) {
    return (
      <Typography variant="caption" color="text.disabled">
        ·
      </Typography>
    );
  }

  const dps = breakdown.totalDps;
  const baselineDps = baselineBreakdown?.totalDps ?? null;
  const delta = !isBaseline && baselineDps != null && baselineDps > 0 ? dps - baselineDps : null;
  let deltaColor = "transparent";
  if (delta != null && delta !== 0) {
    deltaColor = delta > 0 ? "success.light" : "error.light";
  }

  const abilityHint =
    breakdown.abilityLines?.[0]?.label ??
    (breakdown.unsimulatedEffects?.[0]?.label
      ? breakdown.unsimulatedEffects[0].label.split(" ")[0].toLowerCase()
      : null);

  const tooltip = (
    <Box sx={{ fontSize: 11, lineHeight: 1.45, maxWidth: 260 }}>
      <Typography variant="caption" component="div" fontWeight={700}>
        {dps.toFixed(1)} total DPS
      </Typography>
      {!equippable && (
        <Typography variant="caption" component="div" color="warning.light">
          Class cannot equip — stats not applied
        </Typography>
      )}
      <Typography variant="caption" component="div">
        Auto: {breakdown.autoAttackDps.toFixed(1)}
      </Typography>
      {breakdown.abilityDps > 0 && (
        <Typography variant="caption" component="div">
          Abilities: {breakdown.abilityDps.toFixed(1)}
        </Typography>
      )}
      {breakdown.abilityLines?.map((line) => (
        <Typography key={line.key} variant="caption" component="div" sx={{ pl: 1 }}>
          {line.label}: {line.dps.toFixed(1)}
          {line.detail ? ` (${line.detail})` : ""}
        </Typography>
      ))}
      {breakdown.unsimulatedEffects?.map((fx) => (
        <Typography
          key={fx.key}
          variant="caption"
          component="div"
          sx={{ pl: 1, fontStyle: "italic" }}
        >
          {fx.label}: not in single-target DPS
        </Typography>
      ))}
      <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>
        Hit: {breakdown.hitDamage.toFixed(1)} · Mitigation:{" "}
        {(breakdown.mitigationMult * 100).toFixed(1)}%
      </Typography>
      <Typography variant="caption" component="div" sx={{ mt: 0.5, color: "primary.light" }}>
        Click for full breakdown
      </Typography>
    </Box>
  );

  return (
    <Tooltip title={tooltip} placement="top" enterDelay={300}>
      <Box
        onClick={onOpen}
        sx={{
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize: 11,
          lineHeight: 1.35,
          fontVariantNumeric: "tabular-nums",
          cursor: onOpen ? "pointer" : "help",
          opacity: equippable ? 1 : 0.45,
          "&:hover": onOpen ? { bgcolor: "action.hover", borderRadius: 0.5 } : undefined,
        }}
      >
        <Typography variant="caption" component="div" fontWeight={600}>
          {dps.toFixed(1)}
        </Typography>
        <Typography variant="caption" component="div" color="text.secondary">
          DPS
        </Typography>
        {abilityHint && (
          <Typography variant="caption" component="div" color="warning.light" noWrap>
            +{abilityHint}
          </Typography>
        )}
        {delta != null && delta !== 0 && (
          <Typography variant="caption" component="div" sx={{ color: deltaColor, fontWeight: 600 }}>
            {delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)}
          </Typography>
        )}
      </Box>
    </Tooltip>
  );
}

export function ItemBalanceMatrix({
  items,
  itemHref,
  effectLookups,
}: {
  items: GItems;
  /** Real `/items/:key` href so Ctrl/Cmd/middle-click open a new tab. */
  itemHref?: (itemKey: ItemKey) => string;
  effectLookups?: Parameters<typeof getItemEffects>[2];
}) {
  const G = useContext(GDataContext);
  const classes = useCombatContextClasses();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [simDialog, setSimDialog] = useState<{
    itemKey: ItemKey;
    upgradeLevel: number;
    sim: MatrixItemSimResult;
  } | null>(null);
  const validItem = useCallback((key: string) => Boolean(items[key as ItemKey]), [items]);
  const validClass = useCallback((key: string) => Boolean(G?.classes[key as ClassKey]), [G]);
  const validTarget = useCallback((key: string) => Boolean(G?.monsters[key as MonsterKey]), [G]);
  const { selectedKeys, baselineKey, setSelectedKeys, setBaseline } = useMatrixUrlParams(validItem);
  const {
    params: combatParams,
    setView,
    setCombatContext,
    searchParams,
  } = useMatrixCombatParams(validClass, validTarget);
  const viewMode = combatParams.view;
  const combatContext: CombatContextValue = {
    classKey: combatParams.simClass,
    level: combatParams.simLevel,
    targetMonster: combatParams.simTarget,
    simScope: combatParams.simScope,
    simGear: combatParams.simGear,
  };

  const selectedItemKeys = selectedKeys as ItemKey[];
  const baselineItemKey = baselineKey as ItemKey | null;

  const addItem = (key: ItemKey) => {
    if (selectedItemKeys.includes(key)) return;
    setSelectedKeys([...selectedItemKeys, key]);
  };

  const addItems = (keys: ItemKey[]) => {
    const seen = new Set(selectedItemKeys);
    const next = [...selectedItemKeys];
    for (const key of keys) {
      if (seen.has(key) || !items[key]) continue;
      seen.add(key);
      next.push(key);
    }
    if (next.length !== selectedItemKeys.length) {
      // Bulk add lands in tier order so the matrix is scannable immediately.
      setSelectedKeys(sortItemKeysByTier(next, items));
    }
  };

  const removeItem = (key: ItemKey) => {
    setSelectedKeys(selectedItemKeys.filter((k) => k !== key));
  };

  const sortByTier = () => {
    setSelectedKeys(sortItemKeysByTier(selectedItemKeys, items));
  };

  const rows = useMemo(
    () =>
      selectedItemKeys
        .filter((key) => items[key])
        .map((itemKey) => {
          const gItem = items[itemKey];
          const effects = getItemEffects(gItem, 0, effectLookups);
          return {
            itemKey,
            gItem,
            levelStats: buildAllLevelStats(gItem),
            effectLines: effects.map((e) => {
              const head = e.kindLabel ? `${e.kindLabel} · ${e.title}` : e.title;
              return e.summary && e.summary !== e.title ? `${head}: ${e.summary}` : head;
            }),
          };
        }),
    [effectLookups, items, selectedItemKeys],
  );

  const baselineStats = useMemo(() => {
    if (!baselineItemKey || !items[baselineItemKey]) return null;
    return buildAllLevelStats(items[baselineItemKey]);
  }, [baselineItemKey, items]);

  const characterClass = useMemo((): SelectedCharacterClass | undefined => {
    const key = combatContext.classKey as ClassKey | null;
    if (!key || !G?.classes[key]) return undefined;
    return {
      className: key,
      ...(G.classes[key] as object),
    } as SelectedCharacterClass;
  }, [G, combatContext.classKey]);

  const targetEntity = useMemo(() => {
    if (!G) return null;
    return G.monsters[combatContext.targetMonster];
  }, [G, combatContext.targetMonster]);

  const computeRowSim = useCallback(
    (itemKey: ItemKey, level: number, gItem: typeof items[ItemKey]): MatrixItemSimResult | null => {
      if (!G || !characterClass || !targetEntity || !isValidLevel(gItem, level)) return null;
      return computeMatrixItemSim({
        itemKey,
        upgradeLevel: level,
        characterClass,
        playerLevel: combatContext.level,
        targetMonsterKey: combatContext.targetMonster,
        G,
        simScope: combatContext.simScope,
        baseGear: combatContext.simGear,
      });
    },
    [
      G,
      characterClass,
      combatContext.level,
      combatContext.targetMonster,
      combatContext.simScope,
      combatContext.simGear,
      targetEntity,
    ],
  );

  const baselineBreakdownByLevel = useMemo(() => {
    if (!baselineItemKey || !items[baselineItemKey]) return null;
    const gItem = items[baselineItemKey];
    return Array.from(
      { length: MATRIX_MAX_LEVEL + 1 },
      (_, level) => computeRowSim(baselineItemKey, level, gItem)?.breakdown ?? null,
    );
  }, [baselineItemKey, computeRowSim, items]);

  if (!G) return null;

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems="flex-start">
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" gutterBottom>
              Items in matrix
            </Typography>
            {selectedItemKeys.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Search by name, type, or wtype — add one item or all matching, then remove extras.
              </Typography>
            ) : (
              <>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                  {selectedItemKeys.map((key) => {
                    const isBaseline = baselineItemKey === key;
                    return (
                      <Chip
                        key={key}
                        size="small"
                        color={isBaseline ? "primary" : "default"}
                        variant={isBaseline ? "filled" : "outlined"}
                        icon={isBaseline ? <FlagIcon /> : undefined}
                        label={
                          isBaseline
                            ? `${items[key]?.name ?? key} (baseline)`
                            : items[key]?.name ?? key
                        }
                        onClick={() => {
                          if (selectedItemKeys.length < 2) return;
                          setBaseline(isBaseline ? null : key);
                        }}
                        onDelete={() => removeItem(key)}
                      />
                    );
                  })}
                </Box>
                {selectedItemKeys.length >= 2 && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    sx={{ mt: 1 }}
                  >
                    {baselineItemKey
                      ? "Other rows show deltas vs the flagged baseline at each level. Click the baseline chip again to clear."
                      : "Click a chip (or the flag on a row) to mark a baseline — other items show diffs against it."}
                  </Typography>
                )}
              </>
            )}
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setPickerOpen(true)}
              size="small"
            >
              Add item
            </Button>
            {selectedItemKeys.length >= 2 && (
              <Button size="small" startIcon={<SortIcon />} onClick={sortByTier}>
                Sort by tier
              </Button>
            )}
            {selectedItemKeys.length > 0 && (
              <Button size="small" onClick={() => setSelectedKeys([])}>
                Clear
              </Button>
            )}
            <Chip
              size="small"
              label={viewMode === "dps" ? "DPS view" : "Stats view"}
              color={viewMode === "dps" ? "primary" : "default"}
              onClick={() => setView(viewMode === "stats" ? "dps" : "stats")}
              variant={viewMode === "dps" ? "filled" : "outlined"}
            />
          </Stack>
        </Stack>
      </Paper>

      {viewMode === "dps" && (
        <CombatContextBar
          classes={classes}
          value={combatContext}
          shareSearch={searchParams.toString()}
          onChange={(next) =>
            setCombatContext({
              simClass: next.classKey,
              simLevel: next.level,
              simTarget: next.targetMonster,
              simScope: next.simScope,
              simGear: next.simGear,
            })
          }
          compact
        />
      )}

      <ItemSelectDialog
        open={pickerOpen}
        title="Add items to matrix"
        items={items}
        filterItem={(key, gItem) => isEquippable(gItem) && !selectedItemKeys.includes(key)}
        stayOpenOnSelect
        showLevelSlider={false}
        defaultSort="tier"
        onSelect={(row) => addItem(row.itemName)}
        onAddAll={(pickerRows) => addItems(pickerRows.map((row) => row.itemName))}
        onClose={() => setPickerOpen(false)}
      />

      {rows.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography color="text.secondary" gutterBottom>
            No items selected yet.
          </Typography>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setPickerOpen(true)}>
            Search and add an item
          </Button>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ overflowX: "auto", width: "100%" }}>
          <Table
            stickyHeader
            size="small"
            sx={{
              tableLayout: "fixed",
              width: "100%",
              minWidth: ITEM_COL_WIDTH + (MATRIX_MAX_LEVEL + 1) * LEVEL_COL_MIN,
            }}
          >
            <colgroup>
              <col style={{ width: ITEM_COL_WIDTH }} />
              <col span={MATRIX_MAX_LEVEL + 1} />
            </colgroup>
            <TableHead>
              <TableRow>
                <TableCell sx={{ ...STICKY_CELL_SX, zIndex: 3 }}>Item</TableCell>
                {Array.from({ length: MATRIX_MAX_LEVEL + 1 }, (_, level) => (
                  <TableCell
                    key={level}
                    align="center"
                    sx={{
                      ...LEVEL_CELL_SX,
                      verticalAlign: "middle",
                      bgcolor: level % 2 === 0 ? "action.hover" : undefined,
                    }}
                  >
                    +{level}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map(({ itemKey, gItem, levelStats, effectLines }) => {
                const isBaseline = baselineItemKey === itemKey;
                const rowStatKeys = pickRowStatKeys(levelStats, isBaseline ? null : baselineStats);
                const href = itemHref?.(itemKey);
                const classList = getItemClassList(gItem);
                const equippable =
                  !combatContext.classKey || canClassEquipItem(gItem, combatContext.classKey);
                return (
                  <TableRow
                    key={itemKey}
                    hover
                    sx={{
                      bgcolor: isBaseline ? "action.selected" : undefined,
                    }}
                  >
                    <TableCell sx={STICKY_CELL_SX}>
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: "minmax(0, 1fr) auto",
                          columnGap: 0.75,
                          alignItems: "center",
                          width: "100%",
                        }}
                      >
                        <Box
                          component={href ? RouterLink : "div"}
                          {...(href ? { to: href } : {})}
                          sx={{
                            display: "grid",
                            gridTemplateColumns: "auto minmax(0, 1fr)",
                            columnGap: 0.75,
                            alignItems: "center",
                            minWidth: 0,
                            textDecoration: "none",
                            color: "inherit",
                            borderRadius: 0.5,
                            "&:hover": href
                              ? { bgcolor: "action.hover", color: "primary.main" }
                              : undefined,
                          }}
                        >
                          <Box sx={{ lineHeight: 0 }}>
                            <ItemInstance
                              itemInfo={{ name: itemKey, level: 0 }}
                              size={36}
                              tooltip={false}
                            />
                          </Box>
                          <Box sx={{ minWidth: 0, overflow: "hidden" }}>
                            <Typography variant="body2" noWrap title={gItem.name}>
                              {gItem.name}
                              {isBaseline ? " · baseline" : ""}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              noWrap
                              display="block"
                            >
                              {gItem.type}
                              {gItem.wtype ? ` · ${gItem.wtype}` : ""}
                              {gItem.tier != null ? ` · t${gItem.tier}` : ""}
                            </Typography>
                            {effectLines.map((line) => (
                              <Typography
                                key={line}
                                variant="caption"
                                color="warning.light"
                                noWrap
                                display="block"
                                title={line}
                              >
                                {line}
                              </Typography>
                            ))}
                            {viewMode === "dps" && classList.length > 0 && (
                              <Typography
                                variant="caption"
                                color={equippable ? "text.secondary" : "error.light"}
                                noWrap
                                display="block"
                              >
                                {equippable
                                  ? classList.join(", ")
                                  : `Needs ${classList.join(", ")}`}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                        <Stack direction="row" spacing={0} sx={{ flexShrink: 0 }}>
                          {selectedItemKeys.length >= 2 && (
                            <Tooltip
                              title={isBaseline ? "Clear baseline" : "Use as baseline for diffs"}
                            >
                              <IconButton
                                size="small"
                                color={isBaseline ? "primary" : "default"}
                                aria-label={
                                  isBaseline
                                    ? `Clear baseline ${gItem.name}`
                                    : `Set ${gItem.name} as baseline`
                                }
                                onClick={() => setBaseline(isBaseline ? null : itemKey)}
                              >
                                <FlagIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <IconButton
                            size="small"
                            aria-label={`Remove ${gItem.name}`}
                            onClick={() => removeItem(itemKey)}
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Box>
                    </TableCell>
                    {Array.from({ length: MATRIX_MAX_LEVEL + 1 }, (_, level) => (
                      <TableCell
                        key={level}
                        sx={{
                          ...LEVEL_CELL_SX,
                          bgcolor: level % 2 === 0 ? "action.hover" : undefined,
                        }}
                      >
                        {viewMode === "dps" ? (
                          (() => {
                            const sim = computeRowSim(itemKey, level, gItem);
                            return (
                              <LevelDpsCell
                                breakdown={sim?.breakdown ?? null}
                                baselineBreakdown={baselineBreakdownByLevel?.[level] ?? null}
                                valid={isValidLevel(gItem, level)}
                                isBaseline={isBaseline}
                                equippable={sim?.equippable ?? equippable}
                                onOpen={
                                  sim && characterClass
                                    ? () =>
                                        setSimDialog({
                                          itemKey,
                                          upgradeLevel: level,
                                          sim,
                                        })
                                    : undefined
                                }
                              />
                            );
                          })()
                        ) : (
                          <LevelStatCell
                            stats={levelStats[level]}
                            baselineStats={baselineStats?.[level]}
                            valid={isValidLevel(gItem, level)}
                            isBaseline={isBaseline}
                            ability={(gItem as { ability?: string }).ability}
                            statKeys={rowStatKeys}
                          />
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {simDialog && characterClass && G && (
        <ItemSimBreakdownDialog
          open
          onClose={() => setSimDialog(null)}
          itemKey={simDialog.itemKey}
          upgradeLevel={simDialog.upgradeLevel}
          itemName={items[simDialog.itemKey]?.name ?? simDialog.itemKey}
          characterClassName={characterClass.className}
          playerLevel={combatContext.level}
          targetName={G.monsters[combatContext.targetMonster]?.name ?? combatContext.targetMonster}
          breakdown={simDialog.sim.breakdown}
          combatStats={simDialog.sim.combatStats}
          equipNotes={simDialog.sim.equipNotes}
        />
      )}
    </Box>
  );
}
