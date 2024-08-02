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

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Grid,
  Box,
} from "@mui/material";
import { GMonster, MonsterKey, GImage, GDimension, GMap } from "typed-adventureland";
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
  const [sortConfig, setSortConfig] = useState({
    key: "",
    direction: "",
  });

  // Add state for filters
  const [filters, setFilters] = useState({
    monsterName: "",
    hpMin: "", // New filter for HP MIN
    hpMax: "", // Changed from hp to hpMax
    respawnMin: "", // New filter for Respawn MIN
    respawnMax: "", // Changed from respawn to respawnMax
    itemName: "", // New filter for item drops
    achievement: "", // New filter for achievements
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

  const getMonsterSpawns = (monsterKey: string) => {
    const spawnLocations: string[] = [];

    for (const mapName in G.maps as Record<string, GMap>) {
      if (Object.prototype.hasOwnProperty.call(G.maps, mapName)) {
        const map = (G.maps as Record<string, GMap>)[mapName];
        if (map.monsters && map.monsters.some((monster) => monster.type === monsterKey)) {
          spawnLocations.push(mapName);
        }
      }
    }

    return spawnLocations;
  };

  // TODO: do the heavy row calculations here and map a new object with min and max gold for example.
  const rows: [
    MonsterKey,
    GMonster & {
      avgGold: number;
      hpPerGold: number;
      xpPerHp: number;
      drops: any;
      spawns: string[];
      achievements: any; // Add achievements to the row type
    },
  ][] = Object.entries(G.monsters)
    .map(([monsterKey, monster]) => {
      const base_gold = G.base_gold[monsterKey as keyof typeof G.base_gold] as number[];
      const goldValues = base_gold ? Object.values(base_gold) : ([] as number[]);
      const minGold = Math.min(...goldValues) as number;
      const maxGold = Math.max(...goldValues) as number;
      // Get the drops for this monster
      const drops = G.drops.monsters[monsterKey];
      // Get the spawn locations of the monster
      const spawns = getMonsterSpawns(monsterKey);

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
          spawns,
          achievements: monster.achievements || [], // Add achievements to the row
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
    GMonster & {
      avgGold: number;
      hpPerGold: number;
      xpPerHp: number;
      drops: any;
      spawns: string[];
      achievements: any; // Add achievements to the row type
    },
  ][];

  // Filter the rows based on the selected filters
  const filteredRows = rows.filter(([, monster]) => {
    const matchesMonsterName = monster.name
      .toLowerCase()
      .includes(filters.monsterName.toLowerCase());

    // Convert filters.hpMin, filters.hpMax, respawnMin, respawnMax, and achievement to numbers for comparison
    const hpMinFilter = filters.hpMin ? Number(filters.hpMin) : -Infinity;
    const hpMaxFilter = filters.hpMax ? Number(filters.hpMax) : Infinity;
    const respawnMinFilter = filters.respawnMin ? Number(filters.respawnMin) : -Infinity;
    const respawnMaxFilter = filters.respawnMax ? Number(filters.respawnMax) : Infinity;
    const matchesAchievement = monster.achievements
      ? monster.achievements.some((achievement: any) =>
          achievement[2].toLowerCase().includes(filters.achievement.toLowerCase()),
        )
      : filters.achievement === "";

    const matchesHpMin = monster.hp >= hpMinFilter;
    const matchesHp = monster.hp < hpMaxFilter;
    const matchesRespawnMin = monster.respawn >= respawnMinFilter;
    const matchesRespawn = monster.respawn <= respawnMaxFilter;
    const matchesItem = monster.drops
      ? monster.drops.toLowerCase().includes(filters.itemName.toLowerCase())
      : filters.itemName === "";

    return (
      matchesMonsterName &&
      matchesHpMin &&
      matchesHp &&
      matchesRespawnMin &&
      matchesRespawn &&
      matchesItem &&
      matchesAchievement
    );
  });

  // Ensure filteredRowsWithFilters is defined
  const filteredRowsWithFilters = filteredRows as [
    MonsterKey,
    GMonster & {
      avgGold: number;
      hpPerGold: number;
      xpPerHp: number;
      drops: any;
      spawns: string[];
      achievements: any; // Add achievements to the row type
    },
  ][];

  // G.drops.monsters.goo
  // monsters does not contain gold, where does that come from?
  // sub table with spawn locations?
  return (
    <>
      {/* Add filter inputs */}
      <Box sx={{ padding: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={2}>
            <TextField
              fullWidth
              label="Monster"
              variant="outlined"
              value={filters.monsterName}
              onChange={(e) => setFilters({ ...filters, monsterName: e.target.value })}
            />
          </Grid>
          <Grid item xs={2}>
            <TextField
              fullWidth
              label="Item Drop"
              variant="outlined"
              value={filters.itemName}
              onChange={(e) => setFilters({ ...filters, itemName: e.target.value })}
            />
          </Grid>
          <Grid item xs={2}>
            <TextField
              fullWidth
              label="Achievement" // New label for Achievement filter
              variant="outlined"
              value={filters.achievement} // Bind to achievement filter
              onChange={(e) => setFilters({ ...filters, achievement: e.target.value })}
            />
          </Grid>
          <Grid item xs={1}>
            <TextField
              fullWidth
              label="HP MIN" // New label for HP MIN
              type="number"
              variant="outlined"
              value={filters.hpMin} // Bind to hpMin filter
              onChange={(e) => {
                const { value } = e.target; // Destructure value
                setFilters({ ...filters, hpMin: value === "" ? "" : String(Number(value)) });
              }}
            />
          </Grid>
          <Grid item xs={1}>
            <TextField
              fullWidth
              label="HP MAX" // Changed label from HP to HP MAX
              type="number"
              variant="outlined"
              value={filters.hpMax} // Changed from hp to hpMax
              onChange={(e) => {
                const { value } = e.target;
                setFilters({ ...filters, hpMax: value === "" ? "" : String(Number(value)) }); // Changed from hp to hpMax
              }}
            />
          </Grid>
          <Grid item xs={1}>
            <TextField
              fullWidth
              label="Respawn MIN" // New label for Respawn MIN
              type="number"
              variant="outlined"
              value={filters.respawnMin} // Bind to respawnMin filter
              onChange={(e) => {
                const { value } = e.target; // Destructure value
                setFilters({ ...filters, respawnMin: value === "" ? "" : String(Number(value)) });
              }}
            />
          </Grid>
          <Grid item xs={1}>
            <TextField
              fullWidth
              label="Respawn MAX" // Changed label from Respawn to Respawn MAX
              type="number"
              variant="outlined"
              value={filters.respawnMax} // Changed from respawn to respawnMax
              onChange={(e) => {
                const { value } = e.target;
                setFilters({ ...filters, respawnMax: value === "" ? "" : String(Number(value)) }); // Changed from respawn to respawnMax
              }}
            />
          </Grid>
        </Grid>
      </Box>

      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell onClick={() => handleSort("monsterkey")} style={{ cursor: "pointer" }}>
              MKey
            </TableCell>
            <TableCell>Monster</TableCell>
            <TableCell onClick={() => handleSort("hp")} style={{ cursor: "pointer" }}>
              HP
            </TableCell>
            <TableCell onClick={() => handleSort("avgGold")} style={{ cursor: "pointer" }}>
              GOLD
            </TableCell>
            <TableCell onClick={() => handleSort("hpPerGold")} style={{ cursor: "pointer" }}>
              HP/GOLD
            </TableCell>
            <TableCell onClick={() => handleSort("xp")} style={{ cursor: "pointer" }}>
              XP
            </TableCell>
            <TableCell onClick={() => handleSort("xpPerHp")} style={{ cursor: "pointer" }}>
              XP/HP
            </TableCell>
            <TableCell onClick={() => handleSort("respawn")} style={{ cursor: "pointer" }}>
              Respawn
            </TableCell>
            <TableCell onClick={() => handleSort("armor")} style={{ cursor: "pointer" }}>
              Armor
            </TableCell>
            <TableCell onClick={() => handleSort("resistance")} style={{ cursor: "pointer" }}>
              Resistance
            </TableCell>
            <TableCell onClick={() => handleSort("evasion")} style={{ cursor: "pointer" }}>
              Evasion
            </TableCell>
            <TableCell onClick={() => handleSort("reflection")} style={{ cursor: "pointer" }}>
              Reflection
            </TableCell>
            <TableCell onClick={() => handleSort("drop")} style={{ cursor: "pointer" }}>
              Drop
            </TableCell>
            <TableCell onClick={() => handleSort("spawns")} style={{ cursor: "pointer" }}>
              Spawns
            </TableCell>
            <TableCell onClick={() => handleSort("achievements")} style={{ cursor: "pointer" }}>
              Achievements
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredRowsWithFilters.map(
            ([monsterKey, row]: [
              MonsterKey,
              GMonster & {
                avgGold: number;
                hpPerGold: number;
                xpPerHp: number;
                drops: any;
                spawns: string[];
                achievements: any; // Add achievements to the row type
              },
            ]) => {
              const base_gold = G.base_gold[monsterKey as keyof typeof G.base_gold];
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

              const achievementsList = row.achievements
                ? row.achievements
                    .map((achievement: any) => `${achievement[2]}: ${achievement[3]}`)
                    .join(", ")
                : "None"; // Display "None" if no achievements

              return (
                <TableRow key={monsterKey} hover>
                  <TableCell>
                    <a
                      href={`https://adventure.land/docs/guide/all/monsters/${monsterKey.toLowerCase()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ textDecoration: "underline", color: "inherit" }} // Optional styling
                    >
                      {monsterKey}
                    </a>
                  </TableCell>
                  <TableCell>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <MonsterImage monsterName={monsterKey} opacity={1} scale={1} />
                      <span style={{ marginLeft: "8px" }}>{row.name}</span>{" "}
                      {/* Name next to image */}
                    </div>
                  </TableCell>
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
                  <TableCell>{row.spawns.join(", ")}</TableCell>
                  <TableCell>{achievementsList}</TableCell> {/* Display achievements */}
                </TableRow>
              );
            },
          )}
        </TableBody>
      </Table>
    </>
  );
}
