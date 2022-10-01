// https://classic.wowhead.com/gear-planner/druid/night-elf
// TODO: Character selector
// TODO: level slider
// TODO: gear selector
// TODO: Stats
// TODO: Attack table against specific mobs
// TODO: TrackTrix
// TODO: render item icon
// TODO: source - where does it drop?
// TODO: quality filter?
// TODO: tooltip on hover with item details https://mui.com/material-ui/react-tooltip/
// TODO: set items
// TODO: filter for properties? e.g. mluck
// TODO: clicking an item allows you to choose a different item
// TODO: there should be a tab where you can choose enchants, lvls and such?
// TODO: sharable links store state in url https://stackoverflow.com/a/41924535/28145
// https://medium.com/swlh/using-react-hooks-to-sync-your-component-state-with-the-url-query-string-81ccdfcb174f

import {
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Modal,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from "@mui/material";
import {
  CharacterType,
  GItem,
  ItemInfo,
  ItemName,
  ItemType,
  SlotType,
} from "adventureland";
import axios from "axios";
import React, { useContext, useEffect, useState } from "react";
import { CharacterTypeData, GDataContext, GItems } from "../GDataContext";
import { GearSelectDialog, RowItem } from "./GearSelectDialog";

// TODO: Defense table against specific mobs
type SelectedCharacterClass = {
  className: CharacterType;
} & CharacterTypeData;

export function GearPlanner() {
  const G = useContext(GDataContext);
  /**
   * EAR HAT EAR AMULET
   * MH CHEST OH CAPE
   * RING LEG RING ORB
   * BELT BOOTS HAND ELIXIR
   */

  /**
   * https://adventure.land/images/tiles/items/pack_20vt8.png
   * 40x40
   * G.imagesets
   * pack_20:
load: true
rows: 64
file: "/images/tiles/items/pack_20vt8.png"
columns: 16
size: 20

function item_container(item,actual) in html.js

    var pack=G.imagesets[G.positions[item.skin][0]||"pack_20"],
    x=G.positions[item.skin][1],
    y=G.positions[item.skin][2];

		var scale=size/pack.size
	html+="<div style='overflow: hidden; height: "+(size)+"px; width: "+(size)+"px;'>";
    html+="<img style='width: "+(pack.columns*pack.size*scale)+"px; height: "+(pack.rows*pack.size*scale)+"px; margin-top: -"+(y*size)+"px; margin-left: -"+(x*size)+"px;' src='"+pack.file+"' draggable='false' />";
    html+="</div>";
   *
   *
   * 
   * hat <img style="width: 640px; height: 2560px; margin-top: -1240px; margin-left: -0px; opacity: 0.5;" src="/images/tiles/items/pack_20vt8.png" draggable="false">
   * ear <img style="width: 640px; height: 2560px; margin-top: -680px; margin-left: -200px; opacity: 0.4;" src="/images/tiles/items/pack_20vt8.png" draggable="false">
   * amulet <img style="width: 640px; height: 2560px; margin-top: -1240px; margin-left: -480px; opacity: 0.4;" src="/images/tiles/items/pack_20vt8.png" draggable="false">
   *
   * mh <img style="width: 640px; height: 2560px; margin-top: -1240px; margin-left: -200px; opacity: 0.36;" src="/images/tiles/items/pack_20vt8.png" draggable="false">
   * chest <img style="width: 640px; height: 2560px; margin-top: -40px; margin-left: -240px; opacity: 0.4;" src="/images/tiles/items/pack_20vt8.png" draggable="false">
   * oh <img style="width: 640px; height: 2560px; margin-top: -1240px; margin-left: -240px; opacity: 0.4;" src="/images/tiles/items/pack_20vt8.png" draggable="false">
   * cape <img style="width: 640px; height: 2560px; margin-top: -240px; margin-left: -160px; opacity: 0.4;" src="/images/tiles/items/pack_20vt8.png" draggable="false">
   *
   * pants <img style="width: 640px; height: 2560px; margin-top: -1240px; margin-left: -80px; opacity: 0.5;" src="/images/tiles/items/pack_20vt8.png" draggable="false">
   * ring <img style="width: 640px; height: 2560px; margin-top: -1240px; margin-left: -520px; opacity: 0.4;" src="/images/tiles/items/pack_20vt8.png" draggable="false">
   * orb <img style="width: 640px; height: 2560px; margin-top: -1000px; margin-left: -80px; opacity: 0.4;" src="/images/tiles/items/pack_20vt8.png" draggable="false">
   *
   * belt <img style="width: 640px; height: 2560px; margin-top: -120px; margin-left: -160px; opacity: 0.4;" src="/images/tiles/items/pack_20vt8.png" draggable="false">
   * shoes <img style="width: 640px; height: 2560px; margin-top: -1240px; margin-left: -120px; opacity: 0.5;" src="/images/tiles/items/pack_20vt8.png" draggable="false">
   * gloves <img style="width: 640px; height: 2560px; margin-top: -80px; margin-left: -400px; opacity: 0.4;" src="/images/tiles/items/pack_20vt8.png" draggable="false">
   * elixir <img style="width: 640px; height: 2560px; margin-top: -1080px; margin-left: -0px; opacity: 0.4;" src="/images/tiles/items/pack_20vt8.png" draggable="false">
   */

  // TODO: data for each gear slot with selected item, lvl, stats increases, and such.
  const [gear, setGear] = useState<{ [slot in SlotType]?: ItemInfo }>({});
  const [selectedGearSlot, setSelectedGearSlot] = useState<SlotType | false>(
    false
  );
 
  const [selectedClass, setSelectedClass] = useState<SelectedCharacterClass>();

  const onShowAvailableGear = (slot: SlotType) => {
    setSelectedGearSlot(slot);
  };

  const onSelectGear = (slot: SlotType, row?: RowItem) => {
    console.log(slot, row);
    setSelectedGearSlot(false);
    if (!row) return;

    let equippedItem = gear[slot];
    if (!equippedItem) {
      gear[slot] = {
        name: row.itemName,
      };
    }
  };

  const classes = G.classes
    ? Object.entries(G.classes).map(([className, item]) => {
        // item.mainhand seems to define valid mainhand types and their impact.
        // item.offhand does the same
        // item.doublehand defines twohanded weapons
        // then we have a bunch of stat attributes
        // resistance, frequency, mcourage, speed, armor, range, attack, hp, pcourage, mp_cost, courage, mp, output, main_stat
        // there is also .stats that contain dex,int,vit,str,for
        // .lstats I presume defines the gains per lvl
        return { className, ...item } as SelectedCharacterClass;
      })
    : [];

  return (
    <>
      {classes.map((c) => (
        <Chip
          label={c.className}
          variant={selectedClass && selectedClass.className == c.className ? "filled" : "outlined"}  
          onClick={() => setSelectedClass(c)}
        />
      ))}
      <div>
        <div>
          <GearSlot onClick={onShowAvailableGear} slot="earring1" />
          <GearSlot onClick={onShowAvailableGear} slot="helmet" />
          <GearSlot onClick={onShowAvailableGear} slot="earring2" />
          <GearSlot onClick={onShowAvailableGear} slot="amulet" />
        </div>
        <div>
          <GearSlot onClick={onShowAvailableGear} slot="mainhand" />
          <GearSlot onClick={onShowAvailableGear} slot="chest" />
          <GearSlot onClick={onShowAvailableGear} slot="offhand" />
          <GearSlot onClick={onShowAvailableGear} slot="cape" />
        </div>
        <div>
          <GearSlot onClick={onShowAvailableGear} slot="ring1" />
          <GearSlot onClick={onShowAvailableGear} slot="pants" />
          <GearSlot onClick={onShowAvailableGear} slot="ring2" />
          <GearSlot onClick={onShowAvailableGear} slot="orb" />
        </div>
        <div>
          <GearSlot onClick={onShowAvailableGear} slot="belt" />
          <GearSlot onClick={onShowAvailableGear} slot="shoes" />
          <GearSlot onClick={onShowAvailableGear} slot="gloves" />
          <GearSlot onClick={onShowAvailableGear} slot="elixir" />
        </div>
      </div>
      <StatsPanel selectedCharacterClass={selectedClass} />
      <table>
        {Object.entries(gear).map(([slot, itemInfo]) => {
          return (
            <tr key={`list${slot}`}>
              <td>{itemInfo.name}</td>
            </tr>
          );
        })}
      </table>
      <GearSelectDialog
        slot={selectedGearSlot}
        items={G.items}
        onSelectGear={onSelectGear}
      />
    </>
  );
}

// https://mui.com/material-ui/react-modal/
export function GearSlot({
  slot,
  onClick,
}: {
  slot: SlotType;
  onClick: (slot: SlotType) => void;
}) {
  // TODO: valid type for mainhand depends on class and other things

  return (
    <>
      <div
        onClick={() => onClick(slot)}
        title={slot}
        style={{
          width: 50,
          height: 50,
          border: "1px solid black",
          display: "inline-block",
        }}
      ></div>
    </>
  );
}

// we need character class, level, gear
// buffs? mluck?
export function StatsPanel({
  selectedCharacterClass,
}: {
  selectedCharacterClass?: SelectedCharacterClass;
}) {
  // str increases hp & armor
  // int increases mp & resistance
  // dex increases attack & run speed
  // vit increases hp proportional to level
  return (
    <>
      <div>I AM GONNA BE A STATS BOX for {selectedCharacterClass ? selectedCharacterClass.className : ''}</div>
      <div>hp:{selectedCharacterClass?.hp}</div>
      <div>mp:{selectedCharacterClass?.mp}</div>
    </>
  );
}
