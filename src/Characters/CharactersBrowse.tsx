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
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { Link as RouterLink, useSearchParams } from "react-router-dom";

import { CLASS_COLOR } from "../constants";
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
  const { characters, loading, error, reload } = useCharactersList();
  const [searchParams, setSearchParams] = useSearchParams();

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

  const showOverview = !search && selectedClasses.length === 0 && !onlineOnly;

  return (
    <Box sx={{ padding: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Characters
      </Typography>
      <Typography sx={{ marginBottom: 2 }} color="text.secondary">
        Live characters from adventure.land. Search, filter by class, open a class leaderboard, or
        click a name for equipped gear.
      </Typography>

      {loading && characters.length === 0 && (
        <Box sx={{ display: "flex", justifyContent: "center", padding: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert
          severity="error"
          sx={{ marginBottom: 2 }}
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
          <Grid container spacing={2} sx={{ marginBottom: 2 }} alignItems="center">
            <Grid item xs={12} md={5}>
              <DebouncedSearchField value={search} onCommit={(q) => setParam("q", q || null)} />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={onlineOnly}
                    onChange={(e) => setParam("online", e.target.checked ? "1" : null)}
                  />
                }
                label="Online only"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="body2" color="text.secondary" textAlign={{ md: "right" }}>
                {filtered.length} of {characters.length} characters
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {classNames.map((className) => {
                  const key = classNameToKey(className);
                  const selected = selectedClasses.includes(className);
                  return (
                    <Chip
                      key={className}
                      label={className}
                      onClick={() => toggleClass(className)}
                      variant={selected ? "filled" : "outlined"}
                      sx={
                        key
                          ? {
                              borderColor: CLASS_COLOR[key],
                              ...(selected
                                ? { bgcolor: CLASS_COLOR[key], color: "#fff" }
                                : { color: CLASS_COLOR[key] }),
                            }
                          : undefined
                      }
                    />
                  );
                })}
              </Box>
            </Grid>
          </Grid>

          {showOverview && (
            <Box sx={{ marginBottom: 3 }}>
              <Typography variant="h6" component="h2" gutterBottom>
                Top by class
              </Typography>
              <Grid container spacing={2}>
                {topByClass.map((column) => {
                  const key = classNameToKey(column.className);
                  return (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={column.className}>
                      <Box
                        sx={{
                          borderLeft: 3,
                          borderColor: key ? CLASS_COLOR[key] : "divider",
                          pl: 1.5,
                        }}
                      >
                        <Typography variant="subtitle1" component="h3" gutterBottom>
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
                            <ListItem key={character.name} disableGutters sx={{ py: 0.25 }}>
                              <ListItemText
                                primary={
                                  <CharacterNameLink character={character} rank={index + 1} />
                                }
                              />
                            </ListItem>
                          ))}
                        </List>
                        {key && (
                          <Button
                            size="small"
                            component={RouterLink}
                            to={`/characters/class/${key}`}
                            sx={{ mt: 0.5 }}
                          >
                            Full {column.className} list
                          </Button>
                        )}
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          )}

          <Typography variant="h6" component="h2" gutterBottom>
            {showOverview ? "All characters" : "Results"}
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Class</TableCell>
                <TableCell align="right">Level</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.slice(0, 200).map((character) => (
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
                  <TableCell sx={{ color: character.online ? "success.main" : "text.secondary" }}>
                    {character.online ? "Online" : "Offline"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filtered.length > 200 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Showing first 200 of {filtered.length}. Narrow search or class filters.
            </Typography>
          )}
        </>
      )}
    </Box>
  );
}
