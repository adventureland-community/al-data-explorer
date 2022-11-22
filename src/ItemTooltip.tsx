import { Tooltip, TooltipProps } from "@mui/material";
import { ItemKey } from "typed-adventureland";
import { useContext } from "react";
import { GDataContext } from "./GDataContext";
import { calculateItemStatsByLevel } from "./Utils";

export function ItemTooltip({
    itemName,
    level,
    children,
}: {
    itemName: ItemKey;
    level?: number;
    children: React.ReactElement<any, any>;
}) {
    const G = useContext(GDataContext);

    if (!G) return <>{children}</>;

    const gItem = G.items[itemName];
    if (!gItem) return <>{children}</>;
    // what about items with enchants and such, then we need an item instance, not just the itemname
    // TODO: handle level and render correct stats for upgrade / compound
    const stats = calculateItemStatsByLevel(gItem, level);
    return (
        <Tooltip
            followCursor
            children={children}
            title={
                <>
                    {itemName}
                    <br />
                    {Object.entries(stats).map(([key, value]) => {
                        if (typeof value === "number") {
                            return (
                                <span key={key}>
                                    {key}: {value} <br />
                                </span>
                            );
                        }
                    })}
                </>
            }
        />
    );
}
