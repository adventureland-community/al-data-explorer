// https://classic.wowhead.com/gear-planner/druid/night-elf
// TODO: Character selector
// TODO: level slider G.levels has 200 entries in it https://mui.com/material-ui/react-slider/
// TODO: gear selector
// TODO: Stats
// TODO: Attack table against specific mobs
// TODO: Defense table against specific mobs
// TODO: TrackTrix
// TODO: source - where does it drop?
// TODO: quality filter?
// TODO: tooltip on hover with item details https://mui.com/material-ui/react-tooltip/
// TODO: set items
// TODO: filter for properties? e.g. mluck
// TODO: there should be a tab where you can choose enchants, lvls and such?
// TODO: sharable links store state in url https://stackoverflow.com/a/41924535/28145
// https://medium.com/swlh/using-react-hooks-to-sync-your-component-state-with-the-url-query-string-81ccdfcb174f
// https://garrett-bodley.medium.com/encoding-data-inside-of-a-url-query-string-f286b7e20465
// https://www.npmjs.com/package/lz-string
// https://www.anycodings.com/questions/how-to-compress-url-parameters
// TODO: validation method to validate equipped gear against selected class.

import {
  Card,
  CardContent,
  Container,
  Grid,
  Slider,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { ItemInfo, SlotType } from "typed-adventureland";
import React, { useContext, useState } from "react";
import { GDataContext } from "../GDataContext";
import { LoadoutPickerShell } from "./LoadoutPickerShell";
import { SavedLoadout, SelectedCharacterClass } from "./types";
import { ItemInstance } from "../Shared/ItemInstance";
import { SaveLinkButton } from "./SaveLinkButton";
import { LoadLinkButton } from "./LoadLinkButton";
import { ImportLinkButton } from "./ImportLinkButton";
import { StatsPanel } from "./StatsPanel";
import { getFullItemName } from "../Shared/iteminfo-util";
import { cloneLoadoutGear } from "../gameData/loadoutStats";

function Info() {
  return (
    <Card>
      <CardContent>
        <Typography component="div" sx={{ textAlign: "left", marginBottom: 5 }}>
          This gear planner is a work in progress and in early alpha stage.
          <br />
          You can select items per slot, set title and stat scroll in the picker, export loadouts,
          and see combined stats.
        </Typography>
        <Typography variant="h5" component="div" sx={{ textAlign: "left" }}>
          Planned:
        </Typography>
        <ul style={{ textAlign: "left" }}>
          <li>better item tooltips</li>
          <li>
            compare gain / loss with currently equipped item on item tooltip when selecting new
          </li>
          <li>tracktrix</li>
          <li>compare loadout</li>
        </ul>
      </CardContent>
    </Card>
  );
}

export { GearSlot } from "./GearSlot";
export function GearPlanner() {
  const G = useContext(GDataContext);

  const [gear, setGear] = useState<{ [slot in SlotType]?: ItemInfo }>({});
  const [selectedClass, setSelectedClass] = useState<SelectedCharacterClass>();
  const [level, setLevel] = useState(1);

  if (!G) {
    return <>WAITING!</>;
  }

  const classes = Object.entries(G.classes ?? []).map(
    ([className, item]) => ({ className, ...item } as SelectedCharacterClass),
  );

  const onLevelSliderChange = (_event: Event, value: number | number[]) => {
    if (typeof value === "number") {
      setLevel(value);
    }
  };

  const onRemoveGear = (slot: SlotType) => {
    setGear((prev) => {
      const next = { ...prev };
      delete next[slot];
      return next;
    });
  };

  const onLoadSavedLoadout = (_name: string, data: SavedLoadout) => {
    setLevel(data.level);
    setGear(cloneLoadoutGear(data.gear));
    setSelectedClass(classes.find((c) => c.className === data.classKey));
  };

  return (
    <Container>
      <Grid container rowSpacing={1}>
        <Grid item xs={12}>
          <Slider
            aria-label="Level"
            value={level}
            valueLabelDisplay="on"
            step={1}
            marks
            min={1}
            max={200}
            onChange={onLevelSliderChange}
          />
          <SaveLinkButton gear={gear} characterClass={selectedClass} level={level} />
          <LoadLinkButton load={onLoadSavedLoadout} />
          <ImportLinkButton load={onLoadSavedLoadout} />
        </Grid>
        <Grid item xs={4}>
          <LoadoutPickerShell
            gear={gear}
            onGearChange={setGear}
            selectedClass={selectedClass}
            onSelectClass={setSelectedClass}
            onClearClass={() => setSelectedClass(undefined)}
            classes={classes}
            items={G.items}
            variant="planner"
            hint="Click a slot to pick or edit · set Title / Stat scroll in the picker · ✕ to remove"
          />
        </Grid>
        <Grid item xs={8}>
          <StatsPanel selectedCharacterClass={selectedClass} level={level} gear={gear} />
        </Grid>
        <Grid item xs={12}>
          <Table size="small" aria-label="a dense table">
            <TableBody>
              {Object.entries(gear).map(([slot, itemInfo]) => {
                if (!itemInfo) {
                  return <React.Fragment key={`list${slot}`} />;
                }
                return (
                  <TableRow hover key={`list${slot}`}>
                    <TableCell width={25}>
                      <DeleteIcon
                        style={{ cursor: "pointer" }}
                        onClick={() => onRemoveGear(slot as SlotType)}
                      />
                    </TableCell>
                    <TableCell width={40}>
                      <ItemInstance itemInfo={itemInfo} />
                    </TableCell>
                    <TableCell>{getFullItemName(itemInfo, G)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Grid>
      </Grid>
      <Info />
    </Container>
  );
}
