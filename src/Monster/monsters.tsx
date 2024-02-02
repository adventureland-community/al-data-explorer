/**
 * Renders a table of monsters with their attributes and drops.
 * Allows searching and sorting of monsters.
 * @returns JSX.Element
 */

// TODO: show icon, key, name, locations, drop
// TODO: calculations, hits to kill (depends on supplying stats)
// hp/xp xp/hit xp/s hp/g g/hit g/h dps/k
// min hit, max hit consider crit.
// consider levels of monster.

import { Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import { GMonster, MonsterKey, GImage, GDimension } from "typed-adventureland";
import { useState, useContext, useEffect } from "react";
import { GDataContext } from "../GDataContext";

function matrixPosition(value: any, matrix: any[]) {
  let col = -1;
  const row = matrix.findIndex((r: any[]) => {
    const c = r.indexOf(value);
    if (c !== -1) {
      col = c;
      return true;
    }
    return false;
  });
  if (col === -1 && row === -1) return false;
  return { row, col };
}

function MonsterImage({
  monsterName,
  opacity,
  scale,
}: {
  monsterName: string;
  opacity: number;
  scale: number;
}) {
  const G = useContext(GDataContext); // Get G from context
  if (!G) return <></>;

  const monster = G.monsters[monsterName as keyof typeof G.monsters] as GMonster;

  // Lets just search all sprites? Seems simpler than manually listing custom/edge cases...
  const sprite = Object.values(G.sprites)
    .filter((v) => v?.matrix && v?.file)
    .reduce((a, b) => {
      const find = matrixPosition(monster?.skin, b.matrix);
      if (find) return { data: b, ...find };
      return a;
    }, {} as { data: any; row: number; col: number });
  if (!sprite) return <img alt={monsterName} />;

  const image = (G.images as Record<string, GImage>)[sprite.data.file.split("?")[0]];
  const scaling = (scale || 1) * (G.monsters[monsterName as keyof typeof G.monsters]?.size || 1);
  const width = (image.width / sprite.data.columns) * scaling;
  const height = (image.height / sprite.data.rows) * scaling;

  const dimension = (G.dimensions as Record<string, GDimension>)[monster?.skin] || false;

  let offsetx = 0;
  let offsety = 0;
  if (dimension) {
    offsetx = width / 3 - dimension[0] * scaling;
    offsety = height / 4 - (dimension[2] || 0) - dimension[1] * scaling;
  }

  return (
    <div
      style={{
        overflow: "hidden",
        width: `${width / 3 - offsetx}px`,
        height: `${height / 4 - offsety}px`,
        opacity: opacity || 1,
      }}
    >
      <img
        alt={monsterName}
        style={{
          maxWidth: `${image.width * scaling}px`,
          width: `${image.width * scaling}px`,
          height: `${image.height * scaling}px`,
          marginTop: `-${sprite.row * height + offsety}px`,
          marginLeft: `-${sprite.col * width + offsetx / 2}px`,
          imageRendering: "pixelated",
        }}
        src={`http://adventure.land${sprite.data.file}`}
      />
    </div>
  );
}

// function ItemImage({
//   itemName,
//   opacity,
//   scale,
// }: {
//   itemName: string;
//   opacity: number;
//   scale: number;
// }) {
//   const G = useContext(GDataContext); // Get G from context
//   if (!G) return <></>;

//   const item = G.items[itemName as keyof typeof G.items] as GItem;

//   const sprite = Object.values(G.sprites)
//     .filter((v) => v?.matrix && v?.file)
//     .reduce((a, b) => {
//       const find = matrixPosition(item?.skin, b.matrix);
//       if (find) return { data: b, ...find };
//       return a;
//     }, {} as { data: any; row: number; col: number });
//   if (!sprite) return <img alt={itemName} />;

//   const image = (G.images as Record<string, GImage>)[sprite.data.file.split("?")[0]];
//   const scaling = (scale || 1) * (G.items[itemName as keyof typeof G.items]?.size || 1);
//   const width = (image.width / sprite.data.columns) * scaling;
//   const height = (image.height / sprite.data.rows) * scaling;

//   const dimension = (G.dimensions as Record<string, GDimension>)[item?.skin] || false;

//   let offsetx = 0;
//   let offsety = 0;
//   if (dimension) {
//     offsetx = width / 3 - dimension[0] * scaling;
//     offsety = height / 4 - (dimension[2] || 0) - dimension[1] * scaling;
//   }

//   return (
//     <div
//       style={{
//         overflow: "hidden",
//         width: `${width / 3 - offsetx}px`,
//         height: `${height / 4 - offsety}px`,
//         opacity: opacity || 1,
//       }}
//     >
//       <img
//         alt={itemName}
//         style={{
//           maxWidth: `${image.width * scaling}px`,
//           width: `${image.width * scaling}px`,
//           height: `${image.height * scaling}px`,
//           marginTop: `-${sprite.row * height + offsety}px`,
//           marginLeft: `-${sprite.col * width + offsetx / 2}px`,
//           imageRendering: "pixelated",
//         }}
//         src={`http://adventure.land${sprite.data.file}`}
//       />
//     </div>
//   );
// }

export function Monsters() {
  const G = useContext(GDataContext);

  // Add a state variable for the search terms
  const [searchTerm, setSearchTerm] = useState("");
  const [itemSearchTerm, setItemSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "",
    direction: "",
  });

  const handleSort = (key: string) => {
    setSortConfig((prevSortConfig) => {
      if (prevSortConfig.key === key) {
        // If clicking on the same column, toggle the direction
        return { key, direction: prevSortConfig.direction === "asc" ? "desc" : "asc" };
      }
      // If clicking on a different column, set the new key and default to ascending order
      return { key, direction: "asc" };
    });
  };

  useEffect(() => {
    // Set the initial sorting configuration to sort by HP in ascending order
    setSortConfig({
      key: "hp",
      direction: "asc",
    });
  }, []);

  if (!G) {
    return <>WAITING!</>;
  }

  // TODO: do the heavy row calculations here and map a new object with min and max gold for example.
  const rows: [
    MonsterKey,
    GMonster & { avgGold: number; hpPerGold: number; xpPerHp: number; drops: any },
  ][] = Object.entries(G.monsters)
    .map(([monsterKey, monster]) => {
      const base_gold = G.base_gold[monsterKey as keyof typeof G.base_gold] as number[];
      const goldValues = base_gold ? Object.values(base_gold) : ([] as number[]);
      const minGold = Math.min(...goldValues) as number;
      const maxGold = Math.max(...goldValues) as number;
      // Get the drops for this monster
      const drops = G.drops.monsters[monsterKey];

      let formattedDrops = "";

      // Check if drops is an array
      if (Array.isArray(drops)) {
        // Format the drops string
        formattedDrops = drops
          .map(([dropChance, itemName, ...args]) => {
            // If the item name is "open", use the next argument as the item name
            if (itemName === "open") {
              itemName = args[0];
            }

            // Convert the drop chance to percentage and return the formatted string
            const percentage = dropChance * 100;

            return `${itemName} (${percentage.toFixed(2)}%)`;
          })
          .join(", ");
      } else {
        // Handle non-array drops here
        // This is just an example, adjust it according to your needs
        formattedDrops = JSON.stringify(drops);
      }
      let avgGold = (minGold + maxGold) / 2;
      if (isNaN(avgGold)) {
        avgGold = 0;
      }
      // Calculate HP/Gold and XP/HP
      const hpPerGold = monster.hp / avgGold;
      const xpPerHp = monster.xp / monster.hp;
      // If the properties are not present in the monster object, set them to 0
      const armor = monster.armor || 0;
      const resistance = monster.resistance || 0;
      const evasion = monster.evasion || 0;
      const reflection = monster.reflection || 0;

      return [
        monsterKey,
        {
          ...monster,
          armor,
          resistance,
          evasion,
          reflection,
          avgGold,
          hpPerGold,
          xpPerHp,
          drops: formattedDrops,
        },
      ];
    })
    .sort(([aKey, aValue], [bKey, bValue]) => {
      const sortKey = sortConfig.key as keyof (GMonster & {
        avgGold: number;
        hpPerGold: number;
        xpPerHp: number;
      });
      let aValueForKey = aValue[sortKey as keyof typeof aValue] as string | number | object;
      let bValueForKey = bValue[sortKey as keyof typeof bValue] as string | number | object;

      // If sortKey is not valid, sort by monster key
      if (!Object.prototype.hasOwnProperty.call(aValue, sortKey)) {
        return (
          aKey.toString().localeCompare(bKey.toString()) * (sortConfig.direction === "asc" ? 1 : -1)
        );
      }
      // Handle specific columns
      if (sortKey === "name") {
        // For text columns, use localeCompare for string comparison
        return (
          String(aValueForKey).localeCompare(String(bValueForKey)) *
          (sortConfig.direction === "asc" ? 1 : -1)
        );
      }

      // Handle range values
      if (typeof aValueForKey === "string" && aValueForKey.includes("-")) {
        const [min, max] = aValueForKey.split("-").map(Number);
        aValueForKey = (min + max) / 2;
      }

      if (typeof bValueForKey === "string" && bValueForKey.includes("-")) {
        const [min, max] = bValueForKey.split("-").map(Number);
        bValueForKey = (min + max) / 2;
      }

      // For numeric columns, directly compare the numbers
      const aNumericValue = isNaN(Number(aValueForKey)) ? 0 : Number(aValueForKey);
      const bNumericValue = isNaN(Number(bValueForKey)) ? 0 : Number(bValueForKey);

      const numericDirection = sortConfig.direction === "asc" ? 1 : -1;

      const result = aNumericValue - bNumericValue;

      return result * numericDirection;
    }) as [
    MonsterKey,
    GMonster & { avgGold: number; hpPerGold: number; xpPerHp: number; drops: any },
  ][];

  // Filter the rows based on the search term and item search term
  const filteredRows = rows.filter(
    ([, monster]) =>
      monster.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (monster.drops
        ? monster.drops.toLowerCase().includes(itemSearchTerm.toLowerCase())
        : itemSearchTerm === ""),
  );

  // G.drops.monsters.goo
  // monsters does not contain gold, where does that come from?
  // sub table with spawn locations?
  return (
    <>
      {/* Add a search field for monsters */}
      <input
        type="text"
        placeholder="Search monsters..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {/* Add a search field for items */}
      <input
        type="text"
        placeholder="Search items..."
        value={itemSearchTerm}
        onChange={(e) => setItemSearchTerm(e.target.value)}
      />
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell onClick={() => handleSort("monsterkey")}>Monster Key</TableCell>
            <TableCell>Image</TableCell>
            <TableCell onClick={() => handleSort("name")}>Name</TableCell>
            <TableCell onClick={() => handleSort("hp")}>HP</TableCell>
            <TableCell onClick={() => handleSort("avgGold")}>GOLD</TableCell>
            <TableCell onClick={() => handleSort("hpPerGold")}>HP/GOLD</TableCell>
            <TableCell onClick={() => handleSort("xp")}>XP</TableCell>
            <TableCell onClick={() => handleSort("xpPerHp")}>XP/HP</TableCell>
            <TableCell onClick={() => handleSort("respawn")}>Respawn</TableCell>
            <TableCell onClick={() => handleSort("armor")}>Armor</TableCell>
            <TableCell onClick={() => handleSort("resistance")}>Resistance</TableCell>
            <TableCell onClick={() => handleSort("evasion")}>Evasion</TableCell>
            <TableCell onClick={() => handleSort("reflection")}>Reflection</TableCell>
            <TableCell onClick={() => handleSort("drop")}>Drop</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredRows.map(([monsterKey, row]) => {
            const base_gold = G.base_gold[monsterKey];
            console.log(monsterKey, base_gold);
            // const goldPerMapString = base_gold
            //   ? Object.entries(base_gold).map(([map, gold]) => (
            //       <TableRow>
            //         <TableCell width={150}>{map}</TableCell>
            //         <TableCell width={50} align="right">
            //           {gold}
            //         </TableCell>
            //       </TableRow>
            //     ))
            //   : // .map(([map, gold]) => `${map}:${gold}`)
            //     // .join("\n")
            //     "";
            const goldPerMapString = base_gold
              ? Object.entries(base_gold)
                  .map(([map, gold]) => `${map}:${gold}`)
                  .join("\n")
              : "";

            const goldValues = base_gold ? Object.values(base_gold) : ([] as number[]);
            const minGold = Math.min(...goldValues);
            const maxGold = Math.max(...goldValues);

            // Calculate average gold
            let avgGold = (minGold + maxGold) / 2;

            if (isNaN(avgGold)) {
              avgGold = 0;
            }

            // Calculate HP per average gold
            let hpPerAvgGold = 0;
            if (!isNaN(avgGold) && avgGold !== 0) {
              hpPerAvgGold = Number((row.hp / avgGold).toFixed(2));
            }

            // let goldString = "";
            // if (minGold >= 0 && minGold < maxGold) {
            //   goldString = `${minGold} - ${maxGold}`;
            // } else if (minGold >= 0 && minGold === maxGold) {
            //   goldString = minGold.toString();
            // }
            // TODO: render farming spots, with mob count and respawn time.
            return (
              <TableRow key={monsterKey} hover>
                <TableCell>{monsterKey}</TableCell>
                <TableCell>
                  {" "}
                  <MonsterImage monsterName={monsterKey} opacity={1} scale={1} />{" "}
                </TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.hp}</TableCell>
                <TableCell title={goldPerMapString}>{avgGold}</TableCell>
                <TableCell>{hpPerAvgGold}</TableCell>
                <TableCell>{row.xp}</TableCell>
                <TableCell>{(row.xp / row.hp).toFixed(2)}</TableCell>
                <TableCell>{row.respawn}</TableCell>
                <TableCell>{row.armor}</TableCell>
                <TableCell>{row.resistance}</TableCell>
                <TableCell>{row.evasion}</TableCell>
                <TableCell>{row.reflection}</TableCell>
                <TableCell>{row.drops}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </>
  );
}
