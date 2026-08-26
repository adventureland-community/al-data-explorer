import { Box, Button, Paper, Stack, Tab, Tabs, TextField, Typography } from "@mui/material";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ItemKey, MonsterKey } from "typed-adventureland";

import {
  buildExchangeOpportunities,
  buildExchangeInspectionRows,
  COOP_MIN_DROP_SHARE,
  defaultMapForMonster,
  diffFromLive,
  exchangeTokenCosts,
  listExchangeTables,
  OddsInspectionRow,
  OutcomeRow,
  killBernoulliRollsPerTrial,
  planKillDrops,
  resolveKillPolicy,
  simulateOutcomes,
} from "../gameData/dropSim";
import { GDataContext } from "../GDataContext";
import { ItemInstance } from "../Shared/ItemInstance";
import { MonsterImage } from "../Shared/SpriteSkin";
import { KillScenarioControls } from "./KillScenarioControls";
import { coopKillScenario, liveKillScenario } from "./killScenarioDefaults";
import { OddsPanel } from "./OddsPanel";
import { ResultsPanel } from "./ResultsPanel";
import { SimEntityAutocomplete } from "./SimEntityAutocomplete";
import { DropSimMode, useDropSimParams } from "./useDropSimParams";

const MONSTER_ICON_SCALE = 1.75;
const TABLE_ICON_SIZE = 36;

function liveFlagsForMonster(
  monsters: Record<string, { cooperative?: boolean; "1hp"?: boolean; hp?: number } | undefined>,
  monsterKey: string,
) {
  const m = monsters[monsterKey];
  return {
    cooperative: Boolean(m?.cooperative),
    oneHp: Boolean(m?.["1hp"]),
    hp: typeof m?.hp === "number" ? m.hp : undefined,
  };
}

export function DropSimulator() {
  const G = useContext(GDataContext);
  const [searchParams] = useSearchParams();
  const { params, patch } = useDropSimParams();
  const [outcomes, setOutcomes] = useState<OutcomeRow[]>([]);
  const [hasRun, setHasRun] = useState(false);
  const lastSeededMonster = useRef<string | null>(null);

  const tables = useMemo(() => (G ? listExchangeTables(G.drops ?? {}) : []), [G]);
  const monsterOptions = useMemo(() => {
    if (!G?.monsters) return [];
    return Object.keys(G.monsters).sort((a, b) => a.localeCompare(b));
  }, [G]);

  const live = useMemo(() => {
    if (!G || !params.monster) {
      return { cooperative: false, oneHp: false, hp: undefined as number | undefined };
    }
    return liveFlagsForMonster(G.monsters, params.monster);
  }, [G, params.monster]);

  useEffect(() => {
    if (!G || !params.monster) return;
    if (lastSeededMonster.current === params.monster) return;
    lastSeededMonster.current = params.monster;
    const flags = liveFlagsForMonster(G.monsters, params.monster);
    const urlHasScenario = searchParams.has("coop") || searchParams.has("oneHp");
    if (urlHasScenario && searchParams.get("monster") === params.monster) {
      return;
    }
    const map = searchParams.has("map")
      ? params.map
      : defaultMapForMonster(G.indexes?.spawnsByMonster, params.monster);
    const globals = searchParams.has("globals") ? params.globals : true;
    patch({ ...liveKillScenario(flags, { map, globals }) }, { replace: true });
  }, [G, params.monster, params.map, params.globals, patch, searchParams]);

  const killPlan = useMemo(() => {
    if (!G || params.mode !== "kill" || !params.monster) return null;
    return planKillDrops({
      drops: (G.drops ?? {}) as Record<string, unknown>,
      monsterKey: params.monster,
      luckm: params.luckm,
      cooperative: params.cooperative,
      oneHp: params.oneHp,
      share: params.share,
      contributors: params.contributors,
      level: params.level,
      mapKey: params.map || undefined,
      includeGlobals: params.globals,
      konami: params.konami,
      homeServer: params.homeServer,
      monsterHp: live.hp,
    });
  }, [G, params, live.hp]);

  const policy = useMemo(
    () =>
      killPlan?.policy ??
      resolveKillPolicy({
        cooperative: params.cooperative,
        oneHp: params.oneHp,
        share: params.share,
        contributors: params.contributors,
      }),
    [killPlan, params.cooperative, params.oneHp, params.share, params.contributors],
  );

  const whatIfLabels = useMemo(
    () =>
      diffFromLive(
        { cooperative: live.cooperative, oneHp: live.oneHp },
        { cooperative: params.cooperative, oneHp: params.oneHp },
      ),
    [live.cooperative, live.oneHp, params.cooperative, params.oneHp],
  );

  const opportunities = useMemo(() => {
    if (!G) return null;
    const drops = (G.drops ?? {}) as Record<string, unknown>;
    if (params.mode === "exchange") {
      if (!params.table) return null;
      return buildExchangeOpportunities(drops, params.table);
    }
    return killPlan?.opportunities ?? null;
  }, [G, params.mode, params.table, killPlan]);

  const oddsRows: OddsInspectionRow[] = useMemo(() => {
    if (params.mode === "kill") return killPlan?.oddsRows ?? [];
    if (!opportunities || opportunities.kind !== "exchange") return [];
    return buildExchangeInspectionRows(opportunities.entries);
  }, [params.mode, killPlan, opportunities]);

  const tokenCosts = useMemo(() => {
    if (!G || params.mode !== "exchange" || !params.table) return undefined;
    const costs = exchangeTokenCosts({
      tokens: G.tokens as Record<string, unknown> | undefined,
      tableKey: params.table,
      n: params.n,
    });
    return costs.length > 0 ? costs : undefined;
  }, [G, params.mode, params.table, params.n]);

  const run = () => {
    if (!opportunities) return;
    setOutcomes(
      simulateOutcomes({
        opportunities,
        n: params.n,
      }),
    );
    setHasRun(true);
  };

  const setMode = (_: React.SyntheticEvent, mode: DropSimMode) => {
    patch({ mode });
    setHasRun(false);
    setOutcomes([]);
  };

  const selectMonster = (value: string | null) => {
    if (!G || !value) {
      lastSeededMonster.current = null;
      patch({ monster: "" });
      return;
    }
    const flags = liveFlagsForMonster(G.monsters, value);
    lastSeededMonster.current = value;
    const map = defaultMapForMonster(G.indexes?.spawnsByMonster, value);
    patch({ monster: value, ...liveKillScenario(flags, { map, globals: true }) });
    setHasRun(false);
    setOutcomes([]);
  };

  if (!G) return null;

  const killResultsHint =
    params.mode === "kill" && opportunities?.kind === "kill"
      ? !policy.dropEligible
        ? `Share ≤ ${
            COOP_MIN_DROP_SHARE * 100
          }% — server grants no coop drops at this contribution level.`
        : `${params.n.toLocaleString()} kills, ${(
            params.n * killBernoulliRollsPerTrial(opportunities)
          ).toLocaleString()} table rolls total. Guaranteed drops always match expected; re-run to see variance on rare items.`
      : undefined;

  const scenarioSubtitle =
    params.mode === "kill"
      ? [
          params.konami ? "konami" : params.cooperative ? "coop" : "non-coop",
          policy.dropEligible ? `share ${policy.share}` : "no drops (low share)",
          params.konami ? null : `${params.contributors} table×`,
          params.konami ? null : `table×${policy.tableMultiplier}`,
          params.map ? `map ${params.map}` : null,
          params.homeServer && !params.konami ? "home" : null,
          whatIfLabels.length > 0 ? "what-if" : "live",
        ]
          .filter(Boolean)
          .join(" · ")
      : undefined;

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        textAlign: "left",
        p: 2,
        overflowX: "hidden",
      }}
    >
      <Typography variant="h5" component="h1" gutterBottom>
        Drop Simulator
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Simulate exchange tables and monster kills. Defaults follow the selected monster; tweak coop
        and 1hp for what-if runs.
      </Typography>

      <Tabs value={params.mode} onChange={setMode} sx={{ mb: 2 }}>
        <Tab label="Exchange" value="exchange" />
        <Tab label="Kill" value="kill" />
      </Tabs>

      <Stack spacing={2} sx={{ mb: 2, width: "100%" }}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 2,
              alignItems: "flex-end",
              minWidth: 0,
            }}
          >
            {params.mode === "exchange" ? (
              <SimEntityAutocomplete
                options={tables}
                value={params.table || null}
                label="Loot table"
                onChange={(value) => {
                  patch({ table: value ?? "" });
                  setHasRun(false);
                  setOutcomes([]);
                }}
                getOptionLabel={(option) => {
                  const item = G.items[option as ItemKey];
                  return item?.name ? `${item.name} (${option})` : option;
                }}
                getPrimaryLabel={(option) => G.items[option as ItemKey]?.name ?? option}
                getSecondaryLabel={(option) =>
                  G.items[option as ItemKey]?.name ? option : undefined
                }
                filterOption={(key, q) => {
                  if (key.toLowerCase().includes(q)) return true;
                  const name = G.items[key as ItemKey]?.name;
                  return Boolean(name && name.toLowerCase().includes(q));
                }}
                renderListIcon={(option) => {
                  const item = G.items[option as ItemKey];
                  return item ? (
                    <ItemInstance
                      itemInfo={{ name: option as ItemKey }}
                      size={TABLE_ICON_SIZE}
                      tooltip={false}
                    />
                  ) : (
                    <Box sx={{ width: TABLE_ICON_SIZE, height: TABLE_ICON_SIZE, flexShrink: 0 }} />
                  );
                }}
                renderInputIcon={(option) => (
                  <ItemInstance itemInfo={{ name: option as ItemKey }} size={24} tooltip={false} />
                )}
              />
            ) : (
              <SimEntityAutocomplete
                options={monsterOptions}
                value={params.monster || null}
                label="Monster"
                onChange={(value) => selectMonster(value)}
                getOptionLabel={(option) => {
                  const name = G.monsters[option as MonsterKey]?.name;
                  return name ? `${name} (${option})` : option;
                }}
                getPrimaryLabel={(option) => G.monsters[option as MonsterKey]?.name ?? option}
                getSecondaryLabel={(option) => option}
                filterOption={(key, q) => {
                  if (key.toLowerCase().includes(q)) return true;
                  const name = G.monsters[key as MonsterKey]?.name;
                  return Boolean(name && name.toLowerCase().includes(q));
                }}
                renderListIcon={(option) => (
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                    }}
                  >
                    <MonsterImage
                      monsterName={option as MonsterKey}
                      opacity={1}
                      scale={MONSTER_ICON_SCALE}
                      tooltip={false}
                    />
                  </Box>
                )}
                renderInputIcon={(option) => (
                  <MonsterImage
                    monsterName={option as MonsterKey}
                    opacity={1}
                    scale={1.1}
                    tooltip={false}
                  />
                )}
                inputIconBoxSx={{
                  alignItems: "center",
                  justifyContent: "center",
                  width: 28,
                  height: 28,
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              />
            )}
            <TextField
              label="N"
              type="number"
              size="small"
              value={params.n}
              onChange={(e) =>
                patch({ n: Math.min(100_000, Math.floor(Number(e.target.value) || 1)) })
              }
              inputProps={{ min: 1, max: 100000, step: 100 }}
              sx={{ width: 120 }}
            />
            <Button variant="contained" onClick={run} disabled={!opportunities} sx={{ height: 40 }}>
              Run
            </Button>
          </Box>
        </Paper>

        {params.mode === "kill" ? (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <KillScenarioControls
              params={params}
              liveCooperative={live.cooperative}
              liveOneHp={live.oneHp}
              whatIfLabels={whatIfLabels}
              policy={policy}
              rollCaption={killPlan?.rollCaption}
              onPatch={patch}
              onResetLive={() => {
                const map = defaultMapForMonster(G.indexes?.spawnsByMonster, params.monster);
                patch(liveKillScenario(live, { map, globals: true }));
              }}
              onEqualSplit={() => {
                const n = Math.max(1, params.contributors);
                patch({ ...coopKillScenario(params.oneHp, n), cooperative: true });
              }}
            />
          </Paper>
        ) : null}
      </Stack>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", xl: "minmax(0, 1fr) minmax(0, 1fr)" },
          gap: 2,
          width: "100%",
          minWidth: 0,
          alignItems: "start",
        }}
      >
        <OddsPanel
          title={params.mode === "exchange" ? "Exchange odds" : "Kill odds (effective)"}
          rows={oddsRows}
          mode={params.mode}
          coopDropEligible={params.mode === "kill" ? policy.dropEligible : undefined}
          drops={opportunities?.drops}
        />
        <ResultsPanel
          title={
            hasRun
              ? params.mode === "kill"
                ? `Results for ${params.n.toLocaleString()} kills`
                : `Results for ${params.n.toLocaleString()} trials`
              : "Results"
          }
          subtitle={scenarioSubtitle}
          hint={killResultsHint}
          outcomes={hasRun ? outcomes : []}
          tokenCosts={tokenCosts}
          trialCount={params.n}
        />
      </Box>
    </Box>
  );
}
