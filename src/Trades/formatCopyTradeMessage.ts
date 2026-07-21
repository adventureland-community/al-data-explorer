import { ItemRef, TradeListing, TradeSide } from "./tradeTypes";

function formatListingMeta(listing: ItemRef): string {
  const parts: string[] = [];
  if (listing.level !== undefined) parts.push(`+${listing.level}`);
  if (listing.p) parts.push(listing.p);
  return parts.join(" ");
}

function formatSideDetails(listing: TradeListing, side: TradeSide): string[] {
  const parts: string[] = [];
  const quantity = side.quantity === undefined ? "" : `${side.quantity} `;
  const meta = formatListingMeta(listing);
  const metaPart = meta ? `${meta} ` : "";
  const note = side.note ?? listing.note;

  if (side.price !== undefined) {
    const obo = side.priceNegotiable ? " (OBO)" : "";
    const notePart = note ? ` — ${note}` : "";
    parts.push(`${quantity}${metaPart}@ ${side.price.toLocaleString()}${obo}${notePart}`);
  }

  for (const offer of side.trades ?? []) {
    const negotiable = offer.negotiable ? " (negotiable)" : "";
    const offerMeta = formatListingMeta(offer.item);
    const forItem = offerMeta ? `${offerMeta} ${offer.item.name}` : offer.item.name;
    parts.push(`${quantity}${offer.give}:${offer.receive} for ${forItem}${negotiable}`);
  }

  return parts;
}

/**
 * Build a Discord-ready message for a bank listing.
 * Uses `<@discordId>` when available so pasting can ping; otherwise plain `@discordName`.
 */
export function formatCopyTradeMessage(args: {
  ownerLabel: string;
  listing: TradeListing;
  side: "WTS" | "WTB";
  tradeSide: TradeSide;
  discordName?: string;
  discordId?: string;
}): string {
  const contact = args.discordId
    ? `<@${args.discordId}>`
    : args.discordName
      ? `@${args.discordName}`
      : args.ownerLabel;

  const details = formatSideDetails(args.listing, args.tradeSide);
  const detailText = details.length > 0 ? details.join("; ") : "(see listing)";
  return `${contact} — ${args.ownerLabel} ${args.side} ${args.listing.name} ${detailText}`.trim();
}
