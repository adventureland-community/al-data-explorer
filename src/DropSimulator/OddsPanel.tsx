import {
  Box,
  Link,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { Fragment, useContext } from "react";
import { Link as RouterLink } from "react-router-dom";
import { ItemKey } from "typed-adventureland";

import { formatDropProbability } from "../gameData/drops";
import { COOP_MIN_DROP_SHARE, OddsInspectionRow } from "../gameData/dropSim";
import { nestedLeafShares } from "../gameData/dropSimViz";
import { GDataContext } from "../GDataContext";
import { ItemInstance } from "../Shared/ItemInstance";
import { abbreviateNumber } from "../Shared/utils";
import { luckmToUiPercent } from "./luckFromGear";
import { simNumericCellSx, simPanelPaperSx, simTableSx } from "./simTableStyles";

const ITEM_ICON_SIZE = 36;
const NESTED_ICON_SIZE = 28;

function formatExpectedRolls(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const abbreviated = abbreviateNumber(Number(value.toFixed(2)));
  return abbreviated == null ? value.toFixed(2) : String(abbreviated);
}

/** Full-width chance bar — old exchange.html style (second row, zero padding). */
function ChanceBar({ fraction }: { fraction: number }) {
  const pct = Math.max(0, Math.min(100, fraction * 100));
  return (
    <Box
      sx={{
        width: "100%",
        height: 5,
        bgcolor: (theme) =>
          theme.palette.mode === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
        overflow: "hidden",
      }}
      title={`${pct.toFixed(2)}% of table`}
    >
      <Box
        sx={{
          height: "100%",
          width: `${pct}%`,
          bgcolor: "primary.main",
          transition: "width 0.15s ease-out",
        }}
      />
    </Box>
  );
}

function ItemCell({ row }: { row: OddsInspectionRow }) {
  const G = useContext(GDataContext);
  if (row.nestedTable) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={500}>
          open → {row.nestedTable}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          nested exclusive table
        </Typography>
      </Box>
    );
  }

  const gItem = G?.items[row.itemKey as ItemKey];
  const href = gItem ? `/items/${encodeURIComponent(row.itemKey)}` : undefined;
  const displayName = gItem?.name ?? row.itemKey;

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
      <ItemInstance
        itemInfo={{ name: row.itemKey as ItemKey, q: row.quantity ?? undefined }}
        size={ITEM_ICON_SIZE}
        showQuantity={false}
        tooltip={Boolean(gItem)}
      />
      <Box sx={{ minWidth: 0 }}>
        {href ? (
          <Link component={RouterLink} to={href} variant="body2" fontWeight={500} underline="hover">
            {displayName}
          </Link>
        ) : (
          <Typography variant="body2" fontWeight={500}>
            {displayName}
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary" display="block">
          {row.itemKey}
          {gItem?.tier != null ? ` · Tier ${gItem.tier}` : ""}
          {gItem?.type ? ` · ${gItem.type}${gItem.wtype ? ` ${gItem.wtype}` : ""}` : ""}
        </Typography>
      </Box>
    </Box>
  );
}

function killPerKillLabel(row: OddsInspectionRow): string {
  const rate = row.perKillRate ?? row.rawRate ?? row.probability;
  return formatDropProbability(rate);
}

function killChanceTitle(row: OddsInspectionRow): string | undefined {
  const parts: string[] = [];
  if (row.baseRate != null && row.rawRate != null && Math.abs(row.baseRate - row.rawRate) > 1e-12) {
    parts.push(`Base rate ${formatDropProbability(row.baseRate)}`);
  }
  if (row.rawRate != null) {
    parts.push(`After luck and modifiers: ${formatDropProbability(row.rawRate)} per roll`);
  }
  if (row.repeats > 1) {
    parts.push(`${row.repeats} table rolls on this row per kill (coop bonus)`);
  }
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

function formatGuaranteeLuck(row: OddsInspectionRow): string {
  if (row.nestedTable) return "—";
  if (row.guaranteedNow) return "✓";
  if (row.luckmToGuarantee == null) return "—";
  const pct = luckmToUiPercent(row.luckmToGuarantee);
  const abbreviated = abbreviateNumber(pct);
  return `≥${abbreviated ?? pct}%`;
}

function guaranteeLuckTitle(row: OddsInspectionRow): string | undefined {
  if (row.nestedTable) return undefined;
  if (row.guaranteedNow) {
    return "Already guaranteed at your current luck on each table roll";
  }
  if (row.luckmToGuarantee == null) return undefined;
  const pct = luckmToUiPercent(row.luckmToGuarantee);
  return `Need at least ${pct}% Luck for this row to drop on every table roll`;
}

export function OddsPanel({
  title,
  rows,
  mode,
  coopDropEligible,
  drops,
}: {
  title: string;
  rows: OddsInspectionRow[];
  mode: "exchange" | "kill";
  /** Kill mode: false when coop share is below server drop threshold. */
  coopDropEligible?: boolean;
  /** Used to expand open → nested leaf odds under the open row. */
  drops?: Record<string, unknown>;
}) {
  const G = useContext(GDataContext);
  const showWeightCols = mode === "exchange";
  const colCount = showWeightCols ? 7 : 6;

  if (rows.length === 0) {
    return (
      <Paper variant="outlined" sx={simPanelPaperSx}>
        <Typography variant="subtitle1" gutterBottom>
          {title}
        </Typography>
        <Typography color="text.secondary">Select a table or monster to see odds.</Typography>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={simPanelPaperSx}>
      <Typography variant="subtitle1" gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {mode === "exchange"
          ? "Table order · weight / total · expected rolls = 1 ÷ chance. Open rows expand to leaf items below."
          : coopDropEligible === false
          ? `Share ≤ ${
              COOP_MIN_DROP_SHARE * 100
            }% — server grants no coop drops. Odds below are zeroed.`
          : "N = kills. Min Luck = Luck % so each table roll on that row always drops (after share, level, and coop modifiers)."}
      </Typography>
      <TableContainer>
        <Table
          size="small"
          stickyHeader
          sx={{
            ...simTableSx,
            borderCollapse: "collapse",
            "& .MuiTableBody-root .MuiTableRow-root.odds-main .MuiTableCell-root": {
              borderBottom: "none",
            },
            "& .MuiTableBody-root .MuiTableRow-root.odds-bar .MuiTableCell-root": {
              py: 0,
              px: 0,
              lineHeight: 0,
              borderBottom: "1px solid",
              borderColor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
            },
            "& .MuiTableBody-root .MuiTableRow-root.odds-nested .MuiTableCell-root": {
              borderBottom: "1px solid",
              borderColor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.015)",
            },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell>Item</TableCell>
              <TableCell align="right">Amt</TableCell>
              {showWeightCols ? (
                <>
                  <TableCell align="right">Weight</TableCell>
                  <TableCell align="right">Chance</TableCell>
                </>
              ) : (
                <>
                  <TableCell align="right">Per kill</TableCell>
                  <TableCell
                    align="right"
                    title="Luck % needed so this row drops on every table roll"
                  >
                    Min Luck
                  </TableCell>
                </>
              )}
              <TableCell align="right">Exp. rolls</TableCell>
              {showWeightCols ? (
                <>
                  <TableCell align="right">Cumulative</TableCell>
                  <TableCell align="right">Roll ≤</TableCell>
                </>
              ) : (
                <TableCell
                  align="right"
                  title="Extra table rolls for this row within one kill (coop bonus, not extra kills)"
                >
                  Rolls/kill
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, index) => {
              const key = `${row.itemKey}|${row.nestedTable}|${row.quantity ?? ""}|${index}`;
              const leaves =
                row.nestedTable && drops
                  ? nestedLeafShares(
                      drops,
                      row.nestedTable,
                      mode === "kill" ? row.perKillRate ?? row.probability : row.probability,
                    )
                  : [];
              return (
                <Fragment key={key}>
                  <TableRow hover className="odds-main">
                    <TableCell>
                      <ItemCell row={row} />
                    </TableCell>
                    <TableCell align="right" sx={simNumericCellSx}>
                      {row.quantity ?? 1}
                    </TableCell>
                    {showWeightCols ? (
                      <>
                        <TableCell align="right" sx={simNumericCellSx}>
                          {row.weight ?? "—"}
                        </TableCell>
                        <TableCell align="right" sx={simNumericCellSx}>
                          {formatDropProbability(row.probability)}
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell align="right" sx={simNumericCellSx} title={killChanceTitle(row)}>
                          {killPerKillLabel(row)}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={simNumericCellSx}
                          title={guaranteeLuckTitle(row)}
                        >
                          {formatGuaranteeLuck(row)}
                        </TableCell>
                      </>
                    )}
                    <TableCell
                      align="right"
                      sx={simNumericCellSx}
                      title={row.expectedRolls != null ? row.expectedRolls.toFixed(2) : undefined}
                    >
                      {formatExpectedRolls(row.expectedRolls)}
                    </TableCell>
                    {showWeightCols ? (
                      <>
                        <TableCell align="right" sx={simNumericCellSx}>
                          {row.cumulative ?? "—"}
                        </TableCell>
                        <TableCell align="right" sx={simNumericCellSx}>
                          {row.rollThreshold != null ? row.rollThreshold.toFixed(4) : "—"}
                        </TableCell>
                      </>
                    ) : (
                      <TableCell align="right" sx={simNumericCellSx}>
                        {row.repeats > 1 ? row.repeats : "—"}
                      </TableCell>
                    )}
                  </TableRow>
                  <TableRow className="odds-bar">
                    <TableCell colSpan={colCount}>
                      <ChanceBar fraction={row.barFraction} />
                    </TableCell>
                  </TableRow>
                  {leaves.map((leaf) => {
                    const gItem = G?.items[leaf.itemKey as ItemKey];
                    const href = gItem ? `/items/${encodeURIComponent(leaf.itemKey)}` : undefined;
                    const leafExp =
                      leaf.probability > 0 && leaf.probability < 1 ? 1 / leaf.probability : null;
                    return (
                      <Fragment key={`${key}|${leaf.itemKey}|${leaf.quantity ?? ""}`}>
                        <TableRow className="odds-nested" hover>
                          <TableCell>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1.25,
                                pl: 2,
                                minWidth: 0,
                              }}
                            >
                              <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
                                ↳
                              </Typography>
                              <ItemInstance
                                itemInfo={{
                                  name: leaf.itemKey as ItemKey,
                                  q: leaf.quantity ?? undefined,
                                }}
                                size={NESTED_ICON_SIZE}
                                showQuantity={leaf.quantity != null && leaf.quantity > 1}
                                tooltip={Boolean(gItem)}
                              />
                              <Box sx={{ minWidth: 0 }}>
                                {href ? (
                                  <Link
                                    component={RouterLink}
                                    to={href}
                                    variant="body2"
                                    underline="hover"
                                  >
                                    {gItem?.name ?? leaf.itemKey}
                                  </Link>
                                ) : (
                                  <Typography variant="body2">{leaf.itemKey}</Typography>
                                )}
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  display="block"
                                >
                                  from {row.nestedTable}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell align="right" sx={simNumericCellSx}>
                            {leaf.quantity ?? 1}
                          </TableCell>
                          {showWeightCols ? (
                            <>
                              <TableCell align="right" sx={simNumericCellSx}>
                                —
                              </TableCell>
                              <TableCell align="right" sx={simNumericCellSx}>
                                {formatDropProbability(leaf.probability)}
                              </TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell align="right" sx={simNumericCellSx}>
                                {formatDropProbability(leaf.probability)}
                              </TableCell>
                              <TableCell align="right" sx={simNumericCellSx}>
                                —
                              </TableCell>
                            </>
                          )}
                          <TableCell align="right" sx={simNumericCellSx}>
                            {formatExpectedRolls(leafExp)}
                          </TableCell>
                          {showWeightCols ? (
                            <>
                              <TableCell align="right" sx={simNumericCellSx}>
                                —
                              </TableCell>
                              <TableCell align="right" sx={simNumericCellSx}>
                                —
                              </TableCell>
                            </>
                          ) : (
                            <TableCell align="right" sx={simNumericCellSx}>
                              —
                            </TableCell>
                          )}
                        </TableRow>
                        <TableRow className="odds-bar">
                          <TableCell colSpan={colCount} sx={{ pl: 4 }}>
                            <ChanceBar
                              fraction={
                                row.probability > 0
                                  ? leaf.probability /
                                    (mode === "kill"
                                      ? row.perKillRate ?? row.probability
                                      : row.probability)
                                  : 0
                              }
                            />
                          </TableCell>
                        </TableRow>
                      </Fragment>
                    );
                  })}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
