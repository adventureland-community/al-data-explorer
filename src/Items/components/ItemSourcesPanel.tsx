import { Box, Card, CardContent, Link, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { ItemKey } from "typed-adventureland";

import { getItemAcquisition } from "../../gameData/itemAcquisition";
import { CustomGData } from "../../GDataContext";
import {
  DropSourceList,
  ExchangeSourceList,
  NpcShopSourceList,
  TokenOfferList,
} from "../../Shared/ItemSourceRows";
import { ItemMarketOffers } from "./ItemMarketOffers";

export function ItemSourcesPanel({
  itemKey,
  G,
  compact = false,
  showMarket = true,
}: {
  itemKey: ItemKey;
  G: CustomGData;
  compact?: boolean;
  showMarket?: boolean;
}) {
  const acquisition = getItemAcquisition(itemKey, G);

  const body = (
    <>
      {!acquisition.hasSources && (
        <Typography variant="body2" color="text.secondary">
          No known drop, shop, token, exchange, craft, or dismantle sources for this item.
        </Typography>
      )}

      <NpcShopSourceList shops={acquisition.shops} />
      <TokenOfferList offers={acquisition.tokens} />
      <ExchangeSourceList exchanges={acquisition.exchanges} />
      <DropSourceList drops={acquisition.drops} />

      {acquisition.crafts.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            Craft / dismantle
          </Typography>
          <Stack spacing={0.5}>
            {acquisition.crafts.map((craft) => (
              <Typography key={`${craft.kind}-${craft.label}`} variant="body2">
                {craft.linkTo ? (
                  <Link component={RouterLink} to={craft.linkTo}>
                    {craft.label}
                  </Link>
                ) : (
                  craft.label
                )}
                {craft.secondary ? (
                  <Typography component="span" variant="caption" color="text.secondary">
                    {" "}
                    · {craft.secondary}
                  </Typography>
                ) : null}
              </Typography>
            ))}
          </Stack>
        </Box>
      )}

      {showMarket && <ItemMarketOffers itemKey={itemKey} />}
    </>
  );

  if (compact) {
    return (
      <Box sx={{ p: 1 }}>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          Where to get it
        </Typography>
        {body}
      </Box>
    );
  }

  return (
    <Card>
      <CardContent sx={{ "&:last-child": { pb: 2 } }}>
        <Typography variant="h6" sx={{ mb: 0.5 }}>
          Where to get it
        </Typography>
        {body}
      </CardContent>
    </Card>
  );
}
