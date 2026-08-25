import { Box, Link, List, ListItem, ListItemText, Typography } from "@mui/material";
import { ReactNode } from "react";
import { Link as RouterLink } from "react-router-dom";
import { ItemKey } from "typed-adventureland";

import {
  AcquisitionDropView,
  AcquisitionExchangeView,
  AcquisitionShopView,
  AcquisitionTokenView,
} from "../gameData/itemAcquisition";
import { AcquisitionDropIcon } from "./AcquisitionDropIcon";
import { ItemInstance } from "./ItemInstance";
import { NpcImage } from "./SpriteSkin";

/** Icon column width — large enough to read sprites without huge empty row gaps. */
const SOURCE_ICON_BOX = 64;
const MONSTER_SCALE = 1.85;
const NPC_SCALE = 1.6;
const TABLE_ITEM_SIZE = 40;

function SourceIconSlot({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        width: SOURCE_ICON_BOX,
        minWidth: SOURCE_ICON_BOX,
        height: SOURCE_ICON_BOX,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {children}
    </Box>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <Typography
      variant="overline"
      sx={{ lineHeight: 1.2, opacity: 0.7, mt: 1.25, mb: 0.25, display: "block" }}
    >
      {children}
    </Typography>
  );
}

export function DropSourceRow({ drop }: { drop: AcquisitionDropView }) {
  return (
    <ListItem
      disableGutters
      disablePadding
      sx={{ alignItems: "center", py: 0.35, gap: 1, minHeight: SOURCE_ICON_BOX }}
    >
      <SourceIconSlot>
        <AcquisitionDropIcon drop={drop} monsterScale={MONSTER_SCALE} itemSize={TABLE_ITEM_SIZE} />
      </SourceIconSlot>
      <ListItemText
        primary={
          drop.linkTo ? (
            <Link component={RouterLink} to={drop.linkTo} variant="body2">
              {drop.label}
            </Link>
          ) : (
            <Typography variant="body2" component="span">
              {drop.label}
            </Typography>
          )
        }
        secondary={drop.secondary}
        primaryTypographyProps={{ variant: "body2" }}
        secondaryTypographyProps={{ variant: "caption" }}
        sx={{ my: 0 }}
      />
      <Typography variant="body2" sx={{ flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
        {drop.oddsLabel}
      </Typography>
    </ListItem>
  );
}

export function DropSourceList({ drops }: { drops: AcquisitionDropView[] }) {
  if (drops.length === 0) return null;

  return (
    <>
      <SectionLabel>Drops</SectionLabel>
      <List dense disablePadding sx={{ py: 0 }}>
        {drops.map((drop) => (
          <DropSourceRow key={drop.id} drop={drop} />
        ))}
      </List>
    </>
  );
}

export function NpcShopSourceList({ shops }: { shops: AcquisitionShopView[] }) {
  if (shops.length === 0) return null;
  return (
    <>
      <SectionLabel>Buy from NPC</SectionLabel>
      <List dense disablePadding sx={{ py: 0 }}>
        {shops.map((shop) => (
          <ListItem
            key={shop.npcId}
            disableGutters
            disablePadding
            sx={{ minHeight: SOURCE_ICON_BOX, gap: 1, alignItems: "center", py: 0.35 }}
          >
            <SourceIconSlot>
              <NpcImage npcId={shop.npcId} scale={NPC_SCALE} />
            </SourceIconSlot>
            <ListItemText
              primary={shop.label}
              secondary={shop.mapLabel}
              primaryTypographyProps={{ variant: "body2" }}
              secondaryTypographyProps={{ variant: "caption" }}
              sx={{ my: 0 }}
            />
            <Typography
              variant="body2"
              sx={{ flexShrink: 0, fontVariantNumeric: "tabular-nums", fontWeight: 600 }}
            >
              {shop.priceLabel}
            </Typography>
          </ListItem>
        ))}
      </List>
    </>
  );
}

export function TokenOfferList({ offers }: { offers: AcquisitionTokenView[] }) {
  if (offers.length === 0) return null;
  return (
    <>
      <SectionLabel>Buy with tokens</SectionLabel>
      <List dense disablePadding sx={{ py: 0 }}>
        {offers.map((offer) => (
          <ListItem
            key={`${offer.tokenKey}-${offer.npcId ?? "shop"}`}
            disableGutters
            disablePadding
            sx={{ minHeight: SOURCE_ICON_BOX, gap: 1, alignItems: "center", py: 0.35 }}
          >
            <SourceIconSlot>
              {offer.npcId ? (
                <NpcImage npcId={offer.npcId} scale={NPC_SCALE} />
              ) : (
                <ItemInstance
                  itemInfo={{ name: offer.tokenKey as ItemKey }}
                  size={TABLE_ITEM_SIZE}
                />
              )}
            </SourceIconSlot>
            <ListItemText
              primary={offer.npcLabel ?? offer.tokenName}
              secondary={
                <>
                  <Link component={RouterLink} to={offer.linkTo} variant="caption">
                    {offer.tokenName}
                  </Link>
                  {offer.npcLabel ? ` · ${offer.tokenKey}` : null}
                </>
              }
              primaryTypographyProps={{ variant: "body2" }}
              secondaryTypographyProps={{ variant: "caption", component: "div" }}
              sx={{ my: 0 }}
            />
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexShrink: 0 }}>
              <ItemInstance itemInfo={{ name: offer.tokenKey as ItemKey }} size={28} />
              <Typography
                variant="body2"
                sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}
              >
                {offer.costLabel}
              </Typography>
            </Box>
          </ListItem>
        ))}
      </List>
    </>
  );
}

export function ExchangeSourceList({ exchanges }: { exchanges: AcquisitionExchangeView[] }) {
  if (exchanges.length === 0) return null;
  return (
    <>
      <SectionLabel>Exchange</SectionLabel>
      <List dense disablePadding sx={{ py: 0 }}>
        {exchanges.map((row) => (
          <ListItem
            key={row.id}
            disableGutters
            disablePadding
            sx={{ minHeight: SOURCE_ICON_BOX, gap: 1, alignItems: "center", py: 0.35 }}
          >
            <SourceIconSlot>
              <ItemInstance itemInfo={{ name: row.inputKey as ItemKey }} size={TABLE_ITEM_SIZE} />
            </SourceIconSlot>
            <ListItemText
              primary={
                <Link component={RouterLink} to={row.linkTo} variant="body2">
                  {row.label}
                </Link>
              }
              secondary={row.secondary ?? "Exchange NPC"}
              primaryTypographyProps={{ variant: "body2" }}
              secondaryTypographyProps={{ variant: "caption" }}
              sx={{ my: 0 }}
            />
            <Typography
              variant="body2"
              sx={{ flexShrink: 0, fontVariantNumeric: "tabular-nums", fontWeight: 600 }}
            >
              {row.oddsLabel}
            </Typography>
          </ListItem>
        ))}
      </List>
    </>
  );
}
