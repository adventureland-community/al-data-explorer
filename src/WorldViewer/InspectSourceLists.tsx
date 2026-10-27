import { Box, Chip, Link, List, ListItem, ListItemText, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { GItem, ItemKey } from "typed-adventureland";

import {
  formatDropProbability,
  parseHomeServerDropTable,
  parseMonsterDropTable,
} from "../gameData/drops";
import { DropSource } from "../gameData/types";
import { GItems } from "../GDataContext";
import { HomeServerBadge } from "../Shared/HomeServerBadge";

function asMonsterTable(value: unknown): Record<string, unknown[] | undefined> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown[] | undefined>;
}

function DropRows({ rows, items }: { rows: DropSource[]; items: GItems }) {
  return (
    <List dense disablePadding sx={{ mt: 0.25 }}>
      {rows.map((drop, index) => {
        const itemKey = drop.nestedTable || drop.itemKey;
        if (!itemKey) return null;
        const itemDef = (items as Record<string, GItem | undefined>)[itemKey];
        const displayName = itemDef?.name ?? itemKey;
        const rowKey = `${drop.sourceType}-${itemKey}-${drop.title}-${drop.probability}-${index}`;
        return (
          <ListItem key={rowKey} disableGutters disablePadding sx={{ minHeight: 24 }}>
            <ListItemText
              primary={
                <Link component={RouterLink} to={`/items/${itemKey}`} variant="body2">
                  {displayName}
                </Link>
              }
              primaryTypographyProps={{ variant: "body2", noWrap: true }}
            />
            {drop.probability != null && (
              <Typography variant="caption" sx={{ opacity: 0.5, flexShrink: 0, ml: 1 }}>
                {formatDropProbability(drop.probability)}
              </Typography>
            )}
          </ListItem>
        );
      })}
    </List>
  );
}

/** Monster inspect: drop table rows from G.drops.monsters + monsters_home_server. */
export function MonsterDropList({
  monsterType,
  drops,
  items,
}: {
  monsterType: string;
  /** Full `G.drops` object. */
  drops: Record<string, unknown>;
  items: GItems;
}) {
  const monsters = asMonsterTable(drops.monsters);
  const homeServer = asMonsterTable(drops.monsters_home_server);
  const regular = parseMonsterDropTable(monsterType, monsters?.[monsterType]);
  const home = parseHomeServerDropTable(monsterType, homeServer?.[monsterType]);
  if (regular.length === 0 && home.length === 0) return null;

  return (
    <>
      {regular.length > 0 && (
        <>
          <Typography
            variant="overline"
            sx={{ lineHeight: 1, opacity: 0.7, mt: 1, display: "block" }}
          >
            Drops
          </Typography>
          <DropRows rows={regular} items={items} />
        </>
      )}
      {home.length > 0 && (
        <>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              mt: 1,
            }}
          >
            <Typography variant="overline" sx={{ lineHeight: 1, opacity: 0.7 }}>
              Bonus drops
            </Typography>
            <HomeServerBadge />
          </Box>
          <DropRows rows={home} items={items} />
        </>
      )}
    </>
  );
}

/** NPC inspect: role/quest badges + shop item list. */
export function NpcShopItemList({
  npcId,
  npcs,
  items,
}: {
  npcId: string;
  npcs: Record<
    string,
    { role?: string; quest?: string; items?: (ItemKey | null)[]; name?: string }
  >;
  items: GItems;
}) {
  const npcDef = npcs[npcId];
  if (!npcDef) return null;
  const badges = [npcDef.role, npcDef.quest && `Quest: ${npcDef.quest}`].filter(
    (b): b is string => typeof b === "string",
  );
  const shopItems = npcDef.items
    ? npcDef.items.filter((k): k is NonNullable<typeof k> => k != null)
    : [];
  return (
    <>
      <Link component={RouterLink} to={`/npcs/${encodeURIComponent(npcId)}`} variant="body2">
        View NPC page
      </Link>
      {badges.length > 0 && (
        <>
          {badges.map((b) => (
            <Chip
              key={b}
              size="small"
              label={b}
              variant="outlined"
              sx={{ height: 22, fontSize: 11, mr: 0.5 }}
            />
          ))}
        </>
      )}
      {shopItems.length > 0 && (
        <>
          <Typography
            variant="overline"
            sx={{ lineHeight: 1, opacity: 0.7, mt: 1, display: "block" }}
          >
            Shop
          </Typography>
          <List dense disablePadding sx={{ mt: 0.25 }}>
            {shopItems.map((itemKey) => {
              const key = String(itemKey);
              const itemDef = (items as Record<string, GItem | undefined>)[key];
              return (
                <ListItem key={key} disableGutters disablePadding sx={{ minHeight: 24 }}>
                  <ListItemText
                    primary={
                      <Link component={RouterLink} to={`/items/${key}`} variant="body2">
                        {itemDef?.name ?? key}
                      </Link>
                    }
                    primaryTypographyProps={{ variant: "body2", noWrap: true }}
                  />
                </ListItem>
              );
            })}
          </List>
        </>
      )}
    </>
  );
}
