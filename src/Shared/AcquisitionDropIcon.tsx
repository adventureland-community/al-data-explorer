import { Box } from "@mui/material";
import { ReactNode } from "react";
import { ItemKey } from "typed-adventureland";

import { AcquisitionDropView } from "../gameData/itemAcquisition";
import { ItemInstance } from "./ItemInstance";
import { MonsterImage } from "./SpriteSkin";

const DEFAULT_MONSTER_SCALE = 1.85;
const DEFAULT_ITEM_SIZE = 40;

function KeyFallback({ label }: { label: string }) {
  return (
    <Box
      title={label}
      sx={{
        width: 36,
        height: 36,
        borderRadius: 1,
        bgcolor: "action.selected",
        fontSize: 11,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 0.5,
        textAlign: "center",
        wordBreak: "break-all",
        lineHeight: 1.1,
        color: "text.secondary",
      }}
    >
      {label.slice(0, 6)}
    </Box>
  );
}

/** Shared acquisition drop icon (monster / table item / fallback). */
export function AcquisitionDropIcon({
  drop,
  monsterScale = DEFAULT_MONSTER_SCALE,
  itemSize = DEFAULT_ITEM_SIZE,
  mapText,
}: {
  drop: AcquisitionDropView;
  monsterScale?: number;
  itemSize?: number;
  /** Optional node for map-text icons (browse tiles show label; detail lists omit). */
  mapText?: ReactNode;
}) {
  switch (drop.icon.kind) {
    case "monster":
      return <MonsterImage monsterName={drop.icon.key} scale={monsterScale} />;
    case "table-item":
      return <ItemInstance itemInfo={{ name: drop.icon.key as ItemKey }} size={itemSize} />;
    case "map-text":
      return <>{mapText ?? null}</>;
    case "key-fallback":
      return <KeyFallback label={drop.icon.key} />;
    case "none":
      return null;
    default: {
      const _exhaustive: never = drop.icon.kind;
      return _exhaustive;
    }
  }
}
