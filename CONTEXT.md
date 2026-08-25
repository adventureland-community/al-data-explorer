# CONTEXT.md

Domain language for al-data-explorer (Items Explorer focus).

## Glossary

| Term                 | Meaning                                                                                                                                                                                                                                                                                         |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Item Acquisition** | Where a player can obtain an item: NPC shops, token shops, exchanges, monster/map/table drops, and live player market. Built by `getItemAcquisition`; browse and detail only render the view-model. Does **not** include craft or dismantle recipes.                                            |
| **Catalog Query**    | Filtering and sorting the item catalog (`queryItems`): search terms, type/wtype/tier/class facets, optional attribute/set matching, optional caller filter. Browse and ItemPicker are adapters over this interface. Class filter keeps unrestricted gear plus items whose `class` list matches. |
| **Item Meta**        | Player-facing badges and facts (`getItemBadges` / `getItemFacts`): event/exclusive/quest/exchangeable/upgradeable, duration/stack/keys/opens/unlocks, class- and map-only bonuses. Detail header chips + facts; browse shows a short flag set plus ability line.                                |
| **Item Effects**     | Abilities, auras, consumable `gives`, withdrawal (`getItemEffects`). Shown on detail Effects and matrix sticky column.                                                                                                                                                                          |
| **Dismantle**        | `G.dismantle` recipes: break an item into materials (inverse of craft). Indexed by `dismantlesByIngredient`; detail shows recipe + "From dismantling".                                                                                                                                          |

## Related (not yet deepened)

| Term                | Notes                                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| Item context        | Full item-page story (craft + set + acquisition + related) — future facade over indexes + raw `G`. |
| Bidirectional drops | Monster→item and item→sources sharing one seam — later, with WorldViewer.                          |
