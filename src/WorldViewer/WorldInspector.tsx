import { useState } from "react";
import {
  Box,
  Button,
  Chip,
  Collapse,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Typography,
} from "@mui/material";
import { WorldLayoutReport } from "./layoutAnalysis";
import { groupNeighborsByBand, LinkedNeighbor, summarizeNeighbors } from "./linkedMaps";
import { DoorConnection, MapBand, MapPose, ParsedMap } from "./types";

const panelSx = {
  backgroundColor: "background.paper",
  border: "1px solid",
  borderColor: "divider",
} as const;

function bandDot(band: MapBand): string {
  switch (band) {
    case "overworld":
      return "#6fcf97";
    case "indoor":
      return "#c4b5fd";
    case "underground":
      return "#7dd3fc";
    default: {
      const exhaustive: never = band;
      return exhaustive;
    }
  }
}

function bandTitle(band: MapBand, items: LinkedNeighbor[]): string {
  const layer = items[0]?.layerLabel;
  const extra = layer && layer !== "same layer" ? ` · ${layer}` : "";
  switch (band) {
    case "overworld":
      return `Overworld${extra}`;
    case "indoor":
      return `Indoor${extra}`;
    case "underground":
      return `Underground${extra}`;
    default: {
      const exhaustive: never = band;
      return exhaustive;
    }
  }
}

function NeighborRows({
  neighbors,
  onFocusMap,
}: {
  neighbors: LinkedNeighbor[];
  onFocusMap: (mapId: string) => void;
}) {
  return (
    <>
      {groupNeighborsByBand(neighbors).map(({ band, items }) => (
        <Box key={band} sx={{ marginTop: 1.5 }}>
          <Typography
            variant="caption"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              opacity: 0.7,
              letterSpacing: 0.4,
              textTransform: "uppercase",
              fontSize: 11,
              paddingX: 1,
            }}
          >
            <Box
              component="span"
              sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: bandDot(band) }}
            />
            {bandTitle(band, items)}
          </Typography>
          <List dense disablePadding>
            {items.map((neighbor) => (
              <ListItemButton
                key={neighbor.id}
                onClick={() => onFocusMap(neighbor.id)}
                sx={{ borderRadius: 1, paddingY: 0.75, paddingX: 1, gap: 1 }}
              >
                <ListItemText
                  primary={neighbor.name}
                  primaryTypographyProps={{ variant: "body2", noWrap: true }}
                />
                {neighbor.doors > 1 && (
                  <Typography variant="caption" sx={{ opacity: 0.55, flexShrink: 0 }}>
                    {neighbor.doors}
                  </Typography>
                )}
                {neighbor.oneWay && !neighbor.twoWay && (
                  <Chip size="small" label="one-way" sx={{ height: 20, fontSize: 11 }} />
                )}
              </ListItemButton>
            ))}
          </List>
        </Box>
      ))}
    </>
  );
}

interface WorldInspectorProps {
  selected: ParsedMap | undefined;
  selectedPose: MapPose | undefined;
  connections: DoorConnection[];
  maps: Record<string, ParsedMap>;
  poses: Record<string, MapPose>;
  onFocusMap: (mapId: string) => void;
  layoutReport: WorldLayoutReport | null;
}

export function WorldInspector({
  selected,
  selectedPose,
  connections,
  maps,
  poses,
  onFocusMap,
  layoutReport,
}: WorldInspectorProps) {
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const neighbors = selected
    ? summarizeNeighbors(selected.id, selectedPose?.z, connections, maps, poses)
    : [];
  const exits = neighbors.filter((neighbor) => neighbor.outbound);
  const arrivals = neighbors.filter((neighbor) => neighbor.inbound && !neighbor.outbound);

  return (
    <Paper
      elevation={0}
      sx={{
        ...panelSx,
        width: 300,
        flexShrink: 0,
        padding: 1.5,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      {selected ? (
        <>
          <Typography variant="h6" sx={{ lineHeight: 1.25 }}>
            {selected.name}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            {selected.id}
            {selectedPose ? ` · layer ${Math.round(selectedPose.z)}` : ""}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.85, marginTop: 1.25 }}>
            {selected.doors.length} doors · {selected.npcs.length} NPCs · {selected.monsters.length}{" "}
            packs
          </Typography>
          <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", marginTop: 0.5 }}>
            {exits.length > 0 && <NeighborRows neighbors={exits} onFocusMap={onFocusMap} />}
            {arrivals.length > 0 && (
              <Box sx={{ marginTop: 2 }}>
                <Typography
                  variant="caption"
                  sx={{
                    display: "block",
                    opacity: 0.7,
                    letterSpacing: 0.4,
                    textTransform: "uppercase",
                    fontSize: 11,
                    paddingX: 1,
                  }}
                >
                  Arrives here
                </Typography>
                <NeighborRows neighbors={arrivals} onFocusMap={onFocusMap} />
              </Box>
            )}
          </Box>
        </>
      ) : (
        <Typography variant="body2" sx={{ opacity: 0.7 }}>
          Click a map to inspect it, or pick one from Go to map.
        </Typography>
      )}
      <Divider sx={{ marginTop: 1.5 }} />
      <Button size="small" onClick={() => setAnalysisOpen((open) => !open)} sx={{ marginTop: 0.5 }}>
        {analysisOpen ? "Hide" : "Show"} layout analysis
      </Button>
      <Collapse in={analysisOpen}>
        {layoutReport && (
          <Box sx={{ marginTop: 1 }}>
            <Typography variant="body2">
              {layoutReport.components.length} components · {layoutReport.connectionCount} door
              edges
            </Typography>
            <Typography variant="body2">
              Same-layer overlaps: {layoutReport.artOverlapsSameZ}
            </Typography>
            <Typography variant="body2">
              Near origin: {layoutReport.nearOriginMaps.length} maps
            </Typography>
            {layoutReport.components.map((component) => (
              <Typography
                key={component.id}
                variant="caption"
                display="block"
                sx={{ opacity: 0.85 }}
              >
                {component.rootId}: {component.mapIds.length} maps, depth {component.maxDepth}
              </Typography>
            ))}
          </Box>
        )}
      </Collapse>
    </Paper>
  );
}
