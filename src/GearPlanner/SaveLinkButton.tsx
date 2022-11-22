import { Button, Dialog, DialogContent, DialogTitle, Input } from "@mui/material";
import { ItemInfo } from "typed-adventureland";
import { SlotType } from "typed-adventureland";
// import LZString from "lz-string";
import { useRef, useState } from "react";
import { SavedLoadouts, SelectedCharacterClass } from "./types";

export function SaveLinkButton({
    gear,
    characterClass,
    level,
}: {
    gear: { [slot in SlotType]?: ItemInfo };
    characterClass: SelectedCharacterClass | undefined;
    level: number;
}) {
    const [open, setOpen] = useState(false);

    const loadOutRef = useRef<HTMLInputElement>(null);

    const onSaveLoadout = () => {
        let loadouts: SavedLoadouts = {};
        const loadoutString = localStorage.getItem("loadouts") ?? "";
        if (loadoutString) {
            loadouts = JSON.parse(loadoutString);
            // TODO: what if a loadout with that name already exists? warn before override?
        }

        if (loadOutRef.current?.value) {
            loadouts[loadOutRef.current.value] = {
                gear,
                classKey: characterClass?.className,
                level,
            };

            localStorage.setItem("loadouts", JSON.stringify(loadouts));
        }
    };
    return (
        <>
            <Button onClick={() => setOpen(true)}>Save</Button>
            <Dialog open={open} onClose={() => setOpen(false)} fullWidth>
                <DialogTitle id="scroll-dialog-title"> Share</DialogTitle>
                <DialogContent>
                    <Input inputRef={loadOutRef} sx={{ width: "100%" }} />{" "}
                    <Button onClick={onSaveLoadout}>Save</Button>
                </DialogContent>
            </Dialog>
        </>
    );
}
