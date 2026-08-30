// https://classic.wowhead.com/gear-planner/druid/night-elf

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
import { ItemInfo, MonsterKey, SlotType } from "typed-adventureland";
import React, { useContext, useState } from "react";
import { GDataContext } from "../GDataContext";
import { LoadoutPickerShell } from "./LoadoutPickerShell";
import { SavedLoadout, SelectedCharacterClass } from "./types";
import { ItemInstance } from "../Shared/ItemInstance";
import { SaveLinkButton } from "./SaveLinkButton";
import { LoadLinkButton } from "./LoadLinkButton";
import { ImportLinkButton } from "./ImportLinkButton";
import { ShareLinkButton } from "./ShareLinkButton";
import { StatsPanel } from "./StatsPanel";
import { getFullItemName } from "../Shared/iteminfo-util";
import { cloneLoadoutGear } from "../gameData/loadoutStats";
import { useGearPlannerUrlState } from "./useGearPlannerUrlState";
import { CopyPageLinkButton } from "../Shared/CopyPageLinkButton";

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
  const [targetMonster, setTargetMonster] = useState<MonsterKey>("ent");

  const classes = Object.entries(G?.classes ?? []).map(
    ([className, item]) => ({ className, ...item } as SelectedCharacterClass),
  );

  useGearPlannerUrlState({
    classes,
    gear,
    selectedClass,
    level,
    targetMonster,
    setGear,
    setSelectedClass,
    setLevel,
    setTargetMonster,
  });

  if (!G) {
    return <>WAITING!</>;
  }

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
          <ShareLinkButton
            gear={gear}
            characterClass={selectedClass}
            level={level}
            target={targetMonster}
          />
          <CopyPageLinkButton label="Copy link" />
        </Grid>
        <Grid item xs={12} md={5} lg={4}>
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
        <Grid item xs={12} md={7} lg={8}>
          <StatsPanel
            selectedCharacterClass={selectedClass}
            level={level}
            gear={gear}
            targetMonster={targetMonster}
            onTargetMonsterChange={setTargetMonster}
          />
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
