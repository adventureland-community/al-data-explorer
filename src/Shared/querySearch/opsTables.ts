import type { SearchContextId, SurfaceOpDef } from "./types";

export const BANK_OPS: readonly SurfaceOpDef[] = [
  { name: "type", hint: "weapon · pot · …", insert: "type:" },
  { name: "title", hint: "lucky · shiny · …", insert: "title:" },
  { name: "class", hint: "warrior · mage · …", insert: "class:" },
  { name: "set", hint: "set key", insert: "set:" },
  { name: "category", hint: "bank category", insert: "category:" },
  { name: "name", hint: "Name or key only", insert: "name:" },
  { name: "is", hint: "upgrade · compound · craft", insert: "is:" },
  { name: "attr", hint: "str>=10 · armor>=50", insert: "attr:" },
  { name: "q", hint: "quantity", insert: "q:>=" },
  { name: "stack", hint: "Occupied stacks", insert: "stack:>" },
  { name: "level", hint: "e.g. level:>=7", insert: "level:>=" },
  { name: "grade", hint: "e.g. grade:>=2", insert: "grade:>=" },
];

export const MARKET_OPS: readonly SurfaceOpDef[] = [
  { name: "item", hint: "Filter by item key", insert: "item:" },
  { name: "title", hint: "lucky · shiny", insert: "title:" },
  { name: "merchant", hint: "Seller / buyer id", insert: "merchant:" },
  { name: "level", hint: "e.g. level:>=7", insert: "level:>=" },
  { name: "price", hint: "e.g. price:>=1m", insert: "price:>=" },
  { name: "attr", hint: "armor>=40 · str>=10", insert: "attr:" },
  { name: "is", hint: "buy · sell", insert: "is:" },
  { name: "has", hint: "title", insert: "has:" },
];

export const CATALOG_OPS: readonly SurfaceOpDef[] = [
  { name: "type", hint: "weapon · pot · …", insert: "type:" },
  { name: "wtype", hint: "sword · staff · …", insert: "wtype:" },
  { name: "tier", hint: "tier:>=3", insert: "tier:>=" },
  { name: "class", hint: "warrior · mage · …", insert: "class:" },
  { name: "set", hint: "set key", insert: "set:" },
  { name: "is", hint: "upgrade · craft · exchange", insert: "is:" },
  { name: "attr", hint: "any level — crit>=5 · armor>=40", insert: "attr:" },
  { name: "level", hint: "Narrow attr to +N — level:>=9", insert: "level:>=" },
  { name: "name", hint: "Name or key only", insert: "name:" },
  { name: "title", hint: "Title / prefix key", insert: "title:" },
];

export const GEAR_OPS: readonly SurfaceOpDef[] = [
  { name: "type", hint: "weapon · shield · …", insert: "type:" },
  { name: "wtype", hint: "sword · staff · …", insert: "wtype:" },
  { name: "tier", hint: "tier:>=2", insert: "tier:>=" },
  { name: "class", hint: "warrior · mage · …", insert: "class:" },
  { name: "set", hint: "set key", insert: "set:" },
  { name: "is", hint: "upgrade · compound", insert: "is:" },
  { name: "attr", hint: "Uses level slider — attr:attack>=50", insert: "attr:" },
  { name: "level", hint: "e.g. level:>=7", insert: "level:>=" },
  { name: "name", hint: "Name or key only", insert: "name:" },
];

export const LUCK_OPS: readonly SurfaceOpDef[] = [
  { name: "type", hint: "chest · pants · …", insert: "type:" },
  { name: "wtype", hint: "sword · staff · …", insert: "wtype:" },
  { name: "tier", hint: "tier:>=3", insert: "tier:>=" },
  { name: "class", hint: "warrior · mage · …", insert: "class:" },
  { name: "set", hint: "set key", insert: "set:" },
  { name: "is", hint: "upgrade · compound", insert: "is:" },
  { name: "attr", hint: "Prefer luck — attr:luck>=10", insert: "attr:luck>=" },
  { name: "level", hint: "e.g. level:>=7", insert: "level:>=" },
  { name: "name", hint: "Name or key only", insert: "name:" },
  { name: "title", hint: "lucky · festive", insert: "title:" },
];

export const MONSTER_OPS: readonly SurfaceOpDef[] = [
  { name: "name", hint: "Monster name / key", insert: "name:" },
  { name: "drop", hint: "Item in drop table", insert: "drop:" },
  { name: "achievement", hint: "Achievement label", insert: "achievement:" },
  { name: "hp", hint: "e.g. hp:>=50000", insert: "hp:>=" },
  { name: "mp", hint: "e.g. mp:>=100", insert: "mp:>=" },
  { name: "xp", hint: "XP reward", insert: "xp:>=" },
  { name: "attack", hint: "Monster attack", insert: "attack:>=" },
  { name: "respawn", hint: "e.g. respawn:<=10", insert: "respawn:<=" },
  { name: "armor", hint: "Monster armor", insert: "armor:>=" },
  { name: "resistance", hint: "Monster resistance", insert: "resistance:>=" },
  { name: "range", hint: "Attack range", insert: "range:>=" },
  { name: "speed", hint: "Move speed", insert: "speed:>=" },
  { name: "frequency", hint: "Attack frequency", insert: "frequency:>=" },
  { name: "attr", hint: "Any monster numeric", insert: "attr:" },
  { name: "map", hint: "Spawn map", insert: "map:" },
];

export const NPC_OPS: readonly SurfaceOpDef[] = [
  { name: "name", hint: "NPC name / id", insert: "name:" },
  { name: "role", hint: "merchant · transporter · …", insert: "role:" },
  { name: "map", hint: "Spawn map key", insert: "map:" },
  { name: "token", hint: "Token key", insert: "token:" },
  { name: "quest", hint: "Quest id", insert: "quest:" },
  { name: "sells", hint: "Shop item key", insert: "sells:" },
  { name: "is", hint: "shop · ignored · moving", insert: "is:" },
];

export const BANK_ALIASES: Record<string, string> = { cat: "category" };
export const MARKET_ALIASES: Record<string, string> = { mer: "merchant" };
export const MONSTER_ALIASES: Record<string, string> = { item: "drop", spawn: "map" };
export const NPC_ALIASES: Record<string, string> = { item: "sells", type: "role" };

type SurfaceMeta = {
  ops: readonly SurfaceOpDef[];
  aliases: Record<string, string>;
  placeholder: string;
  footer: string;
};

export const SURFACE_META: Record<SearchContextId, SurfaceMeta> = {
  bank: {
    ops: BANK_OPS,
    aliases: BANK_ALIASES,
    placeholder: "Search bank — try hpot, type:weapon, attr:str>=20",
    footer: "Words AND · OR / , · Quotes · -negate · attr:str>=10",
  },
  market: {
    ops: MARKET_OPS,
    aliases: MARKET_ALIASES,
    placeholder: "Search market — item:sword, price:>=1m, attr:armor>=40",
    footer: "Words AND · OR · Quotes · -negate · price: / attr: / merchant:",
  },
  catalog: {
    ops: CATALOG_OPS,
    aliases: {},
    placeholder: "Search items — type:weapon, attr:crit>=5, is:upgrade",
    footer: "Words AND · OR · Quotes · -negate · type: / attr: / is:",
  },
  gear: {
    ops: GEAR_OPS,
    aliases: {},
    placeholder: "Filter slot gear — attr:attack>=50, wtype:sword",
    footer: "Slot already filtered · attr: uses level slider · Words AND · OR",
  },
  luck: {
    ops: LUCK_OPS,
    aliases: {},
    placeholder: "Filter luck gear — attr:luck>=10, title:lucky",
    footer: "Prefer attr:luck · set Lucky/Festive title above · Words AND · OR",
  },
  monster: {
    ops: MONSTER_OPS,
    aliases: MONSTER_ALIASES,
    placeholder: "Search monsters — hp:>=50000, drop:leather, respawn:<=10",
    footer: "Words AND · OR · Quotes · -negate · hp: / drop: / respawn:",
  },
  npc: {
    ops: NPC_OPS,
    aliases: NPC_ALIASES,
    placeholder: "Search NPCs — role:merchant, map:main, sells:hpot0",
    footer: "Words AND · OR · Quotes · -negate · role: / map: / sells: / is:",
  },
};

export function getSurfaceMeta(id: SearchContextId): SurfaceMeta {
  return SURFACE_META[id];
}

/** Canonical op names plus alias keys for trailing-field detection. */
export function trailingOpsFor(id: SearchContextId): readonly string[] {
  const meta = getSurfaceMeta(id);
  const names: string[] = [];
  for (const op of meta.ops) {
    names.push(op.name);
  }
  for (const alias of Object.keys(meta.aliases)) {
    names.push(alias);
  }
  return names;
}
