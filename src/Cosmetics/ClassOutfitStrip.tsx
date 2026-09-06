import { Box, Typography } from "@mui/material";

import { ClassLook, looksEqual } from "../gameData/characterLook";
import { titleCaseKey } from "../gameData/classSkills";
import { CharacterLook } from "../Shared/CharacterLook";

export type ClassOutfitPreset = {
  classKey: string;
  lookIndex: number;
  look: ClassLook;
};

/** Horizontal class starting-look chips for the dressing room. */
export function ClassOutfitStrip({
  presets,
  currentLook,
  facing,
  onSelect,
}: {
  presets: ClassOutfitPreset[];
  currentLook: ClassLook;
  facing: number;
  onSelect: (look: ClassLook) => void;
}) {
  return (
    <Box sx={{ flex: "0 0 auto" }}>
      <Typography
        variant="caption"
        sx={{ fontWeight: 800, letterSpacing: 1, color: "text.secondary" }}
      >
        CLASS OUTFITS
      </Typography>
      <Box
        sx={{
          mt: 0.75,
          display: "flex",
          gap: 0.85,
          overflowX: "auto",
          pb: 0.65,
          scrollSnapType: "x proximity",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {presets.map((preset) => {
          const active = looksEqual(preset.look, currentLook);
          return (
            <Box
              key={`${preset.classKey}-${preset.lookIndex}`}
              component="button"
              type="button"
              onClick={() => onSelect({ skin: preset.look.skin, cx: { ...preset.look.cx } })}
              sx={{
                scrollSnapAlign: "start",
                flex: "0 0 auto",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 0.45,
                p: 0.75,
                m: 0,
                cursor: "pointer",
                borderRadius: "8px",
                border: "1px solid",
                borderColor: active ? "warning.main" : "divider",
                background: active ? "action.selected" : "transparent",
                color: "inherit",
                font: "inherit",
                transition: "border-color 140ms ease, transform 140ms ease",
                "&:hover": { borderColor: "text.secondary", transform: "translateY(-1px)" },
              }}
            >
              <CharacterLook
                look={preset.look}
                alt={`${preset.classKey} ${preset.lookIndex + 1}`}
                size="class"
                direction={facing}
                animate={false}
              />
              <Typography
                variant="caption"
                sx={{ fontSize: 11.5, lineHeight: 1.15, fontWeight: 700 }}
              >
                {titleCaseKey(preset.classKey)} {preset.lookIndex + 1}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
