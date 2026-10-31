# Gear Planner vs-monster combat calc

Feature contract for Attack / Defense tables against a selected monster in Gear Planner (and Character detail/compare via the same `StatsPanel`), plus Stat Detail (falloff / waste).

## Upstream source of truth

| Piece | Path |
| --- | --- |
| Mitigation curve | `adventureland_mongodb/js/old_common_functions.js` — `damage_multiplier` |
| Hit apply | `adventureland_mongodb/node/server.js` — `commence_attack` + `complete_attack` |
| Status resists | `adventureland_mongodb/node/server_functions.js` — `add_condition`; `design/conditions.js` `defense` |
| Local port | `src/GearPlanner/calculations.ts`, `statInsights.ts` |

### Damage type pair

| `damage_type` | Defense | Pierce |
| --- | --- | --- |
| physical | `armor` | `apiercing` |
| magical | `resistance` | `rpiercing` |
| pure | none | ignored |

### Effective defense (basic attack)

1. `commence_attack` does `info[pierce] += attacker[pierce]`
2. `complete_attack` applies `damage_multiplier(target[defense] - attacker[pierce] - info[pierce])`

So for a basic attack with no skill pierce bonus:

```text
effective_defense = def - 2 * pierce
multiplier = damage_multiplier(effective_defense)
```

### Status resists

| Stat | Effect |
| --- | --- |
| `pnresistance` | Chance resist (`defense` on poisoned); shortens poison duration |
| `firesistance` | Chance resist burned; scales burn intensity/duration |
| `fzresistance` | Chance resist frozen / deepfreezed |
| `phresistance` | Chance resist stunned |
| `stresistance` | Shortens all `debuff` durations |

Chance path: `random < resist / 100` — values ≥ 100 are overcap for the roll.

## UI

Home: Target monster block in `StatsPanel` (Gear Planner + Character panels).

### Attack / Defense tables

- Pierce, defense, effective defense, multiplier, expected hit, theo DPS, hits-to-kill
- Click pierce / defense / effective / multiplier → Stat Detail dialog

### Stat Detail (clickable sheet + vs-monster rows)

- SVG falloff graphs (mult vs pierce, mult vs effective defense; status chance / duration curves)
- Waste hints: wrong-type pierce, hard 1.32 cap, status ≥ 100
- Gear/set contribution table for the open sheet stat (item name + level + slot) so large totals are auditable
- Inline warning chips above Attack/Defense tables

### DEFENSE sheet

Surfaces `pnresistance`, `firesistance`, `fzresistance`, `phresistance`, `stresistance` (clickable).

## Out of scope (TODO)

- Skill pierce bonuses (`piercingshot` +500) — counted once via `info`
- Heal half-defense path; splash without pierce
- Fortitude (`for * 5`) when attacker is a player
- Evasion / reflection RNG tables
- Mainhand `damage_type` override
- Sharing monster selection with Drop Simulator `?monster=`
- STR/INT softcap waste graphs
