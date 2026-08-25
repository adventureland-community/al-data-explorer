import { Box, Card, CardContent, Tooltip, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { GSet, ItemKey } from "typed-adventureland";

import { getSetBonusTiers, getSetMemberKeys } from "../../gameData/itemSets";
import { CustomGData } from "../../GDataContext";
import { ItemInstance } from "../../Shared/ItemInstance";

const SLOT_SIZE = 48;

/** Set members + piece-count bonuses (mirrors in-game render_set). */
export function ItemSetCard({
  itemKey,
  setKey,
  set,
  G,
}: {
  itemKey: ItemKey;
  setKey: string;
  set: GSet;
  G: CustomGData;
}) {
  const members = getSetMemberKeys(set);
  const bonuses = getSetBonusTiers(set);
  if (members.length === 0 && bonuses.length === 0) return null;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {set.name ?? setKey}
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
          Item set
        </Typography>

        {members.length > 0 && (
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 1,
              mb: bonuses.length ? 2 : 0,
            }}
          >
            {members.map((memberKey) => {
              const member = G.items[memberKey];
              const isCurrent = memberKey === itemKey;
              const tip = member?.name
                ? `${member.name}${
                    member.name.toLowerCase() !== memberKey ? ` (${memberKey})` : ""
                  }`
                : memberKey;

              const slot = (
                <Box
                  sx={{
                    position: "relative",
                    width: SLOT_SIZE + 8,
                    height: SLOT_SIZE + 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 1,
                    border: "2px solid",
                    borderColor: isCurrent ? "primary.main" : "divider",
                    bgcolor: "action.hover",
                    filter: isCurrent ? "none" : "grayscale(35%)",
                    opacity: isCurrent ? 1 : 0.85,
                    overflow: "hidden",
                  }}
                >
                  <ItemInstance itemInfo={{ name: memberKey }} size={SLOT_SIZE} />
                </Box>
              );

              return (
                <Tooltip key={memberKey} title={tip} arrow>
                  {isCurrent ? (
                    <Box component="span" sx={{ display: "inline-flex" }}>
                      {slot}
                    </Box>
                  ) : (
                    <Box
                      component={RouterLink}
                      to={`/items/${memberKey}`}
                      sx={{ display: "inline-flex", textDecoration: "none", color: "inherit" }}
                    >
                      {slot}
                    </Box>
                  )}
                </Tooltip>
              );
            })}
          </Box>
        )}

        {bonuses.length > 0 && (
          <Box>
            <Typography variant="subtitle2" sx={{ opacity: 0.8, mb: 0.5 }}>
              Set bonuses
            </Typography>
            {bonuses.map((tier) => (
              <Box key={tier.count} sx={{ mb: 0.75 }}>
                <Typography variant="body2" component="span" sx={{ fontWeight: 600, mr: 1 }}>
                  [{tier.label} equipped]
                </Typography>
                <Typography variant="body2" component="span" color="text.secondary">
                  {tier.stats.map((s) => `${s.label} ${s.value}`).join(" · ")}
                </Typography>
              </Box>
            ))}
          </Box>
        )}

        {typeof set.explanation === "string" && set.explanation && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {set.explanation}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
