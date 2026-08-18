import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Typography,
} from "@mui/material";
import { GMonster } from "typed-adventureland";
import { OverlayInspect, ParsedMap } from "./types";
import { monsterDisplayName } from "./WorldViewerHud";

function inspectTitle(inspect: OverlayInspect | null, monsters: Record<string, GMonster>): string {
  if (!inspect) {
    return "Inspect";
  }
  switch (inspect.kind) {
    case "npc":
      return inspect.name || inspect.id;
    case "monster":
      return monsterDisplayName(inspect.type, monsters);
    case "quirk":
      return inspect.text || inspect.quirkKind;
    case "zone":
      return inspect.type;
    case "spawn":
      return `Spawn ${inspect.label}`;
    default: {
      const exhaustive: never = inspect;
      return exhaustive;
    }
  }
}

function inspectBody(inspect: OverlayInspect, mapName: string | undefined) {
  switch (inspect.kind) {
    case "npc":
      return (
        <>
          <Typography variant="body2">NPC id: {inspect.id}</Typography>
          <Typography variant="body2">Skin: {inspect.skin}</Typography>
          <Typography variant="body2">
            Map: {mapName} ({inspect.mapId})
          </Typography>
          <Typography variant="body2">
            Position: ({inspect.x}, {inspect.y})
          </Typography>
        </>
      );
    case "monster":
      return (
        <>
          <Typography variant="body2">Type: {inspect.type}</Typography>
          <Typography variant="body2">
            Map: {mapName} ({inspect.mapId})
          </Typography>
          <Typography variant="body2">
            Pack center: ({inspect.x}, {inspect.y})
          </Typography>
          <Link
            href={`https://adventure.land/docs/guide/monsters#${inspect.type}`}
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
          <Typography variant="body2">Kind: {inspect.quirkKind}</Typography>
          {inspect.text && <Typography variant="body2">{inspect.text}</Typography>}
          <Typography variant="body2">
            Map: {mapName} ({inspect.mapId})
          </Typography>
          <Typography variant="body2">
            Position: ({inspect.x}, {inspect.y}) · {inspect.width}×{inspect.height}
          </Typography>
        </>
      );
    case "zone":
      return (
        <>
          <Typography variant="body2">Zone type: {inspect.type}</Typography>
          <Typography variant="body2">
            Map: {mapName} ({inspect.mapId})
          </Typography>
        </>
      );
    case "spawn":
      return (
        <>
          <Typography variant="body2">Spawn index: {inspect.label}</Typography>
          <Typography variant="body2">
            Map: {mapName} ({inspect.mapId})
          </Typography>
          <Typography variant="body2">
            Position: ({inspect.x}, {inspect.y})
          </Typography>
        </>
      );
    default: {
      const exhaustive: never = inspect;
      return exhaustive;
    }
  }
}

interface WorldOverlayInspectProps {
  inspect: OverlayInspect | null;
  maps: Record<string, ParsedMap>;
  monsters: Record<string, GMonster>;
  onClose: () => void;
}

export function WorldOverlayInspect({
  inspect,
  maps,
  monsters,
  onClose,
}: WorldOverlayInspectProps) {
  const mapName = inspect ? maps[inspect.mapId]?.name : undefined;
  const title = inspectTitle(inspect, monsters);
  return (
    <Dialog open={Boolean(inspect)} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>{inspect && inspectBody(inspect, mapName)}</DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
