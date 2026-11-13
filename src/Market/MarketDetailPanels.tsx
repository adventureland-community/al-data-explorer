import {
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useContext, type ReactNode } from "react";
import { ItemKey } from "typed-adventureland";

import { CustomGData, GDataContext } from "../GDataContext";
import { ItemInstance } from "../Shared/ItemInstance";
import { abbreviateNumber } from "../Shared/utils";
import { getItemName } from "../Shared/iteminfo-util";
import { TradeOfferTerms } from "../Trades/TradeOfferTerms";
import type { TradeRow } from "../Trades/tradeViewModel";
import type { GoldOfferRow, WantOfferRow } from "./marketOfferRows";
import type { Merchant, MerchantTradeItem } from "./merchantTypes";

function getTimeAgo(lastSeen: string | Date) {
  const now = new Date();
  const lastSeenDate = new Date(lastSeen);
  const diffInMs = now.getTime() - lastSeenDate.getTime();

  const days = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffInMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffInMs % (1000 * 60 * 60)) / (1000 * 60));

  return `${days}d ${hours}h ${minutes}m ago`;
}

function merchantTooltip(merchant: Merchant | undefined, name: string): string {
  if (!merchant) return name;
  return [
    name,
    `Server: ${merchant.serverRegion}${merchant.serverIdentifier}`,
    `Map: ${merchant.map}`,
    `X: ${merchant.x.toFixed(2)}, Y: ${merchant.y.toFixed(2)}`,
    `Last seen: ${getTimeAgo(merchant.lastSeen)}`,
  ].join("\n");
}

function copyMerchantMove(merchant: Merchant | undefined) {
  if (!merchant) return;
  const command = `smart_move({map: "${merchant.map}", x: ${merchant.x}, y: ${merchant.y}})`;
  navigator.clipboard.writeText(command).catch(() => {
    /* ignore */
  });
}

function formatItemLabel(
  item: { name: string; level?: number; q?: number; p?: string },
  G: CustomGData | undefined,
) {
  const gItem = G?.items[item.name as ItemKey];
  const base = gItem ? getItemName(item.name as ItemKey, gItem) : item.name;
  const level = item.level != null && item.level > 0 ? ` +${item.level}` : "";
  const title = item.p ? `${item.p} ` : "";
  return `${title}${base}${level}`;
}

function WantTerms({
  row,
  viewedItem,
}: {
  row: WantOfferRow;
  viewedItem: { name: string; level?: number };
}) {
  const G = useContext(GDataContext);
  const { want } = row.item;
  if (!want) return null;

  const giveItem: MerchantTradeItem =
    row.direction === "giving"
      ? row.item
      : ({ name: want.name, level: want.level, q: want.q ?? 1, p: want.p } as MerchantTradeItem);
  const receiveItem =
    row.direction === "giving"
      ? want
      : { name: viewedItem.name, level: viewedItem.level, q: row.quantity };

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
      <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
        <ItemInstance
          itemInfo={
            {
              name: giveItem.name as ItemKey,
              level: giveItem.level,
              q: giveItem.q ?? 1,
              ...(giveItem.p ? { p: giveItem.p } : {}),
              ...(giveItem.data ? { data: giveItem.data } : {}),
            } as never
          }
        />
        <Typography variant="body2">{formatItemLabel(giveItem, G)}</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary">
        →
      </Typography>
      <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
        <ItemInstance
          itemInfo={
            {
              name: receiveItem.name as ItemKey,
              level: receiveItem.level,
              q: receiveItem.q ?? 1,
              ...(receiveItem.p ? { p: receiveItem.p } : {}),
            } as never
          }
        />
        <Typography variant="body2">{formatItemLabel(receiveItem, G)}</Typography>
      </Box>
    </Box>
  );
}

function PanelShell({
  title,
  badge,
  children,
  empty,
}: {
  title: string;
  badge?: string;
  children: ReactNode;
  empty?: boolean;
}) {
  return (
    <Box
      sx={{
        flex: "1 1 280px",
        minWidth: 260,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        p: 1,
        bgcolor: "background.paper",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
        <Typography variant="subtitle2">{title}</Typography>
        {badge ? <Chip size="small" label={badge} variant="outlined" /> : null}
      </Box>
      {empty ? (
        <Typography variant="body2" color="text.secondary">
          None
        </Typography>
      ) : (
        children
      )}
    </Box>
  );
}

export function GoldOffersPanel({
  title,
  rows,
  merchants,
  bestLabel,
}: {
  title: string;
  rows: GoldOfferRow[];
  merchants: Record<string, Merchant>;
  bestLabel: string;
}) {
  return (
    <PanelShell title={title} badge={`${rows.length}`} empty={rows.length === 0}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Merchant</TableCell>
            <TableCell align="right">Qty</TableCell>
            <TableCell align="right">{bestLabel}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, index) => {
            const merchant = merchants[row.merchantName];
            return (
              <TableRow key={row.id} hover selected={index === 0}>
                <TableCell
                  title={merchantTooltip(merchant, row.merchantName)}
                  onClick={() => copyMerchantMove(merchant)}
                  sx={{ cursor: merchant ? "pointer" : "default" }}
                >
                  {row.merchantName}
                  <Chip size="small" label="Stand" sx={{ ml: 0.75 }} variant="outlined" />
                </TableCell>
                <TableCell align="right">{row.quantity}</TableCell>
                <TableCell align="right" title={row.price.toLocaleString()}>
                  {abbreviateNumber(row.price)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </PanelShell>
  );
}

export function WantOffersPanel({
  title,
  rows,
  merchants,
  viewedItem,
}: {
  title: string;
  rows: WantOfferRow[];
  merchants: Record<string, Merchant>;
  viewedItem: { name: string; level?: number };
}) {
  return (
    <PanelShell title={title} badge={`${rows.length}`} empty={rows.length === 0}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Merchant</TableCell>
            <TableCell>Trade</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => {
            const merchant = merchants[row.merchantName];
            return (
              <TableRow key={row.id} hover>
                <TableCell
                  title={merchantTooltip(merchant, row.merchantName)}
                  onClick={() => copyMerchantMove(merchant)}
                  sx={{ cursor: merchant ? "pointer" : "default", verticalAlign: "top" }}
                >
                  {row.merchantName}
                  <Chip size="small" label="Stand" sx={{ ml: 0.75 }} variant="outlined" />
                </TableCell>
                <TableCell>
                  <WantTerms row={row} viewedItem={viewedItem} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </PanelShell>
  );
}

export function BankListingsPanel({ rows }: { rows: TradeRow[] }) {
  return (
    <PanelShell title="Bank listings" badge={`${rows.length}`} empty={rows.length === 0}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Owner</TableCell>
            <TableCell>Side</TableCell>
            <TableCell>Terms</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={`${row.owner}-${row.side}-${row.listing.name}-${row.listing.level ?? ""}`}
              hover
            >
              <TableCell sx={{ verticalAlign: "top" }}>
                {row.ownerLabel}
                <Chip size="small" label="Bank" sx={{ ml: 0.75 }} variant="outlined" />
              </TableCell>
              <TableCell sx={{ verticalAlign: "top" }}>{row.side}</TableCell>
              <TableCell>
                <TradeOfferTerms
                  listing={row.listing}
                  tradeSide={row.tradeSide}
                  side={row.side}
                  layout="summary"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </PanelShell>
  );
}
