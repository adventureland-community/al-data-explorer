import { Box, Chip, Typography } from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear";
import { ParsedMap } from "./types";

interface TravelEntry {
  mapId: string;
  key: number;
}

interface TravelBreadcrumbProps {
  history: TravelEntry[];
  maps: Record<string, ParsedMap>;
  onFocusMap: (mapId: string) => void;
  onClear: () => void;
}

export function TravelBreadcrumb({ history, maps, onFocusMap, onClear }: TravelBreadcrumbProps) {
  if (history.length === 0) {
    return null;
  }
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        overflowX: "auto",
        flexShrink: 0,
        paddingX: 1,
        paddingY: 0.5,
      }}
    >
      <Typography variant="caption" sx={{ opacity: 0.6, whiteSpace: "nowrap", mr: 0.5 }}>
        Travel:
      </Typography>
      {history.map((entry) => (
        <Chip
          key={entry.key}
          size="small"
          label={maps[entry.mapId]?.name ?? entry.mapId}
          onClick={() => onFocusMap(entry.mapId)}
          variant="outlined"
        />
      ))}
      <Chip
        size="small"
        icon={<ClearIcon />}
        label="Clear"
        onClick={onClear}
        variant="outlined"
        color="default"
      />
    </Box>
  );
}
