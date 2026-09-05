import {
  Box,
  Button,
  Chip,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
} from "@mui/material";
import { memo, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";

import { GDataContext } from "../GDataContext";
import {
  formatSkillMs,
  listClassCatalog,
  listSkillTypes,
  querySkills,
  skillFlagLabels,
  SKILL_KIND_ORDER,
  SkillRow,
  SkillSortKey,
  titleCaseKey,
} from "../gameData/classSkills";
import { LoadingState } from "../Shared/LoadingState";
import { MultiFilterAutocomplete } from "../Shared/MultiFilterAutocomplete";
import { SpriteSkin } from "../Shared/SpriteSkin";
import { StickyListLayout, StickyTableShell } from "../Shared/StickyListLayout";
import { classAccent, ClassChip, classColor, KindChip } from "./ClassChip";
import { SkillImage } from "./SkillImage";
import { useClassesUrlParams } from "./useClassesUrlParams";

function toggleValue(list: string[], value: string): string[] {
  if (list.includes(value)) {
    const next: string[] = [];
    for (const item of list) {
      if (item !== value) next.push(item);
    }
    return next;
  }
  return [...list, value];
}

function DebouncedSearchField({
  value,
  onCommit,
  delayMs = 250,
}: {
  value: string;
  onCommit: (next: string) => void;
  delayMs?: number;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (draft !== value) onCommit(draft);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [delayMs, draft, onCommit, value]);

  return (
    <TextField
      fullWidth
      label="Search"
      placeholder="Skill name, key, or class"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      size="small"
    />
  );
}

const SkillBrowseRow = memo(({ row, to }: { row: SkillRow; to: string }) => {
  const navigate = useNavigate();
  const flags = skillFlagLabels(row.skill);
  const shownFlags = flags.slice(0, 2);
  const extraFlags = flags.length - shownFlags.length;
  return (
    <TableRow
      hover
      onClick={() => navigate(to)}
      sx={{
        cursor: "pointer",
        contentVisibility: "auto",
        containIntrinsicSize: "auto 76px",
        "&:hover": { backgroundColor: "action.hover" },
      }}
    >
      <TableCell>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <SkillImage skillKey={row.key} size={40} />
          <Box sx={{ minWidth: 0 }}>
            <Typography
              component={RouterLink}
              to={to}
              variant="body2"
              noWrap
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
            <Typography variant="caption" color="text.secondary" noWrap display="block">
              {row.key}
            </Typography>
            {row.skill.explanation && (
              <Typography
                variant="caption"
                color="text.secondary"
                noWrap
                display="block"
                title={row.skill.explanation}
                sx={{ opacity: 0.85 }}
              >
                {row.skill.explanation}
              </Typography>
            )}
          </Box>
        </Stack>
      </TableCell>
      <TableCell>
        <KindChip kind={row.kind} />
      </TableCell>
      <TableCell>
        {row.skill.class && row.skill.class.length > 0 ? (
          <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap", gap: 0.5 }}>
            {row.skill.class.map((classKey) => (
              <ClassChip key={classKey} classKey={classKey} link={false} />
            ))}
          </Stack>
        ) : (
          <Typography variant="caption" color="text.secondary">
            —
          </Typography>
        )}
      </TableCell>
      <TableCell align="right">
        <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
          {row.skill.mp != null ? row.skill.mp : "—"}
        </Typography>
      </TableCell>
      <TableCell align="right">
        <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
          {row.skill.cooldown != null ? formatSkillMs(row.skill.cooldown) : "—"}
        </Typography>
      </TableCell>
      <TableCell align="right">
        <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
          {row.skill.range != null ? row.skill.range : "—"}
        </Typography>
      </TableCell>
      <TableCell>
        {flags.length > 0 ? (
          <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap", gap: 0.5 }}>
            {shownFlags.map((flag) => (
              <Chip
                key={flag}
                size="small"
                label={flag}
                variant="outlined"
                sx={{ height: 20, fontSize: 10 }}
              />
            ))}
            {extraFlags > 0 && (
              <Chip
                size="small"
                label={`+${extraFlags}`}
                variant="outlined"
                sx={{ height: 20, fontSize: 10 }}
              />
            )}
          </Stack>
        ) : (
          <Typography variant="caption" color="text.secondary">
            —
          </Typography>
        )}
      </TableCell>
    </TableRow>
  );
});
SkillBrowseRow.displayName = "SkillBrowseRow";

export function ClassesBrowse() {
  const G = useContext(GDataContext);
  const { params, setParam, setListParam, clearFilters, hasActiveFilters, browseQuery } =
    useClassesUrlParams();

  const commitSearch = useCallback(
    (next: string) => {
      setParam("search", next, { replace: true });
    },
    [setParam],
  );

  const catalog = useMemo(() => (G ? listClassCatalog(G) : []), [G]);
  const types = useMemo(() => (G ? listSkillTypes(G.skills) : []), [G]);

  const rows = useMemo(() => {
    if (!G) return [];
    return querySkills(G.skills, {
      search: params.search,
      classes: params.classes,
      kinds: params.kinds,
      types: params.types,
      sort: params.sort,
    });
  }, [G, params.classes, params.kinds, params.search, params.sort, params.types]);

  if (!G) {
    return <LoadingState />;
  }

  const toggleSort = (key: SkillSortKey) => {
    setParam("sort", key);
  };

  return (
    <StickyListLayout
      toolbar={
        <Box>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-start"
            sx={{ mb: 1 }}
          >
            <Box>
              <Typography variant="h5">Classes & Skills</Typography>
              <Typography variant="body2" color="text.secondary">
                Open a class for stats and the kit, or filter the catalog below.
              </Typography>
            </Box>
            <Chip label={`${rows.length} skills`} size="small" />
          </Stack>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(2, minmax(0, 1fr))",
                sm: "repeat(4, minmax(0, 1fr))",
                md: "repeat(7, minmax(0, 1fr))",
              },
              gap: 0.75,
            }}
          >
            {catalog.map((entry) => {
              const color = classColor(entry.key) ?? "#888";
              const selected = params.classes.includes(entry.key);
              return (
                <Paper
                  key={entry.key}
                  component={RouterLink}
                  to={`/classes/${entry.key}`}
                  elevation={selected ? 4 : 0}
                  variant={selected ? "elevation" : "outlined"}
                  sx={{
                    display: "block",
                    textDecoration: "none",
                    color: "inherit",
                    px: 1,
                    py: 0.75,
                    minWidth: 0,
                    ...classAccent(color),
                    "&:hover": { backgroundColor: "action.hover" },
                  }}
                >
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    {entry.lookSkin ? (
                      <SpriteSkin skin={entry.lookSkin} alt={entry.key} scale={1} />
                    ) : null}
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>
                        {titleCaseKey(entry.key)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" noWrap>
                        {entry.skillCount} · {entry.gClass.damage_type}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              );
            })}
          </Box>
        </Box>
      }
      filters={
        <Paper sx={{ p: 1.5 }}>
          <Grid container spacing={1.5} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <DebouncedSearchField value={params.search} onCommit={commitSearch} />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <MultiFilterAutocomplete
                label="Type"
                options={types}
                value={params.types}
                onChange={(next) => setListParam("type", next)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Stack
                direction="row"
                spacing={0.5}
                alignItems="center"
                sx={{ flexWrap: "wrap", gap: 0.5, minHeight: 40 }}
              >
                {SKILL_KIND_ORDER.map((kind) => (
                  <KindChip
                    key={kind}
                    kind={kind}
                    selected={params.kinds.includes(kind)}
                    onClick={() => setListParam("kind", toggleValue(params.kinds, kind))}
                  />
                ))}
                {hasActiveFilters && (
                  <Button size="small" onClick={clearFilters} sx={{ ml: 0.5 }}>
                    Clear
                  </Button>
                )}
              </Stack>
            </Grid>
            <Grid item xs={12}>
              <Stack
                direction="row"
                spacing={0.5}
                alignItems="center"
                sx={{ flexWrap: "wrap", gap: 0.5 }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 600, mr: 0.5 }}
                >
                  Class
                </Typography>
                {catalog.map((entry) => (
                  <ClassChip
                    key={entry.key}
                    classKey={entry.key}
                    selected={params.classes.includes(entry.key)}
                    onClick={() => setListParam("class", toggleValue(params.classes, entry.key))}
                  />
                ))}
              </Stack>
            </Grid>
          </Grid>
        </Paper>
      }
    >
      {rows.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center", flex: 1 }}>
          <Typography color="text.secondary" gutterBottom>
            No skills match your filters.
          </Typography>
          {hasActiveFilters && (
            <Button size="small" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </Paper>
      ) : (
        <StickyTableShell>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 260 }}>
                  <TableSortLabel
                    active={params.sort === "name"}
                    direction="asc"
                    onClick={() => toggleSort("name")}
                  >
                    Skill
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ width: 110 }}>
                  <TableSortLabel
                    active={params.sort === "type"}
                    direction="asc"
                    onClick={() => toggleSort("type")}
                  >
                    Kind
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ minWidth: 120 }}>
                  <TableSortLabel
                    active={params.sort === "class"}
                    direction="asc"
                    onClick={() => toggleSort("class")}
                  >
                    Class
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={{ width: 72 }}>
                  <TableSortLabel
                    active={params.sort === "mp"}
                    direction="asc"
                    onClick={() => toggleSort("mp")}
                  >
                    MP
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={{ width: 96 }}>
                  <TableSortLabel
                    active={params.sort === "cooldown"}
                    direction="asc"
                    onClick={() => toggleSort("cooldown")}
                  >
                    Cooldown
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={{ width: 80 }}>
                  Range
                </TableCell>
                <TableCell sx={{ minWidth: 140 }}>Flags</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <SkillBrowseRow
                  key={row.key}
                  row={row}
                  to={
                    browseQuery
                      ? `/skills/${row.key}?from=${encodeURIComponent(browseQuery)}`
                      : `/skills/${row.key}`
                  }
                />
              ))}
            </TableBody>
          </Table>
        </StickyTableShell>
      )}
    </StickyListLayout>
  );
}
