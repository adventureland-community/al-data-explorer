import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { ReactNode, useEffect, useState } from "react";
import { ItemKey } from "typed-adventureland";

import { craftExpectedCost, formatGold, PriceTable } from "../calculators";
import { ItemInstance } from "../Shared/ItemInstance";

export function PriceField({
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

export function MaterialPriceRow({
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

export function MarketPriceHint({
  marketPrice,
  unitPrice,
  vendorBuyable,
  onApplyMarket,
}: {
  marketPrice: number | undefined;
  unitPrice: number;
  vendorBuyable: boolean;
  onApplyMarket?: (n: number) => void;
}) {
  if (marketPrice == null) {
    if (vendorBuyable) return null;
    return (
      <Typography variant="caption" color="text.secondary">
        no market listing
      </Typography>
    );
  }

  const differs = !Number.isFinite(unitPrice) || Math.abs(unitPrice - marketPrice) > 1e-9;
  return (
    <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap">
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontVariantNumeric: "tabular-nums" }}
      >
        market {formatGold(marketPrice)}
      </Typography>
      {onApplyMarket && differs ? (
        <Button
          size="small"
          variant="text"
          onClick={() => onApplyMarket(marketPrice)}
          sx={{ minWidth: 0, px: 0.5, py: 0, fontSize: "0.7rem", lineHeight: 1.4 }}
        >
          Use market
        </Button>
      ) : null}
    </Stack>
  );
}

/** One craft of the selected item: leaves + fee, each leaf price overridable. */
export function CraftRecipeBreakdown({
  craftCost,
  materialLabel,
  prices,
  priceOverrides,
  onPriceChange,
  getMarketPrice,
  isVendorBuyable,
  useMarketPrices,
  onUseMarketPricesChange,
}: {
  craftCost: NonNullable<ReturnType<typeof craftExpectedCost>>;
  materialLabel: (key: string) => string;
  prices: PriceTable;
  priceOverrides: PriceTable;
  onPriceChange: (key: string, n: number) => void;
  getMarketPrice?: (key: string) => number | undefined;
  isVendorBuyable?: (key: string) => boolean;
  useMarketPrices?: boolean;
  onUseMarketPricesChange?: (v: boolean) => void;
}) {
  const unresolved = craftCost.ok ? [] : craftCost.unresolved;
  const leafKeys = new Set(craftCost.leaves.map((l) => l.itemKey));
  const missingOnly = unresolved.filter((k) => !leafKeys.has(k));
  const showMarketControls = getMarketPrice != null;

  return (
    <Stack spacing={1} sx={{ mt: 1 }}>
      {onUseMarketPricesChange != null ? (
        <FormControlLabel
          sx={{ ml: 0, alignItems: "flex-start", mr: 0 }}
          control={
            <Switch
              size="small"
              checked={Boolean(useMarketPrices)}
              onChange={(e) => onUseMarketPricesChange(e.target.checked)}
            />
          }
          label={
            <Box>
              <Typography variant="body2">Use market prices</Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Non-vendor materials take the cheapest player listing when available
              </Typography>
            </Box>
          }
        />
      ) : null}
      <Typography variant="caption" color="text.secondary">
        Recipe (per craft) — edit unit prices to override market/vendor
      </Typography>
      {craftCost.leaves.map((leaf) => {
        const unit =
          typeof prices[leaf.itemKey] === "number" && Number.isFinite(prices[leaf.itemKey])
            ? prices[leaf.itemKey]
            : leaf.unitPrice;
        const line = Number.isFinite(unit) ? unit * leaf.quantity : Infinity;
        const marketPrice = getMarketPrice?.(leaf.itemKey);
        const vendorBuyable = isVendorBuyable?.(leaf.itemKey) ?? false;
        return (
          <Stack key={leaf.itemKey} spacing={0.25}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <ItemInstance itemInfo={{ name: leaf.itemKey as ItemKey }} size={28} tooltip />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" noWrap>
                  {materialLabel(leaf.itemKey)} × {leaf.quantity}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  noWrap
                  sx={{ display: "block", fontFamily: "monospace", fontSize: "0.65rem" }}
                >
                  {leaf.itemKey}
                </Typography>
                {priceOverrides[leaf.itemKey] != null ? (
                  <Typography variant="caption" color="primary.main">
                    edited
                  </Typography>
                ) : vendorBuyable ? (
                  <Typography variant="caption" color="text.secondary">
                    vendor
                  </Typography>
                ) : null}
                {showMarketControls && !vendorBuyable ? (
                  <MarketPriceHint
                    marketPrice={marketPrice}
                    unitPrice={unit}
                    vendorBuyable={vendorBuyable}
                    onApplyMarket={(n) => onPriceChange(leaf.itemKey, n)}
                  />
                ) : null}
                {leaf.quantity > 1 && Number.isFinite(line) ? (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", fontVariantNumeric: "tabular-nums" }}
                  >
                    line {formatGold(line)}
                  </Typography>
                ) : !Number.isFinite(unit) ? (
                  <Typography variant="caption" color="warning.main">
                    needs price
                  </Typography>
                ) : null}
              </Box>
              <PriceField
                value={Number.isFinite(unit) ? unit : 0}
                onChange={(n) => onPriceChange(leaf.itemKey, n)}
                width={104}
              />
            </Stack>
          </Stack>
        );
      })}
      {missingOnly.map((key) => {
        const marketPrice = getMarketPrice?.(key);
        const vendorBuyable = isVendorBuyable?.(key) ?? false;
        const unit = prices[key] ?? 0;
        return (
          <Stack key={`missing-${key}`} direction="row" alignItems="center" spacing={1}>
            <ItemInstance itemInfo={{ name: key as ItemKey }} size={28} tooltip />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" noWrap>
                {materialLabel(key)}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                noWrap
                sx={{ display: "block", fontFamily: "monospace", fontSize: "0.65rem" }}
              >
                {key}
              </Typography>
              <Typography variant="caption" color="warning.main">
                needs price
              </Typography>
              {showMarketControls && !vendorBuyable ? (
                <MarketPriceHint
                  marketPrice={marketPrice}
                  unitPrice={unit}
                  vendorBuyable={vendorBuyable}
                  onApplyMarket={(n) => onPriceChange(key, n)}
                />
              ) : null}
            </Box>
            <PriceField value={unit} onChange={(n) => onPriceChange(key, n)} width={104} />
          </Stack>
        );
      })}
      {craftCost.fee > 0 ? (
        <Stack direction="row" justifyContent="space-between" alignItems="baseline">
          <Typography variant="caption" color="text.secondary">
            Craft fee
          </Typography>
          <Typography variant="caption" sx={{ fontVariantNumeric: "tabular-nums" }}>
            {formatGold(craftCost.fee)}
          </Typography>
        </Stack>
      ) : null}
      <Stack direction="row" justifyContent="space-between" alignItems="baseline">
        <Typography variant="body2" fontWeight={600}>
          Craft EV
        </Typography>
        <Typography
          variant="body2"
          fontWeight={700}
          color={craftCost.ok ? "text.primary" : "warning.main"}
          sx={{ fontVariantNumeric: "tabular-nums" }}
        >
          {craftCost.ok ? formatGold(craftCost.cost) : `${formatGold(craftCost.partialCost)}+`}
        </Typography>
      </Stack>
      {!craftCost.ok ? (
        <Alert severity="warning" sx={{ py: 0.5 }}>
          Set a unit price for every material above before Craft Acquire is complete.
        </Alert>
      ) : null}
    </Stack>
  );
}
