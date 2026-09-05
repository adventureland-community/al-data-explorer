import {
  Box,
  Button,
  Chip,
  Grid,
  Paper,
  Slider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useContext, useMemo, useState } from "react";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { ItemKey } from "typed-adventureland";

import { GDataContext } from "../GDataContext";
import {
  classAttributeRows,
  classCombatStats,
  classLookSkins,
  classWeaponRows,
  formatSkillMs,
  isClassKey,
  skillFlagLabels,
  skillsForClass,
  titleCaseKey,
} from "../gameData/classSkills";
import { ItemInstance } from "../Shared/ItemInstance";
import { LoadingState } from "../Shared/LoadingState";
import { SpriteSkin } from "../Shared/SpriteSkin";
import { classAccent, classColor } from "./ClassChip";
import { SkillImage } from "./SkillImage";

function FactsTable({ rows }: { rows: { key: string; label: string; value: string }[] }) {
  if (rows.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No combat stats.
      </Typography>
    );
  }
  return (
    <TableContainer>
      <Table size="small">
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.key}>
              <TableCell
                sx={{
                  color: "text.secondary",
                  width: "46%",
                  py: 0.4,
                  px: 0,
                  borderColor: "transparent",
                }}
              >
                {row.label}
              </TableCell>
              <TableCell
                sx={{
                  py: 0.4,
                  px: 0,
                  pl: 1.5,
                  borderColor: "transparent",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {row.value}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function WeaponColumn({
  title,
  rows,
}: {
  title: string;
  rows: ReturnType<typeof classWeaponRows>;
}) {
  return (
    <Box>
      <Typography variant="overline" sx={{ display: "block", mb: 0.5, opacity: 0.7 }}>
        {title}
      </Typography>
      {rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          None
        </Typography>
      ) : (
        <Stack spacing={0.4}>
          {rows.map((row) => (
            <Stack
              key={row.wtype}
              direction="row"
              spacing={1}
              justifyContent="space-between"
              alignItems="baseline"
            >
              <Typography variant="body2" sx={{ fontWeight: 600, flexShrink: 0 }}>
                {titleCaseKey(row.wtype)}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ textAlign: "right", lineHeight: 1.35 }}
              >
                {row.bonuses.length === 0
                  ? "—"
                  : row.bonuses.map((bonus) => `${bonus.label} ${bonus.value}`).join(" · ")}
              </Typography>
            </Stack>
          ))}
        </Stack>
      )}
    </Box>
  );
}

const sidePanelSx = {
  borderLeft: { md: 1 },
  borderTop: { xs: 1, md: 0 },
  borderColor: "divider",
  pl: { md: 2.5 },
  pt: { xs: 1.5, md: 0 },
  minWidth: 0,
} as const;

const skillRowSx = {
  cursor: "pointer",
  "&:hover": { backgroundColor: "action.hover" },
} as const;

export function ClassDetail() {
  const { classKey } = useParams<{ classKey: string }>();
  const navigate = useNavigate();
  const G = useContext(GDataContext);
  const [level, setLevel] = useState(80);

  const gClass = classKey && isClassKey(classKey) && G ? G.classes[classKey] : undefined;
  const lookSkins = gClass ? classLookSkins(gClass) : [];
  const combatRows = useMemo(() => (gClass ? classCombatStats(gClass) : []), [gClass]);
  const attrRows = useMemo(
    () => (gClass ? classAttributeRows(gClass, level) : []),
    [gClass, level],
  );
  const classSkills = useMemo(
    () => (G && classKey && isClassKey(classKey) ? skillsForClass(G.skills, classKey) : []),
    [G, classKey],
  );

  if (!G || !classKey) {
    return <LoadingState />;
  }

  if (!gClass || !isClassKey(classKey)) {
    return (
      <Box sx={{ textAlign: "center", py: 6 }}>
        <Typography variant="h6" gutterBottom>
          Class not found
        </Typography>
        <Typography color="text.secondary" gutterBottom>
          {classKey}
        </Typography>
        <Button component={RouterLink} to="/classes" sx={{ mt: 2 }}>
          Back to classes
        </Button>
      </Box>
    );
  }

  const color = classColor(classKey) ?? "#888";
  const starter = gClass.base_slots?.mainhand;
  const starterItem = starter ? G.items[starter.name as ItemKey] : undefined;

  return (
    <Box sx={{ p: 2, maxWidth: 1200, mx: "auto" }}>
      <Button component={RouterLink} to="/classes" sx={{ mb: 1.5 }}>
        ← All classes
      </Button>

      <Paper sx={{ p: 2, mb: 2, ...classAccent(color) }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "minmax(0, 1.15fr) minmax(170px, 220px) minmax(280px, 360px)",
            },
            columnGap: 3,
            rowGap: 2,
            alignItems: "start",
          }}
        >
          <Stack spacing={1.5} sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1.5} alignItems="flex-start">
              <Stack direction="row" spacing={0.75} sx={{ flexShrink: 0, pt: 0.25 }}>
                {lookSkins.map((skin) => (
                  <SpriteSkin key={skin} skin={skin} alt={classKey} scale={1.25} />
                ))}
              </Stack>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  flexWrap="wrap"
                  sx={{ gap: 0.75 }}
                >
                  <Typography variant="h5" component="h1" sx={{ lineHeight: 1.15 }}>
                    {titleCaseKey(classKey)}
                  </Typography>
                  <Chip size="small" label={gClass.damage_type} variant="outlined" />
                  <Chip
                    size="small"
                    label={`Main ${titleCaseKey(gClass.main_stat)}`}
                    variant="outlined"
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.5 }}>
                  {gClass.description}
                </Typography>
              </Box>
            </Stack>

            {starter && (
              <Box
                component={RouterLink}
                to={`/items/${starter.name}`}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 1.25,
                  textDecoration: "none",
                  color: "inherit",
                  width: "fit-content",
                }}
              >
                <ItemInstance itemInfo={{ name: starter.name as ItemKey, level: starter.level }} />
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Starting weapon
                  </Typography>
                  <Typography variant="body2">{starterItem?.name ?? starter.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {starter.name}
                    {starter.level ? ` +${starter.level}` : ""}
                    {starter.gift ? " · gift" : ""}
                  </Typography>
                </Box>
              </Box>
            )}
          </Stack>

          <Box sx={sidePanelSx}>
            <Typography variant="overline" sx={{ display: "block", mb: 0.5, opacity: 0.7 }}>
              Combat
            </Typography>
            <FactsTable rows={combatRows} />
          </Box>

          <Box sx={sidePanelSx}>
            <Typography variant="overline" sx={{ display: "block", mb: 0.5, opacity: 0.7 }}>
              Attributes at level {level}
            </Typography>
            <Stack spacing={0.5} sx={{ mb: 1 }}>
              <Slider
                size="small"
                value={level}
                min={1}
                max={200}
                step={1}
                valueLabelDisplay="auto"
                onChange={(_event, value) => {
                  if (typeof value === "number") setLevel(value);
                }}
              />
            </Stack>
            <TableContainer sx={{ overflowX: "hidden" }}>
              <Table size="small" sx={{ tableLayout: "fixed" }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ pl: 0, py: 0.4, width: "34%" }}>Stat</TableCell>
                    <TableCell align="right" sx={{ py: 0.4, width: "22%" }}>
                      Base
                    </TableCell>
                    <TableCell align="right" sx={{ py: 0.4, width: "22%" }}>
                      /lvl
                    </TableCell>
                    <TableCell align="right" sx={{ py: 0.4, pr: 0, width: "22%" }}>
                      {level}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {attrRows.map((row) => (
                    <TableRow key={row.key} hover>
                      <TableCell sx={{ color: "text.secondary", pl: 0, py: 0.35 }}>
                        {row.label}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontVariantNumeric: "tabular-nums", py: 0.35 }}
                      >
                        {row.base}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontVariantNumeric: "tabular-nums", py: 0.35 }}
                      >
                        {row.growth}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          fontVariantNumeric: "tabular-nums",
                          fontWeight: 600,
                          pr: 0,
                          py: 0.35,
                        }}
                      >
                        {row.atLevel}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Box>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="baseline"
          sx={{ mb: 1.5 }}
        >
          <Typography variant="h6">Skills</Typography>
          <Button component={RouterLink} to={`/classes?class=${classKey}`} size="small">
            Show in catalog
          </Button>
        </Stack>
        {classSkills.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No class skills in G data.
          </Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Skill</TableCell>
                  <TableCell align="right">MP</TableCell>
                  <TableCell align="right">Cooldown</TableCell>
                  <TableCell align="right">Range</TableCell>
                  <TableCell>Flags</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {classSkills.map((row) => {
                  const flags = skillFlagLabels(row.skill);
                  return (
                    <TableRow
                      key={row.key}
                      hover
                      onClick={() => navigate(`/skills/${row.key}`)}
                      sx={skillRowSx}
                    >
                      <TableCell>
                        <Stack direction="row" spacing={1.25} alignItems="flex-start">
                          <SkillImage skillKey={row.key} size={36} />
                          <Box sx={{ minWidth: 0 }}>
                            <Typography
                              component={RouterLink}
                              to={`/skills/${row.key}`}
                              variant="body2"
                              onClick={(event) => event.stopPropagation()}
                              sx={{
                                fontWeight: 600,
                                color: "inherit",
                                textDecoration: "none",
                                display: "block",
                                "&:hover": { textDecoration: "underline" },
                              }}
                            >
                              {row.skill.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {row.skill.explanation ?? row.key}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                        {row.skill.mp ?? "—"}
                      </TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                        {row.skill.cooldown != null ? formatSkillMs(row.skill.cooldown) : "—"}
                      </TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                        {row.skill.range ?? "—"}
                      </TableCell>
                      <TableCell>
                        {flags.length > 0 ? (
                          <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap", gap: 0.5 }}>
                            {flags.map((flag) => (
                              <Chip
                                key={flag}
                                size="small"
                                label={flag}
                                variant="outlined"
                                sx={{ height: 20, fontSize: 10 }}
                              />
                            ))}
                          </Stack>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            —
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="overline" sx={{ display: "block", mb: 1, opacity: 0.7 }}>
          Weapon bonuses
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <WeaponColumn title="Mainhand" rows={classWeaponRows(gClass.mainhand)} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <WeaponColumn title="Offhand" rows={classWeaponRows(gClass.offhand)} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <WeaponColumn title="Two-hand" rows={classWeaponRows(gClass.doublehand)} />
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}
