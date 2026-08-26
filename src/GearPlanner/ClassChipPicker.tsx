import { Button, Chip, Stack, Typography } from "@mui/material";

import { CLASS_COLOR } from "../constants";
import { SelectedCharacterClass } from "./types";

export function ClassChipPicker({
  classes,
  selectedClass,
  onSelect,
  onClear,
  orientation = "horizontal",
}: {
  classes: SelectedCharacterClass[];
  selectedClass?: SelectedCharacterClass;
  onSelect: (characterClass: SelectedCharacterClass) => void;
  onClear: () => void;
  orientation?: "horizontal" | "vertical";
}) {
  const vertical = orientation === "vertical";

  return (
    <Stack
      direction={vertical ? "column" : "row"}
      flexWrap={vertical ? "nowrap" : "wrap"}
      gap={0.75}
      alignItems={vertical ? "stretch" : "center"}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontWeight: 600, ...(vertical ? { mb: 0.25 } : { mr: 0.5 }) }}
      >
        Class
      </Typography>
      {classes.map((c) => {
        const classColor = CLASS_COLOR[c.className];
        const selected = selectedClass?.className === c.className;
        return (
          <Chip
            key={c.className}
            size="small"
            label={c.className}
            variant={selected ? "filled" : "outlined"}
            sx={
              selected
                ? {
                    backgroundColor: classColor,
                    ...(vertical ? { justifyContent: "flex-start" } : {}),
                  }
                : {
                    borderColor: classColor,
                    color: classColor,
                    ...(vertical ? { justifyContent: "flex-start" } : {}),
                  }
            }
            onClick={() => onSelect(c)}
          />
        );
      })}
      {selectedClass ? (
        <Button
          size="small"
          onClick={onClear}
          sx={{
            textTransform: "none",
            minWidth: 0,
            ...(vertical ? { alignSelf: "flex-start", px: 0.5 } : {}),
          }}
        >
          Clear class
        </Button>
      ) : null}
    </Stack>
  );
}
