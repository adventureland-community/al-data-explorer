import { ITEM_FLAG_ALIASES, type ItemSearchFlag } from "../Shared/querySearch";
import {
  parseItemCatalogQuery,
  type ItemCatalogClause,
  type ItemCatalogQuery,
} from "./itemCatalogSearchQuery";

export type ItemCatalogAdvancedForm = {
  anyWords: string;
  types: string[];
  wtypes: string[];
  classKeys: string[];
  tierMin: string;
  tierMax: string;
  attrKey: string;
  attrMin: string;
  attrMax: string;
  flags: Partial<Record<ItemSearchFlag, boolean>>;
};

export const EMPTY_ITEM_CATALOG_ADVANCED: ItemCatalogAdvancedForm = {
  anyWords: "",
  types: [],
  wtypes: [],
  classKeys: [],
  tierMin: "",
  tierMax: "",
  attrKey: "",
  attrMin: "",
  attrMax: "",
  flags: {},
};

function quoteIfNeeded(value: string): string {
  if (!value) return '""';
  if (/[\s"]/u.test(value)) return `"${value.replace(/"/gu, "")}"`;
  return value;
}

/** Fold legacy browse URL facets into a catalog query string. */
export function serializeLegacyBrowseFacets(facets: {
  types: string[];
  wtypes: string[];
  tiers: number[];
  classes: string[];
}): string {
  const parts: string[] = [];
  for (const value of facets.types) parts.push(`type:${quoteIfNeeded(value)}`);
  for (const value of facets.wtypes) parts.push(`wtype:${quoteIfNeeded(value)}`);
  for (const value of facets.classes) parts.push(`class:${quoteIfNeeded(value)}`);
  for (const tier of facets.tiers) parts.push(`tier:${tier}`);
  return parts.join(" ");
}

export function serializeItemCatalogAdvancedForm(form: ItemCatalogAdvancedForm): string {
  const parts: string[] = [];
  if (form.anyWords.trim()) parts.push(form.anyWords.trim());
  for (const value of form.types) parts.push(`type:${quoteIfNeeded(value)}`);
  for (const value of form.wtypes) parts.push(`wtype:${quoteIfNeeded(value)}`);
  for (const value of form.classKeys) parts.push(`class:${quoteIfNeeded(value)}`);
  if (form.tierMin.trim()) parts.push(`tier:>=${form.tierMin.trim()}`);
  if (form.tierMax.trim()) parts.push(`tier:<=${form.tierMax.trim()}`);
  const attrKey = form.attrKey.trim().toLowerCase();
  if (attrKey) {
    const specs: string[] = [];
    if (form.attrMin.trim()) specs.push(`${attrKey}>=${form.attrMin.trim()}`);
    if (form.attrMax.trim()) specs.push(`${attrKey}<=${form.attrMax.trim()}`);
    if (!specs.length) specs.push(attrKey);
    parts.push(`attr:${specs.join(",")}`);
  }
  for (const [flag, on] of Object.entries(form.flags)) {
    if (!on) continue;
    const alias = flag === "craftable" ? "craft" : flag;
    parts.push(`is:${alias}`);
  }
  return parts.join(" ");
}

function applyClause(
  clause: ItemCatalogClause,
  form: ItemCatalogAdvancedForm,
  texts: string[],
  types: string[],
  wtypes: string[],
  classKeys: string[],
): void {
  switch (clause.kind) {
    case "text":
    case "name":
      texts.push(clause.value);
      break;
    case "type":
      types.push(clause.value);
      break;
    case "wtype":
      wtypes.push(clause.value);
      break;
    case "class":
      classKeys.push(clause.value);
      break;
    case "tier":
      if (clause.op === ">=" || clause.op === ">" || clause.op === "=") {
        form.tierMin = String(clause.op === ">" ? clause.value + 1 : clause.value);
      }
      if (clause.op === "<=" || clause.op === "<") {
        form.tierMax = String(clause.op === "<" ? clause.value - 1 : clause.value);
      }
      break;
    case "is":
      form.flags = { ...form.flags, [clause.value]: true };
      break;
    case "attr":
      if (!clause.specs.length) break;
      form.attrKey = clause.specs[0].key;
      for (const spec of clause.specs) {
        if (spec.kind === "any") continue;
        if (spec.op === ">=" || spec.op === ">" || spec.op === "=") {
          form.attrMin = String(spec.op === ">" ? spec.n + 1 : spec.n);
        }
        if (spec.op === "<=" || spec.op === "<") {
          form.attrMax = String(spec.op === "<" ? spec.n - 1 : spec.n);
        }
      }
      break;
    default:
      break;
  }
}

export function itemCatalogAdvancedFromQuery(query: ItemCatalogQuery): ItemCatalogAdvancedForm {
  const form: ItemCatalogAdvancedForm = { ...EMPTY_ITEM_CATALOG_ADVANCED, flags: {} };
  const texts: string[] = [];
  const types: string[] = [];
  const wtypes: string[] = [];
  const classKeys: string[] = [];

  for (const group of query.groups) {
    for (const clause of group) {
      if (clause.negated) continue;
      applyClause(clause, form, texts, types, wtypes, classKeys);
    }
  }

  form.anyWords = texts.join(" ");
  form.types = types;
  form.wtypes = wtypes;
  form.classKeys = classKeys;
  return form;
}

export function itemCatalogAdvancedFromSearch(search: string): ItemCatalogAdvancedForm {
  return itemCatalogAdvancedFromQuery(parseItemCatalogQuery(search));
}

export function itemCatalogAdvancedHasValues(form: ItemCatalogAdvancedForm): boolean {
  return Boolean(serializeItemCatalogAdvancedForm(form).trim());
}

export { ITEM_FLAG_ALIASES };
