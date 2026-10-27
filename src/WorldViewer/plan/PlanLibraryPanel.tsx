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
  onCreate,
  onLoad,
  onDelete,
  onPlanThisMap,
}: PlanLibraryPanelProps) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1, minHeight: 0 }}>
      <Typography variant="subtitle2">Plans</Typography>
      {mapKey ? (
        <Button size="small" variant="contained" onClick={onPlanThisMap}>
          Plan this map{mapName ? ` (${mapName})` : ""}
        </Button>
      ) : (
        <Typography variant="caption" sx={{ opacity: 0.75 }}>
          Pick a single map (or open a plan below) to enter Plan mode.
        </Typography>
      )}
      <Box sx={{ display: "flex", gap: 1 }}>
        <TextField
          size="small"
          placeholder="New plan name"
          disabled={!mapKey}
          onKeyDown={(event) => {
            if (event.key === "Enter" && mapKey) {
              const { value } = event.target as HTMLInputElement;
              onCreate(value);
              (event.target as HTMLInputElement).value = "";
            }
          }}
          fullWidth
        />
        <Button
          size="small"
          disabled={!mapKey}
          onClick={() => {
            if (!mapKey) {
              return;
            }
            onCreate(`Plan · ${mapKey}`);
          }}
        >
          New
        </Button>
      </Box>
      <Typography variant="caption" sx={{ opacity: 0.75 }}>
        {mapKey ? `Saved on this map (${plansForMap.length})` : "All saved plans"}
      </Typography>
      <List dense sx={{ overflow: "auto", maxHeight: 220, padding: 0 }}>
        {(mapKey ? plansForMap : allPlans).map((plan) => (
          <ListItemButton
            key={plan.id}
            selected={plan.id === activePlanId}
            onClick={() => onLoad(plan.id)}
          >
            <ListItemText
              primary={plan.name}
              secondary={`${plan.mapKey} · ${plan.objects.length} objects`}
            />
          </ListItemButton>
        ))}
      </List>
      {activePlanId && (
        <Button size="small" color="error" onClick={onDelete}>
          Delete current plan
        </Button>
      )}
    </Box>
  );
}
