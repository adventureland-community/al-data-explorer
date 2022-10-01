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

import {
  Box,
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
import { GDataContext, GItems } from "./GDataContext";

// TODO: Defense table against specific mobs


export function GearPlanner() {
  // TODO: can we share this data and logic across the entire app in a global scope somehow?
  // https://reactjs.org/docs/context.html can be used to share from app and all the way down
  // https://www.w3schools.com/react/react_usecontext.asp
//   const [G, setG] = useState<{
//     items?: GItems;
//     classes?: { [T in CharacterType]: any };
//   }>({});

//   useEffect(() => {
//     axios
//       .get("data.json")
//       .then(function (response) {
//         // handle success
//         setG(response.data);
//       })
//       .catch(function (error) {
//         // handle error
//         console.log(error);
//       })
//       .then(function () {
//         // always executed
//       });
//   });
    const G = useContext(GDataContext)
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

  return (
    <>
      <div>
        <div>
          <GearSlot items={G.items} slot="earring1" />
          <GearSlot items={G.items} slot="helmet" />
          <GearSlot items={G.items} slot="earring2" />
          <GearSlot items={G.items} slot="amulet" />
        </div>
        <div>
          <GearSlot items={G.items} slot="mainhand" />
          <GearSlot items={G.items} slot="chest" />
          <GearSlot items={G.items} slot="offhand" />
          <GearSlot items={G.items} slot="cape" />
        </div>
        <div>
          <GearSlot items={G.items} slot="ring1" />
          <GearSlot items={G.items} slot="pants" />
          <GearSlot items={G.items} slot="ring2" />
          <GearSlot items={G.items} slot="orb" />
        </div>
        <div>
          <GearSlot items={G.items} slot="belt" />
          <GearSlot items={G.items} slot="shoes" />
          <GearSlot items={G.items} slot="gloves" />
          <GearSlot items={G.items} slot="elixir" />
        </div>
      </div>
    </>
  );
}

// https://mui.com/material-ui/react-modal/
export function GearSlot({ slot, items }: { slot: SlotType; items?: GItems }) {
  const [open, setOpen] = useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const modalStyle = {
    position: "absolute" as "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 800,
    bgcolor: "background.paper",
    border: "2px solid #000",
    boxShadow: 24,
    p: 4,
    overflow: "scroll",
  };

  // TODO: valid type for mainhand depends on class and other things
  let validTypes = [slot.replace("1", "").replace("2", "")] as ItemType[];

  switch (slot) {
    case "mainhand":
      validTypes = ["weapon"];
      break;
    case "offhand":
      validTypes = ["misc_offhand", "shield", "source", "quiver"];
      break;
  }
  type RowItem = { itemName: ItemName } & GItem;
  const rows = items
    ? Object.entries(items)
        .filter(([itemName, item]) => validTypes.some((x) => x === item.type))
        .map(([itemName, item]) => {
          const row = {
            itemName,
            ...item,
          };

          return row;
        })
    : [];

  const columns = [
    {
      id: "name",
      numeric: false,
      label: "Name",
    },
    {
      id: "class",
      numeric: true,
      label: "Class",
      component: (x: string[]) => (x ? x.join(",") : ""),
    },
    // {
    //   id: "type",
    //   numeric: true,
    //   label: "Type",
    // },
    {
      id: "wtype",
      numeric: true,
      label: "W Type", // Merge with type?
    },
    {
      id: "tier",
      numeric: true,
      label: "Tier",
    },
    {
      id: "armor",
      numeric: true,
      label: "Armor",
    },
  ];

  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const onSelectItem = (event: React.MouseEvent<unknown>, row: RowItem) => {
    console.log("selected", row);
    setOpen(false);
  };

  return (
    <>
      <div
        onClick={handleOpen}
        title={slot}
        style={{
          width: 50,
          height: 50,
          border: "1px solid black",
          display: "inline-block",
        }}
      ></div>
      <Dialog
        fullWidth
        maxWidth="lg"
        open={open}
        onClose={handleClose}
        scroll="paper"
        aria-labelledby="scroll-dialog-title"
        aria-describedby="scroll-dialog-description"
      >
        <DialogTitle id="scroll-dialog-title"> Choose {slot}</DialogTitle>
        <DialogContent dividers>
          <Paper sx={{ width: "100%", overflow: "hidden" }}>
            <TableContainer>
              <Table
                stickyHeader
                sx={{ minWidth: 650, maxHeight: 440 }}
                size="small"
                aria-label="a dense table"
              >
                <TableHead>
                  <TableRow>
                    <TableCell>itemName</TableCell>
                    {columns.map((c) => {
                      return (
                        <TableCell
                          key={c.id}
                          align={c.numeric ? "right" : "left"}
                        >
                          {c.label}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows
                    // .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((row) => (
                      <TableRow
                        hover
                        onClick={(event) => onSelectItem(event, row as RowItem)}
                        key={row.itemName}
                        sx={{
                          "&:last-child td, &:last-child th": { border: 0 },
                        }}
                      >
                        <TableCell component="th" scope="row">
                          {row.itemName}
                        </TableCell>
                        {columns.map((c) => {
                          const property = (row as any)[c.id];
                          return (
                            <TableCell
                              key={row.itemName + c.id}
                              align={c.numeric ? "right" : "left"}
                            >
                              {c.component ? c.component(property) : property}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
            {/* <TablePagination
              rowsPerPageOptions={[10, 25, 100]}
              component="div"
              count={rows.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            /> */}
          </Paper>
        </DialogContent>
      </Dialog>
    </>
  );
}
