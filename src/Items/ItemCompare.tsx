import { Box, Typography } from "@mui/material";
import { useContext } from "react";
import { Link as RouterLink, useNavigate, useSearchParams } from "react-router-dom";
import { ItemKey } from "typed-adventureland";

import { GDataContext } from "../GDataContext";
import { LoadingState } from "../Shared/LoadingState";
import { ItemBalanceMatrix } from "./components/ItemBalanceMatrix";
import { effectLookupsFromG } from "../gameData/itemEffects";

export function ItemCompare() {
  const G = useContext(GDataContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  if (!G) {
    return <LoadingState />;
  }

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
        Click a row to open the item page.
      </Typography>
      <ItemBalanceMatrix
        items={G.items}
        effectLookups={effectLookupsFromG(G)}
        onRowClick={(itemKey: ItemKey) => {
          const show = searchParams.get("show");
          navigate(
            show
              ? `/items/${itemKey}?from=${encodeURIComponent(`show=${show}`)}`
              : `/items/${itemKey}`,
          );
        }}
      />
    </Box>
  );
}
