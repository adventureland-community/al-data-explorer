import { Card, CardContent, Typography } from "@mui/material";
import { ItemKey } from "typed-adventureland";

import { getItemUses } from "../../gameData/itemUses";
import { CustomGData } from "../../GDataContext";
import { ExchangeRewardList, TokenSpendList } from "../../Shared/ItemSourceRows";

export function ItemUsesPanel({ itemKey, G }: { itemKey: ItemKey; G: CustomGData }) {
  const uses = getItemUses(itemKey, G);
  if (!uses.hasUses) return null;

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent sx={{ "&:last-child": { pb: 2 } }}>
        <Typography variant="h6" sx={{ mb: 0.5 }}>
          What can I use this for
        </Typography>
        <TokenSpendList vendors={uses.tokenVendors} />
        <ExchangeRewardList rewards={uses.exchangeRewards} merchant={uses.exchangeNpc} />
      </CardContent>
    </Card>
  );
}
