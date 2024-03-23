import { useState, useEffect, useContext } from "react";

import { ItemKey, ItemType, TitleKey } from "typed-adventureland";
import { Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import { getBankData, BankDataProps } from "./getBankData";
import { GDataContext } from "../GDataContext";
import { ItemInstance } from "../Shared/ItemInstance";

type BankRenderProps = {
  ownerId: string;
};

export function BankRender(props: BankRenderProps) {
  const G = useContext(GDataContext);
  const { ownerId } = props;

  const [bankData, setBankData] = useState<BankDataProps>({});
  const [owner, setOwner] = useState<string>("");

  useEffect(() => {
    if (!Object.keys(bankData).length) {
      getBankData(ownerId).then((newBankData) => {
        if (Object.keys(newBankData).length) {
          setBankData({ ...newBankData });
        }
      });
    }

    if (owner !== ownerId) {
      setOwner(ownerId);
      setBankData({});
    }
  }, [bankData, owner, ownerId]);

  if (!Object.keys(bankData).length) {
    return <></>;
  }

  const types: { [key in ItemType | "exchange" | "other"]?: string } = {
    helmet: "Helmets",
    chest: "Armors",
    pants: "Pants",
    gloves: "Gloves",
    shoes: "Shoes",
    cape: "Capes",
    ring: "Rings",
    earring: "Earrings",
    amulet: "Amulets",
    belt: "Belts",
    orb: "Orbs",
    weapon: "Weapons",
    shield: "Shields",
    source: "Offhands",
    quiver: "Offhands",
    misc_offhand: "Offhands",
    elixir: "Elixirs",
    pot: "Potions",
    cscroll: "Scrolls",
    uscroll: "Scrolls",
    pscroll: "Scrolls",
    offering: "Scrolls",
    material: "Crafting and Collecting",
    exchange: "Exchangeables",
    dungeon_key: "Keys",
    token: "Tokens",
    other: "Others",
  };

  const items = [];
  const itemsByKey: Record<string, any> = {};
  // eslint-disable-next-line guard-for-in
  for (const bankKey in bankData) {
    const bankItems = bankData[bankKey];
    if (!Array.isArray(bankItems)) continue;
    for (const item of bankItems) {
      if (!item) continue;
      const key = `${item.p ?? ""}${item.level}${item.name}`;
      let data = itemsByKey[key];
      if (!data) {
        const itemKey = item.name as ItemKey;
        const gItem = G?.items[itemKey];
        let type = (gItem && types[gItem.type]) ?? "Others";

        if (gItem && gItem.e) {
          type = types.exchange ?? "Others";
        }

        data = { p: item.p, level: item.level, name: item.name, q: 0, stack: 0, category: type };
        itemsByKey[key] = data;
        items.push(data);
      }
      data.q += item.q ?? 1;
      data.stack++;
    }
  }

  const sortedGroupKeys = [...new Set(Object.values(types))]; // .sort((a, b) => a.localeCompare(b));

  // default sort by name
  items.sort((a, b) => {
    if (a.category !== b.category) {
      return sortedGroupKeys.indexOf(a.category) - sortedGroupKeys.indexOf(b.category);
    }

    if (a.name === b.name) {
      return b.level - a.level;
    }
    return a.name.localeCompare(b.name);
  });

  const tshirtNames: { [key in ItemKey]?: string } = {
    tshirt88: "Lucky", // Luck and all
    tshirt9: "Manasteal", // Manasteal
    tshirt3: "XP", // XP
    tshirt8: "Attack MP", // Attack MP cost
    tshirt7: "Armor piercing", // Armor piercing
    tshirt6: "Res. piercing", // Res. piercing
    tshirt4: "Speed", // Speed
  };

  return (
    <>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell width={100}>Category</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Level</TableCell>
            <TableCell>Quantity</TableCell>
            <TableCell>Stacks</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((x) => {
            const itemKey = x.name as ItemKey;
            const gItem = G?.items[itemKey];
            if (!gItem) return <></>;
            const titleKey = x.p as TitleKey;

            const stackSize = Number(gItem.s);
            const stackCount = x.stack;
            const optimalStackCount = Math.ceil(x.q / stackSize);
            const optimalStackCountMessage =
              stackCount > optimalStackCount ? `⚠️${optimalStackCount}` : "";

            const titleName = titleKey && G.titles[titleKey] ? `${G.titles[titleKey].title} ` : "";

            const itemName =
              itemKey in tshirtNames ? `${tshirtNames[itemKey]} ${gItem.name}` : gItem.name;

            // itemContainer.attr(
            //   "title",
            //   `${titleName}${itemName}${
            //     Number(level) > 0 ? `+${level}` : ""
            //   }\n${itemKey}\n${stackCount} stacks ${optimalStackCountMessage}`,
            // );

            return (
              <TableRow hover>
                <TableCell component="td">{x.category}</TableCell>
                <TableCell component="td">
                  <div style={{ display: "inline-block" }}>
                    <ItemInstance itemInfo={x} />
                  </div>
                  <div style={{ marginLeft: "10px", display: "inline-block" }}>
                    <div>
                      {titleName}
                      {itemName}
                    </div>
                    <div style={{ color: "grey" }}>{x.name}</div>
                  </div>
                </TableCell>
                <TableCell component="td">{x.level}</TableCell>
                <TableCell component="td">{x.q}</TableCell>
                <TableCell component="td">
                  {x.stack}
                  {optimalStackCountMessage}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </>
  );
}
