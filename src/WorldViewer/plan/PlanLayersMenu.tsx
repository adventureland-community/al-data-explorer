import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";
import {
  Box,
  Checkbox,
  Chip,
  FormControlLabel,
  IconButton,
  Popover,
  Tooltip,
  Typography,
} from "@mui/material";
import { useState } from "react";

import { overlayHex } from "../overlayColors";
import { OverlayKind, OverlayVisibility } from "../types";
import { overlayLabel } from "../WorldViewerHud";

type PlanLayersMenuProps = {
  overlays: OverlayVisibility;
  overlayKinds: OverlayKind[];
  onToggleOverlay: (kind: OverlayKind, visible: boolean) => void;
  pixelArt: boolean;
  onPixelArt: (value: boolean) => void;
  seeThroughOverlays: boolean;
  onSeeThrough: (value: boolean) => void;
};

/** Map data stays out of the board chrome until you ask for it. */
export function PlanLayersMenu({
  overlays,
  overlayKinds,
  onToggleOverlay,
  pixelArt,
  onPixelArt,
  seeThroughOverlays,
  onSeeThrough,
}: PlanLayersMenuProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const activeCount = overlayKinds.filter((kind) => overlays[kind]).length;

  return (
    <>
      <Tooltip title="Map layers">
        <IconButton
          size="small"
          aria-label="Map layers"
          onClick={(event) => setAnchor(event.currentTarget)}
          color={anchor ? "primary" : "default"}
        >
          <LayersOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        PaperProps={{ sx: { p: 1.5, width: 260 } }}
      >
        <Typography
          variant="caption"
          sx={{ display: "block", opacity: 0.55, fontWeight: 600, letterSpacing: "0.04em", mb: 1 }}
        >
          Map layers · {activeCount} on
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 1.25 }}>
          {overlayKinds.map((kind) => {
            const on = overlays[kind];
            const color = overlayHex(kind);
            return (
              <Chip
                key={kind}
                size="small"
                label={overlayLabel(kind)}
                onClick={() => onToggleOverlay(kind, !on)}
                variant={on ? "filled" : "outlined"}
                sx={{
                  borderColor: color,
                  color: on ? "#111" : color,
                  backgroundColor: on ? color : "transparent",
                }}
              />
            );
          })}
        </Box>
        <FormControlLabel
          sx={{ marginLeft: 0, display: "block" }}
          control={
            <Checkbox
              size="small"
              checked={pixelArt}
              onChange={(event) => onPixelArt(event.target.checked)}
            />
          }
          label={<Typography variant="body2">Pixel art</Typography>}
        />
        <FormControlLabel
          sx={{ marginLeft: 0, display: "block" }}
          control={
            <Checkbox
              size="small"
              checked={seeThroughOverlays}
              onChange={(event) => onSeeThrough(event.target.checked)}
            />
          }
          label={<Typography variant="body2">See-through overlays</Typography>}
        />
      </Popover>
    </>
  );
}
