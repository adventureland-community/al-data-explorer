import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Link,
  List,
  ListItem,
  ListItemText,
  Typography,
} from "@mui/material";
import { GMonster, GNpc } from "typed-adventureland";
import { GItems } from "../GDataContext";
import { OverlayPick, spawnOverlayHint } from "./overlayPick";
import { ParsedMap } from "./types";
import { monsterDisplayName } from "./WorldViewerHud";

function MapLines({
  mapId,
  mapName,
  x,
  y,
  size,
}: {
  mapId: string;
  mapName: string | undefined;
  x?: number;
  y?: number;
  size?: string;
}) {
  return (
    <>
      <Typography variant="body2">
        Map: {mapName} ({mapId})
      </Typography>
      {typeof x === "number" && typeof y === "number" && (
        <Typography variant="body2">
          Position: ({x}, {y}){size ? ` · ${size}` : ""}
        </Typography>
      )}
    </>
  );
}

function inspectTitle(pick: OverlayPick | null, monsters: Record<string, GMonster>): string {
  if (!pick || pick.kind === "door") {
    return "Inspect";
  }
  switch (pick.kind) {
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
      return hint === "Click to inspect" ? `Spawn ${pick.spawn.label}` : "Possible connections";
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

function inspectBody(pick: OverlayPick, mapName: string | undefined) {
  switch (pick.kind) {
    case "door":
      return null;
    case "npc":
      return (
        <>
          <Typography variant="body2">NPC id: {pick.npc.id}</Typography>
          <Typography variant="body2">Skin: {pick.npc.skin}</Typography>
          <MapLines mapId={pick.mapId} mapName={mapName} x={pick.npc.x} y={pick.npc.y} />
          {pick.npc.roam && (
            <Typography variant="body2">
              Moves around in this area ({Math.round(pick.npc.roam.width)}×
              {Math.round(pick.npc.roam.height)}).
            </Typography>
          )}
          {pick.npc.moving && !pick.npc.roam && (
            <Typography variant="body2">Roams the map.</Typography>
          )}
        </>
      );
    case "monster":
      return (
        <>
          <Typography variant="body2">Type: {pick.monster.type}</Typography>
          <MapLines mapId={pick.mapId} mapName={mapName} x={pick.monster.x} y={pick.monster.y} />
          <Typography variant="body2">Spawn quantity: {pick.monster.count}</Typography>
          {pick.monster.grow && (
            <Typography variant="body2">
              Grow pack — extra monsters spawn if this pack is thinned.
            </Typography>
          )}
          {pick.monster.roam && (
            <Typography variant="body2">Roams beyond this pack box.</Typography>
          )}
          <Link
            href={`https://adventure.land/docs/guide/monsters#${pick.monster.type}`}
            target="_blank"
            rel="noreferrer"
          >
            Open monster docs
          </Link>
        </>
      );
    case "quirk":
      return (
        <>
          <Typography variant="body2">Kind: {pick.quirk.kind}</Typography>
          {pick.quirk.text && <Typography variant="body2">{pick.quirk.text}</Typography>}
          <MapLines
            mapId={pick.mapId}
            mapName={mapName}
            x={pick.quirk.x}
            y={pick.quirk.y}
            size={`${pick.quirk.width}×${pick.quirk.height}`}
          />
        </>
      );
    case "zone":
      return (
        <>
          <Typography variant="body2">Zone type: {pick.zone.type}</Typography>
          <MapLines mapId={pick.mapId} mapName={mapName} />
        </>
      );
    case "spawn":
      return (
        <>
          {pick.spawn.arrivals.length > 0 && (
            <>
              {pick.spawn.arrivals.map((arrival) => (
                <Typography key={`${arrival.kind}-${arrival.label}`} variant="body2">
                  {arrival.label}
                </Typography>
              ))}
            </>
          )}
          {pick.spawn.departures.length > 0 &&
            pick.spawn.departures.map((departure) => (
              <Typography key={`to-${departure.label}`} variant="body2">
                Door to {departure.label}
              </Typography>
            ))}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Spawn {pick.spawn.label}
          </Typography>
          <MapLines mapId={pick.mapId} mapName={mapName} x={pick.spawn.x} y={pick.spawn.y} />
        </>
      );
    case "rage": {
      const box = pick.monster.rage;
      return (
        <>
          <Typography variant="body2">Type: {pick.monster.type}</Typography>
          <MapLines
            mapId={pick.mapId}
            mapName={mapName}
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
          <Typography variant="body2">Machine: {pick.machine.type}</Typography>
          <MapLines mapId={pick.mapId} mapName={mapName} x={pick.machine.x} y={pick.machine.y} />
        </>
      );
    case "animatable":
      return (
        <>
          <Typography variant="body2">Id: {pick.animatable.id}</Typography>
          <Typography variant="body2">Position key: {pick.animatable.position}</Typography>
          <MapLines
            mapId={pick.mapId}
            mapName={mapName}
            x={pick.animatable.x}
            y={pick.animatable.y}
          />
        </>
      );
    case "trap":
      return (
        <>
          <Typography variant="body2">Trap: {pick.trap.type}</Typography>
          <MapLines mapId={pick.mapId} mapName={mapName} x={pick.trap.x} y={pick.trap.y} />
        </>
      );
    default: {
      const exhaustive: never = pick;
      return exhaustive;
    }
  }
}

function MonsterStats({ monster }: { monster: GMonster }) {
  return (
    <>
      {monster.hp != null && (
        <Typography variant="body2">HP: {monster.hp.toLocaleString()}</Typography>
      )}
      {monster.xp != null && (
        <Typography variant="body2">XP: {monster.xp.toLocaleString()}</Typography>
      )}
      {monster.speed != null && <Typography variant="body2">Speed: {monster.speed}</Typography>}
      {monster.attack != null && <Typography variant="body2">Attack: {monster.attack}</Typography>}
      {monster.range != null && <Typography variant="body2">Range: {monster.range}</Typography>}
    </>
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
  const dropEntry = drops[monsterType];
  if (!dropEntry || dropEntry.length <= 1) {
    return null;
  }
  const parsed: Array<{ key: string; probability?: number }> = [];
  for (let i = 1; i < dropEntry.length; i += 1) {
    const entry = dropEntry[i];
    if (typeof entry === "string") {
      parsed.push({ key: entry });
    } else if (Array.isArray(entry) && entry.length >= 2) {
      parsed.push({ probability: entry[0] as number, key: entry[1] as string });
    }
  }
  if (parsed.length === 0) {
    return null;
  }
  return (
    <>
      <Divider sx={{ my: 1 }} />
      <Typography variant="subtitle2">Drops</Typography>
      <List dense disablePadding>
        {parsed.map((drop) => {
          const itemDef = items[drop.key as keyof GItems];
          const displayName = itemDef?.name ?? drop.key;
          const prob = drop.probability != null ? ` (${(drop.probability * 100).toFixed(2)}%)` : "";
          return (
            <ListItem key={drop.key} disableGutters disablePadding>
              <ListItemText primary={`${displayName}${prob}`} />
            </ListItem>
          );
        })}
      </List>
    </>
  );
}

function NpcDetails({
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
  return (
    <>
      {npcDef.role && <Typography variant="body2">Role: {npcDef.role}</Typography>}
      {npcDef.quest && <Typography variant="body2">Quest: {npcDef.quest}</Typography>}
      {npcDef.items && npcDef.items.length > 0 && (
        <>
          <Divider sx={{ my: 1 }} />
          <Typography variant="subtitle2">Shop Items</Typography>
          <List dense disablePadding>
            {npcDef.items
              .filter((itemKey): itemKey is string => itemKey != null)
              .map((itemKey) => {
                const itemDef = items[itemKey as keyof GItems];
                return (
                  <ListItem key={itemKey} disableGutters disablePadding>
                    <ListItemText primary={itemDef?.name ?? itemKey} />
                  </ListItem>
                );
              })}
          </List>
        </>
      )}
    </>
  );
}

interface WorldOverlayInspectProps {
  inspect: OverlayPick | null;
  maps: Record<string, ParsedMap>;
  monsters: Record<string, GMonster>;
  drops: Record<string, unknown[]>;
  items: GItems;
  npcs: Record<string, GNpc>;
  onClose: () => void;
}

export function WorldOverlayInspect({
  inspect,
  maps,
  monsters,
  drops,
  items,
  npcs,
  onClose,
}: WorldOverlayInspectProps) {
  const mapName = inspect ? maps[inspect.mapId]?.name : undefined;
  const title = inspectTitle(inspect, monsters);
  return (
    <Dialog
      open={Boolean(inspect) && inspect?.kind !== "door"}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {inspect && inspectBody(inspect, mapName)}
        {inspect?.kind === "monster" && (
          <>
            <Divider sx={{ my: 1 }} />
            <MonsterStats monster={monsters[inspect.monster.type] ?? ({} as GMonster)} />
            <MonsterDrops monsterType={inspect.monster.type} drops={drops} items={items} />
          </>
        )}
        {inspect?.kind === "npc" && <NpcDetails npcId={inspect.npc.id} npcs={npcs} items={items} />}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
