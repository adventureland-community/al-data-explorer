import {
  Alert,
  Box,
  Button,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import { ItemKey } from "typed-adventureland";
import { useContext, useMemo } from "react";
import type { EntityTooltipLine } from "../gameData/entityTooltip";
import { GDataContext } from "../GDataContext";
import { RecipeItemTile } from "../Shared/RecipeItemTile";
import { abbreviateNumber } from "../Shared/utils";
import { filterBankChanges } from "./bankAnalysis";
import {
  BankItemChange,
  BankItemChangeKind,
  BankRefreshSummary,
  formatBankItemLabel,
  getUniqueItemKey,
} from "./bankItems";

const changeGridSx = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))",
  gap: 1,
  pt: 0.5,
  width: "100%",
};

function bankChangeTooltipLines(change: BankItemChange, label: string): EntityTooltipLine[] {
  const lines: EntityTooltipLine[] = [
    {
      kind: "stat",
      label: "Item",
      value: label,
      labelColor: "text.secondary",
    },
  ];

  switch (change.kind) {
    case "added":
      lines.push(
        {
          kind: "stat",
          label: "Change",
          value: "Added",
          labelColor: "text.secondary",
          valueColor: "#81c784",
        },
        {
          kind: "stat",
          label: "Quantity",
          value: change.item.q.toLocaleString(),
          labelColor: "text.secondary",
        },
        {
          kind: "stat",
          label: "Stacks",
          value: String(change.item.stack),
          labelColor: "text.secondary",
        },
      );
      break;
    case "removed":
      lines.push(
        {
          kind: "stat",
          label: "Change",
          value: "Removed",
          labelColor: "text.secondary",
          valueColor: "#ff5252",
        },
        {
          kind: "stat",
          label: "Quantity",
          value: change.item.q.toLocaleString(),
          labelColor: "text.secondary",
        },
        {
          kind: "stat",
          label: "Stacks",
          value: String(change.item.stack),
          labelColor: "text.secondary",
        },
      );
      break;
    case "changed":
      lines.push({
        kind: "stat",
        label: "Change",
        value: "Updated",
        labelColor: "text.secondary",
      });
      if (change.deltaQ) {
        lines.push({
          kind: "stat",
          label: "Quantity",
          value: `${
            change.deltaQ > 0 ? "+" : ""
          }${change.deltaQ.toLocaleString()} (${change.item.q.toLocaleString()} now)`,
          labelColor: "text.secondary",
          valueColor: change.deltaQ > 0 ? "#81c784" : "#ff5252",
        });
      }
      if (change.deltaStack) {
        lines.push({
          kind: "stat",
          label: "Stacks",
          value: `${change.deltaStack > 0 ? "+" : ""}${change.deltaStack} (${
            change.item.stack
          } now)`,
          labelColor: "text.secondary",
          valueColor: change.deltaStack > 0 ? "#81c784" : "#ff5252",
        });
      }
      break;
    default: {
      const unreachable: never = change.kind;
      return unreachable;
    }
  }

  return lines;
}

function changeBorderColor(kind: BankItemChangeKind, deltaQ?: number): string {
  switch (kind) {
    case "added":
      return "success.main";
    case "removed":
      return "error.main";
    case "changed":
      return (deltaQ ?? 0) >= 0 ? "info.main" : "warning.main";
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}

function changeQuantityColor(kind: BankItemChangeKind, deltaQ?: number): string | undefined {
  switch (kind) {
    case "added":
      return "#81c784";
    case "removed":
      return "#ff5252";
    case "changed":
      if (deltaQ == null || deltaQ === 0) return undefined;
      return deltaQ > 0 ? "#81c784" : "#ff5252";
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}

function changeBadgeQuantity(change: BankItemChange): number | undefined {
  switch (change.kind) {
    case "added":
    case "removed":
      return change.item.q;
    case "changed":
      if (change.deltaQ != null && change.deltaQ !== 0) {
        return Math.abs(change.deltaQ);
      }
      if (change.deltaStack != null && change.deltaStack !== 0) {
        return Math.abs(change.deltaStack);
      }
      return change.item.q;
    default: {
      const unreachable: never = change.kind;
      return unreachable;
    }
  }
}

function changeCaption(change: BankItemChange): string {
  switch (change.kind) {
    case "added":
      return "Added";
    case "removed":
      return "Removed";
    case "changed":
      if (change.deltaQ != null && change.deltaQ !== 0) {
        return `${change.deltaQ > 0 ? "+" : ""}${abbreviateNumber(change.deltaQ)} qty`;
      }
      if (change.deltaStack != null && change.deltaStack !== 0) {
        return `${change.deltaStack > 0 ? "+" : ""}${change.deltaStack} stacks`;
      }
      return "Changed";
    default: {
      const unreachable: never = change.kind;
      return unreachable;
    }
  }
}

function BankChangeTile({ change, label }: { change: BankItemChange; label: string }) {
  const quantity = changeBadgeQuantity(change);
  const caption = changeCaption(change);

  return (
    <Box
      sx={{
        border: 2,
        borderColor: changeBorderColor(change.kind, change.deltaQ),
        borderRadius: 1,
        p: 0.5,
        opacity: change.kind === "removed" ? 0.72 : 1,
        bgcolor: "background.paper",
      }}
    >
      <RecipeItemTile
        itemKey={change.item.name as ItemKey}
        level={change.item.level}
        title={change.item.p}
        quantity={quantity}
        showQuantity
        forceShowQuantity
        quantityColor={changeQuantityColor(change.kind, change.deltaQ)}
        tooltipExtraLines={bankChangeTooltipLines(change, label)}
        footer={
          <Typography
            variant="caption"
            sx={{
              display: "block",
              mt: 0.25,
              lineHeight: 1.1,
              fontWeight: 600,
              color: changeBorderColor(change.kind, change.deltaQ),
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {caption}
          </Typography>
        }
      />
    </Box>
  );
}

export function BankRefreshSummaryView({
  summary,
  onDismiss,
  title = "Refresh complete",
  changeFilter = "all",
  onChangeFilter,
  onExport,
}: {
  summary: BankRefreshSummary;
  onDismiss: () => void;
  title?: string;
  changeFilter?: "all" | "gear" | "quantity";
  onChangeFilter?: (mode: "all" | "gear" | "quantity") => void;
  onExport?: () => void;
}) {
  const G = useContext(GDataContext);

  const visibleChanges = useMemo(
    () => filterBankChanges(summary.changes, changeFilter, G),
    [summary.changes, changeFilter, G],
  );

  if (!summary.hasChanges) {
    return (
      <Alert severity="info" onClose={onDismiss} sx={{ mb: 2 }}>
        {title} — no changes detected.
      </Alert>
    );
  }

  return (
    <Alert
      severity="success"
      onClose={onDismiss}
      sx={{ mb: 2, "& .MuiAlert-message": { width: "100%", overflow: "visible" } }}
    >
      <Stack spacing={1}>
        <Typography variant="subtitle2">
          {title} — {visibleChanges.length} item change
          {visibleChanges.length === 1 ? "" : "s"}
          {summary.goldDelta
            ? `, gold ${summary.goldDelta > 0 ? "+" : ""}${abbreviateNumber(summary.goldDelta)}`
            : ""}
          {summary.usedSlotsDelta
            ? `, slots ${summary.usedSlotsDelta > 0 ? "+" : ""}${summary.usedSlotsDelta}`
            : ""}
        </Typography>

        {(onChangeFilter || onExport) && (
          <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
            {onChangeFilter && (
              <ToggleButtonGroup
                size="small"
                exclusive
                value={changeFilter}
                onChange={(_event, value) => value && onChangeFilter(value)}
              >
                <ToggleButton value="all">All</ToggleButton>
                <ToggleButton value="gear">Gear</ToggleButton>
                <ToggleButton value="quantity">Quantity</ToggleButton>
              </ToggleButtonGroup>
            )}
            {onExport && (
              <Button size="small" startIcon={<DownloadIcon />} onClick={onExport}>
                Export JSON
              </Button>
            )}
          </Stack>
        )}

        {visibleChanges.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No changes match this filter.
          </Typography>
        ) : (
          <Box sx={changeGridSx}>
            {visibleChanges.map((change) => (
              <BankChangeTile
                key={`${change.kind}-${getUniqueItemKey(change.item)}`}
                change={change}
                label={formatBankItemLabel(change.item, G)}
              />
            ))}
          </Box>
        )}
      </Stack>
    </Alert>
  );
}
