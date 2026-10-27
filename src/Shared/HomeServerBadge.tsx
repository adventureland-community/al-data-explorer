import { Chip, Tooltip } from "@mui/material";

export const HOME_SERVER_BADGE_LABEL = "Homeserver";

export const HOME_SERVER_BADGE_TITLE =
  "Only drops while you are on your home server (set with set_home).";

/** Small callout for loot that only rolls on the player's home server. */
export function HomeServerBadge({ size = "small" }: { size?: "small" | "medium" }) {
  return (
    <Tooltip title={HOME_SERVER_BADGE_TITLE}>
      <Chip
        size={size}
        label={HOME_SERVER_BADGE_LABEL}
        color="info"
        variant="outlined"
        sx={{
          height: size === "small" ? 20 : undefined,
          "& .MuiChip-label": { px: 0.75, fontSize: size === "small" ? "0.68rem" : undefined },
        }}
      />
    </Tooltip>
  );
}
