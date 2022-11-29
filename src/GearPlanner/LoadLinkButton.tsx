import { Button, Dialog, DialogContent, DialogTitle } from "@mui/material";
import { useState } from "react";
import { SavedLoadoutTable } from "./SavedLoadoutsTable";
import { SavedLoadout, SavedLoadouts } from "./types";

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
