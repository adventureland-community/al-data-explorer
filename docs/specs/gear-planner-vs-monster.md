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

Mainhand item `damage_type` overrides class default; `heal` weapons pair as magical (use hit path **heal** for half-defense formula).

### Effective defense

| Hit path | Formula |
| --- | --- |
| basic | `def − 2×gear pierce − skill pierce` (skill once on `info`) |
| heal | `(def − pierce) / 2` |
| splash | `def` (no pierce) |

Fortitude on the **defender** when the attacker is the player: multiply by `damage_multiplier(for × 5)`.

Crit EV: live `attack *= 2 + critdamage/100` on roll → expected factor `1 + p×(cmult − 1)` (base crit is 2×, not 3×).

Evasion (physical) / reflection (magical): expected damage scales by land chance `1 − miss%/100`.

Hit path (basic / heal / splash) and skill pierce apply to **ATTACK** (you → monster) only; DEFENSE always uses basic.

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

- Monster: Autocomplete, URL `?monster=`, localStorage last pick, favorite chips
- Hit path (basic / heal / splash), skill pierce field
- Link to Drop Simulator `/drops?monster=<key>`
- Click gear contribution row in Stat Detail → highlight paper-doll slot (Gear Planner)

### Attack / Defense tables

- Pierce (incl. skill pierce note), defense, effective defense, multiplier, fortitude / land chance when relevant, expected hit, theo DPS, hits-to-kill
- Click pierce / defense / effective / multiplier → Stat Detail dialog

### Stat Detail (clickable sheet + vs-monster rows)

- SVG falloff graphs (mult vs pierce with you + hard-cap markers; mult vs effective defense; status chance / duration curves)
- STR/INT: attribute softcap curve (160 / 180) with current marker
- Evasion / reflection: land-chance graph; fortitude (`for`): mult vs for graph (click Attack/Defense rows or sheet stats)
- Waste hints: wrong-type pierce, hard 1.32 cap (trim copy + top gear line when contributions exist), status ≥ 100
- Gear/set contribution table (gear rows click → slot highlight)
- Inline warning chips above Attack/Defense tables

### DEFENSE sheet

Surfaces `pnresistance`, `firesistance`, `fzresistance`, `phresistance`, `stresistance` (clickable).
