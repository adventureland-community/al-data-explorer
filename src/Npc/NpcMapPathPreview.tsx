import FlagIcon from "@mui/icons-material/Flag";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PlaceIcon from "@mui/icons-material/Place";
import { Box, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { memo, useEffect, useMemo, useState, type ReactNode } from "react";
import type { GDimension, GImage, GMap, GSprite, GTileset } from "typed-adventureland";

import type { CustomGData } from "../GDataContext";
import { mapGeometryFor } from "../gameData/npcCatalog";
import {
  travelPathDirections,
  travelPathToMap,
  worldFocusHref,
  type TravelDirectionLeg,
} from "../gameData/mapTravel";
import { NpcMapPreview, type NpcMapMarker, type NpcMapSpriteContext } from "./NpcMapPreview";

export type NpcMapPathPreviewProps = {
  G: CustomGData;
  mapKey: string;
  npcName: string;
  npcSkin: string;
  npcX: number | null;
  npcY: number | null;
  fromMap?: string;
};

const HOP_THUMB = 72;
const SPINE = 22;

function mapDisplayName(G: CustomGData, mapKey: string): string {
  const maps = G.maps as unknown as Record<string, GMap | undefined>;
  return maps[mapKey]?.name ?? mapKey;
}

function legMarkers(leg: TravelDirectionLeg, npc: { name: string; skin: string }): NpcMapMarker[] {
  if (leg.role === "end" && leg.focusX != null && leg.focusY != null) {
    return [
      {
        x: leg.focusX,
        y: leg.focusY,
        label: npc.name,
        kind: "npc",
        skin: npc.skin,
      },
    ];
  }
  if (leg.action?.kind === "transporter" && leg.focusX != null && leg.focusY != null) {
    return [
      {
        x: leg.focusX,
        y: leg.focusY,
        label: leg.action.instruction.replace(/^Take\s+/u, ""),
        kind: "transporter",
        skin: leg.action.viaNpcSkin,
      },
    ];
  }
  if (leg.focusX != null && leg.focusY != null) {
    return [
      {
        x: leg.focusX,
        y: leg.focusY,
        label: leg.action?.kind === "door" ? leg.action.toMapName : undefined,
        kind: leg.action?.kind === "door" ? "door" : "pin",
      },
    ];
  }
  return [];
}

function HopThumb({
  leg,
  markers,
  G,
  tilesets,
  spriteContext,
  selected,
  legIndex,
  onSelectLeg,
}: {
  leg: TravelDirectionLeg;
  markers: NpcMapMarker[];
  G: CustomGData;
  tilesets: Record<string, GTileset>;
  spriteContext: NpcMapSpriteContext;
  selected: boolean;
  legIndex: number;
  onSelectLeg: (index: number) => void;
}) {
  const geometry = mapGeometryFor(G, leg.mapKey);
  if (!geometry || markers.length === 0) return null;
  const focusPadding =
    leg.role === "end"
      ? 80
      : leg.action?.kind === "door"
      ? 56
      : leg.action?.kind === "transporter"
      ? 88
      : 72;
  return (
    <Box
      component="button"
      type="button"
      onClick={() => onSelectLeg(legIndex)}
      aria-pressed={selected}
      aria-label={`Show ${leg.mapName} on the map`}
      title={`Show ${leg.mapName}`}
      sx={{
        width: HOP_THUMB,
        height: HOP_THUMB,
        flexShrink: 0,
        lineHeight: 0,
        p: 0,
        m: 0,
        border: 0,
        borderRadius: 1,
        bgcolor: "transparent",
        cursor: "pointer",
        outline: "none",
        WebkitTapHighlightColor: "transparent",
        opacity: selected ? 1 : 0.72,
        transition: "opacity 120ms ease",
        overflow: "hidden",
        "&:hover": { opacity: 1 },
        "&:focus": { outline: "none" },
        "&:focus-visible": {
          outline: (theme) => `1px solid ${theme.palette.text.disabled}`,
          outlineOffset: 2,
        },
        // Preview frame already draws its own border; keep the button chrome clean.
        "& > div": { border: 0, borderRadius: 1 },
      }}
    >
      <NpcMapPreview
        geometry={geometry}
        tilesets={tilesets}
        markers={markers}
        spriteContext={spriteContext}
        maxWidth={HOP_THUMB}
        maxHeight={HOP_THUMB}
        focusPadding={focusPadding}
        cropToMarkers
        fixedFrame
      />
    </Box>
  );
}

const HopThumbMemo = memo(HopThumb);

function SpineIconSlot({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        width: SPINE,
        height: SPINE,
        flexShrink: 0,
        borderRadius: "50%",
        bgcolor: "background.paper",
        border: (theme) => `1px solid ${theme.palette.divider}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        lineHeight: 0,
        zIndex: 1,
        "& > *": { maxWidth: SPINE - 4, maxHeight: SPINE - 4 },
      }}
    >
      {children}
    </Box>
  );
}

function SpineMarker({ leg }: { leg: TravelDirectionLeg }) {
  if (leg.role === "start") {
    return (
      <SpineIconSlot>
        <PlaceIcon sx={{ fontSize: 14 }} color="success" />
      </SpineIconSlot>
    );
  }
  if (leg.action?.kind === "door") {
    return (
      <SpineIconSlot>
        <MeetingRoomIcon sx={{ fontSize: 14 }} color="info" />
      </SpineIconSlot>
    );
  }
  if (leg.role === "end") {
    return (
      <SpineIconSlot>
        <FlagIcon sx={{ fontSize: 14 }} color="primary" />
      </SpineIconSlot>
    );
  }
  return (
    <SpineIconSlot>
      <PlaceIcon sx={{ fontSize: 14 }} color="disabled" />
    </SpineIconSlot>
  );
}

function legInstruction(leg: TravelDirectionLeg, npcName: string): string | null {
  if (leg.action) {
    return leg.action.lock
      ? `${leg.action.instruction} (${leg.action.lock})`
      : leg.action.instruction;
  }
  if (leg.role === "end") return `Arrive · talk to ${npcName}`;
  return null;
}

function DirectionsTimeline({
  legs,
  markersByLeg,
  originName,
  destName,
  npcName,
  G,
  tilesets,
  spriteContext,
  selectedIndex,
  onSelectLeg,
}: {
  legs: TravelDirectionLeg[];
  markersByLeg: NpcMapMarker[][];
  originName: string;
  destName: string;
  npcName: string;
  G: CustomGData;
  tilesets: Record<string, GTileset>;
  spriteContext: NpcMapSpriteContext;
  selectedIndex: number;
  onSelectLeg: (index: number) => void;
}) {
  return (
    <Box
      sx={{
        minWidth: 0,
        width: "100%",
        display: "grid",
        gridTemplateColumns: `${SPINE}px minmax(0, 1fr) ${HOP_THUMB}px`,
        columnGap: 1.25,
        rowGap: 1.25,
        alignItems: "start",
        justifyItems: "start",
        textAlign: "left",
      }}
    >
      <Box sx={{ gridColumn: "1 / -1", textAlign: "left" }}>
        <Typography variant="body2" sx={{ fontWeight: 600, textAlign: "left" }}>
          Directions
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mt: 0.15, textAlign: "left" }}
        >
          {originName} → {destName}
        </Typography>
      </Box>

      {legs.map((leg, index) => {
        const markers = markersByLeg[index] ?? [];
        const isLast = index === legs.length - 1;
        const instruction = legInstruction(leg, npcName);
        const legKey = `${leg.role}:${leg.mapKey}:${leg.action?.kind ?? "arrive"}:${
          leg.action?.instruction ?? ""
        }`;
        return (
          <Box key={legKey} sx={{ display: "contents" }}>
            <Stack alignItems="center" sx={{ width: SPINE, alignSelf: "stretch" }}>
              <SpineMarker leg={leg} />
              {!isLast ? (
                <Box sx={{ width: 2, flex: 1, bgcolor: "divider", minHeight: 10, my: 0.25 }} />
              ) : null}
            </Stack>

            <Box sx={{ minWidth: 0, width: "100%", pt: "2px", textAlign: "left" }}>
              <Stack
                direction="row"
                spacing={0.35}
                alignItems="center"
                justifyContent="flex-start"
                sx={{ width: "fit-content", maxWidth: "100%" }}
              >
                <Typography
                  variant="body2"
                  title={leg.mapName}
                  sx={{
                    fontWeight: leg.role === "end" ? 700 : 600,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    lineHeight: 1.35,
                    textAlign: "left",
                  }}
                >
                  {leg.mapName}
                </Typography>
                <Tooltip title="Open in World">
                  <IconButton
                    href={leg.worldHref}
                    size="small"
                    aria-label={`Open ${leg.mapName} in World`}
                    sx={{ p: 0.25, flexShrink: 0 }}
                  >
                    <OpenInNewIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              </Stack>
              {instruction ? (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: "block",
                    mt: 0.2,
                    fontSize: 12.5,
                    lineHeight: 1.35,
                    textAlign: "left",
                  }}
                >
                  {instruction}
                </Typography>
              ) : null}
            </Box>

            <Box sx={{ width: HOP_THUMB, height: HOP_THUMB, justifySelf: "end" }}>
              <HopThumbMemo
                leg={leg}
                markers={markers}
                G={G}
                tilesets={tilesets}
                spriteContext={spriteContext}
                selected={index === selectedIndex}
                legIndex={index}
                onSelectLeg={onSelectLeg}
              />
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

/**
 * Side-by-side location: directions (+ hop thumbs) left, destination map right.
 */
export function NpcMapPathPreview({
  G,
  mapKey,
  npcName,
  npcSkin,
  npcX,
  npcY,
  fromMap = "main",
}: NpcMapPathPreviewProps) {
  const tilesets = G.tilesets as unknown as Record<string, GTileset>;
  const spriteContext = useMemo<NpcMapSpriteContext>(
    () => ({
      sprites: G.sprites as unknown as Record<string, GSprite>,
      images: G.images as unknown as Record<string, GImage>,
      dimensions: G.dimensions as unknown as Record<string, GDimension>,
    }),
    [G.dimensions, G.images, G.sprites],
  );

  const path = useMemo(() => travelPathToMap(G, mapKey, fromMap), [G, fromMap, mapKey]);
  const legs = useMemo(
    () =>
      path
        ? travelPathDirections(G, path, { x: npcX, y: npcY })
        : [
            {
              mapKey,
              mapName: mapDisplayName(G, mapKey),
              role: "end" as const,
              worldHref: worldFocusHref(mapKey, npcX, npcY),
              focusX: npcX,
              focusY: npcY,
            },
          ],
    [G, mapKey, npcX, npcY, path],
  );

  const [selectedIndex, setSelectedIndex] = useState(() => Math.max(0, legs.length - 1));
  useEffect(() => {
    setSelectedIndex(Math.max(0, legs.length - 1));
  }, [legs]);

  const markersByLeg = useMemo(
    () => legs.map((leg) => legMarkers(leg, { name: npcName, skin: npcSkin })),
    [legs, npcName, npcSkin],
  );

  const selectedLeg = legs[Math.min(selectedIndex, legs.length - 1)] ?? legs[0]!;
  const previewGeometry = mapGeometryFor(G, selectedLeg.mapKey);
  const previewMarkers =
    markersByLeg[Math.min(selectedIndex, markersByLeg.length - 1)] ??
    legMarkers(selectedLeg, { name: npcName, skin: npcSkin });
  const previewIsDestination = selectedLeg.role === "end";

  const destName = mapDisplayName(G, mapKey);
  const originName = mapDisplayName(G, path?.startMap ?? fromMap);
  const hasHops = Boolean(path && path.hops.length > 0);

  const HERO_H = 340;

  const previewMap = previewGeometry ? (
    <Box
      sx={{
        width: "100%",
        borderRadius: 1,
        lineHeight: 0,
        overflow: "hidden",
        "& > div": { border: 0 },
      }}
    >
      <NpcMapPreview
        geometry={previewGeometry}
        tilesets={tilesets}
        markers={previewMarkers}
        spriteContext={spriteContext}
        maxWidth={560}
        maxHeight={HERO_H}
        focusPadding={previewIsDestination ? 200 : 160}
        cropToMarkers
        fillWidth
        fixedFrame
      />
    </Box>
  ) : (
    <Box
      sx={{
        width: "100%",
        height: HERO_H,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "action.hover",
        borderRadius: 1,
      }}
    >
      <Typography variant="body2" color="text.secondary">
        Map art unavailable for {selectedLeg.mapKey}.
      </Typography>
    </Box>
  );

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          md: hasHops ? "minmax(260px, 0.95fr) minmax(280px, 1.2fr)" : "1fr",
        },
        gap: 2,
        alignItems: "start",
        width: "100%",
      }}
    >
      {hasHops ? (
        <Box sx={{ order: { xs: 2, md: 1 }, minWidth: 0 }}>
          <DirectionsTimeline
            legs={legs}
            markersByLeg={markersByLeg}
            originName={originName}
            destName={destName}
            npcName={npcName}
            G={G}
            tilesets={tilesets}
            spriteContext={spriteContext}
            selectedIndex={selectedIndex}
            onSelectLeg={setSelectedIndex}
          />
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ order: { xs: 2, md: 1 } }}>
          Already on {destName} from {originName}.
        </Typography>
      )}
      <Box sx={{ order: { xs: 1, md: 2 }, minWidth: 0, width: "100%" }}>{previewMap}</Box>
    </Box>
  );
}
