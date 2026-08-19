import { Box, Chip, Divider, Link, List, ListItem, ListItemText, Typography } from "@mui/material";
import { GMonster, GNpc } from "typed-adventureland";
import { GItems } from "../GDataContext";
import { parseDropTable } from "./dropTypes";
import { OverlayPick, spawnOverlayHint } from "./overlayPick";
import { ParsedMap } from "./types";
import { monsterDisplayName } from "./WorldViewerHud";

function MapBadge({ mapId, mapName }: { mapId: string; mapName: string | undefined }) {
  return (
    <Typography variant="caption" sx={{ opacity: 0.6 }}>
      {mapName ?? mapId} · ({mapId})
    </Typography>
  );
}

function PositionBadge({ x, y, size }: { x: number; y: number; size?: string }) {
  return (
    <Typography variant="caption" sx={{ opacity: 0.55 }}>
      ({x}, {y}){size ? ` · ${size}` : ""}
    </Typography>
  );
}

function MonsterStats({ monster }: { monster: GMonster }) {
  const stats = [
    monster.hp != null && `HP ${monster.hp.toLocaleString()}`,
    monster.xp != null && `XP ${monster.xp.toLocaleString()}`,
    monster.attack != null && `ATK ${monster.attack}`,
    monster.speed != null && `SPD ${monster.speed}`,
    monster.range != null && `RNG ${monster.range}`,
  ].filter((s): s is string => typeof s === "string");
  if (stats.length === 0) {
    return null;
  }
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
      {stats.map((stat) => (
        <Chip
          key={stat}
          size="small"
          label={stat}
          variant="outlined"
          sx={{ height: 22, fontSize: 11 }}
        />
      ))}
    </Box>
  );
}

function MonsterDrops({
  monsterType,
  drops,
  items,
}: {
  monsterType: string;
  drops: Record<string, unknown[]>;
  items: GItems;
}) {
  const parsed = parseDropTable(drops[monsterType]);
  if (parsed.length === 0) {
    return null;
  }
  return (
    <>
      <Typography variant="overline" sx={{ lineHeight: 1, opacity: 0.7, mt: 1, display: "block" }}>
        Drops
      </Typography>
      <List dense disablePadding sx={{ mt: 0.25 }}>
        {parsed.map((drop) => {
          const itemDef = (items as Record<string, { name?: string } | undefined>)[drop.key];
          const displayName = itemDef?.name ?? drop.key;
          const prob = drop.probability != null ? `${(drop.probability * 100).toFixed(1)}%` : "";
          return (
            <ListItem key={drop.key} disableGutters disablePadding sx={{ minHeight: 24 }}>
              <ListItemText
                primary={displayName}
                primaryTypographyProps={{ variant: "body2", noWrap: true }}
              />
              {prob && (
                <Typography variant="caption" sx={{ opacity: 0.5, flexShrink: 0, ml: 1 }}>
                  {prob}
                </Typography>
              )}
            </ListItem>
          );
        })}
      </List>
    </>
  );
}

function NpcShop({
  npcId,
  npcs,
  items,
}: {
  npcId: string;
  npcs: Record<string, GNpc>;
  items: GItems;
}) {
  const npcDef = npcs[npcId];
  if (!npcDef) {
    return null;
  }
  const badges = [npcDef.role, npcDef.quest && `Quest: ${npcDef.quest}`].filter(
    (b): b is string => typeof b === "string",
  );
  const shopItems = npcDef.items
    ? npcDef.items.filter((k): k is NonNullable<typeof k> => k != null)
    : [];
  return (
    <>
      {badges.length > 0 && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
          {badges.map((b) => (
            <Chip
              key={b}
              size="small"
              label={b}
              variant="outlined"
              sx={{ height: 22, fontSize: 11 }}
            />
          ))}
        </Box>
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
              const itemDef = (items as Record<string, { name?: string } | undefined>)[key];
              return (
                <ListItem key={key} disableGutters disablePadding sx={{ minHeight: 24 }}>
                  <ListItemText
                    primary={itemDef?.name ?? key}
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

function inspectTitle(pick: OverlayPick, monsters: Record<string, GMonster>): string {
  switch (pick.kind) {
    case "door":
      return "Door";
    case "npc":
      return pick.npc.name || pick.npc.label || pick.npc.id;
    case "monster":
      return `${monsterDisplayName(pick.monster.type, monsters)} ×${pick.monster.count}`;
    case "quirk":
      return pick.quirk.text || pick.quirk.kind;
    case "zone":
      return pick.zone.type;
    case "spawn": {
      const hint = spawnOverlayHint(pick.spawn);
      return hint === "Click to inspect" ? `Spawn ${pick.spawn.label}` : "Connections";
    }
    case "rage":
      return `${monsterDisplayName(pick.monster.type, monsters)} rage`;
    case "machine":
      return pick.machine.type;
    case "animatable":
      return pick.animatable.id;
    case "trap":
      return `${pick.trap.type} trap`;
    default: {
      const exhaustive: never = pick;
      return exhaustive;
    }
  }
}

function monsterDocsUrl(monsterType: unknown): string | null {
  // The official client links monsters as `/docs/guide/all/monsters/` + `name`.
  // Some parsed map data can contain unexpected suffixes (e.g. `goo/null`), so we
  // hard-sanitize to the base slug to avoid broken routes.
  if (typeof monsterType !== "string") {
    return null;
  }
  const slug = monsterType.trim().split("/")[0];
  if (!slug) {
    return null;
  }
  return `https://adventure.land/docs/guide/all/monsters/${encodeURIComponent(slug)}`;
}

function InspectDetails({ pick, mapName }: { pick: OverlayPick; mapName: string | undefined }) {
  switch (pick.kind) {
    case "door":
      return null;
    case "npc":
      return (
        <>
          <MapBadge mapId={pick.mapId} mapName={mapName} />
          {typeof pick.npc.x === "number" && typeof pick.npc.y === "number" && (
            <PositionBadge x={pick.npc.x} y={pick.npc.y} />
          )}
          <Typography variant="caption" sx={{ opacity: 0.6 }}>
            Skin: {pick.npc.skin}
          </Typography>
          {pick.npc.roam && (
            <Typography variant="caption" sx={{ opacity: 0.55 }}>
              Roams area ({Math.round(pick.npc.roam.width)}×{Math.round(pick.npc.roam.height)})
            </Typography>
          )}
          {pick.npc.moving && !pick.npc.roam && (
            <Typography variant="caption" sx={{ opacity: 0.55 }}>
              Roams the map
            </Typography>
          )}
        </>
      );
    case "monster": {
      const docsUrl = monsterDocsUrl(pick.monster.type);
      return (
        <>
          <MapBadge mapId={pick.mapId} mapName={mapName} />
          <PositionBadge x={pick.monster.x} y={pick.monster.y} />
          <Typography variant="caption" sx={{ opacity: 0.6 }}>
            Type: {pick.monster.type} · Count: {pick.monster.count}
          </Typography>
          {pick.monster.grow && (
            <Typography variant="caption" sx={{ opacity: 0.55 }}>
              Grow pack
            </Typography>
          )}
          {pick.monster.roam && (
            <Typography variant="caption" sx={{ opacity: 0.55 }}>
              Roams
            </Typography>
          )}
          {docsUrl && (
            <Link href={docsUrl} target="_blank" rel="noreferrer" variant="caption">
              Monster docs ↗
            </Link>
          )}
        </>
      );
    }
    case "quirk":
      return (
        <>
          <MapBadge mapId={pick.mapId} mapName={mapName} />
          <Typography variant="caption" sx={{ opacity: 0.6 }}>
            Kind: {pick.quirk.kind}
          </Typography>
          {pick.quirk.text && (
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              {pick.quirk.text}
            </Typography>
          )}
          <PositionBadge
            x={pick.quirk.x}
            y={pick.quirk.y}
            size={`${pick.quirk.width}×${pick.quirk.height}`}
          />
        </>
      );
    case "zone":
      return (
        <>
          <MapBadge mapId={pick.mapId} mapName={mapName} />
          <Typography variant="caption" sx={{ opacity: 0.6 }}>
            Zone: {pick.zone.type}
          </Typography>
        </>
      );
    case "spawn":
      return (
        <>
          <MapBadge mapId={pick.mapId} mapName={mapName} />
          <PositionBadge x={pick.spawn.x} y={pick.spawn.y} />
          {pick.spawn.arrivals.map((a) => (
            <Typography key={`${a.kind}-${a.label}`} variant="caption" sx={{ opacity: 0.7 }}>
              ← {a.label}
            </Typography>
          ))}
          {pick.spawn.departures.map((d) => (
            <Typography key={`to-${d.label}`} variant="caption" sx={{ opacity: 0.7 }}>
              → {d.label}
            </Typography>
          ))}
        </>
      );
    case "rage": {
      const box = pick.monster.rage;
      return (
        <>
          <MapBadge mapId={pick.mapId} mapName={mapName} />
          <Typography variant="caption" sx={{ opacity: 0.6 }}>
            Type: {pick.monster.type}
          </Typography>
          <PositionBadge
            x={box?.x ?? pick.monster.x}
            y={box?.y ?? pick.monster.y}
            size={box ? `${box.width}×${box.height}` : undefined}
          />
        </>
      );
    }
    case "machine":
      return (
        <>
          <MapBadge mapId={pick.mapId} mapName={mapName} />
          <PositionBadge x={pick.machine.x} y={pick.machine.y} />
        </>
      );
    case "animatable":
      return (
        <>
          <MapBadge mapId={pick.mapId} mapName={mapName} />
          <Typography variant="caption" sx={{ opacity: 0.6 }}>
            Position key: {pick.animatable.position}
          </Typography>
          <PositionBadge x={pick.animatable.x} y={pick.animatable.y} />
        </>
      );
    case "trap":
      return (
        <>
          <MapBadge mapId={pick.mapId} mapName={mapName} />
          <PositionBadge x={pick.trap.x} y={pick.trap.y} />
        </>
      );
    default: {
      const exhaustive: never = pick;
      return exhaustive;
    }
  }
}

interface InspectPanelProps {
  inspect: OverlayPick;
  maps: Record<string, ParsedMap>;
  monsters: Record<string, GMonster>;
  drops: Record<string, unknown[]>;
  items: GItems;
  npcs: Record<string, GNpc>;
  onClose: () => void;
}

export function InspectPanel({
  inspect,
  maps,
  monsters,
  drops,
  items,
  npcs,
  onClose,
}: InspectPanelProps) {
  if (inspect.kind === "door") {
    return null;
  }
  const mapName = maps[inspect.mapId]?.name;
  const title = inspectTitle(inspect, monsters);
  const monsterDef = inspect.kind === "monster" ? monsters[inspect.monster.type] : undefined;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
      <Divider sx={{ my: 1 }} />
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="subtitle2" sx={{ lineHeight: 1.3 }}>
          {title}
        </Typography>
        <Typography
          variant="caption"
          onClick={onClose}
          sx={{ cursor: "pointer", opacity: 0.5, "&:hover": { opacity: 1 } }}
        >
          ✕
        </Typography>
      </Box>
      <InspectDetails pick={inspect} mapName={mapName} />
      {inspect.kind === "monster" && (
        <>
          {monsterDef && <MonsterStats monster={monsterDef} />}
          <MonsterDrops monsterType={inspect.monster.type} drops={drops} items={items} />
        </>
      )}
      {inspect.kind === "npc" && <NpcShop npcId={inspect.npc.id} npcs={npcs} items={items} />}
    </Box>
  );
}
