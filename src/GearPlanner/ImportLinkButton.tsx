import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogTitle,
  Input,
  Stack,
  Typography,
} from "@mui/material";
import { useRef, useState } from "react";
import { SavedLoadoutTable } from "./SavedLoadoutsTable";
import { SavedLoadout, SavedLoadouts } from "./types";
import useImportCharacter from "./useImportCharacter";
import useImportPlayer from "./useImportPlayer";

export function ImportLinkButton({
  load,
}: {
  load: (name: string, data: SavedLoadout) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loadouts, setLoadouts] = useState<SavedLoadouts>({});

  const characterNameRef = useRef<HTMLInputElement>(null);

  const importCharacter = useImportCharacter();
  const importPlayer = useImportPlayer();
  const onSelectLoadout = (name: string, data: SavedLoadout) => {
    load(name, data);
  };
  // TODO: save character names?

  const onExtractSingleCharacter = async () => {
    if (characterNameRef.current?.value) {
      setLoadouts(await importCharacter(characterNameRef.current.value));
    }
  };

  const onExtractAllPublicCharacter = async () => {
    if (characterNameRef.current?.value) {
      setLoadouts(await importPlayer(characterNameRef.current.value));
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>IMPORT</Button>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth>
        <DialogTitle id="scroll-dialog-title"> Import</DialogTitle>
        <DialogContent>
          <Card sx={{ marginBottom: 5 }}>
            <CardContent>
              <Typography component="div">
                Here you can extract characters directly from adventure.land
              </Typography>
            </CardContent>
          </Card>
          <Input
            inputRef={characterNameRef}
            placeholder="character name"
            sx={{ width: "100%", marginBottom: "5px" }}
          ></Input>
          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              onClick={() => onExtractSingleCharacter()}
              title="extract the character with the exact name"
            >
              Extract character
            </Button>
            <Button
              variant="contained"
              onClick={() => onExtractAllPublicCharacter()}
              title="extract all public characters from this name"
            >
              Extract ALL public character
            </Button>
          </Stack>
          <SavedLoadoutTable loadouts={loadouts} onSelectLoadout={onSelectLoadout} />
        </DialogContent>
      </Dialog>
    </>
  );
}

