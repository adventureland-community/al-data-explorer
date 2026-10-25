import {
  Box,
  Button,
  Chip,
  Grid,
  Link,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useContext, useMemo } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import type { GTileset, ItemKey } from "typed-adventureland";

import { GDataContext, type CustomGData } from "../GDataContext";
import { getMapDetail, mapDetailHref, type MapDetailView } from "../gameData/mapCatalog";
import { getMapDisplayName } from "../gameData/drops";
import { mapGeometryFor } from "../gameData/npcCatalog";
import type { TravelEdge } from "../gameData/mapTravel";
import { ItemInstance } from "../Shared/ItemInstance";
import { LoadingState } from "../Shared/LoadingState";
import { MonsterImage, NpcImage } from "../Shared/SpriteSkin";
import { NpcMapPreview, type NpcMapMarker, type NpcMapSpriteContext } from "../Npc/NpcMapPreview";

function previewMarkers(detail: MapDetailView): NpcMapMarker[] {
  const markers: NpcMapMarker[] = [];
  for (const npc of detail.npcs) {
    if (npc.x == null || npc.y == null) continue;
    markers.push({
      x: npc.x,
      y: npc.y,
      label: npc.name,
      kind: "npc",
      skin: npc.skin,
    });
  }
  for (const edge of detail.outbound) {
    markers.push({
      x: edge.fromX,
      y: edge.fromY,
      label: edge.label,
      kind: edge.kind === "transporter" ? "transporter" : "door",
      skin: edge.viaNpcSkin,
    });
  }
  return markers;
}

function TravelTable({
  title,
  edges,
  direction,
  mapNames,
}: {
  title: string;
  edges: TravelEdge[];
  direction: "from" | "to";
  mapNames: Record<string, { name?: string } | undefined>;
}) {
  if (edges.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        None.
      </Typography>
    );
  }
  return (
    <Table size="small" sx={{ mt: 1 }}>
      <TableHead>
        <TableRow>
          <TableCell>{title}</TableCell>
          <TableCell>Via</TableCell>
          <TableCell>Lock</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {edges.map((edge) => {
          const otherKey = direction === "from" ? edge.toMap : edge.fromMap;
          const otherLabel =
            direction === "from" ? edge.label : getMapDisplayName(otherKey, mapNames);
          return (
            <TableRow
              key={`${edge.fromMap}-${edge.toMap}-${edge.kind}-${edge.fromX}-${edge.fromY}-${
                edge.lock ?? ""
              }`}
              hover
            >
              <TableCell>
                <Link component={RouterLink} to={mapDetailHref(otherKey)} variant="body2">
                  {otherLabel}
                </Link>
                <Typography variant="caption" color="text.secondary" display="block">
                  {otherKey}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" sx={{ textTransform: "capitalize" }}>
                  {edge.kind}
                </Typography>
              </TableCell>
              <TableCell>
                {edge.lock ? (
                  <Link component={RouterLink} to={`/items/${edge.lock}`} variant="body2">
                    {edge.lock}
                  </Link>
                ) : (
                  "—"
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function MapPreview({ detail, G }: { detail: MapDetailView; G: CustomGData }) {
  const geometry = mapGeometryFor(G, detail.key);
  const tilesets = G.tilesets as unknown as Record<string, GTileset>;
  const spriteContext = useMemo<NpcMapSpriteContext>(
    () => ({
      sprites: G.sprites,
      images: G.images,
      dimensions: G.dimensions,
    }),
    [G.dimensions, G.images, G.sprites],
  );
  const markers = useMemo(() => previewMarkers(detail), [detail]);

  if (!geometry) {
    return (
      <Typography variant="body2" color="text.secondary">
        No map art for this key.
      </Typography>
    );
  }

  return (
    <Box sx={{ width: "100%", borderRadius: 1, overflow: "hidden", lineHeight: 0 }}>
      <NpcMapPreview
        geometry={geometry}
        tilesets={tilesets}
        markers={markers}
        spriteContext={spriteContext}
        maxWidth={720}
        maxHeight={360}
        cropToMarkers={false}
        fillWidth
        fixedFrame
      />
    </Box>
  );
}

export function MapDetail() {
  const { mapKey: rawKey } = useParams();
  const mapKey = rawKey ? decodeURIComponent(rawKey) : "";
  const G = useContext(GDataContext);

  const detail = useMemo(() => (G && mapKey ? getMapDetail(mapKey, G) : null), [G, mapKey]);

  if (!G) return <LoadingState label="Loading map…" />;
  if (!detail) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6">Map not found</Typography>
        <Button component={RouterLink} to="/maps" sx={{ mt: 1 }}>
          Back to Maps
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 }, maxWidth: 1100, mx: "auto" }}>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{ mb: 2, flexWrap: "wrap", gap: 1 }}
      >
        <Button component={RouterLink} to="/maps" size="small">
          ← Maps
        </Button>
        <Button href={detail.worldHref} size="small" variant="outlined">
          Open in World
        </Button>
      </Stack>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h5">{detail.name}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              {detail.key}
            </Typography>
            <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", gap: 0.75 }}>
              <Chip
                size="small"
                label={detail.outside ? "Outside" : "Indoor"}
                color="primary"
                variant="outlined"
              />
              {detail.instance ? <Chip size="small" label="Instance" /> : null}
              {detail.ignored ? <Chip size="small" label="Ignored" /> : null}
              {detail.unlisted ? <Chip size="small" label="Unlisted" /> : null}
              {detail.dropNorm != null ? (
                <Chip size="small" label={`drop_norm ${detail.dropNorm}`} variant="outlined" />
              ) : null}
            </Stack>
          </Paper>

          {(detail.onDeath || detail.onExit) && (
            <Paper sx={{ p: 2, mt: 2 }}>
              <Typography variant="overline" sx={{ opacity: 0.7 }}>
                Rules
              </Typography>
              <Stack spacing={0.75} sx={{ mt: 0.5 }}>
                {detail.onDeath ? (
                  <Typography variant="body2">
                    On death →{" "}
                    <Link component={RouterLink} to={detail.onDeath.href}>
                      {detail.onDeath.mapName}
                    </Link>
                    {detail.onDeath.spawnIndex != null
                      ? ` (spawn ${detail.onDeath.spawnIndex})`
                      : ""}
                  </Typography>
                ) : null}
                {detail.onExit ? (
                  <Typography variant="body2">
                    On exit →{" "}
                    <Link component={RouterLink} to={detail.onExit.href}>
                      {detail.onExit.mapName}
                    </Link>
                    {detail.onExit.spawnIndex != null ? ` (spawn ${detail.onExit.spawnIndex})` : ""}
                  </Typography>
                ) : null}
              </Stack>
            </Paper>
          )}

          {detail.directions && detail.directions.length > 0 ? (
            <Paper sx={{ p: 2, mt: 2 }}>
              <Typography variant="overline" sx={{ opacity: 0.7 }}>
                Getting here
              </Typography>
              <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                {detail.directions.map((leg) => (
                  <Typography
                    key={`${leg.role}-${leg.mapKey}-${leg.action?.kind ?? "none"}-${
                      leg.focusX ?? "x"
                    }-${leg.focusY ?? "y"}`}
                    variant="body2"
                  >
                    {leg.role === "start" ? "Start: " : leg.role === "end" ? "Arrive: " : "Via: "}
                    <Link component={RouterLink} to={mapDetailHref(leg.mapKey)}>
                      {leg.mapName}
                    </Link>
                    {leg.action ? ` — ${leg.action.instruction}` : ""}
                  </Typography>
                ))}
              </Stack>
            </Paper>
          ) : null}
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="overline" sx={{ opacity: 0.7 }}>
              Preview
            </Typography>
            <Box sx={{ mt: 1 }}>
              <MapPreview detail={detail} G={G} />
            </Box>
          </Paper>

          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="overline" sx={{ opacity: 0.7 }}>
              Connections out
            </Typography>
            <TravelTable
              title="Destination"
              edges={detail.outbound}
              direction="from"
              mapNames={G.maps as Record<string, { name?: string } | undefined>}
            />
          </Paper>

          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="overline" sx={{ opacity: 0.7 }}>
              Connections in
            </Typography>
            <TravelTable
              title="From"
              edges={detail.inbound}
              direction="to"
              mapNames={G.maps as Record<string, { name?: string } | undefined>}
            />
          </Paper>

          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="overline" sx={{ opacity: 0.7 }}>
              NPCs
            </Typography>
            {detail.npcs.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                No NPCs on this map.
              </Typography>
            ) : (
              <Table size="small" sx={{ mt: 1 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 56 }} />
                    <TableCell>NPC</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell align="right">Pos</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detail.npcs.map((npc) => (
                    <TableRow key={npc.id} hover>
                      <TableCell>
                        <NpcImage npcId={npc.id} scale={1.2} tooltip={false} />
                      </TableCell>
                      <TableCell>
                        <Link component={RouterLink} to={npc.href} variant="body2">
                          {npc.name}
                        </Link>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {npc.id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={npc.role} />
                      </TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                        {npc.x != null && npc.y != null
                          ? `${Math.round(npc.x)}, ${Math.round(npc.y)}`
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>

          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="overline" sx={{ opacity: 0.7 }}>
              Monsters
            </Typography>
            {detail.monsters.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                No monster packs on this map.
              </Typography>
            ) : (
              <Table size="small" sx={{ mt: 1 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 56 }} />
                    <TableCell>Monster</TableCell>
                    <TableCell align="right">Count</TableCell>
                    <TableCell>Flags</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detail.monsters.map((monster) => (
                    <TableRow key={`${monster.type}-${monster.count}`} hover>
                      <TableCell>
                        <MonsterImage monsterName={monster.type} scale={1.35} />
                      </TableCell>
                      <TableCell>
                        <Link component={RouterLink} to={monster.href} variant="body2">
                          {monster.name}
                        </Link>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {monster.type}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                        {monster.count}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap", gap: 0.5 }}>
                          {monster.grow ? <Chip size="small" label="grow" /> : null}
                          {monster.roam ? <Chip size="small" label="roam" /> : null}
                          {!monster.grow && !monster.roam ? "—" : null}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="overline" sx={{ opacity: 0.7 }}>
              Map drops
            </Typography>
            {detail.mapDrops.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                No map-scoped drop table.
              </Typography>
            ) : (
              <Table size="small" sx={{ mt: 1 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 56 }} />
                    <TableCell>Drop</TableCell>
                    <TableCell align="right">Chance</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detail.mapDrops.map((drop) => (
                    <TableRow
                      key={`${drop.itemKey}-${drop.nestedTable}-${drop.oddsLabel}-${drop.label}`}
                      hover
                    >
                      <TableCell>
                        {drop.itemKey && !drop.nestedTable ? (
                          <ItemInstance itemInfo={{ name: drop.itemKey as ItemKey }} size={36} />
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {drop.href ? (
                          <Link component={RouterLink} to={drop.href} variant="body2">
                            {drop.label}
                          </Link>
                        ) : (
                          <Typography variant="body2">{drop.label}</Typography>
                        )}
                      </TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                        {drop.oddsLabel}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
