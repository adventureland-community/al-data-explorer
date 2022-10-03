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
  Input,
  Slider,
  Typography,
} from "@mui/material";
import { SlotType, ItemType, ItemName, GItem } from "adventureland";
import { useState } from "react";
import { GItems } from "../GDataContext";
import { ItemImage } from "../ItemImage";
import { ItemTooltip } from "../ItemTooltip";
import { ItemInstance } from "./ItemInstance";
import { SelectedCharacterClass } from "./types";
export type RowItem = { itemName: ItemName; level?: number } & GItem;

export function GearSelectDialog({
  slot,
  items,
  onSelectGear,
  selectedCharacterClass,
}: {
  slot: SlotType | false;
  items?: GItems;
  onSelectGear: (slot: SlotType, item?: RowItem) => void;
  selectedCharacterClass?: SelectedCharacterClass;
}) {
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState<number | undefined>(undefined);

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
        .filter(([itemName, item]) => {
          const validType = validTypes.some((x) => x === item.type);
          const validClass = selectedCharacterClass
            ? !item.class ||
              item.class.some((x) => x === selectedCharacterClass.className)
            : true;
          return validType && validClass;
        })
        .map(([itemName, item]) => {
          const row = {
            itemName,
            level,
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

  const onLevelSliderChange = (event: Event, value: number | number[]) => {
    if (typeof value === "number") {
      setLevel(value);
    } else {
      setLevel(undefined);
    }
  };

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
        {/* // TODO: custom steps +X and so forth */}
        <Typography gutterBottom>Level</Typography>
        <Slider
          aria-label="Level"
          // defaultValue={level}
          value={level}
          // getAriaValueText={() => level.toString()}
          // valueLabelDisplay="auto"
          valueLabelDisplay="on"
          step={1}
          marks
          min={0}
          max={15} // should variate this
          onChange={onLevelSliderChange}
          style={{marginTop: 25}}
        />
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
                    <ItemTooltip itemName={row.itemName} level={level}>
                      <TableRow
                        hover
                        onClick={(event) => onSelectItem(event, row as RowItem)}
                        key={row.itemName}
                        sx={{
                          "&:last-child td, &:last-child th": { border: 0 },
                        }}
                      >
                        <TableCell component="td" scope="row">
                          <ItemInstance
                            itemInfo={{ name: row.itemName, level }}
                          />
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
                    </ItemTooltip>
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
