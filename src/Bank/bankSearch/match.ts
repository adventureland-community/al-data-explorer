import type { GData } from "typed-adventureland";
import { ItemKey } from "typed-adventureland";

import { itemMatchesClasses } from "../../gameData/itemMeta";
import { getItemGrade } from "../../gameData/playerItemDisplay";
import { itemMatchesSearch } from "../../gameData/itemFilters";
import { getTitleName } from "../../Shared/iteminfo-util";
import {
  buildItemStatsForSearch,
  compareNumber,
  groupMatchWithOrFields,
  itemHasSearchFlag,
  queryMatchesAnyGroup,
  statsMatchAttrSpecs,
} from "../../Shared/querySearch";
import { getBankItemCategory } from "../bankCategory";

import { parseBankSearchQuery } from "./parse";
import type { BankSearchableItem, BankSearchClause, BankSearchQuery } from "./types";

function matchesTextTerm(
  item: BankSearchableItem,
  G: GData | undefined,
  term: string,
  nameOnly = false,
): boolean {
  const needle = term.trim().toLowerCase();
  if (!needle) return true;

  if (nameOnly) {
    const itemKey = item.name as ItemKey;
    const gItem = G?.items[itemKey];
    if (item.name.toLowerCase().includes(needle)) return true;
    if (gItem?.name.toLowerCase().includes(needle)) return true;
    return false;
  }

  if ((item.category || getBankItemCategory(item.name, G)).toLowerCase().includes(needle)) {
    return true;
  }
  if (String(item.level).includes(needle)) return true;
  if (item.p && item.p.toLowerCase().includes(needle)) return true;

  const itemKey = item.name as ItemKey;
  const gItem = G?.items[itemKey];
  if (gItem && itemMatchesSearch(itemKey, gItem, needle)) return true;

  if (G?.titles) {
    const titleName = getTitleName(item, G);
    if (titleName.toLowerCase().includes(needle)) return true;
  }

  return item.name.toLowerCase().includes(needle);
}

function clauseMatchesItem(
  item: BankSearchableItem,
  G: GData | undefined,
  clause: BankSearchClause,
): boolean {
  const gItem = G?.items[item.name as ItemKey];
  let hit = false;

  switch (clause.kind) {
    case "text":
      hit = matchesTextTerm(item, G, clause.value);
      break;
    case "name":
      hit = matchesTextTerm(item, G, clause.value, true);
      break;
    case "type":
      hit = Boolean(gItem?.type && gItem.type.toLowerCase() === clause.value.toLowerCase());
      break;
    case "title":
      hit = Boolean(item.p && item.p.toLowerCase() === clause.value.toLowerCase());
      break;
    case "class":
      hit = Boolean(gItem && itemMatchesClasses(gItem, [clause.value.toLowerCase()]));
      break;
    case "set": {
      const setKey = (gItem as { set?: string } | undefined)?.set;
      hit = Boolean(setKey && setKey.toLowerCase() === clause.value.toLowerCase());
      break;
    }
    case "category": {
      const category = item.category || getBankItemCategory(item.name, G);
      hit = category.toLowerCase().includes(clause.value.toLowerCase());
      break;
    }
    case "is":
      hit = Boolean(gItem && itemHasSearchFlag(gItem, item.name, clause.value, G));
      break;
    case "q":
      hit = compareNumber(item.q, clause.op, clause.value);
      break;
    case "stack":
      hit = compareNumber(item.stack, clause.op, clause.value);
      break;
    case "level":
      hit = compareNumber(item.level, clause.op, clause.value);
      break;
    case "grade": {
      if (!gItem) {
        hit = false;
        break;
      }
      hit = compareNumber(getItemGrade(gItem, item.level), clause.op, clause.value);
      break;
    }
    case "attr": {
      if (!gItem) {
        hit = false;
        break;
      }
      const stats = buildItemStatsForSearch({
        def: gItem,
        level: item.level,
        p: item.p ? String(item.p) : undefined,
        G,
      });
      hit = statsMatchAttrSpecs(stats, clause.specs);
      break;
    }
    default: {
      const _exhaustive: never = clause;
      return _exhaustive;
    }
  }

  return clause.negated ? !hit : hit;
}

const OR_FIELD_KINDS = new Set(["type", "title", "class", "set", "category"]);

export function bankItemMatchesQuery(
  item: BankSearchableItem,
  G: GData | undefined,
  query: BankSearchQuery,
): boolean {
  return queryMatchesAnyGroup(query.groups, { item, G }, (ctx, group) =>
    groupMatchWithOrFields(ctx.item, group, OR_FIELD_KINDS, (entity, clause) =>
      clauseMatchesItem(entity, ctx.G, clause),
    ),
  );
}

export function bankItemMatchesSearchQuery(
  item: BankSearchableItem,
  G: GData | undefined,
  searchTerm: string,
): boolean {
  const trimmed = searchTerm.trim();
  if (!trimmed) return true;
  return bankItemMatchesQuery(item, G, parseBankSearchQuery(trimmed));
}
