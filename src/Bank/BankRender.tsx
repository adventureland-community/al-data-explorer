import { useState, useEffect, useContext } from "react";
import GridViewIcon from "@mui/icons-material/GridView";
import ViewCompactIcon from "@mui/icons-material/ViewCompact";
import ViewListIcon from "@mui/icons-material/ViewList";
import { ItemKey, ItemType } from "typed-adventureland";
import {
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  Radio,
  RadioGroup,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import { getBankData, BankDataProps } from "./getBankData";
import { GDataContext } from "../GDataContext";
import { ItemInstance } from "../Shared/ItemInstance";
import { abbreviateNumber, msToTime } from "../Shared/utils";
import { getItemName, getTitleName } from "../Shared/iteminfo-util";
import { getLevelString } from "../Utils";

type BankRenderProps = {
  ownerId: string;
};

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

function getUniqueItemKey(item: any) {
  return `${item.p ?? ""}${item.level}${item.name}`;
}

function BankTableView({ items }: { items: any[] }) {
  const G = useContext(GDataContext);

  return (
    <Table stickyHeader size="small">
      <TableHead>
        <TableRow>
          <TableCell component="th" width={100}>
            Category
          </TableCell>
          <TableCell component="th" width={100} align="right">
            Quantity
          </TableCell>
          <TableCell component="th">Name</TableCell>
          <TableCell component="th">Level</TableCell>
          <TableCell component="th">Stacks</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {items.map((itemInfo) => {
          const itemKey = itemInfo.name as ItemKey;
          const gItem = G?.items[itemKey];
          if (!gItem) return <></>;

          const stackSize = Number(gItem.s);
          const stackCount = itemInfo.stack;
          const optimalStackCount = Math.ceil(itemInfo.q / stackSize);
          const optimalStackCountMessage =
            stackCount > optimalStackCount ? `⚠️${optimalStackCount}` : "";

          const titleName = getTitleName(itemInfo, G);

          const itemName = getItemName(itemKey, gItem);

          // itemContainer.attr(
          //   "title",
          //   `${titleName}${itemName}${
          //     Number(level) > 0 ? `+${level}` : ""
          //   }\n${itemKey}\n${stackCount} stacks ${optimalStackCountMessage}`,
          // );
          return (
            <TableRow key={getUniqueItemKey(itemInfo)} hover>
              <TableCell component="td">{itemInfo.category}</TableCell>
              <TableCell component="td" align="right" title={itemInfo.q.toLocaleString()}>
                {abbreviateNumber(itemInfo.q)}
              </TableCell>
              <TableCell component="td">
                <div style={{ display: "inline-block" }}>
                  <ItemInstance itemInfo={itemInfo} />
                </div>
                <div style={{ marginLeft: "10px", display: "inline-block" }}>
                  <div>
                    {titleName}
                    {itemName}
                  </div>
                  <div style={{ color: "grey" }}>{itemInfo.name}</div>
                </div>
              </TableCell>
              <TableCell component="td">{itemInfo.level}</TableCell>
              <TableCell component="td">
                {itemInfo.stack}
                {optimalStackCountMessage}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function BankGridViewItemRow({ items }: { items: any[] }) {
  const G = useContext(GDataContext);

  return (
    <div style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: "2px" }}>
      {items.map((itemInfo) => {
        const itemKey = itemInfo.name as ItemKey;
        const gItem = G?.items[itemKey];
        if (!gItem) return <></>;
        const titleName = getTitleName(itemInfo, G);

        const itemName = getItemName(itemKey, gItem);

        const levelString = getLevelString(gItem, itemInfo.level);

        let htmlTitle = itemName;
        if (titleName) {
          htmlTitle = `${titleName} ${htmlTitle}`;
        }

        if (levelString) {
          htmlTitle = `+${levelString} ${htmlTitle}`;
        }

        htmlTitle += `\n${itemKey}`;
        // htmlTitle += `\n${itemInfo.category}`;
        htmlTitle += `\n${gItem.type}`;

        return (
          <div key={getUniqueItemKey(itemInfo)} title={htmlTitle}>
            <ItemInstance showQuantity itemInfo={itemInfo} />
          </div>
        );
      })}
    </div>
  );
}

function BankGridView({
  items,
  itemsByCategory,
  showCategory,
}: {
  items: any[];
  itemsByCategory: Record<string, any[]>;
  showCategory: boolean;
}) {
  const sortedGroupKeys = [...new Set(Object.values(types))]; // .sort((a, b) => a.localeCompare(b));

  return (
    <>
      <div style={{ width: "100%" }}>
        {showCategory ? (
          sortedGroupKeys.map((category) => {
            const categoryItems = itemsByCategory[category];
            if (!categoryItems) return <></>;
            return (
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: "2px",
                  alignItems: "center",
                }}
              >
                <h1>{category}</h1>
                <BankGridViewItemRow items={categoryItems} />
              </div>
            );
          })
        ) : (
          <BankGridViewItemRow items={items} />
        )}
      </div>
    </>
  );
}

export function BankRender(props: BankRenderProps) {
  const G = useContext(GDataContext);
  const { ownerId } = props;

  const [bankData, setBankData] = useState<BankDataProps>({});
  const [owner, setOwner] = useState<string>("");
  const [renderMode, setRenderMode] = useState<"list" | "grid" | "gridCompact">("gridCompact");
  const [sortMode, setSortMode] = useState<"category" | "quantity" | "stack">("category");

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

  const onSortModeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSortMode((event.target as HTMLInputElement).value as any);
  };

  let usedSlots = 0;
  let totalSlots = 0;
  const items = [];
  const itemsByKey: Record<string, any> = {};
  const itemsByCategory: Record<string, any> = {};
  // itemsByCategory
  // eslint-disable-next-line guard-for-in
  for (const bankKey in bankData) {
    const bankItems = bankData[bankKey];
    if (!Array.isArray(bankItems)) continue;

    totalSlots += 42;

    for (const item of bankItems) {
      if (!item) continue;

      usedSlots++;

      const key = getUniqueItemKey(item);
      let data = itemsByKey[key];
      if (!data) {
        const itemKey = item.name as ItemKey;
        const gItem = G?.items[itemKey];
        let category = (gItem && types[gItem.type]) ?? "Others";

        if (gItem && gItem.e) {
          category = types.exchange ?? "Others";
        }

        data = {
          p: item.p,
          level: item.level,
          name: item.name,
          q: 0,
          stack: 0,
          category,
          type: gItem?.type ?? undefined,
        };

        itemsByKey[key] = data;

        items.push(data);

        if (!itemsByCategory[category]) {
          itemsByCategory[category] = [];
        }
        itemsByCategory[category].push(data);
      }
      data.q += item.q ?? 1;
      data.stack++;
    }
  }

  const sortedGroupKeys = [...new Set(Object.values(types))]; // .sort((a, b) => a.localeCompare(b));

  // default sort by name
  items.sort((a, b) => {
    if (sortMode === "stack" && a.stack !== b.stack) {
      // DESC
      return b.stack - a.stack;
    }

    if (sortMode === "quantity" && a.q !== b.q) {
      // DESC
      return b.q - a.q;
    }

    if (a.category !== b.category) {
      return sortedGroupKeys.indexOf(a.category) - sortedGroupKeys.indexOf(b.category);
    }

    if (a.type !== b.type) {
      // ASC
      return a.type.localeCompare(b.type);
    }

    if (a.name !== b.name) {
      // ASC
      return a.name.localeCompare(b.name);
    }

    // DESC
    return b.level - a.level;
  });

  const lastUpdated = bankData.lastUpdated ? new Date(bankData.lastUpdated) : undefined;
  const lastUpdateAgo = lastUpdated ? msToTime(new Date().getTime() - lastUpdated.getTime()) : "";

  return (
    <>
      <Grid container>
        <Grid xs={4}>
          <FormControl>
            <FormLabel id="demo-controlled-radio-buttons-group">Sorting</FormLabel>
            <RadioGroup
              row
              aria-labelledby="demo-controlled-radio-buttons-group"
              name="controlled-radio-buttons-group"
              value={sortMode}
              onChange={onSortModeChange}
            >
              <FormControlLabel value="category" control={<Radio />} label="Category" />
              <FormControlLabel value="quantity" control={<Radio />} label="Quantity" />
              <FormControlLabel value="stack" control={<Radio />} label="Stack" />
            </RadioGroup>
          </FormControl>
        </Grid>
      </Grid>
      <Grid container>
        <Grid xs={4}>
          {usedSlots} / {totalSlots} ({totalSlots - usedSlots})
        </Grid>

        <Grid xs={4}>
          {lastUpdated?.toLocaleString()} ({lastUpdateAgo} Ago)
        </Grid>
        <Grid xs={4} container justifyContent="right">
          <ViewCompactIcon
            titleAccess="Show Compact Grid"
            style={{ cursor: "pointer" }}
            onClick={() => setRenderMode("gridCompact")}
            color={renderMode === "gridCompact" ? "primary" : "secondary"}
          />
          <ViewListIcon
            titleAccess="Show List"
            style={{ cursor: "pointer" }}
            onClick={() => setRenderMode("list")}
            color={renderMode === "list" ? "primary" : "secondary"}
          />
          <GridViewIcon
            titleAccess="Show Grid"
            style={{ cursor: "pointer" }}
            onClick={() => setRenderMode("grid")}
            color={renderMode === "grid" ? "primary" : "secondary"}
          />
        </Grid>
      </Grid>

      {(renderMode === "grid" || renderMode === "gridCompact") && (
        <BankGridView
          showCategory={renderMode === "grid"}
          items={items}
          itemsByCategory={itemsByCategory}
        />
      )}
      {renderMode === "list" && <BankTableView items={items} />}
    </>
  );
}
