import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import {
  Box,
  Button,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Popover,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useState } from "react";

import { PlanDocument } from "./types";

type PlanLibraryPanelProps = {
  mapKey: string | null;
  mapName?: string;
  plansForMap: PlanDocument[];
  allPlans: PlanDocument[];
  activePlanId: string | null;
  planMode: boolean;
  onCreate: (name: string) => void;
  onLoad: (id: string) => void;
  onDelete: () => void;
  onPlanThisMap: () => void;
  /** Icon + popover instead of a permanent sidebar block. */
  asMenu?: boolean;
};

type PlanLibraryBodyProps = Omit<PlanLibraryPanelProps, "asMenu"> & {
  showHeading?: boolean;
  dense?: boolean;
};

function PlanLibraryBody({
  mapKey,
  mapName,
  plansForMap,
  allPlans,
  activePlanId,
  planMode,
  onCreate,
  onLoad,
  onDelete,
  onPlanThisMap,
  showHeading,
  dense,
}: PlanLibraryBodyProps) {
  const list = mapKey ? plansForMap : allPlans;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: dense ? 0.75 : 1, minHeight: 0 }}>
      {showHeading !== false && (
        <Typography
          variant="overline"
          sx={{ lineHeight: 1, opacity: 0.7, letterSpacing: "0.08em" }}
        >
          Strategy plans
        </Typography>
      )}
      {!planMode && mapKey && (
        <Button size="small" variant="contained" onClick={onPlanThisMap} fullWidth>
          Open board{mapName ? ` · ${mapName}` : ""}
        </Button>
      )}
      {!mapKey && (
        <Typography variant="caption" sx={{ opacity: 0.75, lineHeight: 1.4 }}>
          Select a map, or open a saved plan below.
        </Typography>
      )}
      <Box sx={{ display: "flex", gap: 0.75 }}>
        <TextField
          size="small"
          placeholder="Name a new plan"
          disabled={!mapKey}
          onKeyDown={(event) => {
            if (event.key === "Enter" && mapKey) {
              const { value } = event.target as HTMLInputElement;
              onCreate(value.trim() || `Plan · ${mapKey}`);
              (event.target as HTMLInputElement).value = "";
            }
          }}
          fullWidth
        />
        <Button
          size="small"
          variant="outlined"
          disabled={!mapKey}
          onClick={() => {
            if (!mapKey) {
              return;
            }
            onCreate(`Plan · ${mapName || mapKey}`);
          }}
        >
          New
        </Button>
      </Box>
      <Typography variant="caption" sx={{ opacity: 0.65 }}>
        {mapKey ? `${plansForMap.length} on this map` : `${allPlans.length} saved`}
      </Typography>
      <List dense sx={{ overflow: "auto", maxHeight: dense ? 240 : 200, padding: 0 }}>
        {list.length === 0 ? (
          <Typography variant="caption" sx={{ opacity: 0.55, paddingX: 0.5 }}>
            No plans yet — sketch a farm, then it autosaves here.
          </Typography>
        ) : (
          list.map((plan) => (
            <ListItemButton
              key={plan.id}
              selected={plan.id === activePlanId}
              onClick={() => onLoad(plan.id)}
              sx={{ borderRadius: 1, mb: 0.25, py: dense ? 0.25 : undefined }}
            >
              <ListItemText
                primary={plan.name}
                secondary={`${plan.mapKey} · ${plan.objects.length} pieces`}
                primaryTypographyProps={{ variant: "body2" }}
                secondaryTypographyProps={{ variant: "caption" }}
              />
            </ListItemButton>
          ))
        )}
      </List>
      {activePlanId && planMode && (
        <Button size="small" color="error" onClick={onDelete}>
          Delete board
        </Button>
      )}
    </Box>
  );
}

export function PlanLibraryPanel(props: PlanLibraryPanelProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  if (!props.asMenu) {
    return <PlanLibraryBody {...props} />;
  }

  return (
    <>
      <Tooltip title="Strategy plans">
        <IconButton
          size="small"
          aria-label="Strategy plans"
          onClick={(event) => setAnchor(event.currentTarget)}
          color={anchor ? "primary" : "default"}
        >
          <MenuBookOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        PaperProps={{ sx: { p: 1.5, width: 280 } }}
      >
        <PlanLibraryBody {...props} showHeading dense />
      </Popover>
    </>
  );
}
