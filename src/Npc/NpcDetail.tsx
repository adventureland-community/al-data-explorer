import {
  Box,
  Button,
  Chip,
  Grid,
  Link,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useContext, useMemo } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";

import { GDataContext, type CustomGData } from "../GDataContext";
import { getNpcDetail, mapDisplayLabel, type NpcDetailView } from "../gameData/npcCatalog";
import { worldFocusHref } from "../gameData/mapTravel";
import { ItemInstance } from "../Shared/ItemInstance";
import { LoadingState } from "../Shared/LoadingState";
import { NpcImage } from "../Shared/SpriteSkin";
import { NpcMapPathPreview } from "./NpcMapPathPreview";

function LocationCard({ detail, G }: { detail: NpcDetailView; G: CustomGData }) {
  if (detail.maps.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No map spawn recorded for this NPC.
      </Typography>
    );
  }

  return (
    <Stack spacing={3}>
      {detail.maps.map((loc) => (
        <Box key={`${loc.mapKey}-${loc.posX}-${loc.posY}`}>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            flexWrap="wrap"
            sx={{ mb: 1.25, gap: 0.75 }}
          >
            <Typography variant="subtitle2">{mapDisplayLabel(loc)}</Typography>
            <Typography variant="caption" color="text.secondary">
              {loc.mapKey}
              {loc.posX != null && loc.posY != null
                ? ` · (${Math.round(loc.posX)}, ${Math.round(loc.posY)})`
                : ""}
            </Typography>
            <Button
              href={worldFocusHref(loc.mapKey, loc.posX, loc.posY)}
              size="small"
              variant="text"
              sx={{ minWidth: 0, ml: "auto" }}
            >
              Open in World
            </Button>
          </Stack>
          <NpcMapPathPreview
            G={G}
            mapKey={loc.mapKey}
            npcName={detail.name}
            npcSkin={detail.skin}
            npcX={loc.posX}
            npcY={loc.posY}
          />
        </Box>
      ))}
    </Stack>
  );
}

export function NpcDetail() {
  const { npcId: rawId } = useParams();
  const npcId = rawId ? decodeURIComponent(rawId) : "";
  const G = useContext(GDataContext);

  const detail = useMemo(() => (G && npcId ? getNpcDetail(npcId, G) : null), [G, npcId]);

  if (!G) return <LoadingState label="Loading NPC…" />;
  if (!detail) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6">NPC not found</Typography>
        <Button component={RouterLink} to="/npcs" sx={{ mt: 1 }}>
          Back to NPCs
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 }, maxWidth: 1100, mx: "auto" }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <Button component={RouterLink} to="/npcs" size="small">
          ← NPCs
        </Button>
        {detail.worldHref ? (
          <Button href={detail.worldHref} size="small" variant="outlined">
            Open in World
          </Button>
        ) : null}
      </Stack>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Stack spacing={1.5} alignItems="center">
              <NpcImage npcId={detail.id} scale={2.4} tooltip={false} />
              <Box sx={{ textAlign: "center" }}>
                <Typography variant="h5">{detail.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {detail.id}
                </Typography>
              </Box>
              <Stack
                direction="row"
                spacing={0.75}
                flexWrap="wrap"
                justifyContent="center"
                sx={{ gap: 0.75 }}
              >
                <Chip size="small" label={detail.role} color="primary" variant="outlined" />
                {detail.quest ? <Chip size="small" label={`Quest: ${detail.quest}`} /> : null}
                {detail.token ? <Chip size="small" label={`Token: ${detail.token}`} /> : null}
                {detail.moving ? <Chip size="small" label="Moving" /> : null}
              </Stack>
            </Stack>
          </Paper>

          {(detail.says.length > 0 || detail.interaction.length > 0) && (
            <Paper sx={{ p: 2, mt: 2 }}>
              <Typography variant="overline" sx={{ opacity: 0.7 }}>
                Dialogue
              </Typography>
              <Stack spacing={0.75} sx={{ mt: 0.5 }}>
                {detail.says.map((line) => (
                  <Typography key={line} variant="body2" color="text.secondary">
                    “{line}”
                  </Typography>
                ))}
                {detail.interaction.map((line) => (
                  <Typography key={line} variant="body2">
                    {line}
                  </Typography>
                ))}
              </Stack>
            </Paper>
          )}
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="overline" sx={{ opacity: 0.7 }}>
              Location
            </Typography>
            <Box sx={{ mt: 1 }}>
              <LocationCard detail={detail} G={G} />
            </Box>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="overline" sx={{ opacity: 0.7 }}>
              Shop
            </Typography>
            {detail.shopItems.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                This NPC does not sell items.
              </Typography>
            ) : (
              <Table size="small" sx={{ mt: 1 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 56 }} />
                    <TableCell>Item</TableCell>
                    <TableCell align="right">Price</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detail.shopItems.map((row) => (
                    <TableRow key={`${row.slotIndex}-${row.itemKey}`} hover>
                      <TableCell>
                        <ItemInstance itemInfo={{ name: row.itemKey }} size={36} />
                      </TableCell>
                      <TableCell>
                        <Link component={RouterLink} to={`/items/${row.itemKey}`} variant="body2">
                          {row.name}
                        </Link>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {row.itemKey}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                        {row.priceLabel}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
