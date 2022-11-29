import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  TextField,
} from "@mui/material";
import { useCallback, useRef, useState } from "react";
import { ItemInfo, SlotType } from "typed-adventureland";

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

  const onClose = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Save</Button>
      <Dialog open={open} onClose={onClose} fullWidth>
        <DialogTitle>Save</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Alert severity="info">Choose a name to store, so you can identify it later.</Alert>
            </Grid>
            <Grid item xs={12}>
              <TextField label="Name" inputRef={loadOutRef} fullWidth />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onSaveLoadout}>Save</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
