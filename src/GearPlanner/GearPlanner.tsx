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
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  Slider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { ItemInfo, ItemKey, SlotType } from "typed-adventureland";
import React, { useContext, useState } from "react";
import { GDataContext } from "../GDataContext";
import { ItemImage } from "../ItemImage";
// import { calculateItemStatsByLevel, modifyPlayerStatsByAttributes } from "../Utils";
import { GearSelectDialog, RowItem } from "./GearSelectDialog";
import { SavedLoadout, SelectedCharacterClass } from "./types";
import { ItemInstance } from "../Shared/ItemInstance";
// import { ShareLinkButton } from "./ShareLinkButton";
import { SaveLinkButton } from "./SaveLinkButton";
import { LoadLinkButton } from "./LoadLinkButton";
import { ImportLinkButton } from "./ImportLinkButton";
import { CLASS_COLOR } from "../constants";
import { StatsPanel } from "./StatsPanel";
import {
  loadoutHasDoublehandConflict,
  withDoublehandEquipInvariant,
} from "../gameData/loadoutStats";

// https://mui.com/material-ui/react-modal/
export function GearSlot({
  slot,
  onClick,
  gear,
  invalid = false,
}: {
  slot: SlotType;
  onClick: (slot: SlotType) => void;
  gear: { [slot in SlotType]?: ItemInfo };
  invalid?: boolean;
}) {
  const itemInfo = gear[slot];
  let itemName: ItemKey;

  switch (slot) {
    case "orb":
      itemName = "shade20_orb" as ItemKey;
      break;
    case "elixir":
      itemName = "shade20_elixir" as ItemKey;
      break;
    case "cape":
      itemName = "shade20_cape" as ItemKey;
      break;
    default:
      itemName = `shade_${slot.replace("1", "").replace("2", "")}` as ItemKey;
      break;
  }

  return (
    <Box
      onClick={() => onClick(slot)}
      title={itemInfo ? itemInfo.name : slot}
      sx={{
        width: 50,
        height: 50,
        border: invalid ? "2px solid #d32f2f" : "1px solid black",
        display: "inline-block",
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 0.5,
        paddingLeft: 0.5,
        cursor: "pointer",
        "&:hover": { border: invalid ? "2px solid #d32f2f" : "1px solid white" },
      }}
    >
      {itemInfo ? (
        <ItemInstance itemInfo={itemInfo} />
      ) : (
        <ItemImage itemName={itemName} opacity={0.25} />
      )}
    </Box>
  );
}

function Info() {
  return (
    <Card>
      <CardContent>
        <Typography component="div" sx={{ textAlign: "left", marginBottom: 5 }}>
          This gear planner is a work in progress and in early alpha stage.
          <br />
          You can currently select items on each equipment slot, you can also export your selection
          but it has no uses.
        </Typography>
        <Typography variant="h5" component="div" sx={{ textAlign: "left" }}>
          Planned:
        </Typography>
        <ul style={{ textAlign: "left" }}>
          <li>stat scrolls on items with stat</li>
          <li>better item tooltips</li>
          <li>
            compare gain / loss with currently equipped item on item tooltip when selecting new
          </li>
          <li>titles</li>
          <li>tracktrix</li>
          <li>compare loadout</li>
        </ul>
      </CardContent>
    </Card>
  );
}

export function GearPlanner() {
  const G = useContext(GDataContext);

  /**
   * EAR HAT EAR AMULET
   * MH CHEST OH CAPE
   * RING LEG RING ORB
   * BELT BOOTS HAND ELIXIR
   */

  const [gear, setGear] = useState<{ [slot in SlotType]?: ItemInfo }>({});
  const [selectedGearSlot, setSelectedGearSlot] = useState<SlotType | false>(false);

  // TODO: what if you switch to a class that can not have the item selected equipped?
  const [selectedClass, setSelectedClass] = useState<SelectedCharacterClass>();

  const [level, setLevel] = useState(1); // TODO: find a sane default level, or load it from localstorage on change

  if (!G) {
    return <>WAITING!</>;
  }

  const onShowAvailableGear = (slot: SlotType) => {
    setSelectedGearSlot(slot);
  };

  const onSelectGear = (slot: SlotType, row?: RowItem) => {
    setSelectedGearSlot(false);
    if (!row) return;
    setGear((prev) =>
      withDoublehandEquipInvariant(
        selectedClass,
        prev,
        slot,
        { name: row.itemName, level: row.level },
        G.items,
      ),
    );
  };

  const classes = Object.entries(G.classes ?? []).map(
    ([className, item]) => ({ className, ...item } as SelectedCharacterClass),
  );

  const onLevelSliderChange = (event: Event, value: number | number[]) => {
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

  const onLoadSavedLoadout = (name: string, data: SavedLoadout) => {
    console.log("loaded", name);
    setLevel(data.level);
    setGear(data.gear);
    setSelectedClass(classes.find((c) => c.className === data.classKey));
  };

  const dhConflict = loadoutHasDoublehandConflict(selectedClass, gear, G.items);

  return (
    <Container>
      <Grid container rowSpacing={1}>
        <Grid item xs={12}>
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="center">
            {classes.map((c) => {
              const classColor = CLASS_COLOR[c.className];

              const sx =
                selectedClass && selectedClass.className === c.className
                  ? { backgroundColor: classColor }
                  : { borderColor: classColor, color: classColor };

              return (
                <Chip
                  key={c.className}
                  label={c.className}
                  variant={
                    selectedClass && selectedClass.className === c.className ? "filled" : "outlined"
                  }
                  sx={sx}
                  onClick={() => setSelectedClass(c)}
                />
              );
            })}
          </Stack>
          <Slider
            aria-label="Level"
            // defaultValue={level}
            value={level}
            // getAriaValueText={() => level.toString()}
            // valueLabelDisplay="auto"
            valueLabelDisplay="on"
            step={1}
            marks
            min={1}
            max={200} // G.levels last entry.
            onChange={onLevelSliderChange}
          />
          {/* <ShareLinkButton
            gear={gear}
            characterClass={selectedClass}
            level={level}
          /> */}
          <SaveLinkButton gear={gear} characterClass={selectedClass} level={level} />
          <LoadLinkButton load={onLoadSavedLoadout} />
          <ImportLinkButton load={onLoadSavedLoadout} />
        </Grid>
        <Grid item xs={4}>
          <div>
            <div>
              <GearSlot gear={gear} onClick={onShowAvailableGear} slot="earring1" />
              <GearSlot gear={gear} onClick={onShowAvailableGear} slot="helmet" />
              <GearSlot gear={gear} onClick={onShowAvailableGear} slot="earring2" />
              <GearSlot gear={gear} onClick={onShowAvailableGear} slot="amulet" />
            </div>
            <div>
              <GearSlot
                gear={gear}
                onClick={onShowAvailableGear}
                slot="mainhand"
                invalid={dhConflict}
              />
              <GearSlot gear={gear} onClick={onShowAvailableGear} slot="chest" />
              <GearSlot
                gear={gear}
                onClick={onShowAvailableGear}
                slot="offhand"
                invalid={dhConflict}
              />
              <GearSlot gear={gear} onClick={onShowAvailableGear} slot="cape" />
            </div>
            <div>
              <GearSlot gear={gear} onClick={onShowAvailableGear} slot="ring1" />
              <GearSlot gear={gear} onClick={onShowAvailableGear} slot="pants" />
              <GearSlot gear={gear} onClick={onShowAvailableGear} slot="ring2" />
              <GearSlot gear={gear} onClick={onShowAvailableGear} slot="orb" />
            </div>
            <div>
              <GearSlot gear={gear} onClick={onShowAvailableGear} slot="belt" />
              <GearSlot gear={gear} onClick={onShowAvailableGear} slot="shoes" />
              <GearSlot gear={gear} onClick={onShowAvailableGear} slot="gloves" />
              <GearSlot gear={gear} onClick={onShowAvailableGear} slot="elixir" />
            </div>
          </div>
        </Grid>
        <Grid item xs={8}>
          <StatsPanel selectedCharacterClass={selectedClass} level={level} gear={gear} />
        </Grid>
        <Grid item xs={12}>
          <Table size="small" aria-label="a dense table">
            <TableBody>
              {Object.entries(gear).map(([slot, itemInfo]) => {
                if (!itemInfo) {
                  return <></>;
                }
                const itemName = itemInfo.name;
                const gItem = G.items[itemName];
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
                    <TableCell>{gItem.name}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Grid>
      </Grid>
      {/* TODO: highlight / mark currently selected item? */}
      <GearSelectDialog
        slot={selectedGearSlot}
        items={G.items}
        onSelectGear={onSelectGear}
        selectedCharacterClass={selectedClass}
      />
      <Info />
    </Container>
  );
}
