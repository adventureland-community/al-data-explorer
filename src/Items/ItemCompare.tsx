import { Box, Typography } from "@mui/material";
import { useContext } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { ItemKey } from "typed-adventureland";

import { GDataContext } from "../GDataContext";
import { effectLookupsFromG } from "../gameData/itemEffects";
import { LoadingState } from "../Shared/LoadingState";
import { ItemBalanceMatrix } from "./components/ItemBalanceMatrix";

export function ItemCompare() {
  const G = useContext(GDataContext);
  const [searchParams] = useSearchParams();

  if (!G) {
    return <LoadingState />;
  }

  const itemHref = (itemKey: ItemKey) => {
    const show = searchParams.get("show");
    return show
      ? `/items/${itemKey}?from=${encodeURIComponent(`show=${show}`)}`
      : `/items/${itemKey}`;
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography
        component={RouterLink}
        to="/items"
        variant="body2"
        sx={{ display: "inline-block", mb: 1, textDecoration: "none", color: "primary.main" }}
      >
        ← All items
      </Typography>
      <Typography variant="h5" gutterBottom>
        Item balance matrix
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Search by name, type, or wtype — add one item or all matching — then scan upgrade levels.
        Click an item name to open its page (Ctrl/Cmd-click for a new tab).
      </Typography>
      <ItemBalanceMatrix
        items={G.items}
        effectLookups={effectLookupsFromG(G)}
        itemHref={itemHref}
      />
    </Box>
  );
}
