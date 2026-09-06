import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SaveIcon from "@mui/icons-material/Save";
import { Box, Button, IconButton, Stack, TextField, Tooltip, Typography } from "@mui/material";

import { ClassLook } from "../gameData/characterLook";
import { SavedOutfit } from "../gameData/cosmeticOutfits";
import { CharacterLook } from "../Shared/CharacterLook";

/** Local Narcissus-style saved looks: name, save, load, delete. */
export function SavedOutfitsStrip({
  saved,
  outfitName,
  facing,
  onOutfitNameChange,
  onSave,
  onLoad,
  onDelete,
}: {
  saved: SavedOutfit[];
  outfitName: string;
  facing: number;
  onOutfitNameChange: (name: string) => void;
  onSave: () => void;
  onLoad: (look: ClassLook) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Box sx={{ flex: "0 0 auto" }}>
      <Typography
        variant="caption"
        sx={{ fontWeight: 800, letterSpacing: 1, color: "text.secondary" }}
      >
        SAVED OUTFITS
      </Typography>
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.65 }}>
        <TextField
          size="small"
          placeholder="Name this look"
          value={outfitName}
          onChange={(e) => onOutfitNameChange(e.target.value)}
          sx={{ flex: 1, minWidth: 120 }}
        />
        <Button
          size="small"
          variant="outlined"
          startIcon={<SaveIcon fontSize="small" />}
          onClick={onSave}
          sx={{ textTransform: "none", flexShrink: 0 }}
        >
          Save
        </Button>
      </Stack>
      {saved.length > 0 ? (
        <Box
          sx={{
            mt: 0.75,
            display: "flex",
            gap: 0.65,
            overflowX: "auto",
            pb: 0.5,
            WebkitOverflowScrolling: "touch",
          }}
        >
          {saved.map((outfit) => (
            <Box
              key={outfit.id}
              sx={{
                flex: "0 0 auto",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 0.25,
                position: "relative",
              }}
            >
              <Box
                component="button"
                type="button"
                onClick={() => onLoad(outfit.look)}
                sx={{
                  p: 0.5,
                  m: 0,
                  cursor: "pointer",
                  borderRadius: "6px",
                  border: "1px solid",
                  borderColor: "divider",
                  background: "transparent",
                  color: "inherit",
                  font: "inherit",
                  "&:hover": { borderColor: "text.secondary" },
                }}
              >
                <CharacterLook
                  look={outfit.look}
                  alt={outfit.name}
                  size="class"
                  direction={facing}
                  animate={false}
                />
                <Typography
                  variant="caption"
                  sx={{ fontSize: 11.5, fontWeight: 600, display: "block", mt: 0.35 }}
                >
                  {outfit.name}
                </Typography>
              </Box>
              <Tooltip title="Delete">
                <IconButton
                  size="small"
                  aria-label={`Delete ${outfit.name}`}
                  onClick={() => onDelete(outfit.id)}
                  sx={{ position: "absolute", top: -4, right: -4, width: 20, height: 20 }}
                >
                  <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            </Box>
          ))}
        </Box>
      ) : (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
          Save named looks locally (Narcissus-style custom sets).
        </Typography>
      )}
    </Box>
  );
}
