import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  Grid,
  Link,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Link as RouterLink, useParams } from "react-router-dom";
import { ClassKey } from "typed-adventureland";

import { CLASS_COLOR } from "../constants";
import { isClassKey, titleCaseKey } from "../gameData/classSkills";
import { ItemInstanceLabel } from "../Shared/ItemInstanceLabel";
import { CharacterLook } from "../Shared/CharacterLook";
import { StickyListLayout } from "../Shared/StickyListLayout";
import { CharacterBrowseCard } from "./CharacterBrowseCard";
import { classKeyToName } from "./characterClasses";
import { CharacterNameLink } from "./CharacterNameLink";
import {
  CharacterLoadout,
  getAllCachedLoadouts,
  getCachedCharacterLoadout,
} from "./fetchCharacterLoadout";
import { GearFrequencyRow, gearFrequencyFromLoadouts } from "./gearFrequency";
import { charactersForClass } from "./parseCharacters";
import { useCharactersList } from "./useCharactersList";

const TOP_GEAR_SAMPLE = 10;

function AlsoUsedBy({ keys }: { keys: ClassKey[] }) {
  if (keys.length === 0) return <>-</>;
  return (
    <>
      {keys.map((key, i) => (
        <span key={key}>
          {i > 0 ? ", " : null}
          <Link component={RouterLink} to={`/characters/class/${key}`} underline="hover">
            {titleCaseKey(key)}
          </Link>
        </span>
      ))}
    </>
  );
}

function GearFrequencyCard({ row, sampleSize }: { row: GearFrequencyRow; sampleSize: number }) {
  return (
    <Box
      sx={{
        px: 1.25,
        py: 1.1,
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <ItemInstanceLabel itemInfo={row.sample} size={32} />
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
        {row.count}/{sampleSize} players
        {row.maxLevel > 0 ? ` · max +${row.maxLevel}` : ""}
        {row.alsoUsedBy.length > 0 ? (
          <>
            {" · also "}
            <AlsoUsedBy keys={row.alsoUsedBy} />
          </>
        ) : null}
      </Typography>
    </Box>
  );
}

export function CharacterClassPage() {
  const theme = useTheme();
  const narrow = useMediaQuery(theme.breakpoints.down("md"), { noSsr: true });
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
    <StickyListLayout
      toolbar={
        <Box>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            <Link component={RouterLink} to="/characters" underline="hover">
              Characters
            </Link>
            {" / "}
            {className}
          </Typography>
          <Typography
            variant={narrow ? "h5" : "h4"}
            component="h1"
            sx={{
              color: CLASS_COLOR[classKey],
              borderBottom: 3,
              borderColor: CLASS_COLOR[classKey],
            }}
          >
            {className}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1, display: { xs: "none", sm: "block" } }}
          >
            Rankings and gear from adventure.land/characters.{" "}
            <Link component={RouterLink} to={`/classes/${classKey}`} underline="hover">
              {titleCaseKey(classKey)} class data
            </Link>
            .
          </Typography>
        </Box>
      }
      filters={
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <FormControlLabel
            control={
              <Switch checked={onlineOnly} onChange={(e) => setOnlineOnly(e.target.checked)} />
            }
            label="Online only"
          />
          <Typography variant="caption" color="text.secondary">
            {ranked.length} ranked
            {allCached.length > 0 ? ` · ${allCached.length} loadouts` : ""}
          </Typography>
        </Box>
      }
    >
      {loading && characters.length === 0 && (
        <Box sx={{ display: "flex", justifyContent: "center", padding: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert
          severity="error"
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

      <Grid container spacing={2} sx={{ flex: 1, minHeight: 0, alignContent: "flex-start" }}>
        <Grid
          item
          xs={12}
          md={5}
          sx={{
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            maxHeight: { xs: "none", md: "100%" },
          }}
        >
          <Typography variant="subtitle1" component="h2" gutterBottom sx={{ flexShrink: 0 }}>
            Rankings ({ranked.length})
          </Typography>
          {narrow ? (
            <Paper
              sx={{
                flex: 1,
                minHeight: 0,
                maxHeight: { xs: 360, sm: 420 },
                overflow: "auto",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {ranked.map((character, index) => (
                <CharacterBrowseCard
                  key={character.name}
                  character={character}
                  rank={index + 1}
                  showClass={false}
                />
              ))}
            </Paper>
          ) : (
            <Paper sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
              <Table size="small" stickyHeader>
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
            </Paper>
          )}
        </Grid>

        <Grid item xs={12} md={7} sx={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
          <Typography variant="subtitle1" component="h2" gutterBottom sx={{ flexShrink: 0 }}>
            Common gear (top {Math.min(TOP_GEAR_SAMPLE, ranked.length)})
          </Typography>
          {!loadoutsReady && <CircularProgress size={28} />}
          {loadoutsReady && loadouts.length === 0 && (
            <Alert severity="warning">
              No gear found in the characters list parse for this class.
            </Alert>
          )}
          {frequency.length > 0 &&
            (narrow ? (
              <Paper
                sx={{
                  flex: 1,
                  minHeight: 0,
                  overflow: "auto",
                  WebkitOverflowScrolling: "touch",
                }}
              >
                {frequency.map((row) => (
                  <GearFrequencyCard key={row.itemKey} row={row} sampleSize={loadouts.length} />
                ))}
              </Paper>
            ) : (
              <Paper sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
                <Table size="small" stickyHeader>
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
                          <ItemInstanceLabel itemInfo={row.sample} size={32} />
                        </TableCell>
                        <TableCell align="right">
                          {row.count}/{loadouts.length}
                        </TableCell>
                        <TableCell align="right">
                          {row.maxLevel > 0 ? `+${row.maxLevel}` : "-"}
                        </TableCell>
                        <TableCell>
                          <AlsoUsedBy keys={row.alsoUsedBy} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            ))}
        </Grid>
      </Grid>
    </StickyListLayout>
  );
}
