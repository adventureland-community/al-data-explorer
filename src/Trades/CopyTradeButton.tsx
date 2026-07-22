import { Button } from "@mui/material";
import { useState } from "react";

import { formatCopyTradeMessage } from "./formatCopyTradeMessage";
import { TradeListing, TradeSide } from "./tradeTypes";
import { TradeRow } from "./tradeViewModel";

export function CopyTradeButton({ row }: { row: TradeRow }) {
  const [copied, setCopied] = useState(false);
  const { ownerLabel, listing, side, tradeSide, discordName, discordId } = row;

  const onCopy = async () => {
    const text = formatCopyTradeMessage({
      ownerLabel,
      listing,
      side,
      tradeSide,
      discordName,
      discordId,
    });
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be blocked; ignore
    }
  };

  return (
    <Button size="small" onClick={onCopy} sx={{ textTransform: "none" }}>
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

export function CopyTradeButtonFromParts({
  ownerLabel,
  listing,
  side,
  tradeSide,
  discordName,
  discordId,
}: {
  ownerLabel: string;
  listing: TradeListing;
  side: "WTS" | "WTB";
  tradeSide: TradeSide;
  discordName?: string;
  discordId?: string;
}) {
  return (
    <CopyTradeButton
      row={{
        owner: "",
        ownerLabel,
        listing,
        side,
        tradeSide,
        discordName,
        discordId,
      }}
    />
  );
}
