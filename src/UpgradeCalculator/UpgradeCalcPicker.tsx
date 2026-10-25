import { Box, Paper, Typography } from "@mui/material";
import { useContext, useMemo } from "react";
import { ItemKey } from "typed-adventureland";

import { GDataContext } from "../GDataContext";
import { useMerchants } from "../Market/useMerchants";
import { ItemInstance } from "../Shared/ItemInstance";
import { buildStarterPicks, sampleKeys, STARTER_SECTION_LIMIT } from "./starterPicks";
import { SidebarSection } from "./UpgradeCalcControls";
import { RECENT_LIMIT } from "./upgradeCalcHelpers";
import { CalcMode } from "./useUpgradeCalcParams";

export function ItemPickGrid({
  picks,
  onPick,
}: {
  picks: ItemKey[];
  onPick: (key: ItemKey) => void;
}) {
  const G = useContext(GDataContext);
  if (!picks.length) return null;
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
        gap: 1,
      }}
    >
      {picks.map((key) => (
        <Box
          key={key}
          component="button"
          type="button"
          onClick={() => onPick(key)}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            p: 1,
            borderRadius: 1,
            border: 1,
            borderColor: "divider",
            bgcolor: "transparent",
            font: "inherit",
            color: "inherit",
            textAlign: "left",
            cursor: "pointer",
            "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
            "&:focus-visible": {
              outline: "2px solid",
              outlineColor: "primary.main",
              outlineOffset: 2,
            },
          }}
        >
          <ItemInstance itemInfo={{ name: key }} size={32} tooltip={false} />
          <Typography variant="body2" noWrap title={G?.items?.[key]?.name ?? key}>
            {G?.items?.[key]?.name ?? key}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

export function RecentItemsStrip({
  items,
  available,
  current,
  onPick,
}: {
  items: ItemKey[];
  available: ItemKey[];
  current: string;
  onPick: (key: ItemKey) => void;
}) {
  const G = useContext(GDataContext);
  const picks = items.filter((k) => available.includes(k) && k !== current).slice(0, RECENT_LIMIT);
  if (!picks.length) return null;
  return (
    <SidebarSection title="Recent">
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
        {picks.map((key) => (
          <Box
            key={key}
            component="button"
            type="button"
            onClick={() => onPick(key)}
            title={G?.items?.[key]?.name ?? key}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.5,
              py: 0.25,
              pl: 0.5,
              pr: 1,
              borderRadius: 1,
              border: 1,
              borderColor: "divider",
              bgcolor: "transparent",
              font: "inherit",
              color: "inherit",
              cursor: "pointer",
              maxWidth: "100%",
              "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
              "&:focus-visible": {
                outline: "2px solid",
                outlineColor: "primary.main",
                outlineOffset: 2,
              },
            }}
          >
            <ItemInstance itemInfo={{ name: key }} size={20} tooltip={false} />
            <Typography variant="caption" noWrap>
              {G?.items?.[key]?.name ?? key}
            </Typography>
          </Box>
        ))}
      </Box>
    </SidebarSection>
  );
}

export function StarterSection({
  title,
  picks,
  onPick,
}: {
  title: string;
  picks: ItemKey[];
  onPick: (key: ItemKey) => void;
}) {
  if (!picks.length) return null;
  return (
    <Box sx={{ mb: 2, "&:last-child": { mb: 0 } }}>
      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ letterSpacing: 0.6, display: "block", mb: 0.5 }}
      >
        {title}
      </Typography>
      <ItemPickGrid picks={picks} onPick={onPick} />
    </Box>
  );
}

export function EmptyPickState({
  mode,
  available,
  recent,
  onPick,
}: {
  mode: CalcMode;
  available: ItemKey[];
  recent: ItemKey[];
  onPick: (key: ItemKey) => void;
}) {
  const { items: marketItems } = useMerchants();
  // Resample when the available set changes (incl. mode switch) — not when merchants load.
  const randomPool = useMemo(() => sampleKeys(available, STARTER_SECTION_LIMIT * 3), [available]);
  const picks = useMemo(() => {
    const built = buildStarterPicks({
      available,
      recent,
      marketItems,
      randomLimit: 0,
    });
    const taken = new Set([...built.recent, ...built.market]);
    const random: ItemKey[] = [];
    for (const key of randomPool) {
      if (taken.has(key) || !available.includes(key)) continue;
      random.push(key);
      if (random.length >= STARTER_SECTION_LIMIT) break;
    }
    return { ...built, random };
  }, [available, recent, marketItems, randomPool]);
  const hasAny = picks.recent.length > 0 || picks.market.length > 0 || picks.random.length > 0;

  return (
    <Paper sx={{ p: 3 }} variant="outlined">
      <Typography variant="subtitle1" gutterBottom>
        Pick an item to plan
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Search in the sidebar, or start from a recent, market, or random{" "}
        {mode === "compound" ? "compound" : mode === "greed" ? "farm" : "upgrade"} item.
      </Typography>
      {hasAny ? (
        <>
          <StarterSection title="Recent" picks={picks.recent} onPick={onPick} />
          <StarterSection title="On the market" picks={picks.market} onPick={onPick} />
          <StarterSection title="Random" picks={picks.random} onPick={onPick} />
        </>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Choose an item in the sidebar to plan a path to your target level.
        </Typography>
      )}
    </Paper>
  );
}
