import { Box, Chip, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

import { CLASS_COLOR } from "../constants";
import { CharacterLook } from "../Shared/CharacterLook";
import { getCachedCharacterLoadout } from "./fetchCharacterLoadout";
import { ListedCharacter } from "./parseCharacters";

const cardSx = {
  display: "flex",
  gap: 1.25,
  alignItems: "center",
  px: 1.25,
  py: 1.1,
  textDecoration: "none",
  color: "inherit",
  borderBottom: 1,
  borderColor: "divider",
  minHeight: 56,
  "&:active": { backgroundColor: "action.selected" },
  "@media (hover: hover)": {
    "&:hover": { backgroundColor: "action.hover" },
  },
} as const;

/** Mobile list row — look + name + class/level (Items/NPCs browse-card pattern). */
export function CharacterBrowseCard({
  character,
  rank,
  showClass = true,
}: {
  character: ListedCharacter;
  rank?: number;
  showClass?: boolean;
}) {
  const look = getCachedCharacterLoadout(character.name)?.look;
  const classColor = character.classKey ? CLASS_COLOR[character.classKey] : undefined;

  return (
    <Box
      component={RouterLink}
      to={`/characters/${encodeURIComponent(character.name)}`}
      sx={cardSx}
    >
      <Box
        sx={{
          width: 44,
          flexShrink: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {look ? <CharacterLook look={look} alt={character.name} size="default" /> : null}
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0 }}>
          {rank != null ? (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontVariantNumeric: "tabular-nums", flexShrink: 0 }}
            >
              #{rank}
            </Typography>
          ) : null}
          <Typography
            variant="body2"
            noWrap
            sx={{
              fontWeight: 600,
              minWidth: 0,
              color: character.online ? "success.main" : "inherit",
            }}
          >
            {character.name}
          </Typography>
          {character.online ? (
            <Chip size="small" label="Online" color="success" sx={{ height: 20, fontSize: 10 }} />
          ) : null}
        </Box>
        <Typography variant="caption" color="text.secondary" noWrap display="block">
          {showClass ? (
            <Box component="span" sx={classColor ? { color: classColor } : undefined}>
              {character.className}
            </Box>
          ) : (
            `Level ${character.level}`
          )}
        </Typography>
      </Box>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ fontVariantNumeric: "tabular-nums", flexShrink: 0, fontWeight: 600 }}
      >
        {character.level}
      </Typography>
    </Box>
  );
}
