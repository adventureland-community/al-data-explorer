import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Input,
} from "@mui/material";
import { ItemInfo } from "adventureland";
import { SlotType } from "adventureland/dist/src/entities/slots";
import LZString from "lz-string";
import { useState } from "react";
import { SelectedCharacterClass } from "./types";

export function LoadLinkButton({
  load,
}: {
  load: (data: {
    gear: { [slot in SlotType]?: ItemInfo };
    characterClass: SelectedCharacterClass | undefined;
    level: number;
  }) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Load</Button>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth>
        <DialogTitle id="scroll-dialog-title"> Share</DialogTitle>
        <DialogContent>
          Here should be a list of saved loadouts that you can load
          
        </DialogContent>
      </Dialog>
    </>
  );
}
