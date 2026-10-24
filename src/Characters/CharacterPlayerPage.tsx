import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Link,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { Link as RouterLink, useParams } from "react-router-dom";

import { CLASS_COLOR } from "../constants";
import { titleCaseKey } from "../gameData/classSkills";
import { CharacterLook } from "../Shared/CharacterLook";
import { CharacterLoadout, putCachedCharacterLoadout } from "./fetchCharacterLoadout";
import { fetchPlayerCharacters } from "./fetchPlayerCharacters";

export function CharacterPlayerPage() {
  const { name: nameParam } = useParams();
  const playerName = nameParam ? decodeURIComponent(nameParam) : "";
  const [chars, setChars] = useState<CharacterLoadout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!playerName) return undefined;
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await fetchPlayerCharacters(playerName);
        if (cancelled) return;
        for (const entry of list) putCachedCharacterLoadout(entry);
        setChars(list);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load player.");
        setChars([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [playerName]);

  return (
    <Box sx={{ padding: 2 }}>
      <Typography variant="body2" sx={{ mb: 1 }}>
        <Link component={RouterLink} to="/characters" underline="hover">
          Characters
        </Link>
        {" / Player / "}
        {playerName}
      </Typography>
      <Typography variant="h4" component="h1" gutterBottom>
        {playerName}
      </Typography>
      <Typography sx={{ mb: 2 }} color="text.secondary">
        Fallback for accounts or characters not on the public top-characters list. Prefer searching{" "}
        <Link component={RouterLink} to="/characters" underline="hover">
          Characters
        </Link>{" "}
        first.{" "}
        <Link
          href={`https://adventure.land/player/${encodeURIComponent(playerName)}`}
          target="_blank"
          rel="noopener noreferrer"
          underline="hover"
        >
          adventure.land
        </Link>
      </Typography>

      {loading && chars.length === 0 && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      )}
      {error && <Alert severity="error">{error}</Alert>}

      {chars.length > 0 && (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width={56} />
              <TableCell>Name</TableCell>
              <TableCell>Class</TableCell>
              <TableCell align="right">Level</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {chars.map((character) => (
              <TableRow key={character.name} hover>
                <TableCell sx={{ py: 0.5 }}>
                  {character.look ? (
                    <CharacterLook look={character.look} alt={character.name} size="default" />
                  ) : null}
                </TableCell>
                <TableCell>
                  <Link
                    component={RouterLink}
                    to={`/characters/${encodeURIComponent(character.name)}`}
                    underline="hover"
                    sx={{
                      color: character.classKey ? CLASS_COLOR[character.classKey] : "inherit",
                      fontWeight: 500,
                    }}
                  >
                    {character.name}
                  </Link>
                </TableCell>
                <TableCell>
                  {character.classKey ? (
                    <Link
                      component={RouterLink}
                      to={`/characters/class/${character.classKey}`}
                      underline="hover"
                    >
                      {titleCaseKey(character.classKey)}
                    </Link>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell align="right">{character.level}</TableCell>
                <TableCell>
                  <Button
                    size="small"
                    component={RouterLink}
                    to={`/characters/${encodeURIComponent(character.name)}`}
                  >
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}
