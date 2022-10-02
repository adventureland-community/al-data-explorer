import { Tooltip, TooltipProps } from "@mui/material";
import { ItemName } from "adventureland";
import { useContext } from "react";
import { GDataContext } from "./GDataContext";

export function ItemTooltip({
  itemName,
  children,
}: {
  itemName: ItemName;
  children: React.ReactElement<any, any>;
}) {
  const G = useContext(GDataContext);

  if (!G) return <></>;

  const gItem = G.items[itemName];
  if (!gItem) return <></>;
  // what about items with enchants and such, then we need an item instance, not just the itemname
  // TODO: handle level and render correct stats for upgrade / compound
  return (
    <Tooltip
      followCursor
      children={children}
      title={
        <>
          {itemName}
          <br />
          {Object.entries(gItem).map(([key, value]) => {
            if (typeof value === "number") {
              return (
                <>
                  {key}: {value} <br />
                </>
              );
            }
          })}
        </>
      }
    />
  );
}
