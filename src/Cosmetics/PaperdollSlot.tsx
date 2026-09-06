import CloseIcon from "@mui/icons-material/Close";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";

import { COSMETIC_SLOT_LABEL, CosmeticSlot, equippedId } from "../gameData/cosmeticsCatalog";
import { ClassLook } from "../gameData/characterLook";
import { SpriteSkin } from "../Shared/SpriteSkin";

/** Single paperdoll slot — select to browse; × clears when filled. */
export function PaperdollSlot({
  slot,
  look,
  active,
  onSelect,
  onClear,
  dense = false,
}: {
  slot: CosmeticSlot;
  look: ClassLook;
  active: boolean;
  onSelect: (slot: CosmeticSlot) => void;
  onClear: (slot: CosmeticSlot) => void;
  /** Horizontal strip / mobile — smaller well. */
  dense?: boolean;
}) {
  const id = equippedId(look, slot);
  const label = COSMETIC_SLOT_LABEL[slot];
  const canClear = slot !== "skin" && Boolean(id);
  const well = dense ? 52 : 64;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0.4,
        width: dense ? well + 6 : 72,
        flex: dense ? "0 0 auto" : undefined,
      }}
    >
      <Tooltip
        title={
          id ? `${label}: ${id}${canClear ? " · click × to unequip" : ""}` : `${label} · empty`
        }
        placement={dense ? "top" : "right"}
        enterDelay={350}
      >
        <Box
          component="button"
          type="button"
          aria-label={id ? `${label} ${id}` : `${label} empty`}
          aria-pressed={active}
          onClick={() => onSelect(slot)}
          onContextMenu={(e) => {
            if (!canClear) return;
            e.preventDefault();
            onClear(slot);
          }}
          sx={{
            width: well,
            height: well,
            p: 0,
            m: 0,
            cursor: "pointer",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            borderRadius: "6px",
            border: "2px solid",
            borderColor: active ? "warning.main" : id ? "grey.500" : "divider",
            background: (theme) =>
              active
                ? `linear-gradient(160deg, ${theme.palette.action.selected} 0%, ${theme.palette.background.paper} 70%)`
                : theme.palette.mode === "dark"
                ? "linear-gradient(160deg, #2a2e38 0%, #1a1d24 100%)"
                : "linear-gradient(160deg, #f3f1ea 0%, #e4e0d6 100%)",
            boxShadow: active
              ? (theme) =>
                  `0 0 0 1px ${theme.palette.warning.main}, 0 0 14px ${theme.palette.warning.main}44`
              : "inset 0 1px 0 rgba(255,255,255,0.06)",
            color: "text.primary",
            font: "inherit",
            transition: "border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease",
            "&:hover": {
              borderColor: active ? "warning.light" : "text.secondary",
              transform: "translateY(-1px)",
            },
            "&:focus-visible": {
              outline: (theme) => `2px solid ${theme.palette.warning.main}`,
              outlineOffset: 2,
            },
          }}
        >
          {id ? (
            <Box sx={{ pointerEvents: "none", lineHeight: 0 }}>
              <SpriteSkin skin={id} alt="" scale={dense ? 1.45 : 1.75} />
            </Box>
          ) : (
            <Typography
              aria-hidden
              sx={{
                fontWeight: 800,
                fontSize: dense ? 13 : 15,
                letterSpacing: 0.5,
                color: "text.disabled",
                opacity: 0.55,
                userSelect: "none",
              }}
            >
              {label.charAt(0)}
            </Typography>
          )}
          {canClear ? (
            <IconButton
              size="small"
              aria-label={`Unequip ${label}`}
              onClick={(e) => {
                e.stopPropagation();
                onClear(slot);
              }}
              sx={{
                position: "absolute",
                top: -3,
                right: -3,
                width: dense ? 18 : 20,
                height: dense ? 18 : 20,
                p: 0,
                bgcolor: "background.paper",
                border: "1px solid",
                borderColor: "divider",
                opacity: active ? 1 : 0.72,
                "&:hover": { bgcolor: "error.dark", color: "error.contrastText", opacity: 1 },
              }}
            >
              <CloseIcon sx={{ fontSize: dense ? 12 : 14 }} />
            </IconButton>
          ) : null}
        </Box>
      </Tooltip>
      <Typography
        variant="caption"
        sx={{
          fontSize: dense ? 10 : 11,
          lineHeight: 1.1,
          fontWeight: 700,
          letterSpacing: 0.4,
          textTransform: "uppercase",
          color: active ? "warning.light" : "text.secondary",
          userSelect: "none",
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}
