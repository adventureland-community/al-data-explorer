import { getSurfaceMeta, trailingOpsFor, SURFACE_META } from "./opsTables";
import type { SearchContextId, SearchContextProfile } from "./types";

export function getSearchContextProfile(id: SearchContextId): SearchContextProfile {
  const meta = getSurfaceMeta(id);
  return {
    id,
    trailingOps: trailingOpsFor(id),
    aliases: meta.aliases,
    placeholder: meta.placeholder,
    footer: meta.footer,
  };
}

export function listSearchContextIds(): SearchContextId[] {
  return Object.keys(SURFACE_META) as SearchContextId[];
}
