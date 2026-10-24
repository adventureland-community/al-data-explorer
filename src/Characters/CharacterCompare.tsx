import { useContext, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  Link,
  TextField,
  Typography,
} from "@mui/material";
import { Link as RouterLink, useNavigate, useSearchParams } from "react-router-dom";

import { CLASS_COLOR } from "../constants";
import { classLooks } from "../gameData/characterLook";
import { titleCaseKey } from "../gameData/classSkills";
import { GDataContext } from "../GDataContext";
import { GearPaperDoll } from "../GearPlanner/GearPaperDoll";
import { SelectedCharacterClass } from "../GearPlanner/types";
import { StatsPanel } from "../GearPlanner/StatsPanel";
import { CharacterLook } from "../Shared/CharacterLook";
import { CharacterLoadout, fetchCharacterLoadout } from "./fetchCharacterLoadout";

function CompareColumn({
  loadout,
  loading,
  error,
}: {
  loadout: CharacterLoadout | null;
  loading: boolean;
  error: string | null;
}) {
  const G = useContext(GDataContext);
  const selectedClass = useMemo(() => {
    if (!G || !loadout?.classKey) return undefined;
    const gClass = G.classes?.[loadout.classKey];
    if (!gClass) return undefined;
    return { className: loadout.classKey, ...gClass } as SelectedCharacterClass;
  }, [G, loadout]);

  const look = useMemo(() => {
    if (loadout?.look) return loadout.look;
    if (!G || !loadout?.classKey) return undefined;
    const gClass = G.classes?.[loadout.classKey];
    return gClass ? classLooks(gClass)[0] : undefined;
  }, [G, loadout]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!loadout) return <Typography color="text.secondary">Pick a character.</Typography>;

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
        {look && <CharacterLook look={look} alt={loadout.name} size="class" />}
        <Box>
          <Typography
            variant="h5"
            component="h2"
            sx={{ color: loadout.classKey ? CLASS_COLOR[loadout.classKey] : "inherit" }}
          >
            <Link
              component={RouterLink}
              to={`/characters/${encodeURIComponent(loadout.name)}`}
              underline="hover"
              color="inherit"
            >
              {loadout.name}
            </Link>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {loadout.classKey ? titleCaseKey(loadout.classKey) : "Unknown"} · Level {loadout.level}
          </Typography>
        </Box>
      </Box>
      <GearPaperDoll gear={loadout.gear} onSlotClick={() => undefined} dhConflict={false} />
      <Box sx={{ mt: 2 }}>
        <StatsPanel
          selectedCharacterClass={selectedClass}
          level={loadout.level}
          gear={loadout.gear}
        />
      </Box>
    </Box>
  );
}

function useLoadout(name: string) {
  const [loadout, setLoadout] = useState<CharacterLoadout | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!name) {
      setLoadout(null);
      setError(null);
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchCharacterLoadout(name)
      .then((data) => {
        if (!cancelled) setLoadout(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadout(null);
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [name]);

  return { loadout, loading, error };
}

export function CharacterCompare() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const a = searchParams.get("a") ?? "";
  const b = searchParams.get("b") ?? "";
  const [draftA, setDraftA] = useState(a);
  const [draftB, setDraftB] = useState(b);

  useEffect(() => {
    setDraftA(a);
    setDraftB(b);
  }, [a, b]);

  const left = useLoadout(a);
  const right = useLoadout(b);

  const apply = () => {
    const next = new URLSearchParams();
    if (draftA.trim()) next.set("a", draftA.trim());
    if (draftB.trim()) next.set("b", draftB.trim());
    setSearchParams(next, { replace: true });
  };

  return (
    <Box sx={{ padding: 2 }}>
      <Typography variant="body2" sx={{ mb: 1 }}>
        <Link component={RouterLink} to="/characters" underline="hover">
          Characters
        </Link>
        {" / Compare"}
      </Typography>
      <Typography variant="h4" component="h1" gutterBottom>
        Compare characters
      </Typography>
      <Typography sx={{ mb: 2 }} color="text.secondary">
        Side-by-side gear and stats. Open from a character page or type two names.
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }} alignItems="center">
        <Grid item xs={12} sm={5}>
          <TextField
            fullWidth
            size="small"
            label="Character A"
            value={draftA}
            onChange={(e) => setDraftA(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={5}>
          <TextField
            fullWidth
            size="small"
            label="Character B"
            value={draftB}
            onChange={(e) => setDraftB(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={2}>
          <Button fullWidth variant="contained" onClick={apply}>
            Compare
          </Button>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <CompareColumn {...left} />
        </Grid>
        <Grid item xs={12} md={6}>
          <CompareColumn {...right} />
        </Grid>
      </Grid>

      {(a || b) && (
        <Button sx={{ mt: 2 }} onClick={() => navigate("/characters")}>
          Back to Characters
        </Button>
      )}
    </Box>
  );
}
