import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  Grid,
  Link,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { Link as RouterLink, useParams } from "react-router-dom";

import { CLASS_COLOR } from "../constants";
import { isClassKey, titleCaseKey } from "../gameData/classSkills";
import { ItemInstance } from "../Shared/ItemInstance";
import { classKeyToName } from "./characterClasses";
import { CharacterNameLink } from "./CharacterNameLink";
import { CharacterLook } from "../Shared/CharacterLook";
import {
  CharacterLoadout,
  getCachedCharacterLoadout,
  prefetchCharacterLoadouts,
} from "./fetchCharacterLoadout";
import { gearFrequencyFromLoadouts } from "./gearFrequency";
import { charactersForClass } from "./parseCharacters";
import { useCharactersList } from "./useCharactersList";

const TOP_GEAR_SAMPLE = 10;

export function CharacterClassPage() {
  const { classKey: classKeyParam } = useParams();
  const classKey = classKeyParam && isClassKey(classKeyParam) ? classKeyParam : undefined;
  const className = classKey ? classKeyToName(classKey) : undefined;

  const { characters, loading, error, reload } = useCharactersList();
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [loadouts, setLoadouts] = useState<CharacterLoadout[]>([]);
  const [gearLoading, setGearLoading] = useState(false);
  const [gearError, setGearError] = useState<string | null>(null);

  const ranked = useMemo(() => {
    if (!className) return [];
    const list = charactersForClass(characters, className);
    return onlineOnly ? list.filter((c) => c.online) : list;
  }, [characters, className, onlineOnly]);

  const sampleNames = useMemo(
    () =>
      ranked
        .slice(0, TOP_GEAR_SAMPLE)
        .map((c) => c.name)
        .join("|"),
    [ranked],
  );

  useEffect(() => {
    if (!className || !sampleNames) {
      setLoadouts([]);
      return undefined;
    }

    let cancelled = false;
    const names = sampleNames.split("|");

    const run = async () => {
      setGearLoading(true);
      setGearError(null);
      const primed = names
        .map((n) => getCachedCharacterLoadout(n))
        .filter((v): v is CharacterLoadout => Boolean(v));
      if (primed.length) setLoadouts(primed);

      const results = await prefetchCharacterLoadouts(names, 3, (partial) => {
        if (!cancelled) setLoadouts(partial);
      });
      if (cancelled) return;
      setLoadouts(results);
      setGearLoading(false);
      if (results.length === 0) {
        setGearError("Could not load gear samples for this class.");
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [className, sampleNames]);

  const frequency = useMemo(() => gearFrequencyFromLoadouts(loadouts).slice(0, 24), [loadouts]);

  if (!classKey || !className) {
    return (
      <Box sx={{ padding: 2 }}>
        <Alert severity="warning">Unknown class.</Alert>
        <Button component={RouterLink} to="/characters" sx={{ mt: 2 }}>
          Back to Characters
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ padding: 2 }}>
      <Typography variant="body2" sx={{ mb: 1 }}>
        <Link component={RouterLink} to="/characters" underline="hover">
          Characters
        </Link>
        {" / "}
        {className}
      </Typography>

      <Typography
        variant="h4"
        component="h1"
        gutterBottom
        sx={{ color: CLASS_COLOR[classKey], borderBottom: 3, borderColor: CLASS_COLOR[classKey] }}
      >
        {className}
      </Typography>

      <Typography sx={{ mb: 2 }} color="text.secondary">
        Level rankings from adventure.land, plus items commonly equipped by the top{" "}
        {TOP_GEAR_SAMPLE} {className.toLowerCase()}s. Game data for this class:{" "}
        <Link component={RouterLink} to={`/classes/${classKey}`} underline="hover">
          {titleCaseKey(classKey)} class page
        </Link>
        .
      </Typography>

      {loading && characters.length === 0 && (
        <Box sx={{ display: "flex", justifyContent: "center", padding: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={reload}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      <FormControlLabel
        control={<Switch checked={onlineOnly} onChange={(e) => setOnlineOnly(e.target.checked)} />}
        label="Online only"
        sx={{ mb: 2 }}
      />

      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Typography variant="h6" component="h2" gutterBottom>
            Rankings ({ranked.length})
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell width={56} />
                <TableCell>Name</TableCell>
                <TableCell align="right">Level</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ranked.map((character, index) => {
                const look = getCachedCharacterLoadout(character.name)?.look;
                return (
                  <TableRow key={character.name} hover>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell sx={{ py: 0.5 }}>
                      {look ? (
                        <CharacterLook look={look} alt={character.name} size="default" />
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <CharacterNameLink character={character} showMeta={false} />
                    </TableCell>
                    <TableCell align="right">{character.level}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Grid>

        <Grid item xs={12} md={7}>
          <Typography variant="h6" component="h2" gutterBottom>
            Common gear among top {Math.min(TOP_GEAR_SAMPLE, ranked.length)}
          </Typography>
          {gearLoading && loadouts.length === 0 && <CircularProgress size={28} />}
          {gearError && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {gearError}
            </Alert>
          )}
          {frequency.length > 0 && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Item</TableCell>
                  <TableCell align="right">Players</TableCell>
                  <TableCell align="right">Max +</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {frequency.map((row) => (
                  <TableRow key={row.itemKey} hover>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <ItemInstance itemInfo={row.sample} size={32} linkToDetail />
                        <Link component={RouterLink} to={`/items/${row.itemKey}`} underline="hover">
                          {row.itemKey}
                        </Link>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      {row.count}/{loadouts.length}
                    </TableCell>
                    <TableCell align="right">
                      {row.maxLevel > 0 ? `+${row.maxLevel}` : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {gearLoading && loadouts.length > 0 && (
            <Typography variant="caption" color="text.secondary">
              Loading more samples… ({loadouts.length}/{Math.min(TOP_GEAR_SAMPLE, ranked.length)})
            </Typography>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
