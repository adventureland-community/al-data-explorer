import {
  Box,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
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

function npcMapLabel(row: NpcCatalogRow): string {
  if (row.maps.length === 0) return "—";
  return row.maps.map((m) => mapDisplayLabel(m)).join(", ");
}

const NpcBrowseRow = memo(({ row }: { row: NpcCatalogRow }) => {
  const mapLabel = npcMapLabel(row);

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

const NpcBrowseCard = memo(({ row }: { row: NpcCatalogRow }) => {
  const mapLabel = npcMapLabel(row);
  const extras = [
    row.shopItemCount > 0 ? `${row.shopItemCount} shop` : null,
    row.token || null,
  ].filter(Boolean);

  return (
    <Box
      component={RouterLink}
      to={npcHref(row.id)}
      sx={{
        display: "flex",
        gap: 1.25,
        alignItems: "flex-start",
        px: 1.25,
        py: 1.25,
        textDecoration: "none",
        color: "inherit",
        borderBottom: 1,
        borderColor: "divider",
        minHeight: 64,
        "&:active": { backgroundColor: "action.selected" },
        "@media (hover: hover)": {
          "&:hover": { backgroundColor: "action.hover" },
        },
      }}
    >
      <Box
        sx={{
          width: 48,
          pt: 0.25,
          flexShrink: 0,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <NpcImage npcId={row.id} scale={1.2} tooltip={false} />
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Stack
          direction="row"
          spacing={0.75}
          alignItems="center"
          sx={{ flexWrap: "wrap", gap: 0.75 }}
        >
          <Typography variant="body2" noWrap sx={{ fontWeight: 600, minWidth: 0 }}>
            {row.name}
          </Typography>
          <Chip size="small" label={row.role} sx={{ height: 22, fontSize: 11 }} />
        </Stack>
        <Typography variant="caption" color="text.secondary" noWrap display="block">
          {row.id}
          {extras.length > 0 ? ` · ${extras.join(" · ")}` : ""}
        </Typography>
        {mapLabel !== "—" ? (
          <Typography
            variant="caption"
            color="text.secondary"
            title={mapLabel}
            sx={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              mt: 0.2,
              lineHeight: 1.35,
              textAlign: "left",
            }}
          >
            {mapLabel}
          </Typography>
        ) : null}
      </Box>
    </Box>
  );
});
NpcBrowseCard.displayName = "NpcBrowseCard";

export function NpcsBrowse() {
  const G = useContext(GDataContext);
  const theme = useTheme();
  const narrow = useMediaQuery(theme.breakpoints.down("md"), { noSsr: true });
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
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ display: { xs: "none", sm: "block" } }}
          >
            Merchants, quest givers, transporters, and townsfolk
          </Typography>
        </Box>
      }
      filters={
        <Paper sx={{ p: { xs: 1.25, sm: 2 } }}>
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
      {narrow ? (
        <Paper
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: "auto",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {rows.map((row) => (
            <NpcBrowseCard key={row.id} row={row} />
          ))}
        </Paper>
      ) : (
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
      )}
    </StickyListLayout>
  );
}
