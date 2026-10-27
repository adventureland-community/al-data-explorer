import {
  Box,
  Button,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  Typography,
} from "@mui/material";

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
};

export function PlanLibraryPanel({
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
}: PlanLibraryPanelProps) {
  const list = mapKey ? plansForMap : allPlans;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1, minHeight: 0 }}>
      <Typography variant="overline" sx={{ lineHeight: 1, opacity: 0.7, letterSpacing: "0.08em" }}>
        Strategy plans
      </Typography>
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
      <List dense sx={{ overflow: "auto", maxHeight: 200, padding: 0 }}>
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
              sx={{ borderRadius: 1, mb: 0.25 }}
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
