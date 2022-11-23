// TODO: search for items by name
// TODO: search for property by name
// TODO: filters for properties
// TODO: render source of item, buy,exchange, so forth
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
import { SlotType } from "typed-adventureland";
import { GItem, ItemKey, ItemType, OffhandType, WeaponType } from "typed-adventureland";
import { useState } from "react";
import { GItems } from "../GDataContext";
import { ItemImage } from "../ItemImage";
import { ItemTooltip } from "../ItemTooltip";
import { getMaxLevel } from "../Utils";
import { ItemInstance } from "./ItemInstance";
import { SelectedCharacterClass } from "./types";
export type RowItem = { itemName: ItemKey; level?: number } & GItem;

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
    const [level, setLevel] = useState<number>(0);

    // http://localhost:3000/?gear=N4Ig5gpghgTiBcoDGUAOEGgHZQLYfhACMV0QAaEAGwgDcIqEBGAX0rCoHt6BnTEHPgQgAFlCwATTgDNcASwlQ+lGvUbxWlGHKxgATP0EEQSAC7aepzlgwq6DBAGYWbE1SU8AcnmMB3WNqccHZqCHoArCxAA
    // TODO: decompress sharelink

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

    let validTypes = slot ? [slot.replace("1", "").replace("2", "")] : ([] as ItemType[]);
    // selectedCharacterClass.doublehand contains weapons considered double handed for the class

    let validWeaponTypes: Array<WeaponType | OffhandType> = [];
    switch (slot) {
        case "mainhand":
            validTypes = ["weapon"];
            validWeaponTypes = selectedCharacterClass
                ? (Object.keys(selectedCharacterClass.mainhand) as WeaponType[])
                : [];
            break;
        case "offhand":
            // validTypes = ["misc_offhand", "shield", "source", "quiver"];
            // rogues has misc_offhand, dagger,stars,fist this is a mix of item type and weapon type
            validTypes = selectedCharacterClass ? Object.keys(selectedCharacterClass.offhand) : [];
            validWeaponTypes = selectedCharacterClass
                ? (Object.keys(selectedCharacterClass.offhand) as OffhandType[])
                : [];

            // TODO: rogues and perhaps other characters can dual wield crab claws for example
            break;
    }

    // TODO: upgrade or compound property depending on type, we need to modify the slider range
    // rings  compound, earrings, source

    const rows = items
        ? Object.entries(items)
              .filter(([itemName, item]) => {
                  const validType =
                      validTypes.some((x) => x === item.type) ||
                      (item.wtype && item.type === "weapon");
                  const validWeaponType = item.wtype
                      ? validWeaponTypes.some((x) => x === item.wtype)
                      : true;
                  const validClass = selectedCharacterClass
                      ? !item.class ||
                        item.class.some((x) => x === selectedCharacterClass.className)
                      : true;

                  return validType && validWeaponType && validClass;
              })
              .map(([itemName, gItem]) => {
                  const maxLevel = getMaxLevel(gItem);
                  const itemLevel = maxLevel ? Math.min(level, maxLevel) : level;

                  const row = {
                      itemName,
                      level: itemLevel,
                      ...gItem,
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

    const onLevelSliderChange = (event: Event, value: number | number[]) => {
        if (typeof value === "number") {
            setLevel(value);
        } else {
            setLevel(0);
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
                    max={12} // TODO: should variate this depending on item type
                    onChange={onLevelSliderChange}
                    style={{ marginTop: 25 }}
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
                                    .map((row) => {
                                        const maxLevel = getMaxLevel(row);
                                        const itemLevel = maxLevel
                                            ? Math.min(level ?? 0, maxLevel)
                                            : level;

                                        return (
                                            <ItemTooltip itemName={row.itemName} level={itemLevel}>
                                                <TableRow
                                                    hover
                                                    onClick={(event) =>
                                                        onSelectItem(event, row as RowItem)
                                                    }
                                                    key={row.itemName}
                                                    sx={{
                                                        "&:last-child td, &:last-child th": {
                                                            border: 0,
                                                        },
                                                    }}
                                                >
                                                    <TableCell
                                                        component="td"
                                                        scope="row"
                                                        width="50px"
                                                    >
                                                        <ItemInstance
                                                            itemInfo={{
                                                                name: row.itemName,
                                                                level: itemLevel,
                                                            }}
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
                                                                {c.component
                                                                    ? c.component(property)
                                                                    : property}
                                                            </TableCell>
                                                        );
                                                    })}
                                                </TableRow>
                                            </ItemTooltip>
                                        );
                                    })}
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
