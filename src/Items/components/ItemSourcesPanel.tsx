import { Card, CardContent, Typography } from "@mui/material";
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

export function ItemSourcesPanel({ itemKey, G }: { itemKey: ItemKey; G: CustomGData }) {
  const acquisition = getItemAcquisition(itemKey, G);

  return (
    <Card>
      <CardContent sx={{ "&:last-child": { pb: 2 } }}>
        <Typography variant="h6" sx={{ mb: 0.5 }}>
          Where to get it
        </Typography>

        {!acquisition.hasSources && (
          <Typography variant="body2" color="text.secondary">
            No known drop, shop, token, or exchange sources for this item.
          </Typography>
        )}

        <NpcShopSourceList shops={acquisition.shops} />
        <TokenOfferList offers={acquisition.tokens} />
        <ExchangeSourceList exchanges={acquisition.exchanges} />
        <DropSourceList drops={acquisition.drops} />

        <ItemMarketOffers itemKey={itemKey} />
      </CardContent>
    </Card>
  );
}
