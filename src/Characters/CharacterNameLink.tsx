import { Link, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

import { ListedCharacter } from "./parseCharacters";

export function CharacterNameLink({
  character,
  rank,
  showMeta = true,
}: {
  character: ListedCharacter;
  rank?: number;
  /** When false, only the name link (for tables with separate columns). */
  showMeta?: boolean;
}) {
  return (
    <Typography component="span" variant="body2">
      {rank != null ? `${rank}. ` : null}
      <Link
        component={RouterLink}
        to={`/characters/${encodeURIComponent(character.name)}`}
        underline="hover"
        sx={{ color: character.online ? "success.main" : "inherit", fontWeight: 500 }}
      >
        {character.name}
      </Link>
      {showMeta ? ` - Level ${character.level}` : null}
      {showMeta && character.online ? " · online" : ""}
    </Typography>
  );
}
