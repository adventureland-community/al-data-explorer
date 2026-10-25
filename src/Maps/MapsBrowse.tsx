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
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { memo, useContext, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";

import { GDataContext } from "../GDataContext";
import {
  filterMapCatalog,
  listMaps,
  mapDetailHref,
  type MapCatalogRow,
} from "../gameData/mapCatalog";
import { LoadingState } from "../Shared/LoadingState";
import { StickyListLayout, StickyTableShell } from "../Shared/StickyListLayout";

const MapBrowseRow = memo(({ row }: { row: MapCatalogRow }) => (
  <TableRow
    hover
    component={RouterLink}
    to={mapDetailHref(row.key)}
    sx={{ textDecoration: "none" }}
  >
    <TableCell>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {row.name}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {row.key}
      </Typography>
    </TableCell>
    <TableCell>
      <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap", gap: 0.5 }}>
        <Chip size="small" label={row.outside ? "Outside" : "Indoor"} variant="outlined" />
        {row.instance ? <Chip size="small" label="Instance" /> : null}
        {row.unlisted ? <Chip size="small" label="Unlisted" /> : null}
      </Stack>
    </TableCell>
    <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
      {row.monsterCount || "—"}
    </TableCell>
    <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
      {row.npcCount || "—"}
    </TableCell>
  </TableRow>
));
MapBrowseRow.displayName = "MapBrowseRow";

const MapBrowseCard = memo(({ row }: { row: MapCatalogRow }) => (
  <Box
    component={RouterLink}
    to={mapDetailHref(row.key)}
    sx={{
      display: "block",
      px: 1.25,
      py: 1.25,
      textDecoration: "none",
      color: "inherit",
      borderBottom: 1,
      borderColor: "divider",
      "&:active": { backgroundColor: "action.selected" },
      "@media (hover: hover)": {
        "&:hover": { backgroundColor: "action.hover" },
      },
    }}
  >
    <Typography variant="body2" sx={{ fontWeight: 600 }}>
      {row.name}
    </Typography>
    <Typography variant="caption" color="text.secondary" display="block">
      {row.key}
      {row.monsterCount > 0 ? ` · ${row.monsterCount} monsters` : ""}
      {row.npcCount > 0 ? ` · ${row.npcCount} NPCs` : ""}
    </Typography>
    <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: "wrap", gap: 0.5 }}>
      <Chip
        size="small"
        label={row.outside ? "Outside" : "Indoor"}
        sx={{ height: 22, fontSize: 11 }}
      />
      {row.instance ? (
        <Chip size="small" label="Instance" sx={{ height: 22, fontSize: 11 }} />
      ) : null}
    </Stack>
  </Box>
));
MapBrowseCard.displayName = "MapBrowseCard";

export function MapsBrowse() {
  const G = useContext(GDataContext);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"), { noSsr: true });
  const [search, setSearch] = useState("");

  const rows = useMemo(() => (G ? listMaps(G) : []), [G]);
  const filtered = useMemo(() => filterMapCatalog(rows, { search }), [rows, search]);

  if (!G) return <LoadingState label="Loading maps…" />;

  return (
    <StickyListLayout
      toolbar={
        <Box>
          <Typography variant="h5" sx={{ mb: 1 }}>
            Maps
          </Typography>
          <TextField
            size="small"
            fullWidth
            placeholder="Search maps…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: "block" }}>
            {filtered.length} map{filtered.length === 1 ? "" : "s"}
          </Typography>
        </Box>
      }
    >
      {isMobile ? (
        <Paper variant="outlined" sx={{ borderRadius: 0, borderLeft: 0, borderRight: 0 }}>
          {filtered.map((row) => (
            <MapBrowseCard key={row.key} row={row} />
          ))}
        </Paper>
      ) : (
        <StickyTableShell>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Map</TableCell>
                <TableCell>Flags</TableCell>
                <TableCell align="right">Monsters</TableCell>
                <TableCell align="right">NPCs</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((row) => (
                <MapBrowseRow key={row.key} row={row} />
              ))}
            </TableBody>
          </Table>
        </StickyTableShell>
      )}
    </StickyListLayout>
  );
}
