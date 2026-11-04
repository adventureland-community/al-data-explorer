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
import { mapGeometryFor } from "../gameData/npcCatalog";
import {
  getMonsterDetail,
  type MonsterDropRow,
  type MonsterSpawnRow,
} from "../gameData/monsterCatalog";
import { HomeServerBadge } from "../Shared/HomeServerBadge";
import { ItemInstance } from "../Shared/ItemInstance";
import { LoadingState } from "../Shared/LoadingState";
import { MonsterImage } from "../Shared/SpriteSkin";
import { NpcMapPreview, type NpcMapMarker, type NpcMapSpriteContext } from "../Npc/NpcMapPreview";

function SpawnMapCard({
  spawn,
  skin,
  G,
}: {
  spawn: MonsterSpawnRow;
  skin: string;
  G: CustomGData;
}) {
  const geometry = mapGeometryFor(G, spawn.mapKey);
  const tilesets = G.tilesets as unknown as Record<string, GTileset>;
  const spriteContext = useMemo<NpcMapSpriteContext>(
    () => ({
      sprites: G.sprites,
      images: G.images,
      dimensions: G.dimensions,
    }),
    [G.dimensions, G.images, G.sprites],
  );
  const markers = useMemo<NpcMapMarker[]>(() => {
    if (spawn.zones.length === 0) return [];
    return spawn.zones.map((zone, index) => ({
      x: zone.x,
      y: zone.y,
      width: zone.width,
      height: zone.height,
      kind: "monster" as const,
      skin: index === 0 ? skin : undefined,
      label: zone.count > 1 ? `×${zone.count}` : undefined,
    }));
  }, [skin, spawn.zones]);

  const packLabel =
    spawn.zones.length === 0
      ? "No pack geometry"
      : spawn.zones
          .map((zone) => {
            const flags = [
              zone.grow ? "grow" : null,
              zone.roam ? "roam" : null,
              `×${zone.count}`,
            ].filter(Boolean);
            return flags.join(" · ");
          })
          .join("; ");

  return (
    <Box>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        flexWrap="wrap"
        sx={{ mb: 1.25, gap: 0.75 }}
      >
        <Typography variant="subtitle2">
          <Link component={RouterLink} to={spawn.href} underline="hover">
            {spawn.mapName}
          </Link>
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {spawn.mapKey}
          {packLabel ? ` · ${packLabel}` : ""}
        </Typography>
        <Button href={spawn.worldHref} size="small" variant="text" sx={{ minWidth: 0, ml: "auto" }}>
          Open in World
        </Button>
      </Stack>
      {geometry && markers.length > 0 ? (
        <Box sx={{ width: "100%", borderRadius: 1, overflow: "hidden", lineHeight: 0 }}>
          <NpcMapPreview
            geometry={geometry}
            tilesets={tilesets}
            markers={markers}
            spriteContext={spriteContext}
            maxWidth={720}
            maxHeight={280}
            focusPadding={120}
            cropToMarkers
            fillWidth
            fixedFrame
          />
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary">
          {geometry ? "No spawn zone coordinates for this map." : "No map art for this key."}
        </Typography>
      )}
    </Box>
  );
}

function DropTable({ rows, home }: { rows: MonsterDropRow[]; home?: boolean }) {
  if (rows.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {home ? "No home-server bonus drops." : "No drops recorded."}
      </Typography>
    );
  }

  return (
    <Table size="small" sx={{ mt: 1 }}>
      <TableHead>
        <TableRow>
          <TableCell sx={{ width: 56 }} />
          <TableCell>Drop</TableCell>
          <TableCell align="right">Chance</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((drop) => (
          <TableRow
            key={`${drop.itemKey}-${drop.title}-${drop.data}-${drop.oddsLabel}-${drop.nestedTable}`}
            hover
          >
            <TableCell>
              {!drop.nestedTable ? (
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
              {(drop.title || drop.data) && (
                <Typography variant="caption" color="text.secondary" display="block">
                  {[drop.title, drop.data].filter(Boolean).join(" · ")}
                </Typography>
              )}
            </TableCell>
            <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
              {drop.oddsLabel}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function MonsterDetail() {
  const { monsterKey: rawKey } = useParams();
  const monsterKey = rawKey ? decodeURIComponent(rawKey) : "";
  const G = useContext(GDataContext);

  const detail = useMemo(
    () => (G && monsterKey ? getMonsterDetail(monsterKey, G) : null),
    [G, monsterKey],
  );

  if (!G) return <LoadingState label="Loading monster…" />;
  if (!detail) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6">Monster not found</Typography>
        <Button component={RouterLink} to="/monsters" sx={{ mt: 1 }}>
          Back to Monsters
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
        <Button component={RouterLink} to="/monsters" size="small">
          ← Monsters
        </Button>
        {detail.worldHref ? (
          <Button href={detail.worldHref} size="small" variant="outlined">
            Open in World
          </Button>
        ) : null}
        <Button component={RouterLink} to={detail.dropsSimHref} size="small" variant="outlined">
          Drop Simulator
        </Button>
      </Stack>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Stack spacing={1.5} alignItems="center">
              <MonsterImage monsterName={detail.key} scale={2.2} tooltip={false} />
              <Box sx={{ textAlign: "center" }}>
                <Typography variant="h5">{detail.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {detail.key}
                </Typography>
              </Box>
              <Stack
                direction="row"
                spacing={0.75}
                flexWrap="wrap"
                justifyContent="center"
                sx={{ gap: 0.75 }}
              >
                {detail.damageType ? (
                  <Chip
                    size="small"
                    label={detail.damageType}
                    color="primary"
                    variant="outlined"
                    sx={{ textTransform: "capitalize" }}
                  />
                ) : null}
                {detail.flags.map((flag) => (
                  <Chip key={flag} size="small" label={flag} />
                ))}
              </Stack>
            </Stack>
          </Paper>

          <Paper sx={{ p: 2, mt: 2 }}>
            <Typography variant="overline" sx={{ opacity: 0.7 }}>
              Stats
            </Typography>
            {detail.stats.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                No combat stats recorded.
              </Typography>
            ) : (
              <Table size="small" sx={{ mt: 0.5 }}>
                <TableBody>
                  {detail.stats.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell
                        sx={{
                          color: "text.secondary",
                          width: "42%",
                          py: 0.45,
                          borderColor: "divider",
                        }}
                      >
                        {row.label}
                      </TableCell>
                      <TableCell
                        sx={{
                          py: 0.45,
                          borderColor: "divider",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {row.value}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="overline" sx={{ opacity: 0.7 }}>
              Spawns
            </Typography>
            {detail.spawns.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                No map spawns recorded for this monster.
              </Typography>
            ) : (
              <Stack spacing={3} sx={{ mt: 1 }}>
                {detail.spawns.map((spawn) => (
                  <SpawnMapCard key={spawn.mapKey} spawn={spawn} skin={detail.skin} G={G} />
                ))}
              </Stack>
            )}
          </Paper>

          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="overline" sx={{ opacity: 0.7 }}>
              Drops
            </Typography>
            <DropTable rows={detail.drops} />
          </Paper>

          {detail.homeDrops.length > 0 ? (
            <Paper sx={{ p: 2, mb: 2 }}>
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.25 }}>
                <Typography variant="overline" sx={{ opacity: 0.7 }}>
                  Bonus drops
                </Typography>
                <HomeServerBadge />
              </Stack>
              <DropTable rows={detail.homeDrops} home />
            </Paper>
          ) : null}

          {detail.goldByMap.length > 0 ? (
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="overline" sx={{ opacity: 0.7 }}>
                Gold by map
              </Typography>
              <Table size="small" sx={{ mt: 1 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Map</TableCell>
                    <TableCell align="right">Gold</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detail.goldByMap.map((row) => (
                    <TableRow key={row.mapKey} hover>
                      <TableCell>
                        <Link component={RouterLink} to={row.href} variant="body2">
                          {row.mapName}
                        </Link>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {row.mapKey}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                        {row.gold.toLocaleString("en-US")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          ) : null}

          {detail.achievements.length > 0 ? (
            <Paper sx={{ p: 2 }}>
              <Typography variant="overline" sx={{ opacity: 0.7 }}>
                Achievements
              </Typography>
              <Table size="small" sx={{ mt: 1 }}>
                <TableHead>
                  <TableRow>
                    <TableCell align="right">Kills</TableCell>
                    <TableCell>Kind</TableCell>
                    <TableCell>Reward</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detail.achievements.map((row) => (
                    <TableRow key={`${row.kills}-${row.kind}-${row.reward}`} hover>
                      <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                        {row.kills.toLocaleString("en-US")}
                      </TableCell>
                      <TableCell>{row.kind}</TableCell>
                      <TableCell>{row.reward}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          ) : null}
        </Grid>
      </Grid>
    </Box>
  );
}
