import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import { IconButton, Tooltip } from "@mui/material";
import { MouseEvent, useState } from "react";

import { formatCopyTradeMessage } from "./formatCopyTradeMessage";
import { TradeListing, TradeSide } from "./tradeTypes";
import { TradeRow } from "./tradeViewModel";

async function copyRowMessage(row: TradeRow): Promise<boolean> {
  const text = formatCopyTradeMessage({
    ownerLabel: row.ownerLabel,
    listing: row.listing,
    side: row.side,
    tradeSide: row.tradeSide,
    discordName: row.discordName,
    discordId: row.discordId,
  });
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function CopyTradeButton({ row, iconOnly = true }: { row: TradeRow; iconOnly?: boolean }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const ok = await copyRowMessage(row);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Tooltip title={copied ? "Copied" : "Copy Discord message"} placement="top">
      <IconButton
        size="small"
        onClick={onCopy}
        aria-label={copied ? "Copied" : "Copy Discord message"}
        sx={{
          p: iconOnly ? 0.25 : 0.5,
          color: copied ? "success.main" : "text.secondary",
        }}
      >
        {copied ? (
          <CheckIcon sx={{ fontSize: iconOnly ? 14 : 16 }} />
        ) : (
          <ContentCopyIcon sx={{ fontSize: iconOnly ? 14 : 16 }} />
        )}
      </IconButton>
    </Tooltip>
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
