// https://classic.wowhead.com/gear-planner/druid/night-elf
// TODO: Character selector
// TODO: level slider
// TODO: gear selector
// TODO: Stats
// TODO: Attack table against specific mobs
// TODO: TrackTrix

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
import React, { useEffect, useState } from "react";

// TODO: Defense table against specific mobs
type GItems = {
  [T in ItemName]: GItem;
};

export function GearPlanner() {
  // TODO: can we share this data and logic across the entire app in a global scope somehow?
  const [G, setG] = useState<{
    items?: GItems;
    classes?: { [T in CharacterType]: any };
  }>({});

  useEffect(() => {
    axios
      .get("data.json")
      .then(function (response) {
        // handle success
        setG(response.data);
      })
      .catch(function (error) {
        // handle error
        console.log(error);
      })
      .then(function () {
        // always executed
      });
  });
  /**
   * EAR HAT EAR AMULET
   * MH CHEST OH CAPE
   * RING LEG RING ORB
   * BELT BOOTS HAND ELIXIR
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

  const validType = slot.replace("1", "").replace("2", "") as ItemType;

  const rows = items
    ? Object.entries(items)
        .filter(([itemName, item]) => item.type === validType)
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
    {
      id: "type",
      numeric: true,
      label: "Type",
    },
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
        <DialogTitle id="scroll-dialog-title"> Choose {validType}</DialogTitle>
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
