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
import { ItemInfo, SlotType } from "typed-adventureland";
import React, { useContext, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { GDataContext } from "../GDataContext";
import { LoadoutPickerShell } from "./LoadoutPickerShell";
import { SavedLoadout, SelectedCharacterClass } from "./types";
import { ItemInstanceLabel } from "../Shared/ItemInstanceLabel";
import { SaveLinkButton } from "./SaveLinkButton";
import { LoadLinkButton } from "./LoadLinkButton";
import { ImportLinkButton } from "./ImportLinkButton";
import { ShareLinkButton } from "./ShareLinkButton";
import { StatsPanel } from "./StatsPanel";
import { cloneLoadoutGear } from "../gameData/loadoutStats";
import { takePendingGearPlannerLoadout } from "../Characters/pendingGearPlannerLoadout";
import {
  decodeGearShareState,
  encodeGearShareState,
  shareStateToSavedLoadout,
} from "./gearShareState";

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
  const [searchParams, setSearchParams] = useSearchParams();

  const [gear, setGear] = useState<{ [slot in SlotType]?: ItemInfo }>({});
  const [selectedClass, setSelectedClass] = useState<SelectedCharacterClass>();
  const [level, setLevel] = useState(1);
  const appliedPending = useRef(false);
  const skipNextUrlWrite = useRef(false);

  useEffect(() => {
    if (!G || appliedPending.current) return;

    const classList = Object.entries(G.classes ?? []).map(
      ([className, item]) => ({ className, ...item } as SelectedCharacterClass),
    );

    const apply = (data: SavedLoadout) => {
      appliedPending.current = true;
      skipNextUrlWrite.current = true;
      setLevel(data.level);
      setGear(cloneLoadoutGear(data.gear));
      setSelectedClass(classList.find((c) => c.className === data.classKey));
    };

    const fromUrl = searchParams.get("gear");
    if (fromUrl) {
      const decoded = decodeGearShareState(fromUrl);
      if (decoded) {
        apply(shareStateToSavedLoadout(decoded));
        return;
      }
    }

    const pending = takePendingGearPlannerLoadout();
    if (pending) apply(pending.data);
  }, [G, searchParams]);

  // Keep ?gear= in sync so the address bar stays a shareable source of truth.
  useEffect(() => {
    if (!G) return;
    if (skipNextUrlWrite.current) {
      skipNextUrlWrite.current = false;
      return;
    }
    const hasContent = Object.keys(gear).length > 0 || Boolean(selectedClass);
    if (!hasContent) return;
    appliedPending.current = true;
    const encoded = encodeGearShareState({
      gear,
      className: selectedClass?.className,
      level,
    });
    const current = searchParams.get("gear");
    if (current === encoded) return;
    setSearchParams({ gear: encoded }, { replace: true });
  }, [G, gear, selectedClass, level, searchParams, setSearchParams]);

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
    skipNextUrlWrite.current = true;
    appliedPending.current = true;
    setLevel(data.level);
    setGear(cloneLoadoutGear(data.gear));
    setSelectedClass(classes.find((c) => c.className === data.classKey));
  };

  return (
    <Container sx={{ px: { xs: 1.5, sm: 2 } }}>
      <Grid container spacing={{ xs: 2, md: 3 }}>
        <Grid item xs={12}>
          <Typography gutterBottom>Level {level}</Typography>
          <Slider
            aria-label="Level"
            value={level}
            valueLabelDisplay="on"
            step={1}
            marks
            min={1}
            max={200}
            onChange={onLevelSliderChange}
            sx={{ mt: 3, mb: 1 }}
          />
          <Stack direction="row" flexWrap="wrap" sx={{ gap: 0.5 }}>
            <SaveLinkButton gear={gear} characterClass={selectedClass} level={level} />
            <LoadLinkButton load={onLoadSavedLoadout} />
            <ImportLinkButton load={onLoadSavedLoadout} />
            <ShareLinkButton gear={gear} characterClass={selectedClass} level={level} />
          </Stack>
        </Grid>
        <Grid item xs={12} md={4}>
          <Box sx={{ overflowX: "auto", WebkitOverflowScrolling: "touch", pb: 0.5 }}>
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
          </Box>
        </Grid>
        <Grid item xs={12} md={8}>
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
                    <TableCell>
                      <ItemInstanceLabel itemInfo={itemInfo} includeLevel linkToDetail={false} />
                    </TableCell>
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
