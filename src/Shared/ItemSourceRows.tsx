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
import {
  UseExchangeRewardView,
  UseMerchantRef,
  UseTokenSpendView,
  UseTokenVendorGroup,
} from "../gameData/itemUses";
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
              {offer.quantity > 1 ? (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontVariantNumeric: "tabular-nums" }}
                >
                  ×{offer.quantity.toLocaleString("en-US")}
                </Typography>
              ) : null}
              <ItemInstance
                itemInfo={{
                  name: offer.tokenKey as ItemKey,
                  q: Math.max(1, offer.tokenCost),
                }}
                size={28}
                showQuantity
                forceShowQuantity
              />
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

function MerchantHeader({
  npcId,
  npcLabel,
  fallback,
}: {
  npcId?: string;
  npcLabel?: string;
  fallback: string;
}) {
  const label = npcLabel ?? fallback;
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.25,
        minHeight: SOURCE_ICON_BOX,
        py: 0.25,
      }}
    >
      <Box
        sx={{
          width: SOURCE_ICON_BOX,
          minWidth: SOURCE_ICON_BOX,
          height: SOURCE_ICON_BOX,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          // Animation NPC skins are wider than character cells — don't clip them to blank.
          overflow: "visible",
        }}
      >
        {npcId ? (
          <NpcImage npcId={npcId} scale={NPC_SCALE} />
        ) : (
          <Box
            sx={{
              width: TABLE_ITEM_SIZE,
              height: TABLE_ITEM_SIZE,
              borderRadius: 1,
              bgcolor: "action.hover",
            }}
          />
        )}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body1" sx={{ fontWeight: 600, lineHeight: 1.25 }}>
          {label}
        </Typography>
        {npcId && npcLabel && npcId !== npcLabel ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
            {npcId}
          </Typography>
        ) : null}
      </Box>
    </Box>
  );
}

const USE_TILE_WIDTH = 76;
const USE_ITEM_SIZE = 48;
const USE_TOKEN_SIZE = 18;

function UseItemGrid({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 1.25,
        mt: 0.75,
        mb: 0.5,
      }}
    >
      {children}
    </Box>
  );
}

function TokenSpendTile({ spend }: { spend: UseTokenSpendView }) {
  return (
    <Box
      sx={{
        width: USE_TILE_WIDTH,
        textAlign: "center",
        minWidth: 0,
      }}
    >
      <ItemInstance
        itemInfo={{
          name: spend.itemKey as ItemKey,
          ...(spend.quantity > 1 ? { q: spend.quantity } : {}),
        }}
        size={USE_ITEM_SIZE}
        linkToDetail
        showQuantity={spend.quantity > 1}
      />
      <Typography
        variant="caption"
        component={RouterLink}
        to={spend.linkTo}
        noWrap
        title={spend.label}
        sx={{
          display: "block",
          mt: 0.35,
          textDecoration: "none",
          color: "primary.main",
          lineHeight: 1.2,
        }}
      >
        {spend.label}
      </Typography>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mt: 0.35,
        }}
      >
        <ItemInstance
          itemInfo={{
            name: spend.tokenKey as ItemKey,
            q: Math.max(1, spend.tokenCost),
          }}
          size={USE_TOKEN_SIZE + 10}
          linkToDetail={false}
          tooltip
          showQuantity
          forceShowQuantity
        />
      </Box>
    </Box>
  );
}

/** Spend this token at its NPC to buy the listed items. */
export function TokenSpendList({ vendors }: { vendors: UseTokenVendorGroup[] }) {
  if (vendors.length === 0) return null;
  return (
    <>
      {vendors.map((vendor) => (
        <Box key={vendor.npcId ?? vendor.npcLabel ?? "shop"} sx={{ mt: 0.5 }}>
          <MerchantHeader npcId={vendor.npcId} npcLabel={vendor.npcLabel} fallback="Token shop" />
          <SectionLabel>Buy with this token</SectionLabel>
          <UseItemGrid>
            {vendor.spends.map((spend) => (
              <TokenSpendTile key={spend.id} spend={spend} />
            ))}
          </UseItemGrid>
        </Box>
      ))}
    </>
  );
}

function ExchangeRewardTile({ row }: { row: UseExchangeRewardView }) {
  return (
    <Box sx={{ width: USE_TILE_WIDTH, textAlign: "center", minWidth: 0 }}>
      <ItemInstance itemInfo={{ name: row.itemKey as ItemKey }} size={USE_ITEM_SIZE} linkToDetail />
      <Typography
        variant="caption"
        component={RouterLink}
        to={row.linkTo}
        noWrap
        title={row.label}
        sx={{
          display: "block",
          mt: 0.35,
          textDecoration: "none",
          color: "primary.main",
          lineHeight: 1.2,
        }}
      >
        {row.label}
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          display: "block",
          mt: 0.2,
          fontVariantNumeric: "tabular-nums",
          fontWeight: 600,
          lineHeight: 1.15,
          whiteSpace: "nowrap",
        }}
      >
        {row.oddsLabel}
      </Typography>
    </Box>
  );
}

/** Rewards from exchanging this item at an exchange NPC. */
export function ExchangeRewardList({
  rewards,
  merchant,
}: {
  rewards: UseExchangeRewardView[];
  merchant?: UseMerchantRef;
}) {
  if (rewards.length === 0) return null;
  return (
    <Box sx={{ mt: 0.5 }}>
      <MerchantHeader
        npcId={merchant?.npcId}
        npcLabel={merchant?.npcLabel}
        fallback="Exchange NPC"
      />
      <SectionLabel>Exchange for</SectionLabel>
      <UseItemGrid>
        {rewards.map((row) => (
          <ExchangeRewardTile key={row.id} row={row} />
        ))}
      </UseItemGrid>
    </Box>
  );
}
