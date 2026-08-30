# CONTEXT.md

Domain language for al-data-explorer (Items Explorer focus).

## Glossary

| Term                     | Meaning                                                                                                                                                                                                                                                                                         |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Item Acquisition**     | Where a player can obtain an item: NPC shops, token shops, exchanges, monster/map/table drops, and live player market. Built by `getItemAcquisition`; browse and detail only render the view-model. Does **not** include craft or dismantle recipes.                                            |
| **Catalog Query**        | Filtering and sorting the item catalog (`queryItems`): search terms, type/wtype/tier/class facets, optional attribute/set matching, optional caller filter. Browse and ItemPicker are adapters over this interface. Class filter keeps unrestricted gear plus items whose `class` list matches. |
| **Item Meta**            | Player-facing badges and facts (`getItemBadges` / `getItemFacts`): event/exclusive/quest/exchangeable/upgradeable, duration/stack/keys/opens/unlocks, class- and map-only bonuses. Detail header chips + facts; browse shows a short flag set plus ability line.                                |
| **Item Effects**         | Abilities, auras, consumable `gives`, withdrawal (`getItemEffects`). Shown on detail Effects and matrix sticky column.                                                                                                                                                                          |
| **Dismantle**            | `G.dismantle` recipes: break an item into materials (inverse of craft). Indexed by `dismantlesByIngredient`; detail shows recipe + "From dismantling".                                                                                                                                          |
| **Drop Simulation**      | Monte Carlo over `G.drops` exchange tables (weighted exclusive) and monster/map pools (absolute + open). Scenario knobs (coop, 1hp, share, luckm) are caller-supplied; live monster flags only seed defaults.                                                                                   |
| **Drop Table**           | Parsed semantics of one `G.drops` table (absolute or weighted rows, including nested `open`). Item Acquisition and Drop Simulation are two projections of the same model: acquisition expands `open` to leaf odds; simulation defers `open` until the roll.                                     |
| **Kill Drop Plan**       | One kill scenario turned into pools, opportunities, inspection odds, and a roll caption (`planKillDrops`). Scenario knobs in; server-aligned modifiers and display out.                                                                                                                         |
| **Title**                | Named item property (`item.p`, e.g. Lucky, Festive) from `G.titles`. Applies bonuses when the title type matches the item.                                                                                                                                                                      |
| **Stat scroll**          | Property scroll on an item (`item.stat_type`, from `G.items` type `pscroll`). Converts the item's `stat` pool into a chosen attribute (vit, evasion, …).                                                                                                                                        |
| **Item Stats Context**   | Everything needed to resolve one equipped item's stats so pickers, tooltips, loadouts, and Drop Simulation luck agree: the item instance (level, Title, Stat scroll) plus optional class. Hosts pass the instance and class; title definitions are loaded from game data behind the seam.       |
| **xluck**                | Additive luck points from gear (base luck, Title luck, Stat scroll luck). Character sheet Luck % uses `luckm = 1 + xluck/100` (and party luck where applicable).                                                                                                                                |
| **Loadout**              | Equipped gear across slots for one character, plus class and level when known. Aggregation yields sheet stats; xluck is a projection of that loadout (party xluck is Drop Simulation–only).                                                                                                     |
| **Loadout picker shell** | Shared equip UX for Gear Planner and Drop Simulation luck: paper doll, class chips, slot pick with Title/Stat scroll, remove, doublehand invariant. Hosts keep Save/Load/Import, level, and their own result panels (stats sheet vs luck breakdown).                                            |

## Related (not yet deepened)

| Term                | Notes                                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| Item context        | Full item-page story (craft + set + acquisition + related) — future facade over indexes + raw `G`. |
| Bidirectional drops | Monster→item and item→sources sharing one seam — later, with WorldViewer.                          |
