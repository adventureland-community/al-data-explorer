import {
  Alert,
  Box,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { ItemKey } from "typed-adventureland";

import {
  compareGreedKits,
  formatChancePct,
  formatGold,
  GreedFarmResult,
  GreedScrollCompareRow,
  OfferingChoice,
  offeringKeyFromGrade,
  PriceTable,
} from "../calculators";
import { ItemInstance } from "../Shared/ItemInstance";
import { CopyPlanLinkButton } from "./PlanResults";

function formatTiny(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n >= 0.01) return n.toFixed(3).replace(/\.?0+$/, "");
  if (n >= 0.0001) return n.toFixed(5).replace(/\.?0+$/, "");
  return n.toExponential(2);
}

function formatAttempts(n: number): string {
  if (!Number.isFinite(n)) return "∞";
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(n >= 100 ? 0 : 1);
}

function kitLabel(scrollKey: string, offering: OfferingChoice): string {
  const o = offeringKeyFromGrade(offering);
  return o ? `${scrollKey} + ${o}` : scrollKey;
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography
        variant="h6"
        fontWeight={700}
        sx={{ fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}
        title={hint}
      >
        {value}
      </Typography>
    </Box>
  );
}

export function GreedFarmResults(props: {
  itemKey: ItemKey;
  itemName: string;
  result: GreedFarmResult | null;
  compareRows: GreedScrollCompareRow[];
  onPickKit: (scrollKey: GreedFarmResult["scrollKey"], offering: OfferingChoice) => void;
}) {
  const { itemKey, itemName, result, compareRows, onPickKit } = props;

  if (!result) {
    return (
      <Paper sx={{ p: 3 }} variant="outlined">
        <Typography color="text.secondary">
          Pick an upgradeable item. Set its unit price (vendor catalog, market, or event estimate)
          and a High-grade+ farm level.
        </Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems={{ sm: "flex-start" }}
        justifyContent="space-between"
      >
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
          <ItemInstance itemInfo={{ name: itemKey, level: result.level }} size={48} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" fontWeight={700} noWrap>
              {itemName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Farm +{result.level} → +{result.toLevel}
              {result.eligible ? ` · ${formatChancePct(result.chance)} chance` : ""}
            </Typography>
          </Box>
        </Stack>
        <CopyPlanLinkButton />
      </Stack>

      {!result.eligible ? (
        <Alert severity="warning">
          {result.grade < 1
            ? `Essence of Greed needs High grade+ (this item from +${
                Number.isFinite(result.minEligibleLevel) ? result.minEligibleLevel : "?"
              }).`
            : "Scroll grade too low for this item, or chance is 0/100% — no edge greed."}
        </Alert>
      ) : null}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={3} flexWrap="wrap">
          <Metric label="Gold / greed" value={formatGold(result.goldPerGreed)} />
          {result.targetCount > 1 ? (
            <Metric
              label={`Gold for ${result.targetCount}`}
              value={formatGold(result.goldForTarget)}
            />
          ) : null}
          <Metric
            label="Attempts / greed"
            value={formatAttempts(result.attemptsPerGreed)}
            hint={`${formatTiny(result.greedPerAttempt)} per attempt`}
          />
          <Metric
            label="Cost / attempt"
            value={formatGold(result.attemptCost)}
            hint="Item + scroll + offering (item replaced each try)"
          />
          {result.targetCount > 1 ? (
            <Metric label="Attempts for target" value={formatAttempts(result.attemptsForTarget)} />
          ) : null}
        </Stack>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5 }}>
          P(greed)/attempt {formatTiny(result.greedPerAttempt)} · keep ≥1 free inventory slot ·
          successes yield +{result.toLevel} (not credited) · expected Lucky while farming target:{" "}
          {formatTiny(result.expectedLuckyForTarget)}
        </Typography>
      </Paper>

      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Typography variant="overline" color="text.secondary">
          Kit
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 0.5, gap: 1 }}>
          <Chip size="small" label={`Item ${formatGold(result.itemUnit)}`} />
          <Chip size="small" label={`${result.scrollKey} ${formatGold(result.scrollUnit)}`} />
          {result.offeringKey ? (
            <Chip size="small" label={`${result.offeringKey} ${formatGold(result.offeringUnit)}`} />
          ) : (
            <Chip size="small" variant="outlined" label="No offering" />
          )}
        </Stack>
      </Paper>

      {compareRows.length > 0 ? (
        <Paper variant="outlined" sx={{ overflow: "auto" }}>
          <Box sx={{ px: 1.5, pt: 1.25 }}>
            <Typography variant="overline" color="text.secondary">
              Scroll kits at +{result.level} (cheapest gold/greed)
            </Typography>
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Kit</TableCell>
                <TableCell align="right">Chance</TableCell>
                <TableCell align="right">Gold/greed</TableCell>
                <TableCell align="right">Attempts</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {compareRows.slice(0, 8).map((row) => {
                const isSelected =
                  row.scrollKey === result.scrollKey &&
                  offeringKeyFromGrade(row.offering) === result.offeringKey;
                return (
                  <TableRow
                    key={`${row.scrollKey}-${row.offering}`}
                    hover
                    selected={isSelected}
                    onClick={() => onPickKit(row.scrollKey, row.offering)}
                    sx={{ cursor: "pointer" }}
                  >
                    <TableCell>{kitLabel(row.scrollKey, row.offering)}</TableCell>
                    <TableCell align="right">{formatChancePct(row.result.chance)}</TableCell>
                    <TableCell align="right">{formatGold(row.result.goldPerGreed)}</TableCell>
                    <TableCell align="right">
                      {formatAttempts(row.result.attemptsPerGreed)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>
      ) : null}
    </Stack>
  );
}

/** Build compare rows for the results panel (null offering only — keep table short). */
export function greedCompareForLevel(args: {
  gItem: NonNullable<Parameters<typeof compareGreedKits>[0]["gItem"]>;
  itemKey: ItemKey;
  level: number;
  itemUnit: number;
  prices: PriceTable;
  luckySlot: boolean;
  tables: Parameters<typeof compareGreedKits>[0]["tables"];
}): GreedScrollCompareRow[] {
  return compareGreedKits({
    ...args,
    offerings: [null],
  });
}
