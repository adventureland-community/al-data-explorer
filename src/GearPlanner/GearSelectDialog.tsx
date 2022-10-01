import {
  Dialog,
  DialogTitle,
  DialogContent,
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import { SlotType, ItemType, ItemName, GItem } from "adventureland";
import { useState } from "react";
import { GItems } from "../GDataContext";
import { ItemImage } from "../ItemImage";
export type RowItem = { itemName: ItemName } & GItem;

export function GearSelectDialog({
  slot,
  items,
  onSelectGear,
}: {
  slot: SlotType | false;
  items?: GItems;
  onSelectGear: (slot: SlotType, item?: RowItem) => void;
}) {
  const [open, setOpen] = useState(false);
  // const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    if (slot) {
      onSelectGear(slot);
    }
  };

  if (slot && !open) {
    setOpen(true);
  }

  let validTypes = slot
    ? [slot.replace("1", "").replace("2", "")]
    : ([] as ItemType[]);

  switch (slot) {
    case "mainhand":
      validTypes = ["weapon"];
      break;
    case "offhand":
      validTypes = ["misc_offhand", "shield", "source", "quiver"];
      break;
  }

  const rows = items
    ? Object.entries(items)
        .filter(([itemName, item]) => validTypes.some((x) => x === item.type))
        .map(([itemName, item]) => {
          const row = {
            itemName,
            ...item,
          };

          return row as RowItem;
        })
    : [];

  const onSelectItem = (event: React.MouseEvent<unknown>, row: RowItem) => {
    setOpen(false);
    if (slot) {
      onSelectGear(slot, row);
    }
  };

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

  return (
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
                  <TableCell></TableCell>
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
                      <TableCell component="td" scope="row">
                        <ItemImage itemName={row.itemName} />
                      </TableCell>
                      {/* <TableCell component="th" scope="row"> */}
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
  );
}
