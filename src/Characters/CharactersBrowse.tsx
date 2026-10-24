import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControlLabel,
  Grid,
  Link,
  List,
  ListItem,
  ListItemText,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Link as RouterLink, useNavigate, useSearchParams } from "react-router-dom";

import { CLASS_COLOR } from "../constants";
import { StickyListLayout, StickyTableShell } from "../Shared/StickyListLayout";
import { CharacterBrowseCard } from "./CharacterBrowseCard";
import { classNameToKey, sortClassNames } from "./characterClasses";
import { CharacterNameLink } from "./CharacterNameLink";
import { filterCharacters, topCharactersByClass } from "./parseCharacters";
import { useCharactersList } from "./useCharactersList";

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
      placeholder="Character name"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      size="small"
    />
  );
}

export function CharactersBrowse() {
  const theme = useTheme();
  const narrow = useMediaQuery(theme.breakpoints.down("md"), { noSsr: true });
  const navigate = useNavigate();
  const { characters, loading, error, fromCache, reload } = useCharactersList();
  const [searchParams, setSearchParams] = useSearchParams();
  const [playerDraft, setPlayerDraft] = useState("");

  const search = searchParams.get("q") ?? "";
  const onlineOnly = searchParams.get("online") === "1";
  const selectedClasses = (searchParams.get("class") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const classNames = useMemo(
    () => sortClassNames([...new Set(characters.map((c) => c.className))]),
    [characters],
  );

  const topByClass = useMemo(() => topCharactersByClass(characters, 5), [characters]);

  const filtered = useMemo(
    () =>
      filterCharacters(characters, {
        search,
        classNames: selectedClasses,
        onlineOnly,
      }),
    [characters, search, selectedClasses, onlineOnly],
  );

  const setParam = (key: string, value: string | null) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (!value) next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true },
    );
  };

  const toggleClass = (className: string) => {
    const set = new Set(selectedClasses);
    if (set.has(className)) set.delete(className);
    else set.add(className);
    const ordered = sortClassNames([...set]);
    setParam("class", ordered.length ? ordered.join(",") : null);
  };

  const goLookup = () => {
    const q = playerDraft.trim();
    if (!q) return;
    const onList = characters.some((c) => c.name.toLowerCase() === q.toLowerCase());
    navigate(
      onList
        ? `/characters/${encodeURIComponent(q)}`
        : `/characters/player/${encodeURIComponent(q)}`,
    );
  };

  const showOverview = !search && selectedClasses.length === 0 && !onlineOnly;
  const listRows = filtered.slice(0, 200);

  return (
    <StickyListLayout
      toolbar={
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 1, justifyContent: "space-between" }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant={narrow ? "h6" : "h4"} component="h1">
              Characters
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ display: { xs: "none", sm: "block" } }}
            >
              Top list from adventure.land/characters (gear in that one page).{" "}
              <Link component={RouterLink} to="/characters/compare" underline="hover">
                Compare
              </Link>
              . Lookup missing only for someone off the public list.
            </Typography>
          </Box>
          <Button
            component={RouterLink}
            to="/characters/compare"
            variant="outlined"
            size="small"
            sx={{ flexShrink: 0, display: { xs: "inline-flex", sm: "none" } }}
          >
            Compare
          </Button>
        </Box>
      }
      filters={
        characters.length > 0 ? (
          <Paper sx={{ p: { xs: 1.25, sm: 2 } }}>
            <Grid container spacing={1.5} alignItems="center">
              <Grid item xs={12} sm={6} md={4}>
                <DebouncedSearchField value={search} onCommit={(q) => setParam("q", q || null)} />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label={narrow ? "Lookup" : "Lookup missing"}
                    placeholder="Player or character"
                    value={playerDraft}
                    onChange={(e) => setPlayerDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") goLookup();
                    }}
                  />
                  <Button variant="outlined" disabled={!playerDraft.trim()} onClick={goLookup}>
                    Go
                  </Button>
                </Box>
              </Grid>
              <Grid item xs={6} md={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={onlineOnly}
                      onChange={(e) => setParam("online", e.target.checked ? "1" : null)}
                    />
                  }
                  label="Online"
                />
              </Grid>
              <Grid item xs={6} md={2}>
                <Chip
                  size="small"
                  label={`${filtered.length}/${characters.length}`}
                  sx={{ fontVariantNumeric: "tabular-nums" }}
                />
              </Grid>
              <Grid item xs={12}>
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "nowrap",
                    gap: 0.75,
                    overflowX: "auto",
                    WebkitOverflowScrolling: "touch",
                    pb: 0.5,
                    mx: { xs: -0.5, sm: 0 },
                    px: { xs: 0.5, sm: 0 },
                  }}
                >
                  {classNames.map((className) => {
                    const key = classNameToKey(className);
                    const selected = selectedClasses.includes(className);
                    return (
                      <Chip
                        key={className}
                        label={className}
                        size="small"
                        onClick={() => toggleClass(className)}
                        variant={selected ? "filled" : "outlined"}
                        sx={{
                          flexShrink: 0,
                          ...(key
                            ? {
                                borderColor: CLASS_COLOR[key],
                                ...(selected
                                  ? { bgcolor: CLASS_COLOR[key], color: "#fff" }
                                  : { color: CLASS_COLOR[key] }),
                              }
                            : undefined),
                        }}
                      />
                    );
                  })}
                </Box>
              </Grid>
            </Grid>
          </Paper>
        ) : undefined
      }
    >
      {loading && characters.length === 0 && (
        <Box sx={{ display: "flex", justifyContent: "center", padding: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert
          severity={fromCache ? "warning" : "error"}
          sx={{ mb: 1 }}
          action={
            <Button color="inherit" size="small" onClick={reload}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {characters.length > 0 && (
        <>
          {showOverview && (
            <Box sx={{ mb: { xs: 1.5, md: 2 }, flexShrink: 0 }}>
              <Typography variant="subtitle1" component="h2" gutterBottom>
                Top by class
              </Typography>
              <Grid container spacing={1.5}>
                {topByClass.map((column) => {
                  const key = classNameToKey(column.className);
                  return (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={column.className}>
                      <Paper variant="outlined" sx={{ p: 1.25 }}>
                        <Typography
                          variant="subtitle2"
                          component="h3"
                          gutterBottom
                          sx={{
                            color: key ? CLASS_COLOR[key] : "inherit",
                            borderLeft: 3,
                            borderColor: key ? CLASS_COLOR[key] : "divider",
                            pl: 1,
                          }}
                        >
                          <Link
                            component={RouterLink}
                            to={
                              key
                                ? `/characters/class/${key}`
                                : `/characters?class=${encodeURIComponent(column.className)}`
                            }
                            underline="hover"
                            color="inherit"
                          >
                            {column.className}
                          </Link>
                        </Typography>
                        <List dense disablePadding>
                          {column.characters.map((character, index) => (
                            <ListItem key={character.name} disableGutters sx={{ py: 0.2 }}>
                              <ListItemText
                                primary={
                                  <CharacterNameLink character={character} rank={index + 1} />
                                }
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          )}

          <Typography
            variant="subtitle1"
            component="h2"
            sx={{ mb: 0.75, flexShrink: 0, display: showOverview && narrow ? "none" : "block" }}
          >
            {showOverview ? "All characters" : "Results"}
          </Typography>

          {narrow ? (
            <Paper
              sx={{
                flex: 1,
                minHeight: 0,
                overflow: "auto",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {listRows.map((character) => (
                <CharacterBrowseCard key={character.name} character={character} />
              ))}
              {filtered.length > 200 && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", p: 1.5 }}
                >
                  Showing first 200 of {filtered.length}. Narrow search or class filters.
                </Typography>
              )}
            </Paper>
          ) : (
            <StickyTableShell>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Class</TableCell>
                    <TableCell align="right">Level</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {listRows.map((character) => (
                    <TableRow key={character.name} hover>
                      <TableCell>
                        <CharacterNameLink character={character} showMeta={false} />
                      </TableCell>
                      <TableCell>
                        {character.classKey ? (
                          <Link
                            component={RouterLink}
                            to={`/characters/class/${character.classKey}`}
                            underline="hover"
                          >
                            {character.className}
                          </Link>
                        ) : (
                          character.className
                        )}
                      </TableCell>
                      <TableCell align="right">{character.level}</TableCell>
                      <TableCell
                        sx={{ color: character.online ? "success.main" : "text.secondary" }}
                      >
                        {character.online ? "Online" : "Offline"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filtered.length > 200 && (
                <Typography variant="body2" color="text.secondary" sx={{ p: 1.5 }}>
                  Showing first 200 of {filtered.length}. Narrow search or class filters.
                </Typography>
              )}
            </StickyTableShell>
          )}
        </>
      )}
    </StickyListLayout>
  );
}
