import { Chip, Link, List, ListItem, ListItemText, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { GItem, ItemKey } from "typed-adventureland";

import { formatDropProbability, parseMonsterDropTable } from "../gameData/drops";
import { GItems } from "../GDataContext";

/** Monster inspect: drop table rows from G.drops.monsters[type]. */
export function MonsterDropList({
  monsterType,
  drops,
  items,
}: {
  monsterType: string;
  drops: Record<string, unknown[]>;
  items: GItems;
}) {
  const parsed = parseMonsterDropTable(monsterType, drops[monsterType]);
  if (parsed.length === 0) return null;

  return (
    <>
      <Typography variant="overline" sx={{ lineHeight: 1, opacity: 0.7, mt: 1, display: "block" }}>
        Drops
      </Typography>
      <List dense disablePadding sx={{ mt: 0.25 }}>
        {parsed.map((drop) => {
          const itemKey = drop.nestedTable || drop.itemKey;
          if (!itemKey) return null;
          const itemDef = (items as Record<string, GItem | undefined>)[itemKey];
          const displayName = itemDef?.name ?? itemKey;
          return (
            <ListItem key={itemKey} disableGutters disablePadding sx={{ minHeight: 24 }}>
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
