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
import { StatType } from "typed-adventureland";

import { CLASS_COLOR } from "../constants";
import { classLooks } from "../gameData/characterLook";
import { titleCaseKey } from "../gameData/classSkills";
import { computeLoadoutStats } from "../gameData/loadoutStats";
import { GDataContext } from "../GDataContext";
import { GearPaperDoll } from "../GearPlanner/GearPaperDoll";
import { SelectedCharacterClass } from "../GearPlanner/types";
import { StatsPanel } from "../GearPlanner/StatsPanel";
import { CharacterLook } from "../Shared/CharacterLook";
import {
  CharacterLoadout,
  fetchCharacterLoadout,
  getCachedCharacterLoadout,
} from "./fetchCharacterLoadout";
import { useCharactersList } from "./useCharactersList";

function CompareColumn({
  loadout,
  loading,
  error,
  compareStats,
  compareSide,
}: {
  loadout: CharacterLoadout | null;
  loading: boolean;
  error: string | null;
  compareStats?: { [T in StatType]?: number };
  compareSide?: "left" | "right";
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
      <Box sx={{ overflowX: "auto", WebkitOverflowScrolling: "touch", pb: 0.5 }}>
        <GearPaperDoll gear={loadout.gear} onSlotClick={() => undefined} dhConflict={false} />
      </Box>
      <Box sx={{ mt: 2 }}>
        <StatsPanel
          selectedCharacterClass={selectedClass}
          level={loadout.level}
          gear={loadout.gear}
          compareStats={compareStats}
          compareSide={compareSide}
        />
      </Box>
    </Box>
  );
}

function useLoadout(name: string, listReady: boolean) {
  const [loadout, setLoadout] = useState<CharacterLoadout | null>(() =>
    name ? getCachedCharacterLoadout(name) ?? null : null,
  );
  const [loading, setLoading] = useState(Boolean(name) && !getCachedCharacterLoadout(name));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!name) {
      setLoadout(null);
      setError(null);
      setLoading(false);
      return undefined;
    }

    const cached = getCachedCharacterLoadout(name);
    if (cached) {
      setLoadout(cached);
      setLoading(false);
      setError(null);
      return undefined;
    }

    if (!listReady) {
      setLoading(true);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchCharacterLoadout(name, { force: true })
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
  }, [name, listReady]);

  return { loadout, loading, error };
}

export function CharacterCompare() {
  const G = useContext(GDataContext);
  const navigate = useNavigate();
  const { loadoutsReady } = useCharactersList();
  const [searchParams, setSearchParams] = useSearchParams();
  const a = searchParams.get("a") ?? "";
  const b = searchParams.get("b") ?? "";
  const [draftA, setDraftA] = useState(a);
  const [draftB, setDraftB] = useState(b);

  useEffect(() => {
    setDraftA(a);
    setDraftB(b);
  }, [a, b]);

  const left = useLoadout(a, loadoutsReady);
  const right = useLoadout(b, loadoutsReady);

  const leftStats = useMemo(() => {
    if (!G || !left.loadout) return undefined;
    const gClass = left.loadout.classKey ? G.classes?.[left.loadout.classKey] : undefined;
    const selectedClass = gClass
      ? ({ className: left.loadout.classKey, ...gClass } as SelectedCharacterClass)
      : undefined;
    return computeLoadoutStats({
      characterClass: selectedClass,
      level: left.loadout.level,
      gear: left.loadout.gear,
      G,
    });
  }, [G, left.loadout]);

  const rightStats = useMemo(() => {
    if (!G || !right.loadout) return undefined;
    const gClass = right.loadout.classKey ? G.classes?.[right.loadout.classKey] : undefined;
    const selectedClass = gClass
      ? ({ className: right.loadout.classKey, ...gClass } as SelectedCharacterClass)
      : undefined;
    return computeLoadoutStats({
      characterClass: selectedClass,
      level: right.loadout.level,
      gear: right.loadout.gear,
      G,
    });
  }, [G, right.loadout]);

  const apply = () => {
    const next = new URLSearchParams();
    if (draftA.trim()) next.set("a", draftA.trim());
    if (draftB.trim()) next.set("b", draftB.trim());
    setSearchParams(next, { replace: true });
  };

  return (
    <Box sx={{ p: { xs: 1.25, sm: 2 }, pb: { xs: 3, sm: 2 } }}>
      <Typography variant="body2" sx={{ mb: 1 }}>
        <Link component={RouterLink} to="/characters" underline="hover">
          Characters
        </Link>
        {" / Compare"}
      </Typography>
      <Typography
        variant="h4"
        component="h1"
        gutterBottom
        sx={{ fontSize: { xs: "1.5rem", sm: "2.125rem" } }}
      >
        Compare characters
      </Typography>
      <Typography
        variant="body2"
        sx={{ mb: 2, display: { xs: "none", sm: "block" } }}
        color="text.secondary"
      >
        Side-by-side gear and stats (green = higher, red = lower). Names on the public characters
        list load instantly from that page&apos;s embedded gear.
      </Typography>

      <Grid container spacing={1.5} sx={{ mb: 2 }} alignItems="center">
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
          <Button fullWidth variant="contained" onClick={apply} sx={{ minHeight: 40 }}>
            Compare
          </Button>
        </Grid>
      </Grid>

      <Grid container spacing={{ xs: 2, md: 3 }}>
        <Grid item xs={12} md={6}>
          <CompareColumn
            {...left}
            compareStats={rightStats}
            compareSide={left.loadout && right.loadout ? "left" : undefined}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <CompareColumn
            {...right}
            compareStats={leftStats}
            compareSide={left.loadout && right.loadout ? "right" : undefined}
          />
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
