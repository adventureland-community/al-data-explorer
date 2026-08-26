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
import { useContext } from "react";
import { Link as RouterLink } from "react-router-dom";
import { ItemKey } from "typed-adventureland";

import { formatDropProbability } from "../gameData/drops";
import { OutcomeRow } from "../gameData/dropSim";
import { GDataContext } from "../GDataContext";
import { ItemInstance } from "../Shared/ItemInstance";
import { abbreviateNumber } from "../Shared/utils";
import { simNumericCellSx, simPanelPaperSx, simTableSx } from "./simTableStyles";

const ITEM_ICON_SIZE = 36;
const TOKEN_ICON_SIZE = 28;

export type TokenCostRow = { tokenKey: string; total: number };

function ResultItemCell({ row }: { row: OutcomeRow }) {
  const G = useContext(GDataContext);
  const gItem = G?.items[row.itemKey as ItemKey];
  const displayName = gItem?.name ?? row.itemKey;
  const href = gItem ? `/items/${encodeURIComponent(row.itemKey)}` : undefined;

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
      <ItemInstance
        itemInfo={{ name: row.itemKey as ItemKey, q: row.quantity ?? undefined }}
        size={ITEM_ICON_SIZE}
        showQuantity={row.quantity != null && row.quantity > 1}
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
        </Typography>
      </Box>
    </Box>
  );
}

function TokenCostSummary({ costs, trialCount }: { costs: TokenCostRow[]; trialCount: number }) {
  const G = useContext(GDataContext);

  return (
    <Box
      sx={{
        mb: 1.5,
        p: 1.25,
        borderRadius: 1,
        border: 1,
        borderColor: "divider",
        bgcolor: (theme) =>
          theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
      }}
    >
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.75 }}>
        Token shop cost for {trialCount.toLocaleString()} exchanges (not simulation loot)
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
        {costs.map((cost) => {
          const gItem = G?.items[cost.tokenKey as ItemKey];
          const name = gItem?.name ?? cost.tokenKey;
          const totalLabel = abbreviateNumber(cost.total) ?? cost.total.toLocaleString();
          return (
            <Box
              key={cost.tokenKey}
              sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}
            >
              <ItemInstance
                itemInfo={{ name: cost.tokenKey as ItemKey, q: cost.total }}
                size={TOKEN_ICON_SIZE}
                showQuantity
                tooltip={Boolean(gItem)}
              />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" fontWeight={500} noWrap>
                  {totalLabel} {name}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" noWrap>
                  {cost.tokenKey}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

export function ResultsPanel({
  title,
  subtitle,
  hint,
  outcomes,
  tokenCosts,
  trialCount,
}: {
  title: string;
  subtitle?: string;
  hint?: string;
  outcomes: OutcomeRow[];
  tokenCosts?: TokenCostRow[];
  trialCount?: number;
}) {
  return (
    <Paper variant="outlined" sx={simPanelPaperSx}>
      <Typography variant="subtitle1" gutterBottom>
        {title}
      </Typography>
      {subtitle ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: hint ? 0.5 : 1 }}>
          {subtitle}
        </Typography>
      ) : null}
      {hint ? (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
          {hint}
        </Typography>
      ) : null}
      {tokenCosts && tokenCosts.length > 0 && trialCount != null ? (
        <TokenCostSummary costs={tokenCosts} trialCount={trialCount} />
      ) : null}
      {outcomes.length === 0 ? (
        <Typography color="text.secondary">Run a simulation to see observed counts.</Typography>
      ) : (
        <TableContainer>
          <Table size="small" sx={simTableSx}>
            <TableHead>
              <TableRow>
                <TableCell>Item</TableCell>
                <TableCell align="right">Observed</TableCell>
                <TableCell align="right">Expected</TableCell>
                <TableCell align="right">Δ%</TableCell>
                <TableCell align="right">Rate</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {outcomes.map((row) => {
                const deltaPct =
                  row.expected > 0 ? ((row.observed - row.expected) / row.expected) * 100 : null;
                return (
                  <TableRow key={`${row.itemKey}-${row.quantity ?? ""}`} hover>
                    <TableCell>
                      <ResultItemCell row={row} />
                    </TableCell>
                    <TableCell align="right" sx={simNumericCellSx}>
                      {row.observed.toLocaleString()}
                    </TableCell>
                    <TableCell align="right" sx={simNumericCellSx}>
                      {row.expected.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        ...simNumericCellSx,
                        color: row.deterministic
                          ? "text.secondary"
                          : deltaPct == null
                          ? "text.secondary"
                          : deltaPct >= 0
                          ? "success.main"
                          : "error.main",
                      }}
                    >
                      {row.deterministic
                        ? "exact"
                        : deltaPct == null
                        ? "—"
                        : `${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(1)}%`}
                    </TableCell>
                    <TableCell align="right" sx={simNumericCellSx}>
                      {formatDropProbability(row.probability)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
}
