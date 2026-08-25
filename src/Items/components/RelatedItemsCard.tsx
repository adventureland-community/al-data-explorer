import { Box, Card, CardContent, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { ItemKey } from "typed-adventureland";

import { getRelatedItemGroups } from "../../gameData/related-items";
import { CustomGData } from "../../GDataContext";
import { ItemInstance } from "../../Shared/ItemInstance";

/**
 * Non-craft related groups (series, gems, offerings, etc.).
 * Craft chain / used-in and item sets are shown in their own cards.
 */
export function RelatedItemsCard({ itemKey, G }: { itemKey: ItemKey; G: CustomGData }) {
  const groups = getRelatedItemGroups(itemKey, { items: G.items });

  if (groups.length === 0) return null;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Related items
        </Typography>
        {groups.map((group) => (
          <Box key={group.id} sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>
              {group.label}
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mt: 0.5 }}>
              {group.items.map((ref) => {
                const name = G.items[ref.itemKey as ItemKey]?.name ?? ref.itemKey;
                const showKey = name.toLowerCase() !== ref.itemKey.toLowerCase();
                return (
                  <Box
                    key={`${ref.itemKey}-${ref.level ?? 0}`}
                    component={RouterLink}
                    to={`/items/${ref.itemKey}${ref.level ? `?level=${ref.level}` : ""}`}
                    sx={{
                      textDecoration: "none",
                      color: "inherit",
                      textAlign: "center",
                      width: 76,
                    }}
                  >
                    <ItemInstance itemInfo={{ name: ref.itemKey as ItemKey, level: ref.level }} />
                    <Typography variant="caption" display="block" noWrap title={name}>
                      {name}
                    </Typography>
                    {showKey && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                        noWrap
                        title={ref.itemKey}
                      >
                        {ref.itemKey}
                      </Typography>
                    )}
                    {ref.quantity != null && ref.quantity > 1 && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        ×{ref.quantity}
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </Box>
          </Box>
        ))}
      </CardContent>
    </Card>
  );
}
