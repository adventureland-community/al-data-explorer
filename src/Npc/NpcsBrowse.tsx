import {
  Box,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";

import { GDataContext } from "../GDataContext";
import {
  listNpcCatalog,
  mapDisplayLabel,
  npcHref,
  npcMapKeysInCatalog,
  npcRolesInCatalog,
  type NpcCatalogRow,
} from "../gameData/npcCatalog";
import { LoadingState } from "../Shared/LoadingState";
import { QuerySearchBar } from "../Shared/QuerySearchBar";
import { NpcImage } from "../Shared/SpriteSkin";
import { StickyListLayout, StickyTableShell } from "../Shared/StickyListLayout";
import { EMPTY_NPC_ADVANCED, NpcAdvancedSearchPanel } from "./NpcAdvancedSearchPanel";
import {
  buildNpcSearchSuggestions,
  npcAdvancedFromQuery,
  npcAdvancedHasValues,
  npcMatchesSearch,
  parseNpcSearchQuery,
  serializeLegacyNpcFacets,
  serializeNpcAdvancedForm,
  type NpcAdvancedForm,
} from "./npcSearchQuery";

const NpcBrowseRow = memo(({ row }: { row: NpcCatalogRow }) => {
  const mapLabel = row.maps.length === 0 ? "—" : row.maps.map((m) => mapDisplayLabel(m)).join(", ");

  return (
    <TableRow hover component={RouterLink} to={npcHref(row.id)} sx={{ textDecoration: "none" }}>
      <TableCell sx={{ width: 72, py: 0.75 }}>
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <NpcImage npcId={row.id} scale={1.35} tooltip={false} />
        </Box>
      </TableCell>
      <TableCell>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {row.name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {row.id}
        </Typography>
      </TableCell>
      <TableCell>
        <Chip size="small" label={row.role} />
      </TableCell>
      <TableCell>
        <Typography variant="body2" color="text.secondary" noWrap title={mapLabel}>
          {mapLabel}
        </Typography>
      </TableCell>
      <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
        {row.shopItemCount || "—"}
      </TableCell>
      <TableCell>
        {row.token ? (
          <Typography variant="caption" color="text.secondary">
            {row.token}
          </Typography>
        ) : (
          "—"
        )}
      </TableCell>
    </TableRow>
  );
});
NpcBrowseRow.displayName = "NpcBrowseRow";

export function NpcsBrowse() {
  const G = useContext(GDataContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const migratedRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NpcAdvancedForm>(EMPTY_NPC_ADVANCED);

  // Migrate legacy `q` / `role` / `map` facets into `search`.
  useEffect(() => {
    if (migratedRef.current) return;
    const legacyQ = (searchParams.get("q") ?? "").trim();
    const roles = searchParams.getAll("role");
    const maps = searchParams.getAll("map");
    const existingSearch = (searchParams.get("search") ?? "").trim();
    const hasLegacy = Boolean(legacyQ || roles.length || maps.length);
    if (!hasLegacy) {
      migratedRef.current = true;
      return;
    }
    migratedRef.current = true;
    const folded = [existingSearch, legacyQ, serializeLegacyNpcFacets({ roles, mapKeys: maps })]
      .filter(Boolean)
      .join(" ")
      .trim();
    const next = new URLSearchParams(searchParams);
    next.delete("q");
    next.delete("role");
    next.delete("map");
    if (folded) next.set("search", folded);
    else next.delete("search");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const search = searchParams.get("search") ?? "";

  const setSearch = useCallback(
    (next: string) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          if (next.trim()) params.set("search", next.trim());
          else params.delete("search");
          params.delete("q");
          params.delete("role");
          params.delete("map");
          return params;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  useEffect(() => {
    if (!open) return;
    setForm(npcAdvancedFromQuery(parseNpcSearchQuery(search)));
  }, [open, search]);

  const catalog = useMemo(() => (G ? listNpcCatalog(G) : []), [G]);
  const roleOptions = useMemo(() => npcRolesInCatalog(catalog), [catalog]);
  const mapOptions = useMemo(() => npcMapKeysInCatalog(catalog), [catalog]);
  const rows = useMemo(
    () => catalog.filter((row) => npcMatchesSearch(row, search)),
    [catalog, search],
  );

  const suggestions = useMemo(
    () => (draft: string) =>
      buildNpcSearchSuggestions(draft, { roles: roleOptions, mapKeys: mapOptions }),
    [mapOptions, roleOptions],
  );

  if (!G) return <LoadingState label="Loading NPCs…" />;

  return (
    <StickyListLayout
      toolbar={
        <Box>
          <Typography variant="h5">NPCs</Typography>
          <Typography variant="body2" color="text.secondary">
            Merchants, quest givers, transporters, and townsfolk
          </Typography>
        </Box>
      }
      filters={
        <Paper sx={{ p: 2 }}>
          <QuerySearchBar
            context="npc"
            value={search}
            onChange={setSearch}
            suggestions={suggestions}
            advanced={{
              open,
              onToggle: () => setOpen((v) => !v),
              onClose: () => setOpen(false),
              content: (
                <NpcAdvancedSearchPanel
                  form={form}
                  onChange={setForm}
                  onApply={() => {
                    setSearch(serializeNpcAdvancedForm(form));
                    setOpen(false);
                  }}
                  onClear={() => {
                    setForm(EMPTY_NPC_ADVANCED);
                    setSearch("");
                    setOpen(false);
                  }}
                />
              ),
              active: Boolean(search.trim()) || npcAdvancedHasValues(form),
            }}
          />
          <Chip label={`${rows.length} NPCs`} size="small" sx={{ mt: 1.5 }} />
        </Paper>
      }
    >
      <StickyTableShell>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>Name</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Maps</TableCell>
              <TableCell align="right">Shop</TableCell>
              <TableCell>Token</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <NpcBrowseRow key={row.id} row={row} />
            ))}
          </TableBody>
        </Table>
      </StickyTableShell>
    </StickyListLayout>
  );
}
