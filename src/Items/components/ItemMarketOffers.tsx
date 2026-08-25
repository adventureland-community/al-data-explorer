import {
  Box,
  Link,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useMemo } from "react";
import { Link as RouterLink } from "react-router-dom";
import { ItemKey, TradeItemInfo } from "typed-adventureland";

import type { BuySellItemPrices, Merchant } from "../../Market/useMerchants";
import { useMerchants } from "../../Market/useMerchants";
import { abbreviateNumber } from "../../Shared/utils";

type OfferRow = {
  id: string;
  level: number;
  title: string;
  merchantName: string;
  price: number;
  quantity: number;
};

function collectOffers(
  byTitle: Partial<Record<string, BuySellItemPrices[]>> | undefined,
  side: "buying" | "selling",
): OfferRow[] {
  if (!byTitle) return [];
  const rows: OfferRow[] = [];

  for (const [titleKey, byLevel] of Object.entries(byTitle)) {
    if (!byLevel) continue;
    for (const [levelKey, prices] of Object.entries(byLevel)) {
      if (!prices) continue;
      const level = Number(levelKey);
      for (const [merchantName, entry] of Object.entries(prices[side].merchants)) {
        for (const item of entry.items as TradeItemInfo[]) {
          if (item.price == null) continue;
          rows.push({
            id: `${side}-${titleKey}-${level}-${merchantName}-${item.price}-${item.q ?? 1}`,
            level,
            title: titleKey,
            merchantName,
            price: item.price,
            quantity: item.q ?? 1,
          });
        }
      }
    }
  }

  return rows.sort((a, b) => (side === "selling" ? a.price - b.price : b.price - a.price));
}

function merchantTooltip(merchant: Merchant | undefined, name: string): string {
  if (!merchant) return name;
  return [
    name,
    `Server: ${merchant.serverRegion}${merchant.serverIdentifier}`,
    `Map: ${merchant.map}`,
    `X: ${merchant.x.toFixed(0)}, Y: ${merchant.y.toFixed(0)}`,
  ].join("\n");
}

function copyMerchantMove(merchant: Merchant | undefined) {
  if (!merchant) return;
  const command = `smart_move({map: "${merchant.map}", x: ${merchant.x}, y: ${merchant.y}})`;
  navigator.clipboard.writeText(command).catch(() => {
    /* ignore clipboard failures */
  });
}

function OfferTable({
  label,
  rows,
  merchants,
  emptyText,
}: {
  label: string;
  rows: OfferRow[];
  merchants: Record<string, Merchant>;
  emptyText: string;
}) {
  return (
    <Box sx={{ mt: 0.75 }}>
      <Typography
        variant="caption"
        sx={{ display: "block", opacity: 0.7, mb: 0.25, letterSpacing: 0.4 }}
      >
        {label}
      </Typography>
      {rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {emptyText}
        </Typography>
      ) : (
        <Box sx={{ maxHeight: 220, overflow: "auto" }}>
          <Table size="small" sx={{ "& td, & th": { borderColor: "divider", py: 0.35, px: 0.75 } }}>
            <TableHead>
              <TableRow>
                <TableCell>Lvl</TableCell>
                <TableCell align="right">Price</TableCell>
                <TableCell align="right">Qty</TableCell>
                <TableCell>Merchant</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => {
                const merchant = merchants[row.merchantName];
                const titlePrefix = row.title ? `${row.title} ` : "";
                return (
                  <TableRow key={row.id} hover>
                    <TableCell sx={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                      {titlePrefix}+{row.level}
                    </TableCell>
                    <TableCell
                      align="right"
                      title={row.price.toLocaleString()}
                      sx={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {abbreviateNumber(row.price)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                      {row.quantity > 1 ? row.quantity : "—"}
                    </TableCell>
                    <TableCell
                      title={merchantTooltip(merchant, row.merchantName)}
                      onClick={() => copyMerchantMove(merchant)}
                      sx={{ cursor: merchant ? "pointer" : "default" }}
                    >
                      {row.merchantName}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      )}
    </Box>
  );
}

/** Live buy/sell offers for one item (aldata merchants). */
export function ItemMarketOffers({ itemKey }: { itemKey: ItemKey }) {
  const { items, merchants, lastRefresh } = useMerchants();

  const byTitle = items[itemKey];
  const selling = useMemo(() => collectOffers(byTitle, "selling"), [byTitle]);
  const buying = useMemo(() => collectOffers(byTitle, "buying"), [byTitle]);
  const loaded = lastRefresh != null;
  const hasOffers = selling.length > 0 || buying.length > 0;

  return (
    <Box sx={{ mt: 1.5 }}>
      <Typography
        variant="overline"
        sx={{ lineHeight: 1.2, opacity: 0.7, display: "block", mb: 0.25 }}
      >
        Player market
      </Typography>

      {!loaded && (
        <Typography variant="body2" color="text.secondary">
          Loading merchant offers…
        </Typography>
      )}

      {loaded && !hasOffers && (
        <Typography variant="body2" color="text.secondary">
          No live buyer or seller offers for this item.
        </Typography>
      )}

      {loaded && hasOffers && (
        <>
          <OfferTable label="Selling" rows={selling} merchants={merchants} emptyText="No sellers" />
          <OfferTable label="Buying" rows={buying} merchants={merchants} emptyText="No buyers" />
        </>
      )}

      <Typography variant="body2" sx={{ mt: 0.75 }}>
        <Link component={RouterLink} to="/market">
          Open full market
        </Link>
        {lastRefresh && (
          <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            updated {lastRefresh.toLocaleString()}
          </Typography>
        )}
      </Typography>
    </Box>
  );
}
