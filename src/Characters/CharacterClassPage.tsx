import { useMemo, useState } from "react";
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
import { CharacterLook } from "../Shared/CharacterLook";
import { classKeyToName } from "./characterClasses";
import { CharacterNameLink } from "./CharacterNameLink";
import {
  CharacterLoadout,
  getAllCachedLoadouts,
  getCachedCharacterLoadout,
} from "./fetchCharacterLoadout";
import { gearFrequencyFromLoadouts } from "./gearFrequency";
import { charactersForClass } from "./parseCharacters";
import { useCharactersList } from "./useCharactersList";

const TOP_GEAR_SAMPLE = 10;

export function CharacterClassPage() {
  const { classKey: classKeyParam } = useParams();
  const classKey = classKeyParam && isClassKey(classKeyParam) ? classKeyParam : undefined;
  const className = classKey ? classKeyToName(classKey) : undefined;

  const { characters, loading, error, reload, loadoutsReady } = useCharactersList();
  const [onlineOnly, setOnlineOnly] = useState(false);

  const ranked = useMemo(() => {
    if (!className) return [];
    const list = charactersForClass(characters, className);
    return onlineOnly ? list.filter((c) => c.online) : list;
  }, [characters, className, onlineOnly]);

  // Gear comes from the bulk `/characters` HTML parse (var slots…), not per-character fetches.
  const loadouts = useMemo(() => {
    if (!loadoutsReady) return [] as CharacterLoadout[];
    return ranked
      .slice(0, TOP_GEAR_SAMPLE)
      .map((c) => getCachedCharacterLoadout(c.name))
      .filter((v): v is CharacterLoadout => Boolean(v));
  }, [ranked, loadoutsReady]);

  const allCached = useMemo(() => (loadoutsReady ? getAllCachedLoadouts() : []), [loadoutsReady]);

  const frequency = useMemo(
    () => gearFrequencyFromLoadouts(loadouts, allCached).slice(0, 24),
    [loadouts, allCached],
  );

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
        Level rankings and equipped gear from the live adventure.land/characters page (one fetch for
        all 500). Common gear uses every cached loadout for cross-class &quot;also used by&quot;.
        Game data:{" "}
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
            {allCached.length > 0 ? ` · meta from ${allCached.length} loadouts` : ""}
          </Typography>
          {!loadoutsReady && <CircularProgress size={28} />}
          {loadoutsReady && loadouts.length === 0 && (
            <Alert severity="warning">
              No gear found in the characters list parse for this class.
            </Alert>
          )}
          {frequency.length > 0 && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Item</TableCell>
                  <TableCell align="right">Players</TableCell>
                  <TableCell align="right">Max +</TableCell>
                  <TableCell>Also used by</TableCell>
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
                    <TableCell>
                      {row.alsoUsedBy.length === 0
                        ? "-"
                        : row.alsoUsedBy.map((key, i) => (
                            <span key={key}>
                              {i > 0 ? ", " : null}
                              <Link
                                component={RouterLink}
                                to={`/characters/class/${key}`}
                                underline="hover"
                              >
                                {titleCaseKey(key)}
                              </Link>
                            </span>
                          ))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
