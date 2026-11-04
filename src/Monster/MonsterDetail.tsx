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
import { useContext, useMemo, type ReactNode } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import type { GTileset, ItemKey } from "typed-adventureland";

import { GDataContext, type CustomGData } from "../GDataContext";
import { mapGeometryFor } from "../gameData/npcCatalog";
import {
  getMonsterDetail,
  type MonsterDropRow,
  type MonsterFactRow,
  type MonsterSpawnRow,
  type MonsterStatRow,
} from "../gameData/monsterCatalog";
import { HomeServerBadge } from "../Shared/HomeServerBadge";
import { ItemInstance } from "../Shared/ItemInstance";
import { LoadingState } from "../Shared/LoadingState";
import { MonsterImage } from "../Shared/SpriteSkin";
import { NpcMapPreview, type NpcMapMarker, type NpcMapSpriteContext } from "../Npc/NpcMapPreview";

function KeyValueTable({ rows }: { rows: MonsterStatRow[] | MonsterFactRow[] }) {
  if (rows.length === 0) return null;
  return (
    <Table size="small" sx={{ mt: 0.5 }}>
      <TableBody>
        {rows.map((row) => (
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
                wordBreak: "break-word",
              }}
            >
              {"href" in row && row.href ? (
                <Link component={RouterLink} to={row.href} underline="hover">
                  {row.value}
                </Link>
              ) : (
                row.value
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

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

function Section({ title, children, mb = 2 }: { title: string; children: ReactNode; mb?: number }) {
  return (
    <Paper sx={{ p: 2, mb }}>
      <Typography variant="overline" sx={{ opacity: 0.7 }}>
        {title}
      </Typography>
      <Box sx={{ mt: 0.5 }}>{children}</Box>
    </Paper>
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
              {detail.chargeSkin && detail.chargeSkin !== detail.skin ? (
                <Typography variant="caption" color="text.secondary">
                  Charge skin: {detail.chargeSkin}
                </Typography>
              ) : null}
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
              {detail.explanation ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
                  {detail.explanation}
                </Typography>
              ) : null}
            </Stack>
          </Paper>

          <Section title="Stats" mb={0}>
            {detail.stats.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No combat stats recorded.
              </Typography>
            ) : (
              <KeyValueTable rows={detail.stats} />
            )}
          </Section>

          {detail.facts.length > 0 ? (
            <Box sx={{ mt: 2 }}>
              <Section title="Facts" mb={0}>
                <KeyValueTable rows={detail.facts} />
              </Section>
            </Box>
          ) : null}

          {detail.other.length > 0 ? (
            <Box sx={{ mt: 2 }}>
              <Section title="Other fields" mb={0}>
                <KeyValueTable rows={detail.other} />
              </Section>
            </Box>
          ) : null}
        </Grid>

        <Grid item xs={12} md={8}>
          <Section title="Spawns">
            {detail.spawns.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No map spawns recorded for this monster.
              </Typography>
            ) : (
              <Stack spacing={3}>
                {detail.spawns.map((spawn) => (
                  <SpawnMapCard key={spawn.mapKey} spawn={spawn} skin={detail.skin} G={G} />
                ))}
              </Stack>
            )}
          </Section>

          {detail.childSpawns.length > 0 ? (
            <Section title="Spawns monsters">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Monster</TableCell>
                    <TableCell align="right">Interval</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detail.childSpawns.map((row) => (
                    <TableRow key={`${row.monsterKey}-${row.interval}`} hover>
                      <TableCell>
                        <Link component={RouterLink} to={row.href} variant="body2">
                          {row.monsterName}
                        </Link>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {row.monsterKey}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                        {row.interval.toLocaleString("en-US")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Section>
          ) : null}

          <Section title="Drops">
            <DropTable rows={detail.drops} />
          </Section>

          {detail.homeDrops.length > 0 ? (
            <Section title="Bonus drops">
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.5 }}>
                <HomeServerBadge />
              </Stack>
              <DropTable rows={detail.homeDrops} home />
            </Section>
          ) : null}

          {detail.slots.length > 0 ? (
            <Section title="Equipment">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Slot</TableCell>
                    <TableCell>Item</TableCell>
                    <TableCell align="right">Level</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detail.slots.map((row) => (
                    <TableRow key={row.slot} hover>
                      <TableCell sx={{ textTransform: "capitalize" }}>{row.slot}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <ItemInstance itemInfo={{ name: row.itemKey as ItemKey }} size={32} />
                          <Box>
                            <Link component={RouterLink} to={row.href} variant="body2">
                              {row.itemName}
                            </Link>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {row.itemKey}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                        {row.level != null ? row.level : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Section>
          ) : null}

          {detail.abilities.length > 0 ? (
            <Section title="Abilities">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Ability</TableCell>
                    <TableCell>Details</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detail.abilities.map((row) => (
                    <TableRow key={row.key} hover>
                      <TableCell sx={{ verticalAlign: "top", whiteSpace: "nowrap" }}>
                        {row.key}
                      </TableCell>
                      <TableCell sx={{ wordBreak: "break-word" }}>{row.summary}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Section>
          ) : null}

          {detail.statuses.length > 0 ? (
            <Section title="Status">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Key</TableCell>
                    <TableCell>Details</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detail.statuses.map((row) => (
                    <TableRow key={row.key} hover>
                      <TableCell sx={{ verticalAlign: "top", whiteSpace: "nowrap" }}>
                        {row.key}
                      </TableCell>
                      <TableCell sx={{ wordBreak: "break-word" }}>{row.summary}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Section>
          ) : null}

          {detail.cbuffs.length > 0 ? (
            <Section title="Condition buffs">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Condition</TableCell>
                    <TableCell align="right">Chance</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detail.cbuffs.map((row) => (
                    <TableRow key={`${row.condition}-${row.chance}`} hover>
                      <TableCell>{row.condition}</TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                        {row.chance}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Section>
          ) : null}

          {detail.pet ? (
            <Section title="Pet">
              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary">
                  {[
                    detail.pet.xp != null ? `XP ${detail.pet.xp.toLocaleString("en-US")}` : null,
                    detail.pet.exponential ? "exponential" : null,
                    detail.pet.brightness != null ? `brightness ${detail.pet.brightness}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Pet stats"}
                </Typography>
                {detail.pet.levelStats.length > 0 ? (
                  <>
                    <Typography variant="caption" color="text.secondary">
                      Per level
                    </Typography>
                    <KeyValueTable rows={detail.pet.levelStats} />
                  </>
                ) : null}
                {detail.pet.ranges.length > 0 ? (
                  <>
                    <Typography variant="caption" color="text.secondary">
                      Ranges
                    </Typography>
                    <KeyValueTable rows={detail.pet.ranges} />
                  </>
                ) : null}
              </Stack>
            </Section>
          ) : null}

          {detail.goldByMap.length > 0 ? (
            <Section title="Gold by map">
              <Table size="small">
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
            </Section>
          ) : null}

          {detail.achievements.length > 0 ? (
            <Section title="Achievements" mb={0}>
              <Table size="small">
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
            </Section>
          ) : null}
        </Grid>
      </Grid>
    </Box>
  );
}
