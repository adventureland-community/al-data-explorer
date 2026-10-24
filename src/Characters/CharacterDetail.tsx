import { useContext, useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, CircularProgress, Grid, Link, Typography } from "@mui/material";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { SlotType } from "typed-adventureland";

import { CLASS_COLOR } from "../constants";
import { classLooks } from "../gameData/characterLook";
import { titleCaseKey } from "../gameData/classSkills";
import { GDataContext } from "../GDataContext";
import { GearPaperDoll } from "../GearPlanner/GearPaperDoll";
import { CharacterLook } from "../Shared/CharacterLook";
import { ItemInstance } from "../Shared/ItemInstance";
import { CharacterLoadout, fetchCharacterLoadout } from "./fetchCharacterLoadout";
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
  const { characters } = useCharactersList();
  const listed = useMemo(
    () => characters.find((c) => c.name.toLowerCase() === name.toLowerCase()),
    [characters, name],
  );

  const [loadout, setLoadout] = useState<CharacterLoadout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!name) return undefined;
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      setLoadout(null);
      try {
        const data = await fetchCharacterLoadout(name);
        if (cancelled) return;
        setLoadout(data);
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setError(err instanceof Error ? err.message : "Failed to load character.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [name]);

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

  const look = useMemo(() => {
    if (loadout?.look) return loadout.look;
    if (!G || !classKey) return undefined;
    const gClass = G.classes?.[classKey];
    if (!gClass) return undefined;
    return classLooks(gClass)[0];
  }, [G, classKey, loadout?.look]);

  const openInGearPlanner = () => {
    if (!loadout) return;
    stashLoadoutForGearPlanner(loadout.name, {
      gear: loadout.gear,
      classKey: loadout.classKey,
      level: loadout.level,
    });
    navigate("/gear");
  };

  return (
    <Box sx={{ padding: 2 }}>
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

      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
        {look && <CharacterLook look={look} alt={loadout?.name ?? name} size="class" />}
        <Box>
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            sx={{ color: online ? "success.main" : classKey ? CLASS_COLOR[classKey] : "inherit" }}
          >
            {loadout?.name ?? name}
          </Typography>
          <Typography color="text.secondary">
            {classKey ? titleCaseKey(classKey) : listed?.className ?? "Unknown class"}
            {level != null ? ` · Level ${level}` : ""}
            {online ? " · online" : listed ? " · offline" : ""}
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
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12} md={5}>
            <Typography variant="h6" component="h2" gutterBottom>
              Equipment
            </Typography>
            <GearPaperDoll gear={loadout.gear} onSlotClick={() => undefined} dhConflict={false} />
          </Grid>
          <Grid item xs={12} md={7}>
            <Typography variant="h6" component="h2" gutterBottom>
              Items
            </Typography>
            {equipped.length === 0 ? (
              <Typography color="text.secondary">No items equipped (or slots empty).</Typography>
            ) : (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
                {equipped.map(({ slot, item }) => (
                  <Box
                    key={slot}
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      width: 72,
                    }}
                  >
                    <ItemInstance itemInfo={item} size={40} linkToDetail />
                    <Typography variant="caption" color="text.secondary">
                      {slot}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
            <Box sx={{ display: "flex", gap: 1, mt: 2, flexWrap: "wrap" }}>
              <Button variant="contained" size="small" onClick={openInGearPlanner}>
                Load in Gear Planner
              </Button>
              <Button component={RouterLink} to="/gear" variant="outlined" size="small">
                Open Gear Planner
              </Button>
            </Box>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
