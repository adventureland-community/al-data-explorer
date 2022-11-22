import { Button, Dialog, DialogContent, DialogTitle, Input, List, ListItem } from "@mui/material";
import { ItemInfo } from "typed-adventureland";
import { SlotType } from "typed-adventureland";
import { ClassKey } from "typed-adventureland";
import LZString from "lz-string";
import { useState } from "react";
import { SavedLoadoutTable } from "./SavedLoadoutsTable";
import { SavedLoadout, SavedLoadouts, SelectedCharacterClass } from "./types";

export function LoadLinkButton({ load }: { load: (name: string, data: SavedLoadout) => void }) {
    const [open, setOpen] = useState(false);

    let loadouts: SavedLoadouts = {};
    const loadoutString = localStorage.getItem("loadouts") ?? "";
    if (loadoutString) {
        loadouts = JSON.parse(loadoutString);
        // TODO: what if a loadout with that name already exists? warn before override?
    }

    const onSelectLoadout = (name: string, data: SavedLoadout) => {
        load(name, data);
    };

    return (
        <>
            <Button onClick={() => setOpen(true)}>Load</Button>
            <Dialog open={open} onClose={() => setOpen(false)} fullWidth>
                <DialogTitle id="scroll-dialog-title"> Load</DialogTitle>
                <DialogContent>
                    <SavedLoadoutTable loadouts={loadouts} onSelectLoadout={onSelectLoadout} />
                </DialogContent>
            </Dialog>
        </>
    );
}
