import { useContext, useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, CircularProgress, Grid, Link, Typography } from "@mui/material";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { SlotType } from "typed-adventureland";

import { CLASS_COLOR } from "../constants";
import { classLooks } from "../gameData/characterLook";
import { titleCaseKey } from "../gameData/classSkills";
import { GDataContext } from "../GDataContext";
import { encodeGearShareState, savedLoadoutToShareState } from "../GearPlanner/gearShareState";
import { GearPaperDoll } from "../GearPlanner/GearPaperDoll";
import { StatsPanel } from "../GearPlanner/StatsPanel";
import { SelectedCharacterClass } from "../GearPlanner/types";
import { CharacterLook } from "../Shared/CharacterLook";
import { ItemInstanceLabel } from "../Shared/ItemInstanceLabel";
import {
  CharacterLoadout,
  fetchCharacterLoadout,
  getCachedCharacterLoadout,
} from "./fetchCharacterLoadout";
import { stashLoadoutForGearPlanner } from "./pendingGearPlannerLoadout";
import { useCharactersList } from "./useCharactersList";

const SLOT_ORDER: SlotType[] = [
  "helmet",
  "chest",
  "pants",
  "shoes",
  "gloves",
  "belt",
  "amulet",
  "earring1",
  "earring2",
  "ring1",
  "ring2",
  "orb",
  "cape",
  "mainhand",
  "offhand",
  "elixir",
];

export function CharacterDetail() {
  const G = useContext(GDataContext);
  const navigate = useNavigate();
  const { name: nameParam } = useParams();
  const name = nameParam ? decodeURIComponent(nameParam) : "";
  const { characters, loadoutsReady, loading: listLoading } = useCharactersList();
  const listed = useMemo(
    () => characters.find((c) => c.name.toLowerCase() === name.toLowerCase()),
    [characters, name],
  );

  const [loadout, setLoadout] = useState<CharacterLoadout | null>(() =>
    name ? getCachedCharacterLoadout(name) ?? null : null,
  );
  const [loading, setLoading] = useState(!getCachedCharacterLoadout(name));
  const [error, setError] = useState<string | null>(null);
  const [fromListCache, setFromListCache] = useState(Boolean(getCachedCharacterLoadout(name)));

  useEffect(() => {
    if (!name) return undefined;
    let cancelled = false;

    const run = async () => {
      const cached = getCachedCharacterLoadout(name);
      if (cached) {
        setLoadout(cached);
        setFromListCache(true);
        setLoading(false);
        setError(null);
        return;
      }

      // Wait for the bulk /characters parse before falling back to /character/:name.
      if (listLoading || !loadoutsReady) {
        setLoading(true);
        return;
      }

      setLoading(true);
      setError(null);
      setFromListCache(false);
      try {
        // Not on the public top list — individual character page fallback.
        const data = await fetchCharacterLoadout(name, { force: true });
        if (cancelled) return;
        setLoadout(data);
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setError(
          err instanceof Error
            ? err.message
            : "Character not on the public list and individual page failed to load.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [name, loadoutsReady, listLoading]);

  const equipped = useMemo(() => {
    if (!loadout) return [];
    return SLOT_ORDER.flatMap((slot) => {
      const item = loadout.gear[slot];
      return item ? [{ slot, item }] : [];
    });
  }, [loadout]);

  const classKey = loadout?.classKey ?? listed?.classKey;
  const level = loadout?.level ?? listed?.level;
  const online = listed?.online;

  const selectedClass = useMemo(() => {
    if (!G || !classKey) return undefined;
    const gClass = G.classes?.[classKey];
    if (!gClass) return undefined;
    return { className: classKey, ...gClass } as SelectedCharacterClass;
  }, [G, classKey]);

  const look = useMemo(() => {
    if (loadout?.look) return loadout.look;
    if (!G || !classKey) return undefined;
    const gClass = G.classes?.[classKey];
    if (!gClass) return undefined;
    return classLooks(gClass)[0];
  }, [G, classKey, loadout?.look]);

  const openInGearPlanner = () => {
    if (!loadout) return;
    const data = {
      gear: loadout.gear,
      classKey: loadout.classKey,
      level: loadout.level,
    };
    stashLoadoutForGearPlanner(loadout.name, data);
    const encoded = encodeGearShareState(savedLoadoutToShareState(data));
    navigate(`/gear?gear=${encoded}`);
  };

  return (
    <Box sx={{ p: { xs: 1.25, sm: 2 }, pb: { xs: 3, sm: 2 } }}>
      <Typography variant="body2" sx={{ mb: 1 }}>
        <Link component={RouterLink} to="/characters" underline="hover">
          Characters
        </Link>
        {classKey && (
          <>
            {" / "}
            <Link component={RouterLink} to={`/characters/class/${classKey}`} underline="hover">
              {titleCaseKey(classKey)}
            </Link>
          </>
        )}
        {" / "}
        {name}
      </Typography>

      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: { xs: 1.25, sm: 2 },
          mb: 1,
          minWidth: 0,
        }}
      >
        {look && <CharacterLook look={look} alt={loadout?.name ?? name} size="class" />}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            sx={{
              fontSize: { xs: "1.5rem", sm: "2.125rem" },
              color: online ? "success.main" : classKey ? CLASS_COLOR[classKey] : "inherit",
              wordBreak: "break-word",
            }}
          >
            {loadout?.name ?? name}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.45 }}>
            {classKey ? titleCaseKey(classKey) : listed?.className ?? "Unknown class"}
            {level != null ? ` · Level ${level}` : ""}
            {online ? " · online" : listed ? " · offline" : ""}
            <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
              {fromListCache ? " · from characters list" : " · individual page"}
            </Box>
            {" · "}
            <Link
              href={`https://adventure.land/character/${encodeURIComponent(name)}`}
              target="_blank"
              rel="noopener noreferrer"
              underline="hover"
            >
              adventure.land
            </Link>
            {classKey && (
              <>
                {" · "}
                <Link component={RouterLink} to={`/classes/${classKey}`} underline="hover">
                  class data
                </Link>
              </>
            )}
          </Typography>
        </Box>
      </Box>

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", padding: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loadout && (
        <>
          <Box
            sx={{
              display: "flex",
              gap: 1,
              mb: 2,
              flexWrap: "wrap",
              "& .MuiButton-root": { minHeight: 36, flex: { xs: "1 1 auto", sm: "0 0 auto" } },
            }}
          >
            <Button variant="contained" size="small" onClick={openInGearPlanner}>
              Load in Gear Planner
            </Button>
            <Button
              component={RouterLink}
              to={`/characters/compare?a=${encodeURIComponent(loadout.name)}`}
              variant="outlined"
              size="small"
            >
              Compare
            </Button>
          </Box>

          <Grid container spacing={{ xs: 2, md: 3 }}>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" component="h2" gutterBottom>
                Equipment
              </Typography>
              <Box sx={{ overflowX: "auto", WebkitOverflowScrolling: "touch", pb: 0.5 }}>
                <GearPaperDoll
                  gear={loadout.gear}
                  onSlotClick={() => undefined}
                  dhConflict={false}
                />
              </Box>
              <Typography variant="subtitle2" sx={{ mt: 2 }} gutterBottom>
                Items
              </Typography>
              {equipped.length === 0 ? (
                <Typography color="text.secondary">No items equipped.</Typography>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {equipped.map(({ slot, item }) => (
                    <ItemInstanceLabel
                      key={slot}
                      itemInfo={item}
                      size={36}
                      caption={slot}
                      includeLevel
                    />
                  ))}
                </Box>
              )}
            </Grid>
            <Grid item xs={12} md={8}>
              <Typography variant="h6" component="h2" gutterBottom>
                Stats
              </Typography>
              <StatsPanel
                selectedCharacterClass={selectedClass}
                level={loadout.level}
                gear={loadout.gear}
              />
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
}
