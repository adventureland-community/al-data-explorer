import {
  Alert,
  Button,
  Grid,
  Dialog,
  DialogContent,
  DialogTitle,
  TextField,
  Stack,
} from "@mui/material";
import { useRef, useState, useMemo } from "react";
import { SavedLoadoutTable } from "./SavedLoadoutsTable";
import { SavedLoadout, SavedLoadouts } from "./types";
import useImportCharacter from "./useImportCharacter";
import useImportPlayer from "./useImportPlayer";

export function ImportLinkButton({ load }: { load: (name: string, data: SavedLoadout) => void }) {
  const [open, setOpen] = useState(false);
  const [loadouts, setLoadouts] = useState<SavedLoadouts>({});

  const characterNameRef = useRef<HTMLInputElement>(null);
  const defaultCharacterName = useMemo(() => {
    if (!open) {
      return "";
    }

    return localStorage.getItem("import-character-name") ?? "";
  }, [open]);

  const importCharacter = useImportCharacter();
  const importPlayer = useImportPlayer();

  const onSelectLoadout = (name: string, data: SavedLoadout) => {
    load(name, data);
    setOpen(false);
  };

  const onExtractSingleCharacter = async () => {
    if (characterNameRef.current?.value) {
      localStorage.setItem("import-character-name", characterNameRef.current.value);
      setLoadouts(await importCharacter(characterNameRef.current.value));
    }
  };

  const onExtractAllPublicCharacter = async () => {
    if (characterNameRef.current?.value) {
      localStorage.setItem("import-character-name", characterNameRef.current.value);
      setLoadouts(await importPlayer(characterNameRef.current.value));
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>Import</Button>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth>
        <DialogTitle id="scroll-dialog-title">Import</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Alert severity="info">
                Here you can extract characters directly from adventure.land.
              </Alert>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Character Name"
                inputRef={characterNameRef}
                placeholder="Wizard"
                fullWidth
                defaultValue={defaultCharacterName}
              />
            </Grid>
            <Grid item xs={12}>
              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  onClick={() => onExtractSingleCharacter()}
                  title="extract the character with the exact name"
                >
                  Show character
                </Button>
                <Button
                  variant="contained"
                  onClick={() => onExtractAllPublicCharacter()}
                  title="extract all public characters from this name"
                >
                  Show ALL public characters
                </Button>
              </Stack>
            </Grid>
            <Grid item xs={12}>
              <SavedLoadoutTable loadouts={loadouts} onSelectLoadout={onSelectLoadout} />
            </Grid>
          </Grid>
        </DialogContent>
      </Dialog>
    </>
  );
}
